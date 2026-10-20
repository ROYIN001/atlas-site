#!/usr/bin/env python3
"""Validate a learning packet produced by atlas-learning-designer (read-only).

Usage: python check_learning_packet.py PACKET.json [--repo-root REPO] [--template]

Checks structure, objective/activity coverage, provenance labels and question
identities. With --repo-root it also checks every claimed existing question id
against data/qa and every proposed new id for collisions. --template accepts the
unfilled template itself (for maintenance checks only).

VALID means the packet is internally consistent and traceable. It does not
certify that answers, rubrics or translations are academically correct.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

STATUSES = {"draft", "delivered", "blocked"}
PROVENANCE = {"official_exam", "textbook_control", "author_practice", "unverified_existing"}
KINDS = {"oral", "exercise", "recall", "misconception", "demo_task"}
HEX64 = re.compile(r"^[0-9a-f]{64}$")
SAFE_PATH = re.compile(r"^(?!/)(?!.*(?:^|/)\.\.?(?:/|$))[A-Za-z0-9_./\-]+$")
AUTHOR_LABEL = "ผู้เรียบเรียง"


def qa_index(repo_root: Path) -> set[str]:
    ids: set[str] = set()
    for path in sorted((repo_root / "data" / "qa").glob("*.json")):
        if path.name == "_index.json":
            continue
        for row in json.loads(path.read_text(encoding="utf-8")):
            ids.add(str(row.get("id")))
    return ids


def validate_packet(packet: Any, repo_root: Path | None = None, template: bool = False) -> list[str]:
    errors: list[str] = []

    def fail(where: str, message: str) -> None:
        errors.append(f"{where}: {message}")

    if not isinstance(packet, dict):
        return ["packet: must be a JSON object"]
    if packet.get("template") and not template:
        fail("template", "an unfilled template is not a deliverable packet (remove \"template\": true after filling it)")
    if template:
        return errors
    if packet.get("packet_schema_version") != "1.0":
        fail("packet_schema_version", "must be \"1.0\"")
    if packet.get("workflow_contract_version") != 1:
        fail("workflow_contract_version", "must be 1 (workflow-contract.md version 1)")
    status = packet.get("status")
    if status not in STATUSES:
        fail("status", "must be one of " + ", ".join(sorted(STATUSES)))
    delivered = status == "delivered"
    for key in ("task_id", "artifact_id"):
        if not isinstance(packet.get(key), str) or not packet[key].strip():
            fail(key, "must be a nonempty string")
    if not isinstance(packet.get("revision"), int) or packet["revision"] < 1:
        fail("revision", "must be an integer >= 1")

    scope = packet.get("scope") if isinstance(packet.get("scope"), dict) else {}
    if not scope.get("subject_id"):
        fail("scope.subject_id", "must name the repository subject id")
    if not scope.get("topic_ids"):
        fail("scope.topic_ids", "must list at least one topic id")
    output = scope.get("output_path")
    if output is not None and (not isinstance(output, str) or not SAFE_PATH.match(output)):
        fail("scope.output_path", "must be a repository-relative path without traversal")

    for i, ref in enumerate(packet.get("input_refs") or []):
        if not isinstance(ref, dict):
            fail(f"input_refs[{i}]", "must be an object")
            continue
        if ref.get("verified_available"):
            if not ref.get("path"):
                fail(f"input_refs[{i}].path", "required when verified_available is true")
            if not isinstance(ref.get("sha256"), str) or not HEX64.match(ref["sha256"]):
                fail(f"input_refs[{i}].sha256", "must be the lowercase SHA-256 of the input that was read")

    objectives = [o for o in packet.get("objectives") or [] if isinstance(o, dict)]
    objective_ids = [o.get("objective_id") for o in objectives]
    if delivered and not objectives:
        fail("objectives", "a delivered packet needs at least one objective")
    if len(set(objective_ids)) != len(objective_ids) or None in objective_ids:
        fail("objectives", "objective_id values must be present and unique")

    items: dict[str, dict] = {}
    for group in ("activities", "recall_cards", "exercises"):
        for i, item in enumerate(packet.get(group) or []):
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
            for oid in item.get("objective_ids") or []:
                if oid not in objective_ids:
                    fail(where + ".objective_ids", f"unknown objective {oid!r}")
            if not item.get("objective_ids"):
                fail(where + ".objective_ids", "map the item to at least one objective")
            if group == "activities" and item.get("kind") not in KINDS:
                fail(where + ".kind", "must be one of " + ", ".join(sorted(KINDS)))
            prov = item.get("provenance") if group == "activities" else None
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
            if group == "exercises" and item.get("numeric_result") not in (None, ""):
                if not item.get("units"):
                    fail(where + ".units", "a numerical result needs units (or an explicit dimensionless note)")
                check = item.get("independent_check") or {}
                if delivered and not check.get("performed"):
                    fail(where + ".independent_check", "a delivered numerical exercise needs a performed independent check")

    for i, objective in enumerate(objectives):
        linked = [a for a in objective.get("activity_ids") or [] if a in items]
        unknown = [a for a in objective.get("activity_ids") or [] if a not in items]
        if unknown:
            fail(f"objectives[{i}].activity_ids", f"unknown items {unknown}")
        if delivered and not linked:
            fail(f"objectives[{i}]", "objective has no activity (report the gap in coverage.uncovered_objective_ids instead)")

    compat = packet.get("identity_compatibility") if isinstance(packet.get("identity_compatibility"), dict) else {}
    if compat.get("scheduler_change"):
        fail("identity_compatibility.scheduler_change", "learning design must not change the SRS scheduler or scoring")
    existing, proposed = set(), []
    for aid, item in items.items():
        ident = item.get("existing_identity") if isinstance(item.get("existing_identity"), dict) else {}
        if ident.get("question_id"):
            existing.add(str(ident["question_id"]))
        for value in (ident.get("proposed_new_id"), item.get("proposed_new_id")):
            if value:
                proposed.append(str(value))
    if len(set(proposed)) != len(proposed):
        fail("identity", "proposed new ids collide with each other")
    if existing & set(proposed):
        fail("identity", "a proposed new id equals an existing question id")
    if delivered and proposed and not compat.get("collisions_checked"):
        fail("identity_compatibility.collisions_checked", "must be true once new ids are proposed")
    if repo_root is not None:
        try:
            known = qa_index(repo_root)
        except (OSError, ValueError) as exc:
            fail("--repo-root", f"cannot read data/qa: {exc}")
        else:
            for qid in sorted(existing - known):
                fail("identity", f"existing question id {qid!r} is not in data/qa (copy ids from the repository, do not recompute them)")
            for qid in sorted(set(proposed) & known):
                fail("identity", f"proposed new id {qid!r} already exists in data/qa")

    if delivered:
        for issue in packet.get("blocking_issues") or []:
            if isinstance(issue, dict) and issue.get("code") == "UNFILLED_TEMPLATE":
                fail("blocking_issues", "remove UNFILLED_TEMPLATE only after the packet is filled; a delivered packet cannot carry it")
    return errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("packet", type=Path)
    parser.add_argument("--repo-root", type=Path, help="checkout whose data/qa holds the existing question ids")
    parser.add_argument("--template", action="store_true", help="validate the unfilled template (maintenance only)")
    args = parser.parse_args(argv)
    try:
        packet = json.loads(args.packet.read_text(encoding="utf-8-sig"))
    except (OSError, ValueError) as exc:
        print(f"ERROR: cannot load packet: {exc}", file=sys.stderr)
        return 2
    errors = validate_packet(packet, args.repo_root, args.template)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        print(f"INVALID: {len(errors)} error(s)", file=sys.stderr)
        return 1
    print("VALID: learning packet is consistent and traceable; academic correctness is not certified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
