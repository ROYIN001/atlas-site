# รายละเอียดโครงเว็บ v4–v6 (หัวข้อ 11–14 เดิมของ CLAUDE.md)

ย้ายออกจาก `CLAUDE.md` แบบคำต่อคำเมื่อ 14 ต.ค. 2026 (เจ้าของงานอนุมัติ) เพราะ `CLAUDE.md` ถูกใส่ให้ผู้ช่วยทุกตัวทุกครั้ง แต่รายละเอียดชุดนี้ใช้เฉพาะงานที่แตะส่วนกลางของเว็บหรือวิชานั้น · **เลขหัวข้อเดิมคงไว้** — ข้อความ «หัวข้อ N» ใน `CLAUDE.md` โค้ด และเทสต์ ชี้มาที่นี่ · แก้/เพิ่มบันทึกของหัวข้อเหล่านี้ที่ไฟล์นี้

---

## 11. โครงหน้าวิชา v4 — 3 คอลัมน์ + สารบัญยกระดับ (เพิ่ม 25 ก.ย. 2026)

หน้าวิชาที่มีเนื้อหาเต็มถูกครอบด้วย `.sgrid` = เนื้อหา (`.wrap.hastoc`) · แถบข้าง (`.marg`) · สารบัญ (`.toc`) จัดกึ่งกลางเป็นกลุ่ม
(เดิมสารบัญเป็น `position: fixed` ชิดขอบขวา ทำให้จอกว้างมีช่องว่างกลาง) · จุดเปลี่ยน ≥ 1400 สารบัญ · ≥ 1560 แถบข้าง · ≥ 1760 กว้างขึ้น · ต่ำกว่า 1400 ใช้ `.topic-nav` เหมือนเดิม
- **ต้นฉบับอยู่ที่ `_work/layout/`** (`layout.css`, `layout.js`, `patch_layout.py`, `README.md`) — แก้ที่นั่นแล้วรัน `python _work/layout/patch_layout.py` ซึ่งแทนที่เฉพาะบล็อก
  `/* ============ v4: โครงหน้าวิชา 3 คอลัมน์` ใน app.css และ `/* ---- v4: สารบัญยกระดับ + แถบข้าง` ใน app.js · **ห้ามแก้สองบล็อกนี้ใน app.css/app.js ตรง ๆ**
  · จุดเปลี่ยนชุดนี้มีสำเนาแบบเลื่อนลงสำหรับเมนูแบบย่อ/โหมดอ่านในช่อง S2 ของ app.css (หัวข้อ 14.2) — แก้ที่นี่แล้วต้องแก้ที่นั่นตาม
  · **⚠ ก่อนรัน `patch_layout.py` ครั้งหน้า (ค้างจาก S8 · 29 ก.ย. 2026):** ใน app.js บรรทัด `saveQuiz` ของบล็อกนี้ถูกแก้ตรงเป็น `const saveQuiz = () => store(QKEY, QUIZ);` (ตัวเขียนเดียวของข้อมูลผู้เรียน หัวข้อ 14.8)
    แต่ `_work/layout/layout.js` ในเครื่องยังเป็น `try { localStorage.setItem(QKEY, JSON.stringify(QUIZ)); } catch (e) {}` — **แก้บรรทัดนั้นใน layout.js ให้ตรงกันก่อน** ไม่งั้น patch จะคืนแบบเก่า
    (ผลควิซบันทึกไม่ได้ตอนพื้นที่เต็มแล้วเงียบ) และ `tests/learner-data.test.cjs` ตก «ห้าม localStorage.setItem ตรง ๆ»
    · **อีกบรรทัดที่ถูกแก้ตรงแบบเดียวกัน (S8 ต่อ · ก.ย. 2026):** ใน `margWeak` ปุ่ม «เปิดฉบับเต็ม» เป็น `store("atlas-mode-v1", MODE);` แต่ layout.js ยังเป็น `try { localStorage.setItem("atlas-mode-v1", MODE); } catch (e) {}` — แก้ทั้งสองบรรทัด ·
    และตั้งแต่ S9 ท้ายส่วน router ทับ `margWeak` (ส่ง «เปิดฉบับเต็ม» ผ่าน `go`) กับ `quizOfSubject` (หัวข้อ 14) — ย้ายเข้า layout.js แล้วลบตัวทับได้ · แก้แล้วลบคำเตือนนี้ออก
- สารบัญ: แถบสถานะ (หัวข้อปัจจุบัน · ความคืบหน้า · อ่านแล้ว · ควิซ % · ★ บุ๊กมาร์ก · ปุ่มสรุปสอบ/ควิซ) · วงกลม ✓ กดทำเครื่องหมายได้ · จุดผลควิซ · หัวข้อย่อย (`header.sec-h` หรือ `h3`) ของหัวข้อปัจจุบัน · ก่อนหน้า/ถัดไป · หัวกลุ่ม (`TOCGROUPS` สำหรับ vhist/hist, วิชาอื่นจับจากคำขึ้นต้นชื่อ Лекция/ПЗ/ЛР/РГР/Задачи/Приложение เมื่อ ≥ 12 หัวข้อ)
- แถบข้าง: ฉบับเต็ม = การ์ดของส่วนที่กำลังอ่าน (ศัพท์จาก `MODULES` · `.ru-box` · ชิปของ `.sec-h` · `.k-trap`/`.trap` · สถานะ quiz2) · สรุปทบทวน = «จุดที่ยังอ่อน» (ควิซต่ำ/ยังไม่อ่าน) กดแล้วเปิดฉบับเต็มที่หัวข้อนั้น
- localStorage ใหม่ **`atlas-quiz-v1`** `{ <tid>: { <ลำดับ quiz2 ในหัวข้อ>: {done, ok, n, t} } }` — quiz2 (`_work/std2/js/quiz.js`) ส่งเหตุการณ์ `std2:quiz` ทุกครั้งที่ตอบ ห้ามตั้งชื่อคีย์ชนกับ `atlas-sula-v1` `atlas-bm-v1` `atlas-last-v1` `atlas-sem-v1` `atlas-mode-v1` `atlas-rail-v1` `atlas-admin-v1` (หัวข้อ 12)
- จุดที่โค้ดใหม่แตะของเดิม (ทั้งหมดใน `renderSubject`/`fillBody`/`toggleKey`): ครอบ `.sgrid` · สารบัญเดิมออก → `tocSideHtml()` · spy เรียก `tocSetCur()` · `fillBody` เรียก `tocOnFill()` · `toggleKey` เรียก `tocMarks()` · `SUB_IO` ประกาศใน layout.js
- ตรวจ: `src/verify.py` ไม่ต้องแก้ (ไม่อ้าง `.toc`) · `_work/layout/shots.py <วิชา> <ลำดับหัวข้อ>` ถ่าย 3 ความกว้าง × 2 โหมดพร้อมวัดคอลัมน์ · Playwright รันใน VM ของ Cowork ไม่ได้ (ไม่มีไลบรารีระบบ) — ตรวจจากสำเนาในคลาวด์ (`_work/layout/_site.zip` = ไฟล์ที่ต้องมี)


## 12. ปรับโครงสร้างและการใช้งาน ระยะ 1 (เพิ่ม 26 ก.ย. 2026)

ผลจากการตรวจโครงสร้าง/การใช้งานทั้งเว็บ (Playwright จอคอม + มือถือ 360/390 px · axe-core) — แก้เฉพาะส่วนที่ไม่ใช่บล็อกประกอบอัตโนมัติ
- **`index.html` จัดใหม่ให้ถูกรูปแบบ:** `<html lang="th">` · `<title>` กับ `<script src="app.js?v=…" defer>` อยู่ใน `<head>`
  (script มี `onerror` เขียนข้อความลง `#boot` ถ้าโหลดไม่สำเร็จ) · `#view` มี `<p id="boot">กำลังโหลด…</p>` ให้เห็นระหว่างรอ app.js
  (`go()` เขียนทับเอง) · มี `<noscript>` · `<nav id="nav" aria-label="รายวิชา">`
  — **สคริปต์ใน `_work/` ที่อัปเดตเลขเวอร์ชันให้แทนที่เฉพาะ `app.css?v=` / `app.js?v=`** ถ้าสคริปต์ไหนเขียน index.html ทั้งไฟล์จากแม่แบบ ต้องแก้แม่แบบตามไฟล์นี้ก่อน ไม่งั้นทุกข้อข้างบนจะหาย
- **ฟอนต์อยู่ใน `fonts/`** (`src/fetch_fonts.py`) แทน fonts.googleapis.com ซึ่งเป็นสไตล์ชีตที่ app.js ต้องรอ — วัดแล้วเซิร์ฟเวอร์ฟอนต์ช้า 5 วินาที หน้าเว็บก็ช้า 5 วินาที
  คง unicode-range ไว้ เบราว์เซอร์โหลดเฉพาะชุดอักษรที่ใช้ · ถ้าจะเพิ่มน้ำหนัก/ตระกูลฟอนต์ แก้ `FAMILIES` ในสคริปต์แล้วรันใหม่
- **มือถือ (≤ 900 px) ซ่อนรายการเมนูซ้าย** เหลือแค่ชื่อเว็บ (สูง 72 px) — เดิมแถบเลื่อนแนวนอนพัง: `.nav-item{width:100%}` ในแถวแนวนอน + `.sem-body.open{display:block}`
  ทำให้ปุ่มแรกกว้าง 25 000 px แถบสูง 280–430 px รายชื่อวิชาหลุดนอกจอ · การนำทางบนมือถือใช้แถบล่าง `#bbar` กับการ์ดในหน้าภาพรวม
- **บล็อก CSS `v5: กันเนื้อหาล้นจอแคบ`** (ต่อจาก `v2: จอเล็ก` ใน app.css — แก้ตรงได้): `#view .tw` เลื่อนแนวนอน (บล็อกสรุปของ ТАУ ไม่มี namespace `.tau`
  ตารางจึงเคยดันทั้งหน้ากว้าง 746 px) · `.ed` ยาวตัดบรรทัดได้บนจอ ≤ 600 px · ชื่อหัวข้อ (`h2 lang="ru"`) ตัดคำ/ใส่ยัติภังค์ได้ ไม่ดันปุ่ม ✓ ออกนอกจอ
  · `math.m-wide` = สูตรในบรรทัดที่กว้างเกินกล่อง แปลงเป็นบรรทัดแยกเลื่อนแนวนอนได้ — คลาสนี้ใส่โดย `fitWideMath()` ใน app.js
  (ต่อจาก `fillBody` · เรียกตอนเติมหัวข้อ ตอนเปิด `<details>` และตอนความกว้างจอเปลี่ยน) **ห้ามใส่ overflow ให้ `math` ทุกตัวด้วย CSS**
  เพราะเกือบทุกสูตรมีตัวห้อย/ตัวยกล้นกล่องแนวตั้ง จะถูกตัด (ลองแล้ว เทียบภาพต่างกันหลายร้อยพิกเซล)
  · สแกนล่าสุด: ทุกวิชา ทั้งสองโหมด เปิดเจาะลึกทุกกล่อง ที่ 360 และ 390 px ไม่มีอะไรล้นหน้า (nav แปลงสูตรเป็น `.m-wide` 11 สูตรที่ 390 px · 21 สูตรที่ 360 px)
- **โหมดผู้ดูแล:** เมนู «ปรับภาคเรียน» (แบบสอบถามภาคเรียน) เห็นเฉพาะเมื่อเปิดลิงก์ด้วย `?admin` (จำไว้ในเครื่อง คีย์ `atlas-admin-v1`) · ปิดด้วย `?admin=0`
- **ข้อความบนหน้าเว็บต้องพูดกับผู้อ่าน** ไม่ใช่กับเจ้าของงานหรือ Claude — ห้ามมี «บอกผม», «ส่งกลับมาให้ผม», «ตามที่สั่งไว้» ในข้อความที่ผู้อ่านเห็น
  (เคยหลุดอยู่ในหน้าภาพรวม หน้าวิชาโครงร่าง 42 วิชา และแบบสอบถามภาคเรียน — แก้แล้ว)
- ระยะ 2–3 ทำแล้ว → หัวข้อ 13 · ที่ยังค้าง (ต้องเจ้าของงานตัดสินใจ/ทำบนเครื่อง): เก็บต้นฉบับใน `_work/` เข้า git (repo private) ·
  ย้ายแบบจำลองของวิชาเดิมออกจาก app.js ไป `js/subj/` ตอนยกระดับแต่ละวิชา · CSS ซ้ำรายวิชาหายเองเมื่อทุกวิชาเป็น STD2


## 13. โครงเว็บ v5 — สิ่งที่งานยกระดับวิชาต้องรู้ (เพิ่ม 26 ก.ย. 2026)

โครงเว็บ (ส่วนกลางของ app.js/app.css ที่ไม่ใช่บล็อกประกอบอัตโนมัติ) ทำเสร็จก่อนเริ่มยกระดับทุกวิชา — ของทั้งหมดอยู่ในส่วนที่ขึ้นต้น `v5:`
แก้ได้ตรงใน app.js/app.css (ไม่มีต้นฉบับใน `_work/`) · ทดสอบในเบราว์เซอร์ครบทุกข้อบนจอคอมและมือถือก่อน commit · ความสามารถที่เพิ่มหลังจากนี้เสียบผ่านจุดเกี่ยว/ช่อง SLOT (หัวข้อ 14) ไม่เขียนลงส่วน `v5:` ตรง ๆ

