#!/usr/bin/env python3
"""เลือกวิชาที่ต้องรัน verify ใน CI (.github/workflows/check.yml)

    python src/ci_subjects.py --all                                   # ทุกวิชาใน data/manifest.json
    git diff --name-only origin/main...HEAD | python src/ci_subjects.py   # วิชาที่ไฟล์ใน diff แตะ + toe

พิมพ์ JSON array บรรทัดเดียว (ใช้เป็น matrix) · ไฟล์ → วิชา:
  data/t/<วิชา>__*.json · data/ix/<วิชา>.json · js/subj/<วิชา>.js|css · data/vh/* → vhist · data/ih/* → hist
  figs/<id>.webp → วิชาที่อ้าง data-fig="<id>"
  src/verify.py หรือ workflow นี้เอง → ทุกวิชา (ด่านเปลี่ยน ต้องพิสูจน์กับทุกวิชา)
toe (วิชาเล็กสุด ~3 วินาที) รันทุกครั้งเป็นตัวแทนของโครงเว็บส่วนกลาง (app.js · app.css · index.html …)
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
ALWAYS = "toe"
EVERYTHING = {"src/verify.py", ".github/workflows/check.yml"}


def main():
    subjects = list(json.loads((ROOT / "data" / "manifest.json").read_text(encoding="utf-8"))["subjects"])
    if "--all" in sys.argv[1:]:
        print(json.dumps(subjects))
        return 0
    changed = [l.strip().replace("\\", "/") for l in sys.stdin if l.strip()]
    if any(f in EVERYTHING for f in changed):
        print(json.dumps(subjects))
        return 0
    figs = {}
    if any(f.startswith("figs/") for f in changed):
        for f in (ROOT / "data" / "t").glob("*__*.json"):
            sid = f.name.split("__", 1)[0]
            for m in re.finditer(r'data-fig="([^"]+)"', json.loads(f.read_text(encoding="utf-8"))["html"]):
                figs.setdefault(m.group(1), set()).add(sid)
    hit = {ALWAYS}
    for f in changed:
        m = (re.match(r"data/t/([^/]+?)__", f) or re.match(r"data/ix/([^/]+)\.json$", f)
             or re.match(r"js/subj/([^/]+)\.(?:js|css)$", f))
        if m:
            hit.add(m.group(1))
        elif f.startswith("data/vh/"):
            hit.add("vhist")
        elif f.startswith("data/ih/"):
            hit.add("hist")
        elif f.startswith("figs/"):
            hit |= figs.get(pathlib.PurePosixPath(f).stem, set())
    print(json.dumps([s for s in subjects if s in hit]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
