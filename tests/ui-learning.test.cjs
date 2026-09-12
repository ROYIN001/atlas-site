// Run: node --test tests/ui-learning.test.cjs
// Tests production helpers and event wiring with deliberately minimal DOM stubs.
// These are NOT browser, layout, keyboard, accessibility-tree or screen-reader tests.
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
const search = vm.runInNewContext(
  section('function searchAliases(', 'function renderSearch(') +
  '\n({ searchAliases, escapeText });'
);
const describeRlc = vm.runInNewContext(
  section('function rlcDescription(', 'function demoRlc(') + '\nrlcDescription;'
);

test('F15: English, Russian variants, Thai, whitespace and case share Kalman aliases', () => {
  const expected = ['kalman', 'калман', 'кальман', 'คาลมาน'];
  for (const query of ['kalman', ' KALMAN ', 'КАЛМАН', 'Кальман', 'คาลมาน']) {
    assert.deepEqual([...search.searchAliases(query)], expected);
  }
  assert.ok(search.searchAliases('Kalman').some(q => 'фильтр калмана'.includes(q)));
});

test('search alias expansion preserves compound context and unrelated queries', () => {
  assert.deepEqual([...search.searchAliases('  Kalman α  ')],
    ['kalman α', 'калман α', 'кальман α', 'คาลมาน α']);
  assert.deepEqual([...search.searchAliases('ตัวกรองคาลมาน')],
    ['ตัวกรองkalman', 'ตัวกรองкалман', 'ตัวกรองкальман', 'ตัวกรองคาลมาน']);
  assert.deepEqual([...search.searchAliases('  RLC Resonance  ')], ['rlc resonance']);
  assert.deepEqual([...search.searchAliases('เสถียร')], ['เสถียร']);
  assert.deepEqual([...search.searchAliases('')], ['']);
});

test('search heading text escapes HTML-sensitive characters without altering languages', () => {
  assert.equal(search.escapeText('&<>"\''), '&amp;&lt;&gt;&quot;&#39;');
  assert.equal(search.escapeText('<img src=x onerror="alert(1)">'),
    '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.equal(search.escapeText('คาลมาน — Калман'), 'คาลมาน — Калман');
  assert.equal(search.escapeText(42), '42');
});

test('late full-text index completion refreshes only an active search and invalidates cache', async () => {
  for (const activeView of ['search', 'subject']) {
    let refreshed = 0, fetched = 0;
    const sandbox = {
      IX_LOADED: false, INDEX_BUILT: true, INDEX: [{ stale: true }], IXHAY: {},
      state: { v: activeView },
      fetch: async () => { fetched++; return { ok: true, json: async () => ({ subjects: { tau: {} } }) }; },
      dbGet: async (kind, sid) => {
        assert.equal(kind, 'ix'); assert.equal(sid, 'tau');
        return { rows: [{ id: 'tau-t11', hay: 'фильтр калмана' }] };
      },
      renderSearch: () => { refreshed++; }
    };
    const load = vm.runInNewContext(
      section('const DATA_VERSION =', 'const DBCACHE =') +
      section('async function loadIndex(', 'window.addEventListener("load"') + '\nloadIndex;', sandbox
    );
    await load();
    assert.equal(sandbox.IXHAY['tau__tau-t11'], 'фильтр калмана');
    assert.equal(sandbox.INDEX.length, 0);
    assert.equal(sandbox.INDEX_BUILT, false);
    assert.equal(refreshed, activeView === 'search' ? 1 : 0);
    await load();
    assert.equal(fetched, 1, 'successful index loading is idempotent');
  }
});

function rowsOf(html) {
  return [...html.matchAll(/<tr><th scope="row">([^<]+)<\/th>((?:<td>[^<]+<\/td>){4})<\/tr>/g)]
    .map(m => ({ label: m[1], values: [...m[2].matchAll(/<td>([^<]+)<\/td>/g)].map(x => Number(x[1])) }));
}
function near(actual, expected, tolerance) {
  assert.ok(Number.isFinite(actual));
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `${actual} should be within ${tolerance} of ${expected}`);
}

test('F18: default RLC accessible table agrees with independently calculated values', () => {
  const html = describeRlc({ R: 20, L: 50, C: 5, f: 220 });
  const rows = rowsOf(html);
  assert.equal(rows.length, 4);
  const selected = rows.find(r => r.label === 'ค่าที่เลือก').values;
  near(selected[0], 220, 0.005);
  near(selected[1], 78.17299650038963, 0.00051);
  near(selected[2], 1.2792141081543622, 0.00051);
  near(selected[3], -75.17646797826949, 0.0051);
  assert.match(html, /U_R = 25\.584 V, U_L = 88\.413 V, U_C = 185\.085 V/);
  assert.match(html, /ค่า RMS/);
  assert.match(html, /กระแสนำหน้าแรงดันรวม/);
  assert.match(html, /ยอดเรโซแนนซ์อยู่ในช่วงกราฟ 20–900 Hz/);
});

