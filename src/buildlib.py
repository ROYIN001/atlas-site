"""ตัวช่วยร่วมของสคริปต์ build — ใช้ได้ทั้งจาก src/build_data.py และ src/build_steps/*.py

stable_id(text)  id เสถียรจากข้อความ (เช่นคำถามปากเปล่า details.qa ที่ไม่มี id)
                 ต้องให้ผลตรงกับ stableId() ใน app.js ทุกไบต์ — tests/hooks.test.cjs ตรวจความตรงกัน
                 วิธี: ถอดแท็ก html → ยุบช่องว่างเป็นช่องเดียว → ตัดหัวท้าย → djb2 32 บิตบน UTF-16 code unit → ฐาน 36
plain(html)      ข้อความล้วนจาก html (แบบเดียวกับที่ใช้ทำดัชนีค้นหา)
"""
import re
import sys

_TAG = re.compile(r"<[^>]*>")
_WS = re.compile(r"\s+")
_DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz"


def _norm(text):
    return _WS.sub(" ", _TAG.sub(" ", str(text))).strip()


def stable_id(text):
    t = _norm(text).encode("utf-16-le")           # เดินทีละ code unit ให้เท่ากับ charCodeAt ใน JS
    h = 5381
    for i in range(0, len(t), 2):
        cu = t[i] | (t[i + 1] << 8)
        h = (h * 33 + cu) & 0xFFFFFFFF
    if h == 0:
        return "0"
    out = []
    while h:
        h, r = divmod(h, 36)
        out.append(_DIGITS[r])
    return "".join(reversed(out))


def plain(html):
    return _norm(html)


if __name__ == "__main__":                        # python src/buildlib.py "ข้อความ" → id (ใช้ในเทสต์)
    print(stable_id(sys.argv[1] if len(sys.argv) > 1 else sys.stdin.read()))
