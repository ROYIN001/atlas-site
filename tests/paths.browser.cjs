// ตรวจรับเส้นทางหลักของผู้อ่าน (S9) ในเบราว์เซอร์จริง — รันมือ ไม่อยู่ใน node --test
//   node tests/paths.browser.cjs                 (ต้องมีแพ็กเกจ playwright ของ Node · ในคลาวด์ใช้ NODE_PATH=$(npm root -g))
//   node tests/paths.browser.cjs 3 5 --width 390 (เลือกบางเส้นทาง/บางความกว้าง)
// ทุกเส้นทางรันที่ 390×844 (มือถือ) และ 1280×800 (จอคอม) · context ใหม่ทุกครั้ง (localStorage ว่าง) · เซิร์ฟเวอร์ไฟล์ของตัวเอง (ห้าม file://)
//   1 ผู้อ่านใหม่: หน้าแรก «เลือกวิชาเพื่อเริ่มเรียน» → เลือกภาค (#/subjects) → วิชาที่มีเนื้อหาเต็ม → หัวข้อแรก (state.topic ถูก · เนื้อหาเติมแล้ว)
//   2 ผู้อ่านเดิม: «เรียนต่อ» → หัวข้อที่ค้าง → «ฝึกเรื่องนี้» ท้ายหัวข้อ → ตอบปากเปล่า → เห็นผลใน #/progress → Back กลับหัวข้อเดิม
//   3 ค้นหาคำรัสเซีย → เปิดผลที่เป็นหัวข้อ → คำถูกไฮไลต์ (mark.q-hit) และอยู่บนจอ → Back → คำค้น ขอบเขต ชนิดผลเหมือนเดิม
//   4 ปากเปล่า: ตอบ 3 ข้อใน #/oral/<วิชา> → รีโหลด → สถานะรายข้อยังอยู่ (atlas-oral-v1 · ตัวเลขบนหน้า · แถบสีในหัวข้อ)
//   5 ออฟไลน์ (?sw=1): เก็บวิชา → ปิดเซิร์ฟเวอร์ → เปิดวิชา: เนื้อหา รูป แบบจำลอง · #/oral/<วิชา> · ค้นหา — รายงานทุกอย่างที่ใช้ไม่ได้
//   6 นำเข้าไฟล์สำรองที่เสีย และไฟล์ที่เขียนลงเครื่องไม่ได้ (พื้นที่เต็มจริง) ผ่านช่องเลือกไฟล์จริงใน #/progress → ข้อมูลเดิมไม่เปลี่ยน
//   7 Flashcard ครบหนึ่งรอบด้วย Tab/Enter/Space ล้วน โฟกัสอยู่บนการ์ด
// ตลอดการทดสอบ: ไม่มี page error / console error · ไม่มีคำขอไปเซิร์ฟเวอร์ภายนอก (บล็อกไว้ และนับเป็น FAIL)
// เส้นทาง 5 ไม่ใช้ context.route (Playwright ข้าม service worker เมื่อดักคำขอ) จึงเฝ้าดูคำขอภายนอกอย่างเดียว ไม่บล็อก
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');