test('RLC table numerical values remain consistent at supported control endpoints', () => {
  for (const R of [1, 20, 120]) for (const LmH of [5, 50, 200]) {
    for (const CuF of [0.5, 5, 40]) for (const f of [20, 220, 900]) {
      const L = LmH * 0.001, C = CuF * 0.000001;
      const f0 = 1 / (2 * Math.PI * Math.sqrt(L * C));
      const rows = rowsOf(describeRlc({ R, L: LmH, C: CuF, f }));
      assert.equal(rows.length, 4);
      [20, f, f0, 900].forEach((frequency, i) => {
        const reactance = 2 * Math.PI * frequency * L - 1 / (2 * Math.PI * frequency * C);
        const impedance = Math.sqrt(R * R + reactance * reactance);
        near(rows[i].values[0], frequency, 0.0051);
        near(rows[i].values[1], impedance, 0.00051);
        near(rows[i].values[2], 100 / impedance, 0.00051);
        near(rows[i].values[3], Math.atan(reactance / R) * 180 / Math.PI, 0.0051);
      });
      near(rows[2].values[1], R, 0.00051);
      near(rows[2].values[2], 100 / R, 0.00051);
    }
  }
});

test('RLC explanation identifies resonance outside the plotted interval and phase direction', () => {
  const high = describeRlc({ R: 20, L: 5, C: 0.5, f: 900 });
  assert.match(high, /ยอดเรโซแนนซ์อยู่นอกช่วงกราฟ 20–900 Hz/);
  assert.ok(rowsOf(high)[2].values[0] > 900);
  // Synthetic positive values exercise the lower branch; this L is not a UI setting.
  const low = describeRlc({ R: 20, L: 5000, C: 40, f: 20 });
  assert.match(low, /ยอดเรโซแนนซ์อยู่นอกช่วงกราฟ 20–900 Hz/);
  assert.ok(rowsOf(low)[2].values[0] < 20);
  assert.match(low, /กระแสล้าหลังแรงดันรวม/);
  const f0 = 1 / (2 * Math.PI * Math.sqrt(0.05 * 0.000005));
  assert.match(describeRlc({ R: 20, L: 50, C: 5, f: f0 }), /มีเฟสตรงกัน/);
});

// Explicit stubs for only the selectors exercised below, not a browser DOM parser.
function domFixture() {
  const ids = new Map(), created = [];
  class Element {
    constructor(tag) {
      this.tagName = tag; this.children = []; this.attrs = {}; this.events = {};
      this.selectors = {}; this.dataset = {}; this.classes = new Set();
      this.classList = {
        add: x => this.classes.add(x),
        toggle: (x, on) => on ? this.classes.add(x) : this.classes.delete(x)
      };
      created.push(this);
    }
    set innerHTML(value) {
      this.html = value; this.children = []; this.selectors = {}; this.options = [];
      const add = (selector, tag) => {
        const child = new Element(tag); this.appendChild(child); this.selectors[selector] = child;
        return child;
      };
      if (value.includes('<canvas>')) {
        const wrap = add('.canvas-wrap', 'div');
        const canvas = new Element('canvas'); wrap.appendChild(canvas); this.selectors.canvas = canvas;
        add('.demo-ctl', 'div'); add('.readout', 'div'); add('.demo-head .spacer', 'span');
      }
      if (value.startsWith('<summary>')) add('div', 'div');
      if (value.startsWith('<label>')) add('b', 'b');
      for (const m of value.matchAll(/id="([^"]+)"/g)) ids.set(m[1], add('#' + m[1], 'div'));
      if (value.includes('class="quiz-foot"')) add('.quiz-foot', 'div');
      for (const m of value.matchAll(/<button class="opt" data-i="(\d+)">([^<]*)<\/button>/g)) {
        const button = add('.option-' + m[1], 'button');
        button.dataset.i = m[1]; button.textContent = m[2]; this.options.push(button);
      }
    }
    get innerHTML() { return this.html || ''; }
    appendChild(child) { this.children.push(child); child.parentElement = this; return child; }
    insertBefore(child, reference) {
      const at = this.children.indexOf(reference); assert.ok(at >= 0);
      this.children.splice(at, 0, child); child.parentElement = this;
    }
    querySelector(selector) {
      assert.ok(this.selectors[selector], `stub selector supported: ${selector}`);
      return this.selectors[selector];
    }
    querySelectorAll(selector) { assert.equal(selector, '.opt'); return this.options; }
    setAttribute(key, value) { this.attrs[key] = value; }
    addEventListener(name, fn) { this.events[name] = fn; }
    fire(name) { assert.equal(typeof this.events[name], 'function'); this.events[name](); }
    focus() { this.focused = true; }
    after() { throw new Error('button placement not exercised in this minimal fixture'); }
  }
  return { created, Element, document: {
    createElement: tag => new Element(tag),
    getElementById: id => { assert.ok(ids.has(id), `stub id exists: ${id}`); return ids.get(id); }
  } };
}

