"""Behavioral tests for check_learning_packet.py."""

import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import check_learning_packet as checker

TEMPLATE = Path(checker.__file__).resolve().parents[1] / "assets" / "learning-packet.json"


def packet():
    return {
        "packet_schema_version": "1.0", "workflow_contract_version": 1,
        "task_id": "tau-3-oral", "artifact_id": "lp-1", "revision": 1, "status": "delivered",
        "owner": "atlas-learning-designer", "language": "th",
        "scope": {"subject_id": "tau", "topic_ids": ["tau-3"], "output_path": "_work/atlas-workflow/r1/lp.json",
                  "design_only": True},
        "input_refs": [{"artifact_id": "draft", "revision": 1, "path": "draft.html", "sha256": "a" * 64,
                        "kind": "editor_content", "verified_available": True}],
        "objectives": [{"objective_id": "O1", "topic_id": "tau-3", "activity_ids": ["A1", "E1"]}],
        "activities": [{
            "activity_id": "A1", "kind": "oral", "objective_ids": ["O1"], "topic_id": "tau-3",
            "provenance": {"classification": "author_practice", "visible_label_th": "ผู้เรียบเรียง",
                           "source_refs": ["S1"], "official_question_number": None},
            "existing_identity": {"question_id": "qa-keep", "proposed_new_id": None},
        }],
        "recall_cards": [],
        "exercises": [{"activity_id": "E1", "objective_ids": ["O1"], "numeric_result": "1.26424",
                       "units": "1", "independent_check": {"performed": True, "method": "limit case"},
                       "source_refs": ["S1"]}],
        "identity_compatibility": {"collisions_checked": True, "scheduler_change": False},
        "blocking_issues": [],
    }


