// Run: node tests/practice.browser.cjs            (ต้องมี Playwright สำหรับ Node: npm i -D playwright หรือใช้ NODE_PATH=$(npm root -g))
// ตรวจรับงาน S5 ในเบราว์เซอร์จริง (Chromium) — ไม่ใช่ *.test.cjs เพราะ node --test tests/*.test.cjs ต้องรันได้โดยไม่มีเบราว์เซอร์
//   1) ทุกวิชาเปิด #/oral/<sid> ได้ และจำนวนข้อ = data/qa/<sid>.json
//   2) id ของ details.qa ที่ hook "fill" ใส่ ตรงกับ data/qa ทุกหัวข้อทุกวิชา (+ ตรวจบนหน้าวิชาจริงบางหัวข้อ) · host quiz2 ได้ id <หัวข้อ>-q<n>
//   3) ตอบปากเปล่า 3 ข้อ → reload → สถานะรายข้อยังอยู่ (localStorage + ตัวเลขบนหน้า + แถบสีใน details.qa)
//   4) Flashcard ครบหนึ่งรอบด้วยคีย์บอร์ดล้วน โฟกัสอยู่บนการ์ดทุกใบ
//   5) #/practice/tau/tau-3 เลือกวิชา/หัวข้อไว้ให้แล้ว · ปุ่ม #quizBtn จากหน้าวิชาพาไป #/practice/<วิชา>
//   6) ควิซในหัวข้อ: ลิงก์ไป host quiz2 แรก · ตอบแล้วเก็บ atlas-practice-v1[tid][host.id]
//   ตลอดการทดสอบ: ไม่มี page error และไม่มีคำขอไปเซิร์ฟเวอร์ภายนอก
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

