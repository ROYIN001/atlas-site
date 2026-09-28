# ขั้นตอน build เพิ่มเติม

`python src/build_data.py` รันทุกไฟล์ `*.py` ในโฟลเดอร์นี้ (เรียงตามชื่อ ข้ามไฟล์ที่ขึ้นต้น `_`) โดยเรียก `run(ctx)`

```python
# src/build_steps/qa.py — ตัวอย่างโครง
from buildlib import stable_id, plain          # src/ อยู่ใน sys.path แล้ว

def run(ctx):
    # ctx["root"]      Path ของ repo
    # ctx["data"]      Path ของ data/
    # ctx["topics"]    {sid: [(tid, html), …]} ทุกหัวข้อจาก data/t (เรียงตามชื่อไฟล์)
    # ctx["manifest"]  สำเนาของ manifest (อ่านอย่างเดียว)
    out = ctx["data"] / "qa"
    out.mkdir(exist_ok=True)
    …
    return "เขียน data/qa 12 วิชา"             # ข้อความสั้นที่จะพิมพ์
```

กติกา
- เขียนผลลง `data/<ชื่อของตัวเอง>/` หรือ `data/<ชื่อ>.json` เท่านั้น · **ห้าม** แก้ `data/manifest.json` หรือ `data/ix/` (เป็นของสคริปต์หลัก)
- ไฟล์ที่เขียนต้องเป็น JSON แบบ `ensure_ascii=False` และ deterministic (รันซ้ำแล้วไบต์เท่าเดิม) ไม่งั้น git จะเห็น diff ทุกครั้ง
- ไฟล์ข้อมูลใหม่ที่หน้าเว็บโหลด ต้องเพิ่มใน `HOOKS.on("offline", sid => […])` ของ session ที่ใช้มัน (CLAUDE.md หัวข้อ 13)
- id เสถียรจากข้อความใช้ `stable_id()` — ตรงกับ `stableId()` ใน app.js (tests/hooks.test.cjs ตรวจ)
- เทสต์ของขั้นตอน: เขียน `tests/<ชื่อ>.test.cjs` แยกไฟล์ ไม่แก้ tests เดิม
