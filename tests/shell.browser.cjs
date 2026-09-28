// ตรวจรับงาน S2 (เปลือกนำทาง หน้าแรก มือถือ) ในเบราว์เซอร์จริง — รันมือ ไม่อยู่ใน node --test
//   node tests/shell.browser.cjs            (ต้องมีแพ็กเกจ playwright ของ Node: npm i -g playwright หรือ npm i --no-save playwright)
// เปิดเซิร์ฟเวอร์ไฟล์ในเครื่องเอง (ห้าม file://) · จอ 390×844 แบบมือถือ + จอคอม 1280×900
// ข้อที่ต้องผ่าน: ชิปหัวข้อรู้ตำแหน่ง · สารบัญแบบแผ่นพาไปหัวข้อถูก · แถบหลบให้พื้นที่อ่าน ≥ 780 px · หน้าแรกสั้นและการกระทำหลักอยู่ในจอแรก
// · #/subjects ครบ 54 การ์ดและตัวกรองทำงาน · #/progress สามตัวเลขแยกกัน · การ์ดวิชาทุกใบเป็น <a> · sub/sup ไม่เล็กกว่า 11 px
// · หัวหน้าวิชาบนมือถือ ≤ 200 px · ท้ายหัวข้อครบทุกกล่อง · ไม่มี page error / console error / คำขอไปเซิร์ฟเวอร์ภายนอก
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

let chromium;
for (const m of ['playwright', '@playwright/test', path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'playwright')]) {
  try { ({ chromium } = require(m)); break; } catch (e) { /* ลองตัวถัดไป */ }
}
if (!chromium) { console.error('ไม่พบแพ็กเกจ playwright ของ Node — ติดตั้งด้วย npm i --no-save playwright แล้วรันใหม่'); process.exit(2); }

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

