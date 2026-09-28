#!/usr/bin/env python3
"""สร้างดัชนีค้นหาใหม่จากเนื้อหาที่อยู่ใน data/t/

ต้นฉบับของเนื้อหาคือไฟล์ใน data/t/ เอง — หนึ่งหัวข้อหนึ่งไฟล์ ชื่อ
<วิชา>__<รหัสหัวข้อ>.json มีคีย์เดียวคือ "html"  แก้เนื้อหาที่ไฟล์นั้นได้ตรง ๆ
แล้วรันสคริปต์นี้เพื่อให้การค้นหาเห็นข้อความใหม่

    python3 src/build_data.py        # รันจากรากของ repo

สคริปต์จะเขียนใหม่เฉพาะ data/ix/*.json กับ data/manifest.json
ไม่แตะเนื้อหาใน data/t/ · ถ้ามี js/subj/<วิชา>.js หรือ .css จะบันทึก hash ของไฟล์ลง manifest ด้วย
· manifest.subjects.<วิชา>.v = hash ของเนื้อหาวิชานั้น — app.js ใช้เป็น ?v= ของ data/t และ data/ix ของวิชา
· เลขเวอร์ชันแคช (hash ของ app.js + app.css + manifest) เขียนทับ «เฉพาะโทเคน» app.css?v= / app.js?v=
  ใน index.html และ DATA_VERSION ใน app.js — ไม่ต้องแก้มืออีก (tests ตรวจว่าตรงกัน)
"""
import json, glob, os, re, pathlib, shutil, collections, hashlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
assert (DATA / "t").is_dir(), f"ไม่พบ {DATA/'t'}"

tag, ent = re.compile(r'<[^>]*>'), re.compile(r'&#?[a-z0-9]{1,8};', re.I)

# <script type="application/json"> ในหัวข้อ (ควิซ quiz2 · ข้อมูลวิดเจ็ต ih-data) — เก็บเข้าดัชนีเฉพาะ
# ข้อความที่คนอ่าน (สตริงที่มีอักษรไทยหรือซีริลลิก) ไม่เก็บชื่อคีย์ ตัวเลข รหัสสี รหัสประเทศ
# ไม่งั้นค้น «frames» หรือ «options» แล้วเจอทุกหัวข้อ · สคริปต์ที่ไม่ใช่ JSON ไม่ใช่เนื้อหา ตัดทิ้ง
script = re.compile(r'<script\b[^>]*>(.*?)</script>', re.S | re.I)
human = re.compile(r'[฀-๿А-Яа-яЁё]')

def _strings(o):
    if isinstance(o, str):
        if human.search(o):
            yield o
    elif isinstance(o, dict):
        for v in o.values():
            yield from _strings(v)
    elif isinstance(o, list):
        for v in o:
            yield from _strings(v)

def _script_text(m):
    try:
        return " " + " ".join(dict.fromkeys(_strings(json.loads(m.group(1))))) + " "
    except ValueError:
        return " "

plain = lambda h: re.sub(r'\s+', ' ', ent.sub(' ', tag.sub(' ', script.sub(_script_text, h)))).strip()

bysubj = collections.defaultdict(list)
HTML = {}                                  # (วิชา, หัวข้อ) → html
for f in sorted(glob.glob(str(DATA / "t" / "*.json"))):
    name = os.path.basename(f)[:-5]
    if "__" not in name:
        print(f"  ข้าม {name} — ชื่อไฟล์ไม่มี '__'")
        continue
    sid, tid = name.split("__", 1)
    html = HTML[sid, tid] = json.load(open(f, encoding="utf-8")).get("html", "")
    bysubj[sid].append({"id": tid, "hay": plain(html).lower()})

(DATA / "ix").mkdir(parents=True, exist_ok=True)
for _f in (DATA / "ix").glob("*.json"):
    _f.unlink()

def subject_version(sid, rows):
    """sha1 10 ตัวของ html ทุกหัวข้อของวิชา (เรียงตามชื่อไฟล์ คั่นด้วย \\n) — ตรงกับ tests/audit-integrity"""
    h = hashlib.sha1()
    for i, r in enumerate(rows):
        h.update((("\n" if i else "") + HTML[sid, r["id"]]).encode("utf-8"))
    return h.hexdigest()[:10]


manifest = {}
SUBJ = ROOT / "js" / "subj"          # ไฟล์ JS/CSS แยกรายวิชา (ถ้ามี) — app.js โหลดเมื่อเปิดวิชานั้น
for sid, rows in sorted(bysubj.items()):
    json.dump({"rows": rows}, open(DATA / "ix" / f"{sid}.json", "w", encoding="utf-8"),
              ensure_ascii=False)
    # ?v= ของวิชา: เปลี่ยนเมื่อเนื้อหาวิชานี้เปลี่ยนเท่านั้น (แก้วิชาเดียว แคชของวิชาอื่นยังใช้ได้)
    manifest[sid] = {"n": len(rows), "v": subject_version(sid, rows)}
    extra = ""
    for ext in ("js", "css"):         # hash ของไฟล์ใช้เป็น ?v= — ไฟล์เปลี่ยนเมื่อไร เบราว์เซอร์โหลดใหม่เอง
        f = SUBJ / f"{sid}.{ext}"
        if f.is_file():
            manifest[sid][ext] = hashlib.sha1(f.read_bytes().replace(b"\r\n", b"\n")).hexdigest()[:10]   # CRLF ของ Windows = ไฟล์เดียวกัน
            extra += f" + {sid}.{ext}"
    print(f"  {sid:8} {len(rows):>3} หัวข้อ{extra}")
