// Run: node --test tests/learner-data.test.cjs
// S8 — ข้อมูลผู้เรียน: id ถาวรของศัพท์ (termKey) · ย้ายสคีมา 1 → 2 · ตัวเขียน store() · นำเข้าไฟล์สำรองแบบกู้คืนได้
// รันโค้ดจริงจาก app.js ใน vm พร้อม localStorage จำลอง (ไม่ใช่การทดสอบในเบราว์เซอร์)
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
function section(startMarker, endMarker) {
  const start = app.indexOf(startMarker);
  const end = app.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `locate production section: ${startMarker}`);
  return app.slice(start, end);
}
const CORE = section('const HOOKS = {', 'const BLKCLS = {');
const PROG = section('/* ================= APP ================= */', '/* v5: ภาคเรียนของผู้อ่าน');
const SLOT = section('/* ===== SLOT S8 (', '/* ===== SLOT S8 END');
const BACKUP = section('/* ---- สำรอง/นำเข้าความคืบหน้า', '/* ---- overview ---- */');

// localStorage จำลอง · failOn(key) → setItem ของคีย์นั้นโยน QuotaExceededError
function fakeStorage(init) {
  const m = new Map(Object.entries(init || {}));
  const ls = {
    fail: null,
    get length() { return m.size; },
    key: i => [...m.keys()][i] ?? null,
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem(k, v) {
      if (ls.fail && ls.fail(k)) { const e = new Error('full'); e.name = 'QuotaExceededError'; e.code = 22; throw e; }
      m.set(k, String(v));
    },
    removeItem: k => { m.delete(k); },
    dump: () => Object.fromEntries(m),
  };
  return ls;
}

const mod = (id, rus) => ({ id, th: id, terms: rus.map(ru => ({ ru, th: ru + '-th' })) });

// ประกอบส่วนจริงของ app.js ตามลำดับในไฟล์: ทะเบียน/ตัวเขียน (PROG) → termKey + ย้ายสคีมาตอนเริ่ม (CORE) → สำรอง/นำเข้า → ช่อง S8
function boot({ storage, modules, extra = '' }) {
  const warned = [];
  const sb = {
    console, localStorage: storage, MODULES: modules, PAGES: [], view: {}, ADMINKEY: 'atlas-admin-v1',
    location: { reload() { sb.reloaded = (sb.reloaded || 0) + 1; }, search: '' },
    confirm: msg => { sb.confirms.push(msg); return sb.answer; }, confirms: [], answer: true,
    navigator: {}, warned,
  };
  vm.createContext(sb);
  // แทน storeFailed (แถบแจ้งใน DOM) ด้วยตัวจด — กำหนดก่อนโค้ดรัน จึงจับการแจ้งระหว่างย้ายสคีมาตอนเริ่มได้
  vm.runInContext('storeFailed = e => { warned.push(e); };\n' + PROG + CORE + BACKUP + extra + SLOT +
    '\nObject.assign(this, { termKey, stableId, store, persist, persistBM, saveLast, DONE, BM, learnerStart, migrateTermKeys, readMeta, LEARNER, learnerKey,' +
    ' importPlan, progressImport, restorePrev, clearTemp, migrateQuizKeys, storeErr: () => STORE_ERR });', sb);
  return sb;
}