test('buildDemo optional description is linked, uniquely identified, and updated on input', () => {
  const fixture = domFixture();
  const sandbox = {
    document: fixture.document, LIVE: [], REDUCED: true,
    ResizeObserver: class { constructor(callback) { this.callback = callback; } observe() {} },
    fitCanvas: () => ({ ctx: {}, w: 600, h: 300 })
  };
  const build = vm.runInNewContext(
    section('let DEMO_DESCRIPTION_ID =', '/* ---- 1. переходный процесс ---- */') + '\nbuildDemo;', sandbox
  );
  let draws = 0;
  const spec = {
    title: 'RLC test', controls: [{ id: 'R', label: 'R, Ω', min: 1, max: 120, step: 1, value: 20 }],
    draw: () => { draws++; }, describe: state => '<p>R=' + state.R + '</p>'
  };
  const host = new fixture.Element('div');
  build(host, spec);
  const box = host.children[0], canvas = box.querySelector('canvas');
  const description = box.children.find(e => e.tagName === 'details');
  assert.ok(description.id);
  assert.equal(canvas.attrs['aria-describedby'], description.id);
  assert.equal(canvas.attrs.role, 'img');
  assert.equal(description.querySelector('div').innerHTML, '<p>R=20</p>');
  const input = fixture.created.find(e => e.tagName === 'input');
  input.value = '25'; input.fire('input');
  assert.equal(description.querySelector('div').innerHTML, '<p>R=25</p>');
  assert.equal(draws, 2);
  build(host, spec);
  assert.notEqual(host.children[1].querySelector('canvas').attrs['aria-describedby'], description.id);
  build(host, { title: 'legacy demo', draw() {} });
  assert.equal(host.children[2].querySelector('canvas').attrs['aria-describedby'], undefined);
  assert.equal(host.children[2].children.some(e => e.tagName === 'details'), false);
});

function quizFixture() {
  const fixture = domFixture(), navigation = [];
  const terms = Array.from({ length: 12 }, (_, i) => ({
    ru: 'Термин ' + i, th: 'ศัพท์ ' + i, note: 'คำอธิบาย ' + i + ' <b>literal</b>'
  }));
  let seed = 12345;
  const math = Object.create(Math);
  math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const sandbox = {
    document: fixture.document, view: new fixture.Element('main'), MODULES: [{ th: 'ทดสอบ', terms }],
    searchEl: { value: '' }, go: target => navigation.push(target), Math: math
  };
  const quiz = vm.runInNewContext(
    section('const POOL = () =>', '/* ---- search box ---- */') + '\n({ POOL, renderQuiz });', sandbox
  );
  return { ...fixture, sandbox, quiz, navigation, terms };
}

for (const answerCorrectly of [true, false]) {
  test('F21: ' + (answerCorrectly ? 'correct' : 'incorrect') + ' quiz feedback explains meanings and links to search', () => {
    const fixture = quizFixture();
    assert.equal(fixture.quiz.POOL()[0].note, fixture.terms[0].note);
    fixture.quiz.renderQuiz();
    const box = fixture.document.getElementById('quizBox');
    const termId = Number(box.innerHTML.match(/<div class="prompt">Термин (\d+)<\/div>/)[1]);
    const right = fixture.terms[termId];
    const selected = box.options.find(option => (option.textContent === right.th) === answerCorrectly);
    const chosen = fixture.terms.find(term => term.th === selected.textContent);
    selected.fire('click');
    assert.ok(box.options.every(option => option.disabled));
    const explanation = box.children.find(node => node.className === 'quiz-explanation');
    assert.ok(explanation.children[0].textContent.includes(right.note));
    assert.equal(explanation.children[0].innerHTML, '', 'notes inserted via textContent, not HTML');
    assert.equal(explanation.children.length, answerCorrectly ? 1 : 2);
    if (!answerCorrectly) {
      assert.ok(explanation.children[1].textContent.includes(chosen.ru));
      assert.ok(explanation.children[1].textContent.includes(chosen.note));
    }
    const foot = box.querySelector('.quiz-foot');
    const review = foot.children.find(node => /ออกจากควิซ/.test(node.textContent || ''));
    assert.ok(review, 'review button explicitly says it exits the quiz');
    review.fire('click');
    assert.equal(fixture.sandbox.searchEl.value, right.ru);
    assert.equal(fixture.navigation[0].v, 'search');
    assert.equal(fixture.navigation[0].q, right.ru.toLowerCase());
    const next = foot.children.find(node => node.textContent === 'ข้อถัดไป');
    assert.ok(next.focused);
    next.fire('click');
    assert.match(box.innerHTML, /ข้อ 2 \/ 10/);
    assert.equal(box.children.some(node => node.className === 'quiz-explanation'), false);
  });
}

test('F24: semester labels describe schedule position without claiming course completion', () => {
  const match = app.match(/const STATUS_TH = (\{[^\n]+\});/);
  assert.ok(match);
  const status = vm.runInNewContext('(' + match[1] + ')');
  assert.deepEqual(Object.keys(status).sort(), ['done', 'next', 'now']);
  for (const value of Object.values(status)) {
    assert.match(value, /ตามแผน/);
    assert.doesNotMatch(value, /เรียนผ่านแล้ว|เข้าใจแล้ว|สำเร็จ/);
  }
});
