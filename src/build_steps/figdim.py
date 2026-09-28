"""S3: ขนาดจริงของรูปทุกใบใน figs/ → data/figdim.json  { "<รหัสรูป>": [กว้าง, สูง], … }

SUKAFIG (app.js) ใส่ width/height ให้ <img> ก่อนใส่ src → เบราว์เซอร์จองที่ตามสัดส่วนจริงตั้งแต่ยังไม่โหลด
ไม่มี layout shift ตอนรูปมา และ scrollToTarget ไม่ต้องแก้ตำแหน่งซ้ำ · อ่านเฉพาะหัวไฟล์ WebP ด้วย stdlib
(VP8 = lossy · VP8L = lossless · VP8X = แบบขยาย) · ไฟล์ที่อ่านไม่ออกข้ามไป (หน้าเว็บทำงานแบบเดิมกับรูปนั้น)
"""
import json
import struct


def webp_size(path):
    with open(path, "rb") as f:
        head = f.read(30)
    if len(head) < 30 or head[:4] != b"RIFF" or head[8:12] != b"WEBP":
        return None
    kind, body = head[12:16], head[20:30]
    if kind == b"VP8 ":                                  # frame tag 3 ไบต์ · start code 9d 01 2a · กว้าง/สูง 14 บิต
        if body[3:6] != b"\x9d\x01\x2a":
            return None
        w, h = struct.unpack("<HH", body[6:10])
        return w & 0x3FFF, h & 0x3FFF
    if kind == b"VP8L":                                  # signature 0x2f · (กว้าง-1) 14 บิต · (สูง-1) 14 บิต
        if body[0] != 0x2F:
            return None
        b = int.from_bytes(body[1:5], "little")
        return (b & 0x3FFF) + 1, ((b >> 14) & 0x3FFF) + 1
    if kind == b"VP8X":                                  # flags 4 ไบต์ · (กว้าง-1) 24 บิต · (สูง-1) 24 บิต
        return int.from_bytes(body[4:7], "little") + 1, int.from_bytes(body[7:10], "little") + 1
    return None


def run(ctx):
    figs = ctx["root"] / "figs"
    out, bad = {}, []
    for p in sorted(figs.glob("*.webp")) if figs.is_dir() else []:
        wh = webp_size(p)
        if wh and wh[0] > 0 and wh[1] > 0:
            out[p.stem] = list(wh)
        else:
            bad.append(p.name)
    text = json.dumps(out, ensure_ascii=False, separators=(",", ":"), sort_keys=True) + "\n"
    dst = ctx["data"] / "figdim.json"
    if not dst.exists() or dst.read_text(encoding="utf-8") != text:
        dst.write_text(text, encoding="utf-8")
    return f"data/figdim.json {len(out)} รูป" + (f" · อ่านหัวไฟล์ไม่ได้ {len(bad)}: {', '.join(bad[:5])}" if bad else "")
