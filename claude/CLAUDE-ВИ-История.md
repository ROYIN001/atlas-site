# รายละเอียดวิชา ВИ และ История (หัวข้อ 8, 10 เดิมของ CLAUDE.md)

ย้ายออกจาก `CLAUDE.md` แบบคำต่อคำเมื่อ 14 ต.ค. 2026 (เจ้าของงานอนุมัติ) เพราะ `CLAUDE.md` ถูกใส่ให้ผู้ช่วยทุกตัวทุกครั้ง แต่รายละเอียดชุดนี้ใช้เฉพาะงานที่แตะส่วนกลางของเว็บหรือวิชานั้น · **เลขหัวข้อเดิมคงไว้** — ข้อความ «หัวข้อ N» ใน `CLAUDE.md` โค้ด และเทสต์ ชี้มาที่นี่ · แก้/เพิ่มบันทึกของหัวข้อเหล่านี้ที่ไฟล์นี้

---

## 8. วิชา ВИ «Военная история» (`vhist`) — โครงต่างจากวิชาอื่น (เพิ่ม 23 ก.ย. 2026)

วิชาประวัติศาสตร์ ไม่มีสูตร «แบบจำลอง» คือ **แผนที่เคลื่อนไหว 39 แผนที่** + วิดเจ็ตซ้อมสอบ
- เนื้อหา: `data/t/vhist__vhist-*.json` 23 ไฟล์ (vhist-map, l1a, l1b, l2…l17, s1…s4) — ภาษาไทยเป็นหลัก
  ภาษารัสเซียเฉพาะศัพท์และสิ่งที่ต้องพูดตอนสอบ (зачёт с оценкой: สุ่มหัวข้อ ตอบปากเปล่า)
- ข้อมูลแผนที่/แบบทดสอบโหลดแบบขี้เกียจจาก `data/vh/`: `<map>.json` (39) · `quiz-<id>.json` · `exam-<id>.json` ·
  `quiz-all.json` · `exam-all.json` · `river.json` — ไม่ได้อยู่ใน app.js
- app.js: บล็อก `/* ВИ: движок карт и виджеты (VHDEMOS) BEGIN … END */` (เอนจิน `VHMAP` + `VHW` + ทะเบียน
  `vh-<map>`, `vh-quiz-<id>`, `vh-exam-<id>`, `vh-quiz-all`, `vh-exam-all`, `vh-river`) · บล็อก DEEP และบล็อกคลังศัพท์
  (502 คำ, `MODULES.push` id `vhist`) มีเครื่องหมาย BEGIN/END เช่นกัน · app.css: `/* ===== ВИ CSS BEGIN … END */`
- **ต้นฉบับทั้งหมดอยู่ใน `_work/vhist/`** (บนเครื่องเท่านั้น): `maps/<key>.js` (สเปกแผนที่ — แก้ที่นี่ ไม่ใช่ที่ JSON),
  `engine/` (vhmap.js, vhwidgets.js, css), `topics/*.html`, `quiz/`, `exam/`, `notes/` (บันทึกค้นคว้า 19 บรรยาย),
  `tools/` (`build_map.py` สร้าง JSON แผนที่ + ฐานแม่น้ำ/ทะเลจาก Natural Earth 10m ที่ต้องดาวน์โหลดไว้ใน
  `/home/claude/geo` · `integrate.py` ประกอบเข้า repo แบบลบบล็อกเดิมแล้วใส่ใหม่ (idempotent) · `check_topic.py`
  ตรวจหัวข้อ · `proto.py` + `shots.py` ทำหน้าพรีวิวและภาพหน้าจอ) · คู่มือสำหรับ agent: `MAP-API.md`, `TOPIC-GUIDE.md`,
  `REVIEW-HIST.md`, `REVIEW-LANG.md`
