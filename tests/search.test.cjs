// Run: node --test tests/search.test.cjs
// ค้นหา (S4): โหลดดัชนีเป็นขั้น · สถานะต่อวิชา · ลองใหม่เฉพาะที่ขาด · INDEX อ้างสตริงของ IXHAY · คลังศัพท์ใช้ชื่อพ้องเดียวกับค้นหา ·
// ที่อยู่ #/search/<คำ>[/<วิชา>] — รันโค้ดจริงจาก app.js ใน vm พร้อมตัวแทน DOM/fetch แบบย่อ (ไม่ใช่การทดสอบในเบราว์เซอร์ — ดู search.browser.cjs)
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
const SEARCH_CORE = section('/* ---- search ---- */', '/* ไฮไลต์คำที่ค้นในหัวข้อปลายทาง');
const EXPORTS = `
({ loadIndex, ixPrime, ixRetry, ixMissing, ixBusy, ixUrl, buildIndex, searchHit, searchQueries, textMatch, INDEX, IXHAY, IXST,
   get IX_READY() { return IX_READY; }, get IX_DONE() { return IX_DONE; }, get IX_TOTAL() { return IX_TOTAL; } });`;

const SUBJ = ['tau', 'toe', 'nav', 'vhist'];
const flush = () => new Promise(r => setImmediate(r));
function harness({ fail = new Set(), manifest = true } = {}) {
  const fetched = [];
  let refreshed = 0;
  const sandbox = {
    DATA_VERSION: 'T1',
    state: { v: 'search', q: 'x' },
    manifestGet: async () => manifest ? { subjects: Object.fromEntries(SUBJ.map(s => [s, { n: 1 }])) } : null,
    fetch: async url => {
      fetched.push(url);
      const sid = /data\/ix\/(\w+)\.json/.exec(url)[1];
      if (fail.has(sid)) throw new TypeError('network');
      return { ok: true, json: async () => ({ rows: [{ id: sid + '-t1', hay: 'текст ' + sid + ' ёмкость фильтр калмана' }] }) };
    },
    setTimeout: (fn) => { refreshed++; return 0; }, clearTimeout: () => {},
    ALL_SUBJ: SUBJ.map(id => ({ id, ru: 'Предмет ' + id, th: 'วิชา ' + id, desc: '', topics: [] })),
    DEEP: Object.fromEntries(SUBJ.map(s => [s, { topics: [{ id: s + '-t1', ru: 'Тема ' + s, th: 'หัวข้อ ' + s }], summary: [] }])),
    MODULES: [{ id: 'nav', th: 'นำร่อง', terms: [{ ru: 'Фильтр Калмана', th: 'ตัวกรองคาลมาน', note: '' }] }],
    semTxt: () => 'ภาค 1',
  };
  const api = vm.runInNewContext(SEARCH_CORE + EXPORTS, sandbox);
  const ixFetched = () => fetched.map(u => /data\/ix\/(\w+)\.json/.exec(u)[1]);
  return { api, sandbox, fetched, ixFetched, refreshes: () => refreshed };
}

test('failed subjects keep IX_READY false, are listed as missing, and retry fetches only them', async () => {
  const { api, ixFetched } = harness({ fail: new Set(['toe', 'vhist']) });
  await api.loadIndex();
  assert.equal(api.IX_READY, false, 'IX_READY stays false while any subject is missing');
  assert.equal(api.IX_DONE, 2);
  assert.equal(api.IX_TOTAL, 4);
  assert.deepEqual([...api.ixMissing()], ['toe', 'vhist']);
  assert.equal(api.IXST.tau, 'ok');
  assert.equal(api.IXST.toe, 'fail');
  assert.equal(api.ixBusy(), false);
  assert.equal(ixFetched().length, 4, 'each subject fetched once');

  await api.loadIndex();
  assert.equal(ixFetched().length, 4, 'loadIndex does not silently re-fetch failed subjects');

  const { api: api2, ixFetched: f2, sandbox } = harness({ fail: new Set(['toe']) });
  await api2.loadIndex();
  assert.deepEqual([...api2.ixMissing()], ['toe']);
  // network recovers: retry must request only the missing subject
  const okFetch = harness().sandbox.fetch;
  const seen = [];
  sandbox.fetch = async url => { seen.push(url); return okFetch(url); };
  await api2.ixRetry();
  assert.equal(f2().length, 4);
  assert.deepEqual(seen.map(u => /data\/ix\/(\w+)\.json/.exec(u)[1]), ['toe']);
  assert.equal(api2.IX_READY, true);
  assert.deepEqual([...api2.ixMissing()], []);
});

