"""หัวข้อที่เกี่ยวข้อง (S7) → data/rel.json

TF-IDF บนคำรัสเซีย (ซีริลลิก ≥ 5 ตัว ตัดเหลือ 6 ตัวแรกเป็นรากคำหยาบ ๆ ให้ «устойчивость/устойчивости» นับเป็นคำเดียว)
จากข้อความค้นหา data/ix/<วิชา>.json — เนื้อหาเป็นภาษาไทยแต่ศัพท์เทคนิคทุกคำมีรัสเซียกำกับ จึงใช้รัสเซียวัดความใกล้ได้
ไม่รวมแผนที่วิชา (*-map) และบล็อกสรุปทบทวน (*-s1 … *-s4) เพราะอ้างทุกเรื่องในวิชาจนใกล้กับทุกหัวข้อ

รูปแบบ (deterministic · หนึ่งหัวข้อต่อบรรทัด):
  {"v": 1, "t": {"<หัวข้อ>": {"same": [["<หัวข้อ>", คะแนน], …3], "cross": [["<วิชา>", "<หัวข้อ>", คะแนน], …5]}, …}}
คะแนน = cosine similarity 0–1 (3 ตำแหน่ง) เรียงมากไปน้อย · cross เก็บเฉพาะ ≥ CROSS_MIN
หน้าเว็บ (ช่อง S7 ของ app.js) แสดง cross ≥ 0.10 และ same 2 อันดับแรก · ถ้าหัวข้อใน DEEP มี rel: [...] (ใส่มือ) ใช้ค่านั้นแทน
"""
import json
import math
import re
from collections import Counter

SKIP = re.compile(r"-map$|-s[1-4]$")
WORD = re.compile(r"[а-я]{5,}")
STEM = 6
SAME_N, CROSS_N, CROSS_MIN = 3, 5, 0.08


def run(ctx):
    data = ctx["data"]
    docs = []                                            # (sid, tid, Counter)
    for f in sorted((data / "ix").glob("*.json")):
        sid = f.stem
        for row in json.load(open(f, encoding="utf-8"))["rows"]:
            if SKIP.search(row["id"]):
                continue
            words = WORD.findall(row["hay"].replace("ё", "е"))
            docs.append((sid, row["id"], Counter(w[:STEM] for w in words)))
    n = len(docs)
    df = Counter()
    for _, _, c in docs:
        df.update(c.keys())
    # คำที่อยู่ในหัวข้อเดียวไม่ช่วยหาความเกี่ยวข้อง · คำที่อยู่เกือบทุกหัวข้อ (เช่น «систем») ไม่มีน้ำหนัก
    idf = {w: math.log(n / d) for w, d in df.items() if 2 <= d <= n * 0.5}
    vecs = []
    for sid, tid, c in docs:
        v = {w: (1 + math.log(k)) * idf[w] for w, k in c.items() if w in idf}
        norm = math.sqrt(sum(x * x for x in v.values())) or 1.0
        vecs.append({w: x / norm for w, x in v.items()})
    # ดัชนีกลับเพื่อคูณเฉพาะคู่ที่มีคำร่วม
    post = {}
    for i, v in enumerate(vecs):
        for w, x in v.items():
            post.setdefault(w, []).append((i, x))
    out = {}
    for i, (sid, tid, _) in enumerate(docs):
        acc = Counter()
        for w, x in vecs[i].items():
            for j, y in post[w]:
                if j != i:
                    acc[j] += x * y
        ranked = sorted(acc.items(), key=lambda p: (-round(p[1], 3), docs[p[0]][0], docs[p[0]][1]))
        same = [[docs[j][1], round(s, 3)] for j, s in ranked if docs[j][0] == sid][:SAME_N]
        cross = [[docs[j][0], docs[j][1], round(s, 3)] for j, s in ranked
                 if docs[j][0] != sid and round(s, 3) >= CROSS_MIN][:CROSS_N]
        out[tid] = {"same": same, "cross": cross}
    lines = [json.dumps(k, ensure_ascii=False) + ": " + json.dumps(out[k], ensure_ascii=False, separators=(",", ":"))
             for k in sorted(out)]
    text = '{"v": 1, "t": {\n' + ",\n".join(lines) + "\n}}\n"
    (data / "rel.json").write_text(text, encoding="utf-8")
    ncross = sum(1 for r in out.values() for x in r["cross"] if x[2] >= 0.10)
    return f"data/rel.json {len(out)} หัวข้อ · ข้ามวิชา ≥ 0.10 รวม {ncross} คู่ · {len(text.encode()) // 1024} KB"