class PacketTests(unittest.TestCase):
    def errors(self, value, repo=None):
        return checker.validate_packet(value, repo)

    def assertInvalid(self, value, expected, repo=None):
        errors = self.errors(value, repo)
        self.assertTrue(any(expected in e for e in errors), errors)

    def test_valid_delivered_packet(self):
        self.assertEqual([], self.errors(packet()))

    def test_template_is_not_a_deliverable(self):
        template = json.loads(TEMPLATE.read_text(encoding="utf-8"))
        self.assertInvalid(template, "unfilled template")
        self.assertEqual([], checker.validate_packet(template, template=True))

    def test_unknown_status_and_contract_version(self):
        p = packet(); p["status"] = "ready"; p["workflow_contract_version"] = None
        self.assertInvalid(p, "status: must be one of")
        self.assertInvalid(p, "workflow_contract_version")

    def test_provenance_rules(self):
        p = packet(); p["activities"][0]["provenance"]["classification"] = "likely_exam"
        self.assertInvalid(p, "classification: must be one of")
        p = packet(); p["activities"][0]["provenance"]["visible_label_th"] = "แบบฝึก"
        self.assertInvalid(p, "visible label")
        p = packet(); p["activities"][0]["provenance"].update(classification="official_exam", source_refs=[])
        self.assertInvalid(p, "official_exam needs the departmental list")
        p = packet(); p["activities"][0]["provenance"]["official_question_number"] = 12
        self.assertInvalid(p, "only official_exam items")

    def test_coverage_and_unique_ids(self):
        p = packet(); p["objectives"].append({"objective_id": "O2", "activity_ids": []})
        self.assertInvalid(p, "objective has no activity")
        p = packet(); p["exercises"][0]["activity_id"] = "A1"
        self.assertInvalid(p, "duplicate activity id")
        p = packet(); p["exercises"][0]["objective_ids"] = ["O9"]
        self.assertInvalid(p, "unknown objective")

    def test_numeric_exercise_needs_units_and_check(self):
        p = packet(); p["exercises"][0]["units"] = None
        self.assertInvalid(p, "needs units")
        p = packet(); p["exercises"][0]["independent_check"]["performed"] = False
        self.assertInvalid(p, "performed independent check")
        p["status"] = "draft"
        self.assertEqual([], self.errors(p))

    def test_identity_rules(self):
        p = packet(); p["activities"][0]["existing_identity"]["proposed_new_id"] = "qa-keep"
        self.assertInvalid(p, "equals an existing question id")
        p = packet(); p["identity_compatibility"]["scheduler_change"] = True
        self.assertInvalid(p, "must not change the SRS scheduler")
        p = packet(); p["activities"][0]["existing_identity"]["proposed_new_id"] = "t3-oral9"
        p["identity_compatibility"]["collisions_checked"] = False
        self.assertInvalid(p, "collisions_checked")

    def repo(self, tmp, qa_rows, html="<p>x</p>"):
        repo = Path(tmp)
        (repo / "data" / "qa").mkdir(parents=True)
        (repo / "data" / "t").mkdir(parents=True)
        (repo / "data" / "qa" / "tau.json").write_text(json.dumps(qa_rows), encoding="utf-8")
        (repo / "data" / "t" / "tau__tau-3.json").write_text(json.dumps({"html": html}), encoding="utf-8")
        (repo / "draft.html").write_bytes(b"<p>draft</p>\r\n")
        return repo

    def packet_for(self, repo):
        p = packet()
        p["input_refs"][0]["sha256"] = checker.file_digest(repo / "draft.html")
        return p

    def test_repo_ids_are_checked(self):
        with tempfile.TemporaryDirectory(prefix=".handoff-test-", dir=Path.cwd()) as tmp:
            repo = self.repo(tmp, [{"tid": "tau-3", "id": "qa-other"}])
            self.assertInvalid(self.packet_for(repo), "is not in data/qa", repo)
            p = self.packet_for(repo); p["activities"][0]["existing_identity"].update(question_id=None, proposed_new_id="qa-other")
            self.assertInvalid(p, "already exists in data/qa", repo)

    # ---- regression tests for the fix review ----
    def test_question_id_is_bound_to_its_topic(self):
        with tempfile.TemporaryDirectory(prefix=".handoff-test-", dir=Path.cwd()) as tmp:
            repo = self.repo(tmp, [{"tid": "tau-4", "id": "qa-keep"}])
            self.assertInvalid(self.packet_for(repo), "under topic 'tau-3'", repo)
            (repo / "data" / "qa" / "tau.json").write_text(json.dumps([{"tid": "tau-3", "id": "qa-keep"}]))
            self.assertEqual([], self.errors(self.packet_for(repo), repo))

    def test_missing_data_qa_is_an_error(self):
        with tempfile.TemporaryDirectory(prefix=".handoff-test-", dir=Path.cwd()) as tmp:
            self.assertInvalid(packet(), "cannot read data/qa", Path(tmp))

    def test_input_hash_is_checked(self):
        with tempfile.TemporaryDirectory(prefix=".handoff-test-", dir=Path.cwd()) as tmp:
            repo = self.repo(tmp, [{"tid": "tau-3", "id": "qa-keep"}])
            p = self.packet_for(repo)
            (repo / "draft.html").write_text("<p>edited</p>", encoding="utf-8")
            self.assertInvalid(p, "has changed since it was read", repo)

    def test_preserved_quiz_hosts_must_exist(self):
        html = '<div data-demo="quiz2"><script type="application/json">[]</script></div>' \
               '<div id="t3-quiz" data-demo="quiz2"><script type="application/json">[]</script></div>'
        with tempfile.TemporaryDirectory(prefix=".handoff-test-", dir=Path.cwd()) as tmp:
            repo = self.repo(tmp, [{"tid": "tau-3", "id": "qa-keep"}], html)
            p = self.packet_for(repo)
            p["identity_compatibility"]["preserved_quiz_host_ids"] = ["tau-3/tau-3-q1", "tau-3/t3-quiz"]
            self.assertEqual([], self.errors(p, repo))
            p["identity_compatibility"]["preserved_quiz_host_ids"] = ["tau-3/tau-3-q2"]
            self.assertInvalid(p, "is not a runtime id", repo)

    def test_new_ids_list_is_checked(self):
        p = packet(); p["identity_compatibility"].update(new_ids=["qa-keep"])
        self.assertInvalid(p, "equals an existing question id")

    def test_demo_tasks_and_quiz_kind(self):
        p = packet()
        p["demo_tasks"] = [{"activity_id": "D1", "objective_ids": ["O1"]}]
        p["objectives"][0]["activity_ids"].append("D1")
        p["activities"].append({"activity_id": "Q1", "kind": "quiz", "objective_ids": ["O1"], "topic_id": "tau-3",
                                "provenance": {"classification": "author_practice", "visible_label_th": "ผู้เรียบเรียง"},
                                "options": [{"text_th": "ก", "correct": True}, {"text_th": "ข", "correct": False,
                                                                                 "feedback_th": "ไม่ใช่ เพราะ…"}]})
        self.assertEqual([], self.errors(p))
        p["activities"][1]["options"][1].pop("feedback_th")
        self.assertInvalid(p, "needs feedback_th")

    def test_uncovered_objective_can_be_reported(self):
        p = packet(); p["objectives"].append({"objective_id": "O2", "activity_ids": []})
        p["coverage"] = {"uncovered_objective_ids": ["O2"]}
        self.assertEqual([], self.errors(p))
        p["coverage"] = {"uncovered_objective_ids": ["O9"]}
        self.assertInvalid(p, "unknown objective 'O9'")

    def test_template_mode_checks_sections(self):
        self.assertTrue(any("missing sections" in e for e in checker.validate_packet({}, template=True)))
        template = json.loads(TEMPLATE.read_text(encoding="utf-8"))
        self.assertEqual([], checker.validate_packet(template, template=True))

    def test_delivered_needs_inputs_provenance_and_no_blockers(self):
        p = packet(); p["input_refs"] = []
        self.assertInvalid(p, "at least one verified input")
        p = packet(); p["activities"][0]["provenance"] = None
        self.assertInvalid(p, "classify every delivered activity")
        p = packet(); p["exercises"][0]["source_refs"] = []
        self.assertInvalid(p, "is author work and needs the visible label")
        p["exercises"][0]["visible_provenance_label_th"] = "แบบฝึกของผู้เรียบเรียง"
        self.assertEqual([], self.errors(p))
        p = packet(); p["blocking_issues"] = [{"code": "SOURCE_MISSING"}]
        self.assertInvalid(p, "use status blocked")

    def test_topic_ids_must_be_in_scope(self):
        p = packet(); p["activities"][0]["topic_id"] = "tau-9"
        self.assertInvalid(p, "is not in scope.topic_ids")

    def test_revision_boolean_rejected(self):
        p = packet(); p["revision"] = True
        self.assertInvalid(p, "revision")

    def run_cli(self, text):
        with tempfile.TemporaryDirectory(prefix=".handoff-test-", dir=Path.cwd()) as tmp:
            path = Path(tmp) / "p.json"
            path.write_text(text, encoding="utf-8")
            return subprocess.run([sys.executable, str(Path(checker.__file__)), str(path)],
                                  capture_output=True, text=True)

    def test_wrong_types_report_errors_not_tracebacks(self):
        p = packet(); p["objectives"][0]["activity_ids"] = 5; p["scope"]["topic_ids"] = "tau-3"
        res = self.run_cli(json.dumps(p))
        self.assertEqual(1, res.returncode, res.stderr)
        self.assertNotIn("Traceback", res.stderr)

    def test_duplicate_keys_and_nan_rejected(self):
        text = json.dumps(packet())
        self.assertEqual(2, self.run_cli(text[:-1] + ', "status": "draft"}').returncode)
        self.assertEqual(2, self.run_cli(text[:-1] + ', "x": NaN}').returncode)

    def test_cli_exit_codes(self):
        with tempfile.TemporaryDirectory(prefix=".handoff-test-", dir=Path.cwd()) as tmp:
            path = Path(tmp) / "p.json"
            path.write_text(json.dumps(packet()), encoding="utf-8")
            ok = subprocess.run([sys.executable, str(Path(checker.__file__)), str(path)], capture_output=True, text=True)
            self.assertEqual(0, ok.returncode, ok.stderr)
            bad = copy.deepcopy(packet()); bad["template"] = True
            path.write_text(json.dumps(bad), encoding="utf-8")
            res = subprocess.run([sys.executable, str(Path(checker.__file__)), str(path)], capture_output=True, text=True)
            self.assertEqual(1, res.returncode)


if __name__ == "__main__":
    unittest.main()