test('staged loading: prime loads only the open subject, loadIndex puts the open subject first', async () => {
  const { api, ixFetched } = harness();
  await api.ixPrime(['nav']);
  assert.deepEqual(ixFetched(), ['nav']);
  assert.equal(api.IX_READY, false);
  await api.loadIndex(['vhist']);
  assert.deepEqual(ixFetched(), ['nav', 'vhist', 'tau', 'toe'], 'priority subject first, then the rest one at a time, no refetch');
  assert.equal(api.IX_READY, true);
  assert.equal(api.IX_DONE, api.IX_TOTAL);
});

test('subjects load one at a time', async () => {
  const { api, sandbox } = harness();
  let inflight = 0, peak = 0;
  const orig = sandbox.fetch;
  sandbox.fetch = async url => { inflight++; peak = Math.max(peak, inflight); await flush(); inflight--; return orig(url); };
  await api.loadIndex();
  assert.equal(peak, 1);
});

test('manifest failure is reported and retry reloads it', async () => {
  const h = harness({ manifest: false });
  await h.api.loadIndex();
  assert.equal(h.api.IX_READY, false);
  assert.equal(h.fetched.length, 0);
  h.sandbox.manifestGet = harness().sandbox.manifestGet;
  await h.api.ixRetry();
  assert.equal(h.api.IX_READY, true);
});

test('INDEX bodies reference IXHAY strings (no copy), ё is folded to е, results refresh on arrival', async () => {
  const h = harness();
  h.api.buildIndex();                                  // built early, before any full text arrived
  const row = h.api.INDEX.find(x => x.tid === 'tau-t1');
  assert.equal(row.b, '');
  await h.api.loadIndex();
  assert.equal(h.api.IXHAY['tau__tau-t1'], 'текст tau емкость фильтр калмана');
  assert.equal(row.b, h.api.IXHAY['tau__tau-t1'], 'existing INDEX entries pick up the text in place');
  assert.ok(h.refreshes() > 0, 'arrival schedules a debounced refresh');
  const hit = h.api.searchHit(row, h.api.searchQueries('ЁМКОСТЬ'));
  assert.ok(hit && hit.at >= 0);
  assert.ok(h.api.searchHit(row, h.api.searchQueries('Kalman')));
  const term = h.api.INDEX.find(x => x.type === 'term');
  assert.equal(term.sid, 'nav');
  assert.equal(term.href, '#/glossary/' + encodeURIComponent('Фильтр Калмана'));
  assert.equal(row.href, '#/tau/tau-t1');
});

test('index arrival refreshes only an active search page, debounced', async () => {
  for (const v of ['search', 'subject']) {
    const h = harness();
    let painted = 0;
    const timers = [];
    h.sandbox.state = { v };
    h.sandbox.searchRefresh = () => { painted++; };
    h.sandbox.setTimeout = fn => { timers.push(fn); return timers.length; };
    await h.api.loadIndex();
    assert.ok(timers.length >= 4, 'one debounce per state change');
    timers[timers.length - 1]();
    assert.equal(painted, v === 'search' ? 1 : 0);
  }
});

test('ix URLs use the manifest per-subject version when present', async () => {
  const h = harness();
  assert.equal(h.api.ixUrl('tau'), 'data/ix/tau.json?v=T1');
  h.sandbox.manifestGet = async () => ({ subjects: { tau: { n: 1, v: 'abc123' } } });
  await h.api.loadIndex();
  assert.equal(h.api.ixUrl('tau'), 'data/ix/tau.json?v=abc123');
});