test('termKey: id ถาวรจากคำรัสเซีย ไม่ขึ้นกับลำดับ · คำซ้ำในกลุ่มได้ -2, -3 แบบคงที่', () => {
  const { termKey, stableId } = boot({ storage: fakeStorage(), modules: [] });
  const m = mod('tau', ['регулятор', 'объект', 'регулятор', 'звено', 'регулятор']);
  const keys = m.terms.map((t, i) => termKey(m, t, i));
  assert.equal(keys[0], 'g:tau-' + stableId('регулятор'));
  assert.equal(keys[1], 'g:tau-' + stableId('объект'));
  assert.equal(keys[2], keys[0] + '-2');
  assert.equal(keys[4], keys[0] + '-3');
  assert.equal(new Set(keys).size, keys.length, 'ทุกคำได้คีย์ไม่ซ้ำ');
  // ไม่ส่ง i ที่ตรง → หาเองจากตำแหน่งของ t
  assert.equal(termKey(m, m.terms[2], 99), keys[2]);
  // สลับลำดับคำที่ไม่ซ้ำ + แทรกคำใหม่ต้นกลุ่ม → คีย์ของคำเดิมไม่เปลี่ยน
  const zveno = m.terms[3], obj = m.terms[1];
  m.terms.splice(3, 1); m.terms.splice(1, 1);
  m.terms.unshift({ ru: 'новое' }, zveno, obj);
  assert.equal(termKey(m, zveno, m.terms.indexOf(zveno)), keys[3]);
  assert.equal(termKey(m, obj, m.terms.indexOf(obj)), keys[1]);
  // กลุ่มต่างกัน คำเดียวกัน → คนละคีย์
  const m2 = mod('nav', ['регулятор']);
  assert.notEqual(termKey(m2, m2.terms[0], 0), keys[0]);
});

test('เรียงคำใหม่/แทรกคำ แล้วเครื่องหมาย «จำได้» และบุ๊กมาร์กยังผูกกับคำเดิม', () => {
  const modules = [mod('tau', ['а1', 'б2', 'в3', 'г4', 'д5'])];
  const st = fakeStorage();
  const sb = boot({ storage: st, modules });
  const m = modules[0], key = t => sb.termKey(m, t, m.terms.indexOf(t));
  const [a, , c, , e] = m.terms;
  sb.DONE.add(key(a)); sb.DONE.add(key(c)); sb.BM.add(key(e));
  sb.persist(); sb.persistBM();
  // เจ้าของงานแทรกคำใหม่สองคำและกลับลำดับ แล้วผู้อ่านเปิดหน้าใหม่
  m.terms.reverse(); m.terms.splice(2, 0, { ru: 'новое1' }); m.terms.unshift({ ru: 'новое0' });
  const sb2 = boot({ storage: st, modules });
  const marked = m.terms.filter(t => sb2.DONE.has(sb2.termKey(m, t, m.terms.indexOf(t)))).map(t => t.ru);
  assert.deepEqual(marked.sort(), ['а1', 'в3']);
  assert.deepEqual(m.terms.filter(t => sb2.BM.has(sb2.termKey(m, t, m.terms.indexOf(t)))).map(t => t.ru), ['д5']);
});

test('ย้ายสคีมา 1 → 2: คีย์ลำดับเดิมใน DONE/BM กลายเป็นคีย์ใหม่ของคำเดียวกัน ครั้งเดียว', () => {
  const modules = [mod('tau', ['а1', 'б2', 'в3']), mod('nav', ['х1', 'ц2'])];
  const st = fakeStorage({
    'atlas-sula-v1': JSON.stringify(['k:tau-t1', 'g:tau-0', 'g:tau-2', 'g:nav-1', 'g:tau-9']),
    'atlas-bm-v1': JSON.stringify(['g:nav-0', 'tau-t3']),
  });
  const sb = boot({ storage: st, modules });
  const K = (mi, i) => sb.termKey(modules[mi], modules[mi].terms[i], i);
  const done = new Set(JSON.parse(st.getItem('atlas-sula-v1')));
  assert.deepEqual([...done].sort(), ['k:tau-t1', K(0, 0), K(0, 2), K(1, 1), 'g:tau-9'].sort(),
    'แปลงเฉพาะคีย์ศัพท์ที่มีคำอยู่จริง · คีย์หัวข้อและคีย์ที่ไม่ตรงคำใดคงไว้');
  assert.deepEqual(JSON.parse(st.getItem('atlas-bm-v1')).sort(), [K(1, 0), 'tau-t3'].sort());
  const meta = JSON.parse(st.getItem('atlas-meta-v1'));
  assert.equal(meta.schema, 3, 'ย้ายต่อเนื่อง 1 → 2 → 3 ในการเปิดครั้งเดียว');
  assert.ok(meta.created && meta.lastActive);
  // เปิดครั้งที่สอง: ไม่ย้ายซ้ำ (ถึงจะมีคีย์รูปแบบเก่าหลุดเข้ามา) · created คงเดิม
  const before = st.getItem('atlas-sula-v1');
  st.setItem('atlas-bm-v1', JSON.stringify(['g:tau-1']));
  const sb2 = boot({ storage: st, modules });
  assert.equal(st.getItem('atlas-sula-v1'), before);
  assert.deepEqual([...sb2.BM], ['g:tau-1']);
  assert.equal(JSON.parse(st.getItem('atlas-meta-v1')).created, meta.created);
});

