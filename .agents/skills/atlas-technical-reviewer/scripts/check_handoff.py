#!/usr/bin/env python3
"""Validate an Atlas handoff manifest and its evidence without changing files.

Usage: python check_handoff.py MANIFEST --root RUN_ROOT [--repo-root REPO_ROOT]

This checks schema, paths, ownership, file hashes and that declared review/gate
evidence names the current candidate digest. It does NOT compare question,
quiz-host or glossary identities (the identity gate's own evidence must do that),
execute claimed tests, certify academic correctness, authenticate reviewer
identities, or lock workers. The coordinator must freeze the candidate while
reviewing and recheck immediately before publication. A valid manifest is not
publication authorization.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import unicodedata
from pathlib import Path, PureWindowsPath
from typing import Any

BASELINE_GATES = frozenset({
    "provenance", "technical", "language", "identity", "build", "tests",
    "browser", "visual",
})
PHASES = {"planned", "content_ready", "learning_ready", "integrated",
          "reviewed", "ready", "blocked"}
HEX64 = re.compile(r"^[0-9a-fA-F]{64}$")
RESERVED = re.compile(r"^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)", re.I)
GENERIC_REASONS = {"n/a", "na", "none", "not applicable", "not relevant",
                   "not needed", "skip", "skipped", "todo", "tbd"}
REVISION = re.compile(r"^[0-9a-f]{7,40}$")
PLACEHOLDER = re.compile(r"replace-with|^(todo|tbd|xxx)$", re.I)
# Gates that can never be N/A at ready for content/full work (contract: missing
# tools or sources are not_run, never not_applicable).
CONTENT_GATES = frozenset({"provenance", "technical", "language", "identity"})
# Pre-commit gates (CLAUDE.md §4) that cannot be N/A once site files change.
SITE_GATES = frozenset({"build", "tests", "browser"})
SITE_PREFIXES = ("data/", "js/", "figs/", "app.js", "app.css", "index.html", "sw.js")


def candidate_digest(files: list[dict[str, str]]) -> str:
    """Sort by normalized path; "path:sha256" lines with slash paths and
    lowercase hex; UTF-8; no trailing LF."""
    rows = sorted((item["path"].replace("\\", "/"), item["sha256"].lower())
                  for item in files)
    value = "\n".join(f"{path}:{sha}" for path, sha in rows)
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def file_digest(path: Path) -> str:
    """SHA-256 of the bytes after CRLF -> LF, so a Windows autocrlf checkout and
    a Linux clone of the same commit agree (src/build_data.py does the same)."""
    return hashlib.sha256(path.read_bytes().replace(b"\r\n", b"\n")).hexdigest()


def safe_relative(value: str) -> str:
    """Return slash form or reject traversal and Windows path aliases."""
    if not value or value != value.strip():
        raise ValueError("path must be nonempty and have no outer whitespace")
    if any(ord(char) < 32 for char in value):
        raise ValueError("path contains control characters")
    win = PureWindowsPath(value)
    if win.drive or win.root or value.startswith(("/", "\\")):
        raise ValueError("absolute, drive-relative, and UNC paths are forbidden")
    normalized = value.replace("\\", "/")
    parts = normalized.split("/")
    if any(part in {"", ".", ".."} for part in parts):
        raise ValueError("empty, dot, or parent path segments are forbidden")
    for part in parts:
        if any(char in part for char in ':<>"|?*'):
            raise ValueError("path contains a Windows stream or reserved character")
        if part.endswith((".", " ")) or RESERVED.match(part):
            raise ValueError("path contains a Windows reserved name or alias")
    return normalized


def validate_manifest(manifest: Any, root: Path,
                      repo_root: Path | None = None) -> list[str]:
    """Return all detected errors. Unknown context fields are allowed."""
    errors: list[str] = []

    def fail(location: str, message: str) -> None:
        errors.append(f"{location}: {message}")

    def mapping(value: Any, location: str) -> dict:
        if not isinstance(value, dict):
            fail(location, "must be an object")
            return {}
        return value

    def sequence(value: Any, location: str) -> list:
        if not isinstance(value, list):
            fail(location, "must be an array")
            return []
        return value

    def string(value: Any, location: str) -> str | None:
        if not isinstance(value, str) or not value.strip():
            fail(location, "must be a nonempty string")
            return None
        if value != value.strip():
            fail(location, "must not contain outer whitespace")
        return value

    def strings(value: Any, location: str, unique: bool = False) -> list[str]:
        result = []
        seen = set()
        for index, item in enumerate(sequence(value, location)):
            parsed = string(item, f"{location}[{index}]")
            if parsed is not None:
                if unique and parsed in seen:
                    fail(location, f"duplicate value {parsed!r}")
                seen.add(parsed)
                result.append(parsed)
        return result

    def enum(value: Any, choices: set | frozenset, location: str) -> str | None:
        if not isinstance(value, str) or value not in choices:
            fail(location, "must be one of " + ", ".join(sorted(choices)))
            return None
        return value

    def sha(value: Any, location: str) -> str | None:
        if not isinstance(value, str) or not HEX64.fullmatch(value):
            fail(location, "must be a 64-character SHA-256 hex string")
            return None
        return value

    def path(value: Any, location: str) -> str | None:
        parsed = string(value, location)
        if parsed is None:
            return None
        try:
            return safe_relative(parsed)
        except ValueError as exc:
            fail(location, str(exc))
            return None

    def verify_file(base: Path, relative: str, expected: str | None,
                    location: str) -> Path | None:
        try:
            resolved_base = base.resolve(strict=True)
            resolved = (resolved_base / Path(relative)).resolve(strict=True)
            if not resolved.is_relative_to(resolved_base):
                fail(location, "resolved path escapes its root (including symlinks)")
            elif not resolved.is_file():
                fail(location, "must refer to a regular file")
            elif expected and file_digest(resolved) != expected.lower():
                fail(location, "file SHA-256 does not match manifest")
            else:
                return resolved
        except (OSError, RuntimeError, ValueError) as exc:
            fail(location, f"cannot read evidence/candidate file: {exc}")
        return None

    def identity_name(value: str) -> str:
        """Compare identities after NFKC, without format characters, casefolded."""
        text = unicodedata.normalize("NFKC", value)
        return "".join(ch for ch in text if unicodedata.category(ch) != "Cf").casefold()

    data = mapping(manifest, "manifest")
    if type(data.get("schema_version")) is not int or data["schema_version"] != 1:
        fail("schema_version", "must be integer 1")
    for key in ("run_id", "base_revision"):
        value = string(data.get(key), key)
        if value and PLACEHOLDER.search(value):
            fail(key, "still contains a template placeholder")
    base_revision = data.get("base_revision")
    if isinstance(base_revision, str) and not REVISION.fullmatch(base_revision.strip()):
        fail("base_revision", "must be the lowercase hex commit the run started from")
    phase = enum(data.get("phase"), PHASES, "phase")
    scope = mapping(data.get("scope"), "scope")
    strings(scope.get("subject_ids"), "scope.subject_ids", unique=True)
    strings(scope.get("topic_ids"), "scope.topic_ids", unique=True)
    task_type = enum(scope.get("task_type"), {"content", "learning", "review", "full"},
                     "scope.task_type")
    strings(data.get("limitations"), "limitations")

    root = Path(root)
    if not root.is_dir():
        fail("--root", "must be an existing directory")
    if repo_root is not None:
        repo_root = Path(repo_root)
        if not repo_root.is_dir():
            fail("--repo-root", "must be an existing directory")
    if phase in {"integrated", "reviewed", "ready"} and repo_root is None:
        fail("--repo-root", f"is required for phase {phase} (candidate bytes must be checked)")

    owners: dict[str, str] = {}
    author_names: set[str] = set()
    for index, raw in enumerate(sequence(data.get("assignments"), "assignments")):
        location = f"assignments[{index}]"
        item = mapping(raw, location)
        relative = path(item.get("path"), location + ".path")
        owner = string(item.get("owner"), location + ".owner")
        if owner:
            author_names.add(identity_name(owner))
        # Everyone who edited the file in any round (helpers, former owners,
        # a reviewer who applied a fix) stays an author for independence.
        if "contributors" in item:
            for name in strings(item.get("contributors"), location + ".contributors"):
                author_names.add(identity_name(name))
        if relative:
            key = relative.casefold()
            if key in owners:
                fail(location + ".path", "duplicate/casefold ownership conflict")
            owners[key] = owner or ""

    candidate = mapping(data.get("candidate"), "candidate")
    files = sequence(candidate.get("files"), "candidate.files")
    supplied_digest = sha(candidate.get("digest"), "candidate.digest")
    digest_inputs = []
    seen_files: set[str] = set()
    if not files and phase not in {"planned", "blocked"}:
        fail("candidate.files", "may be empty only in planned or blocked drafts")
    for index, raw in enumerate(files):
        location = f"candidate.files[{index}]"
        item = mapping(raw, location)
        relative = path(item.get("path"), location + ".path")
        expected = sha(item.get("sha256"), location + ".sha256")
        if relative:
            key = relative.casefold()
            if key in seen_files:
                fail(location + ".path", "duplicate/casefold candidate path")
            seen_files.add(key)
            if key not in owners:
                fail(location + ".path", "candidate has no file owner assignment")
            if repo_root is not None:
                verify_file(repo_root, relative, expected, location + ".path")
        if relative and expected:
            digest_inputs.append({"path": relative, "sha256": expected})
    computed_digest = None
    if len(digest_inputs) == len(files):
        computed_digest = candidate_digest(digest_inputs)
        if supplied_digest and supplied_digest.lower() != computed_digest:
            fail("candidate.digest", "does not match the sorted candidate file list")

    artifacts: dict[str, dict] = {}
    artifact_files: dict[str, Path] = {}
    artifact_paths: set[str] = set()
    for index, raw in enumerate(sequence(data.get("artifacts"), "artifacts")):
        location = f"artifacts[{index}]"
        item = mapping(raw, location)
        artifact_id = string(item.get("id"), location + ".id")
        relative = path(item.get("path"), location + ".path")
        expected = sha(item.get("sha256"), location + ".sha256")
        string(item.get("producer"), location + ".producer")
        if artifact_id:
            if artifact_id in artifacts:
                fail(location + ".id", "duplicate artifact id")
            artifacts[artifact_id] = item
        if relative:
            if relative.casefold() in artifact_paths:
                fail(location + ".path", "duplicate/casefold artifact path")
            artifact_paths.add(relative.casefold())
            resolved = verify_file(root, relative, expected, location + ".path")
            if resolved is not None and artifact_id:
                artifact_files[artifact_id] = resolved

    def names_digest(artifact_id: str) -> bool:
        """A pass must be produced for this candidate: its evidence file has to
        state the full current candidate digest (an old report or log does not)."""
        resolved = artifact_files.get(artifact_id)
        if resolved is None or computed_digest is None:
            return False
        try:
            return computed_digest in resolved.read_bytes().decode("utf-8", "replace").lower()
        except OSError:
            return False

    def evidence(value: Any, location: str, required: bool = False) -> list[str]:
        ids = strings(value, location, unique=True)
        if required and not ids:
            fail(location, "must contain artifact evidence")
        for artifact_id in ids:
            if artifact_id not in artifacts:
                fail(location, f"unknown evidence artifact {artifact_id!r}")
        return ids

    reviews_by_role: dict[str, set[str]] = {"technical": set(), "language": set()}
    current_reviews = 0
    for index, raw in enumerate(sequence(data.get("reviews"), "reviews")):
        location = f"reviews[{index}]"
        item = mapping(raw, location)
        reviewer = string(item.get("reviewer"), location + ".reviewer")
        role = enum(item.get("role"), {"technical", "language"}, location + ".role")
        review_digest = sha(item.get("candidate_digest"), location + ".candidate_digest")
        verdict = enum(item.get("verdict"), {"pass", "needs_changes", "blocked"},
                       location + ".verdict")
        artifact_id = string(item.get("artifact_id"), location + ".artifact_id")
        if artifact_id not in artifacts:
            fail(location + ".artifact_id", "must reference an existing artifact")
        elif reviewer and artifacts[artifact_id].get("producer") != reviewer:
            fail(location + ".artifact_id", "review artifact producer must equal reviewer")
        current = bool(review_digest and computed_digest and
                       review_digest.lower() == computed_digest)
        current_reviews += current
        if verdict == "pass":
            if not current:
                fail(location + ".candidate_digest", "pass review is stale or candidate is invalid")
            elif artifact_id in artifacts and not names_digest(artifact_id):
                fail(location + ".artifact_id", "pass review report must state the current candidate digest (re-review; do not restamp an old report)")
            if reviewer and identity_name(reviewer) in author_names:
                fail(location + ".reviewer", "passing reviewer must be independent of every file owner and contributor")
            if current and role and reviewer:
                reviews_by_role[role].add(identity_name(reviewer))
        if phase == "ready" and (verdict != "pass" or not current):
            fail(location, "ready requires current pass reviews; archive obsolete reviews separately")

    required_gates = strings(data.get("required_gates"), "required_gates", unique=True)
    gates: dict[str, dict] = {}
    for index, raw in enumerate(sequence(data.get("gates"), "gates")):
        location = f"gates[{index}]"
        item = mapping(raw, location)
        name = string(item.get("name"), location + ".name")
        status = enum(item.get("status"), {"pass", "fail", "not_run", "not_applicable"},
                      location + ".status")
        gate_evidence = evidence(item.get("evidence_artifact_ids"),
                                 location + ".evidence_artifact_ids", required=status == "pass")
        if status == "pass":
            gate_digest = sha(item.get("candidate_digest"), location + ".candidate_digest")
            if gate_digest and gate_digest.lower() != computed_digest:
                fail(location + ".candidate_digest", "pass gate is stale for the candidate")
            elif gate_evidence and not any(names_digest(a) for a in gate_evidence):
                fail(location + ".evidence_artifact_ids", "no evidence artifact states the current candidate digest (rerun the check for this candidate)")
        reason = item.get("reason")
        if not isinstance(reason, str):
            fail(location + ".reason", "must be a string (empty allowed except N/A)")
        elif status == "not_applicable" and (
            len("".join(reason.split())) < 20 or
            reason.strip().casefold().rstrip(".! ") in GENERIC_REASONS
        ):
            fail(location + ".reason", "N/A requires a substantive scope-specific reason (20 non-whitespace characters)")
        if name:
            if name in gates:
                fail(location + ".name", "duplicate gate name")
            gates[name] = item

    finding_ids: set[str] = set()
    for index, raw in enumerate(sequence(data.get("findings"), "findings")):
        location = f"findings[{index}]"
        item = mapping(raw, location)
        finding_id = string(item.get("id"), location + ".id")
        severity = enum(item.get("severity"), {"blocker", "major", "minor"},
                        location + ".severity")
        status = enum(item.get("status"), {"open", "resolved", "refuted", "deferred"},
                      location + ".status")
        string(item.get("owner"), location + ".owner")
        evidence(item.get("evidence_artifact_ids"), location + ".evidence_artifact_ids")
        if finding_id:
            if finding_id in finding_ids:
                fail(location + ".id", "duplicate finding id")
            finding_ids.add(finding_id)
        if phase == "ready" and severity in {"blocker", "major"} and status not in {"resolved", "refuted"}:
            fail(location, "ready cannot contain open or deferred blocker/major findings")

    if phase == "reviewed" and not current_reviews:
        fail("reviews", "reviewed requires at least one review report for the current candidate digest")

    if phase == "ready":
        missing = BASELINE_GATES - set(required_gates)
        if missing:
            fail("required_gates", "ready is missing baseline gates: " + ", ".join(sorted(missing)))
        site_change = any(
            isinstance(raw, dict) and isinstance(raw.get("path"), str) and
            raw["path"].replace("\\", "/").startswith(SITE_PREFIXES) for raw in files)
        no_na = set()
        if task_type in {"content", "full"}:
            no_na |= CONTENT_GATES
        if site_change:
            no_na |= SITE_GATES
        for name in required_gates:
            if name not in gates:
                fail("gates", f"missing required gate {name!r}")
            elif gates[name].get("status") == "not_applicable" and name in no_na:
                fail("gates", f"required gate {name!r} cannot be N/A for this candidate; record missing tools/sources as not_run and use phase blocked")
            elif gates[name].get("status") not in {"pass", "not_applicable"}:
                fail("gates", f"required gate {name!r} is not pass; record missing tools/sources as not_run and use phase blocked (N/A only for a genuinely irrelevant gate)")
        for role, reviewers in reviews_by_role.items():
            if not reviewers:
                fail("reviews", f"ready requires an independent current {role} pass review")
        if reviews_by_role["technical"] & reviews_by_role["language"]:
            fail("reviews", "technical and language reviewers must be distinct identities")
    return errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--root", required=True, type=Path, help="run evidence directory")
    parser.add_argument("--repo-root", type=Path, help="candidate repository; required for ready")
    args = parser.parse_args(argv)
    def unique_keys(pairs: list[tuple[str, Any]]) -> dict:
        keys = [key for key, _ in pairs]
        duplicates = sorted({key for key in keys if keys.count(key) > 1})
        if duplicates:
            raise ValueError("duplicate JSON keys: " + ", ".join(duplicates))
        return dict(pairs)

    def no_constant(value: str) -> None:
        raise ValueError(f"non-standard JSON constant {value}")

    try:
        with args.manifest.open("r", encoding="utf-8-sig") as stream:
            manifest = json.load(stream, object_pairs_hook=unique_keys,
                                 parse_constant=no_constant)
        errors = validate_manifest(manifest, args.root, args.repo_root)
    except (OSError, ValueError, RecursionError) as exc:
        print(f"ERROR: cannot load/validate manifest: {exc}", file=sys.stderr)
        return 2
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        print(f"INVALID: {len(errors)} error(s)", file=sys.stderr)
        return 1
    print(f"VALID (phase {manifest.get('phase')}): manifest structure, ownership, file hashes and "
          "digest-bound evidence are consistent. Not verified: question/SRS identity, that "
          "claimed commands ran, reviewer independence, academic correctness, locks, publish permission.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
