#!/usr/bin/env python3
"""Check or regenerate Codex mirrors of the three canonical Claude project skills.

Checkout maintenance only: run it from an Atlas checkout (it locates the repo
four levels above this file). It validates the bundle files and that
.agents/skills/atlas-* mirrors equal .claude/skills/atlas-* byte for byte. It
does not test how the skills behave and is not meant for an uploaded Claude.ai
skill folder.
"""
import argparse
import json
import re
import sys
from pathlib import Path

NAMES = ("atlas-content-editor", "atlas-learning-designer", "atlas-technical-reviewer")
COMMON = ("workflow-contract.md", "repo-adapter.md")
INLINE_LINK = re.compile(r"\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")
REFERENCE_LINK = re.compile(r"^\s{0,3}\[[^\]]+\]:\s*<?([^>\s]+)>?", re.M)


def files(folder):
    return {p.relative_to(folder).as_posix(): p for p in folder.rglob("*")
            if (p.is_file() or p.is_symlink()) and "__pycache__" not in p.parts and p.suffix != ".pyc"}


def read_text(path, errors, label):
    try:
        return path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as exc:
        errors.append(f"{label}: cannot read as UTF-8 ({exc.__class__.__name__}: {exc})")
        return None


def link_targets(text):
    for target in INLINE_LINK.findall(text) + REFERENCE_LINK.findall(text):
        target = target.strip("<>")
        if "://" in target or target.startswith(("#", "mailto:")):
            continue
        yield target


def validate_source(root):
    errors = []
    for name in NAMES:
        folder = root / ".claude" / "skills" / name
        if not folder.is_dir():
            errors.append(f"{name}: missing skill folder {folder}")
            continue
        src = files(folder)
        entry = folder / "SKILL.md"
        text = read_text(entry, errors, f"{name}/SKILL.md") if entry.is_file() else None
        if text is None:
            errors.append(f"{name}: missing or unreadable SKILL.md")
            continue
        match = re.match(r"^---\nname: ([a-z0-9-]+)\ndescription: (.+)\n---\n", text)
        if not match or match.group(1) != name:
            errors.append(f"{name}: unexpected frontmatter format/name")
        else:
            try:
                description = json.loads(match.group(2))
                if not isinstance(description, str) or not description.strip():
                    raise ValueError("empty description")
                if len(description) > 1024 or "<" in description or ">" in description:
                    raise ValueError("description over 1024 characters or contains < >")
            except ValueError as exc:
                errors.append(f"{name}: description must be a JSON-quoted YAML string ({exc})")
        if "[TODO:" in text:
            errors.append(f"{name}: unfinished scaffold")
        for relative, path in src.items():
            if path.is_symlink():
                errors.append(f"{name}/{relative}: symlinks are not allowed in a skill bundle")
                continue
            if path.suffix in (".md", ".json", ".py", ".yaml"):
                value = read_text(path, errors, f"{name}/{relative}")
                if value is None:
                    continue
                if any(ord(c) < 32 and c not in "\n\r\t" for c in value):
                    errors.append(f"{name}/{relative}: unexpected control character")
                if path.suffix == ".json":
                    try:
                        json.loads(value)
                    except ValueError as exc:
                        errors.append(f"{name}/{relative}: invalid JSON: {exc}")
                if path.suffix == ".md":
                    for target in link_targets(value):
                        resolved = (path.parent / target.split("#")[0]).resolve()
                        if not resolved.is_relative_to(folder.resolve()) or not resolved.is_file():
                            errors.append(f"{name}/{relative}: missing or external bundled reference {target}")
        metadata = folder / "agents" / "openai.yaml"
        meta_text = read_text(metadata, errors, f"{name}/agents/openai.yaml") if metadata.is_file() else None
        if not meta_text or ("$" + name) not in meta_text:
            errors.append(f"{name}: missing matching invocation metadata")
    for common in COMMON:
        blobs = []
        for n in NAMES:
            path = root / ".claude" / "skills" / n / "references" / common
            try:
                blobs.append(path.read_bytes())
            except OSError as exc:
                errors.append(f"{n}/references/{common}: missing shared reference ({exc.__class__.__name__})")
        if len(set(blobs)) > 1:
            errors.append(f"shared reference drift: {common}")
    return errors


def run(root, write=False):
    errors = validate_source(root)
    if errors:
        return errors
    mirrors = root / ".agents" / "skills"
    if mirrors.is_dir():
        for stale in sorted(p.name for p in mirrors.iterdir()
                            if p.is_dir() and p.name.startswith("atlas-") and p.name not in NAMES):
            errors.append(f"{stale}: mirror folder has no canonical skill; inspect and remove it by hand")
    for name in NAMES:
        source = root / ".claude" / "skills" / name
        target = mirrors / name
        # Never overwrite a link redirecting a project mirror outside this checkout.
        if not target.resolve().is_relative_to(root.resolve()) or target.is_symlink():
            errors.append(f"{name}: mirror escapes checkout or is a symlink")
            continue
        src = files(source)
        dst = files(target) if target.exists() else {}
        for extra in set(dst) - set(src):
            errors.append(f"{name}: unexpected mirror file {extra}; inspect it, no auto-delete")
        for relative, path in src.items():
            output = target / relative
            if output.is_symlink() or not output.resolve().is_relative_to(target.resolve()):
                errors.append(f"{name}/{relative}: unsafe mirror path")
                continue
            content = path.read_bytes()
            if write:
                output.parent.mkdir(parents=True, exist_ok=True)
                output.write_bytes(content)
            elif not output.is_file() or output.read_bytes() != content:
                errors.append(f"{name}/{relative}: mirror missing or different")
    return errors


def main():
    if sys.version_info < (3, 9):
        sys.exit("sync_bundle.py needs Python 3.9 or newer")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="regenerate only named project mirrors")
    args = parser.parse_args()
    repo = Path(__file__).resolve().parents[4]
    if not (repo / ".claude" / "skills").is_dir() or not (repo / "CLAUDE.md").is_file():
        sys.exit(f"not an Atlas checkout: {repo} (run this script from .claude/skills/atlas-content-editor/scripts in the repository)")
    failures = run(repo, args.write)
    if failures:
        print("\n".join(failures))
        raise SystemExit(1)
    print("PASS: 3 skill bundles (frontmatter, UTF-8, JSON, inline and reference links) and byte-identical Codex mirrors")


if __name__ == "__main__":
    main()
