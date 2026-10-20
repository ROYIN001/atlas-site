#!/usr/bin/env python3
"""Validate an Atlas handoff manifest and its evidence without changing files.

Usage: python check_handoff.py MANIFEST --root RUN_ROOT [--repo-root REPO_ROOT]
       python check_handoff.py --hash FILE [FILE ...]   (print sha256 + digest)

--repo-root is required from phase integrated onward (candidate bytes are read
from it). This checks schema, paths, ownership, file hashes and that declared
review/gate evidence states the current candidate digest on its first line. It
does NOT compare question, quiz-host or glossary identities itself (at ready it
reads the compare_identity report cited by the identity gate), execute claimed
tests, certify academic correctness, authenticate who the reviewers really are,
or lock workers. The coordinator must freeze the candidate while
reviewing and recheck immediately before publication. A valid manifest is not
publication authorization.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
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
# Everything GitHub Pages publishes from the repository root.
SITE_PREFIXES = ("data/", "js/", "figs/", "fonts/", "icons/", "app.js", "app.css",
                 "index.html", "sw.js", "manifest.webmanifest", "robots.txt", ".nojekyll")
# Where learner identities live: qa ids and quiz2 hosts (data/t), the generated
# question index (data/qa) and glossary termKeys (MODULES in app.js). The identity
# gate cannot be N/A when these change, whatever the task type (an audit that only
# lists them, task_type review, is exempt).
IDENTITY_PREFIXES = ("data/t/", "data/qa/", "app.js")
# A pass on these gates needs at least one evidence artifact produced by someone
# who did not write the candidate (the author's own source register or self-check
# is not provenance/technical/language evidence).
INDEPENDENT_GATES = frozenset({"provenance", "technical", "language"})
RESUMABLE = ("planned", "content_ready", "learning_ready", "integrated", "reviewed")
DIGEST_LINE = re.compile(r"^candidate_digest:\s*([0-9a-fA-F]{64})\s*$")
# Invisible code points NFKC keeps (Default_Ignorable_Code_Point outside Cf):
# combining grapheme joiner, Hangul fillers, Khmer inherent vowels, Mongolian
# variation selectors, variation selectors, tag/ignorable planes.
IGNORABLE = (0x034F, 0x115F, 0x1160, 0x17B4, 0x17B5, 0x3164, 0xFFA0) + \
    tuple(range(0x180B, 0x1810)) + tuple(range(0xFE00, 0xFE10)) + tuple(range(0xFFF0, 0xFFF9))


def identity_name(value: str) -> str:
    """Compare declared names after NFKC, without invisible code points, casefolded."""
    text = unicodedata.normalize("NFKC", value)
    return "".join(ch for ch in text if unicodedata.category(ch) != "Cf"
                   and ord(ch) not in IGNORABLE and not 0xE0000 <= ord(ch) <= 0xE0FFF
                   and not 0xE0100 <= ord(ch) <= 0xE01EF).casefold()


def mixed_script(value: str) -> bool:
    """True when a name mixes Latin, Cyrillic or Greek letters (lookalike names
    such as a Cyrillic «е» inside an ASCII agent name)."""
    scripts = set()
    for ch in value:
        if ch.isalpha():
            name = unicodedata.name(ch, "")
            for script in ("LATIN", "CYRILLIC", "GREEK"):
                if name.startswith(script):
                    scripts.add(script)
    return len(scripts) > 1


def candidate_digest(files: list[dict[str, Any]]) -> str:
    """Sort by normalized path (Unicode code point order); "path:sha256" lines
    with slash paths and lowercase hex ("path:deleted" for a removed file); UTF-8;
    no trailing LF."""
    rows = sorted((item["path"].replace("\\", "/"),
                   "deleted" if item.get("deleted") is True else item["sha256"].lower())
                  for item in files)
    value = "\n".join(f"{path}:{sha}" for path, sha in rows)
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def file_digest(path: Path) -> str:
    """SHA-256 of a text file after CRLF -> LF, so a Windows autocrlf checkout and
    a Linux clone of the same commit agree (src/build_data.py does the same).
    A file containing a NUL byte is binary (git's rule; autocrlf never converts
    it) and is hashed raw, so a PNG/webp matches sha256sum."""
    data = path.read_bytes()
    if b"\0" not in data:
        data = data.replace(b"\r\n", b"\n")
    return hashlib.sha256(data).hexdigest()


def exact_case(base: Path, relative: str) -> bool:
    """True when every path segment exists with exactly this spelling. A
    case-insensitive file system (Windows, macOS) would otherwise accept
    data/t/TAU__tau-1.json for data/t/tau__tau-1.json while Linux CI rejects it."""
    current = base
    for part in relative.split("/"):
        try:
            if part not in os.listdir(current):
                return False
        except OSError:
            return False
        current = current / part
    return True


def changed_since(repo_root: Path, base_revision: str) -> list[str] | None:
    """Tracked files changed or deleted since base_revision plus untracked,
    non-ignored files; None when git or the revision is unavailable. The revision
    is validated before git sees it (a value such as --output=x is an option)."""
    if not isinstance(base_revision, str) or not REVISION.fullmatch(base_revision):
        return None
    try:
        def git(*args: str) -> list[str]:
            out = subprocess.run(["git", "-C", str(repo_root), *args], capture_output=True,
                                 timeout=60, check=True)
            return [p for p in out.stdout.decode("utf-8", "surrogateescape").split("\0") if p]
        return sorted(set(git("diff", "--name-only", "-z", "--no-renames",
                              base_revision + "^{commit}", "--")) |
                      set(git("ls-files", "-z", "--others", "--exclude-standard")))
    except (OSError, ValueError, subprocess.SubprocessError):
        return None


def coverage_warnings(manifest: Any, repo_root: Path | None) -> list[str]:
    """Files changed since base_revision that the candidate does not list. A
    warning, not an error: unrelated work may share the checkout, but a changed
    lesson or generated file that is not in the candidate was never reviewed."""
    if repo_root is None or not isinstance(manifest, dict):
        return []
    phase = manifest.get("phase")
    base = manifest.get("base_revision")
    files = (manifest.get("candidate") or {}).get("files") if isinstance(manifest.get("candidate"), dict) else None
    if phase not in {"integrated", "reviewed", "ready"} or not isinstance(files, list):
        return []
    if not isinstance(base, str) or not REVISION.fullmatch(base):
        return []  # already reported as an error; never pass it to git
    changed = changed_since(Path(repo_root), base)
    if changed is None:
        return [f"cannot list files changed since {base} (git or revision unavailable); coverage not checked"]
    listed = {str(item.get("path", "")).replace("\\", "/").casefold()
              for item in files if isinstance(item, dict)}
    missing = [path for path in changed if path.casefold() not in listed]
    note = ("coverage excludes git-ignored paths such as _work/: list STD2 sources and "
            "out/*.html in the candidate yourself")
    if not missing:
        return [note]
    shown = ", ".join(missing[:20]) + (f" … (+{len(missing) - 20} more)" if len(missing) > 20 else "")
    return [f"{len(missing)} file(s) changed since {base} are not in candidate.files: {shown}", note]


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

    def person(value: Any, location: str) -> str | None:
        parsed = string(value, location)
        if parsed and mixed_script(parsed):
            fail(location, "mixes Latin, Cyrillic or Greek letters; use one script per name")
        return parsed

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
            elif not exact_case(resolved_base, relative):
                fail(location, "path spelling/case differs from the file on disk")
            elif expected and file_digest(resolved) != expected.lower():
                fail(location, "file SHA-256 does not match manifest")
            else:
                return resolved
        except (OSError, RuntimeError, ValueError) as exc:
            fail(location, f"cannot read evidence/candidate file: {exc}")
        return None

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
    if phase == "blocked" and "resume_phase" not in data:
        fail("resume_phase", "blocked requires resume_phase (the last valid phase)")
    if "resume_phase" in data:
        resume = enum(data.get("resume_phase"), set(RESUMABLE), "resume_phase")
        if resume and phase != "blocked":
            fail("resume_phase", "is only meaningful while phase is blocked")
    capabilities = data.get("capabilities", {})
    if not isinstance(capabilities, dict):
        fail("capabilities", "must be an object")
        capabilities = {}
    independent_runtime = capabilities.get("independent_reviewers", True)
    if not isinstance(independent_runtime, bool):
        fail("capabilities.independent_reviewers", "must be true or false")

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
        owner = person(item.get("owner"), location + ".owner")
        if owner:
            author_names.add(identity_name(owner))
        # Everyone who edited the file in any round (helpers, former owners,
        # a reviewer who applied a fix) stays an author for independence.
        if "contributors" in item:
            for index2, name in enumerate(strings(item.get("contributors"), location + ".contributors")):
                if mixed_script(name):
                    fail(f"{location}.contributors[{index2}]", "mixes Latin, Cyrillic or Greek letters; use one script per name")
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
        deleted = "deleted" in item
        if deleted and (item.get("deleted") is not True or "sha256" in item):
            fail(location, "a removed file is {path, deleted: true} without sha256")
        expected = None if deleted else sha(item.get("sha256"), location + ".sha256")
        if relative:
            key = relative.casefold()
            if key in seen_files:
                fail(location + ".path", "duplicate/casefold candidate path")
            seen_files.add(key)
            if key not in owners:
                fail(location + ".path", "candidate has no file owner assignment")
            if repo_root is not None and deleted:
                if os.path.lexists(Path(repo_root) / relative):
                    fail(location + ".path", "marked deleted but the file still exists")
            elif repo_root is not None:
                verify_file(repo_root, relative, expected, location + ".path")
        if relative and deleted and item.get("deleted") is True:
            digest_inputs.append({"path": relative, "deleted": True})
        elif relative and expected:
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
        person(item.get("producer"), location + ".producer")
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

    def first_line(artifact_id: str) -> tuple[str, str] | None:
        """(first line, rest) of a text artifact; UTF-8, UTF-8 BOM or UTF-16 BOM."""
        resolved = artifact_files.get(artifact_id)
        if resolved is None:
            return None
        try:
            raw = resolved.read_bytes()
        except OSError:
            return None
        encoding = "utf-16" if raw[:2] in (b"\xff\xfe", b"\xfe\xff") else "utf-8-sig"
        text = raw.decode(encoding, "replace")
        head, _, rest = text.partition("\n")
        return head.strip(), rest

    def names_digest(artifact_id: str) -> bool:
        """A pass must be produced for this candidate: the first line of its
        evidence file is "candidate_digest: <current digest>" (an old report, a
        log that merely lists digests, or a copy of this manifest is not)."""
        if computed_digest is None:
            return False
        parts = first_line(artifact_id)
        match = DIGEST_LINE.fullmatch(parts[0]) if parts else None
        return bool(match and match.group(1).lower() == computed_digest)

    digest_hint = ("rerun the check for this candidate; the evidence's first line must be "
                   "'candidate_digest: <digest>' (a screenshot cannot state it: add a text record "
                   "with that first line listing the screenshot ids and sha256)")

    def check_identity_report(gate: dict) -> None:
        """At ready the identity pass cites the compare_identity report named in
        identity_baseline: run for this candidate (--candidate-digest), against
        the run's base commit, with ok true."""
        baseline = data.get("identity_baseline")
        report_id = baseline.get("report_artifact_id") if isinstance(baseline, dict) else None
        if not isinstance(report_id, str) or report_id not in (gate.get("evidence_artifact_ids") or []):
            fail("gates", "the identity pass must cite identity_baseline.report_artifact_id "
                          "(the compare_identity --out report)")
            return
        if not names_digest(report_id):
            fail("gates", "the compare_identity report must be produced for this candidate "
                          "(run it with --candidate-digest <digest>)")
            return
        try:
            report = json.loads(first_line(report_id)[1])
        except (TypeError, ValueError):
            report = None
        if not isinstance(report, dict) or report.get("tool") != "compare_identity":
            fail("gates", "identity_baseline.report_artifact_id is not a compare_identity report")
            return
        if report.get("ok") is not True:
            fail("gates", "the compare_identity report records lost or shifted identities (ok is not true)")
        expected = baseline.get("base_revision") or base_revision
        commit = report.get("base_commit")
        if not (isinstance(commit, str) and isinstance(expected, str) and expected.strip()
                and commit.lower().startswith(expected.strip().lower())):
            fail("gates", "the compare_identity report was run against a different base commit")

    def evidence(value: Any, location: str, required: bool = False) -> list[str]:
        ids = strings(value, location, unique=True)
        if required and not ids:
            fail(location, "must contain artifact evidence")
        for artifact_id in ids:
            if artifact_id not in artifacts:
                fail(location, f"unknown evidence artifact {artifact_id!r}")
        return ids

    reviews_by_role: dict[str, set[str]] = {"technical": set(), "language": set()}
    review_artifacts: dict[str, set[str]] = {"technical": set(), "language": set()}
    current_reviews = 0
    for index, raw in enumerate(sequence(data.get("reviews"), "reviews")):
        location = f"reviews[{index}]"
        item = mapping(raw, location)
        reviewer = person(item.get("reviewer"), location + ".reviewer")
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
        independent = bool(reviewer and identity_name(reviewer) not in author_names)
        # reviewed = an independent reviewer inspected this candidate (any verdict)
        current_reviews += bool(current and independent and artifact_id in artifacts
                                and names_digest(artifact_id))
        if verdict == "pass":
            if not current:
                fail(location + ".candidate_digest", "pass review is stale or candidate is invalid")
            elif artifact_id in artifacts and not names_digest(artifact_id):
                fail(location + ".artifact_id", "pass review report must state the current candidate digest (re-review; do not restamp an old report)")
            if reviewer and identity_name(reviewer) in author_names:
                fail(location + ".reviewer", "passing reviewer must be independent of every file owner and contributor")
            if current and role and reviewer:
                reviews_by_role[role].add(identity_name(reviewer))
                if artifact_id in artifacts:
                    review_artifacts[role].add(artifact_id)
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
                fail(location + ".evidence_artifact_ids", "no evidence artifact states the current candidate digest (" + digest_hint + ")")
            if name in INDEPENDENT_GATES and gate_evidence and not any(
                    a in artifacts and isinstance(artifacts[a].get("producer"), str) and
                    identity_name(artifacts[a]["producer"]) not in author_names
                    for a in gate_evidence):
                fail(location + ".evidence_artifact_ids", f"a {name} pass needs evidence produced by someone other than the candidate's owners/contributors")
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

    if phase == "ready":
        for role in ("technical", "language"):
            gate = gates.get(role)
            if gate and gate.get("status") == "pass" and not (
                    set(gate.get("evidence_artifact_ids") or []) & review_artifacts[role]):
                fail("gates", f"the {role} pass must cite the current {role} pass review report")
        gate = gates.get("identity")
        if gate and gate.get("status") == "pass":
            check_identity_report(gate)

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
        finding_evidence = evidence(item.get("evidence_artifact_ids"), location + ".evidence_artifact_ids")
        if status in {"resolved", "refuted"} and severity in {"blocker", "major"} and not finding_evidence:
            fail(location + ".evidence_artifact_ids", f"a {status} {severity} finding cites the correction, re-review or adjudication evidence")
        if finding_id:
            if finding_id in finding_ids:
                fail(location + ".id", "duplicate finding id")
            finding_ids.add(finding_id)
        if phase == "ready" and severity in {"blocker", "major"} and status not in {"resolved", "refuted"}:
            fail(location, "ready cannot contain open or deferred blocker/major findings")

    if phase == "reviewed" and not current_reviews:
        fail("reviews", "reviewed requires a review report for the current candidate digest by someone who is not an owner or contributor (a self-check stays at integrated)")

    if phase == "ready":
        for gate_name, gate in gates.items():
            if gate.get("status") == "fail":
                fail("gates", f"gate {gate_name!r} is recorded as fail; ready cannot carry a failing check")
        missing = BASELINE_GATES - set(required_gates)
        if missing:
            fail("required_gates", "ready is missing baseline gates: " + ", ".join(sorted(missing)))
        def touches(prefixes: tuple[str, ...]) -> bool:
            return any(isinstance(raw, dict) and isinstance(raw.get("path"), str) and
                       raw["path"].replace("\\", "/").startswith(prefixes) for raw in files)
        no_na = set()
        if task_type in {"content", "full"}:
            no_na |= CONTENT_GATES
        if touches(SITE_PREFIXES):
            no_na |= SITE_GATES
        if task_type != "review" and touches(IDENTITY_PREFIXES):
            no_na.add("identity")
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
        if independent_runtime is False:
            fail("capabilities.independent_reviewers", "this run declared no independent reviewers; finish as reviewed or blocked and disclose the limitation instead of ready")
    return errors


