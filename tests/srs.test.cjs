// Run: node --test tests/srs.test.cjs
// S6: spaced-repetition core (truncated SM-2) — runs the pure section of SLOT S6 in a vm, no DOM or localStorage.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

function section(startMarker, endMarker) {
  const start = app.indexOf(startMarker);
  const end = app.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `locate production section: ${startMarker}`);
  return app.slice(start, end);
}
const slot = section('/* ===== SLOT S6 (', '/* ===== SLOT S6 END ===== */');
const coreSrc = section('/* ---- S6 core BEGIN', '/* ---- S6 core END ---- */');
const EXPORTS = ['srsCore', 'srsSidOf', 'srsDay0', 'srsAddDays', 'srsDays', 'SRS_MAXIVL',
  'srsPlanCat', 'srsQuizGrade'];
const core = vm.runInNewContext(coreSrc + '\n({' +
  EXPORTS.map(n => `${n}: typeof ${n} === "undefined" ? undefined : ${n}`).join(', ') + '});', {});

const T0 = new Date(2026, 8, 28, 22, 15).getTime();          // 28 ก.ย. 2026 22:15 (เวลาท้องถิ่น)
const day = n => new Date(2026, 8, 28 + n).getTime();          // เที่ยงคืนของวันที่ 28 + n
function store(init, opts) {
  const saved = [];
  let loads = 0;
  const srs = core.srsCore(Object.assign({
    load: () => { loads++; return init ? JSON.parse(JSON.stringify(init)) : null; },
    save: db => saved.push(JSON.parse(JSON.stringify(db))),
    now: () => T0,
  }, opts || {}));
  return { srs, saved, loads: () => loads };
}
const keysOf = list => Array.from(list, x => x.key);          // อาร์เรย์จาก vm อยู่คนละ realm
const run = (srs, key, grades) => grades.map(g => { const r = srs.grade(key, g, T0); return [r.ivl, r.ef, r.reps, r.lapses]; });

test('SM-2 table: the same grade repeated four times (ivl, ef, reps, lapses)', () => {
  const table = {
    5: [[1, 2.6, 1, 0], [3, 2.7, 2, 0], [8, 2.8, 3, 0], [22, 2.9, 4, 0]],       // 3×2.7 = 8.1 · 8×2.8 = 22.4
    4: [[1, 2.5, 1, 0], [3, 2.5, 2, 0], [8, 2.5, 3, 0], [20, 2.5, 4, 0]],       // ef ไม่เปลี่ยนที่ g = 4 · 3×2.5 = 7.5 → 8
    3: [[1, 2.36, 1, 0], [3, 2.22, 2, 0], [7, 2.08, 3, 0], [15, 1.94, 4, 0]],   // ivl ใช้ ef ก่อนปรับรอบนี้: 3×2.22 = 6.66 · 7×2.08 = 14.56
    2: [[1, 2.18, 0, 1], [1, 1.86, 0, 2], [1, 1.54, 0, 3], [1, 1.3, 0, 4]],     // ลืม: reps = 0 นับ lapses · ef −0.32 ต่ำสุด 1.3
    1: [[1, 1.96, 0, 1], [1, 1.42, 0, 2], [1, 1.3, 0, 3], [1, 1.3, 0, 4]],
    0: [[1, 1.7, 0, 1], [1, 1.3, 0, 2], [1, 1.3, 0, 3], [1, 1.3, 0, 4]],
  };
  for (const g of Object.keys(table)) {
    const { srs } = store();
    assert.deepEqual(run(srs, 'k:tau-1', [+g, +g, +g, +g]), table[g], `grade ${g}`);
  }
});

test('SM-2 table: mixed grades — a lapse resets reps and restarts 1 → 3 → ivl × ef', () => {
  const { srs } = store();
  assert.deepEqual(run(srs, 'k:nav-7', [4, 4, 4, 2, 4, 4, 4, 5]), [
    [1, 2.5, 1, 0], [3, 2.5, 2, 0], [8, 2.5, 3, 0],
    [1, 2.18, 0, 1],                                  // ลืม
    [1, 2.18, 1, 1], [3, 2.18, 2, 1], [7, 2.18, 3, 1], // 3×2.18 = 6.54 → 7
    [15, 2.28, 4, 1],                                 // 7×2.18 = 15.26 → 15 แล้ว ef +0.1
  ]);
});

