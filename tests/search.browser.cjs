// ตรวจรับงานค้นหา (S4) ในเบราว์เซอร์จริง — ไม่ได้อยู่ในชุด node --test (ต้องมี Playwright + Chromium)
// รัน: node tests/search.browser.cjs   (หา playwright จาก node_modules ของ repo หรือที่ติดตั้งแบบ global)
// ตรวจ: โฟกัสช่องค้นหาโหลดเฉพาะวิชาที่เปิดอยู่ · วิชาที่โหลดไม่ได้ขึ้น «ขาด: …» + ปุ่มลองใหม่โหลดเฉพาะที่ขาด ·
//       «Kalman» ในคลังศัพท์เจอ Калман · กด Back จากหัวข้อแล้วคำค้น + ขอบเขต + ชนิดผลคงเดิม · ผลเป็น <a href> · แสดงเพิ่ม ·
//       heap หลังโหลดดัชนีครบ (พิมพ์ค่าไว้เทียบ)
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

const QUERY = 'передаточная функция';
const ixOf = u => { const m = /\/data\/ix\/([\w-]+)\.json/.exec(u); return m && m[1]; };

(async () => {
  const srv = await serve();
  const base = `http://127.0.0.1:${srv.address().port}/`;
  const browser = await chromium.launch();
  const errors = [];
  const newPage = async (block) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(String(e)));
    const ix = [];
    page.on('request', r => { const s = ixOf(r.url()); if (s) ix.push(s); });
    if (block) await page.route('**/data/ix/' + block + '.json*', r => r.abort());
    return { ctx, page, ix };
  };
  const ok = (name) => console.log('  ✓ ' + name);

  try {
    // 1) โฟกัสช่องค้นหาในหน้าวิชา = โหลดเฉพาะวิชานั้น
    {
      const { ctx, page, ix } = await newPage();
      await page.goto(base + '#/tau');
      await page.waitForFunction(() => state.v === 'subject' && state.id === 'tau');
      await page.focus('#search');
      await page.waitForFunction(() => IXST.tau === 'ok');
      await page.waitForTimeout(800);
      assert.deepEqual([...new Set(ix)], ['tau'], 'focus loads only the open subject: ' + ix.join(','));
      assert.equal(await page.evaluate(() => IX_READY), false);
      ok('โฟกัสช่องค้นหาในหน้า ТАУ โหลดแค่ data/ix/tau.json');
      // พิมพ์ตัวแรก → ที่เหลือโหลดทีละวิชา
      await page.fill('#search', 'п');
      await page.waitForFunction(() => IX_READY, null, { timeout: 120000 });
      assert.equal(new Set(ix).size, 12);
      assert.equal(ix.length, 12, 'each subject index fetched once');
      ok('พิมพ์ตัวแรกแล้วโหลดครบ 12 วิชา (วิชาละครั้ง) → IX_READY');
      await ctx.close();
    }

    // 2) วิชาโหลดไม่ได้ → «ขาด: ТОЭ» + ลองใหม่โหลดเฉพาะที่ขาด
    {
      const { ctx, page, ix } = await newPage('toe');
      await page.goto(base + '#/');
      await page.waitForSelector('#view .subj');
      await page.focus('#search');
      await page.waitForTimeout(500);
      assert.equal(ix.length, 0, 'focus on the overview loads no subject index');
      ok('โฟกัสช่องค้นหาในหน้าแรกยังไม่โหลดดัชนี');
      await page.fill('#search', QUERY);
      await page.waitForFunction(() => state.v === 'search' && !ixBusy() && IX_SUBJ, null, { timeout: 120000 });
      await page.waitForTimeout(400);
      const st = await page.$eval('#sxStatus .sx-st', el => ({ st: el.dataset.st, txt: el.textContent }));
      assert.equal(st.st, 'part');
      assert.match(st.txt, /ค้นได้ 11\/12 วิชา — ขาด: ТОЭ/);
      assert.equal(await page.evaluate(() => IX_READY), false);
      assert.ok(await page.$$eval('#sxRes a.res-item', a => a.length) > 0);
      ok('บล็อก toe.json → «' + st.txt.replace(/ลอง.*$/, '').trim() + '»');
      await page.unroute('**/data/ix/toe.json*');
      const before = ix.length;
      await page.click('#sxStatus [data-sx="retry"]');
      await page.waitForFunction(() => IX_READY, null, { timeout: 60000 });
      await page.waitForTimeout(400);
      assert.deepEqual(ix.slice(before), ['toe'], 'retry fetches only the missing subject');
      assert.equal(await page.$('#sxStatus .sx-st'), null, 'status box disappears once complete');
      ok('ปลดบล็อกแล้วกด «ลองใหม่» → โหลดเฉพาะ toe.json · ค้นได้ครบ');
      await ctx.close();
    }

    // 3) คลังศัพท์ใช้ชื่อพ้องเดียวกับค้นหา
    {
      const { ctx, page } = await newPage();
      await page.goto(base + '#/glossary');
      await page.waitForSelector('#gloss .card');
      assert.match(await page.getAttribute('#search', 'placeholder'), /กรองคลังศัพท์/);
      await page.fill('#search', 'Kalman');
      await page.waitForTimeout(500);
      const seen = await page.$$eval('#gloss .card:not(.hidden) .ru', els => els.map(e => e.textContent));
      assert.ok(seen.some(t => /Калман/.test(t)), 'Kalman finds Калман in the glossary: ' + seen.join(' | '));
      await page.fill('#search', 'калман');
      await page.waitForTimeout(400);
      const seen2 = await page.$$eval('#gloss .card:not(.hidden)', els => els.length);
      assert.equal(seen2, seen.length);
      ok('คลังศัพท์: «Kalman» เจอ ' + seen.length + ' คำ (เท่ากับ «калман») · placeholder เป็น «กรองคลังศัพท์…»');
      await ctx.close();
    }

    // 4) Back จากหัวข้อ → คำค้น + ขอบเขต + ชนิดผลคงเดิม · ผลเป็น <a href>
    {
      const { ctx, page } = await newPage();
      await page.goto(base + '#/tau');
      await page.waitForFunction(() => state.v === 'subject' && state.id === 'tau');
      await page.fill('#search', QUERY);
      await page.waitForFunction(() => state.v === 'search');
      await page.click('[data-scope="subj"]');
      assert.match(await page.evaluate(() => location.hash), /^#\/search\/[^/]+\/tau$/);
      await page.waitForFunction(() => IXST.tau === 'ok');
      await page.click('[data-kind="topic"]');
      await page.waitForTimeout(300);
      const hrefs = await page.$$eval('#sxRes a.res-item', a => a.map(x => x.getAttribute('href')));
      assert.ok(hrefs.length > 0 && hrefs.every(h => /^#\/tau\/tau-/.test(h)), 'topic links in scope: ' + hrefs.join(' '));
      ok('ชิป «วิชานี้ · ТАУ» → ที่อยู่ #/search/…/tau · ชนิด «หัวข้อ» · ผล ' + hrefs.length + ' ลิงก์ <a href="#/tau/…">');
      await page.click('#sxRes a.res-item');
      await page.waitForFunction(() => state.v === 'subject' && state.id === 'tau');
      await page.waitForTimeout(600);
      await page.goBack();
      await page.waitForFunction(() => state.v === 'search');
      const back = await page.evaluate(() => ({
        val: document.getElementById('search').value, hash: location.hash,
        scope: document.querySelector('[data-scope][aria-pressed="true"]').dataset.scope,
        kind: document.querySelector('[data-kind][aria-pressed="true"]').dataset.kind,
      }));
      assert.equal(back.val, QUERY);
      assert.match(back.hash, /\/tau$/);
      assert.equal(back.scope, 'subj');
      assert.equal(back.kind, 'topic');
      ok('Back จากหัวข้อ: คำค้น «' + back.val + '» · ขอบเขตวิชานี้ · ชนิดหัวข้อ คงเดิม');
      await ctx.close();
    }

    // 4b) เริ่มค้นจากวิชาที่ยังไม่มีเนื้อหาเต็ม — ขอบเขต «วิชานี้» ไม่ค้างที่ «กำลังโหลด»
    {
      const { ctx, page } = await newPage();
      await page.goto(base + '#/alg');
      await page.waitForFunction(() => state.v === 'subject' && state.id === 'alg');
      await page.fill('#search', 'матрица');
      await page.waitForFunction(() => state.v === 'search' && IX_SUBJ);
      await page.click('[data-scope="subj"]');
      await page.waitForTimeout(400);
      assert.equal(await page.$('#sxStatus .sx-st'), null, 'no index to wait for');
      assert.doesNotMatch(await page.textContent('#sxRes'), /ผลจะเพิ่มเอง/);
      ok('ขอบเขต «วิชานี้» ของวิชาที่ไม่มีดัชนี ไม่ขึ้นสถานะกำลังโหลดค้าง');
      await ctx.close();
    }

    // 5) แสดงเพิ่มทีละ 60 · heap หลังโหลดครบ
    {
      const { ctx, page } = await newPage();
      const cdp = await ctx.newCDPSession(page);
      await page.goto(base + '#/search/' + encodeURIComponent('ระบบ'));
      await page.waitForFunction(() => IX_READY, null, { timeout: 120000 });
      await page.waitForTimeout(500);
      assert.equal(await page.$$eval('#sxRes a.res-item', a => a.length), 60);
      await page.click('[data-sx="more"]');
      const n2 = await page.$$eval('#sxRes a.res-item', a => a.length);
      assert.ok(n2 > 60 && n2 <= 120);
      ok('«แสดงเพิ่ม» 60 → ' + n2 + ' รายการ');
      await page.evaluate(() => buildIndex());
      for (let i = 0; i < 3; i++) await cdp.send('HeapProfiler.collectGarbage');
      const u = await cdp.send('Runtime.getHeapUsage');
      const shared = await page.evaluate(() => INDEX.filter(x => x.tid && IXHAY[x.sid + '__' + x.tid] !== undefined).every(x => x.b === IXHAY[x.sid + '__' + x.tid]));
      assert.ok(shared, 'INDEX bodies are the IXHAY strings');
      ok('heap หลังโหลดดัชนีครบ ' + (u.usedSize / 1048576).toFixed(1) + ' MB · INDEX อ้างสตริงเดียวกับ IXHAY');
      await ctx.close();
    }
    assert.deepEqual(errors, [], 'no page errors');
    console.log('search.browser: PASS');
  } catch (e) {
    console.error('search.browser: FAIL\n', e);
    process.exitCode = 1;
  } finally {
    await browser.close();
    srv.close();
  }
})();