test('ย้ายสคีมา 1 → 2 ย้ายคีย์ศัพท์ใน atlas-srs-v1 (S6) ด้วย · คีย์อื่นใน SRS คงเดิม', () => {
  const modules = [mod('tau', ['а1', 'б2'])];
  const st = fakeStorage({ 'atlas-srs-v1': JSON.stringify({ 'g:tau-1': { due: 5, reps: 2 }, 'k:tau-t1': { due: 7 } }) });
  const sb = boot({ storage: st, modules });
  assert.deepEqual(JSON.parse(st.getItem('atlas-srs-v1')),
    { [sb.termKey(modules[0], modules[0].terms[1], 1)]: { due: 5, reps: 2 }, 'k:tau-t1': { due: 7 } });
  // ย้ายต้องเกิดก่อนช่อง SLOT ทั้งหมด (ช่อง S6 อ่าน atlas-srs-v1 ตอนเริ่ม)
  assert.ok(app.indexOf('learnerStart();') < app.indexOf('/* ===== SLOT S1 ('), 'migration runs before the session slots');
});

test('ย้ายสคีมาแล้วเขียนไม่สำเร็จ → schema ไม่ขยับ ครั้งหน้าย้ายต่อได้ ข้อมูลเดิมไม่เสีย', () => {
  const modules = [mod('tau', ['а1', 'б2'])];
  const st = fakeStorage({ 'atlas-sula-v1': JSON.stringify(['g:tau-1']) });
  st.fail = k => k === 'atlas-sula-v1';
  const sb = boot({ storage: st, modules });
  assert.equal(sb.warned.length, 1, 'แจ้งผู้อ่าน');
  assert.equal(st.getItem('atlas-sula-v1'), JSON.stringify(['g:tau-1']), 'ของเดิมยังอยู่');
  assert.equal(JSON.parse(st.getItem('atlas-meta-v1')).schema, 1);
  st.fail = null;
  const sb2 = boot({ storage: st, modules });
  assert.deepEqual(JSON.parse(st.getItem('atlas-sula-v1')), [sb2.termKey(modules[0], modules[0].terms[1], 1)]);
  assert.equal(JSON.parse(st.getItem('atlas-meta-v1')).schema, 3);
});


// ---- ข้อ 2–4: นำเข้า/กู้คืน/ตัวเขียน ----
const ORIGINAL = {
  'atlas-sula-v1': JSON.stringify(['k:tau-t1', 'k:tau-t2']),
  'atlas-bm-v1': JSON.stringify(['tau-t3']),
  'atlas-quiz-v1': JSON.stringify({ 'tau-t1': { 0: { done: 1, ok: 1, n: 1 } } }),
  'atlas-practice-v1': JSON.stringify({ 'tau-t1': { 'tau-t1-q1': { done: 1, ok: 1, n: 1 } } }),   // S5 มีบล็อกนี้แล้ว → ย้ายสคีมา 3 ไม่เขียนอะไร
  'atlas-last-v1': JSON.stringify({ v: 'subject', id: 'tau' }),
  'atlas-admin-v1': '1',
};
const fileOf = obj => ({ text: async () => (typeof obj === 'string' ? obj : JSON.stringify(obj)) });
const learner = st => Object.fromEntries(Object.entries(st.dump()).filter(([k]) => !['atlas-meta-v1', 'atlas-backup-prev', 'atlas-admin-v1'].includes(k)));
function fresh() {
  const st = fakeStorage(ORIGINAL);
  const sb = boot({ storage: st, modules: [mod('tau', ['а1'])] });
  return { st, sb, before: learner(st) };
}
const GOOD = {
  app: 'atlas-site', v: 2, schema: 2, saved: '2026-09-01T10:00:00Z',
  data: { 'atlas-sula-v1': JSON.stringify(['k:a', 'k:b', 'k:c']), 'atlas-bm-v1': JSON.stringify(['x', 'y']), 'atlas-zzz-v9': '{}', 'atlas-foo': '1' },
};