- รูปจากสไลด์ 90 รูป: `figs/vh-l<NN>-s<slide>-<n>.webp` (ตัดขอบ ≤780 px WebP q70) — คัดเลือกและวางด้วยตาจาก contact sheet ตามคู่มือ `_work/vhist/FIG-GUIDE.md` · สคริปต์ `_work/vhist/tools/figs_media.py` (ดึงรูปจาก pptx พร้อมเลขสไลด์) · `figs_sheets.py` · `figs_conv.py`
- ข้อตกลงสีแผนที่: ฝ่ายรัสเซีย/โซเวียต = แดง (`su`) · ข้าศึก = น้ำเงิน (`ax`) · พันธมิตรข้าศึก = ม่วง (`al`) · ฝ่ายที่สาม = มะกอก (`nt`)
- ทุกวิดเจ็ตสร้าง `<canvas>` หนึ่งอันทันที (verify.py นับ canvas = data-demo) แล้วค่อยโหลด JSON
- ฐานแผนที่ตัดอ่างเก็บน้ำ (Reservoir) ออกโดยค่าเริ่มต้น เพราะส่วนใหญ่สร้างหลังสงคราม (เช่น Цимлянское 1952)
- ทดสอบบนมือถือด้วย Playwright: `window.scrollBy` / `mouse.wheel` ไม่ปลุก IntersectionObserver ของหัวข้อ
  ในวิวพอร์ต 390 px — ใช้ `element.scrollIntoView()` แทน (เป็นกับทุกวิชา ไม่ใช่บั๊กของหน้าเว็บ)
- ศัพท์ที่ตกลงแล้ว: Великая Отечественная война = «มหาสงครามของปิตุภูมิ» · коренной перелом = «จุดพลิกผันครั้งใหญ่» ·
  корпус = กองทัพน้อย · дивизия = กองพล · бригада = กองพลน้อย (คำตัดสินอยู่ในตาราง «Rulings — ศัพท์ประวัติศาสตร์ ВИ + История» ของ glossary.md แล้ว — แก้ที่นั่น)
- **ยกระดับเป็นมาตรฐานกลาง v2 แล้ว (24 ก.ย. 2026)** — หัวข้อฉบับเต็ม 19 หัวข้อ (vhist-map, l1a … l17) เป็น `<div class="std2">`
  ส่วนหัวข้อสรุป s1–s4 ยังเป็น `.vhist` เดิม · แผนที่เคลื่อนไหวอยู่ใน `.k-exp` ของการ์ดหัวข้อย่อยที่เกี่ยวข้อง (ห้ามอยู่ในเจาะลึก)
  · ควิซ `vh-quiz-<tid>` / `vh-exam-<tid>` ในหัวข้อถูกแทนด้วย `quiz2` ต่อคำถามการเรียน + `details.qa` ปากเปล่าท้ายหัวข้อ
  (ทะเบียน `vh-quiz-*`/`vh-exam-*` ยังอยู่ใน VHDEMOS เพราะ tests นับจำนวนเดโมขั้นต่ำ · s4 ยังใช้ `vh-quiz-all`/`vh-exam-all`)
