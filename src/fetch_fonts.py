"""ดึงฟอนต์จาก Google Fonts มาเก็บไว้ใน fonts/ ให้เว็บไม่ต้องพึ่งเซิร์ฟเวอร์ภายนอก

    python src/fetch_fonts.py

ทำไม: เดิม index.html อ้าง fonts.googleapis.com ตรง ๆ ซึ่งเป็นสไตล์ชีตที่ app.js ต้องรอ
ถ้าเซิร์ฟเวอร์นั้นช้า (เคยวัดได้ 13 วินาที) ทั้งเว็บก็ขึ้นช้าตาม — เก็บไว้ในเว็บเองจึงเร็วและแน่นอนกว่า

สคริปต์ขอ CSS ชุดเดียวกับที่เว็บเคยใช้ (ตระกูลและน้ำหนักใน FAMILIES) ตัดชุดอักษรเวียดนามทิ้ง
ดาวน์โหลด .woff2 ทุกไฟล์ลง fonts/ แล้วเขียน fonts/fonts.css ใหม่ให้ชี้ไฟล์ในเครื่อง
คง unicode-range ไว้ เบราว์เซอร์จึงโหลดเฉพาะชุดอักษรที่หน้านั้นใช้จริง (ไทย ซีริลลิก ละติน กรีก)
ไฟล์ .woff2 เก่าที่ไม่ได้ใช้แล้วจะถูกลบ · สัญญาอนุญาต OFL ของฟอนต์เขียนลง fonts/ ด้วย
พึ่งแค่ stdlib · ห้ามแก้ fonts/fonts.css ด้วยมือ ให้แก้ FAMILIES แล้วรันใหม่
"""
import re
import sys
import urllib.request
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "fonts"
FAMILIES = ("family=IBM+Plex+Mono:wght@400;500;600"
            "&family=IBM+Plex+Sans:wght@400;500;600;700"
            "&family=IBM+Plex+Sans+Thai:wght@400;500;600"
            "&family=Noto+Sans+Math&display=swap")
CSS_URL = "https://fonts.googleapis.com/css2?" + FAMILIES
SKIP_SUBSETS = {"vietnamese"}
# Google ส่ง woff2 + unicode-range ให้เฉพาะเบราว์เซอร์รุ่นใหม่ จึงต้องแสดงตัวเป็น Chrome
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36")
LICENSES = {
    "LICENSE-IBM-Plex.txt": "https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexsans/OFL.txt",
    "LICENSE-Noto-Sans-Math.txt": "https://raw.githubusercontent.com/google/fonts/main/ofl/notosansmath/OFL.txt",
}


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def main():
    OUT.mkdir(exist_ok=True)
    css = get(CSS_URL).decode("utf-8")
    blocks = re.findall(r"(?:/\*\s*([\w-]+)\s*\*/\s*)?(@font-face\s*{[^}]*})", css)
    names = {}          # url ต้นทาง -> ชื่อไฟล์ในเครื่อง (ฟอนต์แปรผันใช้ไฟล์เดียวกันหลายน้ำหนัก)
    faces = []
    for subset, face in blocks:
        subset = subset or "all"
        if subset in SKIP_SUBSETS:
            continue
        m = re.search(r"url\((https://[^)]+\.woff2)\)", face)
        if not m:
            raise SystemExit("ไม่พบ url .woff2 ใน @font-face:\n" + face)
        url = m.group(1)
        if url not in names:
            folder = url.split("/s/")[1].split("/")[0]
            weight = re.search(r"font-weight:\s*(\d+)", face).group(1)
            names[url] = f"{folder}-{subset}-w{weight}.woff2"
        faces.append(f"/* {subset} */\n" + face.replace(url, names[url]))
    total = 0
    for url, name in names.items():
        data = get(url)
        (OUT / name).write_bytes(data)
        total += len(data)
    keep = set(names.values())
    for old in OUT.glob("*.woff2"):
        if old.name not in keep:
            old.unlink()
    for name, url in LICENSES.items():
        (OUT / name).write_bytes(get(url))
    head = ("/* สร้างโดย src/fetch_fonts.py จาก Google Fonts — ห้ามแก้ด้วยมือ\n"
            "   IBM Plex Sans / Sans Thai / Mono และ Noto Sans Math · SIL Open Font License 1.1 "
            "(ดู LICENSE-*.txt ในโฟลเดอร์นี้) */\n")
    (OUT / "fonts.css").write_text(head + "\n".join(faces) + "\n", encoding="utf-8")
    print(f"{len(faces)} @font-face · {len(names)} ไฟล์ .woff2 · {total / 1024:.0f} KB → {OUT}")


if __name__ == "__main__":
    main()
