#!/usr/bin/env python3
"""นับเนื้อหาต่อวิชาจากไฟล์จริง แล้วเทียบกับ src/counts-baseline.json — ด่าน «ของหายต้องรู้»

    python src/counts.py            # ตรวจ: จำนวนใดต่ำกว่า baseline = ตก (exit 1)
    python src/counts.py --update   # ตั้งใจเพิ่ม/ลดเนื้อหา: พิมพ์ diff แล้วเขียน baseline ใหม่
    python src/counts.py --json     # พิมพ์ค่าที่นับได้ตอนนี้เป็น JSON

ผู้อ่าน baseline: tests/audit-integrity.test.cjs (นับจากไฟล์แบบเดียวกันนี้ — แก้วิธีนับต้องแก้ทั้งสองที่)
และ src/verify.py (เทียบกับสิ่งที่หน้าเว็บวาดจริง)

ต่อวิชา
  topics      ไฟล์ใน data/t (หัวข้อ + บล็อกสรุป)       summary     เฉพาะบล็อกสรุป (<วิชา>__…-s1..s4)
  demo_slots  ช่อง data-demo ใน html                    meta_demos  ช่องเดโมในเมทาดาทา DEEP (demo/demos)
  demo_keys   คีย์ DEMOS ต่างกันที่ถูกอ้าง (html+DEEP)   fig_slots   ช่อง data-fig ใน html
  fig_files   ไฟล์ figs/<id>.webp ต่างกันที่ถูกอ้างและมีจริง
  ids         แอตทริบิวต์ id ใน html                    html_kb     ขนาด html รวม (KB) — ยอมให้ลดได้ 5 % (แก้ถ้อยคำให้สั้นลง)
ทั้งเว็บ (_site)
  demo_functions  คีย์ที่ลงทะเบียนใน DEMOS (app.js + js/subj)     fig_files  ไฟล์ .webp ใน figs/

ค่าในเมทาดาทา DEEP และคีย์ DEMOS อ่านผ่าน `node src/registry.cjs` — ถ้าไม่มี node จะใช้ค่าเดิมใน baseline
"""
import argparse
import json
import pathlib
import re
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
BASELINE = ROOT / "src" / "counts-baseline.json"
HTML_TOLERANCE = 0.05                    # html_kb ลดได้ไม่เกิน 5 % ต่อรอบ

# ---- วิธีนับ (ต้องตรงกับ tagAttrs() ใน tests/audit-integrity.test.cjs) ----
# นับเฉพาะแอตทริบิวต์ในแท็กเปิด ตัดคอมเมนต์และเนื้อใน <script> (JSON ของควิซ/วิดเจ็ต) ออกก่อน
_COMMENT = re.compile(r"<!--.*?-->", re.S)
_SCRIPT = re.compile(r"(<script\b[^>]*>).*?</script>", re.S | re.I)
_TAG = re.compile(r"<[A-Za-z][^>]*>")


def tag_attrs(html, name):
    html = _SCRIPT.sub(r"\1</script>", _COMMENT.sub("", html))
    pat = re.compile(r"(?<![\w-])" + re.escape(name) + r"\s*=\s*([\"'])(.*?)\1", re.S)
    return [m.group(2) for t in _TAG.finditer(html) for m in pat.finditer(t.group(0))]


SUMMARY = re.compile(r".+-s[1-4]")      # รหัสบล็อกสรุป (ตรงกับ verify.py)


def registry():
    node = shutil.which("node")
    if not node:
        return None
    try:
        out = subprocess.run([node, str(ROOT / "src" / "registry.cjs")], capture_output=True,
                             check=True, timeout=120).stdout
        return json.loads(out.decode("utf-8"))
    except Exception as e:                 # app.js พัง — ให้ tests เป็นคนบอกรายละเอียด
        print(f"  ! อ่านทะเบียน app.js ไม่ได้: {e}", file=sys.stderr)
        return None


