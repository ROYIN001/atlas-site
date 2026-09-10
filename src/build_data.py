#!/usr/bin/env python3
"""สร้างดัชนีค้นหาใหม่จากเนื้อหาที่อยู่ใน data/t/

ต้นฉบับของเนื้อหาคือไฟล์ใน data/t/ เอง — หนึ่งหัวข้อหนึ่งไฟล์ ชื่อ
<วิชา>__<รหัสหัวข้อ>.json มีคีย์เดียวคือ "html"  แก้เนื้อหาที่ไฟล์นั้นได้ตรง ๆ
แล้วรันสคริปต์นี้เพื่อให้การค้นหาเห็นข้อความใหม่

    python3 src/build_data.py        # รันจากรากของ repo

สคริปต์จะเขียนใหม่เฉพาะ data/ix/*.json กับ data/manifest.json
ไม่แตะเนื้อหาใน data/t/
"""
import json, glob, os, re, pathlib, shutil, collections

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
assert (DATA / "t").is_dir(), f"ไม่พบ {DATA/'t'}"

tag, ent = re.compile(r'<[^>]*>'), re.compile(r'&#?[a-z0-9]{1,8};', re.I)
plain = lambda h: re.sub(r'\s+', ' ', ent.sub(' ', tag.sub(' ', h))).strip()

bysubj = collections.defaultdict(list)
for f in sorted(glob.glob(str(DATA / "t" / "*.json"))):
    name = os.path.basename(f)[:-5]
    if "__" not in name:
        print(f"  ข้าม {name} — ชื่อไฟล์ไม่มี '__'")
        continue
    sid, tid = name.split("__", 1)
    html = json.load(open(f, encoding="utf-8")).get("html", "")
    bysubj[sid].append({"id": tid, "hay": plain(html).lower()})

(DATA / "ix").mkdir(parents=True, exist_ok=True)
for _f in (DATA / "ix").glob("*.json"):
    _f.unlink()

manifest = {}
for sid, rows in sorted(bysubj.items()):
    json.dump({"rows": rows}, open(DATA / "ix" / f"{sid}.json", "w", encoding="utf-8"),
              ensure_ascii=False)
    manifest[sid] = {"n": len(rows)}
    print(f"  {sid:8} {len(rows):>3} หัวข้อ")

json.dump({"subjects": manifest}, open(DATA / "manifest.json", "w", encoding="utf-8"),
          ensure_ascii=False)
print(f"เขียนดัชนีใหม่ {len(manifest)} วิชา รวม {sum(len(v) for v in bysubj.values())} หัวข้อ")