**ที่อยู่ของหน้า (router · ค้น `/* ---- router (v5)`)**
- `#/` · `#/<วิชา>` · `#/<วิชา>/sum|full` · `#/<วิชา>/<หัวข้อ>[/<id>]` · `#/glossary[/<คำกรอง>]` · `#/search/<คำค้น>[/<วิชา>]` · `#/sem` (ผู้ดูแล) · `#s=<วิชา>` แบบเก่ายังใช้ได้ · หน้าของ v6 ผ่าน `registerPage`: `#/subjects` `#/progress` `#/practice` `#/oral` `#/flash` `#/quiz` `#/cram` — ตารางครบในหัวข้อ 14
- ปุ่ม Back/Forward ย้อนได้ทุกขั้น · เลื่อนอ่านแล้วที่อยู่ชี้หัวข้อที่อ่านอยู่ (`history.replaceState` + ระยะในหัวข้อใน `history.state`) → Back/รีเฟรช/ส่งลิงก์กลับมาตรงที่เดิม · ชื่อแท็บตามหัวข้อ
- **ลิงก์ในเนื้อหา:** ข้ามหัวข้อ/วิชา `<a href="#/nav/nav-7">` หรือถึงองค์ประกอบ `<a href="#/nav/nav-7/n7-top">` · ในหัวข้อเดียวกัน `<a href="#<id>">` ·
  `<a href="#<รหัสหัวข้อ>">` ของวิชาเดียวกันก็ได้ (สลับโหมดให้เองถ้าหัวข้อปลายทางอยู่อีกโหมด) · `tests/audit-integrity` ตรวจว่าปลายทางมีจริงทุกลิงก์
- id ขององค์ประกอบในหัวข้อต้องไม่ซ้ำทั้งหน้าวิชา (ขึ้นต้นด้วยรหัสหัวข้อ เช่น STD2 ใช้ `i<N>-` / `n7-`) — ใช้เป็นปลายทางของลิงก์ได้ทันที
- API: `go({v, id, topic, anchor, mode, hl, seg, q, sid})` · `navTopic(id)` (เพิ่มประวัติ) · `scrollToTopic(id, {off, anchor, hl})` · `scrollToTarget(el, off)` · `state` (v/id/topic/mode/seg) · หน้าใหม่ `registerPage(ชื่อ, {render, title})` (หัวข้อ 14)
- **กระโดดให้ตรงที่:** `scrollToTarget` กระโดดทันทีแล้วแก้ตำแหน่งจนนิ่ง (นิ่ง 1.2 วินาทีและไม่มีหัวข้อใกล้จอกำลังโหลด · สูงสุด 6 วินาที หรือ 20 วินาทีถ้ายังโหลดอยู่ · หยุดเมื่อผู้อ่านแตะ/เลื่อนเอง) เพราะกล่องหัวข้อระหว่างทางโหลดทีหลัง
  — ตัวกระโดดของบล็อก v4 (`jumpTopic`/`scrollToEl`/`settleAt` ใน `_work/layout/layout.js`) ถูกแทนด้วยตัวนี้ (กำหนดทับท้าย router) ครั้งหน้าที่แก้ layout.js ให้เรียก `navTopic`/`scrollToTarget` แทน
  · **งานกระโดด (`NAVBUSY` · S9 29 ก.ย. 2026):** ตั้งแต่ `scrollToTopic` เริ่มรอหัวข้อโหลดจนตำแหน่งนิ่ง `writeScrollState` ไม่เขียน แล้ว `navEnd` เขียนครั้งเดียวตอนจบ
  (เดิมตัวหน่วง 400 ms เขียนตำแหน่งกลางทาง — บนสุดของหน้า `#/<วิชา>/full` หรือหัวข้อระหว่างทาง — ที่อยู่/«อ่านต่อ»/ประวัติ S7 ค้างผิดหัวข้อ) · วงแก้ตำแหน่งรอได้ถึง 20 วินาทีถ้าหัวข้อใกล้จอยังโหลดอยู่ · เลื่อนนุ่ม (เป้าหมายใกล้) ก็แก้ตำแหน่งต่อหลังเลื่อนจบ · แก้ตำแหน่งก่อนตัดสินว่าจบทุกเฟรม
  · `go()` และ Back ไปตำแหน่งแบบพิกเซลเรียก `navStop()` · ResizeObserver บน `#view` สั่งเขียนใหม่เมื่อเนื้อหาเปลี่ยนความสูงโดยไม่มี scroll · โค้ดที่เลื่อนหน้าเองแล้วอยากให้ที่อยู่ตาม ใช้ `scrollToTarget` (ได้ NAVBUSY ฟรี)
  · ตรวจด้วย `node tests/navstate.browser.cjs [--cpu 4] [--slow 700] [--mobile]` (session ยาว ~60 หัวข้อ แล้วกระโดด · ไม่อยู่ในชุด `--test`)
- `verify.py` ยังเปิดวิชาด้วย `location.hash = '#s=<วิชา>'` (ทดสอบรูปแบบเก่าไปด้วย) และรอ `state.id`

**ค้นหา (ค้น `/* ---- search ---- */`)** โหลดดัชนีเป็นขั้นทีละวิชา (หัวข้อ 14.4) · เรียงผล ชื่อตรง > ชื่อไทย > จำนวนครั้งในเนื้อหา · วลีไม่เจอแต่ทุกคำอยู่ในหัวข้อเดียวกันก็นับ ·
ё = е · บล็อกสรุปค้นได้ · กดผลที่เป็นหัวข้อ → ไฮไลต์คำ (`mark.q-hit`) แล้วเลื่อนไปที่แรกที่เจอ · ไม่ไฮไลต์ใน `script style math svg canvas [data-demo]`

**ไฟล์ JS/CSS แยกรายวิชา (`js/subj/<วิชา>.js` · `.css`)** — ทางใหม่สำหรับแบบจำลองของวิชาที่ยกระดับ
- app.js โหลดไฟล์ของวิชาเมื่อเปิดวิชานั้นครั้งแรก (`subjAssets()`) ก่อนติดตั้งแบบจำลองในหัวข้อ · ผู้อ่านไม่ต้องโหลดแบบจำลองของวิชาที่ไม่ได้เปิด (ตอนปิดรุ่น v6 app.js 6.3 MB · gzip 1.6 MB ยังโหลดทุกวิชาทีเดียว — ส่วนใหญ่เป็นแบบจำลองรายวิชา)
- ในไฟล์: `Object.assign(DEMOS, { "<key>": host => { … } })` · เรียกของกลางได้ (`buildDemo`, `Plot`, `fitCanvas`, `CV`, `window.STEPS2` ฯลฯ) · **ห้ามแตะ `document` ที่ระดับบนสุด** (tests รันไฟล์นี้ใน vm ต่อจาก app.js) · CSS อยู่ใต้ namespace ของวิชา · ใช้ `buildDemo` หรือ `demoWatch` และหยุดลูปเมื่อ `document.hidden` (หัวข้อ 14.3)
- `python src/build_data.py` ใส่ hash ของไฟล์ลง `data/manifest.json` (`subjects.<วิชา>.js/.css`) ใช้เป็น `?v=` — **ต้องรันทุกครั้งที่แก้ไฟล์** (tests ฟ้อง «stale manifest» ถ้าลืม)
- ใช้แล้ว 9 วิชา (หัวข้อ 15) — ตอนยกระดับแต่ละวิชา ให้สคริปต์ประกอบของวิชา (`_work/std2/tools/assemble.py` หรือแบบ `_work/navpilot/build.py`) เขียนไฟล์นี้แทนการแทนที่บล็อกใน app.js แล้วลบบล็อกเดิมออก

**อ่านแบบออฟไลน์ (`sw.js` · `manifest.webmanifest` · `icons/`)**
- service worker ลงทะเบียนเฉพาะบนเว็บจริง (https ที่ไม่ใช่ localhost) — preview.bat / verify.py ไม่ใช้ จึงไม่มีไฟล์เก่าค้างตอนแก้เนื้อหา · ทดสอบในเครื่องด้วย `?sw=1`
- หน้าเว็บ = เน็ตก่อน (รอ ≤ 4 วินาที) · ไฟล์อื่น = ส่งสำเนาในเครื่องทันทีแล้วโหลดใหม่เบื้องหลัง (ผู้อ่านเห็นเนื้อหาใหม่ไม่เกินการเปิดครั้งถัดไป แม้ลืมเปลี่ยน `DATA_VERSION`) · คำขอ `cache: "reload"` (ปุ่มเก็บ/อัปเดตสำเนา) = เน็ตก่อนเสมอ
- ปุ่ม «เก็บวิชานี้ไว้อ่านออฟไลน์» ในหน้าวิชา (`offlineSave`) ดึงหัวข้อ + `data-fig` + `data-demo="vh-…"` (→ `data/vh/<…>.json`) + `data/ih/*` (ถ้ามี `ih-…`) + ฟอนต์ + ตัวโปรแกรม + `js/subj/` ของวิชา
  + ไฟล์จาก `HOOKS.on("offline")` (`data/figdim.json` · ดัชนีค้นหาของวิชา · `data/qa` · `data/rel.json`) · ดู/อัปเดต/ลบสำเนาทีละวิชาในหน้า `#/progress`
  — **วิชาที่โหลดไฟล์ข้อมูลแบบอื่นเพิ่ม ต้องคืน URL ใน `HOOKS.on("offline", sid => […])`** (ไม่แก้ `saveOffline()`) ไม่งั้นส่วนนั้นจะเปิดไม่ได้ตอนออฟไลน์
- เปลี่ยน `CACHE` ใน sw.js เมื่ออยากล้างสำเนาในเครื่องของผู้อ่านทุกคน — ต้องล้าง/ตรวจ `atlas-offline-v1` ในหน้าเว็บให้ตรงกันด้วย ไม่งั้นหน้าวิชาบอกว่าเก็บไว้แล้วทั้งที่สำเนาหาย

**หน้าแรก/ผู้อ่าน** (v6 จัดใหม่ — หัวข้อ 14.2) หน้าหลัก = เรียนต่อ/เลือกวิชา + วิชาของฉัน + วิชาเนื้อหาเต็มที่เหลือ (จาก `DEEP` อัตโนมัติ) · แค็ตตาล็อก 54 วิชาอยู่ที่ `#/subjects` · ผู้อ่านเลือกภาคของตัวเอง (`atlas-mysem-v1` · `curSem()` แทน `PROGRAM.current` ทุกที่) ·
สำรอง/นำเข้าความคืบหน้าเป็นไฟล์ JSON ท้าย `#/progress` (รุ่น 2 · ทุกคีย์ `atlas-*` ยกเว้นคีย์ของเครื่อง `atlas-admin-v1` `atlas-backup-prev` `atlas-offline-v1` · นำเข้าแล้วกู้คืนชุดเดิมได้ — หัวข้อ 14.8) · ปุ่ม ↑ โผล่เฉพาะตอนเลื่อนขึ้น

**localStorage:** คีย์ของ v5 `atlas-sula-v1` (ทบทวนแล้ว) `atlas-bm-v1` `atlas-last-v1` (`{v, id, mode, topic, off, anc?, aoff?}`) `atlas-sem-v1` `atlas-mode-v1` `atlas-rail-v1`
`atlas-quiz-v1` `atlas-admin-v1` `atlas-mysem-v1` `atlas-offline-v1` + คีย์ของ v6 — **ตารางครบ 22 คีย์และข้อบังคับ (`atlas-<ชื่อ>-v<N>` · `learnerKey()` · เขียนผ่าน `store()`) อยู่ในหัวข้อ 14**

**การเข้าถึง** สีตัวอักษรรอง `--ink-3` / `--accent-2` ผ่าน 4.5:1 บนพื้นทุกสีทั้งสองโหมด — **ห้ามใช้สีเทาอ่อนกว่า `--ink-3` กับตัวอักษร** ·
ปุ่มพับหัวข้อมี `aria-expanded` (ใช้ `setFold(sec, open)`) · โฟกัสย้ายไปหัวเรื่องเมื่อเปลี่ยนหน้า · axe-core: ไม่เหลือปัญหาระดับ serious ในหน้าหลัก (เหลือ heading-order ในเนื้อหาบางวิชา)

**งานยกระดับวิชา — เช็กลิสต์เพิ่มจากหัวข้อ 3/9:** ลิงก์ข้ามหัวข้อใช้รูปแบบ `#/…` · แบบจำลองใหม่อยู่ใน `js/subj/` · ข้อมูลที่โหลดเพิ่มต้องอยู่ในเว็บเดียวกัน
และคืน URL ใน `HOOKS.on("offline")` · `python src/build_data.py` · `node --test tests/*.test.cjs` · `python src/verify.py --subject <วิชา> --mobile` · **เช็กลิสต์ v6 ฉบับเต็ม (ฟิลด์ DEEP · id ปากเปล่า/quiz2 · คีย์ใหม่ · counts) อยู่ในหัวข้อ 14**



## 14. โครงเว็บ v6 — จุดเกี่ยว ช่องโค้ด หน้า และข้อมูลผู้เรียน (ปิดรุ่น 7 ต.ค. 2026)

โครงเว็บรอบ 2 (v6) ทำเป็น 8 session คู่ขนาน (S1–S8 · คำสั่งใน `claude/คำสั่ง-session-S1–S8.md`) merge เข้า `main` 28–30 ก.ย. 2026 ·
ต่อด้วย PR #14 (verify รอดัชนีที่โหลดทีละวิชา) · #15 (S8 ต่อ: ทุกคีย์ผ่าน `store()`/`learnerKey()`) · #16 (คำเตือน `saveQuiz` หัวข้อ 11) · #17–#18 (เมนูซ้ายแบบย่อ + โหมดอ่าน · 4 ต.ค.) · S9 (router `NAVBUSY` + ประสานรอยต่อ 39 จุด + ปิดรุ่น · 7 ต.ค.)
ข้างล่างคือสรุปถาวร — **อ่านก่อนแตะส่วนกลางของ app.js/app.css** · บันทึกตอนพัฒนาราย session อยู่ท้ายหัวข้อ (14.1–14.9 · คงเลขเดิมเพราะหัวข้อ 2, 11, 13 อ้างถึง)

### กติกาถาวร — ความสามารถใหม่เสียบเข้า ไม่แก้ฟังก์ชันร่วม

