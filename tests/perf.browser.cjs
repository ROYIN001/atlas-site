// วัดประสิทธิภาพขณะอ่าน (S3) ด้วย Playwright — รันมือ ไม่อยู่ใน node --test (ชื่อไฟล์ไม่ลงท้าย .test.cjs)
//
//   node tests/perf.browser.cjs                 # ทุกข้อ · elob ฉบับเต็ม · มือถือ 390 px dpr 2 · CPU ×4
//   node tests/perf.browser.cjs idle longtask   # เลือกเฉพาะบางข้อ: idle longtask scroll cls offline
//   node tests/perf.browser.cjs --subject tau --cpu 1
//   node tests/perf.browser.cjs --root ../base          # วัดรุ่นก่อนแก้: git worktree add ../base <commit>
//
// ข้อที่วัด (เกณฑ์ตรวจรับของ S3 ใน CLAUDE.md หัวข้อ 14)
//   idle      เปิดวิชาแล้วนิ่งบนสุดหน้า: canvas ทั้งหมด · canvas ที่มีขนาด > 0 (≤ 6) · หน่วยความจำ canvas · rAF/วินาที (< 60)
//   full      fillAllBodies() (เส้นทางพิมพ์/ตรวจมือถือ) แล้วกลับบนสุด: canvas ที่มีขนาด > 0 · MB · rAF/วินาที
//   longtask  เปิดวิชาแล้วกระโดดไปหัวข้อยาว (elob-lr4): long task สูงสุดหลังโหลดตัวโปรแกรมเสร็จ (< 500 ms) · bootLongMs = ตอนรัน app.js (แยกไว้ ไม่ใช่งานเติมหัวข้อ)
//   scroll    เลื่อนลงทีละ 1 500 px 60 ก้าว: long task สูงสุดระหว่างเลื่อน · canvas ที่มีขนาด > 0 ท้ายทาง
//   cls       เติมหัวข้อรอบจุดที่อ่านให้ครบก่อน แล้วค่อยปล่อยให้รูปโหลด: จำนวน layout-shift (= 0)
//   offline   ?sw=1 → กด «เก็บวิชานี้ไว้อ่านออฟไลน์» → ปิดเซิร์ฟเวอร์ → เปิดวิชาใหม่: เนื้อหา รูป แบบจำลองต้องมาครบ
//
// พึ่ง playwright ของ node (npm i -g playwright หรือในโปรเจกต์) · เปิดเซิร์ฟเวอร์ python -m http.server เอง
const path = require('node:path');
const { spawn, execSync } = require('node:child_process');
const net = require('node:net');

function loadPlaywright() {
  try { return require('playwright'); } catch (e) {}
  const root = execSync('npm root -g').toString().trim();
  return require(path.join(root, 'playwright'));
}
const { chromium } = loadPlaywright();

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
// --root <โฟลเดอร์> = วัดสำเนาอื่นของเว็บ (เช่น git worktree ของรุ่นก่อนแก้) ด้วยสคริปต์รุ่นนี้
const ROOT = path.resolve(opt('root', path.join(__dirname, '..')));
const SID = opt('subject', 'elob');
const CPU = +opt('cpu', 4);
const LONG_TID = opt('topic', SID === 'elob' ? 'elob-lr4' : null);
const picked = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const WANT = picked.length ? picked : ['idle', 'full', 'longtask', 'scroll', 'cls', 'offline'];
const sleep = ms => new Promise(r => setTimeout(r, ms));