- **ต้นฉบับหัวข้อฉบับเต็มย้ายไป `_work/vhpilot/`** — `parts/<code>-N.html` + `spec/<tid>.json` (ดัชนีควิซ ข้อตัวเลขเพิ่ม วลี `<mark>`)
  → `tools/assemble.py` → `src/` → `_work/std2/tools/build_topic.py` → `out/` · หน้า vhist-map แก้ที่ `src/vhist-map.src.html` ตรง ๆ
  · ประกอบทั้งหมดด้วย `python _work/vhpilot/build.py` (เขียน data/t, สำเนาไป `_work/vhist/topics/`, สร้าง `data/vh/quiz-*`/`exam-*` ใหม่, build_data)
  · ตารางศัพท์ท้ายหัวข้อ (`@@VOC@@`) อ่านจาก `_work/vhpilot/spec/voc.json` (ตรึง 15 ต.ค. 2026 — data/t ไม่มีตาราง `vh-voc` เดิมแล้ว build.py จึงล้มก่อนหน้านี้ · แก้ศัพท์ในตารางที่ไฟล์นั้น · คลังศัพท์ `vhist-vocab` ใน app.js เคยสร้างจากตารางเดียวกันด้วย integrate.py ซึ่งรันไม่ได้แล้ว → แก้แถวเดียวกันในบล็อกตรง ๆ คู่กับ voc.json (`ru` ห้ามเปลี่ยน — `termKey()` ใช้ ru เป็นคีย์ความคืบหน้า) แล้ว `python src/blocks.py --update vhist-vocab`) · แผนที่: `build_map.py` ต้องใช้ Natural Earth ใน `/home/claude/geo` ซึ่งไม่มีบนเครื่องนี้ → แก้ข้อความใน `_work/vhist/maps/<key>.js` และ `data/vh/<key>.json` คู่กัน (แม่น้ำเวลา: `_work/vhist/data/river.js` + `data/vh/river.json`)
  · **ห้ามรัน `_work/vhist/tools/integrate.py` รุ่นเดิมทับ** ถ้าไม่จำเป็น (มันเขียน data/t จาก `_work/vhist/topics/` ซึ่ง build.py อัปเดตให้แล้ว แต่ยังเขียนบล็อก app.js ของ ВИ ใหม่ทั้งบล็อก)
  · คู่มือ agent: `_work/vhpilot/WRITER-VH.md` (แปลงชิ้นส่วนเดิม → STD2) · `REVIEW-VH.md` · รายงานตรวจ `review/<tid>.<tech|lang>.md`
  · เครื่องมือ: `tools/ratio.py` (เห็นทันที ≤ ~65 % ของฉบับเดิม) · `tools/counts.py` / `fixcounts.py` (ตัวเลข «ควิซ N ข้อ» ในป้าย) · `tools/splitlong.py` (ย่อหน้า > 350 ตัว) · `tools/totxt.py` (ถอดแท็กให้ผู้ตรวจ) · `tools/shot.py <tid>` (ภาพจากหน้าเว็บจริง)
- **คำตัดสินศัพท์ประวัติศาสตร์ ВИ + История (26 ก.ย. 2026)** — เจ้าของงานตัดสินศัพท์ 58 คู่ที่สองวิชาแปลไม่ตรงกัน ตารางอยู่ท้าย `.claude/skills/russian-thai-translate/references/glossary.md` (agent `lang-reviewer` ตรวจตามตารางนี้) · ใช้แล้วกับ data/t · data/vh · บล็อก ВИ ใน app.js · ต้นฉบับใน `_work/vhpilot/` และ `_work/vhist/` · ต้นทาง История (zip)
  · กฎแทนคำ `_work/terms/rules.py` + `apply_terms.py` — ออกแบบให้ผ่านครั้งเดียวต่อไฟล์ต้นฉบับเดิม **ห้ามรันซ้ำกับไฟล์ที่แก้แล้ว** (บางกฎให้ผลที่กฎอื่นจับได้อีก) · งานใหม่ให้เขียนตามตารางตั้งแต่แรก ไม่ต้องพึ่งสคริปต์
