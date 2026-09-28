#!/usr/bin/env python3
"""ทะเบียนบล็อกที่ประกอบอัตโนมัติใน app.js / app.css — src/blocks.json

บล็อกเหล่านี้สร้างจากต้นฉบับใน _work/ (บนเครื่องเจ้าของงาน) ด้วยสคริปต์ประกอบ ถ้าแก้ในบล็อกตรง ๆ
ครั้งหน้าที่รันสคริปต์ประกอบ งานที่แก้มือจะหายเงียบ ๆ — tests/blocks.test.cjs จึงเทียบ sha1 ของแต่ละบล็อก
กับทะเบียน แล้วตกพร้อมบอกต้นฉบับและคำสั่งประกอบ

    python src/blocks.py                  # ตรวจ: บล็อกไหนต่างจากทะเบียน
    python src/blocks.py --update NAME…   # หลังรันสคริปต์ประกอบของบล็อกนั้นจริง: บันทึก sha1 ใหม่ (NAME = all ได้)

sha1 = ข้อความตั้งแต่ marker เริ่มถึงท้าย marker จบ (รวม marker) เป็น UTF-8 หลังแปลง \\r\\n เป็น \\n
— สูตรเดียวกับ tests/blocks.test.cjs
"""
import hashlib
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
REG = ROOT / "src" / "blocks.json"


def block(text, b):
    s = text.find(b["start"])
    if s < 0 or text.find(b["start"], s + 1) >= 0:
        return None, "ไม่พบ marker เริ่ม" if s < 0 else "marker เริ่มซ้ำ"
    e = text.find(b["end"], s + len(b["start"]))
    if e < 0 or text.find(b["end"], e + 1) >= 0:
        return None, "ไม่พบ marker จบ" if e < 0 else "marker จบซ้ำ"
    return text[s:e + len(b["end"])], None


def sha(chunk):
    return hashlib.sha1(chunk.replace("\r\n", "\n").encode("utf-8")).hexdigest()[:12]


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    reg = json.loads(REG.read_text(encoding="utf-8"))
    args = sys.argv[1:]
    update = set(args[1:]) if args[:1] == ["--update"] else None
    if update is not None and not update:
        print("ระบุชื่อบล็อก หรือ all")
        return 2
    texts, bad, changed = {}, [], []
    for name, b in reg["blocks"].items():
        if b["file"] not in texts:
            with open(ROOT / b["file"], encoding="utf-8", newline="") as f:
                texts[b["file"]] = f.read()
        chunk, err = block(texts[b["file"]], b)
        if err:
            bad.append(f"{name}: {b['file']} {err}")
            continue
        h = sha(chunk)
        if h != b["sha1"]:
            if update is not None and (name in update or "all" in update):
                b["sha1"] = h
                changed.append(name)
            else:
                bad.append(f"{name}: {b['file']} ต่างจากทะเบียน — ต้นฉบับ {b['source']} · ประกอบด้วย {b['build']}")
    if changed:
        REG.write_text(json.dumps(reg, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print("บันทึก sha1 ใหม่: " + " ".join(changed))
    for m in bad:
        print("  ✗ " + m)
    print("FAIL" if bad else f"PASS ({len(reg['blocks'])} บล็อก)")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
