// ตรวจว่าที่อยู่ของหน้า (state.topic · location.hash · atlas-last-v1) ตรงกับหัวข้อที่อยู่บนจอหลังกระโดด — ไม่ได้อยู่ในชุด node --test
// รัน: node tests/navstate.browser.cjs [--rounds 6] [--mobile] [--cpu 4] [--slow 700] [--read] [--jumps 60] [--trace]
// อาการเดิม (S9): แท็บที่เปิดหัวข้อมาหลายสิบหัวข้อแล้ว (DBCACHE เต็ม · ทุกหัวข้อต้องโหลดใหม่) กระโดดไปหัวข้ออื่นแล้วหน้าไปถูกที่
// แต่ writeScrollState (หน่วง 400 ms หลัง scroll) เขียนตำแหน่งกลางทาง — ด้านบนสุดของหน้า (#/nav/full) หรือหัวข้อระหว่างทาง (#/nav/nav-1) — แล้วไม่มี scroll มาแก้
// ลำดับต่อรอบ (หน้าใหม่ทุกรอบ): เปิดบล็อกสรุป + *-map ของทุกวิชาต่อกัน → nav-s1 → กดลิงก์ #/nav/nav-5 (รอบคู่) หรือ go(parseRoute(…)) (รอบคี่)
//   → รอจนหน้านิ่ง แล้วดูต่ออีก 10 วินาทีว่าที่อยู่ยังตรงกับจอ · กระโดดภายในวิชา (navTopic) และ Back ด้วย
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

function loadPlaywright() {
  try { return require('playwright'); } catch (e) {}
  const g = execSync('npm root -g').toString().trim();
  return require(path.join(g, 'playwright'));
}
const { chromium } = loadPlaywright();
const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, path.normalize(p));
      if (!f.startsWith(ROOT)) { rsp.writeHead(403); rsp.end(); return; }
      fs.readFile(f, (e, b) => {
        if (e) { rsp.writeHead(404); rsp.end(); return; }
        rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
        rsp.end(b);
      });
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const ROUNDS = +arg('--rounds', 6), JUMPS = +arg('--jumps', 60), CPU = +arg('--cpu', 1), MOBILE = process.argv.includes('--mobile');
const TRACE = process.argv.includes('--trace');     // พิมพ์ทุกครั้งที่ writeScrollState ถูกเรียก (เวลา · scrollY · ที่อยู่) เมื่อรอบนั้นตก
const READ = process.argv.includes('--read');      // เปิดโหมดอ่าน (ซ่อนแถบบน/เมนูซ้าย · navOffset เปลี่ยน) ก่อนกระโดด
const SLOW = +arg('--slow', 0);                     // หน่วงไฟล์ data/t ทุกไฟล์ (ms) — หัวข้อโหลดนานกว่าตัวหน่วง 400 ms ของ writeScrollState
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ที่อยู่ปัจจุบันเทียบกับจอ — hash ต้องเป็น #/<วิชา>/<หัวข้อบนจอ> และ «อ่านต่อ» ชี้หัวข้อเดียวกัน
const SNAP = `(() => {
  const cur = currentTopicEl();
  let last = null; try { last = JSON.parse(localStorage.getItem('atlas-last-v1')); } catch (e) {}
  return { busy: typeof NAVBUSY !== 'undefined' && !!NAVBUSY, cur: cur && cur.id, topic: state.topic || null, hash: location.hash, last: last && last.topic, y: Math.round(scrollY), h: document.documentElement.scrollHeight };
})()`;
const matches = (s, sid) => s.cur && s.topic === s.cur && s.hash === '#/' + sid + '/' + s.cur && s.last === s.cur;

async function settle(page, quietMs) {       // รอจนงานกระโดดจบ และ scrollY + ความสูงหน้าไม่เปลี่ยน quietMs ติดกัน (สูงสุด 40 วินาที)
  const t0 = Date.now();
  let prev = '', since = Date.now();
  while (Date.now() - t0 < 40000) {
    const s = await page.evaluate(SNAP);
    const k = s.busy ? 'busy' + Date.now() : s.y + '/' + s.h;
    if (k !== prev) { prev = k; since = Date.now(); }
    else if (Date.now() - since >= quietMs) return s;
    await sleep(100);
  }
  return page.evaluate(SNAP);
}