function freePort() {
  return new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
}
async function startServer(port) {
  const py = process.platform === 'win32' ? 'python' : 'python3';
  const srv = spawn(py, ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', ROOT], { stdio: 'ignore' });
  for (let i = 0; i < 100; i++) {
    const ok = await new Promise(r => { const c = net.connect(port, '127.0.0.1', () => { c.end(); r(true); }); c.on('error', () => r(false)); });
    if (ok) return srv;
    await sleep(100);
  }
  throw new Error('เซิร์ฟเวอร์ไม่ขึ้น');
}

// ใส่ก่อนสคริปต์ของหน้า: นับ rAF ที่ถูกเรียกจริง + เก็บ long task / layout shift ตั้งแต่ต้น
const INIT = `
  window.__raf = 0;
  const _raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = cb => _raf(t => { window.__raf++; cb(t); });
  window.__long = []; window.__shift = [];
  // app.js (defer) รันจบก่อน DOMContentLoaded — long task ก่อนนั้นคือการโหลดตัวโปรแกรม ไม่ใช่การเติมหัวข้อ
  window.__boot = 0; document.addEventListener('DOMContentLoaded', () => { window.__boot = performance.now(); });
  window.__bootLong = [];
  try { new PerformanceObserver(l => l.getEntries().forEach(e => (window.__boot && e.startTime >= window.__boot ? window.__long : window.__bootLong).push(e.duration)))
    .observe({ type: 'longtask', buffered: true }); } catch (e) {}
  try { new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) window.__shift.push({ v: e.value, t: e.startTime,
    n: (e.sources || []).map(s => s.node ? (s.node.nodeName + '.' + (s.node.className || '')).slice(0, 40) : '?').join(',') }); }))
    .observe({ type: 'layout-shift', buffered: true }); } catch (e) {}
  try { localStorage.setItem('atlas-mode-v1', 'full'); } catch (e) {}
`;

const CANVAS = `() => {
  const cs = [...document.querySelectorAll('#view canvas')];
  const live = cs.filter(c => c.width > 0 && c.height > 0);
  return { canvas: cs.length, sized: live.length, mb: +(live.reduce((n, c) => n + c.width * c.height * 4, 0) / 1048576).toFixed(1),
    demos: document.querySelectorAll('#view [data-demo]').length,
    filled: document.querySelectorAll('#view .tbody:not([data-lazy])').length,
    loading: document.querySelectorAll('#view .tbody > .tload').length };
}`;

async function newPage(browser, base, extra = {}) {
  const ctx = await browser.newContext(Object.assign({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  }, extra));
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('   ! pageerror', String(e).slice(0, 200)));
  if (CPU > 1) await (await ctx.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: CPU });
  return { ctx, page };
}
const ready = (page, sid) => page.waitForFunction(id => typeof state !== 'undefined' && state.id === id &&
  document.querySelector('#view .tbody:not([data-lazy]) > :not(.tload)'), sid, { timeout: 120000 });
const rafRate = async (page, ms) => {
  const a = await page.evaluate('window.__raf'); await sleep(ms);
  return Math.round((await page.evaluate('window.__raf') - a) * 1000 / ms);
};