- **ป้ายสถานะ v6 (15 ต.ค. 2026 · เจ้าของงานเลือก «ตามหลักฐาน»)** — `chk` `rev` `src` ใน DEEP ของ ВИ และ История มาจาก `_work/status-badges/status.json` ใส่ด้วย `apply_status.py` (แทนที่เฉพาะ JSON ในบล็อก `vhist-deep`/`hist-deep` · `--check` ตรวจอย่างเดียว) · **หลังรัน `_work/vhist/tools/integrate.py` หรือ `_work/hist/integrate_hist.py` ต้องรัน `apply_status.py` ซ้ำ** แล้ว `python src/blocks.py --update vhist-deep hist-deep` (สองสคริปต์นั้นเขียนบล็อก DEEP ใหม่ทั้งบล็อก — `_work/hist/block-deep.js` อัปเดตแล้ว แต่ `tools/pack.py` ใน zip ต้นทางไม่รู้จักฟิลด์เหล่านี้)
  · ВИ: 19 หัวข้อเนื้อหา `chk: true` (รายงาน `_work/vhpilot/review/<tid>.tech.md` + `.lang.md` ครบ · ผลที่ applyfix ใช้ไม่ได้แก้มือแล้ว — สุ่มตรวจ 4 ข้อ) · s1–s4 `chk: true` `rev: 2026-10-15` (ตรวจรอบสอง 15 ต.ค.: ไล่ข้อแก้ของรายงาน tech 19 หัวข้อ + ผู้ตรวจเทคนิค opus และภาษา sonnet แยกกัน · รายงาน คำตัดสิน และงานต่อ `_work/vhist/review/S-DECISIONS.md` · แก้ด้วย `_work/vhist/tools/apply_s_edits.py` ตามรายการ `_work/vhist/review/s_edits.py` · **คำถามสอบใน s4 เป็นสำเนาของ `data/vh/exam-*.json`** — แก้ exam json แล้วรัน `python _work/vhist/tools/sync_s4.py` (`--check` บอกข้อที่ต่าง) · ห้ามรัน `gen_s4.py` รุ่นเดิม · id ปากเปล่าของ s4 คำนวณจากข้อความ `<summary>` = `ru · th` ของ exam json → แก้ `ru`/`th` ต้องตรึง id เดิมใน `PIN` ของ sync_s4.py แล้วเทียบ `data/qa/vhist.json` กับ HEAD)
  · История: ครบ 27/27 `chk: true` (15 ต.ค. 2026) — 17 หัวข้อจากรอบเดิม (`review/<lec>.md` ใน zip ต้นทาง + «ผู้ควบคุมตัดสินแล้ว» · ผู้ตรวจคนเดียวตรวจทั้งข้อเท็จจริงและภาษา) · l1 l8 l9 etik ตัดสินข้อค้างครบ (`_work/hist/review/decisions-l1-l8-l9-etik.md`) · l6 map s1–s4 ผ่านผู้ตรวจเทคนิค + ภาษา (sonnet) แยกกัน (`decisions-l6.md` `decisions-summ.md` · คู่มือผู้ตรวจ `REVIEW-10.md`) · รอบต่อ: ความสม่ำเสมอข้ามบรรยาย `decisions-xlec.md` · пакт = «กติกาสัญญา» `decisions-pakt.md`
  · **แก้เนื้อหา История ตรงใน data/t** (ต้นฉบับอยู่ใน zip นอก repo): รายการแก้ `_work/hist/review/fixes-*.json` (สร้างด้วย `mk-fixes-*.py` มีเหตุผลทุกข้อ) → `_work/hist/tools/hfix.py` → `hjsoncheck.py` (JSON ของวิดเจ็ต/ควิซในหน้า) · **คำตอบปากเปล่าใน hist-s4 เป็นสำเนาของหน้าบรรยาย** — แก้หน้าบรรยายแล้ว `tools/s4sync.py --write` (ไม่มี `--write` = บอกข้อที่ต่าง) · **วิดเจ็ตของ hist-s3 เป็นสำเนาข้อมูลของ l10 l12 l21** — แก้ทั้งสองที่ · คลังศัพท์ hist ใน app.js แก้ด้วย `tools/vocab_*.py` ใต้ล็อก (+ `_work/hist/block-modules.js`) แล้ว `blocks.py --update hist-vocab`
  · ไม่ใส่ `lec` — ชื่อรัสเซียทุกหัวข้อขึ้นต้น «Лекция N» ลิงก์บรรยายอัตโนมัติหาเจอแล้ว · ผ่านตรวจเพิ่มภายหลัง: แก้ `chk` ใน status.json → `apply_status.py` → blocks → build_data

## 10. วิชา История (`hist`) — ประวัติศาสตร์รัสเซีย + โลก (เพิ่ม 25 ก.ย. 2026)