def load_json(path: Path) -> Any:
    def unique_keys(pairs: list[tuple[str, Any]]) -> dict:
        keys = [key for key, _ in pairs]
        duplicates = sorted({key for key in keys if keys.count(key) > 1})
        if duplicates:
            raise ValueError("duplicate JSON keys: " + ", ".join(duplicates))
        return dict(pairs)

    def no_constant(value: str) -> None:
        raise ValueError(f"non-standard JSON constant {value}")

    with path.open("r", encoding="utf-8-sig") as stream:
        return json.load(stream, object_pairs_hook=unique_keys, parse_constant=no_constant)


def main(argv: list[str] | None = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        try:  # Thai/Russian limitations must not crash a cp1252/cp874 console
            stream.reconfigure(errors="backslashreplace")
        except (AttributeError, ValueError):
            pass
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("manifest", type=Path, nargs="?")
    parser.add_argument("--root", type=Path, help="run evidence directory (required with a manifest)")
    parser.add_argument("--repo-root", type=Path,
                        help="candidate repository; required for phases integrated, reviewed and ready")
    parser.add_argument("--hash", nargs="+", type=Path, metavar="FILE",
                        help="print {files:[{path, sha256}], digest} for these files (run from the "
                             "repository root for candidate paths, from the run directory for artifacts) and exit")
    args = parser.parse_args(argv)
    if args.hash:
        files = []
        for item in args.hash:
            if not item.is_file():
                print(f"ERROR: not a file: {item}", file=sys.stderr)
                return 2
            files.append({"path": item.as_posix(), "sha256": file_digest(item)})
        print(json.dumps({"files": files, "digest": candidate_digest(files)}, ensure_ascii=False, indent=1))
        return 0
    if args.manifest is None or args.root is None:
        parser.error("MANIFEST and --root are required (or use --hash FILE ...)")
    try:
        manifest = load_json(args.manifest)
        errors = validate_manifest(manifest, args.root, args.repo_root)
        warnings = coverage_warnings(manifest, args.repo_root)
    except (OSError, ValueError, RecursionError) as exc:
        print(f"ERROR: cannot load/validate manifest: {exc}", file=sys.stderr)
        return 2
    for warning in warnings:
        print(f"WARNING: {warning}", file=sys.stderr)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        print(f"INVALID: {len(errors)} error(s)", file=sys.stderr)
        return 1
    checked = "file hashes" if args.repo_root is not None else "artifact hashes (candidate bytes NOT read: no --repo-root)"
    print(f"VALID (phase {manifest.get('phase')}): manifest structure, ownership, {checked} and "
          "digest-bound evidence are consistent; reviewer names differ from authors. Not verified: "
          "who the reviewers really are, that claimed commands ran, academic correctness, locks, "
          "publish permission.")
    for limitation in manifest.get("limitations") or []:
        print(f"LIMITATION: {limitation}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