const results = [];
const check = (name, ok, info) => { results.push({ name, ok: !!ok }); console.log((ok ? 'ok   ' : 'FAIL ') + name + (info !== undefined ? '  — ' + JSON.stringify(info) : '')); };

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch();
  const errors = [], external = new Set();
  const newPage = async (vp, mobile) => {
    const ctx = await browser.newContext({ viewport: vp, isMobile: !!mobile, hasTouch: !!mobile });
    const pg = await ctx.newPage();
    pg.on('pageerror', e => errors.push('pageerror: ' + e.message));
    pg.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    pg.on('request', r => { if (/^https?:/.test(r.url()) && !r.url().startsWith(base)) external.add(r.url()); });
    return pg;
  };
  const ready = pg => pg.waitForFunction(() => typeof state !== 'undefined' && document.querySelector('#view h1'));
  const M = { width: 390, height: 844 };

  // ---- หน้าแรก: ผู้อ่านใหม่ ----
  let pg = await newPage(M, true);
  await pg.goto(base + '#/'); await ready(pg); await pg.waitForTimeout(300);
  let r = await pg.evaluate(() => {
    const cta = document.querySelector('#view .s2-cta');
    return { h: document.documentElement.scrollHeight, ctaBottom: cta && cta.getBoundingClientRect().bottom, text: cta && cta.textContent.trim(),
      nonLink: document.querySelectorAll('#view .subj:not(a)').length, cards: document.querySelectorAll('#view .subj-grid .subj[data-go]').length };
  });
  check('หน้าแรก (ผู้อ่านใหม่): การกระทำหลัก «เลือกวิชา» อยู่ในจอแรก', r.ctaBottom && r.ctaBottom <= M.height && /เลือกวิชา/.test(r.text), r.ctaBottom);
  check('หน้าแรก: สูงไม่เกิน 4 000 px', r.h < 4000, r.h);
  check('หน้าแรก: การ์ดวิชาทุกใบเป็น <a> และ verify.py หาเจอ (.subj-grid .subj[data-go])', r.nonLink === 0 && r.cards > 0, r);

  // ---- หน้าแรก: ผู้อ่านเดิม (มีตำแหน่งอ่านค้าง) ----
  await pg.evaluate(() => localStorage.setItem('atlas-last-v1', JSON.stringify({ v: 'subject', id: 'tau', mode: 'full', topic: 'tau-3', off: 0 })));
  await pg.goto(base + '?r=1#/'); await ready(pg); await pg.waitForTimeout(300);
  r = await pg.evaluate(() => { const c = document.querySelector('#view .s2-cta'); return { b: c.getBoundingClientRect().bottom, t: c.textContent, href: c.getAttribute('href') }; });
  check('หน้าแรก (ผู้อ่านเดิม): «เรียนต่อ: วิชา · หัวข้อ» อยู่ในจอแรกและเป็นลิงก์ถึงหัวข้อ', r.b <= M.height && /เรียนต่อ/.test(r.t) && r.href === '#/tau/tau-3', r);
  await pg.click('#view .s2-cta');
  await pg.waitForFunction(() => state.v === 'subject' && state.id === 'tau');
  check('กด «เรียนต่อ» → เปิดวิชาที่ค้างไว้', true);

  // ---- #/subjects ----
  await pg.goto(base + '#/subjects'); await ready(pg); await pg.waitForTimeout(300);
  const vis = () => pg.evaluate(() => [...document.querySelectorAll('#view .subj')].filter(e => e.offsetParent).length);
  r = await pg.evaluate(() => ({ n: document.querySelectorAll('#view .subj').length, ids: new Set([...document.querySelectorAll('#view .subj')].map(e => e.dataset.go)).size,
    nonLink: document.querySelectorAll('#view .subj:not(a)').length }));
  check('#/subjects: การ์ดครบ 54 วิชา ไม่ซ้ำ และเป็น <a> ทุกใบ', r.n === 54 && r.ids === 54 && r.nonLink === 0, r);
  await pg.check('#view [data-f="deep"]'); await pg.waitForTimeout(150);
  const nDeep = await vis(), wantDeep = await pg.evaluate(() => Object.keys(DEEP).length);
  await pg.selectOption('#view [data-f="sem"]', '5'); await pg.waitForTimeout(150);
  const nSem5 = await vis(), want5 = await pg.evaluate(() => runningIn(5).filter(s => DEEP[s.id]).length);
  await pg.click('#view .s2-count [data-f-clear]'); await pg.waitForTimeout(150);
  const nAll = await vis();
  check('#/subjects: ตัวกรองทำงาน (เนื้อหาเต็ม → ภาค 5 → ล้าง)', nDeep === wantDeep && nSem5 === want5 && nAll === 54, { nDeep, wantDeep, nSem5, want5, nAll });

  // ---- #/progress ----
  await pg.evaluate(() => {
    localStorage.setItem('atlas-sula-v1', JSON.stringify(['k:tau-3', 'k:tau-4', 'g:tau-0', 'g:tau-1', 'g:tau-2']));
    localStorage.setItem('atlas-quiz-v1', JSON.stringify({ 'tau-3': { 0: { done: 4, ok: 3, n: 5, t: 1 } } }));
  });
  await pg.goto(base + '?r=2#/progress'); await ready(pg); await pg.waitForTimeout(300);
  r = await pg.evaluate(() => Object.fromEntries([...document.querySelectorAll('#view .s2-kpi')].map(k => [k.dataset.kpi, k.querySelector('b').textContent])));
  check('#/progress: สามตัวเลขแยกกัน (อ่าน 2 · ควิซ 75 % · ศัพท์ 3)', Object.keys(r).length === 3 && /^2 \//.test(r.read) && r.quiz === '75 %' && /^3 \//.test(r.terms), r);
  r = await pg.evaluate(() => !!document.querySelector('#view #bkSave') && !!document.querySelector('#view #bkLoad'));
  check('#/progress: ปุ่มสำรอง/นำเข้าย้ายมาอยู่ที่นี่', r);
  await pg.evaluate(() => { localStorage.removeItem('atlas-sula-v1'); localStorage.removeItem('atlas-quiz-v1'); localStorage.removeItem('atlas-last-v1'); });

  // ---- เมนูหลัก: #bbar ----
  r = await pg.evaluate(() => [...document.querySelectorAll('#bbar > *:not([hidden])')].map(e => e.tagName + ':' + e.textContent.trim() + ':' + (e.getAttribute('href') || '')));
  check('#bbar: 5 พื้นที่ ลิงก์เป็น <a> ค้นหาเป็น <button>', r.length === 5 && r[0].startsWith('A:หน้าหลัก:#/') && r[1] === 'A:รายวิชา:#/subjects' &&
    /^A:ฝึกทบทวน:#\/(practice|flash)$/.test(r[2]) && r[3] === 'BUTTON:ค้นหา:' && r[4] === 'A:ความก้าวหน้า:#/progress', r);
  await pg.close();

  // ---- หน้าวิชาบนมือถือ (ppo: 30 หัวข้อ) ----
  pg = await newPage(M, true);
  await pg.goto(base + '#/ppo/full'); await ready(pg);
  await pg.waitForSelector('#view .topic-nav .tn-toc');
  r = await pg.evaluate(() => { const mb = document.querySelector('#view .modebar'); return Math.round(mb.getBoundingClientRect().top - document.getElementById('view').getBoundingClientRect().top); });
  check('หัวหน้าวิชาบนมือถือ ≤ 200 px ก่อนถึงแถบโหมด', r <= 200, r);
  r = await pg.evaluate(() => document.querySelectorAll('#bbar [data-bb="toc"]:not([hidden])').length === 1 && document.querySelectorAll('#bbar [data-bb="overview"][hidden]').length === 1);
  check('#bbar: «หน้าหลัก» กลายเป็น «สารบัญ» ในหน้าวิชา', r);
  await pg.evaluate(() => document.querySelectorAll('#view section.topic')[9].scrollIntoView());
  await pg.waitForTimeout(1200);
  await pg.evaluate(() => document.querySelectorAll('#view section.topic')[9].scrollIntoView());
  // หัวข้อด้านบนเติมเป็นช่วง ๆ (S3) เส้น IO จึงขยับไปมาราว 1–2 วินาที และชิปเลื่อนแบบนุ่ม — รอจนเงื่อนไขจริงต่อเนื่อง 800 ms ไม่ใช่แค่ชั่วขณะเดียว
  await pg.waitForFunction(() => {
    const on = document.querySelectorAll('#view .topic-nav [data-jump].on'), tn = document.querySelector('#view .topic-nav');
    const b = on[0] && on[0].getBoundingClientRect(), t = tn.getBoundingClientRect(), now = performance.now();
    const ok = on.length === 1 && b.left >= t.left - 1 && b.right <= t.right + 1 && b.top >= 0 && b.bottom <= innerHeight;
    if (!ok) window.__chipOk = 0; else if (!window.__chipOk) window.__chipOk = now;
    return ok && now - window.__chipOk > 800;
  }, null, { timeout: 8000, polling: 100 }).catch(() => {});
  r = await pg.evaluate(() => {
    const on = document.querySelectorAll('#view .topic-nav [data-jump].on'), tn = document.querySelector('#view .topic-nav');
    const b = on[0] && on[0].getBoundingClientRect(), t = tn.getBoundingClientRect();
    return { n: on.length, id: on[0] && on[0].dataset.jump, want: document.querySelectorAll('#view section.topic')[9].id,
      inView: !!b && b.left >= t.left - 1 && b.right <= t.right + 1 && b.top >= 0 && b.bottom <= innerHeight, pos: tn.querySelector('.tn-pos').textContent,
      chip: b && [b.left, b.right, b.top, b.bottom].map(Math.round), bar: [t.left, t.right].map(Math.round) };
  });
  check('ชิปหัวข้อ: หัวข้อที่ 10 มี .on หนึ่งตัวและอยู่ในจอ + ตัวเลขตำแหน่ง', r.n === 1 && r.id === r.want && r.inView && r.pos === '10/30', r);

  await pg.click('#bbar [data-bb="toc"]');
  await pg.waitForSelector('dialog.tsheet[open]');
  const want15 = await pg.evaluate(() => DEEP.ppo.topics[14].id);
  await pg.click('dialog.tsheet [data-ts="' + want15 + '"]');
  await pg.waitForTimeout(400);
  r = await pg.evaluate(() => ({ topic: state.topic, open: !!document.querySelector('dialog.tsheet[open]') }));
  check('สารบัญแบบแผ่น: กดหัวข้อ 15 → state.topic ถูกและแผ่นปิด', r.topic === want15 && !r.open, { r, want15 });
  await pg.waitForTimeout(2500);
  r = await pg.evaluate(() => { const el = document.getElementById(DEEP.ppo.topics[14].id); return Math.round(el.getBoundingClientRect().top); });
  check('สารบัญแบบแผ่น: หัวข้อ 15 ขึ้นมาอยู่ใต้แถบบน', r >= 0 && r < 300, r);

  // แถบหลบตอนอ่าน
  for (let i = 0; i < 10; i++) { await pg.evaluate(() => window.scrollBy(0, 50)); await pg.waitForTimeout(30); }
  await pg.waitForTimeout(350);
  r = await pg.evaluate(() => {
    const vis = el => { if (!el || !el.offsetParent && getComputedStyle(el).position !== 'fixed') return null; const b = el.getBoundingClientRect(); return b.bottom > 0 && b.top < innerHeight ? b : null; };
    let top = 0, bottom = innerHeight;
    for (const el of [document.querySelector('.topbar'), document.querySelector('#view .topic-nav')]) { const b = vis(el); if (b && b.top < 60) top = Math.max(top, b.bottom); }
    const bb = vis(document.getElementById('bbar')); if (bb) bottom = Math.min(bottom, bb.top);
    return { area: Math.round(bottom - top), reading: document.documentElement.classList.contains('reading') };
  });
  check('แถบหลบ: เลื่อนลง 500 px แล้วพื้นที่อ่าน ≥ 780 px', r.reading && r.area >= 780, r);
  await pg.waitForTimeout(1800);
  r = await pg.evaluate(() => document.documentElement.classList.contains('reading'));
  check('แถบหลบ: หยุด 1.5 วินาทีแล้วแถบกลับ', !r);

  // ท้ายหัวข้อ + ตาราง + sub/sup (เติมทุกกล่อง)
  await pg.evaluate(() => fillAllBodies());
  await pg.waitForTimeout(1500);
  r = await pg.evaluate(() => ({ bodies: document.querySelectorAll('#view .tbody:not([data-lazy])').length, ends: document.querySelectorAll('#view .tbody > .tend').length,
    chk: document.querySelectorAll('#view .tend-chk').length, np: document.querySelectorAll('#view .tend-np a').length }));
  check('ท้ายหัวข้อ: ทุกกล่องมี ✓ และก่อนหน้า/ถัดไป', r.bodies === r.ends && r.chk === 30 && r.np === 58, r);
  const k = await pg.evaluate(() => DEEP.ppo.topics[2].id);
  await pg.evaluate(id => document.querySelector('#' + id + ' .tend-chk').click(), k);
  r = await pg.evaluate(id => ({ head: document.querySelector('#' + id + ' .topic-check').classList.contains('done'), done: DONE.has('k:' + id) }), k);
  await pg.evaluate(id => document.querySelector('#' + id + ' .topic-check').click(), k);
  const r2 = await pg.evaluate(id => ({ foot: document.querySelector('#' + id + ' .tend-chk').classList.contains('done'), done: DONE.has('k:' + id) }), k);
  check('ท้ายหัวข้อ: ✓ ซิงก์กับปุ่มบนหัวทั้งสองทาง', r.head && r.done && !r2.foot && !r2.done, { r, r2 });
  await pg.close();

  // sub/sup และตารางกว้างในวิชาที่ใช้มาก (ทุกวิชาที่มีเนื้อหาเต็ม ทั้งสองโหมด)
  const sids = await (async () => { const p = await newPage(M, true); await p.goto(base + '#/'); await ready(p); const a = await p.evaluate(() => Object.keys(DEEP)); await p.close(); return a; })();
  let small = 0, scrolls = 0, tws = 0, legacyBad = 0; const smallAt = [];
  for (const sid of sids) for (const mode of ['full', 'sum']) {
    const p = await newPage(M, true);
    await p.goto(base + '#/' + sid + '/' + mode); await ready(p);
    await p.waitForSelector('#view section.topic .tbody');
    await p.evaluate(() => fillAllBodies());
    await p.waitForTimeout(800);
    await p.evaluate(() => document.querySelectorAll('#view details').forEach(d => { d.open = true; }));
    await p.waitForTimeout(500);
    const x = await p.evaluate(() => {
      const bad = [...document.querySelectorAll('#view sub, #view sup')].filter(e => e.getClientRects().length && parseFloat(getComputedStyle(e).fontSize) < 11);
      const lg = [...document.querySelectorAll('#view .tbody.s2-legacy')].filter(b => b.querySelector('.std2')).length;
      return { small: bad.length, at: bad.slice(0, 2).map(e => (e.closest('section.topic') || {}).id + ' ' + getComputedStyle(e).fontSize),
        tws: document.querySelectorAll('#view .tw').length, scrolls: document.querySelectorAll('#view .tw.scrolls').length, lg };
    });
    small += x.small; scrolls += x.scrolls; tws += x.tws; legacyBad += x.lg; smallAt.push(...x.at);
    await p.close();
  }
  check('sub/sup เล็กกว่า 11 px = 0 (ทุกวิชา ทั้งสองโหมด)', small === 0, { small, smallAt: smallAt.slice(0, 6) });
  check('ตาราง .tw ที่กว้างเกินได้ .scrolls (มีบางตารางบนจอ 390 px)', scrolls > 0, { tws, scrolls });
  check('ข้อความ 16/1.7 ใส่เฉพาะวิชารูปแบบเดิม ไม่แตะ .std2', legacyBad === 0, legacyBad);

  // ---- จอคอม: สารบัญ v4 ยังอยู่ · เมนูซ้ายเป็นลิงก์ ----
  pg = await newPage({ width: 1500, height: 900 });
  await pg.goto(base + '#/tau/full'); await ready(pg); await pg.waitForTimeout(500);
  r = await pg.evaluate(() => ({ toc: !!document.querySelector('#view aside.toc') && getComputedStyle(document.querySelector('#view aside.toc')).display !== 'none',
    tnHidden: getComputedStyle(document.querySelector('#view .topic-nav')).display === 'none',
    menu: [...document.querySelectorAll('#nav > .nav-item')].slice(0, 5).map(e => e.tagName + ':' + e.textContent.replace(/\d+/g, '').trim()) }));
  check('จอคอม ≥ 1400: สารบัญ v4 แสดง แถบชิปซ่อน', r.toc && r.tnHidden, r);
  check('เมนูซ้าย: 5 พื้นที่ชื่อเดียวกับแถบล่าง', JSON.stringify(r.menu) === JSON.stringify(['A:หน้าหลัก', 'A:รายวิชา', 'A:ฝึกทบทวน', 'BUTTON:ค้นหา/', 'A:ความก้าวหน้า']), r.menu);
  await pg.close();

  check('ไม่มี page error / console error', errors.length === 0, errors.slice(0, 5));
  check('ไม่เรียกเซิร์ฟเวอร์ภายนอก', external.size === 0, [...external].slice(0, 5));
  await browser.close(); server.close();
  const bad = results.filter(x => !x.ok).length;
  console.log(bad ? '\n' + bad + ' ข้อไม่ผ่าน' : '\nผ่านทุกข้อ (' + results.length + ')');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); server.close(); process.exit(1); });
