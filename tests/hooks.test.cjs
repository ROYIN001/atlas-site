// Run: node --test tests/hooks.test.cjs
// v6 plumbing for parallel feature work: HOOKS registry, page registry, per-session slots,
// and the stable-id helper that must agree byte-for-byte between app.js and src/buildlib.py.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'app.css'), 'utf8');
const SLOTS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'];

function section(startMarker, endMarker) {
  const start = app.indexOf(startMarker);
  const end = app.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `locate production section: ${startMarker}`);
  return app.slice(start, end);
}

const core = vm.runInNewContext(
  section('const HOOKS = {', 'const BLKCLS = {') + '\n({ HOOKS, PAGE_DEFS, registerPage, stableId, termKey });',
  { console });

test('HOOKS: run/collect/render call every listener and isolate a throwing one', () => {
  const { HOOKS } = core;
  const seen = [];
  HOOKS.on('x', (a, b) => seen.push(a + b));
  HOOKS.on('x', () => { throw new Error('boom'); });
  HOOKS.on('x', a => seen.push(a));
  HOOKS.run('x', 1, 2);
  assert.deepEqual([...seen], [3, 1]);
  HOOKS.on('urls', sid => ['data/a/' + sid + '.json']);
  HOOKS.on('urls', () => null);
  HOOKS.on('urls', sid => ['data/b/' + sid + '.json', 'data/c.json']);
  assert.deepEqual([...HOOKS.collect('urls', 'tau')], ['data/a/tau.json', 'data/b/tau.json', 'data/c.json']);
  HOOKS.html('h', ctx => '<p>' + ctx.n + '</p>');
  HOOKS.html('h', () => { throw new Error('boom'); });
  HOOKS.html('h', () => undefined);
  assert.equal(HOOKS.render('h', { n: 7 }), '<p>7</p>');
  assert.equal(HOOKS.render('missing', {}), '');
});

test('registerPage stores page definitions used by the router', () => {
  const { PAGE_DEFS, registerPage } = core;
  registerPage('oral', { render() {}, title: () => 'ซ้อมปากเปล่า' });
  assert.equal(typeof PAGE_DEFS.oral.render, 'function');
  assert.equal(PAGE_DEFS.oral.title({}), 'ซ้อมปากเปล่า');
  // router wiring present in production source
  assert.match(app, /if \(PAGE_DEFS\[p\[0\]\]\) return \{ v: p\[0\], seg: p\.slice\(1\)/);
  assert.match(app, /if \(PAGE_DEFS\[st\.v\]\) PAGE_DEFS\[st\.v\]\.render\(st\);/);
  assert.match(app, /if \(PAGE_DEFS\[st\.v\]\) return "#\/" \+ st\.v/);
});

test('every hook point is wired in the production functions', () => {
  for (const call of ['HOOKS.run("fill", el, t, sid)', 'HOOKS.run("subject", s, deep, modeNow)', 'HOOKS.run("overview")',
    'HOOKS.run("go", st)', 'HOOKS.run("clear")', 'HOOKS.collect("offline", s.id)',
    'HOOKS.render("overview-top"', 'HOOKS.render("overview-end"', 'HOOKS.render("subject-head"', 'HOOKS.render("subject-end"']) {
    assert.ok(app.includes(call), `hook call present: ${call}`);
  }
});

test('per-session slots exist once each, in order, before app startup, in app.js and app.css', () => {
  let lastJs = -1, lastCss = -1;
  for (const s of SLOTS) {
    const b = `/* ===== SLOT ${s} (`, e = `/* ===== SLOT ${s} END ===== */`;
    const i = app.indexOf(b), j = app.indexOf(e);
    assert.ok(i > lastJs && j > i, `app.js slot ${s} present and ordered`);
    assert.equal(app.indexOf(b, i + 1), -1, `app.js slot ${s} unique`);
    lastJs = j;
    const cb = `/* ===== SLOT ${s} BEGIN ===== */`, ce = `/* ===== SLOT ${s} END ===== */`;
    const ci = css.indexOf(cb), cj = css.indexOf(ce);
    assert.ok(ci > lastCss && cj > ci, `app.css slot ${s} present and ordered`);
    lastCss = cj;
  }
  assert.ok(app.indexOf('/* ===== SLOTS END ===== */') < app.indexOf('\nbuildNav();'), 'slots run before startup');
});

test('termKey is the single source of glossary progress keys', () => {
  assert.equal(core.termKey({ id: 'tau' }, { ru: 'x' }, 3), 'g:tau-3');
  const raw = app.match(/"g:" \+ m\.id \+ "-" \+ i/g) || [];
  assert.equal(raw.length, 1, 'only termKey itself builds the g:<mod>-<i> string');
});

test('stableId (app.js) equals stable_id (src/buildlib.py) for Thai, Russian, tags and whitespace', () => {
  const samples = [
    'Критерий Гурвица',
    '  เกณฑ์  เฮอร์วิตซ์\nสำหรับ  n=3 ',
    '<b>Что такое</b> <i>устойчивость</i>? — เสถียรภาพคืออะไร',
    'ё и е: зачёт / зачет',
    '',
    'a',
  ];
  const py = process.platform === 'win32' ? 'python' : 'python3';
  for (const s of samples) {
    const js = core.stableId(s);
    const pyOut = execFileSync(py, [path.join(ROOT, 'src', 'buildlib.py'), s], { encoding: 'utf8' }).trim();
    assert.equal(js, pyOut, `stable id for ${JSON.stringify(s)}`);
    assert.match(js, /^[0-9a-z]+$/);
  }
  assert.equal(core.stableId('<p>x  y</p>'), core.stableId('x y'), 'tags and whitespace normalised');
  assert.notEqual(core.stableId('x y'), core.stableId('X y'), 'case preserved');
});

test('build_data.py runs src/build_steps/*.py through run(ctx)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'build_data.py'), 'utf8');
  assert.match(src, /build_steps/);
  assert.match(src, /mod\.run\(ctx\)/);
  assert.ok(fs.existsSync(path.join(ROOT, 'src', 'build_steps', 'README.md')));
});