let chromium;
for (const m of ['playwright', '@playwright/test']) {
  try { ({ chromium } = require(m)); break; } catch (e) { /* ลองตัวถัดไป */ }
}
if (!chromium) { try { ({ chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'))); } catch (e) { /* ไม่มี */ } }
if (!chromium) { console.error('ไม่พบแพ็กเกจ playwright ของ Node — ติดตั้งด้วย npm i --no-save playwright หรือรันด้วย NODE_PATH=$(npm root -g)'); process.exit(2); }

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
// เซิร์ฟเวอร์ไฟล์ · stop() ปิดทั้งตัวรับและการเชื่อมต่อ keep-alive ที่ค้าง (ไม่งั้น «ปิดเซิร์ฟเวอร์» ยังส่งไฟล์ได้ทางการเชื่อมต่อเดิม)
function serve() {
  const socks = new Set();
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(ROOT, path.normalize(p));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  srv.on('connection', s => { socks.add(s); s.on('close', () => socks.delete(s)); });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({
    base: 'http://127.0.0.1:' + srv.address().port + '/',
    stop: () => new Promise(done => { srv.close(() => done()); socks.forEach(s => s.destroy()); }),
  })));
}

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const ONLY_W = opt('--width');
const PICK = args.filter((a, i) => /^[1-7]$/.test(a) && !(i > 0 && args[i - 1].startsWith('--')));
const VPS = [
  { tag: '390', mobile: true, ctx: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  { tag: '1280', mobile: false, ctx: { viewport: { width: 1280, height: 800 } } },
].filter(v => !ONLY_W || v.tag === ONLY_W);
const QA_INDEX = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/qa/_index.json'), 'utf8'));
const SHOTS = fs.mkdtempSync(path.join(os.tmpdir(), 'paths-'));

const results = [];
let TAG = '';
const check = (name, ok, info) => {
  results.push({ name: TAG + name, ok: !!ok });
  console.log((ok ? 'ok   ' : 'FAIL ') + TAG + name + (info !== undefined ? '  — ' + JSON.stringify(info) : ''));
};
const note = (name, info) => console.log('info ' + TAG + name + (info !== undefined ? '  — ' + JSON.stringify(info) : ''));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const EXT = /^https?:\/\/(?!127\.0\.0\.1[:/])/;

// ---------- ตัวช่วยในหน้า ----------
const ready = pg => pg.waitForFunction(() => typeof state !== 'undefined' && typeof go === 'function' && document.querySelector('#view h1'), null, { timeout: 60000 });
const SNAP = `(() => {
  const cur = state.v === 'subject' && typeof currentTopicEl === 'function' ? currentTopicEl() : null;
  return { v: state.v, id: state.id || null, topic: state.topic || null, cur: cur && cur.id, hash: decodeURIComponent(location.hash),
    busy: typeof NAVBUSY !== 'undefined' && !!NAVBUSY, y: Math.round(scrollY), h: document.documentElement.scrollHeight,
    loading: !!document.querySelector('#view .tbody:not([data-lazy]) > .tload:not(.tfail)') };
})()`;
// รอจนงานกระโดดจบ ไม่มีหัวข้อกำลังเติม และ scrollY + ความสูงหน้านิ่ง quiet ms ติดกัน
async function settle(pg, quiet = 1200, max = 40000) {
  const t0 = Date.now();
  let prev = '', since = Date.now(), s;
  while (Date.now() - t0 < max) {
    s = await pg.evaluate(SNAP);
    const k = s.busy || s.loading ? 'busy' + Date.now() : s.y + '/' + s.h;
    if (k !== prev) { prev = k; since = Date.now(); } else if (Date.now() - since >= quiet) return s;
    await sleep(100);
  }
  return pg.evaluate(SNAP);
}
// กดปุ่มแรกที่มองเห็นจริงจากรายการ (เมนูเดียวกันอยู่คนละที่บนมือถือ/จอคอม: #bbar · แถบไอคอน · เมนูซ้าย · ชิปหัวข้อ · สารบัญขวา)
async function clickFirst(pg, sels) {
  const sel = await pg.evaluate(sels => sels.find(s => {
    const e = document.querySelector(s);
    if (!e || !e.getClientRects().length) return false;
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    return cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
  }) || null, sels);
  if (!sel) throw new Error('ไม่พบปุ่มที่มองเห็นได้: ' + sels.join(' | '));
  await pg.click(sel);
  return sel;
}
const menu = (pg, href) => clickFirst(pg, ['#bbar a[href="' + href + '"]', '.rmini a[href="' + href + '"]', '#nav a[href="' + href + '"]']);
const openTopicUi = (pg, id) => clickFirst(pg, ['#view .topic-nav [data-jump="' + id + '"]', '#view .toc [data-toc="' + id + '"]']);
const topicFilled = (pg, id, timeout = 30000) => pg.waitForFunction(id => {
  const b = document.querySelector('section.topic#' + CSS.escape(id) + ' > .tbody');
  return b && b.dataset.lazy === undefined && !b.querySelector(':scope > .tload') && b.textContent.trim().length > 200;
}, id, { timeout });
async function typeSearch(pg, q, mobile) {
  if (mobile) await clickFirst(pg, ['#bbar [data-bb="find"]', '#search']); else await pg.click('#search');
  await pg.waitForFunction(() => document.activeElement && document.activeElement.id === 'search');
  await pg.keyboard.type(q, { delay: 25 });
  await pg.waitForFunction(q => state.v === 'search' && state.q === q, q, { timeout: 15000 });
}
const atlasData = pg => pg.evaluate(() => {
  const o = {};
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('atlas-') && k !== 'atlas-backup-prev') o[k] = localStorage.getItem(k); }
  return o;
});

// ---------- เส้นทาง ----------
const PATHS = {
  // 1 ผู้อ่านใหม่
  async 1(pg, vp, base) {
    await pg.goto(base + '#/'); await ready(pg); await sleep(300);
    let r = await pg.evaluate(() => { const c = document.querySelector('#view .s2-cta');
      return { t: c && c.textContent.replace(/\s+/g, ' ').trim(), href: c && c.getAttribute('href'), b: c && Math.round(c.getBoundingClientRect().bottom),
        keys: Object.keys(localStorage).filter(k => /^atlas-(sula|last|mysem|oral|practice|srs)/.test(k)) }; });
    check('P1 หน้าแรก (ที่เก็บว่าง): «เลือกวิชาเพื่อเริ่มเรียน» อยู่ในจอแรก ลิงก์ไป #/subjects', /เลือกวิชาเพื่อเริ่มเรียน/.test(r.t || '') && r.href === '#/subjects' &&
      r.b <= vp.ctx.viewport.height && r.keys.length === 0, r);
    await pg.click('#view .s2-cta');
    await pg.waitForFunction(() => state.v === 'subjects' && document.querySelector('#view .mysem [data-mysem]'));
    check('P1 กด → #/subjects มีตัวเลือกภาค', true);
    await pg.click('#view .mysem [data-mysem="5"]');
    await pg.waitForFunction(() => localStorage.getItem('atlas-mysem-v1') === '5' && document.querySelector('#view .mysem [data-mysem="5"][aria-pressed="true"]'));
    r = await pg.evaluate(() => ({ cur: curSem(), hash: location.hash, back: history.length }));
    check('P1 เลือกภาค 5 → curSem() = 5 · จำไว้ใน atlas-mysem-v1 · ยังอยู่ #/subjects', r.cur === 5 && r.hash === '#/subjects', r);
    await pg.selectOption('#view [data-f="sem"]', 'mine');
    await pg.check('#view [data-f="deep"]');
    await sleep(200);
    r = await pg.evaluate(() => ({ vis: [...document.querySelectorAll('#view .subj[data-go]')].filter(e => e.offsetParent).map(e => e.dataset.go),
      want: runningIn(5).filter(s => DEEP[s.id]).map(s => s.id) }));
    check('P1 ตัวกรอง «ภาคของฉัน» + «เนื้อหาเต็ม» = วิชาเนื้อหาเต็มของภาค 5', r.vis.length > 0 && r.vis.slice().sort().join() === r.want.slice().sort().join(), r);
    const sid = r.vis[0];
    await pg.click('#view .subj[data-go="' + sid + '"]');
    await pg.waitForFunction(sid => state.v === 'subject' && state.id === sid && document.querySelector('#view section.topic'), sid);
    const hasSum = await pg.evaluate(() => !!document.querySelector('#view .modebar [data-mode="full"]'));
    if (hasSum && await pg.evaluate(() => curMode() !== 'full')) {
      await pg.click('#view .modebar [data-mode="full"]');
      await pg.waitForFunction(() => curMode() === 'full' && document.querySelector('#view section.topic .topic-check'));
    }
    const first = await pg.evaluate(sid => DEEP[sid].topics[0].id, sid);
    const used = await openTopicUi(pg, first);
    await pg.waitForFunction(id => state.topic === id, first, { timeout: 10000 });
    await topicFilled(pg, first);
    const s = await settle(pg);
    r = await pg.evaluate(id => { const b = document.querySelector('#' + CSS.escape(id) + ' > .tbody');
      return { len: b.textContent.trim().length, tfail: !!b.querySelector('.tfail'), last: JSON.parse(localStorage.getItem('atlas-last-v1') || 'null') }; }, first);
    check('P1 เปิดวิชา ' + sid + ' → หัวข้อแรก ' + first + ' (ผ่าน ' + used.replace(/\[.*$/, '') + '): state.topic · ที่อยู่ · จอ · เนื้อหาเติมแล้ว',
      s.topic === first && s.cur === first && s.hash === '#/' + sid + '/' + first && r.len > 200 && !r.tfail && r.last && r.last.topic === first,
      { s, len: r.len, last: r.last && r.last.topic });
  },

  // 2 ผู้อ่านเดิม
  async 2(pg, vp, base) {
    const SID = 'tau', TID = 'tau-6';
    await pg.goto(base + '#/'); await ready(pg);
    await pg.evaluate(([sid, tid]) => {
      localStorage.setItem('atlas-last-v1', JSON.stringify({ v: 'subject', id: sid, mode: 'full', topic: tid, off: 0 }));
      localStorage.setItem('atlas-sula-v1', JSON.stringify(['k:tau-1', 'k:tau-2']));
    }, [SID, TID]);
    await pg.reload(); await ready(pg); await sleep(300);
    let r = await pg.evaluate(() => { const c = document.querySelector('#view .s2-cta'); return { t: c.textContent.replace(/\s+/g, ' ').trim(), href: c.getAttribute('href') }; });
    check('P2 หน้าแรก (มีที่อ่านค้าง): «เรียนต่อ» ลิงก์ไป #/' + SID + '/' + TID, /เรียนต่อ/.test(r.t) && r.href === '#/' + SID + '/' + TID, r);
    await pg.click('#view .s2-cta');
    await pg.waitForFunction(([sid, tid]) => state.v === 'subject' && state.id === sid && state.topic === tid, [SID, TID]);
    await topicFilled(pg, TID);
    let s = await settle(pg);
    check('P2 «เรียนต่อ» → หัวข้อที่ค้าง อยู่บนจอ ที่อยู่ตรง', s.cur === TID && s.topic === TID && s.hash === '#/' + SID + '/' + TID, s);

    const pr = '#' + TID + ' > .tbody > nav.tend a.tend-pr';
    await pg.waitForSelector(pr, { state: 'attached', timeout: 15000 });
    check('P2 ท้ายหัวข้อมี «ฝึกเรื่องนี้» → #/practice/' + SID + '/' + TID, await pg.$eval(pr, a => a.getAttribute('href')) === '#/practice/' + SID + '/' + TID);
    await pg.click(pr);
    await pg.waitForFunction(() => state.v === 'practice' && document.querySelector('#s5Topic'));
    r = await pg.evaluate(sid => ({ subj: (document.querySelector('#s5Subjs [data-sid="' + sid + '"]') || {}).getAttribute?.('aria-pressed'), topic: document.getElementById('s5Topic').value }), SID);
    check('P2 หน้าฝึกทบทวน: เลือกวิชาและหัวข้อไว้ให้แล้ว', r.subj === 'true' && r.topic === TID, r);
    await pg.waitForSelector('.s5-mode.oral a.btn.s5-primary', { timeout: 15000 });
    await pg.click('.s5-mode.oral a.btn.s5-primary');
    await pg.waitForFunction(() => state.v === 'oral' && document.querySelector('#s5Q'), null, { timeout: 15000 });
    await pg.fill('#s5Pts', 'ประเด็นทดสอบ');
    await pg.click('#s5Show');
    await pg.waitForSelector('#s5Ans:not([hidden]) .s5-rate');
    const qid = await pg.$eval('.s5-card', e => e.dataset.qid);
    await pg.click('.s5-rate [data-r="5"]');
    r = await pg.evaluate(k => { const o = JSON.parse(localStorage.getItem('atlas-oral-v1') || '{}'); return { rec: o[k] || null, n: Object.keys(o).length }; }, SID + '/' + TID + '/' + qid);
    check('P2 ตอบปากเปล่า 1 ข้อ (ครบ) → atlas-oral-v1', r.rec && r.rec.r === 5 && r.n === 1, r);

    await menu(pg, '#/progress');
    await pg.waitForFunction(() => state.v === 'progress' && document.querySelector('#view .s2-kpi'));
    r = await pg.evaluate(() => {
      const row = [...document.querySelectorAll('#view .s6-tab tbody tr')].find(tr => /ปากเปล่า/.test(tr.querySelector('th').textContent));
      return { oral: row ? [...row.querySelectorAll('td')].map(td => td.textContent.trim()) : null,
        read: (document.querySelector('#view .s2-kpi[data-kpi="read"] b') || {}).textContent, tau: (document.querySelector('#view .s2-prow a[href="#/tau"]') || {}).closest?.('.s2-prow')?.textContent.replace(/\s+/g, ' ') };
    });
    check('P2 #/progress: คำตอบปากเปล่าเข้าตารางทวน (แถว «ปากเปล่า» อยู่ในตาราง 1) · อ่านแล้ว 2', r.oral && r.oral[2] === '1' && /^2 \//.test(r.read || ''), r);

    const seen = [];
    for (let i = 0; i < 6; i++) {
      const v = await pg.evaluate(() => state.v);
      if (v === 'subject') break;
      await pg.goBack();
      await pg.waitForFunction(prev => state.v !== prev || location.hash.indexOf(prev) < 0, v, { timeout: 10000 }).catch(() => {});
      await sleep(300);
      seen.push(await pg.evaluate(() => state.v + ' ' + decodeURIComponent(location.hash)));
    }
    s = await settle(pg);
    check('P2 Back (' + seen.length + ' ครั้ง: ' + seen.join(' → ') + ') → กลับหัวข้อเดิม ' + TID + ' บนจอ',
      s.v === 'subject' && s.topic === TID && s.cur === TID && s.hash === '#/' + SID + '/' + TID, s);
  },

  // 3 ค้นหา → ไฮไลต์ → Back · ทดสอบสองผล: ผลแรกตามที่ผู้อ่านกด (ผลที่ชื่อหัวข้อตรงขึ้นก่อน) และผลแรกที่คำอยู่ในเนื้อหา (มี <mark> ใน snippet)
  async 3(pg, vp, base) {
    const SID = 'tau', Q = 'устойчивость';
    await pg.goto(base + '#/' + SID); await ready(pg);
    await pg.waitForFunction(sid => state.v === 'subject' && state.id === sid, SID);
    await typeSearch(pg, Q, vp.mobile);
    await pg.click('#sxScope [data-scope="subj"]');
    await pg.waitForFunction(sid => IXST[sid] === 'ok' && document.querySelector('#sxKind [data-kind="topic"]:not([disabled])'), SID, { timeout: 60000 });
    await pg.click('#sxKind [data-kind="topic"]');
    await sleep(300);
    const SXS = () => pg.evaluate(() => ({ q: document.getElementById('search').value, hash: decodeURIComponent(location.hash),
      scope: (document.querySelector('#sxScope [aria-pressed="true"]') || {}).dataset?.scope, kind: (document.querySelector('#sxKind [aria-pressed="true"]') || {}).dataset?.kind,
      res: [...document.querySelectorAll('#sxRes a.res-item')].map(a => ({ i: a.dataset.i, href: a.getAttribute('href'), body: !!a.querySelector('.snip mark') })) }));
    const before = await SXS();
    check('P3 ค้น «' + Q + '» จากหน้า ТАУ → ขอบเขต «วิชานี้» + ชนิด «หัวข้อ» มีผลเป็นลิงก์หัวข้อ',
      before.scope === 'subj' && before.kind === 'topic' && before.res.length > 0 && before.res.every(x => x.href.startsWith('#/' + SID + '/')),
      Object.assign({}, before, { res: before.res.map(x => x.href + (x.body ? '' : ' (ชื่อหัวข้อ)')) }));
    const picks = [before.res[0]];
    const inBody = before.res.find(x => x.body);
    if (inBody && inBody !== before.res[0]) picks.push(inBody);
    for (const x of picks) {
      const want = x.href.split('/')[2], label = x === before.res[0] ? 'ผลแรก' : 'ผลแรกที่คำอยู่ในเนื้อหา';
      await pg.click('#sxRes a.res-item[data-i="' + x.i + '"]');
      await pg.waitForFunction(([sid, t]) => state.v === 'subject' && state.id === sid && state.topic === t, [SID, want], { timeout: 15000 });
      await pg.waitForFunction(t => document.querySelector('#' + CSS.escape(t) + ' mark.q-hit'), want, { timeout: 20000 }).catch(() => {});
      const s = await settle(pg);
      const r = await pg.evaluate(([t, q]) => {
        const sec = document.getElementById(t), ms = [...sec.querySelectorAll('mark.q-hit')], m = ms[0], top = navOffset() - 12;
        const on = b => b.height > 0 && b.top >= top - 2 && b.bottom <= innerHeight;
        const h2 = sec.querySelector('.topic-head h2'), hb = h2.getBoundingClientRect();
        const o = { n: ms.length, titleHasWord: h2.textContent.toLowerCase().includes(q), titleOnScreen: on(hb),
          bodyHasWord: sec.querySelector('.tbody').textContent.toLowerCase().includes(q) };
        if (m) { const b = m.getBoundingClientRect(); Object.assign(o, { text: m.textContent, top: Math.round(b.top), bar: top, onScreen: on(b) }); }
        return o;
      }, [want, Q]);
      check('P3 ' + label + ' (' + want + (x.body ? ' · คำอยู่ในเนื้อหา' : ' · ตรงที่ชื่อหัวข้อ') + '): คำค้นถูกไฮไลต์ mark.q-hit และไฮไลต์แรกอยู่บนจอใต้แถบบน',
        r.n > 0 && r.onScreen && s.topic === want, { r, topic: s.topic, cur: s.cur });
      await pg.goBack();
      await pg.waitForFunction(() => state.v === 'search' && document.querySelector('#sxRes a.res-item'), null, { timeout: 15000 });
      await sleep(400);
      const after = await SXS();
      check('P3 Back จาก ' + want + ' → คำค้น · ที่อยู่ · ขอบเขต · ชนิดผล · รายการผล เหมือนเดิม',
        after.q === before.q && after.hash === before.hash && after.scope === before.scope && after.kind === before.kind &&
        after.res.map(y => y.href).join() === before.res.map(y => y.href).join(),
        { before: Object.assign({}, before, { res: before.res.length }), after: Object.assign({}, after, { res: after.res.length }) });
    }
  },

  // 4 ปากเปล่า 3 ข้อ → รีโหลด
  async 4(pg, vp, base) {
    const SID = 'tau', N = QA_INDEX[SID].n;
    await pg.goto(base + '#/oral/' + SID); await ready(pg);
    await pg.waitForSelector('.s5-oral[data-total] #s5Q', { timeout: 20000 });
    const answered = {};
    for (const rr of [5, 3, 1]) {
      await pg.fill('#s5Pts', 'ประเด็นทดสอบ');
      await pg.click('#s5Show');
      await pg.waitForSelector('#s5Ans:not([hidden]) .s5-rate');
      answered[await pg.$eval('.s5-card', e => e.dataset.qid)] = rr;
      await pg.click('.s5-rate [data-r="' + rr + '"]');
    }
    await pg.waitForSelector('.s5-sum');
    check('P4 ตอบครบ 3 ข้อ → สรุปชุด 3 รายการ', await pg.$$eval('.s5-res li', l => l.length) === 3);
    await pg.reload(); await ready(pg);
    await pg.waitForSelector('.s5-oral[data-total]', { timeout: 20000 });
    await pg.waitForFunction(() => /ตอบแล้ว/.test(document.getElementById('s5Stat').textContent), null, { timeout: 10000 }).catch(() => {});
    const r = await pg.evaluate(() => ({ store: JSON.parse(localStorage.getItem('atlas-oral-v1') || '{}'), stat: document.getElementById('s5Stat').textContent }));
    const keys = Object.keys(r.store);
    const okKeys = keys.length === 3 && keys.every(k => { const p = k.split('/'); return p[0] === SID && answered[p[2]] === r.store[k].r && r.store[k].n === 1; });
    check('P4 รีโหลดแล้ว atlas-oral-v1 มี 3 ข้อ คะแนนตรงรายข้อ (5/3/1)', okKeys, { keys, answered });
    check('P4 รีโหลดแล้วบนหน้าแสดง «ตอบแล้ว 3/' + N + ' · ครบ 1 · บางส่วน 1 · ไม่ได้ 1»', new RegExp('ตอบแล้ว 3/' + N + ' · ครบ 1 · บางส่วน 1 · ไม่ได้ 1').test(r.stat), r.stat);
    // แถบสีในหัวข้อ: details.qa[data-oral] ของข้อที่ตอบ «ไม่ได้» (r = 1)
    const k1 = keys.find(k => r.store[k].r === 1);
    if (k1) {
      const [, tid, qid] = k1.split('/');
      await pg.evaluate(h => { location.hash = h; }, '#/' + SID + '/' + tid + '/' + qid);
      await pg.waitForFunction(id => { const d = document.getElementById(id); return d && d.dataset.oral; }, qid, { timeout: 30000 }).catch(() => {});
      const o = await pg.evaluate(id => { const d = document.getElementById(id); return d ? { oral: d.dataset.oral || null, open: d.open } : null; }, qid);
      check('P4 หัวข้อ ' + tid + ': details.qa ของข้อที่ตอบไม่ได้มีแถบสี data-oral="1"', o && o.oral === '1', o);
    }
  },

  // 5 ออฟไลน์
  async 5(pg, vp, base, env) {
    const SID = 'suka', Q = 'гироскоп';
    const own = await serve();                      // เซิร์ฟเวอร์ของเส้นทางนี้เอง (ปิดได้โดยไม่กระทบเส้นทางอื่น) · ?sw=1 ให้ service worker ลงทะเบียนบน 127.0.0.1
    const B = own.base + '?sw=1';
    try {
      await pg.goto(B + '#/' + SID + '/full'); await ready(pg);
      await pg.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 30000 })
        .catch(() => pg.reload().then(() => pg.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 30000 })));
      await pg.waitForSelector('#offlBtn', { timeout: 30000 });
      await pg.click('#offlBtn');
      await pg.waitForFunction(() => /เก็บครบ|ไม่สำเร็จ/.test((document.getElementById('offlMsg') || {}).textContent || ''), null, { timeout: 300000 });
      const msg = await pg.$eval('#offlMsg', e => e.textContent);
      const rec = await pg.evaluate(sid => (JSON.parse(localStorage.getItem('atlas-offline-v1') || '{}')[sid]) || null, SID);
      check('P5 กด «เก็บวิชานี้ไว้อ่านออฟไลน์» (' + SID + ') → เก็บครบ', /เก็บครบ/.test(msg) && rec && rec.urls && rec.urls.length > 0, { msg, n: rec && rec.n, urls: rec && rec.urls && rec.urls.length });
    } finally {
      await own.stop();
    }
    await env.ctx.setOffline(true);
    await pg.close();
    pg = await env.page();
    // เปิดวิชาใหม่ทั้งหน้า (ไม่มีอะไรค้างในหน่วยความจำ) แล้วเติมทุกหัวข้อ + เลื่อนผ่านทั้งหน้าให้รูปโหลด
    await pg.goto(B + '#/' + SID + '/full');
    await ready(pg);
    await pg.waitForFunction(sid => state.id === sid && document.querySelector('#view section.topic'), SID, { timeout: 30000 });
    await pg.evaluate(() => fillAllBodies());
    await pg.waitForFunction(() => !document.querySelector('#view .tbody[data-lazy], #view .tbody > .tload:not(.tfail)'), null, { timeout: 60000 }).catch(() => {});
    for (let pass = 0; pass < 2; pass++) {
      await pg.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight - 100) { scrollTo(0, y); await new Promise(r => setTimeout(r, 50)); } });
      await sleep(1500);
    }
    let r = await pg.evaluate(() => {
      const v = document.getElementById('view'), imgs = [...v.querySelectorAll('figure.ifig[data-fig] img')];
      return { online: navigator.onLine, netbar: !!document.getElementById('netbar'), boxes: v.querySelectorAll('.tbody').length,
        filled: v.querySelectorAll('.tbody:not([data-lazy])').length, tfail: v.querySelectorAll('.tfail').length,
        demos: v.querySelectorAll('[data-demo]').length,
        canvas: v.querySelectorAll('canvas').length + [...v.querySelectorAll('[data-demo^="ih-"]')].filter(h => h.children.length && !h.querySelector('canvas')).length,
        demoFail: v.querySelectorAll('.demo-fail').length, figs: imgs.length, figsOk: imgs.filter(i => i.complete && i.naturalWidth > 0).length,
        figsBad: imgs.filter(i => !(i.complete && i.naturalWidth > 0)).slice(0, 5).map(i => i.closest('figure').dataset.fig) };
    });
    check('P5 ออฟไลน์: เปิด ' + SID + ' ได้ ทุกหัวข้อเติมครบ ไม่มี .tfail', !r.online && r.boxes > 0 && r.filled === r.boxes && r.tfail === 0, r);
    check('P5 ออฟไลน์: แบบจำลองติดตั้งครบ (canvas = data-demo · ไม่มี .demo-fail)', r.demos > 0 && r.canvas === r.demos && r.demoFail === 0, { demos: r.demos, canvas: r.canvas, demoFail: r.demoFail });
    check('P5 ออฟไลน์: รูปทุกใบโหลดได้ (naturalWidth > 0)', r.figs > 0 && r.figsOk === r.figs, { figs: r.figs, ok: r.figsOk, bad: r.figsBad });
    // ปากเปล่าออฟไลน์
    await pg.evaluate(h => { location.hash = h; }, '#/oral/' + SID);
    await pg.waitForFunction(() => state.v === 'oral' && (document.querySelector('.s5-oral[data-total]') || /ไม่สำเร็จ/.test((document.getElementById('s5Stat') || {}).textContent || '')), null, { timeout: 20000 }).catch(() => {});
    r = await pg.evaluate(() => ({ total: +((document.querySelector('.s5-oral') || {}).dataset || {}).total || 0, q: !!document.getElementById('s5Q'),
      stat: (document.getElementById('s5Stat') || {}).textContent || '' }));
    check('P5 ออฟไลน์: #/oral/' + SID + ' เปิดได้ คำถามครบ ' + QA_INDEX[SID].n + ' ข้อ', r.q && r.total === QA_INDEX[SID].n, r);
    // ค้นหาออฟไลน์ (เริ่มจากหน้าวิชาที่เก็บไว้ · ขอบเขตทุกวิชา)
    await pg.evaluate(h => { location.hash = h; }, '#/' + SID);
    await pg.waitForFunction(sid => state.v === 'subject' && state.id === sid, SID);
    await typeSearch(pg, Q, vp.mobile);
    await pg.waitForFunction(() => IX_SUBJ && !ixBusy(), null, { timeout: 60000 }).catch(() => {});
    await sleep(600);
    r = await pg.evaluate(sid => ({ ixOk: Object.keys(IXST).filter(k => IXST[k] === 'ok'), ixFail: Object.keys(IXST).filter(k => IXST[k] === 'fail'),
      st: (document.querySelector('#sxStatus .sx-st') || {}).dataset?.st || '', stTxt: ((document.querySelector('#sxStatus .sx-st span') || {}).textContent || '').slice(0, 160),
      topics: [...document.querySelectorAll('#sxRes a.res-item')].map(a => a.getAttribute('href')).filter(h => h.startsWith('#/' + sid + '/')).length,
      all: document.querySelectorAll('#sxRes a.res-item').length }), SID);
    check('P5 ออฟไลน์: ค้น «' + Q + '» เจอหัวข้อของวิชาที่เก็บไว้ (ดัชนี ' + SID + ' โหลดจากสำเนา)', r.ixOk.includes(SID) && r.topics > 0, r);
    check('P5 ออฟไลน์: หน้าผลบอกว่าค้นได้ไม่ครบเพราะออฟไลน์ (สถานะ part ไม่ค้าง «กำลังโหลด»)', r.st === 'part' && /ออฟไลน์/.test(r.stTxt), { st: r.st, stTxt: r.stTxt });
    note('P5 ออฟไลน์: ดัชนีวิชาที่ใช้ไม่ได้ (ไม่ได้เก็บไว้ — คาดไว้แล้ว)', r.ixFail);
    // วิชาที่ไม่ได้เก็บ: หัวข้อต้องขึ้น «โหลดไม่สำเร็จ» พร้อมปุ่มลองใหม่ ไม่ค้าง «กำลังโหลด»
    await pg.evaluate(h => { location.hash = h; }, '#/toe/full');
    await pg.waitForFunction(() => state.id === 'toe' && document.querySelector('#view section.topic .tbody:not([data-lazy]) .tfail'), null, { timeout: 20000 }).catch(() => {});
    r = await pg.evaluate(() => ({ tfail: document.querySelectorAll('#view .tfail').length, retry: document.querySelectorAll('#view .tfail [data-retry]').length }));
    check('P5 ออฟไลน์: วิชาที่ไม่ได้เก็บ (toe) ขึ้น «โหลดไม่สำเร็จ» + ปุ่มลองใหม่ ไม่ค้าง', r.tfail > 0 && r.retry === r.tfail, r);
    return pg;
  },

  // 6 นำเข้าไฟล์เสีย / ไฟล์ที่เขียนลงเครื่องไม่ได้
  async 6(pg, vp, base) {
    await pg.goto(base + '#/'); await ready(pg);
    await pg.evaluate(() => {
      localStorage.setItem('atlas-sula-v1', JSON.stringify(['k:tau-1', 'k:tau-2', 'k:nav-3']));
      localStorage.setItem('atlas-oral-v1', JSON.stringify({ 'tau/tau-6/qa-x': { r: 3, t: 1, n: 1 } }));
      localStorage.setItem('atlas-mysem-v1', '5');
    });
    await pg.reload(); await ready(pg);
    await menu(pg, '#/progress');
    await pg.waitForFunction(() => state.v === 'progress' && document.getElementById('bkLoad'));
    const dialogs = [];
    pg.on('dialog', d => { dialogs.push(d.message().slice(0, 300)); d.accept(); });
    const pick = async (name, buffer) => {
      await pg.evaluate(() => { window.__noReload = 1; document.getElementById('bkMsg').textContent = ''; });
      const [fc] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('#bkLoad')]);
      await fc.setFiles({ name, mimeType: 'application/json', buffer });
      await pg.waitForFunction(() => !window.__noReload || /นำเข้าไม่สำเร็จ/.test(document.getElementById('bkMsg').textContent), null, { timeout: 60000 }).catch(() => {});
      await sleep(300);
      return pg.evaluate(() => ({ reloaded: !window.__noReload, msg: (document.getElementById('bkMsg') || {}).textContent || '' }));
    };
    const want = await atlasData(pg);

    // (ก) ไฟล์เสีย: JSON ขาดกลางทาง
    let r = await pick('broken.json', Buffer.from('{"app":"atlas-site","v":2,"data":{"atlas-sula-v1":"[\\"k:x'));
    let now = await atlasData(pg);
    check('P6 ไฟล์เสีย (JSON ขาด) → ปฏิเสธพร้อมเหตุผล ไม่ถาม ไม่รีโหลด ข้อมูลเดิมครบ', !r.reloaded && /นำเข้าไม่สำเร็จ/.test(r.msg) && dialogs.length === 0 &&
      JSON.stringify(now) === JSON.stringify(want), { msg: r.msg, dialogs: dialogs.length, same: JSON.stringify(now) === JSON.stringify(want) });
    // (ข) ไฟล์ของเว็บนี้แต่ค่าผิดรูปแบบ
    r = await pick('bad-key.json', Buffer.from(JSON.stringify({ app: 'atlas-site', v: 2, schema: 2, data: { 'atlas-sula-v1': 'ไม่ใช่ JSON' } })));
    now = await atlasData(pg);
    check('P6 ไฟล์ค่าผิดรูปแบบ → ปฏิเสธ ข้อมูลเดิมครบ', !r.reloaded && /รูปแบบไม่ถูกต้อง/.test(r.msg) && dialogs.length === 0 && JSON.stringify(now) === JSON.stringify(want), { msg: r.msg });
    // (ค) ไฟล์ถูกรูปแบบแต่เขียนลงเครื่องไม่ได้: ค่าหนึ่งใหญ่เกินโควตา localStorage จริง (setItem โยน QuotaExceededError กลางทาง หลังเขียนคีย์แรกไปแล้ว)
    const big = { app: 'atlas-site', v: 2, schema: 2, saved: '2026-10-01T00:00:00.000Z',
      data: { 'atlas-sula-v1': JSON.stringify(['k:from-file']), 'atlas-zz-huge-v1': 'x'.repeat(12 * 1024 * 1024) } };
    r = await pick('too-big.json', Buffer.from(JSON.stringify(big)));
    now = await atlasData(pg);
    const prev = await pg.evaluate(() => { try { return Object.keys(JSON.parse(localStorage.getItem('atlas-backup-prev')).data); } catch (e) { return null; } });
    const diff = Object.keys(Object.assign({}, want, now)).filter(k => want[k] !== now[k]);
    check('P6 ไฟล์ที่ setItem ล้ม (พื้นที่เต็ม) → ถามยืนยัน 1 ครั้ง · แจ้ง «คืนข้อมูลเดิมครบแล้ว» · ไม่รีโหลด · ข้อมูลเดิมครบทุกคีย์',
      !r.reloaded && dialogs.length === 1 && /เต็ม/.test(r.msg) && /คืนข้อมูลเดิมครบแล้ว/.test(r.msg) && diff.length === 0, { msg: r.msg, dialogs: dialogs.length, diff, prevKeys: prev });
    // ผู้อ่านเห็นข้อมูลเดิมหลังโหลดหน้าใหม่
    await pg.reload(); await ready(pg);
    await pg.waitForFunction(() => state.v === 'progress' && document.querySelector('#view .s2-kpi[data-kpi="read"] b'));
    r = await pg.evaluate(() => ({ read: document.querySelector('#view .s2-kpi[data-kpi="read"] b').textContent, sem: curSem() }));
    check('P6 รีโหลดแล้ว #/progress ยังเห็นข้อมูลเดิม (อ่านแล้ว 3 · ภาค 5)', /^3 \//.test(r.read) && r.sem === 5, r);
  },

  // 7 Flashcard ด้วยคีย์บอร์ดล้วน
  async 7(pg, vp, base) {
    await pg.goto(base + '#/flash/phr'); await ready(pg);
    await pg.waitForSelector('#fc');
    const total = await pg.$eval('#fPos', e => +e.textContent.split('/')[1]);
    let tabs = 0;
    for (; tabs < 120 && await pg.evaluate(() => document.activeElement && document.activeElement.id) !== 'fc'; tabs++) await pg.keyboard.press('Tab');
    const at = await pg.evaluate(() => document.activeElement && document.activeElement.id);
    check('P7 Tab ถึงการ์ด (' + tabs + ' ครั้ง)', at === 'fc', at);
    if (at !== 'fc') return;
    const bad = [];
    let yes = 0;
    for (let i = 0; i < total; i++) {
      await pg.keyboard.press(i % 2 ? 'Space' : 'Enter');
      const st = await pg.evaluate(() => ({ f: document.activeElement.id, p: document.getElementById('fc').getAttribute('aria-pressed') }));
      if (st.f !== 'fc' || st.p !== 'true') bad.push('ใบ ' + (i + 1) + ' พลิก: ' + JSON.stringify(st));
      if (i % 2) {                                   // ใบคู่: Tab → «ยังไม่แม่น» Enter
        await pg.keyboard.press('Tab');
        if (await pg.evaluate(() => document.activeElement.id) !== 'fNo') bad.push('ใบ ' + (i + 1) + ' Tab ไม่ถึง fNo');
        await pg.keyboard.press('Enter');
      } else {                                       // ใบคี่: Tab Tab → «จำได้» Space
        await pg.keyboard.press('Tab'); await pg.keyboard.press('Tab');
        if (await pg.evaluate(() => document.activeElement.id) !== 'fYes') bad.push('ใบ ' + (i + 1) + ' Tab ไม่ถึง fYes');
        await pg.keyboard.press('Space'); yes++;
      }
      const f = await pg.evaluate(() => document.activeElement && document.activeElement.id);
      if (i < total - 1 && f !== 'fc') bad.push('ใบ ' + (i + 2) + ' โฟกัสอยู่ที่ ' + f);
    }
    check('P7 Flashcard ' + total + ' ใบ: พลิกด้วย Enter/Space · ให้คะแนนด้วย Tab+Enter/Space · โฟกัสกลับมาที่การ์ดทุกใบ', bad.length === 0, bad.slice(0, 5));
    await pg.waitForSelector('#fDone', { timeout: 5000 }).catch(() => {});
    const r = await pg.evaluate(() => ({ f: document.activeElement && document.activeElement.id, done: (document.querySelector('#fDone .fnote') || {}).textContent,
      terms: Object.keys((JSON.parse(localStorage.getItem('atlas-practice-v1') || '{}'))._terms || {}).length }));
    check('P7 จบรอบ → โฟกัสที่สรุป · «จำได้ ' + yes + ' จาก ' + total + '» · บันทึกผลครบทุกใบ', r.f === 'fDone' && r.done === 'จำได้ ' + yes + ' จาก ' + total + ' ใบ' && r.terms === total, r);
  },
};