for f in sorted(SUBJ.glob("*.*")) if SUBJ.is_dir() else []:
    if f.stem not in manifest:
        print(f"  ! {f.name}: ไม่มีวิชา {f.stem} ใน data/t — ไฟล์นี้จะไม่ถูกโหลด")

json.dump({"subjects": manifest}, open(DATA / "manifest.json", "w", encoding="utf-8"),
          ensure_ascii=False)
print(f"เขียนดัชนีใหม่ {len(manifest)} วิชา รวม {sum(len(v) for v in bysubj.values())} หัวข้อ")

# ---------- เลขเวอร์ชันแคช: index.html (app.css?v= · app.js?v=) + DATA_VERSION ใน app.js ----------
# hash = sha1(app.js ที่ค่า DATA_VERSION เป็น "" + \0 + app.css + \0 + data/manifest.json)[:10] หลังแปลง \r\n เป็น \n
# · ตัดค่า DATA_VERSION ออกก่อน ไม่งั้นเขียนค่าใหม่แล้ว hash เปลี่ยนตามไม่รู้จบ
# · \r\n → \n: เครื่อง Windows (GitHub Desktop) อาจ checkout เป็น CRLF (.gitattributes text=auto) ต้องได้ค่าเดียวกับ CI
# สูตรเดียวกับ buildVersion() ใน tests/audit-integrity · แทนที่เฉพาะโทเคน ห้ามเขียน index.html ทั้งไฟล์ (CLAUDE.md หัวข้อ 12)
DV = re.compile(r'(const DATA_VERSION = ")[^"]*(";)')
TOKENS = [re.compile(r'(app\.css\?v=)[^"\'&\s>]+'), re.compile(r'(app\.js\?v=)[^"\'&\s>]+')]


def rd(path):                                     # อ่านแบบไม่แปลงปลายบรรทัด
    with open(path, encoding="utf-8", newline="") as f:
        return f.read()


def lf(b):
    return b.replace(b"\r\n", b"\n")


def build_version():
    app = rd(ROOT / "app.js")
    assert len(DV.findall(app)) == 1, 'app.js ต้องมี const DATA_VERSION = "…"; ที่เดียว'
    norm = DV.sub(r"\g<1>\g<2>", app).encode("utf-8")
    return hashlib.sha1(lf(norm) + b"\0" + lf((ROOT / "app.css").read_bytes()) + b"\0"
                        + lf((DATA / "manifest.json").read_bytes())).hexdigest()[:10]


def stamp(path, fix):
    old = rd(path)
    new = fix(old)
    if new != old:
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(new)
        return path.name
    return None


VERSION = build_version()


def _index(html):
    for t in TOKENS:
        assert len(t.findall(html)) == 1, f"index.html ต้องมีโทเคน {t.pattern} ที่เดียว"
        html = t.sub(lambda m: m.group(1) + VERSION, html)
    return html


_changed = [n for n in (stamp(ROOT / "app.js", lambda s: DV.sub(lambda m: m.group(1) + VERSION + m.group(2), s)),
                        stamp(ROOT / "index.html", _index)) if n]
print(f"เวอร์ชันแคช {VERSION}" + (f" — อัปเดต {' '.join(_changed)}" if _changed else " (ไม่เปลี่ยน)"))

# ---------- ขั้นตอน build เพิ่มเติม (src/build_steps/*.py) ----------
# แต่ละ session/ความสามารถมีไฟล์ของตัวเอง มีฟังก์ชัน run(ctx) เขียนผลลง data/<ชื่อของตัวเอง>/ หรือ data/<ชื่อ>.json
# ห้ามแก้ manifest.json หรือ data/ix จากขั้นตอนเหล่านี้ (เป็นของสคริปต์หลัก) · รันเรียงตามชื่อไฟล์ · ล้มหนึ่งไฟล์ไม่หยุดไฟล์อื่น
import importlib.util, sys, traceback
sys.path.insert(0, str(ROOT / "src"))
STEPS = sorted((ROOT / "src" / "build_steps").glob("*.py")) if (ROOT / "src" / "build_steps").is_dir() else []
ctx = {"root": ROOT, "data": DATA,
       "topics": {sid: [(r["id"], json.load(open(DATA / "t" / f"{sid}__{r['id']}.json", encoding="utf-8"))["html"]) for r in rows]
                  for sid, rows in bysubj.items()},
       "manifest": {k: dict(v) for k, v in manifest.items()}}
failed = 0
for f in STEPS:
    if f.name.startswith("_"):
        continue
    try:
        spec = importlib.util.spec_from_file_location("build_steps." + f.stem, f)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        msg = mod.run(ctx)
        print(f"  ขั้น {f.stem}: {msg or 'เสร็จ'}")
    except Exception:
        failed += 1
        print(f"  ! ขั้น {f.stem} ล้ม:\n" + "".join("    " + l for l in traceback.format_exc().splitlines(True)))
if failed:
    sys.exit(1)
