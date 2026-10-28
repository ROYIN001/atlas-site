// Run: node --test tests/links.test.cjs
// S7: automatic lecture links («บรรยายที่ N» / «Лекция N» / «Т.N») in summary blocks and course maps,
// and the related-topics data (data/rel.json) written by src/build_steps/rel.py.
// Runs the DOM-free «S7 PURE» section of app.js in a vm against the real DEEP metadata and data/t.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const APP_MARKER = '/* ================= APP ================= */';

function section(startMarker, endMarker) {
  const start = app.indexOf(startMarker);
  const end = app.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `locate production section: ${startMarker}`);
  return app.slice(start, end);
}

// DEEP comes from the declaration prefix (no DOM); the pure S7 helpers are appended to it.
const ctx = vm.createContext({ window: { matchMedia: () => ({ matches: false }) } });
const S = vm.runInContext(app.slice(0, app.indexOf(APP_MARKER)) + '\n' +
  section('/* ---- S7 PURE BEGIN ---- */', '/* ---- S7 PURE END ---- */') +
  '\n({ DEEP, S7_LECFIX, S7_CHK_LEGACY, s7LecIndex, s7LecScan, s7RelPick, s7Status })',
  ctx, { timeout: 5000 });
const DEEP = JSON.parse(JSON.stringify(S.DEEP));
const IDX = S.s7LecIndex(S.DEEP, S.S7_LECFIX);

// Links a text would get: [[linked text, [target ids]], …]
const links = (sid, text) => JSON.parse(JSON.stringify(S.s7LecScan(text, sid, IDX).map(h => [text.slice(h.i, h.j), h.tids])));

test('lecture references resolve to the right topic (real sentences from data/t)', () => {
  assert.deepEqual(links('asu', 'สไลด์ 17 ของบรรยายที่ 4 เขียนโครงสร้าง'), [['บรรยายที่ 4', ['asu-3']]]);
  assert.deepEqual(links('asu', 'จากบรรยายที่ 3–15 และบรรยายสรุป'), [['บรรยายที่ 3', ['asu-2']], ['15', ['asu-14']]]);
  assert.deepEqual(links('nav', '«Л5 сл. 7» = บรรยายที่ 5 สไลด์ 7'), [['บรรยายที่ 5', ['nav-5']]]);
  assert.deepEqual(links('hist', 'หัวข้อ 1 (Тема 1) · บรรยายที่ 1 · 6 นิยาม'), [['บรรยายที่ 1', ['hist-l1']]]);
  assert.deepEqual(links('elob', 'แหล่งอ้างอิง: Лекции 1–18 · Тема 1–8'), [['Лекции 1', ['elob-1']], ['18', ['elob-18']]]);
  assert.deepEqual(links('nadezh', 'Лекции 8–9 — планы испытаний, точечные оценки'), [['Лекции 8', ['nas-8']], ['9', ['nas-9']]]);
  assert.deepEqual(links('nadezh', 'Тема 1 · Лекция 2 — показатели невосстанавливаемых объектов'), [['Лекция 2', ['nas-2']]]);
  assert.deepEqual(links('ppo', 'การควบคุมฉนวนและวงจร (บรรยายที่ 21)'), [['บรรยายที่ 21', ['ppo-21']]]);
});

