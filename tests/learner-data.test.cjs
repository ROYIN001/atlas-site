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

// ประกอบส่วนจริงของ app.js: ทะเบียน/ตัวเขียน (PROG) + termKey (CORE) + ช่อง S8 (ย้ายสคีมาตอนเริ่ม)
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
  vm.runInContext('storeFailed = e => { warned.push(e); };\n' + CORE + PROG + extra + SLOT +
    '\nObject.assign(this, { termKey, stableId, store, persist, persistBM, DONE, BM, learnerStart, migrateTermKeys, readMeta, LEARNER, get STORE_ERR() { return STORE_ERR; } });', sb);
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
  assert.equal(meta.schema, 2);
  assert.ok(meta.created && meta.lastActive);
  // เปิดครั้งที่สอง: ไม่ย้ายซ้ำ (ถึงจะมีคีย์รูปแบบเก่าหลุดเข้ามา) · created คงเดิม
  const before = st.getItem('atlas-sula-v1');
  st.setItem('atlas-bm-v1', JSON.stringify(['g:tau-1']));
  const sb2 = boot({ storage: st, modules });
  assert.equal(st.getItem('atlas-sula-v1'), before);
  assert.deepEqual([...sb2.BM], ['g:tau-1']);
  assert.equal(JSON.parse(st.getItem('atlas-meta-v1')).created, meta.created);
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
  assert.equal(JSON.parse(st.getItem('atlas-meta-v1')).schema, 2);
});

