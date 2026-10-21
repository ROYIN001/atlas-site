#!/usr/bin/env python3
"""Check or regenerate Codex mirrors of the three canonical Claude project skills."""
import argparse
import json
import re
from pathlib import Path

NAMES = ("atlas-content-editor", "atlas-learning-designer", "atlas-technical-reviewer")
COMMON = ("workflow-contract.md", "repo-adapter.md")

def files(folder):
    return {p.relative_to(folder).as_posix(): p for p in folder.rglob("*")
            if p.is_file() and "__pycache__" not in p.parts and p.suffix != ".pyc"}

def validate_source(root):
    errors = []
    for name in NAMES:
        folder = root / ".claude" / "skills" / name
        src = files(folder)
        entry = folder / "SKILL.md"
        if not entry.is_file():
            errors.append(f"{name}: missing SKILL.md")
            continue
        text = entry.read_text(encoding="utf-8")
        match = re.match(r"^---\nname: ([a-z0-9-]+)\ndescription: (.+)\n---\n", text)
        if not match or match.group(1) != name:
            errors.append(f"{name}: unexpected frontmatter format/name")
        else:
            try:
                description = json.loads(match.group(2))
                if not isinstance(description, str) or not description.strip():
                    raise ValueError("empty description")
            except ValueError:
                errors.append(f"{name}: description must be a JSON-quoted YAML string")
        if "[TODO:" in text:
            errors.append(f"{name}: unfinished scaffold")
        for relative, path in src.items():
            if path.suffix in (".md", ".json", ".py", ".yaml"):
                value = path.read_text(encoding="utf-8")
                if any(ord(c) < 32 and c not in "\n\r\t" for c in value):
                    errors.append(f"{name}/{relative}: unexpected control character")
                if path.suffix == ".json":
                    try:
                        json.loads(value)
                    except ValueError as exc:
                        errors.append(f"{name}/{relative}: invalid JSON: {exc}")
            if path.suffix == ".md":
                for target in re.findall(r"\]\(([^)]+)\)", path.read_text(encoding="utf-8")):
                    if "://" in target or target.startswith("#"):
                        continue
                    resolved = (path.parent / target.split("#")[0]).resolve()
                    if not resolved.is_relative_to(folder.resolve()) or not resolved.is_file():
                        errors.append(f"{name}/{relative}: missing or external bundled reference {target}")
        metadata = folder / "agents" / "openai.yaml"
        if not metadata.is_file() or ("$" + name) not in metadata.read_text(encoding="utf-8"):
            errors.append(f"{name}: missing matching invocation metadata")
    for common in COMMON:
        blobs = [(root / ".claude" / "skills" / n / "references" / common).read_bytes()
                 for n in NAMES]
        if len(set(blobs)) != 1:
            errors.append(f"shared reference drift: {common}")
    return errors

def run(root, write=False):
    errors = validate_source(root)
    if errors:
        return errors
    for name in NAMES:
        source = root / ".claude" / "skills" / name
        target = root / ".agents" / "skills" / name
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

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="regenerate only named project mirrors")
    args = parser.parse_args()
    repo = Path(__file__).resolve().parents[4]
    failures = run(repo, args.write)
    if failures:
        print("\n".join(failures))
        raise SystemExit(1)
    print("PASS: 3 skill bundles, shared references, JSON, local links and Codex mirrors")