test('«Т.N» means a course theme: ТАУ Т.6–Т.11 and СУ КА Тема 1–3 link, ТАУ Т.1–Т.5 do not', () => {
  assert.deepEqual(links('tau', 'ใช้หลักการซ้อนทับไม่ได้ (Т.8)'), [['Т.8', ['tau-t8']]]);
  assert.deepEqual(links('tau', 'กับดักภาค 6 (Т.6–Т.11) ที่เสียคะแนนบ่อย'), [['Т.6', ['tau-6']], ['Т.11', ['tau-t11']]]);
  assert.deepEqual(links('tau', 'Т.7 — желаемая ЛАХ สามช่วง'), [['Т.7', ['tau-7']]]);
  assert.deepEqual(links('tau', 'สถานะของโมดูลนี้: Т.1–Т.5 (หัวข้อ 2–8 ของโปรแกรม)'), []);
  assert.deepEqual(links('suka', 'Т.2 Системы управления угловым движением КА'), [['Т.2', ['suka-t2']]]);
  // lecture numbers are not theme numbers — «บรรยายที่ 6» goes to the lecture topic suka-l6 (lec: 6 · STD2 9 ต.ค. 2026), never to a Тема
  assert.deepEqual(links('suka', 'ตามกฎตรรกะเก้าโซนของบรรยายที่ 6'), [['บรรยายที่ 6', ['suka-l6']]]);
  // СУ КА ทั้งวิชา (16 ต.ค. 2026): ทุกบรรยายเป็นหัวข้อของตัวเอง (lec: N) → «บรรยายที่ 7» ลิงก์ไป suka-l7
  assert.deepEqual(links('suka', 'ตามกฎของบรรยายที่ 7'), [['บรรยายที่ 7', ['suka-l7']]]);
  assert.deepEqual(links('tau', 'Лекция 23 · сл. 6'), []);
  // СУ РН: หัวข้อเรียงตามบรรยาย (lec ใน DEEP · STD2 14 ต.ค. 2026) — หัวข้อเดียวรวมหลายบรรยายได้
  assert.deepEqual(links('surn', 'การบ้านของบรรยายที่ 5'), [['บรรยายที่ 5', ['surn-4']]]);
  assert.deepEqual(links('surn', 'Лекция 23 · сл. 47'), [['Лекция 23', ['surn-15']]]);
});

test('ВИ «Лекция 1» has two topics: both linked, or the one the quoted title names', () => {
  assert.deepEqual(links('vhist', 'Война (Лекция 1, сл. 8)'), [['Лекция 1', ['vhist-l1a', 'vhist-l1b']]]);
  assert.deepEqual(links('vhist', 'ที่มา: Лекция 1 «Военное искусство…» (сл. 11–12)'), [['Лекция 1', ['vhist-l1b']]]);
  assert.deepEqual(links('vhist', 'งานสัมมนา (Лекция 17, сл. 30)'), [['Лекция 17', ['vhist-l17']]]);
});

test('ТЭ: two slide series — second series and mismatched list titles are handled', () => {
  assert.deepEqual(links('teh_el', 'บรรยายที่ 8 ชุดที่สอง (ключи)'), [['บรรยายที่ 8', ['te-16']]]);
  assert.deepEqual(links('teh_el', '(บรรยายที่ 9 และ 10 ของชุดที่สอง — подполковник Петухов)'), [['บรรยายที่ 9', ['te-20']]]);
  assert.deepEqual(links('teh_el', 'Вторичные источники питания (บรรยายที่ 11–12 ชุดที่สอง)'), [['บรรยายที่ 11', ['te-21']]]);   // same topic: one link
  assert.deepEqual(links('asu', 'Лекции 1–2 (Тема 1)'), [['Лекции 1', ['asu-1']]]);
  assert.deepEqual(links('teh_el', 'Лекция 16 — Логические элементы'), [['Лекция 16', ['te-17']]]);
  assert.deepEqual(links('teh_el', 'ไฟล์ชื่อ «15» ข้างในเขียนว่า Лекция № 8. Электронные ключи'), []);
  assert.deepEqual(links('teh_el', 'Лекция 9 — Мультивибраторы'), []);
  assert.deepEqual(links('teh_el', 'Устойчивость ОУ (บรรยายที่ 11) คือปัญหาเสถียรภาพ'), [['บรรยายที่ 11', ['te-12']]]);
});

test('no false positives', () => {
  for (const [sid, text] of [
    ['tau', 'т. е. 5 звеньев'], ['tau', 'Т. е. при 5 Гц'], ['nav', 'Л1 сл. 12, 26–34 · Л2 сл. 3'],
    ['nav', 'сл. 7 · абз. 14'], ['elob', 'К теме 8 л.2 СНЭС Т.39, 40'], ['ppo', 'บรรยายที่ 123'],
    ['nadezh', 'ГОСТ 27.002 · В11Л4 текст п. 1'], ['asu', 'Лекции'], ['hist', 'บรรยายที่ไม่มีเลข'],
    ['toe', 'Лекция 3'], ['surn', 'บรรยายที่ 25'], ['nav', 'УЛ.5 и ГЛ. 3'],
  ]) assert.deepEqual(links(sid, text), [], `${sid}: ${text}`);
});

