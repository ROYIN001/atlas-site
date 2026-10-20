#!/usr/bin/env python3
"""Validate a learning packet produced by atlas-learning-designer (read-only).

Usage: python check_learning_packet.py PACKET.json [--repo-root REPO] [--template]

Checks structure, objective/activity coverage, provenance classification and the
«ผู้เรียบเรียง» label, scope of topic ids and question identities. With
--repo-root it also checks that every verified input exists with the recorded
sha256 (CRLF->LF for text, raw for binary: the handoff rule), every claimed
existing question id is in data/qa under that topic, every preserved quiz host id
exists in data/t, and proposed new ids do not collide. --template checks only
that the unfilled template keeps its required sections (maintenance).

VALID means the packet is internally consistent (and, with --repo-root, its
inputs and identities match the repository). It does not certify that answers,
rubrics or translations are academically correct.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any

STATUSES = {"draft", "delivered", "blocked"}
PROVENANCE = {"official_exam", "textbook_control", "author_practice", "unverified_existing"}
KINDS = {"oral", "quiz", "exercise", "recall", "misconception", "demo_task"}
GROUPS = ("activities", "recall_cards", "exercises", "demo_tasks")
TEMPLATE_KEYS = ("packet_schema_version", "workflow_contract_version", "status", "scope", "input_refs",
                 "objectives", "activities", "recall_cards", "exercises", "demo_tasks",
                 "identity_compatibility", "coverage", "blocking_issues", "handoff")
HEX64 = re.compile(r"^[0-9a-f]{64}$")
SAFE_PATH = re.compile(r"^(?!/)(?!.*(?:^|/)\.\.?(?:/|$))[A-Za-z0-9_./\-]+$")
HOST = re.compile(r'<[^>]*data-demo="quiz2"[^>]*>', re.S)
OWN_ID = re.compile(r'''(?<![\w-])id\s*=\s*(["'])(.*?)\1''')
AUTHOR_LABEL = "ผู้เรียบเรียง"


def file_digest(path: Path) -> str:
    """Same rule as check_handoff.file_digest: text CRLF->LF, binary (NUL) raw."""
    data = path.read_bytes()
    if b"\0" not in data:
        data = data.replace(b"\r\n", b"\n")
    return hashlib.sha256(data).hexdigest()


def qa_index(repo_root: Path) -> set[tuple[str, str]]:
    """(topic id, question id) pairs from data/qa; OSError when data/qa is missing."""
    folder = repo_root / "data" / "qa"
    if not folder.is_dir():
        raise OSError(f"{folder} does not exist (is --repo-root the repository root?)")
    pairs: set[tuple[str, str]] = set()
    for path in sorted(folder.glob("*.json")):
        if path.name == "_index.json":
            continue
        for row in json.loads(path.read_text(encoding="utf-8")):
            pairs.add((str(row.get("tid")), str(row.get("id"))))
    return pairs


def host_ids(repo_root: Path, subject: str, topics: list[str]) -> set[str]:
    """Runtime quiz2 ids ("tid/id") of the scoped topics: own id, else <tid>-q<n>."""
    ids: set[str] = set()
    for tid in topics:
        path = repo_root / "data" / "t" / f"{subject}__{tid}.json"
        if not path.is_file():
            continue
        html = json.loads(path.read_text(encoding="utf-8"))["html"]
        for n, tag in enumerate(HOST.findall(html), 1):
            own = OWN_ID.search(tag)
            ids.add(f"{tid}/" + (own.group(2) if own else f"{tid}-q{n}"))
    return ids


def validate_packet(packet: Any, repo_root: Path | None = None, template: bool = False) -> list[str]:
    errors: list[str] = []

    def fail(where: str, message: str) -> None:
        errors.append(f"{where}: {message}")

    def listed(value: Any, where: str) -> list:
        if value is None:
            return []
        if not isinstance(value, list):
            fail(where, "must be an array")
            return []
        return value

    if not isinstance(packet, dict):
        return ["packet: must be a JSON object"]
    if template:
        missing = [key for key in TEMPLATE_KEYS if key not in packet]
        if missing:
            fail("template", f"missing sections {missing}")
        return errors
    if packet.get("template"):
        fail("template", "an unfilled template is not a deliverable packet (remove \"template\": true after filling it)")
    if packet.get("packet_schema_version") != "1.0":
        fail("packet_schema_version", "must be \"1.0\"")
    if packet.get("workflow_contract_version") != 1 or isinstance(packet.get("workflow_contract_version"), bool):
        fail("workflow_contract_version", "must be 1 (workflow-contract.md version 1)")
    status = packet.get("status")
    if status not in STATUSES:
        fail("status", "must be one of " + ", ".join(sorted(STATUSES)))
    delivered = status == "delivered"
    for key in ("task_id", "artifact_id"):
        if not isinstance(packet.get(key), str) or not packet[key].strip():
            fail(key, "must be a nonempty string")
    revision = packet.get("revision")
    if not isinstance(revision, int) or isinstance(revision, bool) or revision < 1:
        fail("revision", "must be an integer >= 1")

    scope = packet.get("scope") if isinstance(packet.get("scope"), dict) else {}
    subject = scope.get("subject_id")
    if not isinstance(subject, str) or not subject:
        fail("scope.subject_id", "must name the repository subject id")
    topic_ids = [t for t in listed(scope.get("topic_ids"), "scope.topic_ids") if isinstance(t, str) and t]
    if not topic_ids:
        fail("scope.topic_ids", "must list at least one topic id")
    output = scope.get("output_path")
    if output is not None and (not isinstance(output, str) or not SAFE_PATH.match(output)):
        fail("scope.output_path", "must be a repository-relative path without traversal")

    verified_inputs = 0
    for i, ref in enumerate(listed(packet.get("input_refs"), "input_refs")):
        if not isinstance(ref, dict):
            fail(f"input_refs[{i}]", "must be an object")
            continue
        if not ref.get("verified_available"):
            continue
        rel, digest = ref.get("path"), ref.get("sha256")
        if not isinstance(rel, str) or not SAFE_PATH.match(rel):
            fail(f"input_refs[{i}].path", "a verified input needs its repository-relative path")
            continue
        if not isinstance(digest, str) or not HEX64.match(digest):
            fail(f"input_refs[{i}].sha256", "must be the lowercase SHA-256 of the input that was read "
                                            "(check_handoff.py --hash computes it)")
            continue
        verified_inputs += 1
        if repo_root is not None:
            path = repo_root / rel
            if not path.is_file():
                fail(f"input_refs[{i}].path", f"{rel} does not exist under --repo-root")
            elif file_digest(path) != digest:
                fail(f"input_refs[{i}].sha256", f"{rel} has changed since it was read (re-read it and update the packet)")
    if delivered and not verified_inputs:
        fail("input_refs", "a delivered packet names at least one verified input (path + sha256)")

    def in_scope(value: Any, where: str) -> None:
        if value not in (None, "") and topic_ids and value not in topic_ids:
            fail(where, f"topic {value!r} is not in scope.topic_ids")

    objectives = [o for o in listed(packet.get("objectives"), "objectives") if isinstance(o, dict)]
    objective_ids = [o.get("objective_id") for o in objectives]
    if delivered and not objectives:
        fail("objectives", "a delivered packet needs at least one objective")
    if len(set(objective_ids)) != len(objective_ids) or None in objective_ids:
        fail("objectives", "objective_id values must be present and unique")
    for i, objective in enumerate(objectives):
        in_scope(objective.get("topic_id"), f"objectives[{i}].topic_id")

    items: dict[str, dict] = {}
    for group in GROUPS:
        for i, item in enumerate(listed(packet.get(group), group)):
            where = f"{group}[{i}]"
            if not isinstance(item, dict):
                fail(where, "must be an object")
                continue
            aid = item.get("activity_id")
            if not isinstance(aid, str) or not aid:
                fail(where + ".activity_id", "must be a nonempty string")
                continue
            if aid in items:
                fail(where + ".activity_id", f"duplicate activity id {aid!r}")
            items[aid] = item
            for oid in listed(item.get("objective_ids"), where + ".objective_ids"):
                if oid not in objective_ids:
                    fail(where + ".objective_ids", f"unknown objective {oid!r}")
            if not item.get("objective_ids"):
                fail(where + ".objective_ids", "map the item to at least one objective")
            in_scope(item.get("topic_id"), where + ".topic_id")
            if group == "activities" and item.get("kind") not in KINDS:
                fail(where + ".kind", "must be one of " + ", ".join(sorted(KINDS)))
            if group == "activities" and item.get("kind") == "quiz":
                options = [o for o in listed(item.get("options"), where + ".options") if isinstance(o, dict)]
                if not options or not any(o.get("correct") is True for o in options):
                    fail(where + ".options", "a quiz needs options [{text_th, correct, feedback_th}] with one correct")
                elif delivered and any(o.get("correct") is not True and not o.get("feedback_th") for o in options):
                    fail(where + ".options", "every wrong option of a delivered quiz needs feedback_th")
            prov = item.get("provenance") if group == "activities" else None
            if group == "activities" and delivered and not isinstance(prov, dict):
                fail(where + ".provenance", "classify every delivered activity: " + ", ".join(sorted(PROVENANCE)))
            if isinstance(prov, dict):
                cls = prov.get("classification")
                if cls not in PROVENANCE:
                    fail(where + ".provenance.classification", "must be one of " + ", ".join(sorted(PROVENANCE)))
                if cls == "official_exam" and not prov.get("source_refs"):
                    fail(where + ".provenance", "official_exam needs the departmental list in source_refs")
                if cls == "author_practice" and AUTHOR_LABEL not in str(prov.get("visible_label_th") or ""):
                    fail(where + ".provenance.visible_label_th", f"author practice must carry the visible label «{AUTHOR_LABEL}»")
                if cls != "official_exam" and prov.get("official_question_number") not in (None, ""):
                    fail(where + ".provenance.official_question_number", "only official_exam items may carry an official number")
            if group == "exercises":
                if delivered and not item.get("source_refs") and \
                        AUTHOR_LABEL not in str(item.get("visible_provenance_label_th") or ""):
                    fail(where + ".visible_provenance_label_th",
                         f"an exercise without source_refs is author work and needs the visible label «{AUTHOR_LABEL}»")
                if item.get("numeric_result") not in (None, ""):
                    if not item.get("units"):
                        fail(where + ".units", "a numerical result needs units (or an explicit dimensionless note)")
                    check = item.get("independent_check") if isinstance(item.get("independent_check"), dict) else {}
                    if delivered and not check.get("performed"):
                        fail(where + ".independent_check", "a delivered numerical exercise needs a performed independent check")

    coverage = packet.get("coverage") if isinstance(packet.get("coverage"), dict) else {}
    uncovered = set(listed(coverage.get("uncovered_objective_ids"), "coverage.uncovered_objective_ids"))
    for oid in sorted(map(str, uncovered - set(objective_ids))):
        fail("coverage.uncovered_objective_ids", f"unknown objective {oid!r}")
    for i, objective in enumerate(objectives):
        activity_ids = listed(objective.get("activity_ids"), f"objectives[{i}].activity_ids")
        linked = [a for a in activity_ids if a in items]
        unknown = [a for a in activity_ids if a not in items]
        if unknown:
            fail(f"objectives[{i}].activity_ids", f"unknown items {unknown}")
        if delivered and not linked and objective.get("objective_id") not in uncovered:
            fail(f"objectives[{i}]", "objective has no activity: add one, or list its id in coverage.uncovered_objective_ids")

    compat = packet.get("identity_compatibility") if isinstance(packet.get("identity_compatibility"), dict) else {}
    if compat.get("scheduler_change"):
        fail("identity_compatibility.scheduler_change", "learning design must not change the SRS scheduler or scoring")
    existing: set[tuple[str | None, str]] = set()
    proposed = [str(x) for x in listed(compat.get("new_ids"), "identity_compatibility.new_ids")]
    for aid, item in items.items():
        ident = item.get("existing_identity") if isinstance(item.get("existing_identity"), dict) else {}
        if ident.get("question_id"):
            tid = item.get("topic_id")
            existing.add((str(tid) if tid else None, str(ident["question_id"])))
        for value in (ident.get("proposed_new_id"), item.get("proposed_new_id")):
            if value and str(value) not in proposed:
                proposed.append(str(value))
    for raw in listed(compat.get("preserved_question_ids"), "identity_compatibility.preserved_question_ids"):
        tid, _, qid = str(raw).rpartition("/")
        existing.add((tid or None, qid))
    if len(set(proposed)) != len(proposed):
        fail("identity", "proposed new ids collide with each other")
    if {q for _, q in existing} & set(proposed):
        fail("identity", "a proposed new id equals an existing question id")
    if delivered and proposed and not compat.get("collisions_checked"):
        fail("identity_compatibility.collisions_checked", "must be true once new ids are proposed")
    if repo_root is not None:
        try:
            known = qa_index(repo_root)
            hosts = host_ids(repo_root, subject, topic_ids) if isinstance(subject, str) and subject else set()
        except (OSError, ValueError, KeyError) as exc:
            fail("--repo-root", f"cannot read data/qa or data/t: {exc}")
        else:
            known_ids = {q for _, q in known}
            for tid, qid in sorted(existing, key=str):
                if (tid is None and qid not in known_ids) or (tid is not None and (tid, qid) not in known):
                    where = f" under topic {tid!r}" if tid else ""
                    fail("identity", f"existing question id {qid!r} is not in data/qa{where} "
                                     "(copy ids from the repository, do not recompute them)")
            for qid in sorted(set(proposed) & known_ids):
                fail("identity", f"proposed new id {qid!r} already exists in data/qa")
            for raw in listed(compat.get("preserved_quiz_host_ids"), "identity_compatibility.preserved_quiz_host_ids"):
                if str(raw) not in hosts:
                    fail("identity", f"quiz host {raw!r} is not a runtime id of a scoped topic (write it as <tid>/<id>)")

    blocking = listed(packet.get("blocking_issues"), "blocking_issues")
    if delivered and blocking:
        codes = sorted({str(i.get("code")) for i in blocking if isinstance(i, dict)})
        fail("blocking_issues", f"a delivered packet cannot carry blocking issues {codes}; use status blocked")
    return errors


def main(argv: list[str] | None = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(errors="backslashreplace")
        except (AttributeError, ValueError):
            pass
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("packet", type=Path)
    parser.add_argument("--repo-root", type=Path, help="checkout whose data/qa, data/t and inputs are checked")
    parser.add_argument("--template", action="store_true", help="check the unfilled template's sections (maintenance only)")
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
        packet = json.loads(args.packet.read_text(encoding="utf-8-sig"),
                            object_pairs_hook=unique_keys, parse_constant=no_constant)
    except (OSError, ValueError, RecursionError) as exc:
        print(f"ERROR: cannot load packet: {exc}", file=sys.stderr)
        return 2
    try:
        errors = validate_packet(packet, args.repo_root, args.template)
    except (TypeError, AttributeError) as exc:
        errors = [f"packet: a field has the wrong type ({exc})"]
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        print(f"INVALID: {len(errors)} error(s)", file=sys.stderr)
        return 1
    if args.template:
        print("VALID (template): required sections present; this is not a deliverable packet.")
    elif args.repo_root is None:
        print("VALID: learning packet is internally consistent; inputs and identities were NOT checked "
              "against the repository (no --repo-root); academic correctness is not certified.")
    else:
        print("VALID: learning packet is consistent; inputs and identities match the repository; "
              "academic correctness is not certified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