- โค้ดของ v6 อยู่ใน **ช่อง** — app.js: `/* ===== SLOT S<n> (<งาน>) BEGIN ===== */` … `/* ===== SLOT S<n> END ===== */` เรียง S1–S8 ก่อน `/* ===== SLOTS END ===== */` และ `buildNav();` (โค้ดในช่องรันก่อนเริ่มแอป จึงลงทะเบียน hook/หน้าได้ทัน) ·
  app.css: `/* ===== SLOT S<n> BEGIN ===== */` … `END` (ไม่มีชื่องานในวงเล็บ — tests ตรวจรูปนี้) ท้ายไฟล์ก่อน `SLOTS END` แล้วตามด้วยบล็อก `v6 (S9 ปิดรุ่น)` (ประสานของหลายช่องบนจอเดียวกัน — แก้ตรงได้) · `tests/hooks.test.cjs` ตรวจว่า S1–S8 มีครบ เรียงถูก
- แก้ความสามารถเดิม = แก้ในช่อง/ส่วนของมัน (ตารางข้างล่าง) · ความสามารถใหม่ = ช่องใหม่ต่อจาก S8 ก่อน `SLOTS END` ทั้งสองไฟล์ ·
  **ไม่เขียน logic ใหม่ลงฟังก์ชันร่วม** (`fillBody` `renderSubject` `renderOverview` `go` `saveOffline` …) — ถ้าจุดเกี่ยวไม่พอ เพิ่มจุดเกี่ยวใหม่ (`HOOKS.run/render` หนึ่งบรรทัดในฟังก์ชันร่วม + บรรทัดใน `tests/hooks.test.cjs`)
- ห่อ/ทับฟังก์ชันร่วมได้เมื่อจำเป็นจริง และต้องเขียนไว้ในบันทึก — ที่ห่ออยู่แล้ว: ช่อง S2 ห่อ `go` `navTopic` `scrollToTarget` `focusSearch` ·
  ท้ายส่วน router ทับของบล็อก v4: `jumpTopic` `scrollToEl` `settleAt` `margWeak` (ส่ง «เปิดฉบับเต็ม» ผ่าน `go`) `quizOfSubject` (= ตัวเลขของ `subjTrip`) — ครั้งหน้าที่แก้ `_work/layout/layout.js` ให้ย้ายพฤติกรรมเหล่านี้เข้าไปแล้วลบตัวทับ
- หน้าใหม่ = `registerPage` (ไม่เพิ่มกรณีใน `go`/`parseRoute`) · โหมดวิชาเพิ่ม (เช่นคืนก่อนสอบ) = หน้าแยก `#/<หน้า>/<วิชา>` ไม่แก้ `renderSubject`
- ส่วนที่คำนวณล้วน (ไม่แตะ DOM) แยกไว้ระหว่าง marker ให้ tests รันใน vm (`S6 core BEGIN/END` · `S7 PURE BEGIN/END` · `S5 end of pure helpers`) · โค้ดระดับบนสุดที่แตะ `document` ต้องเช็ก `typeof document`
- ปุ่ม/การ์ดที่พาไปหน้าอื่นเป็น `<a href="#/…">` จริง (คัดลอก/เปิดแท็บใหม่ได้) · `<button>` ใช้กับการกระทำ · ข้อความบนจอพูดกับผู้อ่าน (หัวข้อ 12 · `tests/content-rules` ตรวจสตริงใน app.js)
- ไฟล์ใหม่ตั้งชื่อตามความสามารถ: `tests/<ชื่อ>.test.cjs` · `tests/<ชื่อ>.browser.cjs` · `src/build_steps/<ชื่อ>.py` · `data/<ชื่อ>/` หรือ `data/<ชื่อ>.json`
- ทุกงานจบด้วย `python src/build_data.py` → `node --test tests/*.test.cjs` → `python src/verify.py --no-throttle --mobile` (ทั้งเว็บ หรือ `--subject` · หน้ายาว `--timeout 240`) · หน้าเว็บห้ามเรียกเซิร์ฟเวอร์ภายนอก
- **สิ่งที่ `src/verify.py` พึ่ง — ห้ามเปลี่ยนชื่อ/ความหมาย:** `#s=<วิชา>` · `#/<วิชา>/full|sum` (รอบมือถือ) · `state.v`/`state.id` (+ `state.v === "search"`) · `#search` · `#view .modebar [data-mode]` · `#view section.topic .tbody` · `.tbody[data-lazy]` ·
  `.tload` (อยู่จนเติมหัวข้อครบ) / `.tfail` · `fillAllBodies()` · การ์ด `#view .subj-grid .subj[data-go]` · `IX_READY` `ixMissing()` `ixBusy()` `IXHAY` · ผล `#view .res-item` · `figure.ifig[data-fig] .fw img` ·
  canvas = `[data-demo]` (กล่อง `ih-…` ที่มีลูกนับว่าติดตั้งแล้ว) · `console.error` (จอคอม) / page error (ทุกรอบ) = FAIL

**ช่องและส่วนกลาง — โค้ดของอะไรอยู่ที่ไหน** (ค้นด้วยข้อความในวงเล็บ)

| งาน | ในช่อง (app.js) | นอกช่อง (ส่วนกลางที่แก้ตรงได้) |
|---|---|---|
| S1 ด่าน build | ว่างทั้งสองไฟล์ | `src/` `tests/` `.github/` · `DATA_VERSION` `dbVer` `dbUrl` `dbGet` `DBCACHE` |
| S2 เปลือกนำทาง | `#/subjects` `#/progress` · `dialog.tsheet` · ชิปหัวข้อ `S2NAV` · แถบหลบ `html.reading` · ท้ายหัวข้อ `nav.tend` · ชุดอ่านง่าย · `html.rail-mini` + `html.read-mode` | `renderOverview` `subjCard` `buildNav` `subjTrip` `topicQuiz` `practiceStore` · `#bbar` ใน index.html · CSS `.topic-nav` `.topbar` `#bbar` `@media (max-width: 900px)` `v5: กันเนื้อหาล้นจอแคบ` |
| S3 ประสิทธิภาพ/ออฟไลน์ | `demoInstall` `demoMount` · `fontWarm` · `fillTurn` `fillChunks` · การ์ดออฟไลน์ | `demoWatch` `buildDemo` `fitCanvas` `Plot` · `fillBody` · `SUKAFIG` · `subjAssets` · `offline*` `saveOffline` `offlineUi` (`S3: สำเนาออฟไลน์`) · `sw.js` · `src/build_steps/figdim.py` |
| S4 ค้นหา | hook go/subject/offline | `/* ---- search ---- */` ทั้งส่วน · `filterGloss` · `/* ---- search box ---- */` · `#/search/…` ใน `parseRoute`/`routeHash` |
| S5 ฝึกทบทวน | `qaText` `qaIds` `qaIndex` · `SAY` `sayButton` · hook fill (id ปากเปล่า/quiz2) · `#/practice` `#/oral` · ลงทะเบียน `#/flash` `#/quiz` | `renderFlash` `renderQuiz` `POOL` · `#quizBtn` · `src/build_steps/qa.py` |
| S6 SRS/วันสอบ | ทั้งหมด: `S6 core` · `window.SRS` `examPlan` · แถว `subject-head` · `#/cram` | — |
| S7 ลิงก์/ส่วนตัว | ทั้งหมด: `S7 PURE` · `.s7-bar` · ประวัติ/ปัก/บันทึก/แชร์/แจ้งจุดผิด | `src/build_steps/rel.py` |
| S8 ข้อมูลผู้เรียน | `storeFailed` · การ์ดพื้นที่เก็บ/ชุดก่อนนำเข้า · `clearTemp` · reload เมื่อแท็บอื่นนำเข้า | ต้นส่วน APP: `store` `LEARNER` `learnerKey` `METAKEY` `SCHEMA` `DEVICE_KEYS` · `stableId` `termKey` `migrateQuizKeys` `learnerStart` · `progressExport` `importPlan` `applyLearnerData` `restorePrev` |
| S9 router | — | `/* ---- router (v5)`: `NAVJOB` `NAVBUSY` `navBegin/End/Stop` `navLine` `restoreY` ในตัวเขียนตำแหน่ง/ตัวกระโดด · ตัวทับของบล็อก v4 ท้าย router · CSS `v6 (S9 ปิดรุ่น)` |

### จุดเกี่ยว (ค้น `v6: จุดเกี่ยว`)

- `HOOKS.on(ชื่อ, fn)` — วงเล็บท้าย = ช่องที่ใช้อยู่ · fn ที่โยน error ถูกจับและ `console.error` (หน้าไม่พัง แต่ verify นับเป็น FAIL)
  - `"fill", (el, t, sid)` หลังเติมหัวข้อครบ (`el` = `.tbody` · `t` = เมทาดาทาใน DEEP) · แบบจำลองติดตั้งเมื่อใกล้จอ — ต้องการ DOM ของมันตอนนี้ให้เรียก `demoInstall(host, sid)` (S2 S5 S6 S7)
  - `"subject", (s, deep, mode)` หลังวาดหน้าวิชา · ทุกวิชา (`deep` undefined = วิชาโครงร่าง) (S2 S3 S4 S5 S6) · `"overview", ()` หลังวาดหน้าแรก (S6)
  - `"go", st` ท้าย `go()` ทุกครั้ง รวมหน้าจาก `registerPage` — **ไม่ยิง** เมื่อเลื่อนภายในวิชาเดียวกัน (`navTopic` · Back/ลิงก์ในวิชาเดียวกันโหมดเดียวกัน) (S2 S3 S4 S5 S7 S8)
  - `"clear", ()` ก่อนล้างหน้า — หยุด timer/observer/เสียงของคุณ (S2 S3 S5 S6 S7) · `"offline", sid => [url…]` ไฟล์เพิ่มของปุ่มเก็บออฟไลน์ (`HOOKS.collect`) — S3 `data/figdim.json` · S4 `ixUrl(sid)` · S5 `data/qa/_index.json` + `data/qa/<sid>.json` · S7 `data/rel.json`
- `HOOKS.html(ช่อง, ctx => html)` คืนสตริง (ห้าม `<script>`) แล้วผูกปุ่มใน hook `overview`/`subject`/`go`: `"overview-top"` (S6 วันนี้ทวนอะไร · S7 อ่านล่าสุด/ปักไว้) · `"overview-end"` ·
  `"subject-head"` ใต้หัวหน้าวิชา ก่อนแถบโหมด `ctx = {s, deep, mode}` (S5 ปุ่มฝึก · S6 ครบกำหนดทวน/วันสอบ — จอ ≤ 600 px ต้องสั้น: ของรองพับไว้) · `"subject-end"` · `"progress"` การ์ดใน `#/progress` (S3 S6 S7 S8)
- `registerPage(ชื่อ, { render(st), title(st) })` → `#/<ชื่อ>[/seg/…]` · `state = {v: ชื่อ, seg: […]}` · `go({v: ชื่อ, seg: […]})` · Back/ประวัติ/ชื่อแท็บทำให้เอง · ใช้อยู่: `subjects` `progress` (S2) · `practice` `oral` `flash` `quiz` (S5) · `cram` (S6)

### API สาธารณะ — สัญญาบรรทัดเดียว

**id และคีย์**
- `stableId(text)` (app.js) = `stable_id(text)` (`src/buildlib.py`) — ถอดแท็กเป็นช่องว่าง ยุบช่องว่าง → djb2 32 บิต ฐาน 36 · ตรงกันทุกไบต์ (`tests/hooks`)
- `termKey(m, t, i)` = `"g:" + m.id + "-" + stableId(t.ru)` (คำรัสเซียซ้ำในกลุ่ม → `-2`, `-3`) — **ทุกที่ต้องเรียกผ่านนี้** · แก้ `t.ru` ของคำเดิม = คีย์ใหม่
- id คำถามปากเปล่า `details.qa` = id เดิม หรือ `"qa-" + stableId(qaText(.qa-q หรือ <summary>))` · คำถามซ้ำข้ามหัวข้อ → `-<tid>` (`data/qa/_index.json` → `fix`) · **อย่าคำนวณเอง** — อ่านจาก DOM หรือ `data/qa`, ในเอกสารที่ parse เอง (เช่น `#/cram`) เรียก `qaIds(root, sid, tid)` หลัง `qaIndex()`
- host `quiz2` ไม่มี id → `id` = `data-id` = `<tid>-q<n>` (นับจาก 1 · hook fill ของ S5)
- คีย์ SRS: หัวข้อ `k:<tid>` · ศัพท์ `termKey()` · ปากเปล่า `q:<sid>/<tid>/<qaId>` · ควิซรายบล็อก `z:<tid>/<data-id ของ host>` · วิชาโครงร่าง `k:<sid>:<ลำดับ>`