(async () => {
  const srv = await serve();
  const base = `http://127.0.0.1:${srv.address().port}/`;
  const browser = await chromium.launch();
  const errors = [], fails = [];
  try {
    for (let r = 0; r < ROUNDS; r++) {
      const ctx = await browser.newContext(MOBILE ? { viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 900 } });
      await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, rt => rt.abort());
      if (SLOW) await ctx.route(/\/data\/t\//, async rt => { await sleep(SLOW); await rt.continue(); });
      const page = await ctx.newPage();
      page.on('pageerror', e => errors.push(String(e)));
      const log = [];
      if (TRACE) {
        page.on('console', m => { if (m.text().startsWith('[wss]')) log.push(m.text()); });
        await page.addInitScript(() => addEventListener('DOMContentLoaded', () => {
          const T0 = performance.now(), f = () => Math.round(performance.now() - T0);
          const w = () => { const o = window.writeScrollState; window.writeScrollState = function () {
            const r = o.apply(this, arguments);
            console.log('[wss] ' + f() + ' y=' + Math.round(scrollY) + ' topic=' + state.topic + ' hash=' + location.hash + ' job=' + (typeof NAVJOB !== 'undefined' ? NAVJOB : '') + (typeof NAVBUSY !== 'undefined' && NAVBUSY ? ' (กำลังกระโดด — ไม่เขียน)' : '')); return r; }; };
          setTimeout(w, 0);
        }));
      }
      if (CPU > 1) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU }); }
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => typeof state !== 'undefined' && typeof go === 'function' && document.querySelector('#view h1'));

      // 1) session ยาว: บล็อกสรุปและแผนที่วิชาของทุกวิชา ต่อกันในแท็บเดียว (รอสั้นบ้างยาวบ้าง ให้งานโหลดค้างข้ามหน้า)
      const list = await page.evaluate(() => Object.keys(DEEP).flatMap(id =>
        [...(DEEP[id].summary || []), ...DEEP[id].topics.filter(t => /-map$/.test(t.id))].map(t => [id, t.id])));
      const seq = list.slice(0, JUMPS);
      for (let i = 0; i < seq.length; i++) {
        await page.evaluate(([id, topic]) => go({ v: 'subject', id, topic }), seq[i]);
        await sleep([150, 400, 900][(i + r) % 3]);
      }
      // 2) nav-s1 แล้วกระโดดไป nav-5
      await page.evaluate(() => go({ v: 'subject', id: 'nav', topic: 'nav-s1' }));
      await page.waitForFunction(() => { const b = document.querySelector('#nav-s1 .tbody'); return b && b.dataset.lazy === undefined && !b.querySelector(':scope > .tload'); }, null, { timeout: 20000 });
      if (READ) await page.evaluate(() => { if (typeof readToggle === 'function' && !RAIL.focus) readToggle(); });
      await sleep(300 + 200 * (r % 4));
      const how = r % 2 === 0 ? 'link' : 'go';
      const clicked = how === 'link' && await page.evaluate(() => {
        const a = document.querySelector('#nav-s1 a[href="#/nav/nav-5"]');
        if (!a) return false;
        a.click(); return true;
      });
      if (!clicked) await page.evaluate(() => go(parseRoute('#/nav/nav-5')));
      const via = clicked ? 'ลิงก์' : 'go()';

      if (TRACE) log.length = 0;
      const check = async (label, want, sid) => {
        const s = await settle(page, 1500);
        const bad = [];
        if (want && s.cur !== want) bad.push('จอไม่อยู่ที่ ' + want);
        if (!matches(s, sid)) bad.push(`ที่อยู่ไม่ตรงจอ (จอ=${s.cur} state.topic=${s.topic} hash=${s.hash} อ่านต่อ=${s.last})`);
        await sleep(10000);                           // อาการเดิมค้างอยู่ ≥ 10 วินาที
        const s2 = await page.evaluate(SNAP);
        if (!matches(s2, sid)) bad.push('10 วินาทีต่อมายังไม่ตรง');
        const line = `รอบ ${r + 1} ${label}: จอ=${s2.cur} state.topic=${s2.topic} hash=${s2.hash} อ่านต่อ=${s2.last}`;
        if (bad.length) { fails.push(line + ' — ' + bad.join(' · ')); console.log('  ✗ ' + line + ' — ' + bad.join(' · ')); if (TRACE) console.log('    ' + log.slice(-12).join('\n    ')); }
        else console.log('  ✓ ' + line);
      };
      await check('nav-s1 → nav-5 (' + via + ')', 'nav-5', 'nav');

      // 3) ภายในวิชาเดียวกัน (navTopic) แล้ว Back
      await page.evaluate(() => navTopic('nav-12'));
      await check('navTopic nav-12', 'nav-12', 'nav');
      await page.goBack();
      await check('Back', 'nav-5', 'nav');
      await ctx.close();
    }
  } finally {
    await browser.close();
    srv.close();
  }
  if (errors.length) console.log('page error:\n  ' + errors.slice(0, 5).join('\n  '));
  assert.equal(errors.length, 0, 'มี page error');
  assert.equal(fails.length, 0, 'ที่อยู่ไม่ตรงหัวข้อบนจอ ' + fails.length + ' ครั้ง');
  console.log('ผ่าน ' + ROUNDS + ' รอบ');
})().catch(e => { console.error(e.message || e); process.exit(1); });