const TESTS = {
  async idle(browser, base) {
    const { ctx, page } = await newPage(browser, base);
    await page.goto(base + '#/' + SID + '/full');
    await ready(page, SID);
    await sleep(8000);                                  // ให้หัวข้อชุดแรกเติมและแบบจำลองติดตั้งจนนิ่ง
    const c = await page.evaluate('(' + CANVAS + ')()');
    const raf = await rafRate(page, 3000);
    await ctx.close();
    return Object.assign(c, { rafPerSec: raf });
  },

  async full(browser, base) {
    // เติมทุกหัวข้อ (เส้นทางเดียวกับพิมพ์/ตรวจมือถือ) แล้วกลับขึ้นบนสุดและนิ่ง — กรณีที่หนักที่สุด
    const { ctx, page } = await newPage(browser, base);
    await page.goto(base + '#/' + SID + '/full');
    await ready(page, SID);
    await page.evaluate('fillAllBodies()');
    await sleep(6000);
    await page.evaluate('window.scrollTo(0, 0)');
    await sleep(4000);
    const c = await page.evaluate('(' + CANVAS + ')()');
    const raf = await rafRate(page, 3000);
    await ctx.close();
    return Object.assign(c, { rafPerSec: raf });
  },

  async longtask(browser, base) {
    if (!LONG_TID) return { skip: 'ไม่มีหัวข้อยาวสำหรับวิชานี้ (--topic)' };
    const { ctx, page } = await newPage(browser, base);
    await page.goto(base + '#/' + SID + '/' + LONG_TID);
    await page.waitForFunction(tid => { const s = document.getElementById(tid); return s && s.querySelector('.tbody:not([data-lazy]) > :not(.tload)'); },
      LONG_TID, { timeout: 120000 });
    await sleep(6000);
    const long = await page.evaluate('window.__long');
    const boot = await page.evaluate('Math.round(Math.max(0, ...window.__bootLong))');
    const c = await page.evaluate('(' + CANVAS + ')()');
    await ctx.close();
    return { bootLongMs: boot, maxLongMs: Math.round(Math.max(0, ...long)), longCount: long.length, sumLongMs: Math.round(long.reduce((a, b) => a + b, 0)), sized: c.sized };
  },

  async scroll(browser, base) {
    const { ctx, page } = await newPage(browser, base);
    await page.goto(base + '#/' + SID + '/full');
    await ready(page, SID);
    await sleep(4000);
    await page.evaluate('window.__long.length = 0');
    const t0 = Date.now();
    // เลื่อนแบบผู้อ่านที่ปัดเร็ว: ทีละ 1 500 px หยุด 200 ms รวม ~ 90 000 px (ผ่านหลายหัวข้อ หัวข้อใหม่เติมระหว่างเลื่อน)
    for (let i = 0; i < 60; i++) { await page.evaluate('window.scrollBy(0, 1500)'); await sleep(200); }
    const dt = Date.now() - t0;
    await sleep(3000);
    const long = await page.evaluate('window.__long');
    const c = await page.evaluate('(' + CANVAS + ')()');
    const y = await page.evaluate('Math.round(scrollY)');
    const raf = await rafRate(page, 3000);
    await ctx.close();
    return { scrollY: y, wallMs: dt, maxLongMs: Math.round(Math.max(0, ...long)), longCount: long.length, filled: c.filled,
      sized: c.sized, mb: c.mb, canvas: c.canvas, rafPerSec: raf };
  },

  async cls(browser, base) {
    // รูปถูกกักไว้จนกว่าหัวข้อรอบจุดอ่านเติมเสร็จ แล้วปล่อยพร้อมกัน — layout shift ที่เกิดหลังจากนั้นมาจากรูปล้วน ๆ
    const { ctx, page } = await newPage(browser, base);
    const held = [];
    let release = false;
    await ctx.route(/\/figs\/.*\.webp/, route => { if (release) route.continue(); else held.push(route); });
    const tid = opt('cls-topic', SID === 'elob' ? 'elob-1' : null);
    await page.goto(base + '#/' + SID + (tid ? '/' + tid : '/full'));
    await ready(page, SID);
    await sleep(7000);
    // เลื่อนให้รูปแรกของหัวข้ออยู่กลางจอ (รูปยังโหลดไม่เสร็จ) แล้วรอให้นิ่ง
    await page.evaluate(tid => {
      const f = document.querySelector((tid ? '#' + tid + ' ' : '#view ') + 'figure.ifig');
      if (f) window.scrollTo(0, scrollY + f.getBoundingClientRect().top - innerHeight / 3);
    }, tid);
    await sleep(3000);
    const figs = await page.evaluate(`[...document.querySelectorAll('#view figure.ifig img')].filter(i => { const r = i.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }).length`);
    const before = await page.evaluate('window.__shift.length');
    const heldN = held.length;
    release = true;
    held.splice(0).forEach(r => r.continue());
    await sleep(4000);
    const shifts = await page.evaluate('window.__shift');
    const after = shifts.slice(before);
    const imgs = await page.evaluate(`[...document.querySelectorAll('#view figure.ifig img[src]')].filter(i => i.complete && i.naturalWidth).length`);
    await ctx.close();
    return { heldFigs: heldN, figsInView: figs, imgsLoaded: imgs, shiftsAfterRelease: after.length,
      shiftSum: +after.reduce((a, s) => a + s.v, 0).toFixed(4), first: after.slice(0, 3).map(s => s.n) };
  },

  async offline(browser) {
    // ต้องมี service worker: เปิดบน 127.0.0.1 ด้วย ?sw=1 (app.js ลงทะเบียนบน localhost เฉพาะเมื่อมี ?sw=1)
    const port = await freePort();
    const srv = await startServer(port);
    const base = `http://127.0.0.1:${port}/?sw=1`;
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await ctx.addInitScript(INIT);
    let page = await ctx.newPage();
    page.on('pageerror', e => console.log('   ! pageerror', String(e).slice(0, 200)));
    await page.goto(base + '#/' + SID + '/full');
    await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 30000 })
      .catch(() => page.reload().then(() => page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 30000 })));
    await ready(page, SID);
    await page.waitForSelector('#offlBtn', { timeout: 30000 });
    const t0 = Date.now();
    await page.click('#offlBtn');
    await page.waitForFunction(() => /เก็บครบ|ไม่สำเร็จ/.test((document.getElementById('offlMsg') || {}).textContent || ''), null, { timeout: 300000 });
    const saveMsg = await page.evaluate(() => document.getElementById('offlMsg').textContent);
    const saveMs = Date.now() - t0;
    const rec = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('atlas-offline-v1'))[state.id]; } catch (e) { return null; } });
    srv.kill();
    await sleep(500);
    await ctx.setOffline(true);
    await page.close();
    page = await ctx.newPage();
    page.on('pageerror', e => console.log('   ! pageerror (offline)', String(e).slice(0, 200)));
    await page.goto(base + '#/' + SID + '/full');
    await ready(page, SID);
    // เลื่อนทั้งหน้าเป็นก้าว ๆ ให้ทุกหัวข้อ แบบจำลอง และรูปเติมครบ
    const steps = await page.evaluate(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < 2000; i++) {
        window.scrollBy(0, innerHeight - 100); await sleep(60);
        if (scrollY + innerHeight >= document.documentElement.scrollHeight - 4) return i + 1;
      }
      return -1;
    });
    await sleep(3000);
    await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight - 100) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } });
    await sleep(3000);
    const r = await page.evaluate(() => {
      const v = document.getElementById('view'), imgs = [...v.querySelectorAll('figure.ifig[data-fig] img')];
      return { boxes: v.querySelectorAll('.tbody').length, filled: v.querySelectorAll('.tbody:not([data-lazy])').length,
        tfail: v.querySelectorAll('.tfail').length, demos: v.querySelectorAll('[data-demo]').length,
        canvas: v.querySelectorAll('canvas').length, demoFail: v.querySelectorAll('.demo-fail').length,
        figs: imgs.length, imgsOk: imgs.filter(i => i.naturalWidth > 0).length };
    });
    await ctx.close();
    return Object.assign({ saveMsg, saveMs, stored: rec, steps }, r);
  },
};

(async () => {
  const port = await freePort();
  const srv = await startServer(port);
  const base = `http://127.0.0.1:${port}/`;
  const browser = await chromium.launch({ headless: true });
  console.log(`perf · ${SID} · 390×844 dpr 2 · CPU ×${CPU} · ${base}`);
  const out = {};
  try {
    for (const k of WANT) {
      const t = Date.now();
      try { out[k] = await TESTS[k](browser, base); } catch (e) { out[k] = { error: String(e).slice(0, 300) }; }
      console.log(`${k.padEnd(9)} ${JSON.stringify(out[k])}  (${((Date.now() - t) / 1000).toFixed(1)} s)`);
    }
  } finally {
    await browser.close();
    srv.kill();
  }
})();
