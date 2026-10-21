"""Behavioral tests for compare_identity.py on a small synthetic git repository."""

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().with_name("compare_identity.py")
APP = """const MODULES = [{id: "g1", terms: [{ru: "Дом"}, {ru: "Кот"}]}];
/* ================= APP ================= */
function stableId(text) {
  const t = String(text).replace(/<[^>]*>/g, " ").replace(/\\s+/g, " ").trim();
  let h = 5381;
  for (let i = 0; i < t.length; i++) h = (Math.imul(h, 33) + t.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
function termKey(m, t, i) { return "g:" + m.id + "-" + stableId(t.ru || ""); }
function termKeyMap() {}
"""


def host(body, own_id=None, data_id=None):
    attr = (f' id="{own_id}"' if own_id else "") + (f' data-id="{data_id}"' if data_id else "")
    return f'<div{attr} data-demo="quiz2"><script type="application/json">{body}</script></div>'


class CompareIdentityTests(unittest.TestCase):
    def setUp(self):
        if not shutil.which("git"):
            self.skipTest("git is not available")
        self.temp = tempfile.TemporaryDirectory(prefix=".handoff-test-", dir=Path.cwd())
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name)
        (self.repo / "data" / "qa").mkdir(parents=True)
        (self.repo / "data" / "t").mkdir(parents=True)
        (self.repo / "app.js").write_text(APP, encoding="utf-8")
        self.write_qa(["qa-keep", "qa-other"])
        self.write_topic([host('{"q":1}'), host('{"q":2}')])
        self.git("init", "-q")
        self.git("add", "-A")
        self.git("-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false",
                 "commit", "-qm", "base")

    def git(self, *args):
        subprocess.run(["git", "-C", str(self.repo), *args], check=True, capture_output=True)

    def write_qa(self, ids):
        rows = [{"tid": "s-1", "id": i} for i in ids]
        (self.repo / "data" / "qa" / "s.json").write_text(json.dumps(rows), encoding="utf-8")

    def write_topic(self, hosts, name="s__s-1"):
        html = "<p>topic</p>" + "".join(hosts)
        (self.repo / "data" / "t" / (name + ".json")).write_text(json.dumps({"html": html}), encoding="utf-8")

    def run_script(self, *extra):
        out = Path(self.temp.name + "-report.json")
        out.unlink(missing_ok=True)
        self.addCleanup(out.unlink, missing_ok=True)
        if "--out" not in extra:
            extra += ("--out", str(out))
        result = subprocess.run([sys.executable, str(SCRIPT), "--repo", str(self.repo), "--base-rev", "HEAD",
                                 "--cand", str(self.repo), *extra], capture_output=True, text=True)
        report = json.loads(out.read_text(encoding="utf-8")) if out.is_file() else None
        return result.returncode, report, result

    def node_or_skip(self):
        if not shutil.which("node"):
            self.skipTest("node is not available")

    def test_unchanged_tree_is_ok(self):
        self.node_or_skip()
        code, _, result = self.run_script()
        self.assertEqual(0, code, result.stdout + result.stderr)
        self.assertIn("2 term keys", result.stdout)

    def test_changed_question_id_is_lost(self):
        self.write_qa(["qa-renamed", "qa-other"])
        code, report, _ = self.run_script("--skip-terms")
        self.assertEqual(1, code)
        self.assertEqual(["s/s-1/qa-keep"], report["qa_lost"])

    def test_inserting_unpinned_quiz_shifts_history(self):
        self.write_topic([host('{"q":0}'), host('{"q":1}'), host('{"q":2}')])
        code, report, _ = self.run_script("--skip-terms")
        self.assertEqual(1, code)
        self.assertTrue(any(s.startswith("s-1/s-1-q1: its quiz moved") for s in report["quiz2_shifted"]))

    def test_partial_pinning_creates_duplicate_runtime_id(self):
        self.write_topic([host('{"q":0}'), host('{"q":1}', "s-1-q1"), host('{"q":2}')])
        code, report, _ = self.run_script("--skip-terms")
        self.assertEqual(1, code)
        self.assertTrue(report["quiz2_duplicate_ids"])

    def test_pinning_every_block_is_safe(self):
        self.write_topic([host('{"q":1}', "s-1-q1"), host('{"q":2}', "s-1-q2")])
        code, report, result = self.run_script("--skip-terms")
        self.assertEqual(0, code, result.stdout)

    def test_editing_russian_term_loses_term_key(self):
        self.node_or_skip()
        (self.repo / "app.js").write_text(APP.replace("Кот", "Кошка"), encoding="utf-8")
        code, report, _ = self.run_script()
        self.assertEqual(1, code)
        self.assertEqual(1, len(report["terms"]["lost"]))

    def test_removed_topic_is_reported_and_retirement_allowed(self):
        (self.repo / "data" / "t" / "s__s-1.json").unlink()
        self.write_qa([])
        code, report, _ = self.run_script("--skip-terms")
        self.assertEqual(1, code)
        self.assertIn("topic:s/s-1", report["topics_lost"])
        retired = self.repo / "retired.json"
        retired.write_text(json.dumps(["topic:s/s-1", "s/s-1/qa-keep", "s/s-1/qa-other",
                                       "s-1/s-1-q1", "s-1/s-1-q2"]), encoding="utf-8")
        code, report, result = self.run_script("--skip-terms", "--allow-retired", str(retired))
        self.assertEqual(0, code, result.stdout)

    # ---- regression tests for the fix review ----
    def test_renamed_or_removed_pinned_id_is_reported(self):
        self.write_topic([host('{"q":1}', "s-1-a"), host('{"q":2}', "s-1-b")])
        self.git("-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false",
                 "commit", "-qam", "pin")
        self.write_topic([host('{"q":1}', "s-1-renamed"), host('{"q":2}', "s-1-b")])
        code, report, _ = self.run_script("--skip-terms")
        self.assertEqual(1, code)
        self.assertTrue(any(s.startswith("s-1/s-1-a: pinned id renamed") for s in report["quiz2_shifted"]))
        self.write_topic([host('{"q":2}', "s-1-b")])
        code, report, _ = self.run_script("--skip-terms")
        self.assertTrue(any("pinned id no longer exists" in s for s in report["quiz2_shifted"]))

    def test_data_id_alone_does_not_pin(self):
        self.write_topic([host('{"q":0}'), host('{"q":1}', data_id="s-1-q1"), host('{"q":2}', data_id="s-1-q2")])
        code, report, _ = self.run_script("--skip-terms")
        self.assertEqual(1, code)
        self.assertTrue(report["quiz2_shifted"])

    def test_insert_plus_edit_is_not_hidden(self):
        self.write_topic([host('{"q":0}'), host('{"q":"1 edited"}'), host('{"q":"2 edited"}')])
        code, report, _ = self.run_script("--skip-terms")
        self.assertEqual(1, code)
        self.assertTrue(any("count changed" in s for s in report["quiz2_shifted"]), report)

    def test_reordering_options_is_not_a_move(self):
        a = json.dumps([{"q": "Q1", "options": [{"t": "a"}, {"t": "b"}], "answer": 0}])
        b = json.dumps([{"q": "Q1", "options": [{"t": "b"}, {"t": "a"}], "answer": 1}])
        self.write_topic([host(a), host('{"q":2}')])
        self.git("-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false",
                 "commit", "-qam", "quiz")
        self.write_topic([host(b), host('{"q":2}')])
        code, report, result = self.run_script("--skip-terms")
        self.assertEqual(0, code, result.stdout)

    def test_nonstandard_host_cannot_be_compared(self):
        self.write_topic([host('{"q":1}'), "<div data-demo='quiz2'><!-- x --></div>", host('{"q":2}')])
        code, _, result = self.run_script("--skip-terms")
        self.assertEqual(2, code, result.stderr)

    def test_report_states_candidate_digest_and_base_commit(self):
        out = self.repo / "identity.json"
        code, _, result = self.run_script("--skip-terms", "--candidate-digest", "A" * 64, "--out", str(out))
        self.assertEqual(0, code, result.stderr)
        first, _, rest = out.read_text(encoding="utf-8").partition("\n")
        self.assertEqual("candidate_digest: " + "a" * 64, first)
        report = json.loads(rest)
        self.assertEqual(40, len(report["base_commit"]))
        self.assertTrue(report["ok"])

    def test_option_like_base_revision_rejected(self):
        result = subprocess.run([sys.executable, str(SCRIPT), "--repo", str(self.repo),
                                 "--base-rev=--output=" + str(self.repo / "x"), "--cand", str(self.repo)],
                                capture_output=True, text=True)
        self.assertEqual(2, result.returncode)
        self.assertFalse((self.repo / "x").exists())

    def test_skip_terms_refused_when_modules_change(self):
        (self.repo / "app.js").write_text(APP.replace("Кот", "Кошка"), encoding="utf-8")
        code, _, result = self.run_script("--skip-terms")
        self.assertEqual(2, code, result.stderr)

    def test_bad_allow_retired_is_usage_error(self):
        bad = self.repo / "retired.json"
        bad.write_text('{"not": "a list"}', encoding="utf-8")
        code, _, _ = self.run_script("--skip-terms", "--allow-retired", str(bad))
        self.assertEqual(2, code)
        code, _, _ = self.run_script("--skip-terms", "--allow-retired", str(self.repo / "missing.json"))
        self.assertEqual(2, code)

    def test_topic_moved_between_subjects_and_tid_collision(self):
        (self.repo / "data" / "t" / "s__s-1.json").rename(self.repo / "data" / "t" / "x__s-1.json")
        code, report, _ = self.run_script("--skip-terms")
        self.assertEqual(["topic:s/s-1"], report["topics_moved"])
        self.assertEqual([], report["topics_lost"])
        self.write_topic([host('{"q":1}'), host('{"q":2}')])
        code, report, _ = self.run_script("--skip-terms")
        self.assertEqual(1, code)
        self.assertTrue(report["tid_collisions"])

    def test_stale_data_qa_is_refused(self):
        steps = self.repo / "src" / "build_steps"
        steps.mkdir(parents=True)
        (steps / "qa.py").write_text(
            "import json\n"
            "def run(ctx):\n"
            "    out = ctx['data'] / 'qa'; out.mkdir(exist_ok=True)\n"
            "    (out / 's.json').write_text(json.dumps([{'tid': 's-1', 'id': 'qa-fresh'}]))\n",
            encoding="utf-8")
        code, _, result = self.run_script("--skip-terms")
        self.assertEqual(2, code, result.stdout)
        self.assertIn("stale", result.stderr)
        self.write_qa(["qa-fresh"])
        code, report, _ = self.run_script("--skip-terms")
        self.assertEqual(1, code)  # fresh now, but qa-keep/qa-other were lost
        self.assertTrue(report["data_qa_fresh"])

    def test_reordering_pinned_blocks_is_a_note_not_a_failure(self):
        self.write_topic([host('{"q":1}', "s-1-q1"), host('{"q":2}', "s-1-q2")])
        self.git("-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false",
                 "commit", "-qam", "pin")
        self.write_topic([host('{"q":2}', "s-1-q2"), host('{"q":1}', "s-1-q1")])
        code, _, result = self.run_script("--skip-terms")
        self.assertEqual(0, code, result.stdout)
        self.assertIn("NOTE: s-1: quiz2 block order changed", result.stdout)

    def test_skip_terms_is_recorded(self):
        self.write_qa(["qa-renamed", "qa-other"])
        _, report, _ = self.run_script("--skip-terms")
        self.assertFalse(report["terms"]["checked"])


if __name__ == "__main__":
    unittest.main()