test('นำเข้าไฟล์เสีย/ผิดรูปแบบ/รุ่นใหม่กว่า → ปฏิเสธพร้อมเหตุผล ข้อมูลเดิมครบ ไม่ถามยืนยัน', async () => {
  const cases = [
    [{ x: 1 }, /ไม่ใช่ไฟล์สำรอง/],
    ['{oops', /ไม่ใช่ JSON/],
    [{ app: 'atlas-site', v: 1, data: {} }, /ไม่มีข้อมูล/],
    [{ app: 'atlas-site', v: 9, data: { 'atlas-sula-v1': '[]' } }, /รุ่นใหม่กว่า/],
    [{ app: 'atlas-site', v: 2, schema: 4, data: { 'atlas-sula-v1': '[]' } }, /รุ่นใหม่กว่า/],
    [{ app: 'atlas-site', v: 2, data: { 'atlas-sula-v1': '{"a":1}' } }, /atlas-sula-v1.*รูปแบบไม่ถูกต้อง/],
    [{ app: 'atlas-site', v: 2, data: { 'atlas-bm-v1': '[1,{"a":2}]' } }, /atlas-bm-v1/],
    [{ app: 'atlas-site', v: 2, data: { 'atlas-quiz-v1': '[]' } }, /atlas-quiz-v1/],
    [{ app: 'atlas-site', v: 2, data: { 'atlas-mode-v1': 'zzz' } }, /atlas-mode-v1/],
    [{ app: 'atlas-site', v: 2, data: { 'atlas-meta-v1': '{"schema":"x"}' } }, /atlas-meta-v1/],
    [{ app: 'atlas-site', v: 2, data: { 'atlas-foo': 5 } }, /ไม่ใช่ข้อความ/],
  ];
  for (const [obj, re] of cases) {
    const { st, sb, before } = fresh();
    await assert.rejects(sb.progressImport(fileOf(obj)), re, JSON.stringify(obj));
    assert.deepEqual(learner(st), before);
    assert.equal(st.getItem('atlas-backup-prev'), null);
    assert.equal(sb.confirms.length, 0);
    assert.equal(sb.reloaded, undefined);
  }
});