test('due is local midnight ivl days later; due() lists only what is due, oldest first, filtered by prefix', () => {
  const { srs, saved } = store();
  const r = srs.grade('k:tau-1', 4, T0);
  assert.equal(r.due, day(1), 'ทวนเช้าวันพรุ่งนี้ ไม่ใช่ 22:15 ของพรุ่งนี้');
  assert.equal(r.last, T0);
  srs.grade('z:tau-1/0', 5, T0);
  srs.grade('z:tau-1/0', 5, T0);                      // ivl 3
  srs.grade('q:tau/tau-2/qa-x', 1, T0);              // lapses 1 · ivl 1
  srs.grade('g:tau-4', 4, T0);
  assert.equal(saved.length, 5, 'save after every grade');
  assert.deepEqual(keysOf(srs.due('', T0)), []);
  assert.deepEqual(keysOf(srs.due('', day(1))), ['q:tau/tau-2/qa-x', 'g:tau-4', 'k:tau-1'], 'same due → more lapses first, then key');
  assert.deepEqual(keysOf(srs.due('k:', day(1))), ['k:tau-1']);
  assert.deepEqual(keysOf(srs.due('', day(3))).slice(-1), ['z:tau-1/0']);
  const one = srs.due('z:', day(9))[0];
  assert.equal(one.key, 'z:tau-1/0');
  assert.equal(one.ivl, 3);
});

test('interval cap: never past the exam (cap) and never above 365 days, never below 1', () => {
  const capped = store(null, { cap: key => key.startsWith('k:') ? 5 : null }).srs;
  const k = run(capped, 'k:a', [5, 5, 5, 5, 5]).map(x => x[0]);
  assert.deepEqual(k, [1, 3, 5, 5, 5]);
  const z = run(capped, 'z:a/0', [5, 5, 5]).map(x => x[0]);
  assert.deepEqual(z, [1, 3, 8], 'cap applies per key');
  const long = store().srs;
  const iv = run(long, 'k:b', Array(12).fill(5)).map(x => x[0]);
  assert.equal(Math.max(...iv), core.SRS_MAXIVL);
  const zero = store(null, { cap: () => 0 }).srs;
  assert.equal(zero.grade('k:c', 5, T0).ivl, 1);
});

test('grade input handling, copies and lazy load', () => {
  const init = { 'k:x': { due: day(-2), ivl: 3, ef: 2.5, reps: 2, lapses: 0, last: day(-5) } };
  const s = store(init);
  assert.equal(s.loads(), 0, 'nothing read until first use');
  assert.equal(s.srs.grade('', 4, T0), null);
  assert.equal(s.srs.grade('k:x', 'abc', T0), null);
  assert.equal(s.loads(), 0);
  assert.equal(s.srs.grade('k:y', 9, T0).ef, 2.6, 'grade above 5 is clamped to 5');
  assert.equal(s.srs.grade('k:z', -3, T0).lapses, 1, 'grade below 0 is clamped to 0');
  assert.equal(s.loads(), 1);
  const g = s.srs.get('k:x');
  assert.equal(g.ivl, 3);
  g.ivl = 99;
  assert.equal(s.srs.get('k:x').ivl, 3, 'get() returns a copy');
  assert.equal(s.srs.get('nope'), null);
  assert.deepEqual(Object.keys(s.srs.all()).sort(), ['k:x', 'k:y', 'k:z']);
  assert.equal(s.srs.grade('k:x', 4, T0).ivl, 8, 'continues from stored reps/ivl: 3 × 2.5 = 7.5 → 8');
  s.srs.reload();
  s.srs.get('k:x');
  assert.equal(s.loads(), 2, 'reload() re-reads storage');
  let seen = null;
  const ev = store(null, { onGrade: (k, r) => { seen = [k, r.ivl]; } }).srs;
  ev.grade('k:e', 4);                                  // now() ของตัวเก็บ
  assert.deepEqual(seen, ['k:e', 1]);
  assert.equal(ev.get('k:e').last, T0);
});

test('calendar helpers count local days across month ends', () => {
  assert.equal(core.srsDays(T0, day(3)), 3);
  assert.equal(core.srsDays(day(3), T0), -3);
  assert.equal(core.srsAddDays(T0, 5), new Date(2026, 9, 3).getTime(), '28 ก.ย. + 5 = 3 ต.ค.');
  assert.equal(core.srsDay0(T0), day(0));
});

