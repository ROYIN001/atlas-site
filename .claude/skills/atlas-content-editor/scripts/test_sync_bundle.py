"""Behavioral tests for sync_bundle.py on a disposable copy of the three skills."""

import shutil
import tempfile
import unittest
from pathlib import Path

import sync_bundle

SKILLS = Path(sync_bundle.__file__).resolve().parents[2]


class SyncBundleTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix=".handoff-test-", dir=Path.cwd())
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for name in sync_bundle.NAMES:
            shutil.copytree(SKILLS / name, self.root / ".claude" / "skills" / name,
                            ignore=shutil.ignore_patterns("__pycache__", "*.pyc", sync_bundle.SCRATCH + "*"))
        self.assertEqual([], sync_bundle.run(self.root, write=True))

    def skill(self, name="atlas-content-editor"):
        return self.root / ".claude" / "skills" / name

    def assertError(self, expected):
        errors = sync_bundle.run(self.root)
        self.assertTrue(any(expected in e for e in errors), errors)

    def test_clean_copy_passes(self):
        self.assertEqual([], sync_bundle.run(self.root))

    def test_mirror_drift_detected(self):
        target = self.root / ".agents" / "skills" / "atlas-content-editor" / "SKILL.md"
        target.write_text(target.read_text(encoding="utf-8") + "\nlocal edit\n", encoding="utf-8")
        self.assertError("mirror missing or different")

    def test_missing_shared_reference_is_reported_not_raised(self):
        (self.skill("atlas-learning-designer") / "references" / "repo-adapter.md").unlink()
        self.assertError("missing shared reference")

    def test_reference_style_link_to_missing_file(self):
        skill_md = self.skill() / "SKILL.md"
        skill_md.write_text(skill_md.read_text(encoding="utf-8") + "\nSee [the guide][g].\n\n[g]: references/missing.md\n",
                            encoding="utf-8")
        self.assertError("missing or external bundled reference references/missing.md")

    def test_code_and_footnotes_are_not_links(self):
        skill_md = self.skill() / "SKILL.md"
        skill_md.write_text(skill_md.read_text(encoding="utf-8") +
                            "\nRun `x = a[i](b)` or\n\n```\n[k]: not/a/link.md\nf[0](y)\n```\n\n[^1]: a footnote\n"
                            "Values: [1]: first value, see below\n", encoding="utf-8")
        self.assertEqual([], sync_bundle.run(self.root, write=True))

    def test_link_with_title_and_angle_brackets_is_checked(self):
        skill_md = self.skill() / "SKILL.md"
        skill_md.write_text(skill_md.read_text(encoding="utf-8") +
                            "\nSee [a](<references/no such.md> 'title').\n", encoding="utf-8")
        self.assertError("missing or external bundled reference references/no such.md")

    def test_line_endings_alone_are_not_drift(self):
        ref = self.skill("atlas-learning-designer") / "references" / "workflow-contract.md"
        ref.write_bytes(ref.read_bytes().replace(b"\n", b"\r\n"))
        self.assertFalse(any("shared reference drift" in e for e in sync_bundle.run(self.root, write=True)))

    def test_scratch_folders_are_never_mirrored(self):
        scratch = self.skill() / "scripts" / (sync_bundle.SCRATCH + "abc")
        scratch.mkdir()
        (scratch / "junk.txt").write_text("x", encoding="utf-8")
        self.assertEqual([], sync_bundle.run(self.root, write=True))
        self.assertFalse((self.root / ".agents" / "skills" / "atlas-content-editor" / "scripts" /
                          (sync_bundle.SCRATCH + "abc")).exists())

    def test_stale_mirror_folder_reported(self):
        (self.root / ".agents" / "skills" / "atlas-old-name").mkdir(parents=True)
        self.assertError("atlas-old-name: mirror folder has no canonical skill")

    def test_symlink_in_source_rejected(self):
        link = self.skill() / "references" / "outside.md"
        try:
            link.symlink_to(Path(self.temp.name) / "elsewhere.md")
        except (OSError, NotImplementedError):
            self.skipTest("symlinks are not available")
        self.assertError("symlinks are not allowed")

    def test_overlong_description_rejected(self):
        skill_md = self.skill() / "SKILL.md"
        text = skill_md.read_text(encoding="utf-8")
        head, rest = text.split("\ndescription: ", 1)
        line, tail = rest.split("\n", 1)
        skill_md.write_text(head + '\ndescription: "' + "x" * 1100 + '"\n' + tail, encoding="utf-8")
        self.assertError("description must be a JSON-quoted YAML string")


if __name__ == "__main__":
    unittest.main()