- เนื้อหา: `data/t/hist__hist-*.json` 27 ไฟล์ — `hist-map` · `hist-l1…l21` · `hist-etik` (ภาคผนวก Воинский этикет) · สรุป `hist-s1…s4` · รูปแบบ STD2 · id ในหัวข้อขึ้นต้น `i<N>-` (ภาคผนวก `ie-`, สรุป `s1-…s4-`, แผนที่วิชา `hm-`) · รูป `figs/ih-l<NN>-*.webp` 337 ไฟล์
- **ข้อมูลวิดเจ็ตของแต่ละหัวข้อมากับไฟล์หัวข้อ** (`<script type="application/json" class="ih-data">` ท้าย html) ไม่ได้อยู่ใน app.js — วิดเจ็ตอ่านแล้วรวมเข้า `window.IH` ตอนติดตั้ง · แผนที่ดินแดน/แผนที่โลกโหลดจาก `data/ih/atlas.json`, `world.json`
- app.js: บล็อก `/* История: словарь (hist) */` (คลังศัพท์ 585 คำ) · `/* История: DEEP (hist) */` (ตั้ง `deep: true` ให้การ์ด hist ด้วย) · `/* История: สื่อและวิดเจ็ต (window.IHDEMOS) */` — ข้อมูลกลาง (ยุค ผู้ปกครอง 862–2026 เฟรมแผนที่ กษัตริย์สยาม) + วิดเจ็ต `ih-atlas ih-dyn ih-flow ih-hist ih-tl ih-power ih-order ih-say ih-world ih-chart ih-drill` · app.css: `/* История: CSS ของสื่อ (namespace .ih) */`
- วิดเจ็ตวาดด้วย SVG/HTML ไม่ใช่ canvas → `src/verify.py` นับกล่อง `data-demo="ih-…"` ที่มีเนื้อหาเป็น «ติดตั้งแล้ว»
- **ต้นฉบับอยู่นอก repo** (`История-ต้นทาง.zip` ในโฟลเดอร์ `Russian lesson\И\Claude outputs`): `shared/` (hist.js, hist.css, hist-data.js, mkmap.py, mkworld.py, check_ih.py, test_ih.py, WRITER-IH.md, REVIEW-IH.md) · `out/<หัวข้อ>/` (ih-*.html + data-*.js + REPORT.md) · `review/` · `tools/pack.py` (ประกอบ data/t + บล็อก) · `_work/hist/integrate_hist.py` (ใส่บล็อกใน app.js/app.css แบบแทนที่ได้ แล้วรัน `src/build_data.py`) — แก้ที่ต้นฉบับแล้วประกอบใหม่ อย่าแก้ JSON ในหัวข้อด้วยมือถ้าเลี่ยงได้
- มุมมอง: แนวของสถาบัน/อาจารย์เป็นเนื้อหาสอบ มุมมองสากลอยู่ในกล่อง «มุมมองสากล» · จุดที่สไลด์ผิดอยู่ในกล่อง «หมายเหตุต้นฉบับ» · ศัพท์ที่ตัดสินแล้วอยู่ใน `WRITER-IH.md` §4 · `дисциплины/10-И.md` ในโปรเจกต์ Claude · และตารางคำตัดสินร่วมกับ ВИ (26 ก.ย. 2026) ท้าย `.claude/skills/russian-thai-translate/references/glossary.md`
- **แก้วิดเจ็ต/CSS ของ История:** แก้ `shared/hist.js` หรือ `hist.css` ในต้นทาง → `tools/pack.py` (สร้างบล็อกใน `_work/hist/`) → เพิ่มเลข `VER` ใน `_work/hist/integrate_hist.py` (ใช้เป็น `?v=` ใน index.html และ `DATA_VERSION` ให้เบราว์เซอร์โหลดใหม่) → `python _work/hist/integrate_hist.py` → `python src/build_data.py` → `node --test tests/*.test.cjs` → `python src/verify.py --subject hist` · ครั้งล่าสุด `20260926-terms1` (ใช้คำตัดสินศัพท์ร่วม ВИ–История) · ก่อนหน้า `20260925-hist2` (ih-power: ชื่อรัสเซียที่ยาวเกินกล่องบนจอแคบแบ่งเป็นสองบรรทัดแทนการตัด «…»)
- **ดัชนีค้นหากับ `<script type="application/json">`** (ควิซ `quiz2` ทุกวิชา · `ih-data`): `src/build_data.py` เก็บเฉพาะสตริงที่มีอักษรไทยหรือซีริลลิก ไม่เก็บชื่อคีย์ ตัวเลข รหัสสี รหัสประเทศ (เดิมค้น «frames» แล้วเจอทุกบรรยาย) · `plainForIndex()` ใน `tests/audit-integrity.test.cjs` ต้องทำเหมือนกันทุกครั้งที่แก้ build_data.py
