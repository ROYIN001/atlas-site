// ตรวจรับงานประสานรอยต่อของ S9 (ปิดรุ่น v6) ในเบราว์เซอร์จริง — รันมือ ไม่อยู่ใน node --test
//   node tests/s9.browser.cjs             (ต้องมีแพ็กเกจ playwright ของ Node · ในคลาวด์ใช้ NODE_PATH=$(npm root -g))
// ข้อที่ต้องผ่าน: คืนตำแหน่งหลังรีเฟรชตรงข้อความเดิม (ทั้งอ่านต่อเนื่องและกระโดดเข้ากลางหัวข้อ) · «เปิดฉบับเต็ม» จากจุดที่ยังอ่อนแล้ว Back กลับโหมดสรุป ·
// ซ้อมปากเปล่า: Back จาก «ดูในเนื้อหา» ทำชุดเดิมต่อ / กดเริ่มใหม่ได้ชุดใหม่ · ติ๊ก ✓ ซ้ำในวันเดียวไม่ดันช่วงทวน · quiz2 ให้คะแนนครั้งเดียวตอนเพิ่งครบ ·
// ปุ่ม «ตั้งวันสอบ» บนมือถือ · Back กลับ #/cram ตรงที่เดิม · ลิงก์ #<id> ในหน้าเพิ่มประวัติ · ไม่มี page error / เซิร์ฟเวอร์ภายนอก
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
  const page = async (vp, seed) => {
    const ctx = await browser.newContext({ viewport: vp });
    if (seed) await ctx.addInitScript(s => { if (!sessionStorage.getItem('s9seed')) { sessionStorage.setItem('s9seed', '1'); for (const k in s) localStorage.setItem(k, s[k]); } }, seed);
    const pg = await ctx.newPage();
    pg.on('pageerror', e => errors.push('pageerror: ' + e.message));
    pg.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    pg.on('request', r => { if (/^https?:/.test(r.url()) && !r.url().startsWith(base)) external.add(r.url()); });
    return pg;
  };
  const idle = pg => pg.waitForFunction(() => typeof NAVBUSY !== 'undefined' && NAVBUSY === 0, null, { timeout: 30000 });
  const subj = (pg, id) => pg.waitForFunction(id => typeof state !== 'undefined' && state.v === 'subject' && state.id === id && document.querySelector('#view section.topic'), id, { timeout: 30000 });
  // ข้อความที่อยู่ใต้เส้นอ่าน (navOffset) — ใช้เทียบก่อน/หลังรีเฟรช
  const lineText = pg => pg.evaluate(() => {
    const r = view.querySelector('.wrap').getBoundingClientRect(), y = navOffset() + 24;
    let e = document.elementFromPoint(Math.round(r.left + Math.min(r.width, 600) / 2), y);
    while (e && e !== view && (e.textContent || '').trim().length < 12) e = e.parentElement;
    return e ? { t: (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60), top: Math.round(e.getBoundingClientRect().top - navOffset()) } : null;
  });

  // 1) คืนตำแหน่งหลังรีเฟรช — อ่านต่อเนื่อง (เลื่อนทีละจอ) และกระโดดเข้ากลางหัวข้อด้วยลิงก์ #/…/<id> แล้วเลื่อนต่อ
  {
    const pg = await page({ width: 1280, height: 900 });
    await pg.goto(base + '#/nav/nav-12'); await subj(pg, 'nav'); await idle(pg);
    for (let i = 0; i < 18; i++) { await pg.mouse.wheel(0, 800); await pg.waitForTimeout(120); }
    await pg.waitForTimeout(900);
    const a = await lineText(pg), hs = await pg.evaluate(() => history.state);
    await pg.reload(); await subj(pg, 'nav'); await idle(pg); await pg.waitForTimeout(400);
    const b = await lineText(pg);
    check('รีเฟรชหลังเลื่อนอ่านต่อเนื่อง ~14 000 px → ข้อความเดิมใต้เส้นอ่าน', a && b && a.t === b.t && Math.abs(a.top - b.top) <= 30, { a, b, anc: hs && hs.anc });
    const target = await pg.evaluate(async () => {            // id ราว 60 % ของหัวข้อ nav-10 จากไฟล์หัวข้อ (หัวข้อยังไม่ได้เติม)
      const d = await dbGet('t', 'nav__nav-10'), t = document.createElement('template'); t.innerHTML = d.html;
      const ids = [...t.content.querySelectorAll('[id]')].filter(e => !e.closest('[data-demo]') && !e.closest('details'));
      return ids[Math.floor(ids.length * 0.6)].id; });
    await pg.evaluate(t => { location.hash = '#/nav/nav-10/' + t; }, target);
    await pg.waitForFunction(() => state.topic === 'nav-10'); await idle(pg);
    for (let i = 0; i < 4; i++) { await pg.mouse.wheel(0, 700); await pg.waitForTimeout(120); }
    await pg.waitForTimeout(900);
    const c = await lineText(pg);
    await pg.reload(); await subj(pg, 'nav'); await idle(pg); await pg.waitForTimeout(400);
    const d = await lineText(pg);
    check('กระโดดเข้ากลางหัวข้อ (แบบจำลองด้านบนยังไม่ติดตั้ง) แล้วรีเฟรช → ข้อความเดิม', c && d && c.t === d.t && Math.abs(c.top - d.top) <= 30, { c, d, target });
    await pg.close();
  }

  // 2) «จุดที่ยังอ่อน → เปิดฉบับเต็ม» (แผงของ S6) แล้ว Back → กลับหน้าสรุป
  {
    const pg = await page({ width: 1280, height: 900 }, { 'atlas-sula-v1': JSON.stringify(['k:nav-1']), 'atlas-mode-v1': 'sum' });
    await pg.goto(base + '#/nav'); await subj(pg, 'nav'); await idle(pg);
    const m0 = await pg.evaluate(() => curMode());
    await pg.click('.s6-head [data-s6open]');
    await pg.waitForSelector('.s6-head .s6-weak [data-full]');
    const tid = await pg.getAttribute('.s6-head .s6-weak [data-full]', 'data-full');
    await pg.click('.s6-head .s6-weak [data-full]');
    await pg.waitForFunction(t => state.topic === t && curMode() === 'full', tid); await idle(pg);
    await pg.goBack();
    await pg.waitForFunction(() => curMode() === 'sum', null, { timeout: 15000 }).catch(() => {});
    const r = await pg.evaluate(() => ({ mode: curMode(), hash: location.hash, sum: !!document.querySelector('#view section.topic#nav-s1') }));
    check('เปิดฉบับเต็มจาก «จุดที่ยังอ่อน» แล้ว Back → โหมดสรุปเหมือนเดิม', m0 === 'sum' && r.mode === 'sum' && r.sum, { m0, tid, r });
    await pg.close();
  }

  // 3) ซ้อมปากเปล่า: Back จาก «ดูในเนื้อหา» = ชุดเดิมข้อเดิม · กดเริ่มใหม่ = ชุดใหม่
  {
    const pg = await page({ width: 1280, height: 900 });
    await pg.goto(base + '#/practice/nav');
    await pg.waitForSelector('a.s5-primary[href^="#/oral/nav"]');
    await pg.click('a.s5-primary[href^="#/oral/nav"]');
    await pg.waitForSelector('#s5Show');
    await pg.click('#s5Show'); await pg.click('.s5-rate [data-r="5"]');
    await pg.waitForFunction(() => /ข้อ 2 \//.test((document.querySelector('.s5-pos') || {}).textContent || ''));
    const q2 = await pg.getAttribute('.s5-card', 'data-qid');
    await pg.click('#s5Show'); await pg.click('.s5-see a');
    await pg.waitForFunction(() => state.v === 'subject'); await idle(pg);
    await pg.goBack();
    await pg.waitForSelector('.s5-card');
    const back = await pg.evaluate(() => ({ pos: document.querySelector('.s5-pos').textContent, qid: document.querySelector('.s5-card').dataset.qid }));
    check('Back จาก «ดูในเนื้อหา» → ทำชุดเดิมต่อที่ข้อ 2', /ข้อ 2 \//.test(back.pos) && back.qid === q2, { q2, back });
    await pg.click('.s5-oral .crumb a');
    await pg.waitForSelector('a.s5-primary[href^="#/oral/nav"]');
    await pg.click('a.s5-primary[href^="#/oral/nav"]');
    await pg.waitForSelector('.s5-card');
    const fresh = await pg.evaluate(() => document.querySelector('.s5-pos').textContent);
    check('กด «เริ่มซ้อม» อีกครั้ง → ชุดใหม่เริ่มข้อ 1', /ข้อ 1 \//.test(fresh), fresh);
    await pg.close();
  }

  // 4) ติ๊ก ✓ / ยกเลิก / ติ๊ก ในวันเดียว → ช่วงทวน 1 วัน (ไม่ใช่ 3) · quiz2 ตอบผิดแล้วกดตัวเลือกที่ถูกหลังครบ → ให้คะแนนครั้งเดียว
  {
    const pg = await page({ width: 1280, height: 900 });
    await pg.goto(base + '#/nav/nav-2'); await subj(pg, 'nav'); await idle(pg);
    const tick = '.topic-check[data-key="k:nav-2"]';
    for (let i = 0; i < 3; i++) { await pg.evaluate(s => document.querySelector(s).click(), tick); await pg.waitForTimeout(80); }
    const k = await pg.evaluate(() => SRS.get('k:nav-2'));
    check('ติ๊ก/ยกเลิก/ติ๊ก ✓ ในวันเดียว → reps 1 · ช่วงทวน 1 วัน', k && k.reps === 1 && k.ivl === 1, k);
    await pg.evaluate(() => navTopic('nav-11')); await pg.waitForFunction(() => state.topic === 'nav-11'); await idle(pg);
    const q = await pg.evaluate(async () => {                 // nav-11 บล็อกแรก = ตัวเลือกล้วน 4 ข้อ
      const host = document.querySelector('#nav-11 [data-demo="quiz2"]');
      if (!host) return null;
      host.scrollIntoView(); if (typeof demoInstall === 'function') demoInstall(host, 'nav');
      await new Promise(r => setTimeout(r, 300));
      for (const q of host.querySelectorAll('.q[data-type="mc"]')) {           // ข้อแรกตอบผิดก่อน ข้ออื่นตอบถูก
        const bs = [...q.querySelectorAll('.q-opts button')];
        const wrong = bs.find(b => !b.disabled); wrong.click();
      }
      for (const q of host.querySelectorAll('.q[data-type="mc"]')) for (const b of q.querySelectorAll('.q-opts button')) if (!b.disabled) b.click();   // หลังครบ: กดตัวเลือกที่ยังกดได้ (ลองเลือกใหม่)
      return { id: host.dataset.id, n: host.querySelectorAll('.q[data-type="mc"]').length, num: host.querySelectorAll('.q[data-type="num"]').length };
    });
    const z = q ? await pg.evaluate(id => SRS.get('z:nav-11/' + id), q.id) : null;
    check('quiz2 (nav-11 บล็อกแรก): กดตัวเลือกที่เหลือหลังตอบครบ → ให้คะแนนครั้งเดียว (reps + lapses = 1)', q && q.n === 4 && !q.num && z && z.reps + z.lapses === 1, { q, z });
    await pg.close();
  }

  // 5) มือถือ: ยังไม่ตั้งวันสอบ → ปุ่ม «ตั้งวันสอบ» เปิดแผงและโฟกัสช่องวันที่ · เลือกวันแล้วแผงยังเปิด
  {
    const pg = await page({ width: 390, height: 844 });
    await pg.goto(base + '#/tau'); await subj(pg, 'tau'); await idle(pg);
    const vis = await pg.isVisible('[data-s6set]');
    await pg.click('[data-s6set]');
    await pg.waitForSelector('[data-s6date]');
    const foc = await pg.evaluate(() => document.activeElement && document.activeElement.matches('[data-s6date]'));
    await pg.fill('[data-s6date]', new Date(Date.now() + 6 * 864e5).toISOString().slice(0, 10));
    await pg.waitForTimeout(300);
    const after = await pg.evaluate(() => ({ open: document.querySelector('.s6-head').classList.contains('open'), kind: !!document.querySelector('[data-s6kind]') && getComputedStyle(document.querySelector('.s6-ex')).display !== 'none', sw: document.documentElement.scrollWidth }));
    check('จอ 390 px: «ตั้งวันสอบ» เห็นได้ → เปิดแผง + โฟกัสช่องวันที่ · เลือกวันแล้วยังเลือกชนิดการสอบต่อได้ · ไม่ล้นจอ', vis && foc && after.open && after.kind && after.sw <= 390, { vis, foc, after });
    await pg.close();
  }

  // 6) Back กลับ #/cram ตรงตำแหน่งเดิม (เนื้อหาของหน้านี้โหลดทีหลัง)
  {
    const pg = await page({ width: 1280, height: 900 });
    await pg.goto(base + '#/cram/tau');
    await pg.waitForSelector('.cr-list.ready', { timeout: 180000 });
    await pg.evaluate(() => window.scrollTo(0, Math.round(document.documentElement.scrollHeight * 0.6)));
    await pg.waitForTimeout(800);
    const y0 = await pg.evaluate(() => Math.round(scrollY));
    const href = await pg.evaluate(() => { const a = [...document.querySelectorAll('#view a.cr-more')].find(a => { const r = a.getBoundingClientRect(); return r.width && r.top > 80 && r.bottom < innerHeight; }); if (a) a.click(); return a && a.getAttribute('href'); });
    await pg.waitForFunction(() => state.v === 'subject'); await idle(pg);
    await pg.goBack();
    await pg.waitForFunction(() => state.v === 'cram'); await idle(pg);
    const y1 = await pg.evaluate(() => Math.round(scrollY));
    check('อ่านเต็มจาก #/cram แล้ว Back → ตำแหน่งเดิม (±60 px)', Math.abs(y1 - y0) <= 60, { y0, y1, href });
    await pg.close();
  }

  // 7) ลิงก์ #<id> ในเนื้อหาเพิ่มประวัติ — Back กลับหัวข้อเดิม
  {
    const pg = await page({ width: 1280, height: 900 });
    await pg.goto(base + '#/suka/suka-map'); await subj(pg, 'suka'); await idle(pg);
    const link = await pg.evaluate(() => { const a = document.querySelector('#suka-map a[href^="#"]:not([href^="#/"])'); return a && a.getAttribute('href'); });
    if (link) {
      await pg.click('#suka-map a[href="' + link + '"]'); await idle(pg);
      const mid = await pg.evaluate(() => state.topic);
      await pg.goBack(); await pg.waitForTimeout(300); await idle(pg);
      const r = await pg.evaluate(() => ({ topic: state.topic, hash: location.hash }));
      check('ลิงก์ ' + link + ' ในหัวข้อ → Back กลับ suka-map', r.topic === 'suka-map', { mid, r });
    } else check('ลิงก์ #<id> ใน suka-map (ไม่พบลิงก์ — ข้าม)', true);
    await pg.close();
  }

  check('ไม่มี page error / console error', errors.length === 0, errors.slice(0, 5));
  check('ไม่เรียกเซิร์ฟเวอร์ภายนอก', external.size === 0, [...external].slice(0, 5));
  await browser.close(); server.close();
  const bad = results.filter(r => !r.ok);
  console.log(bad.length ? '\n' + bad.length + ' ข้อไม่ผ่าน' : '\nผ่านทุกข้อ (' + results.length + ')');
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
