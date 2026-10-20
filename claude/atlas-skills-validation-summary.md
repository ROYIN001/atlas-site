# ผลตรวจสอบ Atlas coordinated skills

ตรวจวันที่ 20 ตุลาคม 2026 บน branch `claude/stoic-brown-wr1rch` หลังแก้ตามรายงานตรวจอิสระสองรอบ (ฐาน: Draft PR #21 commit `19ec9a6`) · ผลชุดเดิมวันที่ 19 ต.ค. ถูกแทนทั้งหมด

## ผลที่ตรวจได้

| การตรวจ | ผล |
|---|---|
| ชุดสกิล 3 ชุด: frontmatter, UTF-8, JSON, ลิงก์ภายใน (`sync_bundle.py`) | ผ่าน |
| อ้างอิงร่วมสองไฟล์เหมือนกันในทั้งสามสกิล และสำเนา Codex ใน `.agents/skills/` ตรงทุกไบต์ | ผ่าน |
| unit tests: content-editor 11 · learning-designer 22 · technical-reviewer 94 (handoff 74 + identity 20) | ผ่านทั้งหมดบน Linux Python 3.13 ในเครื่องที่ตรวจ · CI รันบน Linux 3.10/3.12 และ Windows 3.12 (ดูผลในแท็บ Actions ของ PR) |
| `quick_validate.py` ของ skill-creator (PyYAML 6.0.3) | «Skill is valid!» ทั้งสามสกิล |
| เทมเพลต handoff ที่ยังไม่กรอก | ตัวตรวจปฏิเสธโดยตั้งใจ (placeholder) |
| เทมเพลต learning packet (`--template`) | มีส่วนที่ต้องมีครบ และไม่ผ่านเมื่อตรวจเป็น packet จริง |
| `compare_identity.py` กับข้อมูลจริงเทียบ `19ec9a6` | OK: id คำถามปากเปล่า 2 909 · หัวข้อ 289 · quiz2 391 บล็อก · termKey 1 490 · `data/qa` สดตรงกับ data/t |
| ผลประเมินงานจริง 6 รัน (ใช้/ไม่ใช้สกิล) | ดู [ผลประเมิน](atlas-skills-evaluation.md) |

ผลทดลองชุดเดิม (19 ต.ค. · ผ่าน 5/5 และ 10/10 ทั้งใช้และไม่ใช้สกิล) ถอนออกแล้ว เพราะให้คะแนนเองและผลทุกรันเหมือนกัน หน้า HTML ของชุดนั้นถูกนำออกจาก repository ด้วย เพราะ GitHub Pages เผยแพร่ทั้งโฟลเดอร์และหน้านั้นเรียกเซิร์ฟเวอร์ภายนอก

## สิ่งที่ชุดทดสอบครอบคลุม

- **ตัวตรวจ handoff:** ไฟล์เปลี่ยนหลังตรวจ · บรรทัดแรกของหลักฐานต้องเป็น digest ปัจจุบัน (log เก่า สำเนา manifest และ digest ที่อยู่บรรทัดอื่นไม่ผ่าน · รับ UTF-16) · hash แบบ CRLF→LF สำหรับข้อความ และตามไบต์จริงสำหรับไฟล์ไบนารี · ไฟล์ที่ลบ · ผู้เขียน/ผู้ร่วมแก้ให้ผลผ่านไม่ได้ (รวมชื่อที่มีอักขระล่องหนหรือปนอักษรละติน/ซีริลลิก) · gate ที่ห้าม N/A · gate ที่บันทึกว่า fail · technical/language ต้องอ้างรายงานตรวจของตน · identity ต้องอ้างรายงาน compare_identity (digest, base commit, ok) · blocker/major ที่ปิดโดยไม่มีหลักฐาน · reviewed ต้องมีรายงานจากผู้ตรวจอิสระ · blocked ต้องมี resume_phase · base_revision ที่หน้าตาเหมือน option ของ git ไม่ถูกส่งต่อให้ git · ชื่อไฟล์ภาษาไทยในคำเตือน coverage · ข้อความภาษาไทยบนคอนโซล cp1252
- **compare_identity:** id คำถามหาย · แทรก/ลบ/ย้าย quiz2 · แทรกพร้อมแก้เนื้อหา · `data-id` อย่างเดียวไม่นับเป็นการตรึง · id ที่ตรึงถูกเปลี่ยนชื่อหรือลบ · สลับตัวเลือกควิซไม่นับเป็นการย้าย · host ที่เขียนต่างรูปแบบ · termKey · หัวข้อย้ายวิชาและ tid ซ้ำ · `data/qa` ที่ยังไม่ได้ build · หัวรายงานที่มี candidate digest · `--skip-terms` ถูกปฏิเสธเมื่อ MODULES เปลี่ยน · การเรียกผิดได้ exit 2
- **ตัวตรวจ learning packet:** ความครอบคลุม objective · demo_tasks และควิซปรนัย · ประเภทที่มาและป้าย «ผู้เรียบเรียง» · hash ของ input · id คำถามตามหัวข้อ · id quiz2 ที่คงไว้ · packet ที่ส่งแล้วแต่ยังมี blocking issue · ชนิดข้อมูลผิดไม่ทำให้ traceback · คีย์ซ้ำและ NaN
- **sync_bundle:** สำเนาไม่ตรง · อ้างอิงร่วมหาย · ลิงก์แบบ reference และแบบมี title · โค้ดและ footnote ไม่ถูกนับเป็นลิงก์ · ต่างกันแค่ปลายบรรทัดไม่นับเป็น drift · โฟลเดอร์ทดสอบไม่ถูกคัดลอกไปสำเนา · symlink · description ยาวเกิน

## ยังไม่ได้ทดสอบ

- ขั้นตอนเต็มสองช่วง (review candidate → ประกอบใต้ล็อก → integration candidate) กับหัวข้อ STD2 จริง เพราะเครื่องมือใน `_work/` อยู่บนเครื่องเจ้าของงานเท่านั้น
- การเลือกสกิลเองจากคำขอจริงใน Claude Code และ Codex (ผลประเมินสั่งให้อ่านสกิลตรง ๆ)
- การอัปโหลดขึ้น Claude.ai: Help Center ระบุ description ได้ 200 ตัวอักษร ส่วนของสามสกิลนี้ยาว 522–668 ตัว
- บน Windows ทดสอบผ่าน CI เท่านั้น ยังไม่ได้รันบนเครื่องเจ้าของงาน (working tree แบบ CRLF)
- `compare_identity.py` ไม่รู้ความหมายของคำถามที่แก้ และการ์ดควิซในแถบข้าง (`atlas-quiz-v1`) ซึ่งผูกกับลำดับเสมอ แจ้งเป็นหมายเหตุเท่านั้น

ตัวตรวจทั้งหมดตรวจความสอดคล้องของหลักฐาน ไม่ได้รับรองความถูกต้องทางวิชาการ ไม่พิสูจน์ตัวตนจริงของผู้ตรวจ ไม่ล็อกโปรเซส และไม่ใช่สิทธิ์ commit หรือเผยแพร่ งานสร้างสกิลไม่ได้แก้บทเรียน ส่วน `app.js` แก้หนึ่งจุด (แถบสีผลซ้อมของคำถามที่ตรึง id ใน `qaIds()` ซึ่งผลประเมินพบ)

## รันการตรวจซ้ำ

```text
python .claude/skills/atlas-content-editor/scripts/sync_bundle.py --write
python .claude/skills/atlas-content-editor/scripts/sync_bundle.py
python -B -m unittest discover -s .claude/skills/atlas-content-editor/scripts -p "test_*.py"
python -B -m unittest discover -s .claude/skills/atlas-learning-designer/scripts -p "test_*.py"
python -B -m unittest discover -s .claude/skills/atlas-technical-reviewer/scripts -p "test_*.py"
python .claude/skills/atlas-technical-reviewer/scripts/compare_identity.py --repo . --base-rev <commit> --cand .
```

GitHub Actions workflow «Atlas skills» รันสามชุดแรกเมื่อสกิลเปลี่ยน พร้อมตรวจว่าไฟล์สกิลเก็บใน git แบบ LF (ไม่มี CRLF หรือปลายบรรทัดปน) และลอง `compare_identity.py` กับข้อมูลจริง (Linux · Python 3.12) ส่วน workflow «check» รัน `compare_identity.py` เทียบ merge base ในทุก PR: ตัวตนผู้เรียนต่างกันเป็นคำเตือน · เครื่องมือรันไม่ได้หรือ `data/qa` ไม่สดเป็นข้อตก
