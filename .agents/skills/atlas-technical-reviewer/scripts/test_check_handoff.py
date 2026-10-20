"""Behavioral tests using real candidate/evidence files in disposable directories."""

import copy
import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import check_handoff as validator


class HandoffTests(unittest.TestCase):
    def setUp(self):
        # Keep disposable fixtures inside the caller's writable workspace. Some
        # Windows sandboxes expose a system TEMP directory that children cannot use.
        workspace = Path.cwd().resolve()
        self.temp = tempfile.TemporaryDirectory(prefix=".handoff-test-", dir=workspace)
        self.base = Path(self.temp.name).resolve()
        self.assertTrue(self.base.is_relative_to(workspace))
        self.addCleanup(self.temp.cleanup)
        self.root = self.base / "run"
        self.repo = self.base / "repo"
        self.root.mkdir()
        (self.repo / "data" / "t").mkdir(parents=True)
        self.topic = self.repo / "data" / "t" / "tau__tau-1.json"
        self.topic.write_text('{"html":"<p>Control theory</p>"}', encoding="utf-8")
        candidate_files = [{"path": "data/t/tau__tau-1.json",
                            "sha256": validator.file_digest(self.topic)}]
        self.digest = validator.candidate_digest(candidate_files)
        artifacts = []
        for name, producer in [("technical-review", "reviewer-tech"),
                               ("language-review", "reviewer-lang"),
                               ("checks", "coordinator")]:
            artifact = self.root / (name + ".txt")
            artifact.write_text("Evidence for " + name + "\ncandidate_digest: " + self.digest,
                                encoding="utf-8")
            artifacts.append({"id": name, "path": artifact.name,
                              "sha256": validator.file_digest(artifact),
                              "producer": producer})
        self.manifest = {
            "schema_version": 1, "run_id": "tau-pilot-001",
            "scope": {"subject_ids": ["tau"], "topic_ids": ["tau-1"], "task_type": "full"},
            "base_revision": "a" * 40, "phase": "ready",
            "assignments": [{"path": candidate_files[0]["path"], "owner": "content-author"}],
            "candidate": {"files": candidate_files, "digest": self.digest},
            "artifacts": artifacts,
            "reviews": [
                {"reviewer": "reviewer-tech", "role": "technical", "candidate_digest": self.digest,
                 "verdict": "pass", "artifact_id": "technical-review"},
                {"reviewer": "reviewer-lang", "role": "language", "candidate_digest": self.digest,
                 "verdict": "pass", "artifact_id": "language-review"},
            ],
            "gates": [{"name": name, "status": "pass", "evidence_artifact_ids": ["checks"],
                       "candidate_digest": self.digest, "reason": ""} for name in sorted(validator.BASELINE_GATES)],
            "findings": [], "required_gates": sorted(validator.BASELINE_GATES), "limitations": [],
            "context": {"extra_fields_are_allowed": True},
        }

    def errors(self, manifest=None, repo=True):
        return validator.validate_manifest(self.manifest if manifest is None else manifest,
                                           self.root, self.repo if repo else None)

    def assertInvalid(self, expected):
        self.assertTrue(any(expected in error for error in self.errors()), self.errors())

    def test_valid_ready_with_real_evidence(self):
        self.assertEqual([], self.errors())

    def test_digest_definition_uses_sorted_utf8_without_trailing_newline(self):
        files = [{"path": "z/ไทย.json", "sha256": "f" * 64},
                 {"path": "a.json", "sha256": "0" * 64}]
        expected = hashlib.sha256(("a.json:" + "0" * 64 + "\nz/ไทย.json:" + "f" * 64).encode()).hexdigest()
        self.assertEqual(expected, validator.candidate_digest(files))

    def test_stale_content_file_hash(self):
        self.topic.write_text("changed content", encoding="utf-8")
        self.assertInvalid("file SHA-256 does not match")

    def test_stale_gate_digest(self):
        self.manifest["gates"][0]["candidate_digest"] = "0" * 64
        self.assertInvalid("pass gate is stale")

    def test_missing_gate_digest(self):
        del self.manifest["gates"][0]["candidate_digest"]
        self.assertInvalid("candidate_digest: must be a 64-character")

    def test_changed_candidate_digest_invalidates_reviews(self):
        self.topic.write_text("revised content", encoding="utf-8")
        files = self.manifest["candidate"]["files"]
        files[0]["sha256"] = validator.file_digest(self.topic)
        self.manifest["candidate"]["digest"] = validator.candidate_digest(files)
        self.assertInvalid("pass review is stale")

    def test_forged_candidate_digest(self):
        self.manifest["candidate"]["digest"] = "0" * 64
        self.assertInvalid("does not match the sorted candidate")

    def test_casefold_owner_conflict_with_different_separators(self):
        self.manifest["assignments"].append({"path": "DATA\\T\\TAU__TAU-1.JSON", "owner": "other"})
        self.assertInvalid("ownership conflict")

    def test_duplicate_assignment_same_owner_also_fails(self):
        self.manifest["assignments"].append(copy.deepcopy(self.manifest["assignments"][0]))
        self.assertInvalid("ownership conflict")

    def test_unsafe_paths_all_rejected(self):
        for value in ["../secret", "a/../secret", "a\\..\\secret", "/tmp/secret",
                      "C:\\secret.txt", "C:secret.txt", "\\\\server\\share\\file",
                      "\\secret", "a:stream", "./file", "a//file", "CON.txt", "x./file"]:
            with self.subTest(path=value):
                with self.assertRaises(ValueError):
                    validator.safe_relative(value)

    def test_manifest_traversal_rejected(self):
        self.manifest["artifacts"][0]["path"] = "..\\outside.txt"
        self.assertInvalid("parent path segments")

    def test_missing_evidence_file(self):
        (self.root / "checks.txt").unlink()
        self.assertInvalid("cannot read evidence/candidate file")

    def test_changed_evidence_hash(self):
        (self.root / "checks.txt").write_text("altered evidence", encoding="utf-8")
        self.assertInvalid("file SHA-256 does not match")

    def test_unknown_evidence_id(self):
        self.manifest["gates"][0]["evidence_artifact_ids"] = ["nonexistent"]
        self.assertInvalid("unknown evidence artifact")

    def test_pass_gate_requires_evidence(self):
        self.manifest["gates"][0]["evidence_artifact_ids"] = []
        self.assertInvalid("must contain artifact evidence")

    def test_open_or_deferred_major_and_blocker_prevent_ready(self):
        for severity in ["major", "blocker"]:
            for status in ["open", "deferred"]:
                with self.subTest(severity=severity, status=status):
                    self.manifest["findings"] = [{"id": "F1", "severity": severity, "status": status,
                                                 "owner": "content-author", "evidence_artifact_ids": ["checks"]}]
                    self.assertInvalid("open or deferred blocker/major")

    def test_resolved_major_allowed(self):
        self.manifest["findings"] = [{"id": "F1", "severity": "major", "status": "resolved",
                                     "owner": "content-author", "evidence_artifact_ids": ["checks"]}]
        self.assertEqual([], self.errors())

    def test_ready_requires_repo_root(self):
        self.assertTrue(any("required for phase ready" in error for error in self.errors(repo=False)))

    def test_reviewer_cannot_be_any_assignment_owner(self):
        self.manifest["assignments"].append({"path": "unrelated.json", "owner": "REVIEWER-TECH"})
        self.assertInvalid("independent of every file owner")

    def test_technical_and_language_reviewers_distinct(self):
        self.manifest["reviews"][1]["reviewer"] = "reviewer-tech"
        self.manifest["artifacts"][1]["producer"] = "reviewer-tech"
        self.assertInvalid("reviewers must be distinct")

    def test_review_artifact_belongs_to_reviewer(self):
        self.manifest["artifacts"][0]["producer"] = "another-worker"
        self.assertInvalid("producer must equal reviewer")

    def test_unknown_enum_and_wrong_types_report_errors_not_crash(self):
        self.manifest["phase"] = "published"
        self.manifest["gates"][0]["status"] = []
        self.manifest["reviews"][0]["role"] = {"bad": "type"}
        self.assertGreaterEqual(len(self.errors()), 3)

    def test_schema_version_boolean_not_integer_one(self):
        self.manifest["schema_version"] = True
        self.assertInvalid("must be integer 1")

    def test_draft_missing_sources_can_be_explicit_limitations(self):
        draft = copy.deepcopy(self.manifest)
        draft.update(phase="planned", assignments=[], artifacts=[], reviews=[], gates=[], required_gates=[],
                     limitations=["Source lecture notes are unavailable; no academic approval has been issued."])
        draft["candidate"] = {"files": [], "digest": validator.candidate_digest([])}
        self.assertEqual([], self.errors(draft, repo=False))

    def test_draft_stale_pass_review_still_invalid(self):
        self.manifest["phase"] = "content_ready"
        self.manifest["reviews"][0]["candidate_digest"] = "0" * 64
        self.assertInvalid("pass review is stale")

    def test_draft_old_needs_changes_review_allowed(self):
        self.manifest["phase"] = "content_ready"
        self.manifest["reviews"][0].update(candidate_digest="0" * 64, verdict="needs_changes")
        self.assertEqual([], self.errors())

    def test_no_empty_candidate_after_planning(self):
        self.manifest["phase"] = "integrated"
        self.manifest["candidate"] = {"files": [], "digest": validator.candidate_digest([])}
        self.manifest["reviews"] = []
        self.assertInvalid("may be empty only")

    def test_ready_requires_all_baseline_gates(self):
        self.manifest["required_gates"] = ["technical"]
        self.assertInvalid("missing baseline gates")

    def test_required_gate_missing_or_unrun_blocks_ready(self):
        self.manifest["gates"][0]["status"] = "not_run"
        self.assertInvalid("is not pass; record missing tools")
        self.manifest["gates"].pop()
        self.assertInvalid("missing required gate")

    def test_scoped_na_reason_allowed(self):
        visual = next(g for g in self.manifest["gates"] if g["name"] == "visual")
        visual.update(status="not_applicable", evidence_artifact_ids=[],
                      reason="This run changes reference prose only; no layout or styling is affected.")
        self.assertEqual([], self.errors())

    def test_placeholder_na_reason_rejected(self):
        self.manifest["gates"][0].update(status="not_applicable", evidence_artifact_ids=[], reason="N/A")
        self.assertInvalid("substantive scope-specific reason")

    def test_cli_does_not_change_files(self):
        manifest_path = self.root / "handoff.json"
        manifest_path.write_text(json.dumps(self.manifest), encoding="utf-8")
        before = {str(path): path.read_bytes() for path in self.base.rglob("*") if path.is_file()}
        result = subprocess.run([sys.executable, str(Path(validator.__file__)), str(manifest_path),
                                 "--root", str(self.root), "--repo-root", str(self.repo)],
                                capture_output=True, text=True)
        after = {str(path): path.read_bytes() for path in self.base.rglob("*") if path.is_file()}
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertIn("VALID (phase ready)", result.stdout)
        self.assertEqual(before, after)

    def test_non_object_manifest_is_rejected(self):
        self.assertTrue(self.errors([]))


    # ---- regression tests for the final-review findings ----
    def rewrite_artifact(self, artifact_id, text):
        art = next(a for a in self.manifest["artifacts"] if a["id"] == artifact_id)
        path = self.root / art["path"]
        path.write_text(text, encoding="utf-8")
        art["sha256"] = validator.file_digest(path)

    def test_restamped_old_review_rejected(self):
        self.rewrite_artifact("technical-review", "Review of the previous candidate " + "0" * 64)
        self.assertInvalid("must state the current candidate digest")

    def test_old_gate_log_rejected(self):
        self.rewrite_artifact("checks", "node --test: pass (log from an earlier candidate)")
        self.assertInvalid("no evidence artifact states the current candidate digest")

    def test_unmodified_template_rejected(self):
        template = Path(validator.__file__).resolve().parents[2] / "atlas-content-editor" / "assets" / "handoff-template.json"
        if not template.is_file():
            self.skipTest("template not bundled next to this skill")
        errors = validator.validate_manifest(json.loads(template.read_text(encoding="utf-8")), self.root)
        self.assertTrue(any("template placeholder" in e for e in errors), errors)

    def test_reviewed_without_current_review_rejected(self):
        self.manifest.update(phase="reviewed", reviews=[])
        self.assertInvalid("reviewed requires at least one review")

    def test_integrated_requires_repo_root(self):
        self.manifest["phase"] = "integrated"
        self.assertTrue(any("required for phase integrated" in e for e in self.errors(repo=False)))

    def test_crlf_checkout_matches_lf_hash(self):
        lf = self.repo / "data" / "t" / "multi.json"
        lf.write_bytes(b'{"html":"a"}\n{"x":1}\n')
        expected = validator.file_digest(lf)
        lf.write_bytes(b'{"html":"a"}\r\n{"x":1}\r\n')
        self.assertEqual(expected, validator.file_digest(lf))

    def test_digest_is_canonical_for_separators_and_hex_case(self):
        a = [{"path": "data\\t\\x.json", "sha256": "AB" * 32}]
        b = [{"path": "data/t/x.json", "sha256": "ab" * 32}]
        self.assertEqual(validator.candidate_digest(a), validator.candidate_digest(b))

    def test_contributor_cannot_pass_review(self):
        self.manifest["assignments"][0]["contributors"] = ["reviewer-tech"]
        self.assertInvalid("independent of every file owner and contributor")

    def test_lookalike_reviewer_name_is_not_independent(self):
        self.manifest["assignments"].append({"path": "other.json", "owner": "reviewer\u200b-tech"})
        self.assertInvalid("independent of every file owner")

    def test_missing_tool_cannot_be_na_for_content_gate(self):
        gate = next(g for g in self.manifest["gates"] if g["name"] == "identity")
        gate.update(status="not_applicable", evidence_artifact_ids=[],
                    reason="identity comparison script is not installed in this clone")
        self.assertInvalid("cannot be N/A for this candidate")

    def test_browser_cannot_be_na_when_lesson_changes(self):
        gate = next(g for g in self.manifest["gates"] if g["name"] == "browser")
        gate.update(status="not_applicable", evidence_artifact_ids=[],
                    reason="Wording repair inside an existing summary; no layout change.")
        self.assertInvalid("cannot be N/A for this candidate")

    def test_placeholder_base_revision_rejected(self):
        self.manifest["base_revision"] = "replace-with-current-revision"
        self.assertInvalid("template placeholder")

    def test_duplicate_json_keys_rejected_by_cli(self):
        manifest_path = self.root / "dup.json"
        text = json.dumps(self.manifest)
        manifest_path.write_text(text[:-1] + ', "findings": []}', encoding="utf-8")
        result = subprocess.run([sys.executable, str(Path(validator.__file__)), str(manifest_path),
                                 "--root", str(self.root), "--repo-root", str(self.repo)],
                                capture_output=True, text=True)
        self.assertEqual(2, result.returncode, result.stderr)
        self.assertIn("duplicate JSON keys", result.stderr)


    def test_refuted_major_kept_with_evidence_allows_ready(self):
        self.manifest["findings"] = [{"id": "F2", "severity": "major", "status": "refuted",
                                     "owner": "content-author", "evidence_artifact_ids": ["checks"]}]
        self.assertEqual([], self.errors())

if __name__ == "__main__":
    unittest.main()
