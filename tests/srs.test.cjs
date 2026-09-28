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