(async () => {
  const main = await serve();
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const list = Object.keys(PATHS).filter(k => !PICK.length || PICK.includes(k));
  const t0 = Date.now();
  try {
    for (const k of list) for (const vp of VPS) {
      TAG = '[' + vp.tag + '] ';
      const sw = k === '5';
      const ctx = await browser.newContext(vp.ctx);
      const errors = [], consoleErr = [], external = new Set();
      if (!sw) await ctx.route(EXT, r => { external.add(r.request().url()); return r.abort(); });
      ctx.on('request', r => { if (EXT.test(r.url())) external.add(r.url()); });
      const page = async () => {
        const p = await ctx.newPage();
        p.on('pageerror', e => errors.push(String(e.message || e).slice(0, 200)));
        p.on('console', m => {
          if (m.type() !== 'error') return;
          const t = m.text();
          if (sw && /Failed to load resource|ERR_INTERNET_DISCONNECTED|ERR_CONNECTION_REFUSED|Failed to fetch/.test(t)) return;   // ออฟไลน์: คำขอที่ล้มเป็นเรื่องปกติ
          consoleErr.push(t.slice(0, 200));
        });
        return p;
      };
      let pg = await page();
      const t1 = Date.now();
      try {
        const ret = await PATHS[k](pg, vp, main.base, { ctx, page });
        if (ret) pg = ret;
      } catch (e) {
        const shot = path.join(SHOTS, 'p' + k + '-' + vp.tag + '.png');
        await pg.screenshot({ path: shot }).catch(() => {});
        const st = await pg.evaluate(() => typeof state !== 'undefined' ? JSON.stringify(state) + ' ' + location.hash : location.href).catch(() => '?');
        check('P' + k + ' ทำจนจบเส้นทาง', false, { error: String(e.message || e).split('\n')[0].slice(0, 300), state: st, shot });
      }
      check('P' + k + ' ไม่มี page error', errors.length === 0, errors.slice(0, 3));
      check('P' + k + ' ไม่มี console error', consoleErr.length === 0, consoleErr.slice(0, 3));
      check('P' + k + ' ไม่เรียกเซิร์ฟเวอร์ภายนอก', external.size === 0, [...external].slice(0, 3));
      console.log('     (' + ((Date.now() - t1) / 1000).toFixed(1) + ' s)');
      await ctx.close();
    }
  } finally {
    await browser.close();
    await main.stop();
  }
  TAG = '';
  const bad = results.filter(x => !x.ok);
  console.log('\n' + (bad.length ? bad.length + ' ข้อไม่ผ่าน จาก ' + results.length + ':\n  ' + bad.map(x => x.name).join('\n  ') : 'ผ่านทุกข้อ (' + results.length + ')') +
    '  · ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s');
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