test('นำเข้า: สรุปสิ่งที่จะเปลี่ยนก่อนยืนยัน · ยกเลิกแล้วไม่แตะอะไร · สำเร็จแล้วชุดเดิมอยู่ใน atlas-backup-prev', async () => {
  const { st, sb, before } = fresh();
  sb.answer = false;
  assert.equal(await sb.progressImport(fileOf(GOOD)), false);
  assert.deepEqual(learner(st), before);
  const msg = sb.confirms[0];
  assert.match(msg, /เครื่องหมายทบทวน\/จำได้ 2 → 3/);
  assert.match(msg, /บุ๊กมาร์ก 1 → 2/);
  assert.match(msg, /ผลควิซ \(หัวข้อ\) 1 → 0/);
  assert.match(msg, /ไม่รู้จัก 2 รายการ/);
  sb.answer = true;
  assert.equal(await sb.progressImport(fileOf(GOOD)), true);
  assert.equal(sb.reloaded, 1);
  assert.deepEqual(learner(st), GOOD.data, 'แทนที่ทั้งชุด (คีย์ที่ไฟล์ไม่มีถูกลบ)');
  assert.equal(st.getItem('atlas-admin-v1'), '1', 'โหมดผู้ดูแลไม่ถูกแตะ');
  const prev = JSON.parse(st.getItem('atlas-backup-prev'));
  const { 'atlas-admin-v1': _a, ...origLearner } = ORIGINAL;
  assert.deepEqual(Object.fromEntries(Object.entries(prev.data).filter(([k]) => k !== 'atlas-meta-v1')), origLearner);
  assert.equal(JSON.parse(st.getItem('atlas-meta-v1')).schema, 2);
  // กู้คืนชุดก่อนนำเข้า → กลับเป็นชุดเดิม และชุดที่นำเข้าสลับไปอยู่ใน atlas-backup-prev
  assert.equal(sb.restorePrev(), true);
  assert.deepEqual(learner(st), origLearner);
  assert.deepEqual(Object.fromEntries(Object.entries(JSON.parse(st.getItem('atlas-backup-prev')).data).filter(([k]) => k !== 'atlas-meta-v1')), GOOD.data);
});

test('นำเข้าแล้ว setItem ล้มกลางทาง (พื้นที่เต็ม) → คืนชุดเดิมครบและแจ้งเหตุผล', async () => {
  const { st, sb, before } = fresh();
  let n = 0;
  st.fail = k => k !== 'atlas-backup-prev' && ++n === 2;       // เขียนได้คีย์แรก คีย์ที่สองพื้นที่เต็ม
  await assert.rejects(sb.progressImport(fileOf(GOOD)), /พื้นที่เก็บของเบราว์เซอร์เต็ม.*คืนข้อมูลเดิมครบแล้ว/);
  assert.deepEqual(learner(st), before);
  assert.equal(sb.reloaded, undefined);
});

test('นำเข้าแล้วเก็บชุดปัจจุบันลง atlas-backup-prev ไม่ได้ → ยกเลิกทั้งหมด ข้อมูลเดิมครบ', async () => {
  const { st, sb, before } = fresh();
  st.fail = k => k === 'atlas-backup-prev';
  await assert.rejects(sb.progressImport(fileOf(GOOD)), /ยังไม่ได้เปลี่ยนอะไร/);
  assert.deepEqual(learner(st), before);
});

test('ไฟล์สำรองรุ่น 1 (เว็บเดิม คีย์ศัพท์เป็นลำดับ) → schema 1 แล้วย้ายเป็นคีย์ถาวรตอนเปิดหน้าใหม่', async () => {
  const modules = [mod('tau', ['а1', 'б2'])];
  const st = fakeStorage({ 'atlas-sula-v1': '[]' });
  const sb = boot({ storage: st, modules });
  await sb.progressImport(fileOf({ app: 'atlas-site', v: 1, saved: '2026-08-01T00:00:00Z', data: { 'atlas-sula-v1': JSON.stringify(['g:tau-1', 'k:tau-t1']) } }));
  assert.equal(JSON.parse(st.getItem('atlas-meta-v1')).schema, 1);
  const sb2 = boot({ storage: st, modules });                  // = location.reload()
  assert.deepEqual(JSON.parse(st.getItem('atlas-sula-v1')), [sb2.termKey(modules[0], modules[0].terms[1], 1), 'k:tau-t1']);
  assert.equal(JSON.parse(st.getItem('atlas-meta-v1')).schema, 3);
});