test('every mapped lecture target exists; explicit lec in DEEP wins', () => {
  for (const [sid, X] of Object.entries(IDX)) {
    const ids = new Set(DEEP[sid].topics.map(t => t.id));
    for (const k of ['L', 'T', 'L2']) for (const [n, a] of Object.entries(X[k]))
      for (const tid of a) assert.ok(ids.has(tid), `${sid} ${k}${n} → ${tid}`);
  }
  const d = { x: { topics: [{ id: 'x-1', ru: 'Лекция 1. A' }, { id: 'x-2', ru: 'B', lec: [1, 3] }] } };
  const X = JSON.parse(JSON.stringify(S.s7LecIndex(d, {}).x));
  assert.deepEqual(X.L[1], ['x-2']);
  assert.deepEqual(X.L[3], ['x-2']);
});

// Whole-site count: text nodes of every summary block and course map (tags split text like the DOM does;
// skips a/button/math/script/svg/code — the same containers app.js skips).
function textNodes(html) {
  const out = [];
  const skipTags = /^(a|button|math|script|style|svg|code|textarea)$/i;
  const re = /<(\/?)([a-zA-Z][\w-]*)[^>]*?(\/?)>|([^<]+)/g;
  const stack = [];
  let m;
  while ((m = re.exec(html))) {
    if (m[4] !== undefined) { if (!stack.some(t => skipTags.test(t))) out.push(m[4].replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')); continue; }
    const tag = m[2].toLowerCase();
    if (m[1]) { const i = stack.lastIndexOf(tag); if (i >= 0) stack.length = i; }
    else if (!m[3] && !/^(br|img|hr|input|meta|link|col|wbr|source|mspace|mprescripts|none)$/.test(tag)) stack.push(tag);
  }
  return out;
}

test('auto-links across the site: ≈ 600 links, ТАУ сводка «Схемы» ≥ 10, all targets real', () => {
  let total = 0;
  const per = {};
  for (const [sid, d] of Object.entries(DEEP)) {
    const ids = new Set(d.topics.map(t => t.id));
    const auto = [...d.topics.filter(t => /-map$/.test(t.id)), ...(d.summary || [])];
    for (const t of auto) {
      const f = path.join(ROOT, 'data', 't', `${sid}__${t.id}.json`);
      const html = JSON.parse(fs.readFileSync(f, 'utf8')).html;
      let n = 0;
      for (const txt of textNodes(html)) for (const h of S.s7LecScan(txt, sid, IDX)) {
        for (const tid of h.tids) assert.ok(ids.has(tid), `${t.id}: ${tid}`);
        n += h.tids.length;
      }
      per[t.id] = n;
      total += n;
    }
  }
  assert.ok(per['tau-s3'] >= 10, `tau-s3 links ${per['tau-s3']}`);
  // เพดาน 900 → 1100 (14 ต.ค. 2026): СУ РН ใส่ lec ทุกหัวข้อบรรยาย → s2/s3/s4 ลิงก์บรรยายได้ +122
  assert.ok(total >= 500 && total <= 1100, `site-wide lecture links ${total}`);
});

test('related-topic chips: same-subject top 2 + cross-subject ≥ 0.10; manual rel in DEEP wins', () => {
  const pick = (e, own, sid) => JSON.parse(JSON.stringify(S.s7RelPick(e, own, sid)));
  const e = { same: [['tau-7', 0.4], ['tau-t8', 0.3], ['tau-8', 0.2]], cross: [['nav', 'nav-9', 0.15], ['toe', 'toe-5', 0.1], ['suka', 'suka-t2', 0.09]] };
  assert.deepEqual(pick(e, undefined, 'tau'), [
    { sid: 'tau', tid: 'tau-7', cross: false }, { sid: 'tau', tid: 'tau-t8', cross: false },
    { sid: 'nav', tid: 'nav-9', cross: true }, { sid: 'toe', tid: 'toe-5', cross: true }]);
  assert.deepEqual(pick(e, ['tau-2', 'nav/nav-10'], 'tau'), [{ sid: 'tau', tid: 'tau-2', cross: false }, { sid: 'nav', tid: 'nav-10', cross: true }]);
  assert.deepEqual(pick(undefined, undefined, 'tau'), []);
});

test('content status badge from optional DEEP fields rev / chk / src (topic overrides subject)', () => {
  const st = (t, subj) => JSON.parse(JSON.stringify(S.s7Status(t, subj)));
  assert.deepEqual(st({ rev: '2026-09-26', chk: true, src: 'สไลด์ Л5' }), { cls: 'ok', text: '✓ ตรวจทานแล้ว · 26 ก.ย. 2026', src: 'สไลด์ Л5' });
  assert.deepEqual(st({ chk: false, rev: '2026-10-03' }), { cls: 'wip', text: 'ยังไม่ตรวจทาน · ปรับปรุง 3 ต.ค. 2026', src: '' });
  assert.deepEqual(st({ rev: '2026-01-05' }), { cls: 'rev', text: 'ปรับปรุง 5 ม.ค. 2026', src: '' });
  assert.deepEqual(st({}, { chk: true, rev: '2026-09-10' }), { cls: 'ok', text: '✓ ตรวจทานแล้ว · 10 ก.ย. 2026', src: '' });
  assert.deepEqual(st({ chk: false }, { chk: true }), { cls: 'wip', text: 'ยังไม่ตรวจทาน', src: '' });
  assert.equal(S.s7Status({}, {}), null);                    // legacy subject, unknown status: no badge, no guessing
  assert.equal(S.s7Status({ rev: '26.09.2026' }, {}), null);  // only ISO dates
  // no topic in DEEP carries malformed status fields
  for (const [sid, d] of Object.entries(DEEP)) for (const t of [d, ...d.topics, ...(d.summary || [])]) {
    if (t.rev !== undefined) assert.match(t.rev, /^\d{4}-\d{2}-\d{2}$/, `${sid} ${t.id || ''} rev`);
    if (t.chk !== undefined) assert.equal(typeof t.chk, 'boolean', `${sid} ${t.id || ''} chk`);
    if (t.src !== undefined) assert.equal(typeof t.src, 'string', `${sid} ${t.id || ''} src`);
  }
});

test('new subjects start unreviewed: a missing chk reads as false outside S7_CHK_LEGACY', () => {
  const st = (t, subj) => JSON.parse(JSON.stringify(S.s7Status(t, subj, true)));
  assert.deepEqual(st({}, {}), { cls: 'wip', text: 'ยังไม่ตรวจทาน', src: '' });
  assert.deepEqual(st({ rev: '2026-10-27', src: 'สไลด์ Л1' }, {}), { cls: 'wip', text: 'ยังไม่ตรวจทาน · ปรับปรุง 27 ต.ค. 2026', src: 'สไลด์ Л1' });
  assert.deepEqual(st({ chk: true, rev: '2026-10-27' }, {}), { cls: 'ok', text: '✓ ตรวจทานแล้ว · 27 ต.ค. 2026', src: '' });
  assert.deepEqual(st({}, { chk: true, rev: '2026-10-27' }), { cls: 'ok', text: '✓ ตรวจทานแล้ว · 27 ต.ค. 2026', src: '' });
  // the badge call site passes the legacy flag
  assert.match(app, /s7Status\(t, DEEP\[sid\], !S7_CHK_LEGACY\.includes\(sid\)\)/);
});

// «chk: false ตั้งแต่แรก» (27 ต.ค. 2026): every DEEP entry (topics + summary blocks) carries a boolean chk —
// on the topic, or once on the subject as a default — except the frozen list of older topics in tests/chk-legacy.json.
// The list can only shrink (CHK_CAP); chk: true always needs a rev date.
const CHK_FILE = path.join(ROOT, 'tests', 'chk-legacy.json');
const CHK_CAP = 199;
test('chk from the start: new subjects/topics need chk (false until both reviews pass); legacy list only shrinks', () => {
  const legacy = JSON.parse(fs.readFileSync(CHK_FILE, 'utf8')).topics;
  const missing = [], stale = [], noRev = [];
  for (const [sid, d] of Object.entries(DEEP)) {
    const allowed = new Set(legacy[sid] || []);
    for (const t of [...d.topics, ...(d.summary || [])]) {
      const chk = t.chk !== undefined ? t.chk : d.chk;
      const rev = t.rev !== undefined ? t.rev : d.rev;
      if (chk === undefined) { if (!allowed.has(t.id)) missing.push(`${sid}/${t.id}`); }
      else {
        assert.equal(typeof chk, 'boolean', `${sid}/${t.id} chk`);
        if (allowed.has(t.id)) stale.push(`${sid}/${t.id}`);
        if (chk === true && !/^\d{4}-\d{2}-\d{2}$/.test(String(rev || ''))) noRev.push(`${sid}/${t.id}`);
      }
    }
  }
  for (const [sid, ids] of Object.entries(legacy)) {
    const known = new Set(DEEP[sid] ? [...DEEP[sid].topics, ...(DEEP[sid].summary || [])].map(t => t.id) : []);
    for (const id of ids) if (!known.has(id)) stale.push(`${sid}/${id} (ไม่มีใน DEEP แล้ว)`);
  }
  assert.deepEqual(missing, [], 'หัวข้อใหม่ต้องมี chk: false ตั้งแต่แรก (ในหัวข้อ หรือครั้งเดียวที่ระดับวิชาใน DEEP) → true + rev หลังผ่านผู้ตรวจ tech และ lang: ' + missing.join(' '));
  assert.deepEqual(stale, [], 'มี chk แล้ว — ลบออกจาก tests/chk-legacy.json: ' + stale.join(' '));
  assert.deepEqual(noRev, [], 'chk: true ต้องมี rev "YYYY-MM-DD": ' + noRev.join(' '));
  const total = Object.values(legacy).reduce((n, a) => n + a.length, 0);
  assert.ok(total <= CHK_CAP, `tests/chk-legacy.json มี ${total} หัวข้อ เกินเพดาน ${CHK_CAP} — รายการนี้ลดได้เท่านั้น`);
  assert.deepEqual([...S.S7_CHK_LEGACY].sort(), Object.keys(legacy).filter(k => legacy[k].length).sort(),
    'S7_CHK_LEGACY ใน app.js ต้องตรงกับวิชาใน tests/chk-legacy.json (วิชาที่ใส่ chk ครบแล้ว ลบออกจากทั้งสองที่)');
});

test('data/rel.json: deterministic shape, real targets, sorted by score', { skip: !fs.existsSync(path.join(ROOT, 'data', 'rel.json')) }, () => {
  const rel = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'rel.json'), 'utf8'));
  assert.equal(rel.v, 1);
  const where = {};
  for (const [sid, d] of Object.entries(DEEP)) for (const t of [...d.topics, ...(d.summary || [])]) where[t.id] = sid;
  let n = 0;
  for (const [tid, r] of Object.entries(rel.t)) {
    assert.ok(where[tid], `rel source ${tid} exists`);
    assert.ok(!/-map$|-s[1-4]$/.test(tid), `maps and summary blocks excluded: ${tid}`);
    for (const [sid, id, sc] of r.same.map(x => [where[tid], ...x]).concat(r.cross)) {
      assert.equal(where[id], sid, `${tid} → ${sid}/${id}`);
      assert.ok(sc > 0 && sc <= 1);
    }
    assert.ok(r.same.every(([id]) => where[id] === where[tid]) && r.cross.every(([sid]) => sid !== where[tid]));
    for (const list of [r.same.map(x => x[1]), r.cross.map(x => x[2])])
      assert.deepEqual(list, [...list].sort((a, b) => b - a));
    n++;
  }
  assert.ok(n > 200, `topics with related lists: ${n}`);
  assert.ok(fs.statSync(path.join(ROOT, 'data', 'rel.json')).size < 80000);
});