**ข้อมูลผู้เรียน (S8)**
- `store(key, value)` → true/false — ตัวเขียนเดียวของ localStorage (สตริงเขียนตรง · `undefined` ลบ · อื่น ๆ JSON · ล้ม → แถบแจ้งครั้งเดียว) · tests ตกถ้ามี `localStorage.setItem` ตรง ๆ นอกข้อยกเว้น
- `learnerKey(key, {kind: "set"|"list"|"obj"|"any"|"raw", re, check(v), label, count(v), temp, meta})` ลงทะเบียนคีย์ที่ระดับบนสุดของช่อง · tests ตกถ้ามีคีย์ `atlas-*-vN` ไม่ลงทะเบียน
- `learnerStart()` + **`SCHEMA = 3`** + `atlas-meta-v1` — รันก่อนช่อง SLOT · ย้ายข้อมูลทีละขั้นเมื่อ schema ต่ำกว่า (1→2 คีย์ศัพท์ถาวร · 2→3 คีย์ควิซรายบล็อกตามลำดับ → id ของ host ใน `atlas-srs-v1` + คัดลอก `atlas-quiz-v1` ที่ S5 ยังไม่มีเข้า `atlas-practice-v1`) · ล้ม = schema ไม่ขยับ · เปลี่ยนความหมายคีย์ใด = เพิ่ม `SCHEMA` + ขั้นย้าย
- ไฟล์สำรองรุ่น 2 `{app: "atlas-site", v: 2, schema (= schema จริงของข้อมูลในเครื่อง ไม่ใช่ SCHEMA), saved, data}` — ไม่รวม **`DEVICE_KEYS`** (`atlas-admin-v1` `atlas-backup-prev` `atlas-offline-v1` — ของเครื่องนี้ ไม่ส่งออก ไม่รับจากไฟล์ ไม่ลบตอนนำเข้า) ·
  `progressImport(file)` → `importPlan` ตรวจ+สรุป → `confirm` → `applyLearnerData` (เก็บชุดเดิมลง `atlas-backup-prev` ก่อน) → โหลดใหม่ · แท็บอื่นที่เปิดอยู่โหลดใหม่เอง (ฟัง `storage` ของ `atlas-backup-prev`) · `restorePrev()` สลับกับชุดก่อนนำเข้า

**ที่อยู่และการกระโดด (router)**
- `go(st, opt)` — `st = {v, id?, topic?, anchor?, mode?, hl?, off?, anc?, aoff?, seg?, q?, sid?}` · `opt = {replace, pop, init, y}` · เขียนตำแหน่งของหน้าที่ออก → `navStop()` → วาด → ประวัติ → `HOOKS.run("go")` · «อ่านต่อ» (`atlas-last-v1`) เฉพาะวิชาที่มี DEEP ·
  `GO_POP` = go ครั้งล่าสุดมาจาก Back/Forward (หน้าที่ทำต่อจากเดิมได้ใช้ตัดสิน) · บนหัวหน้าวิชา (ไม่มีหัวข้อ) ที่อยู่จดโหมด `#/<วิชา>/sum|full` ไว้ด้วย — Back จากอีกโหมดกลับโหมดเดิม
- `navTopic(id, o)` กระโดดในวิชาที่เปิดอยู่ + เพิ่มประวัติ · `scrollToTopic(id, {off, anchor, hl, anc, aoff})` รอหัวข้อโหลดแล้วเลื่อน · `hl` ไฮไลต์คำ (ตรงแค่ชื่อหัวข้อ → ไฮไลต์ที่ชื่อ) ·
  **คืนตำแหน่ง** (Back · รีเฟรช · «อ่านต่อ») ใช้จุดอ้างอิง `anc` = id ขององค์ประกอบสุดท้ายเหนือเส้นอ่าน (`anchorAt`) + `aoff` — ทนต่อความสูงด้านบนที่เปลี่ยน (แบบจำลองติดตั้งเมื่อใกล้จอ) · ไม่มีจุดอ้างอิงค่อยใช้ `off` จากหัวหัวข้อ
- `scrollToTarget(el, off)` เลื่อนแล้วแก้ตำแหน่งจนนิ่ง 1.2 วินาทีโดยไม่มีหัวข้อใกล้จอกำลังโหลด (สูงสุด 6 · 20 วินาทีถ้ายังโหลด) · `restoreY(y)` หน้าที่เนื้อหามาทีหลัง (`#/cram` ผลค้นหา) — เลื่อนซ้ำจนถึง y และความสูงนิ่ง (≤ 20 วินาที) · ทั้งสองหยุดเมื่อผู้อ่านแตะ/เลื่อน/กดคีย์
- `NAVBUSY` ≠ 0 = มีงานกระโดดค้าง · `navBegin()` → เลขงาน · `navEnd(job)` เขียนที่อยู่ + «อ่านต่อ» ครั้งเดียวตอนจบ · `navStop()` ยกเลิก · ระหว่างงาน `writeScrollState()` ไม่เขียน และแถบหลบของ S2 ไม่นับการเลื่อน ·
  **โค้ดที่เลื่อนหน้าเอง:** ใช้ `scrollToTarget` · ถ้าใช้ `window.scrollTo` เอง เรียก `navStop()` และ `unread(true)` ก่อน · โค้ดที่ชดเชยตำแหน่งเองหลังเปลี่ยนความสูง (แบบ `railKeep`) เรียก `pinPick()` หลังเลื่อน ไม่งั้นถูกชดเชยซ้ำ
- **คงตำแหน่งที่อ่าน (16 ต.ค. 2026):** นอกงานกระโดด `pinPick()` จดองค์ประกอบที่เส้นอ่าน (`pinAt` · จุดเดียวกับ `railKeep`) + ตำแหน่งในเอกสาร · `pinKeep()` — ResizeObserver บน `#view` + `body` (ก่อนวาดจอ) และทุกเฟรมที่เลื่อน — องค์ประกอบนั้นขยับในเอกสารเท่าไร เลื่อนหน้าตามเท่านั้น (ลบส่วนที่แถบบนสูงขึ้น เช่นแถบชิปโผล่เมื่อจอแคบลง) · `navBegin`/`navStop` ล้างจุด · `navEnd` จดใหม่ · ปุ่ม ↑ เป็นงานกระโดด (scrollBy ระหว่างเลื่อนนุ่มตัดการเลื่อน) · หน้าวิชาปิด scroll anchoring ของเบราว์เซอร์ `html.pin-read { overflow-anchor: none }` (CSS «v6 (S9)» · toggle ใน hook `go`) — Chromium ไม่ปรับตำแหน่งเมื่อเนื้อหาที่เติมด้านบนมี `<details>` ปิดอยู่ใน `.std2` (container inline-size · เนื้อหาของ details ที่ปิด = content-visibility: hidden) และงดปรับตอนเปลี่ยนขนาดจอ (`.app` สูงตาม vh · จุดเปลี่ยนของ `.sgrid`) · เปิดคู่กันจะชดเชยซ้ำ เพราะตำแหน่งในเอกสารแยกไม่ออกว่าใครเลื่อน · ตรวจ `python tests/pin.browser.py`
- `navOffset()` ความสูงแถบที่ติดบนจอ (คงที่ ใช้กระโดด) · `navLine()` เส้นที่มองเห็นจริงตอนแถบหลบ (ใช้เฉพาะตอนบันทึกตำแหน่ง — ห้ามใช้กระโดด ค่าแกว่งระหว่างแถบเลื่อน)
- `parseRoute(hash)` · `routeHash(st)` · `routeOnly(st)` · `topicsOf(sid)` = หัวข้อ + บล็อกสรุป · `curMode()` · `curSem()` · `practiceHref(sid, tid)` · `focusSearch()` · `openSheet()` · ลิงก์ `#<id>` ในหน้าเพิ่มประวัติให้ Back กลับมาได้

**เนื้อหาและแบบจำลอง**
- `dbGet(coll, name)` → Promise ของ JSON หรือ null (data/t แคช LRU ≤ `DB_KEEP` = 40) · `dbVer` / `dbUrl` (?v= ของ data/t, data/ix = `manifest.subjects.<sid>.v`) · `manifestGet()` · `subjAssets(sid)` → Promise<true|false>
- `buildDemo(host, spec)` สำหรับแบบจำลองใหม่ทุกตัว · `demoWatch(el, {suspend(), resume(), tick?()})` · `demoMount(root, sid)` ติดตั้งเมื่อห่างจอ ≤ 600 px · `demoInstall(host, sid)` ทันที ครั้งเดียว (ล้ม → `.demo-fail` + ลองใหม่) · `DEMO_DONE` · `fillAllBodies()`

**ค้นหา (S4)** `ixUrl(sid)` · `loadIndex(first)` · `ixPrime(sids)` · `ixRetry()` · `IXST[sid]` wait/load/ok/fail · `IX_READY` · `ixMissing()` · `searchQueries(q)` · `textMatch` · `markHits(root, q)` · `searchRefresh()`

**ฝึกทบทวน (S5)** `window.SAY = {ok, speak(text, rate, onEnd), stop(), voice(), hint()}` (เสียงในเครื่องเท่านั้น) · `sayButton(getText, label)` · `qaText` / `qaRuText` = `text()` / `ru_text()` ใน `qa.py` · `qaIndex()` → `QAIX` ·
ชุดซ้อมปากเปล่าที่ทำค้าง (`S5RUN`) ทำต่อ/สรุปชุดเดิมเฉพาะเมื่อกลับมาด้วย Back (`GO_POP` · 30 นาที) — กดเริ่มซ้อมจากลิงก์ใด ๆ ได้ชุดใหม่เสมอ · Flashcard `#/flash[/<กลุ่ม|วิชา>]/due` = เฉพาะคำที่ครบกำหนดทวน

**ทวนตามกำหนด/วันสอบ (S6)**
- `window.SRS = { grade(key, g 0–5, now?), due(prefix, now?) → [{key, …rec}], get(key), all(), reload() }` · ยิง `srs:grade` · เรียกแบบ `window.SRS && SRS.grade(key, g)` · ปากเปล่า 1/3/5 · ศัพท์ 1/5 · ติ๊ก ✓ (หัวหัวข้อ สารบัญ คลังศัพท์ ท้ายหัวข้อ) = 4 · quiz2 ให้คะแนนครั้งเดียวตอน «เพิ่งตอบครบ» ตาม % ·
  **วันหนึ่งนับ «จำได้» (g ≥ 3) ต่อคีย์ได้ครั้งเดียว** (นับใหม่ได้หลังลืมในวันเดียวกัน · ตัวห่อใน S6 — `srsCore` ไม่มีกติกานี้) · ลืม (g < 3) นับเสมอ
- `window.examPlan(sid, now?)` → null | `{sid, date, kind, days, past}` | `+ {final, topics, oral, terms}` แต่ละหมวด `{pending, quota, today}` · จำนวนปากเปล่าทั้งหมดจาก `QAIX` (ชุดเดียวกับ `#/oral`) และจดไว้ใน `atlas-exam-v1[sid].qa` ให้หน้าอื่นใช้เลขเดียวกัน ·
  แถว `subject-head` บนจอแคบ (≤ 600 px หรือมือถือแนวนอน): ปุ่ม «ตั้งวันสอบ» / ป้าย «อีก N วัน» · ช่องวันสอบ + แผนพับใน ▾ (เลือกวันแล้วยังเปิดค้าง)

**ออฟไลน์ (S3)** `offlineSave(sid, say)` / `offlineUpdate` → `{ok, fails, n, bytes}` · `offlineList()` · `offlineRemove(sid)` · ตัดสินว่าไฟล์ «ยังใช้อยู่» โดยเทียบที่อยู่ **ไม่รวม `?v=`** (`offlinePath`) เพราะตัวลบลบทุกรุ่น · หัวข้อเก็บด้วย `dbUrl` และดัชนีหลังโหลด manifest (?v= เดียวกับที่หน้าขอ) ·
  บันทึกที่ไม่มีสำเนาจริงใน Cache API ถูกลบเองตอนเปิดหน้าวิชา · sw.js เก็บเป็นหน้าเว็บเฉพาะ `./` และ `index.html`

**build (S1)** `src/build_steps/<ชื่อ>.py` มี `run(ctx)` (`ctx = {root, data, topics, manifest}`) — `build_data.py` รันทุกไฟล์เรียงชื่อ · เขียนเฉพาะ `data/<ชื่อ>/` หรือ `data/<ชื่อ>.json` · ห้ามแตะ `data/manifest.json` `data/ix/` · คู่มือ `src/build_steps/README.md`

### localStorage — ทุกคีย์

ข้อบังคับ: คีย์ใหม่ `atlas-<ชื่อ>-v<N>` · ลงทะเบียน `learnerKey()` · เขียนผ่าน `store()` · สร้างใหม่ได้ = `temp: true` · ไฟล์สำรองเก็บทุกคีย์ `atlas-*` ยกเว้น `DEVICE_KEYS`

| คีย์ | เจ้าของ | รูปแบบ | temp |
|---|---|---|---|
| `atlas-sula-v1` | `DONE` | set: `k:<หัวข้อ>` · `k:<วิชา>:<ลำดับ>` (วิชาโครงร่าง) · `termKey()` (ศัพท์ «จำได้») | |
| `atlas-bm-v1` | `BM` | set ของ `termKey()` ที่บุ๊กมาร์ก | |
| `atlas-last-v1` | router `LAST` | `{v: "subject", id, mode, topic, off, anc?, aoff?}` «อ่านต่อ» (เฉพาะวิชาที่มี DEEP) | ✓ |
| `atlas-mode-v1` · `atlas-sem-v1` · `atlas-mysem-v1` | `MODE` · `SEMOVR` · `MYSEM` | `sum`/`full` · `{<วิชา>: [ภาค…]}` (ผู้ดูแล) · `1`–`9` ภาคของผู้อ่าน | |
| `atlas-rail-v1` | `RAILOPEN` | set ของกลุ่มภาคที่กางในเมนูซ้าย | ✓ |
| `atlas-admin-v1` | `ADMIN` | `1`/`0` โหมดผู้ดูแล — ของเครื่อง (`DEVICE_KEYS`) | – |
| `atlas-quiz-v1` | v4 `QUIZ` | `{<หัวข้อ>: {<ลำดับ quiz2>: {done, ok, n, t}}}` (ยังเขียนคู่กับ S5) | |
| `atlas-offline-v1` | S3 | `{<วิชา>: {t, n, bytes, v, urls}}` — ของเครื่อง (`DEVICE_KEYS`) | |
| `atlas-ui-v1` · `atlas-search-v1` | S2 · S4 | `{subjF, railMini?, focus?}` · `{q, from, scope, kind, shown}` | ✓ |
| `atlas-oral-v1` | S5 | `{"<วิชา>/<หัวข้อ>/<qaId>": {r: 1/3/5, t, n}}` | |
| `atlas-practice-v1` | S5 | `{<หัวข้อ>: {<id host>: {done, ok, n, t}}, _terms: {<termKey>: {r, t, n}}, _opt: {timer, dir}}` | |
| `atlas-srs-v1` · `atlas-exam-v1` · `atlas-seen-v1` | S6 | `{<คีย์ SRS>: {due, ivl, ef, reps, lapses, last}}` · `{<วิชา>: {date, kind, qa?}}` (qa = จำนวนปากเปล่าทั้งหมด) · `{<หัวข้อ>: {read, t}}` | |
| `atlas-recent-v1` · `atlas-pins-v1` · `atlas-notes-v1` | S7 | `[{sid, tid, t}]` ≤ 12 · `[{sid, tid, t}]` · `{<หัวข้อ>: {sid, text, t}}` | |
| `atlas-meta-v1` | S8 | `{schema, created, lastActive}` (`SCHEMA = 3`) | |
| `atlas-backup-prev` | S8 | `{saved, why, data}` ชุดก่อนนำเข้า — ของเครื่อง · «ล้างข้อมูลชั่วคราว» ถามแยก | (ถาม) |