test('glossary filter uses the same aliases and ё=е rule as search', () => {
  const cards = [
    { ru: 'Фильтр Калмана', th: 'ตัวกรองคาลมาน', note: 'оценка' },
    { ru: 'Ёмкость', th: 'ความจุ', note: '' },
    { ru: 'Передаточная функция', th: 'ฟังก์ชันถ่ายโอน', note: '' },
  ].map((t, i) => ({
    dataset: { k: 'g:nav-' + i, hay: (t.ru + ' ' + '' + ' ' + t.th + ' ' + t.note).toLowerCase().replace(/"/g, '') },
    hidden: false, classList: { toggle(c, on) { if (c === 'hidden') this.owner.hidden = on; } },
  }));
  cards.forEach(c => { c.classList.owner = c; });
  const stub = () => ({ classList: { toggle() {} } });
  const sandbox = {
    searchEl: { value: '' }, onlyUnknown: false, onlyBM: false, DONE: new Set(), BM: new Set(),
    MODULES: [{ id: 'nav', terms: [] }],
    view: { querySelectorAll: () => cards, querySelector: stub },
    document: { getElementById: stub },
  };
  const filterGloss = vm.runInNewContext(
    section('function searchAliases(', '/* คะแนน: ตรงในชื่อ') +
    section('  function filterGloss() {', '  renderGlossary.filter = filterGloss;') + '\nfilterGloss;', sandbox);
  const visible = q => { sandbox.searchEl.value = q; filterGloss(); return cards.filter(c => !c.hidden).map(c => c.dataset.k); };
  assert.deepEqual(visible('Kalman'), ['g:nav-0'], 'Kalman finds Калман');
  assert.deepEqual(visible('คาลมาน'), ['g:nav-0']);
  assert.deepEqual(visible('КАЛЬМАН'), ['g:nav-0']);
  assert.deepEqual(visible('емкость'), ['g:nav-1'], 'е matches ё');
  assert.deepEqual(visible('функция передаточная'), ['g:nav-2'], 'all words in any order');
  assert.deepEqual(visible(''), ['g:nav-0', 'g:nav-1', 'g:nav-2']);
  assert.deepEqual(visible('несуществующее'), []);
});

test('#/search/<q>[/<sid>] treats the last segment as a subject only when it is a known id', () => {
  const sandbox = {
    ALL_SUBJ: [{ id: 'tau' }, { id: 'toe' }], ADMIN: false, PAGES: ['glossary', 'flash', 'quiz', 'search', 'sem'], PAGE_DEFS: {},
    subjRoute: id => ({ v: 'subject', id }),
  };
  const r = vm.runInNewContext(section('function parseRoute(', 'function pageTitle(') + '\n({ parseRoute, routeHash, routeOnly });', sandbox);
  const plain = o => JSON.parse(JSON.stringify(o));
  assert.deepEqual(plain(r.parseRoute('#/search/Kalman')), { v: 'search', q: 'kalman' });
  assert.deepEqual(plain(r.parseRoute('#/search/kalman/tau')), { v: 'search', q: 'kalman', sid: 'tau' });
  assert.deepEqual(plain(r.parseRoute('#/search/a/b')), { v: 'search', q: 'a/b' }, 'slash inside the query stays in the query');
  assert.deepEqual(plain(r.parseRoute('#/search/tau')), { v: 'search', q: 'tau' }, 'a lone segment is always the query');
  assert.deepEqual(plain(r.parseRoute('#/search/%D0%BA%D0%B0/toe')), { v: 'search', q: 'ка', sid: 'toe' });
  assert.deepEqual(plain(r.parseRoute('#/search/')), { v: 'overview' });
  for (const st of [{ v: 'search', q: 'a/tau' }, { v: 'search', q: 'передаточная функция', sid: 'tau' }, { v: 'search', q: 'x' }]) {
    const back = plain(r.parseRoute(r.routeHash(st)));
    assert.deepEqual(back, st, 'round trip ' + r.routeHash(st));
    assert.deepEqual(plain(r.parseRoute(r.routeHash(r.routeOnly(st)))), st, 'history entry keeps the scope');
  }
});
