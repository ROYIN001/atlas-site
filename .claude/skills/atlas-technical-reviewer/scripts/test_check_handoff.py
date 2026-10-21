"""Behavioral tests using real candidate/evidence files in disposable directories."""

import copy
import hashlib
import json
import os
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
            artifact.write_text("candidate_digest: " + self.digest + "\nEvidence for " + name,
                                encoding="utf-8")
            artifacts.append({"id": name, "path": artifact.name,
                              "sha256": validator.file_digest(artifact),
                              "producer": producer})
        identity = self.root / "identity.json"
        identity.write_text("candidate_digest: " + self.digest + "\n" + json.dumps(
            {"tool": "compare_identity", "base_commit": "a" * 40, "ok": True}), encoding="utf-8")
        artifacts.append({"id": "identity-report", "path": identity.name,
                          "sha256": validator.file_digest(identity), "producer": "coordinator"})
        cites = {"technical": ["technical-review"], "language": ["language-review"],
                 "provenance": ["technical-review"], "identity": ["identity-report"]}
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
            "gates": [{"name": name, "status": "pass", "evidence_artifact_ids": cites.get(name, ["checks"]),
                       "candidate_digest": self.digest, "reason": ""} for name in sorted(validator.BASELINE_GATES)],
            "identity_baseline": {"base_revision": "a" * 40, "report_artifact_id": "identity-report"},
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

    def gate(self, name):
        return next(g for g in self.manifest["gates"] if g["name"] == name)

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

    def test_digest_must_be_on_the_first_line(self):
        self.rewrite_artifact("checks", "old log\ncandidate_digest: " + self.digest)
        self.assertInvalid("no evidence artifact states the current candidate digest")

    def test_manifest_copy_is_not_evidence(self):
        self.rewrite_artifact("checks", json.dumps(self.manifest, indent=1))
        self.assertInvalid("no evidence artifact states the current candidate digest")

    def test_utf16_log_with_digest_first_is_accepted(self):
        art = next(a for a in self.manifest["artifacts"] if a["id"] == "checks")
        path = self.root / art["path"]
        path.write_bytes(("candidate_digest: " + self.digest + "\r\npass\r\n").encode("utf-16"))
        art["sha256"] = validator.file_digest(path)
        self.assertEqual([], self.errors())

    def test_unmodified_template_rejected(self):
        template = Path(validator.__file__).resolve().parents[2] / "atlas-content-editor" / "assets" / "handoff-template.json"
        if not template.is_file():
            self.skipTest("template not bundled next to this skill")
        errors = validator.validate_manifest(json.loads(template.read_text(encoding="utf-8")), self.root)
        self.assertTrue(any("template placeholder" in e for e in errors), errors)

    def test_reviewed_without_current_review_rejected(self):
        self.manifest.update(phase="reviewed", reviews=[])
        self.assertInvalid("reviewed requires a review report")

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

    def test_zero_width_reviewer_name_is_not_independent(self):
        self.manifest["assignments"].append({"path": "other.json", "owner": "reviewer\u200b-tech"})
        self.assertInvalid("independent of every file owner")

    def test_variation_selector_and_filler_names_are_not_independent(self):
        for owner in ("reviewer-tech\ufe0f", "reviewer\u034f-tech", "reviewer-te\u3164ch"):
            with self.subTest(owner=repr(owner)):
                self.manifest["assignments"] = [self.manifest["assignments"][0],
                                                {"path": "other.json", "owner": owner}]
                self.assertInvalid("independent of every file owner")

    def test_mixed_script_name_rejected(self):
        self.manifest["reviews"][0]["reviewer"] = "reviewer-t\u0435ch"   # Cyrillic е
        self.assertInvalid("mixes Latin, Cyrillic or Greek letters")

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

    def test_author_produced_evidence_cannot_pass_provenance(self):
        art = next(a for a in self.manifest["artifacts"] if a["id"] == "checks")
        art["producer"] = "content-author"
        self.gate("provenance")["evidence_artifact_ids"] = ["checks"]
        self.assertInvalid("a provenance pass needs evidence produced by someone other")

    def test_declared_single_session_cannot_be_ready(self):
        self.manifest["capabilities"] = {"independent_reviewers": False}
        self.assertInvalid("declared no independent reviewers")
        self.manifest["phase"] = "reviewed"
        self.assertEqual([], self.errors())

    def test_resume_phase_only_while_blocked(self):
        self.manifest["resume_phase"] = "integrated"
        self.assertInvalid("only meaningful while phase is blocked")
        self.manifest["resume_phase"] = "ready"
        self.assertInvalid("resume_phase: must be one of")

    def test_path_case_must_match_disk(self):
        self.assertTrue(validator.exact_case(self.repo, "data/t/tau__tau-1.json"))
        self.assertFalse(validator.exact_case(self.repo, "data/t/TAU__tau-1.json"))

    def test_changed_files_missing_from_candidate_are_warned(self):
        def git(*args):
            subprocess.run(["git", "-C", str(self.repo), *args], check=True, capture_output=True)
        try:
            git("init", "-q")
        except (OSError, subprocess.CalledProcessError):
            self.skipTest("git is not available")
        git("-c", "user.name=t", "-c", "user.email=t@t", "add", "-A")
        git("-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", "commit", "-qm", "base")
        base = subprocess.run(["git", "-C", str(self.repo), "rev-parse", "HEAD"],
                              capture_output=True, text=True, check=True).stdout.strip()
        (self.repo / "data" / "t" / "tau__tau-2.json").write_text("{}", encoding="utf-8")
        self.manifest["base_revision"] = base
        warnings = validator.coverage_warnings(self.manifest, self.repo)
        self.assertTrue(any("tau__tau-2.json" in w for w in warnings), warnings)
        self.assertFalse(any("tau__tau-1.json" in w for w in warnings), warnings)

    def test_cli_prints_limitations_after_valid(self):
        self.manifest["limitations"] = ["Faculty slides were not available for this run."]
        manifest_path = self.root / "handoff.json"
        manifest_path.write_text(json.dumps(self.manifest), encoding="utf-8")
        result = subprocess.run([sys.executable, str(Path(validator.__file__)), str(manifest_path),
                                 "--root", str(self.root), "--repo-root", str(self.repo)],
                                capture_output=True, text=True)
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertIn("LIMITATION: Faculty slides were not available", result.stdout)

    # ---- regression tests for the fix review ----
    def cli(self, manifest, env=None):
        manifest_path = self.root / "handoff.json"
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        return subprocess.run([sys.executable, str(Path(validator.__file__)), str(manifest_path),
                               "--root", str(self.root), "--repo-root", str(self.repo)],
                              capture_output=True, text=True, env=env, encoding="utf-8", errors="replace")

    def test_option_like_base_revision_never_reaches_git(self):
        self.manifest["base_revision"] = "--output=" + str(self.repo / "app.js")
        result = self.cli(self.manifest)
        self.assertEqual(1, result.returncode, result.stderr)
        self.assertIn("base_revision", result.stderr)
        self.assertNotIn("Traceback", result.stderr)
        self.assertFalse((self.repo / "app.js").exists())
        self.assertEqual([], validator.coverage_warnings(self.manifest, self.repo))

    def test_nul_in_base_revision_reports_errors(self):
        self.manifest["base_revision"] = "abc\u0000def"
        result = self.cli(self.manifest)
        self.assertEqual(1, result.returncode)
        self.assertNotIn("Traceback", result.stderr)

    def test_binary_files_are_hashed_raw(self):
        png = self.root / "shot.png"
        data = b"\x89PNG\r\n\x1a\n\x00\x00\r\n"
        png.write_bytes(data)
        self.assertEqual(hashlib.sha256(data).hexdigest(), validator.file_digest(png))

    def test_deleted_file_is_part_of_the_digest(self):
        files = self.manifest["candidate"]["files"]
        files.append({"path": "data/t/tau__tau-old.json", "deleted": True})
        self.manifest["assignments"].append({"path": "data/t/tau__tau-old.json", "owner": "content-author"})
        self.manifest["candidate"]["digest"] = validator.candidate_digest(files)
        self.assertNotEqual(self.digest, self.manifest["candidate"]["digest"])
        expected = hashlib.sha256(("data/t/tau__tau-1.json:" + files[0]["sha256"] +
                                   "\ndata/t/tau__tau-old.json:deleted").encode()).hexdigest()
        self.assertEqual(expected, self.manifest["candidate"]["digest"])
        (self.repo / "data" / "t" / "tau__tau-old.json").write_text("{}", encoding="utf-8")
        self.assertInvalid("marked deleted but the file still exists")

    def test_failing_optional_gate_blocks_ready(self):
        self.manifest["gates"].append({"name": "perf", "status": "fail", "evidence_artifact_ids": ["checks"],
                                       "reason": "long task over budget"})
        self.assertInvalid("recorded as fail")

    def test_resolved_or_refuted_major_needs_evidence(self):
        for status in ("resolved", "refuted"):
            with self.subTest(status=status):
                self.manifest["findings"] = [{"id": "F3", "severity": "major", "status": status,
                                             "owner": "content-author", "evidence_artifact_ids": []}]
                self.assertInvalid("finding cites the correction")

    def test_reviewed_needs_an_independent_report_for_this_candidate(self):
        self.manifest.update(phase="reviewed")
        self.manifest["reviews"] = [{"reviewer": "content-author", "role": "technical",
                                     "candidate_digest": self.digest, "verdict": "needs_changes",
                                     "artifact_id": "self-check"}]
        self.manifest["artifacts"].append({"id": "self-check", "path": "checks.txt",
                                           "sha256": validator.file_digest(self.root / "checks.txt"),
                                           "producer": "content-author"})
        self.manifest["artifacts"] = [a for a in self.manifest["artifacts"] if a["id"] != "checks"]
        for gate in self.manifest["gates"]:
            gate.update(status="not_run", evidence_artifact_ids=[])
        self.assertInvalid("reviewed requires a review report")

    def test_limitations_in_thai_on_a_cp1252_console(self):
        self.manifest["limitations"] = ["ไม่มีสไลด์ของภาควิชา · нет слайдов"]
        env = dict(os.environ, PYTHONIOENCODING="cp1252")
        result = self.cli(self.manifest, env)
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertIn("LIMITATION:", result.stdout)

    def test_blocked_requires_resume_phase(self):
        self.manifest["phase"] = "blocked"
        self.assertInvalid("blocked requires resume_phase")
        self.manifest["resume_phase"] = "integrated"
        self.assertEqual([], self.errors())

    def test_identity_cannot_be_na_when_lessons_change_whatever_the_task(self):
        self.manifest["scope"]["task_type"] = "learning"
        self.gate("identity").update(status="not_applicable", evidence_artifact_ids=[],
                                     reason="Learning-only task; activities do not touch identities.")
        self.assertInvalid("required gate 'identity' cannot be N/A")
        self.manifest["scope"]["task_type"] = "review"
        self.assertFalse(any("'identity' cannot be N/A" in e for e in self.errors()))

    def test_published_fonts_require_build_gates(self):
        font = self.repo / "fonts" / "a.woff2"
        font.parent.mkdir()
        font.write_bytes(b"\x00font")
        self.manifest["candidate"]["files"] = [{"path": "fonts/a.woff2", "sha256": validator.file_digest(font)}]
        self.manifest["assignments"] = [{"path": "fonts/a.woff2", "owner": "content-author"}]
        self.manifest["scope"]["task_type"] = "review"
        self.gate("build").update(status="not_applicable", evidence_artifact_ids=[],
                                  reason="Font file only; nothing to rebuild for this change.")
        self.assertTrue(any("'build' cannot be N/A" in e for e in self.errors()))

    def test_technical_and_language_gates_cite_their_review(self):
        self.gate("technical")["evidence_artifact_ids"] = ["checks"]
        self.gate("language")["evidence_artifact_ids"] = ["checks"]
        self.assertInvalid("the technical pass must cite the current technical pass review report")
        self.assertInvalid("the language pass must cite the current language pass review report")

    def test_identity_gate_reads_the_compare_identity_report(self):
        self.gate("identity")["evidence_artifact_ids"] = ["checks"]
        self.assertInvalid("must cite identity_baseline.report_artifact_id")
        self.gate("identity")["evidence_artifact_ids"] = ["identity-report"]
        for report, expected in (({"tool": "compare_identity", "base_commit": "a" * 40, "ok": False},
                                  "ok is not true"),
                                 ({"tool": "compare_identity", "base_commit": "b" * 40, "ok": True},
                                  "different base commit"),
                                 ({"tool": "something-else", "ok": True}, "is not a compare_identity report")):
            with self.subTest(expected=expected):
                self.rewrite_artifact("identity-report", "candidate_digest: " + self.digest + "\n" + json.dumps(report))
                self.assertInvalid(expected)

    def test_hash_mode_prints_candidate_block(self):
        result = subprocess.run([sys.executable, str(Path(validator.__file__)), "--hash", "data/t/tau__tau-1.json"],
                                capture_output=True, text=True, cwd=self.repo)
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertEqual(self.digest, json.loads(result.stdout)["digest"])

    def test_wrong_case_candidate_path_rejected(self):
        self.manifest["candidate"]["files"][0]["path"] = "data/t/TAU__tau-1.json"
        self.manifest["assignments"][0]["path"] = "data/t/TAU__tau-1.json"
        self.assertTrue(any(e.startswith("candidate.files[0].path") for e in self.errors()), self.errors())

    def test_non_ascii_changed_paths_are_matched(self):
        def git(*args):
            subprocess.run(["git", "-C", str(self.repo), *args], check=True, capture_output=True)
        try:
            git("init", "-q")
        except (OSError, subprocess.CalledProcessError):
            self.skipTest("git is not available")
        git("-c", "user.name=t", "-c", "user.email=t@t", "add", "-A")
        git("-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", "commit", "-qm", "base")
        base = subprocess.run(["git", "-C", str(self.repo), "rev-parse", "HEAD"],
                              capture_output=True, text=True, check=True).stdout.strip()
        thai = self.repo / "data" / "t" / "ไทย.json"
        thai.write_text("{}", encoding="utf-8")
        self.manifest["base_revision"] = base
        self.manifest["candidate"]["files"].append({"path": "data/t/ไทย.json", "sha256": validator.file_digest(thai)})
        warnings = validator.coverage_warnings(self.manifest, self.repo)
        self.assertFalse(any("ไทย" in w or "\\" in w for w in warnings), warnings)


if __name__ == "__main__":
    unittest.main()