Cache API ของ service worker: `CACHE = "atlas-v1"` ใน `sw.js` — **ไม่ต้องเปลี่ยนตอนออกรุ่น** (ไฟล์รุ่นเก่าที่ต่างกันแค่ `?v=` ถูกลบเองเมื่อได้ตัวใหม่) · เปลี่ยนชื่อ = ล้างสำเนาของทุกคน ต้องล้าง/ตรวจ `atlas-offline-v1` ให้ตรงกันด้วย

### หน้าและที่อยู่ทั้งหมด

| ที่อยู่ | หน้า | ทำที่ |
|---|---|---|
| `#/` | หน้าหลัก: เรียนต่อ/เลือกวิชา · `overview-top` · วิชาของฉัน · วิชาเนื้อหาเต็มที่เหลือ | `renderOverview` (S2) |
| `#/subjects` · `#/progress` | แค็ตตาล็อก 54 วิชา + ตัวกรอง + ภาคของผู้อ่าน · ความคืบหน้าสามอย่าง + การ์ด `progress` + สำรอง/นำเข้า | S2 |
| `#/<วิชา>[/sum\|/full]` · `#/<วิชา>/<หัวข้อ>[/<id>]` · `#s=<วิชา>` | หน้าวิชา · เลื่อนไปหัวข้อ/องค์ประกอบ (สลับโหมดให้เอง) · รูปแบบเก่า (verify ใช้) | `renderSubject` · router |
| `#/glossary[/<คำกรอง>]` · `#/search/<คำ>[/<วิชา>]` | คลังศัพท์ · ผลค้นหา | S4 |
| `#/practice[/<วิชา>[/<หัวข้อ>]]` · `#/oral[/<วิชา>[/<หัวข้อ>]][/n<k>][/weak]` | ศูนย์ฝึกทบทวน · ซ้อมปากเปล่า (ไม่มีวิชา = หน้าเลือกวิชา) | S5 |
| `#/flash[/<กลุ่ม\|วิชา>][/weak\|/due]` · `#/quiz[/<กลุ่ม\|วิชา>][/n<k>][/weak]` | Flashcard · ควิซศัพท์ | S5 |
| `#/cram/<วิชา>` | คืนก่อนสอบ (เฉพาะวิชาเนื้อหาเต็ม) | S6 |
| `#/sem` · `#<id>` | ปรับภาคเรียน (ผู้ดูแล) · ลิงก์ในหน้า (`inPageAnchor`) | router |

### ไฟล์ที่สร้างอัตโนมัติ — ห้ามแก้มือ

| ไฟล์ | ผู้สร้าง | รูปแบบ |
|---|---|---|
| `data/ix/<วิชา>.json` · `data/manifest.json` · `?v=` ใน index.html + `DATA_VERSION` | `src/build_data.py` | ดัชนีค้นหา · `{subjects: {<วิชา>: {n, v, js?, css?}}}` · sha1[:10] ของ app.js+app.css+manifest (CRLF → LF) |
| `data/qa/<วิชา>.json` · `data/qa/_index.json` | `src/build_steps/qa.py` | `[{tid, id, q, n?, qh?, a_html, hasRu}]` · `{<วิชา>: {n, t, z, fix}}` · 2 666 ข้อตอนปิดรุ่น v6 (ปัจจุบันดู `_index.json`) |
| `data/rel.json` · `data/figdim.json` | `rel.py` · `figdim.py` | หัวข้อเกี่ยวข้อง 231 หัวข้อ · ขนาดรูป 1 158 ใบ |
| `src/counts-baseline.json` · `src/blocks.json` | `python src/counts.py --update` · `python src/blocks.py --update <บล็อก>` | หัวข้อ 4 |
| `data/vh/*.json` · `data/ih/*.json` | สคริปต์ใน `_work/` / ต้นทาง История (หัวข้อ 8, 10) | — |

ไม่บังคับ (ยังไม่มี): `data/feedback.json` = `{"url": "https://…"}` → ปุ่ม ⚑ แจ้งจุดผิดเปิดลิงก์นั้นด้วย (S7)

### ชุดตรวจ

