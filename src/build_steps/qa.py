"""คำถามสอบปากเปล่า details.qa ทุกวิชา → data/qa/<วิชา>.json + data/qa/_index.json  (S5 · CLAUDE.md หัวข้อ 14)

data/qa/<sid>.json = [ { tid, id, q, [n], [qh], a_html, hasRu }, … ]  เรียงตามลำดับหัวข้อ (เลขในรหัสหัวข้อเรียงแบบตัวเลข)
    tid     รหัสหัวข้อที่คำถามอยู่
    id      id ของ <details class="qa"> — ใช้ของเดิมถ้ามี ไม่งั้น "qa-" + stable_id(ข้อความคำถาม)  (ข้อตกลงร่วม §14)
            ข้อความคำถาม = เนื้อใน .qa-q (STD2) หรือ <summary> (รูปแบบเดิม) ถอดแท็กเป็นช่องว่าง แปลง &…; เป็นตัวอักษร
            คำถามเดียวกันซ้ำหลายหัวข้อในวิชาเดียว: ที่แรกได้ id ตามกติกา ที่ถัดไปต่อท้าย "-<tid>" (และ "-2", "-3" ถ้ายังซ้ำ)
    q       ข้อความคำถามล้วน (ใช้แสดงผล/อ่านออกเสียง)   n   ป้ายเลขข้อ (.qa-n) ถ้ามี
    qh      html ของคำถาม เฉพาะเมื่อมีแท็กข้างใน (ตัวห้อย สูตร ป้ายไทย)
    a_html  html ของคำตอบ (.ans) ตัด [data-demo] / <figure> / <script> ออก — รูป/แบบจำลองแทนด้วยลิงก์ «ดูในเนื้อหา» (a.qa-see)
    hasRu   คำตอบมีภาษารัสเซียให้อ่านออกเสียง (.ans-ru หรือเป็นภาษารัสเซียเกือบทั้งหมด) — กติกาเดียวกับ qaRuText() ใน app.js
data/qa/_index.json = { <sid>: { n, t: {<tid>: จำนวน}, z: {<tid>: จำนวนควิซ quiz2}, fix: {<tid>: {<ลำดับ details.qa ในหัวข้อ นับจาก 0>: id}} } }
    fix = id ที่ต่างจากกติกาพื้นฐาน (คำถามซ้ำข้ามหัวข้อ) — hook "fill" ใน app.js ใช้ใส่ id ให้ตรงกับไฟล์นี้โดยไม่ต้องโหลดคำตอบทั้งวิชา
"""
import json
import re
from html import unescape
from html.parser import HTMLParser

from buildlib import stable_id

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
THAI = re.compile(r"[฀-๿]")
CYR = re.compile(r"[А-Яа-яЁё]")
QUIZ2 = re.compile(r'data-demo="quiz2"')


class Node:
    __slots__ = ("tag", "attrs", "start", "kids", "parent", "closed")

    def __init__(self, tag, attrs, start, parent):
        self.tag, self.attrs, self.start, self.parent = tag, dict(attrs), start, parent
        self.kids, self.closed = [], False

    def cls(self):
        return (self.attrs.get("class") or "").split()


class Tree(HTMLParser):
    """ต้นไม้ html อย่างง่ายที่เก็บข้อความดิบ (ไม่แปลง &…;) ไว้ต่อกลับเป็น html ได้ใกล้ต้นฉบับ"""

    def __init__(self, html):
        super().__init__(convert_charrefs=False)
        self.root = Node("#root", [], "", None)
        self.cur = self.root
        self.feed(html)
        self.close()

    def handle_starttag(self, tag, attrs):
        n = Node(tag, attrs, self.get_starttag_text(), self.cur)
        self.cur.kids.append(n)
        if tag not in VOID:
            self.cur = n

    def handle_startendtag(self, tag, attrs):
        self.cur.kids.append(Node(tag, attrs, self.get_starttag_text(), self.cur))

    def handle_endtag(self, tag):
        n = self.cur
        while n is not self.root and n.tag != tag:
            n = n.parent
        if n is self.root:
            return                                   # ปิดแท็กที่ไม่ได้เปิด — ข้าม (เบราว์เซอร์ก็ข้าม)
        n.closed = True
        self.cur = n.parent

    def handle_data(self, d):
        self.cur.kids.append(d)

    def handle_entityref(self, name):
        self.cur.kids.append("&" + name + ";")

    def handle_charref(self, name):
        self.cur.kids.append("&#" + name + ";")


def walk(n):
    for k in n.kids:
        if isinstance(k, Node):
            yield k
            yield from walk(k)


def find(n, pred):
    return next((k for k in walk(n) if pred(k)), None)


def inner(n):
    return "".join(outer(k) for k in n.kids)


def outer(k):
    if isinstance(k, str):
        return k
    if k.tag in VOID:
        return k.start
    return k.start + inner(k) + ("</" + k.tag + ">" if k.closed or k.kids else "")


def text(n, skip=None):
    """ข้อความของโหนด — ขอบของทุกแท็กเป็นช่องว่าง (ตรงกับ qaText() ใน app.js ที่เดิน DOM)"""
    out = []

    def go(x):
        for k in x.kids:
            if isinstance(k, str):
                out.append(k)
            elif not (skip and skip(k)) and k.tag not in ("script", "style"):
                out.append(" ")
                go(k)
                out.append(" ")
    go(n)
    return unescape("".join(out))


