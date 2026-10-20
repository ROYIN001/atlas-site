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


def host(body, own_id=None):
    attr = f' id="{own_id}"' if own_id else ""
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
        self.git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "base")

    def git(self, *args):
        subprocess.run(["git", "-C", str(self.repo), *args], check=True, capture_output=True)

    def write_qa(self, ids):
        rows = [{"tid": "s-1", "id": i} for i in ids]
        (self.repo / "data" / "qa" / "s.json").write_text(json.dumps(rows), encoding="utf-8")

    def write_topic(self, hosts):
        html = "<p>topic</p>" + "".join(hosts)
        (self.repo / "data" / "t" / "s__s-1.json").write_text(json.dumps({"html": html}), encoding="utf-8")

    def run_script(self, *extra):
        result = subprocess.run([sys.executable, str(SCRIPT), "--repo", str(self.repo), "--base-rev", "HEAD",
                                 "--cand", str(self.repo), *extra], capture_output=True, text=True)
        report = None
        if result.stdout.strip().startswith("{"):
            report = json.loads(result.stdout)
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
        self.assertTrue(any(s.startswith("s/s-1/s-1-q1: its quiz moved") for s in report["quiz2_shifted"]))

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
                                       "s/s-1/s-1-q1", "s/s-1/s-1-q2"]), encoding="utf-8")
        code, report, result = self.run_script("--skip-terms", "--allow-retired", str(retired))
        self.assertEqual(0, code, result.stdout)

    def test_skip_terms_is_recorded(self):
        self.write_qa(["qa-renamed", "qa-other"])
        _, report, _ = self.run_script("--skip-terms")
        self.assertFalse(report["terms"]["checked"])


if __name__ == "__main__":
    unittest.main()