let chromium;
try { ({ chromium } = require('playwright')); } catch (e) {
  try { ({ chromium } = require('@playwright/test')); } catch (e2) {
    console.error('ไม่พบ Playwright สำหรับ Node — ติดตั้งด้วย npm i -D playwright (หรือรันด้วย NODE_PATH=$(npm root -g))');
    process.exit(2);
  }
}

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
function serve() {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

const INDEX = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/qa/_index.json'), 'utf8'));
const QA = sid => JSON.parse(fs.readFileSync(path.join(ROOT, 'data/qa', sid + '.json'), 'utf8'));
let passed = 0;
const ok = (name) => { passed++; console.log('  ✓ ' + name); };

(async () => {
  const srv = await serve();
  const BASE = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const external = [], errors = [];
  await ctx.route('**/*', route => {
    const u = route.request().url();
    if (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
    external.push(u); return route.abort();
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(String(e)));
  const open = async hash => {
    await page.evaluate(h => { location.hash = h; }, hash);
    await page.waitForFunction(h => location.hash === h || decodeURIComponent(location.hash) === h, hash, { timeout: 10000 }).catch(() => {});
  };
  await page.goto(BASE + '#/', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof HOOKS === 'object' && document.getElementById('view').children.length > 0);
  await page.evaluate(() => localStorage.clear());

  try {
    // 1) ทุกวิชาเปิด #/oral/<sid> ได้ จำนวนข้อ = data/qa
    for (const sid of Object.keys(INDEX)) {
      await open('#/oral/' + sid);
      await page.waitForSelector('.s5-oral[data-total]', { timeout: 15000 });
      const total = await page.$eval('.s5-oral', e => +e.dataset.total);
      assert.equal(total, INDEX[sid].n, sid + ': จำนวนข้อบนหน้า = data/qa');
      assert.ok(await page.$('#s5Q'), sid + ': มีบัตรคำถาม');
    }
    ok('ทุกวิชา (' + Object.keys(INDEX).length + ') เปิด #/oral/<sid> ได้ จำนวนข้อตรงกับ data/qa');

    // 2) id ของ details.qa จาก hook fill = data/qa (ทุกหัวข้อ — เติม html ของหัวข้อลงกล่องแยกแล้วเรียก hook ชุดเดียวกับ fillBody)
    let checked = 0;
    for (const sid of Object.keys(INDEX)) {
      const want = {};
      QA(sid).forEach(x => (want[x.tid] = want[x.tid] || []).push(x.id));
      const got = await page.evaluate(async ({ sid, tids }) => {
        await qaIndex();
        const out = {};
        for (const tid of tids) {
          const d = await dbGet('t', sid + '__' + tid);
          const el = document.createElement('div');
          el.innerHTML = d.html;
          HOOKS.run('fill', el, { id: tid }, sid);
          out[tid] = qaList(el).map(x => x.id);
        }
        return out;
      }, { sid, tids: Object.keys(want) });
      assert.deepEqual(got, want, sid + ': id ใน DOM = data/qa');
      checked += Object.values(want).reduce((a, b) => a + b.length, 0);
    }
    ok('id ของ details.qa ใน DOM ตรงกับ data/qa ทุกข้อ (' + checked + ' ข้อ)');

    // 2b) บนหน้าวิชาจริง: หัวข้อที่มีคำถามซ้ำข้ามหัวข้อ (fix) · STD2 · แบบเดิม · 🔊 · host quiz2
    for (const [sid, tid] of [['nav', 'nav-3'], ['hist', 'hist-l3'], ['suka', 'suka-s4'], ['tau', 'tau-6'], ['nav', 'nav-7']]) {
      await open('#/' + sid + '/' + tid);
      await page.waitForFunction(t => { const b = document.querySelector('section.topic#' + CSS.escape(t) + ' .tbody'); return b && b.dataset.lazy === undefined && !b.querySelector('.tload'); }, tid, { timeout: 20000 });
      const ids = await page.$$eval('section.topic#' + tid + ' details.qa', ds => ds.filter(d => d.querySelector(':scope > summary')).map(d => d.id));
      assert.deepEqual(ids, QA(sid).filter(x => x.tid === tid).map(x => x.id), sid + '/' + tid + ': id บนหน้าจริง');
      const say = await page.$$eval('section.topic#' + tid + ' details.qa > .ans', as => as.map(a => !!a.querySelector('.say, [data-demo^="ih-say"]')));
      assert.deepEqual(say, QA(sid).filter(x => x.tid === tid).map(x => x.hasRu), sid + '/' + tid + ': ปุ่ม 🔊 เฉพาะคำตอบภาษารัสเซีย');
      const inSummary = await page.$$eval('section.topic#' + tid + ' details.qa > summary .say', x => x.length);
      assert.equal(inSummary, 0, 'ไม่มีปุ่มเสียงใน summary');
      const hosts = await page.$$eval('section.topic#' + tid + ' [data-demo="quiz2"]', hs => hs.map(h => h.id + '|' + h.dataset.id));
      assert.deepEqual(hosts, (INDEX[sid].z[tid] ? Array.from({ length: INDEX[sid].z[tid] }, (_, i) => tid + '-q' + (i + 1)) : []).map(x => x + '|' + x), 'host quiz2 ids');
    }
    ok('หน้าวิชาจริง: id ตรง data/qa · 🔊 เฉพาะคำตอบภาษารัสเซีย (ไม่อยู่ใน summary) · host quiz2 = <หัวข้อ>-q<n>');

    // 🔊 ในเบราว์เซอร์ที่ไม่มีเสียงรัสเซีย → ข้อความแนะนำติดตั้ง
    await page.click('section.topic#nav-7 details.qa > summary');
    const hasVoice = await page.evaluate(() => !!SAY.voice());
    await page.click('section.topic#nav-7 details.qa[open] .say-btn');
    if (!hasVoice) {
      const hint = await page.$eval('section.topic#nav-7 details.qa[open] .say-hint', e => e.hidden ? '' : e.textContent);
      assert.match(hint, /ภาษารัสเซีย/);
      ok('ไม่มีเสียงรัสเซียในเครื่อง → ขึ้นวิธีติดตั้ง: «' + hint.slice(0, 60) + '…»');
    } else ok('มีเสียงรัสเซีย — กดฟังได้');

    // 3) ตอบ 3 ข้อ → reload → สถานะยังอยู่
    await open('#/oral/tau');
    await page.waitForSelector('#s5Q');
    const answered = [];
    for (const r of [5, 3, 1]) {
      await page.fill('#s5Pts', 'ประเด็นทดสอบ');
      await page.click('#s5Show');
      await page.waitForSelector('#s5Ans:not([hidden]) .s5-rate');
      answered.push(await page.$eval('.s5-card', e => e.dataset.qid));
      const see = await page.$eval('.s5-see a', a => a.getAttribute('href'));
      assert.match(see, /^#\/tau\/tau-[\w-]+\/qa-/, 'ลิงก์ดูในเนื้อหา');
      await page.click('.s5-rate [data-r="' + r + '"]');
    }
    await page.waitForSelector('.s5-sum');
    assert.equal(await page.$$eval('.s5-res li', l => l.length), 3, 'สรุปชุด 3 ข้อ');
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('.s5-oral[data-total]');
    const store = await page.evaluate(() => JSON.parse(localStorage.getItem('atlas-oral-v1') || '{}'));
    const keys = Object.keys(store).filter(k => !k.startsWith('_'));
    assert.equal(keys.length, 3, 'บันทึก 3 ข้อ');
    assert.deepEqual(keys.map(k => store[k].r).sort(), [1, 3, 5]);
    keys.forEach(k => assert.ok(answered.includes(k.split('/')[2]), 'คีย์ sid/tid/id: ' + k));
    await page.waitForFunction(() => /ตอบแล้ว 3\/51/.test(document.getElementById('s5Stat').textContent));
    await open('#/practice/tau');
    await page.waitForFunction(() => /ตอบแล้ว 3\//.test(document.getElementById('s5Modes').textContent));
    const k0 = keys[0].split('/');
    await open('#/tau/' + k0[1] + '/' + k0[2]);
    await page.waitForFunction(id => { const d = document.getElementById(id); return d && d.dataset.oral; }, k0[2], { timeout: 20000 });
    ok('ตอบ 3 ข้อ → reload → สถานะรายข้อยังอยู่ (localStorage · ตัวเลขบนหน้า · แถบสีใน details.qa)');

    // 4) Flashcard ครบหนึ่งรอบด้วยคีย์บอร์ดล้วน
    await open('#/flash/phr');
    await page.waitForSelector('#fc');
    const total = await page.$eval('#fPos', e => +e.textContent.split('/')[1]);
    for (let i = 0; i < 40 && await page.evaluate(() => document.activeElement && document.activeElement.id) !== 'fc'; i++) await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'fc', 'Tab ถึงการ์ด');
    for (let i = 0; i < total; i++) {
      await page.keyboard.press(i % 2 ? 'Space' : 'Enter');
      assert.equal(await page.$eval('#fc', e => e.getAttribute('aria-pressed')), 'true', 'พลิกด้วยคีย์บอร์ด');
      if (i === 0) {                                   // ใบแรก: Tab ไปปุ่ม «จำได้» แล้ว Enter — โฟกัสต้องกลับมาที่การ์ด
        await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'fYes');
        await page.keyboard.press('Enter');
      } else await page.keyboard.press(i % 3 ? '2' : '1');
      if (i < total - 1) assert.equal(await page.evaluate(() => document.activeElement.id), 'fc', 'โฟกัสอยู่บนการ์ดหลังเปลี่ยนใบ (ใบ ' + (i + 2) + ')');
    }
    await page.waitForSelector('#fDone');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'fDone', 'จบชุด → โฟกัสที่สรุป');
    const terms = await page.evaluate(() => Object.keys((JSON.parse(localStorage.getItem('atlas-practice-v1') || '{}'))._terms || {}));
    assert.equal(terms.length, total, 'บันทึกผลทุกใบ (termKey)');
    const want = await page.evaluate(() => { const m = MODULES.find(x => x.id === 'phr'); return m.terms.map((t, i) => termKey(m, t, i)); });
    assert.deepEqual(terms.slice().sort(), want.slice().sort(), 'คีย์จาก termKey()');
    ok('Flashcard ' + total + ' ใบครบรอบด้วยคีย์บอร์ดล้วน (Tab · Enter/Space · 1/2) โฟกัสอยู่บนการ์ด');

    // ทิศทางไทย→รัสเซีย · ควิซศัพท์ตามกลุ่ม · toe ไม่มีกลุ่ม
    await open('#/flash/nav');
    await page.waitForSelector('#fc');
    await page.click('[data-dir="th"]');
    assert.equal(await page.$eval('#fc', e => !!e.querySelector('.fth') && !e.querySelector('.fru')), true, 'ไทย→รัสเซีย ด้านหน้าเป็นภาษาไทย');
    await page.click('[data-dir="ru"]');
    await open('#/quiz/toe');
    await page.waitForSelector('#quizBox .opt');
    assert.match(await page.textContent('.s5-note'), /ยังไม่มีกลุ่มศัพท์/);
    await open('#/quiz/surn/n5');
    await page.waitForSelector('#quizBox .opt');
    assert.match(await page.textContent('.q-meta'), /ข้อ 1 \/ 5/);
    const opts = await page.$$eval('#quizBox .opt', b => b.map(x => x.textContent));
    const surn = await page.evaluate(() => MODULES.find(m => m.id === 'surn').terms.map(t => t.th));
    assert.ok(opts.every(o => surn.includes(o)), 'ตัวลวงจากกลุ่มเดียวกัน');
    ok('ไทย→รัสเซีย · ควิซศัพท์ตามกลุ่ม ตัวลวงกลุ่มเดียวกัน · toe ใช้ทั้งคลังพร้อมแจ้ง');

    // 5) #/practice/tau/tau-3 เลือกไว้ให้แล้ว · #quizBtn จากหน้าวิชา
    await open('#/practice/tau/tau-3');
    await page.waitForSelector('#s5Topic');
    assert.equal(await page.$eval('#s5Subjs [data-sid="tau"]', b => b.getAttribute('aria-pressed')), 'true');
    assert.equal(await page.$eval('#s5Topic', s => s.value), 'tau-3');
    ok('#/practice/tau/tau-3 เลือกวิชาและหัวข้อไว้ให้แล้ว');
    await open('#/suka');
    await page.waitForSelector('section.topic');
    await page.click('#quizBtn');
    await page.waitForFunction(() => /^#\/practice\/suka/.test(location.hash));
    assert.equal(await page.$eval('#s5Subjs [data-sid="suka"]', b => b.getAttribute('aria-pressed')), 'true');
    ok('ปุ่ม «ฝึกทบทวน» บนแถบบนจากหน้าวิชา → #/practice/<วิชา> เลือกไว้แล้ว');

    // 6) ควิซในหัวข้อ → quiz2 แรก · ผลเก็บตาม id ของ host
    await open('#/practice/nav/nav-7');
    await page.waitForSelector('.s5-mode.quiz2 a.btn');
    await page.click('.s5-mode.quiz2 a.btn');
    await page.waitForFunction(() => location.hash === '#/nav/nav-7/nav-7-q1');
    await page.waitForSelector('#nav-7-q1 button');
    await page.waitForFunction(() => { const r = document.getElementById('nav-7-q1').getBoundingClientRect(); return r.top >= -5 && r.top < innerHeight; }, null, { timeout: 8000 });
    await page.evaluate(() => { const b = [...document.querySelectorAll('#nav-7-q1 button')].find(x => !x.classList.contains('q-reset') && !x.disabled); b.click(); });
    await page.waitForFunction(() => { const p = JSON.parse(localStorage.getItem('atlas-practice-v1') || '{}'); return p['nav-7'] && p['nav-7']['nav-7-q1'] && p['nav-7']['nav-7-q1'].done >= 1; });
    ok('ควิซในหัวข้อพาไป quiz2 แรก (#/nav/nav-7/nav-7-q1) · ผลเก็บใน atlas-practice-v1[nav-7][nav-7-q1]');

    assert.deepEqual(errors, [], 'ไม่มี page error');
    assert.deepEqual(external, [], 'ไม่มีคำขอไปเซิร์ฟเวอร์ภายนอก');
    ok('ไม่มี page error และไม่มีคำขอไปเซิร์ฟเวอร์ภายนอก');
    console.log('ผ่าน ' + passed + ' ข้อ');
  } catch (e) {
    console.error('✗ ' + (e && e.message || e));
    if (errors.length) console.error('page errors:', errors);
    if (external.length) console.error('external:', external);
    await page.screenshot({ path: path.join(require('node:os').tmpdir(), 'practice-fail.png'), fullPage: false }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await browser.close();
    srv.close();
  }
})();