def count(reg=None, base=None):
    figs = {p.stem for p in (ROOT / "figs").glob("*.webp")}
    subjects = {}
    for f in sorted((ROOT / "data" / "t").glob("*__*.json")):
        sid, tid = f.stem.split("__", 1)
        html = json.loads(f.read_text(encoding="utf-8")).get("html", "")
        s = subjects.setdefault(sid, {"topics": 0, "summary": 0, "demo_slots": 0, "meta_demos": 0,
                                      "demo_keys": set(), "fig_slots": 0, "fig_files": set(),
                                      "ids": 0, "html_kb": 0})
        s["topics"] += 1
        s["summary"] += bool(SUMMARY.fullmatch(tid))
        demos = tag_attrs(html, "data-demo")
        s["demo_slots"] += len(demos)
        s["demo_keys"].update(demos)
        fs = tag_attrs(html, "data-fig")
        s["fig_slots"] += len(fs)
        s["fig_files"].update(x for x in fs if x in figs)
        s["ids"] += len(tag_attrs(html, "id"))
        s["html_kb"] += len(html.encode("utf-8"))
    for sid, s in subjects.items():
        if reg is not None:
            meta = reg["metaDemos"].get(sid, [])
            s["meta_demos"] = len(meta)
            s["demo_keys"].update(meta)
            s["demo_keys"] = len(s["demo_keys"])
        else:                              # ไม่มี node: คงค่าที่ต้องอ่านจาก app.js ไว้ตาม baseline
            old = ((base or {}).get("subjects") or {}).get(sid, {})
            s["meta_demos"] = old.get("meta_demos", 0)
            s["demo_keys"] = max(len(s["demo_keys"]), old.get("demo_keys", 0))
        s["fig_files"] = len(s["fig_files"])
        s["html_kb"] = round(s["html_kb"] / 1024)
    site = {"demo_functions": len(reg["demoKeys"]) if reg is not None
            else ((base or {}).get("_site") or {}).get("demo_functions", 0),
            "fig_files": len(figs)}
    return {"_site": site, "subjects": subjects}


def compare(cur, base):
    """คืน (ตก, เพิ่มขึ้น) — รายการข้อความ"""
    fails, grew = [], []
    rows = [("_site", cur["_site"], base.get("_site") or {})]
    rows += [(sid, v, (base.get("subjects") or {}).get(sid)) for sid, v in cur["subjects"].items()]
    for sid, v, b in rows:
        if b is None:
            fails.append(f"{sid}: ไม่มีใน counts-baseline (วิชาใหม่? รัน python src/counts.py --update)")
            continue
        for k, x in v.items():
            bx = b.get(k)
            if bx is None:
                continue
            low = bx * (1 - HTML_TOLERANCE) if k == "html_kb" else bx
            if x < low:
                fails.append(f"{sid}: {k} ลดลง {bx} → {x}")
            elif x > bx:
                grew.append(f"{sid}: {k} {bx} → {x}")
    for sid in (base.get("subjects") or {}):
        if sid not in cur["subjects"]:
            fails.append(f"{sid}: อยู่ใน baseline แต่ไม่มีไฟล์ใน data/t แล้ว")
    return fails, grew


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--update", action="store_true", help="เขียน baseline ใหม่จากไฟล์ตอนนี้ (พิมพ์ diff ก่อน)")
    ap.add_argument("--json", action="store_true", help="พิมพ์ค่าที่นับได้เป็น JSON")
    args = ap.parse_args()

    base = json.loads(BASELINE.read_text(encoding="utf-8")) if BASELINE.exists() else {}
    reg = registry()
    if reg is None:
        print("  ! ไม่พบ node — meta_demos/demo_keys/demo_functions ใช้ค่าเดิมใน baseline", file=sys.stderr)
    cur = count(reg, base)
    if args.json:
        print(json.dumps(cur, ensure_ascii=False, indent=1, sort_keys=True))
        return 0

    fails, grew = compare(cur, base) if base else ([], [])
    keys = list(next(iter(cur["subjects"].values())).keys())
    print(f"{'วิชา':8} " + " ".join(f"{k:>10}" for k in keys))
    for sid, v in cur["subjects"].items():
        print(f"{sid:8} " + " ".join(f"{v[k]:>10}" for k in keys))
    print("ทั้งเว็บ  " + " · ".join(f"{k} {v}" for k, v in cur["_site"].items()))

    if args.update:
        if not base:
            print("สร้าง baseline ครั้งแรก")
        for m in fails:
            print("  − " + m)
        for m in grew:
            print("  + " + m)
        if base and not fails and not grew:
            print("ไม่มีอะไรเปลี่ยน")
        out = {"_about": "สร้างโดย python src/counts.py --update — ห้ามแก้มือ · จำนวนใดต่ำกว่านี้ tests/verify ตก",
               "_site": cur["_site"], "subjects": cur["subjects"]}
        BASELINE.write_text(json.dumps(out, ensure_ascii=False, indent=1, sort_keys=True) + "\n", encoding="utf-8")
        print(f"เขียน src/{BASELINE.name} แล้ว ({len(cur['subjects'])} วิชา)")
        return 0

    if not base:
        print("ยังไม่มี src/counts-baseline.json — รัน python src/counts.py --update")
        return 1
    for m in grew:
        print("  + " + m + "  (มากกว่า baseline — รัน --update เพื่อยกระดับด่าน)")
    for m in fails:
        print("  ✗ " + m)
    print("FAIL" if fails else "PASS")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
