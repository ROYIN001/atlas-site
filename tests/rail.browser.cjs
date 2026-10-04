// ตรวจรับเมนูซ้ายแบบย่อ (แถบไอคอน) + โหมดอ่าน ในเบราว์เซอร์จริง — รันมือ ไม่อยู่ใน node --test
//   node tests/rail.browser.cjs             (ต้องมีแพ็กเกจ playwright ของ Node · ในคลาวด์ใช้ NODE_PATH=$(npm root -g))
// ข้อที่ต้องผ่าน: เปิดวิชาเนื้อหาเต็มแล้วย่อเอง · ค่าเดียวใช้ทุกหน้า · สารบัญขวาโผล่ที่ 1366 px · สลับแล้วข้อความบนสุดของจออยู่ที่เดิม
// · ] / Esc / ปุ่ม / ไปหน้าอื่น เข้า-ออกโหมดอ่าน · / ค้นหาได้จากโหมดอ่าน · รีเฟรชแล้วจำค่า · จอ 390 px ไม่เปลี่ยน
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
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push('pageerror: ' + e.message));
  pg.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  pg.on('request', r => { if (/^https?:/.test(r.url()) && !r.url().startsWith(base)) external.add(r.url()); });
  const subj = id => pg.waitForFunction(id => typeof state !== 'undefined' && state.v === 'subject' && state.id === id && document.querySelector('#view section.topic'), id);
  const S = () => pg.evaluate(() => {
    const w = s => { const e = document.querySelector(s); return e && getComputedStyle(e).display !== 'none' ? Math.round(e.getBoundingClientRect().width) : 0; };
    const h = document.documentElement.classList;
    return { mini: h.contains('rail-mini'), read: h.contains('read-mode'), rail: w('aside.rail'), topbar: w('.topbar'), toc: w('#view .sgrid .toc'), marg: w('#view .sgrid .marg'),
      subj: (document.querySelector('.rmini .rm-subj:not([hidden]) b') || {}).textContent || '' };
  });
  // ตำแหน่งที่อ่าน = ระยะของข้อความบนสุดของจอจากขอบล่างของแถบที่ติดจอ (navOffset) — ต้องเท่าเดิม ±2 px หลังสลับ
  const pin = () => pg.evaluate(() => { const r = view.querySelector('.wrap').getBoundingClientRect();
    window.__pin = document.elementFromPoint(Math.round(r.left + Math.min(r.width, 600) / 2), navOffset() + 30);
    return window.__pin.getBoundingClientRect().top - navOffset(); });
  const pinNow = () => pg.evaluate(() => window.__pin.getBoundingClientRect().top - navOffset());

  await pg.goto(base + '#/'); await pg.waitForFunction(() => typeof state !== 'undefined' && document.querySelector('#view h1'));
  let r = await S();
  check('หน้าหลัก (ครั้งแรก): เมนูเต็ม 246 px', !r.mini && r.rail === 246, r);

  await pg.goto(base + '#/nav'); await subj('nav'); await pg.waitForTimeout(800);
  r = await S();
  check('เปิดวิชาที่มีเนื้อหาเต็ม → ย่อเหลือแถบไอคอน 60 px + «วิชานี้»', r.mini && r.rail === 60 && r.subj === '39', r);
  check('1366 px + แถบไอคอน: สารบัญขวาโผล่ (เมนูเต็มต้อง ≥ 1400 px)', r.toc > 0, r);
  check('แถบไอคอน: 5 เมนูหลักชุดเดียวกับแถบล่าง', await pg.evaluate(() => ['overview', 'subjects', 'practice', 'find', 'progress']
    .every(k => document.querySelector('.rmini [data-rm="' + k + '"] svg'))));

  await pg.evaluate(() => window.scrollTo(0, 9000)); await pg.waitForTimeout(1200);
  const t0 = await pin();
  await pg.click('.rmini [data-rail="fold"]'); await pg.waitForTimeout(500);
  r = await S();
  check('☰ ขยายเมนูกลับเต็ม', !r.mini && r.rail === 246, r);
  const t1 = await pinNow();
  check('ขยายเมนูแล้วข้อความบนสุดของจอยังอยู่ที่เดิม (±2 px)', Math.abs(t1 - t0) <= 2, [t0, t1]);

  await pg.keyboard.press('BracketRight'); await pg.waitForTimeout(500);
  r = await S();
  check('] = โหมดอ่าน: ไม่มีเมนูซ้าย ไม่มีแถบค้นหา · สารบัญ + แถบข้างโผล่ที่ 1366 px', r.read && r.rail === 0 && r.topbar === 0 && r.toc > 0 && r.marg > 0, r);
  const t2 = await pinNow();
  check('เข้าโหมดอ่านแล้วข้อความบนสุดของจอยังอยู่ที่เดิม (±2 px)', Math.abs(t2 - t0) <= 2, [t0, t2]);
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(300);
  check('Esc ออกจากโหมดอ่าน', !(await S()).read);
  await pg.keyboard.press('BracketRight'); await pg.waitForTimeout(300);
  await pg.keyboard.press('/'); await pg.waitForTimeout(300);
  r = await S();
  check('กด / ในโหมดอ่าน → ออกจากโหมดแล้วโฟกัสช่องค้นหา', !r.read && await pg.evaluate(() => document.activeElement && document.activeElement.id) === 'search', r);
  await pg.keyboard.press('Escape');

  await pg.click('#nav [data-nav="overview"]'); await pg.waitForTimeout(400);
  r = await S();
  check('ค่าเดียวใช้ทุกหน้า: ขยายไว้แล้วไปหน้าหลัก เมนูยังเต็ม', !r.mini && r.rail === 246, r);
  await pg.keyboard.press('BracketLeft'); await pg.waitForTimeout(300);
  check('[ ย่อเมนูได้ในหน้าอื่นด้วย', (await S()).mini);
  await pg.keyboard.press('BracketLeft'); await pg.waitForTimeout(300);

  await pg.goto(base + '#/elob'); await subj('elob'); await pg.waitForTimeout(500);
  await pg.keyboard.press('BracketRight'); await pg.waitForTimeout(300);
  await pg.reload(); await subj('elob'); await pg.waitForTimeout(500);
  r = await S();
  check('รีเฟรชแล้วจำแถบไอคอน + โหมดอ่านไว้', r.mini && r.read, r);
  await pg.click('#readExit'); await pg.waitForTimeout(300);
  check('ปุ่ม «ออกจากโหมดอ่าน» ทำงาน', !(await S()).read);
  await pg.keyboard.press('BracketRight'); await pg.waitForTimeout(300);
  await pg.click('#view a[href="#/"], #view a[href="#/subjects"]').catch(() => pg.evaluate(() => go({ v: 'overview' })));
  await pg.waitForTimeout(400);
  r = await S();
  check('ไปหน้าอื่นที่ไม่ใช่หน้าวิชา → ออกจากโหมดอ่านเอง', !r.read && r.topbar > 0, r);

  await pg.setViewportSize({ width: 390, height: 844 }); await pg.goto(base + '#/nav'); await subj('nav'); await pg.waitForTimeout(400);
  r = await pg.evaluate(() => ({ mini: getComputedStyle(document.querySelector('.rmini')).display, acts: getComputedStyle(document.querySelector('.rail-acts')).display,
    sw: document.documentElement.scrollWidth, topbar: getComputedStyle(document.querySelector('.topbar')).display }));
  check('จอ 390 px: ไม่มีแถบไอคอน/ปุ่มเมนู · ไม่ล้นจอ (ใช้แถบล่างเหมือนเดิม)', r.mini === 'none' && r.acts === 'none' && r.sw <= 390 && r.topbar !== 'none', r);

  check('ไม่มี page error / console error', errors.length === 0, errors.slice(0, 5));
  check('ไม่เรียกเซิร์ฟเวอร์ภายนอก', external.size === 0, [...external].slice(0, 5));
  await browser.close(); server.close();
  const bad = results.filter(x => !x.ok).length;
  console.log(bad ? '\n' + bad + ' ข้อไม่ผ่าน' : '\nผ่านทุกข้อ (' + results.length + ')');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); server.close(); process.exit(1); });