- `node --test tests/*.test.cjs` — 11 ไฟล์ 100 เทสต์ ไม่ต้องมีเบราว์เซอร์ (ข้อสุดท้ายของ `srs` เปิด Chromium ผ่าน Playwright ของ Python ถ้ามี · ข้าม 1: เทียบ ZIP ต้นฉบับ `node tests/audit-integrity.test.cjs --baseline-zip <zip>`) — `audit-integrity` `blocks` `content-rules` `hooks` `learner-data` `links` `practice` `search` `srs` `step-response` `ui-learning`
- `tests/pin.browser.py` — Playwright ของ Python รันมือ: ลิงก์ตรงแล้วเปลี่ยนขนาดจอ · เติมหัวข้อด้านบน · ล้อเมาส์ขึ้น/ลง · ปุ่ม ↑ · `[` `]` คงตำแหน่ง (16 ต.ค. 2026 · เครื่องเจ้าของงานไม่มี playwright ของ Node)
- `tests/*.browser.cjs` — Playwright ของ Node รันมือ (ไม่อยู่ใน `--test` และ CI) · ในคลาวด์ `NODE_PATH=$(npm root -g) node tests/<ชื่อ>.browser.cjs` · `shell` (S2) · `rail` (เมนูย่อ/โหมดอ่าน) · `search` (S4) · `practice` (S5) · `perf` (S3) ·
  `navstate` (router · `--rounds --mobile --cpu`) · **`paths` (S9 · เส้นทางหลัก 7 เส้นที่จอ 390 และ 1280 px: ผู้อ่านใหม่ · เรียนต่อ→ฝึก→ผล→กลับ · ค้นหา→Back · ปากเปล่า→reload · ออฟไลน์ · นำเข้าไฟล์เสีย · Flashcard ด้วยแป้นพิมพ์ · `[1-7] [--width]`)** ·
  **`s9` (รอยต่อที่ S9 แก้: คืนตำแหน่งหลังรีเฟรช · Back หลัง «เปิดฉบับเต็ม» · ชุดปากเปล่าต่อ/ใหม่ · ติ๊กซ้ำวันเดียว · quiz2 ครั้งเดียว · ปุ่มตั้งวันสอบ · Back กลับ #/cram · ลิงก์ #<id>)** — แก้ส่วนกลางแล้วรันทุกตัว
- `python src/verify.py` (หัวข้อ 4) · **CI** `.github/workflows/check.yml`: push/PR/กลางคืน/กดเอง — `tests` (`node --test` + `python src/counts.py`) + `verify` รายวิชา `--no-throttle --timeout 240` (+ `--mobile` กลางคืน)

### งานยกระดับวิชา — ต้องทำอะไรกับ v6 (เพิ่มจากหัวข้อ 3, 9, 13)

1. **DEEP**: `chk: false` ตั้งแต่แรก → `chk: true` + `rev: "YYYY-MM-DD"` หลังผ่าน tech + lang · `src` ต้นทางสั้น · `lec: N`/`[N, M]` เมื่อชื่อหัวข้อไม่ขึ้นต้น «Лекция N»/«Тема N» · `rel: [...]` ทับหัวข้อเกี่ยวข้อง
2. **คำถามปากเปล่า** `details.qa` > `summary` (STD2 `.qa-q`) + `.ans` (`.ans-ru` ได้ 🔊) · ไม่ต้องใส่ id · **แก้ข้อความคำถาม = id ใหม่** ผลซ้อม/SRS ข้อนั้นหาย (อยากคงที่ใส่ `id` เอง)
3. **quiz2** ได้ id `<tid>-q<n>` ตามลำดับ — แทรกบล็อกก่อนบล็อกเดิม = ผลของบล็อกถัดไปเลื่อน (ต้องคงผล: ใส่ `id` = `<tid>-q<n>` เดิมให้ทุกบล็อกของหัวข้อก่อนแทรก/ลบ/ย้าย — ใส่แค่ `data-id` ไม่พอ เพราะ atlas-practice-v1 ใช้ `id` · ตรึงบางบล็อกทำให้ id ซ้ำ · การ์ดควิซในแถบข้าง `atlas-quiz-v1` ผูกกับลำดับเสมอ · หัวข้อ 16)
4. id ขององค์ประกอบไม่ซ้ำทั้งวิชา ขึ้นต้นด้วยรหัสหัวข้อ · ลิงก์ `#/<วิชา>/<หัวข้อ>[/<id>]`
5. **แบบจำลอง** ใน `js/subj/<วิชา>.js|.css` (`buildDemo`/`demoWatch` · หยุดลูปเมื่อ `document.hidden` · ไม่แตะ `document` ระดับบนสุด) แล้วลบบล็อกเดิมจาก app.js (+ `src/blocks.json`)
6. **ไฟล์ข้อมูลใหม่**: อยู่ในเว็บเดียวกัน · คืน URL ใน `HOOKS.on("offline", …)` (ไม่แก้ `saveOffline`) · สร้างจากเนื้อหา → `src/build_steps/<ชื่อ>.py`
7. **คลังศัพท์**: กลุ่มใน `MODULES` id = รหัสวิชา (ไม่ตรง → `MODMAP`) · ห้ามแก้ `ru` ของคำเดิม (ต้องแก้ = ขั้นย้ายใน `learnerStart()` + `SCHEMA` + 1)
8. ชนิดกล่องสรุปใหม่ของ STD2 → เพิ่มใน `CR_SEL` (`#/cram`) · แก้หัวข้อที่อยู่ใน `tests/content-allow.json` จนผ่าน → ลบออก + ลด `CAP`
9. `python src/build_data.py` → `python src/counts.py --update` (อ่าน diff) → `node --test tests/*.test.cjs` → `python src/verify.py --subject <วิชา> --mobile` → `node tests/practice.browser.cjs` + `paths` ถ้าแตะคำถาม/การนำทาง

### งานค้างหลังปิดรุ่น v6

- **`_work/layout/layout.js` (บนเครื่องเจ้าของงาน)** ยังเป็นแบบเดิม **สองบรรทัด**: `saveQuiz` และ `localStorage.setItem("atlas-mode-v1", MODE)` ในปุ่ม «เปิดฉบับเต็ม» ของ `margWeak` — แก้ให้ตรง app.js ตามคำเตือนในหัวข้อ 11 ก่อนรัน `patch_layout.py` · ครั้งเดียวกันย้ายตัวทับท้าย router (`margWeak` `quizOfSubject` `jumpTopic` …) เข้า layout.js
- **`tests/content-allow.json`**: ไม่มีบรรทัดอ้างอิง 37 หัวข้อ · ไทยติดซีริลลิก 7 หัวข้อ + 6 สตริงในเดโม · พูดกับเจ้าของงาน 9 หัวข้อ — แก้ตอนยกระดับวิชานั้น
- (สถานะตอนปิดรุ่น v6 · 7 ต.ค.) `js/subj/` ยังไม่มีวิชาไหนใช้ และฟิลด์ DEEP `rev` `chk` `src` `lec` `rel` ยังไม่มีวิชาไหนใส่ — **ตั้งแต่หัวข้อ 15 ใช้แล้ว:** `js/subj/` 9 วิชา และ `chk: true` + `rev` 39 หัวข้อ (20 ต.ค. 2026) · `data/feedback.json` ยังไม่มี
- ลูปของ VHMAP / STD2 ยังไม่ผ่าน `demoWatch` · axe-core: heading-order ในเนื้อหาบางวิชา · `tests/hooks.test.cjs` ยังไม่ตรวจจุดเกี่ยว `HOOKS.render("progress")` · ปุ่มออกจากโหมดอ่านบนจอคอมบางความกว้าง (901–1399 px) ยังอยู่ในขอบซ้ายติดคอลัมน์ข้อความ (มือถือย้ายไปกองขวาแล้ว)

### รายละเอียดราย session (บันทึกตอนพัฒนา)

ข้างล่างคือบันทึกที่แต่ละ session เขียนตอนทำงาน (คงไว้ตามเดิม · จุดที่ S9 เปลี่ยนภายหลังมีหมายเหตุ «S9:») — ข้อตกลงร่วมตอนทำคู่ขนาน (เจ้าของไฟล์ · ลำดับ merge) ใช้จบแล้ว ดูประวัติได้ใน git และ `claude/คำสั่ง-session-S1–S8.md`

#### 14.1 S1 — ด่านอัตโนมัติ
- ของใหม่: `src/counts.py` → `src/counts-baseline.json` (ใช้ทั้ง tests/verify · ลบ `verify-baseline.json`) · `src/registry.cjs` (อ่าน DEEP/DEMOS จาก app.js ใน vm — tests และ counts ใช้ร่วม) · `tests/content-rules.test.cjs` + `tests/content-allow.json` (ratchet) · `src/blocks.py` + `src/blocks.json` + `tests/blocks.test.cjs` · `src/ci_subjects.py` + `.github/workflows/check.yml`
- `build_data.py` เขียนเลขเวอร์ชันเอง (index.html `?v=` + `DATA_VERSION`) และ `manifest.subjects.<วิชา>.v` — **สคริปต์ใน `_work/` ที่เคยตั้ง VER/`?v=` เอง (เช่น `integrate_hist.py`) ยังรันได้ แต่ build_data เขียนทับทุกครั้ง** · hash แปลง CRLF → LF ก่อน (เครื่อง Windows ได้ค่าเดียวกับ CI)
- app.js: `dbVer(coll, name)` / `dbUrl(coll, name)` คืน Promise ของ ?v= / URL ที่ถูกต้องของไฟล์ใน data/ (S3: `saveOffline` ควรดึง data/t ผ่าน `dbUrl` ให้ URL ตรงกับที่ dbGet ใช้) · `DBCACHE` เป็น LRU เก็บ ≤ 40 หัวข้อ (`DB_KEEP`)
- ทุก session: เพิ่ม/ลดเนื้อหาโดยตั้งใจ → `python src/counts.py --update` · แก้ข้อความในหัวข้อเดิมที่อยู่ใน `content-allow.json` จนผ่าน → ลบออกจากรายการและลด `CAP` ใน `tests/content-rules.test.cjs` (ไม่งั้นเทสต์ตกว่า «รายการยกเว้นค้าง»)
- ข้อความตรวจ «ถึงเจ้าของงาน» ใน app.js ตรวจเฉพาะสตริง (ไม่ใช่คอมเมนต์) — ป้ายบนจอห้ามมี «บอกผม» «ให้ผม» «ส่งกลับมาให้» «ตามที่สั่งไว้» «เจ้าของงาน/โปรเจกต์» «Russian lesson» «_work/» «ในโฟลเดอร์…» ชื่อไฟล์ .pptx/.docx/.pdf (ลิงก์ภายนอกได้)
- ค้าง: 9 หัวข้อยังอ้างชื่อไฟล์ต้นฉบับ/เจ้าของโปรเจกต์ (elob-lr1/lr4/pz1–3/rgr · asu-13 · nas-sem · ppo-14) · ไทยติดซีริลลิก 7 หัวข้อ (suka, teh_el) + 6 สตริงในเดโม app.js · 37 หัวข้อไม่มีบรรทัดอ้างอิง (suka, surn, tau T.1–5, toe) — แก้ตอนยกระดับวิชานั้น

#### 14.2 S2 — เปลือกนำทาง
- เมนูหลัก 5 พื้นที่ชื่อเดียวกันใน `#bbar` (index.html) และบนสุดของแถบซ้าย (`buildNav`): หน้าหลัก `#/` · รายวิชา `#/subjects` · ฝึกทบทวน (`practiceHref(sid, tid)` = `#/practice[/<sid>[/<tid>]]` เมื่อมี `PAGE_DEFS.practice` ไม่งั้น `#/flash` · ชี้ใหม่ทุกครั้งใน hook `go`) · ค้นหา (`focusSearch()`) · ความก้าวหน้า `#/progress` · ในหน้าวิชาที่มีเนื้อหาเต็ม «หน้าหลัก» ใน `#bbar` สลับเป็นปุ่ม «สารบัญ» · ปุ่มที่พาไปหน้าอื่นเป็น `<a href>` ทั้งหมด รวมการ์ดวิชา `a.subj[data-go]` (verify.py หาด้วยตัวเลือกนี้ — อย่าเปลี่ยน)
- หน้าหลัก (`renderOverview`): การกระทำหลัก `.s2-cta` (เรียนต่อ / เลือกวิชา) + บรรทัด «ภาค N · เปลี่ยน» → `overview-top` → «วิชาของฉัน» (วิชาเนื้อหาเต็มของ `curSem()` + ความคืบหน้าสามอย่าง) → วิชาเนื้อหาเต็มที่เหลือ → ลิงก์ไปต่อ → `overview-end` · แค็ตตาล็อก 54 วิชา ตัวกรองภาค/สถานะ/เนื้อหาเต็ม และตัวเลือกภาคของผู้อ่านอยู่ที่ `#/subjects` · ปุ่มสำรอง/นำเข้าอยู่ท้าย `#/progress` (หลังการ์ดจาก `HOOKS.html("progress")`)
- ความคืบหน้าแยกสามอย่าง ไม่รวมเป็นตัวเลขเดียว: `subjTrip(s)` = `{read, total, quiz, terms}` · ผลควิซต่อหัวข้อ `topicQuiz(tid, practiceStore())` ใช้ `atlas-practice-v1` (S5) ถ้ามี ไม่งั้น `QUIZ` — **ห้ามบวกสองที่** (บันทึกเหตุการณ์ `std2:quiz` เดียวกัน)
- มือถือ/จอ < 1400: สารบัญแบบแผ่น `dialog.tsheet` (`openSheet()`) เปิดจาก ☰ `.tn-toc` ในแถบชิปและ `#bbar [data-bb=toc]` · ชิปหัวข้อรู้ตำแหน่งด้วย IO ของ S2 (`S2NAV`) + `.tn-pos` «10/32» · แถบหลบ `html.reading` (≤ 900 px) — `navTopic`/`scrollToTarget` ถูกห่อในช่อง S2 ให้ปลดก่อนกระโดด โค้ดอื่นที่เลื่อนหน้าเองเรียก `unread(true)` ก่อน
- ท้ายหัวข้อ `nav.tend` ต่อท้าย `.tbody` (hook `fill`): ✓ `[data-s2key]` ซิงก์กับ `.topic-check` · ผลควิซ · «ฝึกเรื่องนี้» (เมื่อมี #/practice) · ก่อนหน้า/ถัดไปเป็นลิงก์ `#/<sid>/<tid>` · ชุดอ่านง่าย: `.tw.scrolls` (เงาขอบ) + `p.tw-hint` · `.tbody.s2-legacy` = วิชาที่ไม่ใช่ STD2 ตัวอักษร 16/1.7 · sub/sup ≥ 11.5 px · ปุ่มสำคัญ ≥ 40 px ที่ ≤ 600 px · หัวหน้าวิชาบนมือถือ ≤ 200 px (ซ่อน eyebrow, แถบ %, ชื่อซ้ำใน crumb · คำนำ 2 บรรทัด)
- คีย์ใหม่ `atlas-ui-v1` = `{ subjF: {sem, status, deep}, railMini?, focus? }` (ตัวกรองหน้ารายวิชา · เมนูซ้ายแบบย่อ · โหมดอ่าน) · ตรวจรับ `node tests/shell.browser.cjs` (ต้องมี playwright ของ Node · จอ 390 px + 1500 px)
- **เมนูซ้ายแบบย่อ + โหมดอ่าน (4 ต.ค. 2026 · ท้ายช่อง S2 ทั้ง app.js/app.css · แถบไอคอนเฉพาะจอ > 900 px)** — `html.rail-mini` = แถบไอคอน 60 px (`.rmini`: ☰ ขยาย · 5 เมนูหลักใช้ไอคอนจาก `#bbar` · «วิชานี้» · โหมดอ่าน) ค่าเดียวใช้ทุกหน้า และ**ย่อเองทุกครั้งที่เปิดวิชาที่มี DEEP** (เปลี่ยนวิชา/เข้าจากหน้าอื่น — ทำใน `go` ที่ห่อไว้ ก่อนวาดหน้า) · ปุ่ม `.rail-acts` (โหมดอ่าน · ย่อ) มุมขวาบนของเมนูเต็ม
  · `html.read-mode` = โหมดอ่าน (เฉพาะหน้าวิชา · ทุกขนาดจอ): ไม่มีเมนูซ้ายและ `.topbar` — จอ ≤ 900 px ซ่อนแถบชื่อเว็บ `#bbar` และแถบชิปด้วย เปิดจากปุ่ม `#bbar [data-bb=read]` (ช่องที่ 6 เฉพาะหน้าวิชา · `#bbar.bb6`) · ออกด้วย `#readExit` มุมซ้ายล่าง (S9: จอ ≤ 900 px กองขวาเหนือปุ่ม ↑) (ป้ายกาง 2.5 วินาทีตอนเข้าโหมด) / Esc / ] / ไปหน้าที่ไม่ใช่หน้าวิชา · `focusSearch` ถูกห่อให้ออกจากโหมดก่อน และกด / ก็ออก · ปุ่มลัด `[` ย่อ/ขยาย `]` โหมดอ่าน (ใช้ `e.code` ทำงานบนแป้นไทย)
  · สลับแล้วคงตำแหน่งที่อ่าน (`railKeep`: ระยะของข้อความบนสุดจาก `navOffset()` เท่าเดิม แล้ววัด `.m-wide`/ตาราง `.scrolls` ใหม่ เพราะ resize ไม่ยิง) · จุดเปลี่ยนสารบัญ/แถบข้างของบล็อก v4 เลื่อนลงใน CSS ช่อง S2: แถบไอคอน 1214/1374/1574 · โหมดอ่าน 1154/1314/1514 (= เดิม − 186 / − 246) — **แก้จุดเปลี่ยนหรือความกว้างคอลัมน์ใน `_work/layout/layout.css` ต้องแก้ชุดนี้ตาม** · ตรวจรับ `node tests/rail.browser.cjs`

#### 14.3 S3 — ประสิทธิภาพ/ออฟไลน์
- **วัดด้วย `node tests/perf.browser.cjs [idle full longtask scroll cls offline manage] [--subject] [--cpu] [--root <worktree รุ่นเก่า>]`** (รันมือ · elob 390 px dpr 2 CPU ×4): canvas ที่มีขนาดบนสุดหน้า 9 → 0 · หลัง fillAllBodies 86 canvas 120 MB → 0 · rAF ขณะนิ่ง 597 → 0 /วินาที (CPU ×1) · long task สูงสุดตอนกระโดดไป elob-lr4 1 769 → 383–474 ms (ไม่นับการรัน app.js ~850 ms) · ปัดเลื่อน 90 000 px 590 → 320 ms · layout shift ตอนรูปโหลด 1 → 0 · ปิดเซิร์ฟเวอร์แล้ว elob ที่เก็บไว้เปิดได้ 32/32 หัวข้อ 86/86 แบบจำลอง 241/241 รูป
- **แบบจำลอง (buildDemo · `demoWatch(el, rec)`):** ห่างจอ > 1 500 px → `rec.suspend()` (หยุดลูป, canvas 0×0, `rec.suspended = true` — `draw()` ไม่ทำงาน) · กลับมา → `rec.resume()` วาดใหม่จาก state เดิม · ลูปวิ่งเฉพาะ `animate` ที่เห็นบนจอและแท็บไม่ถูกซ่อน · บล็อกที่มีลูปของตัวเอง (VHMAP/STD2 ยังไม่ได้ย้าย) เข้าระบบได้ด้วย `demoWatch(host, {suspend(), resume(), tick?()})`
- **ติดตั้ง `[data-demo]` เมื่อห่างจอ ≤ 600 px** (`demoMount` ใน fillBody · `demoInstall(host, sid)` = ทันที) · ทันทีเสมอ: ใน `<details>` ที่ปิด · หลัง `fillAllBodies()` · ติดตั้งไม่ได้ → กล่อง `.demo-fail` (พี่น้องถัดจาก host ไม่มี canvas) + ลองใหม่ (`subjAssets` โหลดเฉพาะไฟล์ที่ล้มเหลวใหม่ คืน true/false)
- **เติมหัวข้อทีละหัวข้อ** (`fillTurn`) · **หัวข้อยาวใส่ทีละ ~16 KB** (`fillChunks` — แยกด้วย `<template>` ย้ายลูกของ wrapper ทีละช่วง ตรวจ `.m-wide` ของช่วงนั้น แล้ววาดจอก่อนช่วงถัดไป · `.tload` อยู่ท้ายกล่องจนครบ bodyReady/verify จึงรอครบ) · **โหลดฟอนต์ล่วงหน้าเมื่อเปิดวิชา** (`fontWarm`/`fontWarmMath`) — ไฟล์ฟอนต์ชุดอักษรใหม่ที่มาถึงทีหลังทำให้จัดวางทั้งหน้าใหม่ 850–970 ms · **ห้ามใช้ `content-visibility: auto` กับการ์ดในหัวข้อ** — ลองแล้ว ใส่ html เร็วขึ้นแต่จัดวางซ้ำทุกครั้งที่เลื่อนผ่าน (verify CPU ×6 รอบเลื่อนเดียว style/layout elob 11 → 117 s · nav 2.4 → 53 s) และ verify แบบถ่วงของ elob ตก
- **รูป:** `src/build_steps/figdim.py` → `data/figdim.json` · SUKAFIG ใส่ width/height ก่อน src — เพิ่มรูปใหม่แล้วรัน `python src/build_data.py`
- **ออฟไลน์:** `atlas-offline-v1[sid] = {t, n, bytes, v, urls}` · `offlineList()` `offlineRemove(sid)` `offlineUpdate(sid)` `offlineSave(sid, say)` · การ์ดผ่าน `HOOKS.html("progress")` (`#s3Offl`) · sw.js: `cache: "reload"` = เน็ตก่อน · CACHE ยัง `atlas-v1`
- **เดโมใหม่ใน `js/subj/`:** ใช้ `buildDemo` (ได้ยุบ/หยุดลูปฟรี) · ลูปของตัวเองต้องผ่าน `demoWatch` และหยุดเมื่อ `document.hidden` · ห้ามวาด/วัดขนาดตอนโหลดไฟล์ — ทำในฟังก์ชัน `DEMOS[key](host)` ซึ่งถูกเรียกตอนใกล้จอ · อย่าพึ่งว่า host อื่นในหัวข้อติดตั้งแล้ว (เรียก `demoInstall` ถ้าจำเป็น) · error ตอนติดตั้งจะขึ้นกล่องลองใหม่ + console.error

#### 14.4 S4 — ค้นหา
- ดัชนี `data/ix` โหลดเป็นขั้น (แทนที่ §2/§13 ที่ว่าโหลดเมื่อโฟกัส): โฟกัสช่องค้นหา = เฉพาะวิชาที่เปิดอยู่ (`ixPrime`) · พิมพ์ตัวแรก/เปิด `#/search/…` = วิชานั้นก่อน แล้วที่เหลือทีละวิชา (`loadIndex(first)`) · สถานะ `IXST[sid]` = wait/load/ok/fail · `IX_READY` จริงเฉพาะเมื่อครบทุกวิชา · วิชาที่ล้มไม่ลองซ้ำเอง — `ixRetry()` โหลดเฉพาะที่ขาด (ปุ่มในหน้าผล + เมื่อเน็ตกลับมา) · ที่อยู่ไฟล์ `ixUrl(sid)` (`?v=` = `manifest.subjects.<sid>.v` แบบเดียวกับ `dbVer` ของ S1 ไม่มีก็ `DATA_VERSION` · hook `subject` โหลด manifest ไว้ก่อนให้ปุ่มออฟไลน์ได้ที่อยู่ตรงกัน)
- หน่วยความจำ: ไม่ผ่าน `dbGet` แล้ว (DBCACHE เก็บ JSON ดิบค้าง) · `IXHAY` เก็บข้อความ ё→е · รายการใน `INDEX`: `t` ชื่อ · `h` ชื่อ+คำอธิบาย · `b` = สตริงเดียวกับใน IXHAY (**ห้ามต่อสตริงใหม่**) · heap หลังโหลดครบ 46.0 → 25.8 MB
- หน้าผล `#/search/<คำ>[/<sid>]` (sid = ขอบเขต «วิชานี้» ตรวจกับ SUBJECTS ก่อน · `routeOnly` เก็บ `sid`) · ชิปขอบเขต ทุกวิชา/วิชานี้/คลังศัพท์ + ชนิด หัวข้อ/สรุป/ศัพท์/วิชา พร้อมจำนวน · แสดงเพิ่มทีละ 60 · ผลเป็น `<a class="res-item" href>` (คลิกธรรมดาส่ง `hl`) · `searchRefresh()` วาดเฉพาะส่วนผล — ดัชนีวิชาหนึ่งมาถึง → `ixChanged()` หน่วง 250 ms · สถานะ 4 แบบ (`.sx-st[data-st=load|part|fail]` + ไม่พบ `.sx-empty`)
- localStorage `atlas-search-v1` = `{q, from, scope, kind, shown}` คืนตัวกรองเมื่อกด Back (history.state ของรายการค้นหาถูก `writeScrollState` เขียนทับตอนออกจากหน้า จึงใช้แทนไม่ได้)
- คลังศัพท์กรองด้วย `searchQueries()` + `textMatch()` ชุดเดียวกับหน้าค้นหา (ชื่อพ้อง Kalman/Калман/คาลมาน · ё=е · ทุกคำในวลี) · placeholder/aria-label ของช่องเปลี่ยนตามหน้า (`searchPlaceholder` ผ่าน hook `go`) · hook `offline` คืน `ixUrl(sid)`
- ทดสอบ: `tests/search.test.cjs` (vm) · `node tests/search.browser.cjs` (Playwright ตรวจรับ ไม่อยู่ในชุด `--test`) · `verify.py` พิมพ์คำค้นก่อนแล้วรอ `IX_READY` (แก้แล้ว 29 ก.ย. 2026 — เดิมโฟกัสแล้วรอจนหมดเวลา นับผลจากดัชนี 138/288 แถว) · ดัชนีไม่ครบ = FAIL

#### 14.5 S5 — ฝึกทบทวน
- **`data/qa/<sid>.json`** (จาก `src/build_steps/qa.py` · 2 666 ข้อ 12 วิชาตอนเขียน · ปัจจุบันดู `_index.json`) = `[{tid, id, q, n?, qh?, a_html, hasRu}]` · `_index.json` = `{sid: {n, t:{tid:จำนวน}, z:{tid:จำนวน quiz2}, fix:{tid:{ลำดับ:id}}}}` · id = id เดิม หรือ `"qa-" + stable_id(ข้อความ .qa-q/<summary> ที่ขอบแท็กทุกอันเป็นช่องว่าง แปลง &…; แล้ว)` — ฝั่งหน้าเว็บคือ `qaText()` (เดินโหนด ไม่ใช่ textContent) · คำถามซ้ำข้ามหัวข้อต่อท้าย `-<tid>` (อยู่ใน `fix`) · `a_html` ไม่มี `[data-demo]`/figure/script (แทนด้วย `a.qa-see`)
- hook `fill`: ใส่ id ให้ `details.qa` (+ `data-qaid`) และ host quiz2 (`id` = `data-id` = `<tid>-q<n>`) · 🔊 ในคำตอบภาษารัสเซีย (`qaRuText()` = กติกาเดียวกับ `ru_text()` ใน qa.py) · แถบสี `details.qa[data-oral]` · session อื่น **อ่าน id จาก DOM/`data/qa`** ไม่ต้องคำนวณเอง
- **`window.SAY = { ok, speak(text, rate, onEnd) → false ถ้าไม่มีเสียง, stop(), voice(), hint() }`** ใช้เฉพาะเสียง ru ในเครื่อง (`localService`) · `sayButton(getText, label)` = ปุ่ม 🔊 ฟัง/ช้า พร้อมคำแนะนำติดตั้ง · หยุดเองใน hook go/clear
- หน้า: `#/practice[/sid[/tid]]` · `#/oral/sid[/tid][/n<k>][/weak]` · `#/flash[/<กลุ่ม|วิชา>][/weak]` · `#/quiz[/<กลุ่ม|วิชา>][/n<k>][/weak]` (flash/quiz ถอดจาก `PAGES` เป็น `registerPage` ในช่อง S5 — **S2: `PAGE_DEFS.practice` มีแล้ว**) · ปุ่ม `#quizBtn` = «ฝึกทบทวน» → `#/practice/<วิชาที่อ่านอยู่>`
- localStorage: `atlas-oral-v1` `{"sid/tid/id": {r:1|3|5, t, n}}` · `atlas-practice-v1` `{tid: {hostId: {done, ok, n, t}}, _terms: {termKey: {r:1|5, t, n}}, _opt: {timer, dir}}` (คีย์ขึ้นต้น `_` ไม่ใช่หัวข้อ) · เขียนผ่าน `store()` และลงทะเบียน `learnerKey()` ของ S8 · SRS: `q:sid/tid/id` (1/3/5) · ศัพท์ `termKey()` (1/5) · `SRS.due("q:<sid>/")` ใช้เลือกข้อถัดไปถ้ามี
- ตรวจ: `node --test tests/practice.test.cjs` · เบราว์เซอร์ `node tests/practice.browser.cjs` (Playwright ของ Node — ในคลาวด์ใช้ `NODE_PATH=$(npm root -g)`) · `tests/ui-learning` ทดสอบ renderQuiz ใน DOM จำลอง: ของจากช่อง S5 ในส่วน POOL…search box ต้องเรียกผ่าน `typeof` และคง `const POOL = () =>`

#### 14.6 S6 — SRS/วันสอบ/คืนก่อนสอบ
- โค้ดทั้งหมดอยู่ในช่อง SLOT S6 (app.js/app.css) · ส่วนคำนวณล้วนอยู่ระหว่าง `/* ---- S6 core BEGIN` … `END` (`srsCore` `srsPlanCat` `srsSidOf` `srsQuizGrade`) ซึ่ง `tests/srs.test.cjs` รันใน vm — ห้ามแตะ DOM ในส่วนนั้น
- **`atlas-srs-v1`** `{ <คีย์>: {due, ivl, ef, reps, lapses, last} }` · due/last = ms (due = เที่ยงคืนเวลาท้องถิ่นของวันครบกำหนด) · SM-2 ตัดทอน: ivl 1 → 3 → round(ivl×ef ก่อนปรับ) · ef เริ่ม 2.5 ต่ำสุด 1.3 · g < 3 = reps 0, lapses +1, ivl 1 · ivl ≤ 365 และ ≤ วันก่อนสอบของวิชา · **`atlas-exam-v1`** `{ <วิชา>: {date "YYYY-MM-DD", kind exam|zach|zacho, qa?} }` (qa = จำนวนคำถามปากเปล่าทั้งหมด · S9: จาก `QAIX[sid].n` ของ S5 จดตอนเปิดหน้าวิชา/#/cram — เดิมคือจำนวนที่ #/cram นับได้) · **`atlas-seen-v1`** `{ <หัวข้อ>: {read, t} }` (read = จำนวนครั้งที่หัวข้อค้างกลางจอ > 20 วินาที)
- **API:** `window.SRS.grade(key, 0–5, now?)` · `.due(prefix, now?)` (เรียงครบกำหนดก่อน แล้ว lapses มากก่อน) · `.get(key)` · `.all()` · `.reload()` · ทุกครั้งที่ให้คะแนนยิง `document` เหตุการณ์ `srs:grade` `{key, rec}` · `window.examPlan(sid, now?)` → `{days, final, topics|oral|terms: {pending, quota, today:[คีย์]}}` หรือ null ถ้าไม่ตั้งวันสอบ
- **session อื่นป้อนคะแนน:** `window.SRS && SRS.grade(key, g)` — Flashcard/ควิซศัพท์ใช้ `termKey()` · ปากเปล่า `q:<วิชา>/<หัวข้อ>/<id>` (id จาก DOM/`data/qa` — S9: `#/cram` เดิมคิดจาก innerHTML ทำให้บางข้อมีสองคีย์ ตอนนี้เรียก `qaIds()` ของ S5) · แนะนำ จำได้ = 4 ลังเล = 3 ไม่ได้ = 1 · ที่ S6 ป้อนเอง: ติ๊ก ✓ หัวข้อ/สารบัญ/คลังศัพท์ = 4 · quiz2 ตอบครบบล็อก → `z:<หัวข้อ>/<data-id หรือลำดับ quiz2>` ตาม % (100 = 5 · ≥ 80 = 4 · ≥ 60 = 3 · ≥ 40 = 2)
- ที่เสียบไว้: `overview-top` การ์ด «วันนี้ทวนอะไร» + ชิป «อีก N วัน» · `subject-head` (เฉพาะวิชาเนื้อหาเต็ม) «ครบกำหนดทวน n · ยังอ่อน m» (ขยายแล้วเรียก `margWeak()` เดิม) + ปุ่ม ☾ โหมดคืนก่อนสอบ + ช่องวันสอบ/แผนวันนี้ · `progress` ตารางกำหนดทวน · หน้า `#/cram/<วิชา>` (registerPage) · hooks `subject` `fill` `clear` `overview`
- `#/cram` คัด `header.sec-h .k-sum .k-trap details.qa` + `.call` ที่ป้ายมี «กับดัก/ออกสอบ» จาก `DEEP[sid].topics` (ไม่รวมบล็อกสรุป) · CSS แบบแน่นของกล่อง STD2 อยู่ใต้ `.cram` · vhist ทั้งวิชา ~55 000 px ที่ 1280 px · ถ้าเพิ่มชนิดกล่องสรุปใหม่ใน STD2 ให้เพิ่มใน `CR_SEL`
- `tests/srs.test.cjs` มีเทสต์เบราว์เซอร์ (Playwright ของ Python · ~15 วินาที · ข้ามเองถ้าไม่มี) — `page.clock` มีผลทั้ง context จึงเปิด context ใหม่ที่คัดลอก localStorage มาสำหรับ «+8 วัน»

#### 14.7 S7 — ลิงก์/ส่วนตัว/สถานะเนื้อหา
- **ลิงก์บรรยายอัตโนมัติ** (hook fill · เฉพาะบล็อกสรุปและ `*-map`): «บรรยายที่ N / Лекция N / Л.N» → หัวข้อจากชื่อ «Лекция N…» หรือ id `<prefix>-N` · «Т.N» → «Тема N…» หรือ `-tN` · วิชาที่เลขไม่ตรง id แก้ใน `S7_LECFIX` (asu, teh_el สองชุด, tau Т.6–Т.11; surn/toe ไม่ลิงก์) · **วิชาใหม่ที่ชื่อหัวข้อไม่ขึ้นต้น «Лекция N» ให้ใส่ `lec: N` หรือ `lec: [N, M]` ในหัวข้อของ DEEP** (ชนะทุกอย่าง) · ส่วนที่ไม่แตะ DOM อยู่ระหว่าง `/* ---- S7 PURE BEGIN/END ---- */` (tests/links.test.cjs รันใน vm) · ทั้งเว็บ 848 ลิงก์
- **`data/rel.json`** (`src/build_steps/rel.py` · TF-IDF คำซีริลลิก ≥ 5 ตัวจาก data/ix ไม่รวม `*-map`/`*-s1..4`): `{"v":1,"t":{"<หัวข้อ>":{"same":[["<หัวข้อ>",คะแนน]…3],"cross":[["<วิชา>","<หัวข้อ>",คะแนน]…5]}}}` หนึ่งหัวข้อต่อบรรทัด · หน้าเว็บแสดง same 2 อันดับแรก + cross ≥ 0.10 ท้ายหัวข้อ (`nav.rel`) · ทับมือด้วย `rel: ["<หัวข้อ>", "<วิชา>/<หัวข้อ>"]` ในหัวข้อของ DEEP · อยู่ใน hook offline แล้ว
- **ป้ายสถานะ** (ฟิลด์เสริมในหัวข้อของ DEEP หรือที่ระดับวิชาเป็นค่าเริ่มต้น — topic-writer ใส่): `rev: "2026-09-26"` วันที่ปรับปรุง (ISO เท่านั้น) · `chk: true|false` ผ่านตรวจทาน tech + lang แล้วหรือยัง · `src: "สไลด์ Л5–Л6 2025 + ตำรา …"` ต้นทางสั้น → ป้าย «✓ ตรวจทานแล้ว · 26 ก.ย. 2026» / «ยังไม่ตรวจทาน» / «ปรับปรุง …» · **ไม่มีฟิลด์ = ไม่มีป้าย** (วิชาใหม่ให้ใส่ `chk: false` ตั้งแต่แรก แล้วเปลี่ยนเป็น `true` + `rev` หลังผ่านตรวจ)
- แถบใต้ชื่อหัวข้อ (`.s7-bar`): ป้าย · ☆ ปัก · ⧉ คัดลอกลิงก์ · ⚑ แจ้งจุดผิด — ⧉/⚑ มีบน `details.qa[id]` และ `.demo-head` ด้วย (ใน .demo-head เป็น `<span role=button>` เพราะแบบจำลองหลายตัววนแก้ `.demo-head button`) · กล่องแบบจำลองที่ไม่มี id ได้ `<หัวข้อ>-dm<ลำดับ>` · เปิดลิงก์ `#/<วิชา>/<หัวข้อ>/<id>` แล้วไฮไลต์ `.s7-hl` 2 วินาที
- คีย์: `atlas-recent-v1` `[{sid,tid,t}]` ≤ 12 · `atlas-pins-v1` `[{sid,tid,t}]` · `atlas-notes-v1` `{<หัวข้อ>:{sid,text,t}}` (textarea ท้ายหัวข้อ `details.mynote`) · hook ที่ใช้: fill · go · offline · html overview-top (อ่านล่าสุด + ★) · html progress (การ์ดประวัติ/ปักไว้/บันทึก)
- แจ้งจุดผิด = คัดลอกข้อความสำเร็จรูป (วิชา หัวข้อ ลิงก์ ข้อความที่เลือก DATA_VERSION) ให้วางในกลุ่ม LINE · เจ้าของงานเพิ่ม `data/feedback.json` = `{"url": "https://…"}` (เช่นแบบฟอร์ม) ได้ภายหลัง ปุ่มจะเปิดลิงก์นั้นด้วย

#### 14.8 S8 — ข้อมูลผู้เรียน
- **คีย์ศัพท์ถาวร:** `termKey(m, t, i)` = `"g:" + m.id + "-" + stableId(t.ru)` (คำรัสเซียซ้ำในกลุ่ม → `-2`, `-3` ตามลำดับที่พบ) — เพิ่ม/ย้ายคำใน MODULES ได้ เครื่องหมายไม่เลื่อน · **แก้คำรัสเซียของคำเดิม = คีย์ใหม่** (เครื่องหมายของคำนั้นหาย) ถ้าจำเป็นต้องแก้ ให้เขียนขั้นย้ายคีย์เพิ่มใน `learnerStart()`
- **`atlas-meta-v1` = `{schema, created, lastActive}`** · `SCHEMA = 2` (S9: = 3 · ขั้น 2→3 `migrateQuizKeys`) · `learnerStart()` (ต่อจาก `termKey` — รันก่อนช่อง SLOT เพราะ S6 อ่าน `atlas-srs-v1` ตอนเริ่ม) ย้ายคีย์ `g:<กลุ่ม>-<ลำดับ>` ใน DONE/BM/`atlas-srs-v1` ครั้งเดียวเมื่อ schema < 2 (เขียนไม่สำเร็จ → schema ไม่ขยับ ย้ายใหม่ครั้งหน้า) · เปลี่ยนความหมายคีย์ใดอีก → เพิ่ม SCHEMA + ขั้นย้ายใน `learnerStart()`
- **`store(key, value)`** (ต้นส่วน APP) = ตัวเขียนเดียวของข้อมูลผู้เรียน: สตริงเขียนตรง · `undefined` ลบ · อื่น ๆ JSON · คืน true/false · ล้ม → `STORE_ERR` + แถบ «บันทึกไม่สำเร็จ — พื้นที่เก็บของเบราว์เซอร์เต็ม» ครั้งเดียวพร้อมลิงก์ `#/progress` — **ทุกตัวเขียนของทุก session ผ่าน `store()` แล้ว** (S2 `saveUI` · S4 `sxSave` · S6 `wr` · S7 `s7Save` · โหมดอ่าน · ภาคของผู้อ่าน) ยกเว้นสำเนาออฟไลน์ของ S3 (ลดขนาดเองเมื่อเต็ม) · โหมดผู้ดูแล `ADMINKEY` · นำเข้า/คืนชุดเดิมใน `applyLearnerData` · tests ตก ถ้ามี `localStorage.setItem` ตรง ๆ ที่อื่น (รายการยกเว้นใน `tests/learner-data.test.cjs`) · `saveQuiz` (บล็อก v4) เปลี่ยนเป็น `store(QKEY, QUIZ)` แล้ว ต้องแก้ `_work/layout/layout.js` ในเครื่องตามก่อนรัน patch_layout ครั้งหน้า
- **ทะเบียนคีย์ `learnerKey(key, {kind: "set"|"list"|"obj"|"any"|"raw", re, label, count(v), temp})`** (ลงทะเบียนครบทุกคีย์ของ S2–S7 แล้ว · tests ตก ถ้ามีคีย์ `atlas-*-vN` ใหม่ที่ไม่ลงทะเบียน) — ใช้ตรวจไฟล์สำรองและสรุปก่อนนำเข้า · session อื่นเรียกได้ที่ระดับบนสุดของช่องตัวเอง (ไม่ลงทะเบียน = นำเข้าได้แต่ขึ้น «ไม่รู้จัก n รายการ») · `temp: true` = ปุ่ม «ล้างข้อมูลชั่วคราว» ลบได้ (ตอนนี้ `atlas-last-v1` `atlas-rail-v1` `atlas-ui-v1` `atlas-search-v1` + `atlas-backup-prev` ถามแยก)
- **ไฟล์สำรองรุ่น 2** `{app: "atlas-site", v: 2, schema, saved, data: {คีย์ atlas-*: สตริงดิบ}}` ไม่รวม `atlas-admin-v1` `atlas-backup-prev` (S9: + `atlas-offline-v1` = `DEVICE_KEYS`) · รับรุ่น 1 ได้ (schema 1 → ย้ายหลังโหลดใหม่) · รุ่นไฟล์/ข้อมูลใหม่กว่า/คีย์ผิดรูปแบบ → ปฏิเสธ ไม่แตะข้อมูล
- นำเข้า = `importPlan()` (ตรวจ+สรุป) → `confirm` → `applyLearnerData()` เก็บชุดปัจจุบันลง **`atlas-backup-prev`** `{saved, why, data}` ก่อน (เก็บไม่ได้ = ยกเลิก) → เขียน · ล้มกลางทางคืนชุดเดิมทีละคีย์ · `restorePrev()` = ปุ่ม «กู้คืนชุดก่อนนำเข้า» (สลับชุด กดซ้ำย้อนกลับ) · `progressImport(file)` ยังเรียกแบบเดิม (throw = เหตุผล · ยกเลิก = false)
- การ์ด «พื้นที่เก็บในเครื่องนี้» + «ชุดก่อนนำเข้า» ผ่าน `HOOKS.html("progress")` (หน้า `renderProgress` ของ S2 · หน้าสำรองของ S8 ลบแล้ว) · tests: `tests/learner-data.test.cjs`

#### 14.9 S9 — router และปิดรุ่น (29 ก.ย. + 7 ต.ค. 2026)
- **router `NAVBUSY`** (session 29 ก.ย. ค้างใน branch `blissful-mendel` รวมเข้าตอนปิดรุ่น): งานกระโดดตั้งแต่ `scrollToTopic` รอหัวข้อโหลดจนตำแหน่งนิ่ง — `writeScrollState` ไม่เขียนระหว่างงาน `navEnd` เขียนครั้งเดียวตอนจบ · `go()`/Back แบบพิกเซล `navStop()` · ResizeObserver บน `#view` · ตรวจ `node tests/navstate.browser.cjs [--cpu 4] [--slow 700] [--mobile]`
- **ตรวจรอยต่อ 6 ด้าน** (lifecycle · navigation · storage · offline · มือถือ · หน้าใหม่) ได้ 39 ข้อ แก้ทุกข้อที่ยืนยันจากโค้ดได้: quiz2 ให้คะแนน SRS ซ้ำทุกครั้งที่กดหลังตอบครบ (`ZWAS`) · ผลควิซท้ายหัวข้อช้าไปหนึ่งคำตอบ · ✓ ท้ายหัวข้อไม่สร้างรายการทวน · `srsSidOf` ไม่รู้จักคีย์ศัพท์รุ่น S8 · `#/cram` id ปากเปล่าคนละแบบกับ `#/oral` · «เปิดฉบับเต็ม» ไม่ผ่าน router · คืนตำแหน่งเลยไป 2–4 จอเพราะแบบจำลองด้านบนยังไม่ติดตั้ง · ผลค้นหาต้นหัวข้อ/ตรงชื่อหัวข้อ → ที่อยู่ชี้หัวข้อก่อนหน้า/ไม่มีไฮไลต์ · Back กลับ `#/cram` แล้วไปบนสุด (`restoreY`) · ซ้อมปากเปล่าเริ่มชุดใหม่หลัง Back (`S5RUN`) · เปิดวิชาโครงร่างทับ «อ่านต่อ» · ลิงก์ `#<id>` ไม่เพิ่มประวัติ
- **ออฟไลน์:** «อัปเดต» หลังเว็บออกรุ่นใหม่ลบไฟล์ของวิชาเอง (เทียบรายการทั้ง `?v=` แต่ตัวลบลบทุกรุ่น → `offlinePath`) · หัวข้อเก็บด้วย ?v= คนละตัวกับที่หน้าขอ (→ `dbUrl`) · sw.js เก็บการเปิดไฟล์ใด ๆ (เช่นรูปในแท็บใหม่) เป็นหน้าเว็บ (→ `isShell`) · ไฟล์สำรองพา `atlas-offline-v1` ไปเครื่องอื่น (→ `DEVICE_KEYS`) · นำเข้าในแท็บหนึ่งถูกแท็บอื่นเขียนทับ (→ แท็บอื่นโหลดใหม่) · วิชาที่ไม่มีคำถามปากเปล่าเก็บออฟไลน์ไม่ได้เพราะ hook ของ S5 ขอไฟล์ qa ที่ไม่มี (→ ข้ามเมื่อ `QAIX` บอกว่าไม่มี) · **`CACHE` ใน sw.js คงเป็น `atlas-v1` โดยตั้งใจ** (แผนเดิมสั่งเปลี่ยน แต่จะลบวิชาที่ผู้อ่านเก็บไว้ขณะหน้าเว็บยังบอกว่าเก็บแล้ว · รูปแบบสำเนาไม่เปลี่ยน)
- **มือถือ:** แถววันสอบ/แผนของ S6 พับใน ▾ ที่จอ ≤ 600 px + ป้าย «อีก N วัน» · ข้อความอธิบายปุ่มออฟไลน์ซ่อนจนกด · `#netbar` เป็นเม็ดมุมซ้ายล่าง · ปุ่มออกจากโหมดอ่านไปกองขวา · ช่องกรอกใน `#view` 16 px (iPhone ไม่ซูม) · ยกปุ่ม ↑ พ้นแถบ `#s8bar` · `navLine()` · แถบหลบของ S2 ไม่นับการเลื่อนระหว่าง `NAVBUSY` (เดิมงานกระโดดที่นานกว่า 1.2 วินาทีสั่งหลบแถบเอง)
- **ข้อมูล:** `SCHEMA = 3` — `migrateQuizKeys` ย้ายคีย์ควิซรายบล็อกตามลำดับ (ก่อน S5) · แผนสอบนับปากเปล่าจาก `QAIX` (toe/surn เดิมนับไม่ได้) · Flashcard `/due` + ลิงก์จากการ์ดวันนี้/แผง S6 · «ฝึกเรื่องนี้» ในหัวข้อที่ไม่มีอะไรให้ฝึก → ฝึกทั้งวิชา · % ควิซของวิชาเป็นตัวเลขเดียวกันทุกหน้า
- **รอบตรวจทานโค้ดที่แก้ (4 ด้าน 25 ข้อ):** คืนตำแหน่งเปลี่ยนเป็นจุดอ้างอิง `anchorAt` (วิธีแรก «ติดตั้งแบบจำลองเหนือเส้นก่อนกระโดด» ผิดเมื่อผู้อ่านกระโดดเข้ากลางหัวข้อ) · ชุดปากเปล่าทำต่อเฉพาะ Back (`GO_POP`) ·
  «จำได้» วันละครั้งต่อคีย์ (กด «ลองใหม่» · ติ๊กซ้ำ · «จำได้» ซ้ำใน cram ไม่ดันช่วงทวน) · Back หลัง «เปิดฉบับเต็ม» กลับโหมดสรุป · ปุ่ม «ตั้งวันสอบ» บนจอแคบ · ย้ายคีย์ SRS ของ cram รุ่นก่อนเมื่อเปิด cram · ไฟล์สำรองบอก schema จริง · บันทึกออฟไลน์ที่ไม่มีสำเนาถูกลบเอง · CSS (ข้อความยืนยันลบสำเนา · แถบออฟไลน์ธีมมืด · มือถือแนวนอน · ปุ่มเหนือ `#s8bar`)
- ชุดตรวจใหม่ `tests/paths.browser.cjs` + `tests/s9.browser.cjs` (กับโค้ดก่อนแก้ ตก 6 ใน 12 ข้อ) · `tests/rail.browser.cjs` รองานกระโดดของ router จบจริงก่อนวัด (เดิมรอตายตัว 1.5 วินาที — เวลาเปิดหน้าแกว่ง 0.8–2 วินาที) · `learner-data` ทดสอบสคีมา 3 · `srs` ใช้คีย์ศัพท์รุ่น S8 และแถวที่พับบนมือถือ