def norm(s):
    return re.sub(r"\s+", " ", s).strip()


def ru_text(ans):
    """ข้อความภาษารัสเซียของคำตอบที่จะอ่านออกเสียง — กติกาเดียวกับ qaRuText() ใน app.js"""
    no_label = lambda k: "ans-l" in k.cls() or "data-demo" in k.attrs
    ru = find(ans, lambda k: "ans-ru" in k.cls())
    if ru is not None:
        return norm(text(ru, no_label))
    t = norm(text(ans, no_label))
    c, th = len(CYR.findall(t)), len(THAI.findall(t))
    return t if c >= 20 and th * 20 <= c else ""


def clean_answer(ans):
    """html ของคำตอบสำหรับหน้าซ้อม: ตัดแบบจำลอง/รูป/สคริปต์ แทนรูปและแบบจำลองด้วยลิงก์กลับไปที่เนื้อหา"""
    see = '<a class="qa-see" href="#">ดูรูป/แบบจำลองในเนื้อหา →</a>'

    def ser(x):
        parts = []
        for k in x.kids:
            if isinstance(k, str):
                parts.append(k)
            elif k.tag == "script":
                continue
            elif k.attrs.get("data-demo", "").startswith("ih-say"):
                continue                              # ปุ่มฟังของ История — หน้าซ้อมมีปุ่ม 🔊 ของตัวเอง
            elif "data-demo" in k.attrs or k.tag == "figure":
                if not parts or parts[-1] != see:
                    parts.append(see)
            elif k.tag in VOID:
                parts.append(k.start)
            else:
                parts.append(k.start + ser(k) + ("</" + k.tag + ">" if k.closed or k.kids else ""))
        return "".join(parts)
    return re.sub(r"\n[ \t]+", "\n", ser(ans)).strip()      # ย่อช่องย่อหน้าของต้นฉบับ (ไฟล์เล็กลง ไม่กระทบการแสดงผล)


def natkey(tid):
    return [(0, int(p), "") if p.isdigit() else (1, 0, p) for p in re.split(r"(\d+)", tid)]


def extract(sid, tid, html):
    rows = []
    for d in walk(Tree(html).root):
        if d.tag != "details" or "qa" not in d.cls():
            continue
        summ = next((k for k in d.kids if isinstance(k, Node) and k.tag == "summary"), None)
        ans = next((k for k in d.kids if isinstance(k, Node) and "ans" in k.cls()), None)
        if summ is None:
            continue
        qn = find(summ, lambda k: "qa-q" in k.cls())
        src = qn if qn is not None else summ
        num = find(summ, lambda k: "qa-n" in k.cls())
        q = norm(text(src))
        row = {"tid": tid, "base": "qa-" + stable_id(text(src)), "own": d.attrs.get("id") or "", "q": q}
        if num is not None and qn is not None:
            row["n"] = norm(text(num))
        qh = inner(src).strip()
        if qn is None and num is not None:
            qh = qh.replace(outer(num), "", 1).strip()
        if "<" in qh:
            row["qh"] = qh
        row["a_html"] = clean_answer(ans) if ans is not None else ""
        row["hasRu"] = bool(ans is not None and ru_text(ans))
        rows.append(row)
    return rows


def run(ctx):
    out = ctx["data"] / "qa"
    out.mkdir(exist_ok=True)
    index, total, keep = {}, 0, set()
    for sid in sorted(ctx["topics"]):
        topics = sorted(ctx["topics"][sid], key=lambda x: natkey(x[0]))
        per = [(tid, extract(sid, tid, html)) for tid, html in topics]
        used = {r["own"] for _, rows in per for r in rows if r["own"]}
        items, counts, fix = [], {}, {}
        quiz = {tid: n for tid, html in topics if (n := len(QUIZ2.findall(html)))}
        for tid, rows in per:
            for i, r in enumerate(rows):
                qid = r["own"]
                if not qid:
                    qid = r["base"]
                    if qid in used:
                        qid, k = r["base"] + "-" + tid, 2
                        while qid in used:
                            qid, k = r["base"] + "-" + tid + "-" + str(k), k + 1
                        fix.setdefault(tid, {})[str(i)] = qid
                    used.add(qid)
                it = {"tid": tid, "id": qid, "q": r["q"]}
                for key in ("n", "qh"):
                    if key in r:
                        it[key] = r[key]
                it["a_html"], it["hasRu"] = r["a_html"], r["hasRu"]
                items.append(it)
            if rows:
                counts[tid] = len(rows)
        if not items:
            continue
        name = sid + ".json"
        keep.add(name)
        (out / name).write_text(json.dumps(items, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        index[sid] = {"n": len(items), "t": counts, "z": quiz}
        if fix:
            index[sid]["fix"] = fix
        total += len(items)
    keep.add("_index.json")
    (out / "_index.json").write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":"), sort_keys=True) + "\n", encoding="utf-8")
    for f in out.glob("*.json"):                     # วิชาที่ไม่มีคำถามแล้ว — ลบไฟล์เก่าทิ้ง
        if f.name not in keep:
            f.unlink()
    return f"เขียน data/qa {len(index)} วิชา รวม {total} คำถาม"