test('store(): สำเร็จคืน true · พื้นที่เต็มคืน false แจ้งผู้อ่าน ข้อมูลเดิมในเครื่องไม่เสีย', () => {
  const { st, sb } = fresh();
  assert.equal(sb.store('atlas-x-v1', { a: 1 }), true);
  assert.equal(st.getItem('atlas-x-v1'), '{"a":1}');
  assert.equal(sb.store('atlas-x-v1', 'raw'), true);
  assert.equal(st.getItem('atlas-x-v1'), 'raw');
  assert.equal(sb.store('atlas-x-v1', undefined), true);
  assert.equal(st.getItem('atlas-x-v1'), null);
  st.fail = () => true;
  sb.DONE.add('k:new');
  assert.equal(sb.persist(), false);
  assert.equal(sb.warned.length, 1);
  assert.equal(sb.warned[0].quota, true);
  assert.equal(sb.warned[0].key, 'atlas-sula-v1');
  assert.equal(sb.storeErr().key, 'atlas-sula-v1');
  assert.equal(st.getItem('atlas-sula-v1'), ORIGINAL['atlas-sula-v1'], 'ค่าเดิมในเครื่องยังอยู่');
  // ตัวเขียนทุกตัวในบล็อกความคืบหน้าเรียกผ่าน store() — ไม่มี setItem ตรง ๆ ที่กลืน error เงียบ
  assert.doesNotMatch(PROG, /localStorage\.setItem\((KEY|BMKEY|LASTKEY|RAILKEY)/);
  assert.match(app, /const saveSem = \(\) => store\(SEMKEY, SEMOVR\);/);
  assert.match(app, /const saveQuiz = \(\) => store\(QKEY, QUIZ\);/);
});

test('ล้างข้อมูลชั่วคราว: ลบเฉพาะคีย์ที่สร้างใหม่ได้ · atlas-backup-prev ต้องยืนยันแยก · ความคืบหน้าไม่ถูกลบ', () => {
  const { st, sb } = fresh();
  st.setItem('atlas-rail-v1', '[1]');
  st.setItem('atlas-backup-prev', JSON.stringify({ data: {} }));
  const answers = [true, false];
  sb.confirm = () => answers.shift();
  assert.match(sb.clearTemp(), /ล้างแล้ว 2 รายการ/);
  assert.equal(st.getItem('atlas-last-v1'), null);
  assert.equal(st.getItem('atlas-rail-v1'), null);
  assert.notEqual(st.getItem('atlas-backup-prev'), null, 'ไม่ยืนยันข้อสอง → ชุดก่อนนำเข้ายังอยู่');
  for (const k of ['atlas-sula-v1', 'atlas-bm-v1', 'atlas-quiz-v1']) assert.equal(st.getItem(k), ORIGINAL[k]);
});

// ---- หลังรวมทั้ง 8 session: ทุกคีย์ข้อมูลผู้เรียนลงทะเบียนและเขียนผ่าน store() ----
test('ทุกคีย์ atlas-*-vN ใน app.js ลงทะเบียนด้วย learnerKey() (ตรวจไฟล์สำรอง + สรุปก่อนนำเข้าได้ครบ)', () => {
  const consts = {};
  for (const m of app.matchAll(/(\w+) = "(atlas-[\w-]+)"/g)) consts[m[1]] = m[2];
  const registered = new Set();
  for (const m of app.matchAll(/learnerKey\(\s*(?:"(atlas-[\w-]+)"|(\w+))/g)) registered.add(m[1] || consts[m[2]]);
  const used = new Set([...app.matchAll(/"(atlas-[a-z]+(?:-[a-z]+)*-v\d+)"/g)].map(m => m[1]));
  used.delete('atlas-admin-v1');                                 // โหมดผู้ดูแล ไม่ใช่ข้อมูลผู้เรียน ไม่อยู่ในไฟล์สำรอง
  const missing = [...used].filter(k => !registered.has(k));
  assert.deepEqual(missing, [], 'คีย์ใหม่ต้องเรียก learnerKey(key, {kind, label, …}) ในช่องของตัวเอง');
});

test('ไม่มี localStorage.setItem ตรง ๆ นอก store() · โหมดผู้ดูแล · นำเข้าแบบกู้คืน · สำเนาออฟไลน์ (S3 มีทางลดขนาดเองเมื่อพื้นที่เต็ม)', () => {
  const allowed = ['localStorage.setItem(key, typeof value', 'ADMINKEY', 'PREVKEY', 'next[k]', 'back[k]', 'OFFKEY'];
  const bad = app.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => l.includes('localStorage.setItem(') && !allowed.some(a => l.includes(a)));
  assert.deepEqual(bad.map(([n, l]) => n + ': ' + l.trim().slice(0, 90)), []);
});

test('kind "list" (ประวัติ/หัวข้อที่ปัก ของ S7): array ของอะไรก็ได้ · ไม่ใช่ array = ปฏิเสธ', async () => {
  const { st, sb, before } = fresh();
  await assert.rejects(sb.progressImport(fileOf({ app: 'atlas-site', v: 2, data: { 'atlas-recent-v1': '{}' } })), /atlas-recent-v1/);
  assert.deepEqual(learner(st), before);
  sb.answer = false;
  await sb.progressImport(fileOf({ app: 'atlas-site', v: 2, data: { 'atlas-pins-v1': '[{"sid":"tau","tid":"tau-t1","t":1}]', 'atlas-sula-v1': '[]' } }));
  assert.match(sb.confirms[0], /หัวข้อที่ปักไว้ 0 → 1/);
  assert.doesNotMatch(sb.confirms[0], /ไม่รู้จัก/);
});

test('ย้ายสคีมา 2 → 3: คีย์ควิซรายบล็อกตามลำดับ (ก่อน S5) → id ของ host · SRS เก็บตัวที่ทวนล่าสุด · ผลควิซก่อน S5 เข้า atlas-practice-v1', () => {
  const st = fakeStorage({
    'atlas-meta-v1': JSON.stringify({ schema: 2, created: '2026-09-28T00:00:00Z' }),
    'atlas-srs-v1': JSON.stringify({
      'z:nav-4/0': { due: 1, ivl: 1, last: 100 }, 'z:nav-4/nav-4-q1': { due: 2, ivl: 3, last: 200 },   // ซ้ำ: เก็บ last มากกว่า
      'z:nav-4/1': { due: 3, ivl: 1, last: 50 }, 'k:nav-4': { due: 4, ivl: 1, last: 10 }, 'z:nav-5/nav-5-q2': { due: 5, ivl: 1, last: 1 } }),
    'atlas-quiz-v1': JSON.stringify({ 'nav-4': { 0: { done: 3, ok: 3, n: 3 }, 1: { done: 2, ok: 1, n: 2 } } }),
    'atlas-practice-v1': JSON.stringify({ 'nav-4': { 'nav-4-q2': { done: 2, ok: 2, n: 2 } }, _opt: { timer: false } }),
  });
  boot({ storage: st, modules: [] });
  assert.equal(JSON.parse(st.getItem('atlas-meta-v1')).schema, 3);
  const srs = JSON.parse(st.getItem('atlas-srs-v1'));
  assert.deepEqual(Object.keys(srs).sort(), ['k:nav-4', 'z:nav-4/nav-4-q1', 'z:nav-4/nav-4-q2', 'z:nav-5/nav-5-q2']);
  assert.equal(srs['z:nav-4/nav-4-q1'].last, 200);
  assert.equal(srs['z:nav-4/nav-4-q2'].last, 50);
  const prac = JSON.parse(st.getItem('atlas-practice-v1'));
  assert.deepEqual(prac['nav-4']['nav-4-q1'], { done: 3, ok: 3, n: 3 }, 'บล็อกที่ S5 ยังไม่มี → คัดลอกจาก atlas-quiz-v1');
  assert.deepEqual(prac['nav-4']['nav-4-q2'], { done: 2, ok: 2, n: 2 }, 'บล็อกที่ S5 มีแล้ว → ไม่ทับ');
  assert.deepEqual(prac._opt, { timer: false });
  boot({ storage: st, modules: [] });                       // เปิดครั้งที่สอง: ไม่ย้ายซ้ำ
  assert.deepEqual(JSON.parse(st.getItem('atlas-srs-v1')), srs);
});
