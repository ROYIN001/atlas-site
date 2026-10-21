#!/usr/bin/env python3
"""Validate an Atlas handoff manifest and its evidence without changing files.

Usage: python check_handoff.py MANIFEST --root RUN_ROOT [--repo-root REPO_ROOT]

This checks schema, identity, hashes, and declared review gates. It does NOT
certify academic correctness, authenticate reviewer identities, or lock workers.
The coordinator must freeze the candidate while reviewing and recheck immediately
before publication. A valid manifest is not publication authorization.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
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


def candidate_digest(files: list[dict[str, str]]) -> str:
    """Hash exact supplied strings; sort by path; no trailing LF."""
    value = "\n".join(f"{item['path']}:{item['sha256']}"
                      for item in sorted(files, key=lambda item: item["path"]))
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def file_digest(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


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
                    location: str) -> None:
        try:
            resolved_base = base.resolve(strict=True)
            resolved = (resolved_base / Path(relative)).resolve(strict=True)
            if not resolved.is_relative_to(resolved_base):
                fail(location, "resolved path escapes its root (including symlinks)")
            elif not resolved.is_file():
                fail(location, "must refer to a regular file")
            elif expected and file_digest(resolved) != expected.lower():
                fail(location, "file SHA-256 does not match manifest")
        except (OSError, RuntimeError, ValueError) as exc:
            fail(location, f"cannot read evidence/candidate file: {exc}")

    data = mapping(manifest, "manifest")
    if type(data.get("schema_version")) is not int or data["schema_version"] != 1:
        fail("schema_version", "must be integer 1")
    string(data.get("run_id"), "run_id")
    string(data.get("base_revision"), "base_revision")
    phase = enum(data.get("phase"), PHASES, "phase")
    scope = mapping(data.get("scope"), "scope")
    strings(scope.get("subject_ids"), "scope.subject_ids", unique=True)
    strings(scope.get("topic_ids"), "scope.topic_ids", unique=True)
    enum(scope.get("task_type"), {"content", "learning", "review", "full"},
         "scope.task_type")
    strings(data.get("limitations"), "limitations")

    root = Path(root)
    if not root.is_dir():
        fail("--root", "must be an existing directory")
    if repo_root is not None:
        repo_root = Path(repo_root)
        if not repo_root.is_dir():
            fail("--repo-root", "must be an existing directory")
    if phase == "ready" and repo_root is None:
        fail("--repo-root", "is required for phase ready")

    owners: dict[str, str] = {}
    author_names: set[str] = set()
    for index, raw in enumerate(sequence(data.get("assignments"), "assignments")):
        location = f"assignments[{index}]"
        item = mapping(raw, location)
        relative = path(item.get("path"), location + ".path")
        owner = string(item.get("owner"), location + ".owner")
        if owner:
            author_names.add(owner.casefold())
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
            digest_inputs.append({"path": item["path"], "sha256": expected})
    computed_digest = None
    if len(digest_inputs) == len(files):
        computed_digest = candidate_digest(digest_inputs)
        if supplied_digest and supplied_digest.lower() != computed_digest:
            fail("candidate.digest", "does not match the sorted candidate file list")

    artifacts: dict[str, dict] = {}
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
            verify_file(root, relative, expected, location + ".path")

    def evidence(value: Any, location: str, required: bool = False) -> list[str]:
        ids = strings(value, location, unique=True)
        if required and not ids:
            fail(location, "must contain artifact evidence")
        for artifact_id in ids:
            if artifact_id not in artifacts:
                fail(location, f"unknown evidence artifact {artifact_id!r}")
        return ids

    reviews_by_role: dict[str, set[str]] = {"technical": set(), "language": set()}
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
        if verdict == "pass":
            if not current:
                fail(location + ".candidate_digest", "pass review is stale or candidate is invalid")
            if reviewer and reviewer.casefold() in author_names:
                fail(location + ".reviewer", "passing reviewer must be independent of every file owner")
            if current and role and reviewer:
                reviews_by_role[role].add(reviewer.casefold())
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
        evidence(item.get("evidence_artifact_ids"), location + ".evidence_artifact_ids",
                 required=status == "pass")
        if status == "pass":
            gate_digest = sha(item.get("candidate_digest"), location + ".candidate_digest")
            if gate_digest and gate_digest.lower() != computed_digest:
                fail(location + ".candidate_digest", "pass gate is stale for the candidate")
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
        status = enum(item.get("status"), {"open", "resolved", "deferred"},
                      location + ".status")
        string(item.get("owner"), location + ".owner")
        evidence(item.get("evidence_artifact_ids"), location + ".evidence_artifact_ids")
        if finding_id:
            if finding_id in finding_ids:
                fail(location + ".id", "duplicate finding id")
            finding_ids.add(finding_id)
        if phase == "ready" and severity in {"blocker", "major"} and status != "resolved":
            fail(location, "ready cannot contain open or deferred blocker/major findings")

    if phase == "ready":
        missing = BASELINE_GATES - set(required_gates)
        if missing:
            fail("required_gates", "ready is missing baseline gates: " + ", ".join(sorted(missing)))
        for name in required_gates:
            if name not in gates:
                fail("gates", f"missing required gate {name!r}")
            elif gates[name].get("status") not in {"pass", "not_applicable"}:
                fail("gates", f"required gate {name!r} is not pass or justified N/A")
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
    try:
        with args.manifest.open("r", encoding="utf-8-sig") as stream:
            manifest = json.load(stream)
        errors = validate_manifest(manifest, args.root, args.repo_root)
    except (OSError, ValueError, RecursionError) as exc:
        print(f"ERROR: cannot load/validate manifest: {exc}", file=sys.stderr)
        return 2
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        print(f"INVALID: {len(errors)} error(s)", file=sys.stderr)
        return 1
    print("VALID: handoff structure and supplied evidence verified; academic correctness is not certified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