test('srsSidOf maps every shared key form to its subject', () => {
  const tsid = { 'nav-7': 'nav', 'vhist-l1a': 'vhist' };
  const msid = { te: 'teh_el', tau: 'tau' };
  const f = k => core.srsSidOf(k, t => tsid[t], m => msid[m]);
  assert.equal(f('k:nav-7'), 'nav');
  assert.equal(f('k:toe:3'), 'toe', 'outline subjects: k:<sid>:<i>');
  assert.equal(f('z:vhist-l1a/0'), 'vhist');
  assert.equal(f('q:hist/hist-l2/i2-oral3'), 'hist');
  assert.equal(f('g:te-12'), 'teh_el');
  assert.equal(f('g:tau-0'), 'tau');
  assert.equal(f('k:unknown'), null);
  assert.equal(f('x:whatever'), null);
});

test('slot S6 owns only its storage keys and exposes the agreed API', () => {
  for (const k of ['"atlas-srs-v1"', '"atlas-exam-v1"', '"atlas-seen-v1"']) assert.ok(slot.includes(k), k);
  assert.match(slot, /window\.SRS = SRS;/);
  const keys = [...slot.matchAll(/"(atlas-[a-z0-9-]+)"/g)].map(m => m[1]);
  assert.deepEqual([...new Set(keys)].sort(), ['atlas-exam-v1', 'atlas-seen-v1', 'atlas-srs-v1'], 'no other localStorage keys written by S6');
  assert.ok(!/localStorage\.setItem\(\s*(KEY|QKEY)\b/.test(slot), 'never writes atlas-sula-v1 / atlas-quiz-v1 directly');
});

test('quiz2 block result → grade: 100 % = 5 · ≥ 80 = 4 · ≥ 60 = 3 · ≥ 40 = 2 · > 0 = 1 · 0 = 0', () => {
  const rows = [[5, 5, 5], [4, 5, 4], [3, 5, 3], [2, 5, 2], [1, 5, 1], [0, 5, 0], [13, 16, 4], [9, 16, 2], [0, 0, 0]];
  for (const [ok, total, g] of rows) assert.equal(core.srsQuizGrade(ok, total), g, `${ok}/${total}`);
});

test('exam plan category: quota = ceil(backlog / days left); last 48 h puts most-lapsed first', () => {
  const recs = {
    a: { due: day(-3), lapses: 0 }, b: { due: day(-1), lapses: 4 }, c: { due: day(5), lapses: 9 },  // c ยังไม่ครบกำหนด
    d: { due: day(0), lapses: 2 },
  };
  const get = k => recs[k] || null;
  const keys = ['a', 'b', 'c', 'd', 'e', 'f'];                 // e, f ยังไม่เคยทวน
  const norm = x => JSON.parse(JSON.stringify(x));
  assert.deepEqual(norm(core.srsPlanCat(keys, get, T0, 3, false)), { pending: 5, quota: 2, today: ['a', 'b'] });
  assert.deepEqual(norm(core.srsPlanCat(keys, get, T0, 1, true)), { pending: 5, quota: 5, today: ['b', 'd', 'a', 'e', 'f'] });
  assert.deepEqual(norm(core.srsPlanCat(keys, get, T0, 10, false)), { pending: 5, quota: 1, today: ['a'] });
  assert.deepEqual(norm(core.srsPlanCat(keys, get, T0, 0, false)), { pending: 5, quota: 5, today: ['a', 'b', 'd', 'e', 'f'] }, 'exam today: everything');
  assert.deepEqual(norm(core.srsPlanCat([], get, T0, 4, false, 30)), { pending: 30, quota: 8, today: [] }, 'unseen oral questions count too');
  assert.deepEqual(norm(core.srsPlanCat(['c'], get, T0, 4, false)), { pending: 0, quota: 0, today: [] });
});

/* ---- เบราว์เซอร์จริง (Playwright ของ Python ตัวเดียวกับ src/verify.py) — ข้ามเมื่อเครื่องไม่มี playwright/chromium ----
   1) ติ๊ก ✓ สองหัวข้อ → เลื่อนนาฬิกา +8 วัน (page.clock) → การ์ด «วันนี้ทวนอะไร» บนหน้าแรกมีสองรายการ «ครบกำหนด SRS»
   2) #/cram/vhist สูง < 60 000 px ที่ 1280 px · ไม่มี canvas/รูป · ทุกลิงก์ «อ่านเต็ม» ชี้หัวข้อ/id ที่มีจริง (ตรวจ DOM ที่สร้างตอนรัน)
   3) กด «อ่านเต็ม» แล้วไปถึงองค์ประกอบนั้นในฉบับเต็ม · กด «จำได้» ได้คีย์ q:<วิชา>/<หัวข้อ>/<id>
   4) จอ 360 px: การ์ดบนหน้าแรกและแถบใต้หัวหน้าวิชาไม่ล้นจอ · ไม่มี page error / console error / เรียกเซิร์ฟเวอร์ภายนอก */
const BROWSER_PY = String.raw`
import json, sys, threading, http.server, functools, datetime
out = {}
try:
    from playwright.sync_api import sync_playwright
except Exception as e:
    print(json.dumps({"skip": "ไม่มี playwright ของ Python: " + str(e)})); sys.exit(0)
ROOT = sys.argv[1]
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Q, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = "http://127.0.0.1:%d/" % srv.server_address[1]
errors, external = [], []
def watch(pg):
    pg.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
    pg.on("console", lambda m: errors.append("console: " + m.text) if m.type == "error" else None)
def guard(route):
    if route.request.url.startswith(BASE): route.continue_()
    else: external.append(route.request.url); route.abort()
with sync_playwright() as p:
    try:
        b = p.chromium.launch()
    except Exception as e:
        print(json.dumps({"skip": "เปิด chromium ไม่ได้: " + str(e).splitlines()[0]})); sys.exit(0)
    ctx = b.new_context(viewport={"width": 1280, "height": 900})
    ctx.route("**/*", guard)
    pg = ctx.new_page(); watch(pg)
    pg.goto(BASE + "#/nav/full")
    pg.wait_for_selector('.topic-check[data-key="k:nav-2"]')
    for k in ("k:nav-1", "k:nav-2"):
        pg.click('.topic-check[data-key="%s"]' % k)
    pg.wait_for_function('window.SRS && SRS.get("k:nav-1") && SRS.get("k:nav-2")')
    out["graded"] = pg.evaluate('[SRS.get("k:nav-1").ivl, SRS.get("k:nav-2").reps]')
    pg.goto(BASE + "#/")
    out["dueToday"] = pg.evaluate('document.querySelectorAll(".s6-today .s6-it").length')
    now = pg.evaluate("Date.now()")
    lctx = b.new_context(viewport={"width": 1280, "height": 900}, storage_state=ctx.storage_state())   # นาฬิกาของ Playwright มีผลทั้ง context
    lctx.route("**/*", guard)
    later = lctx.new_page(); watch(later)
    later.clock.set_fixed_time(datetime.datetime.fromtimestamp(now / 1000 + 8 * 86400, tz=datetime.timezone.utc))
    later.goto(BASE + "#/")
    later.wait_for_selector(".s6-today")
    out["later"] = later.evaluate('''() => [...document.querySelectorAll(".s6-today .s6-it")].map(li => ({
        title: li.querySelector("b").textContent, why: li.querySelector(".s6-why").textContent, href: li.querySelector("a.s6-go").getAttribute("href") }))''')
    out["titles"] = later.evaluate('["nav-1", "nav-2"].map(id => DEEP.nav.topics.find(t => t.id === id).th)')
    lctx.close()
    cram = {}
    for sid in ("vhist", "nav", "elob"):
        pg.goto(BASE + "#/cram/" + sid)
        pg.wait_for_selector(".cr-list.ready", timeout=180000)
        cram[sid] = pg.evaluate('''async sid => {
          const links = [...document.querySelectorAll("#view a[href^='#/" + sid + "/']")].map(a => a.getAttribute("href"));
          const bad = [], seen = new Set();
          for (const h of links) {
            if (seen.has(h)) continue; seen.add(h);
            const [, s, tid, anchor] = h.split("/").map(decodeURIComponent);
            if (s !== sid || !DEEP[sid].topics.some(t => t.id === tid)) { bad.push(h); continue; }
            if (!anchor) continue;
            const d = await dbGet("t", sid + "__" + tid), tpl = document.createElement("template");
            tpl.innerHTML = d.html;
            if (!tpl.content.getElementById(anchor)) bad.push(h);
          }
          return { h: document.documentElement.scrollHeight, canvas: document.querySelectorAll("#view canvas").length,
            img: document.querySelectorAll("#view img, #view [data-demo]").length, qa: document.querySelectorAll("#view details.qa[data-srs]").length,
            sum: document.querySelectorAll("#view .cr-sum").length, links: links.length, anchors: [...seen].filter(h => h.split("/").length > 3).length, bad };
        }''', sid)
    out["cram"] = cram
    pg.goto(BASE + "#/cram/vhist")
    pg.wait_for_selector(".cr-list.ready", timeout=180000)
    pg.evaluate('(() => { const d = document.querySelector("details.qa[data-srs]"); d.open = true; d.scrollIntoView(); })()')
    pg.click("details.qa[open] [data-crg='4']")
    out["qaKey"] = pg.evaluate('Object.keys(SRS.all()).filter(k => k.startsWith("q:"))')
    href = pg.evaluate('''[...document.querySelectorAll("#view a.cr-more")].map(a => a.getAttribute("href")).find(h => h.split("/").length > 3)''')
    pg.evaluate("h => { location.hash = h.slice(1); }", href)
    anchor = href.split("/")[3]
    pg.wait_for_function('a => state.v === "subject" && document.getElementById(a)', arg=anchor, timeout=60000)
    pg.wait_for_timeout(2500)
    out["jump"] = {"href": href, "top": pg.evaluate('a => Math.round(document.getElementById(a).getBoundingClientRect().top)', anchor)}
    m = ctx.new_page(); watch(m)
    m.set_viewport_size({"width": 360, "height": 780})
    m.goto(BASE + "#/tau")
    m.wait_for_selector("[data-s6date]")
    m.fill("[data-s6date]", (datetime.date.today() + datetime.timedelta(days=5)).isoformat())
    m.wait_for_selector(".s6-plan")
    m.click("[data-s6open]")
    m.wait_for_timeout(300)
    wide = 'Math.max(document.documentElement.scrollWidth, ...[...document.querySelectorAll(".s6-head, .s6-head *, .s6-today, .s6-today *")].map(e => Math.ceil(e.getBoundingClientRect().right)))'
    out["subject360"] = m.evaluate(wide)
    m.goto(BASE + "#/")
    m.wait_for_selector(".s6-today .s6-chip")
    out["overview360"] = m.evaluate(wide)
    out["plan"] = m.evaluate('examPlan("tau") && examPlan("tau").days')
    b.close()
out["errors"], out["external"] = errors, external
print(json.dumps(out, ensure_ascii=False))
`;

test('browser: due after 8 days on the overview · cram vhist < 60 000 px with live links · no overflow at 360 px', { timeout: 600000 }, t => {
  const { execFileSync } = require('node:child_process');
  const py = process.platform === 'win32' ? 'python' : 'python3';
  let raw;
  try {
    raw = execFileSync(py, ['-', ROOT], { input: BROWSER_PY, encoding: 'utf8', timeout: 580000, maxBuffer: 1 << 24 });
  } catch (e) {
    if (e.code === 'ENOENT') { t.skip('ไม่มี ' + py); return; }
    throw new Error('browser script failed: ' + (e.stderr || e.message));
  }
  const r = JSON.parse(raw.trim().split('\n').pop());
  if (r.skip) { t.skip(r.skip); return; }
  assert.deepEqual(r.errors, [], 'no page/console errors');
  assert.deepEqual(r.external, [], 'no requests outside the site');
  assert.deepEqual(r.graded, [1, 1], 'ticking = grade 4 → first interval 1 day');
  assert.equal(r.dueToday, 0, 'nothing due on the day of ticking');
  const due = r.later.filter(x => /ครบกำหนด SRS/.test(x.why));
  assert.equal(due.length, 2, 'two topics due 8 days later: ' + JSON.stringify(r.later));
  assert.deepEqual(due.map(x => x.title).sort(), r.titles.slice().sort());
  assert.deepEqual(due.map(x => x.href).sort(), ['#/nav/nav-1', '#/nav/nav-2']);
  for (const [sid, c] of Object.entries(r.cram)) {
    assert.deepEqual(c.bad, [], `${sid}: every «อ่านเต็ม» target exists`);
    assert.equal(c.canvas, 0, `${sid}: no canvas`);
    assert.equal(c.img, 0, `${sid}: no images or demo slots`);
    assert.ok(c.qa > 0 && c.links > c.qa, `${sid}: oral questions and links present`);
  }
  assert.ok(r.cram.vhist.h < 60000, `cram vhist height ${r.cram.vhist.h} px < 60 000`);
  assert.ok(r.cram.vhist.sum > 0 && r.cram.nav.anchors > 0, 'STD2 subjects keep 1-minute summaries and anchored links');
  assert.equal(r.qaKey.length, 1);
  assert.match(r.qaKey[0], /^q:vhist\/vhist-[^/]+\/[^/]+$/);
  assert.ok(Math.abs(r.jump.top) < 400, `«อ่านเต็ม» lands on its element (top ${r.jump.top} px, ${r.jump.href})`);
  assert.ok(r.subject360 <= 360, `subject head fits 360 px (${r.subject360})`);
  assert.ok(r.overview360 <= 360, `overview card fits 360 px (${r.overview360})`);
  assert.equal(r.plan, 5);
});
