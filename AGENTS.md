# AGENTS.md — คำแนะนำสำหรับ Codex ใน ROYIN001/atlas-site

ไฟล์หลักของ repo นี้คือ `CLAUDE.md` (ภาษาไทย ยาวราว 190 KB) — ไฟล์นี้สรุปเฉพาะสิ่งที่ต้องรู้ก่อนเริ่มงาน แล้วชี้ไปยังหัวข้อใน CLAUDE.md ที่ต้องอ่านต่อ ถ้าสองไฟล์ขัดกัน CLAUDE.md ถูกเสมอ

## อ่านก่อนทำงาน
- ทุกงาน: CLAUDE.md §1 (โครงไฟล์) · §4 (ด่านตรวจก่อน commit) · §5 (กติกาเนื้อหา) · §6 (ข้อควรระวัง)
- งานบทเรียน/STD2: §2, §8, §9, §10, §13, §14 (เช็กลิสต์ท้าย §14) และ §15
- งานสกิล: §16 และ `claude/atlas-skills-workflow.md`

## สกิล Atlas ใน Codex
- `.agents/skills/atlas-*` เป็นสำเนาที่สร้างอัตโนมัติจาก `.claude/skills/atlas-*` — **ห้ามแก้ที่นี่** แก้ต้นฉบับใน `.claude/skills/` แล้วรัน `python .claude/skills/atlas-content-editor/scripts/sync_bundle.py --write`
- เรียกด้วย `$atlas-content-editor` · `$atlas-learning-designer` · `$atlas-technical-reviewer`
- subagent ใน `.claude/agents/` เป็นของ Claude Code — ใน Codex ให้ทำงานเองตามขอบเขตเดียวกัน ถ้าเซสชันเดียวทำทั้งการตรวจเทคนิคและภาษา ให้ตั้ง `capabilities.independent_reviewers: false` ใน handoff และจบที่ `reviewed` ไม่ใช่ `ready`

## กติกาที่ห้ามพลาด
- ประโยคในบทเรียนเป็นภาษาไทย ศัพท์รัสเซียอยู่ในวงเล็บ · ใช้ p เป็นตัวแปรลาปลาส · งานที่ผู้เรียบเรียงคิดเองติดป้าย «ผู้เรียบเรียง» · ปิดหัวข้อด้วยบรรทัดอ้างอิงต้นทาง (§5)
- **ตัวตนคำถาม:** `details.qa` ที่ไม่มี id ได้ id จากข้อความคำถาม แก้คำผิดก็ทำให้ประวัติผู้เรียนหาย → ตรึง id เดิมจาก `data/qa` ก่อนแก้ · บล็อก `quiz2` ที่ไม่มี id นับตามลำดับ · หลัง build รัน `python .claude/skills/atlas-technical-reviewer/scripts/compare_identity.py --repo . --base-rev <commit ก่อนแก้> --cand .`
- หัวข้อส่วนใหญ่ประกอบจากต้นฉบับใน `_work/` (§2, §8, §10, §15) — แก้ `data/t` ตรง ๆ จะถูกทับ · `_work/` อยู่ในเครื่องเจ้าของงานเท่านั้น
- ไฟล์ที่สร้างอัตโนมัติ (data/ix, data/qa, manifest, `?v=`, counts/blocks baseline) แก้ผ่านเครื่องมือของมันเท่านั้น
- ลำดับตรวจ: `python src/build_data.py` → `node --test tests/*.test.cjs` → `python src/verify.py --subject <วิชา> --mobile --no-throttle --timeout 240`
- หน้าเว็บห้ามเรียกเซิร์ฟเวอร์ภายนอก · ห้าม commit `_work/` · เจ้าของงาน commit/push เองด้วย GitHub Desktop เว้นแต่สั่งชัดเจน
