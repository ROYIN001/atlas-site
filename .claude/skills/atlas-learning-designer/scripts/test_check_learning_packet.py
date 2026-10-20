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
                       "units": "1", "independent_check": {"performed": True, "method": "limit case"}}],
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

    def test_repo_ids_are_checked(self):
        with tempfile.TemporaryDirectory(prefix=".handoff-test-", dir=Path.cwd()) as tmp:
            repo = Path(tmp)
            (repo / "data" / "qa").mkdir(parents=True)
            (repo / "data" / "qa" / "tau.json").write_text(json.dumps([{"tid": "tau-3", "id": "qa-other"}]),
                                                         encoding="utf-8")
            self.assertInvalid(packet(), "is not in data/qa", repo)
            p = packet(); p["activities"][0]["existing_identity"].update(question_id=None, proposed_new_id="qa-other")
            self.assertInvalid(p, "already exists in data/qa", repo)

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
