#!/usr/bin/env node
'use strict';

// Static/source-integrity checks only: these do not render pages, run a browser,
// or certify the numerical correctness of every demo or lesson.
// Run from any directory: node tests/audit-integrity.test.cjs
// Optional original-archive comparison (requires the unzip command):
// node tests/audit-integrity.test.cjs --baseline-zip /path/to/original.zip

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { test } = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const TAU_START = '/* ===== ТАУ: демонстрации (window.TAUDEMOS) ===== */';
const TAU_END = '/* ===== /ТАУ: демонстрации ===== */';
// จำนวนขั้นต่ำต่อวิชา: src/counts-baseline.json (สร้างด้วย python src/counts.py --update — ห้ามแก้มือ)
// แทน MINIMUM เดิมที่ค้างอยู่ที่ 11 วิชา/466 ช่องเดโม (ลบเดโมไป 800 ช่องเทสต์ก็ยังเขียว)
const COUNTS = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'counts-baseline.json'), 'utf8'));
const HTML_TOLERANCE = 0.05;   // html_kb ลดได้ไม่เกิน 5 % — ตรงกับ src/counts.py
const { sourceRegistry, metaDemos } = require('../src/registry.cjs');
const args = process.argv.slice(2);
assert.ok(args.length === 0 || (args.length === 2 && args[0] === '--baseline-zip'),
  'Usage: node tests/audit-integrity.test.cjs [--baseline-zip /path/to/original.zip]');
const baselineZip = args.length ? path.resolve(args[1]) : null;

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative));
}

function jsonFiles(relative) {
  return fs.readdirSync(path.join(ROOT, relative))
    .filter(name => name.endsWith('.json')).sort();
}

function parseJson(buffer, label) {
  try { return JSON.parse(buffer.toString('utf8')); }
  catch (error) { throw new Error(`Invalid JSON in ${label}: ${error.message}`); }
}

function attrValues(html, attribute) {
  // Input is the decoded HTML field, not the JSON source text.
  return [...html.matchAll(new RegExp(`\\b${attribute}\\s*=\\s*(["'])(.*?)\\1`, 'g'))]
    .map(match => match[2]);
}

function lf(buffer) {
  // CRLF → LF before hashing (Windows checkouts under .gitattributes text=auto) — same as lf() in src/build_data.py
  return Buffer.from(buffer.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
}

function tagAttrs(html, name) {
  // Same counting as tag_attrs() in src/counts.py: attributes of opening tags only,
  // after dropping comments and <script> bodies (quiz/widget JSON).
  const clean = html.replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi, '$1</script>');
  const re = new RegExp(`(?<![\\w-])${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'g');
  return (clean.match(/<[A-Za-z][^>]*>/g) || []).flatMap(tag => [...tag.matchAll(re)].map(m => m[2]));
}

function metadataRows(registry) {
  return Object.entries(registry.deep).flatMap(([subject, data]) => {
    assert.ok(Array.isArray(data.topics), `${subject}: missing topics metadata`);
    assert.ok(Array.isArray(data.summary), `${subject}: missing summary metadata`);
    return [...data.topics, ...data.summary].map(topic => ({ subject, ...topic }));
  });
}

function metadataDemos(rows) {
  return rows.flatMap(row => row.demos || (row.demo ? [row.demo] : []));
}

function jsonHumanStrings(value, out) {
  // Same walk as _strings() in src/build_data.py: keep only strings a reader sees (Thai or Cyrillic letters).
  if (typeof value === 'string') {
    if (/[฀-๿А-Яа-яЁё]/.test(value)) out.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) jsonHumanStrings(item, out);
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) jsonHumanStrings(item, out);
  }
  return out;
}

function plainForIndex(html) {
  // Same transformations as src/build_data.py. Search indexes are generated;
  // never repair their text manually when this assertion fails.
  return html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (_, body) => {
    try { return ' ' + [...new Set(jsonHumanStrings(JSON.parse(body), []))].join(' ') + ' '; }
    catch (error) { return ' '; }
  }).replace(/<[^>]*>/g, ' ').replace(/&#?[a-z0-9]{1,8};/gi, ' ')
    .replace(/\s+/g, ' ').trim().toLowerCase();
}

function protectedBlock(buffer) {
  const startBytes = Buffer.from(TAU_START);
  const endBytes = Buffer.from(TAU_END);
  const start = buffer.indexOf(startBytes);
  const end = buffer.indexOf(endBytes, start);
  assert.ok(start >= 0 && end > start, 'Missing protected generated TAU demo block');
  assert.equal(buffer.indexOf(startBytes, start + startBytes.length), -1,
    'Protected block start marker must be unique');
  assert.equal(buffer.indexOf(endBytes, end + endBytes.length), -1,
    'Protected block end marker must be unique');
  return buffer.subarray(start, end + endBytes.length);
}

const appBytes = read('app.js');
const source = appBytes.toString('utf8');
const registry = sourceRegistry(source);
const rows = metadataRows(registry);
const topicFiles = jsonFiles('data/t');
const topics = new Map(topicFiles.map(file =>
  [file, parseJson(read(`data/t/${file}`), `data/t/${file}`)]));
const figureFiles = fs.readdirSync(path.join(ROOT, 'figs'))
  .filter(file => /\.webp$/i.test(file)).sort();
const htmlDemoSlots = [...topics.values()].flatMap(topic => attrValues(topic.html, 'data-demo'));
const metadataDemoSlots = metadataDemos(rows);
const figureSlots = [...topics.values()].flatMap(topic => attrValues(topic.html, 'data-fig'));

function currentCounts() {
  // Same metrics as count() in src/counts.py — change both together.
  const figs = new Set(figureFiles.map(f => f.replace(/\.webp$/i, '')));
  const meta = metaDemos(registry);
  const subjects = {};
  for (const [file, topic] of topics) {
    const [sid, tid] = file.slice(0, -5).split('__');
    const s = subjects[sid] || (subjects[sid] = { topics: 0, summary: 0, demo_slots: 0, meta_demos: 0,
      demo_keys: new Set(), fig_slots: 0, fig_files: new Set(), ids: 0, html_kb: 0 });
    s.topics++;
    if (/^.+-s[1-4]$/.test(tid)) s.summary++;
    const demos = tagAttrs(topic.html, 'data-demo'), fs_ = tagAttrs(topic.html, 'data-fig');
    s.demo_slots += demos.length;
    demos.forEach(k => s.demo_keys.add(k));
    s.fig_slots += fs_.length;
    fs_.filter(k => figs.has(k)).forEach(k => s.fig_files.add(k));
    s.ids += tagAttrs(topic.html, 'id').length;
    s.html_kb += Buffer.byteLength(topic.html, 'utf8');
  }
  for (const [sid, s] of Object.entries(subjects)) {
    s.meta_demos = (meta[sid] || []).length;
    (meta[sid] || []).forEach(k => s.demo_keys.add(k));
    s.demo_keys = s.demo_keys.size;
    s.fig_files = s.fig_files.size;
    s.html_kb = Math.round(s.html_kb / 1024);
  }
  return { _site: { demo_functions: registry.demoKeys.length, fig_files: figureFiles.length }, subjects };
}

test('Per-subject counts are not below src/counts-baseline.json (content removed = fail)', t => {
  const cur = currentCounts();
  const manifest = parseJson(read('data/manifest.json'), 'data/manifest.json');
  const bad = [], grew = [];
  for (const sid of Object.keys(manifest.subjects)) {
    if (!COUNTS.subjects[sid]) bad.push(`${sid}: in manifest but not in src/counts-baseline.json (new subject? run python src/counts.py --update)`);
  }
  for (const sid of Object.keys(COUNTS.subjects)) {
    if (!cur.subjects[sid]) bad.push(`${sid}: in baseline but has no files in data/t`);
  }
  const rowsToCheck = [['_site', cur._site, COUNTS._site], ...Object.entries(cur.subjects).map(([sid, v]) => [sid, v, COUNTS.subjects[sid]])];
  for (const [sid, v, b] of rowsToCheck) {
    if (!b) continue;
    for (const [k, x] of Object.entries(v)) {
      if (typeof b[k] !== 'number') continue;
      const low = k === 'html_kb' ? b[k] * (1 - HTML_TOLERANCE) : b[k];
      if (x < low) bad.push(`${sid}: ${k} dropped ${b[k]} → ${x}`);
      else if (x > b[k]) grew.push(`${sid}.${k} ${b[k]}→${x}`);
    }
  }
  if (grew.length) t.diagnostic('above baseline (run python src/counts.py --update to tighten): ' + grew.join(', '));
  assert.deepEqual(bad, [], 'Content counts fell below src/counts-baseline.json — if intentional, run python src/counts.py --update and commit the baseline');
});

test('JavaScript parses; all topic JSON objects contain non-empty HTML', () => {
  new vm.Script(source, { filename: 'app.js' });
  for (const [file, topic] of topics) {
    assert.equal(typeof topic.html, 'string', `${file}: html must be a string`);
    assert.ok(topic.html.trim().length > 0, `${file}: html must not be empty`);
  }
});

test('DEEP metadata and topic files match exactly, with no missing or orphan topics', () => {
  assert.equal(new Set(registry.subjects.map(subject => subject.id)).size,
    registry.subjects.length, 'Duplicate subject ID');
  const subjectIds = new Set(registry.subjects.map(subject => subject.id));
  const expectedFiles = rows.map(row => {
    assert.ok(subjectIds.has(row.subject), `${row.subject}: absent from SUBJECTS`);
    assert.match(row.subject, /^[A-Za-z0-9_-]+$/);
    assert.match(row.id, /^[A-Za-z0-9_.-]+$/);
    return `${row.subject}__${row.id}.json`;
  });
  assert.equal(new Set(expectedFiles).size, expectedFiles.length, 'Duplicate topic ID within a subject');
  assert.deepEqual(topicFiles, expectedFiles.sort(), 'DEEP/topic file mismatch');
});

test('Manifest and all search indexes match the current source content', () => {
  const manifest = parseJson(read('data/manifest.json'), 'data/manifest.json');
  const subjects = Object.keys(registry.deep).sort();
  assert.deepEqual(Object.keys(manifest.subjects).sort(), subjects);
  assert.deepEqual(jsonFiles('data/ix'), subjects.map(subject => `${subject}.json`));
  for (const subject of subjects) {
    const expectedFiles = topicFiles.filter(file => file.startsWith(`${subject}__`));
    const index = parseJson(read(`data/ix/${subject}.json`), `data/ix/${subject}.json`);
    assert.ok(Array.isArray(index.rows), `${subject}: index rows must be an array`);
    assert.equal(manifest.subjects[subject].n, expectedFiles.length, `${subject}: manifest count`);
    const expected = expectedFiles.map(file => ({
      id: file.slice(subject.length + 2, -5), hay: plainForIndex(topics.get(file).html)
    }));
    assert.equal(index.rows.length, expected.length, `${subject}: index row count`);
    for (let i = 0; i < expected.length; i++) {
      assert.equal(index.rows[i].id, expected[i].id, `${subject}: index row ${i} ID/order`);
      assert.equal(index.rows[i].hay === expected[i].hay, true,
        `${subject}__${expected[i].id}: stale search text; run python src/build_data.py`);
    }
  }
});

test('Per-subject JS/CSS files are listed in the manifest with their current hash', () => {
  const crypto = require('node:crypto');
  const manifest = parseJson(read('data/manifest.json'), 'data/manifest.json');
  const dir = path.join(ROOT, 'js', 'subj');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(name => /\.(js|css)$/.test(name)) : [];
  for (const name of files) {
    const [subject, ext] = [name.replace(/\.(js|css)$/, ''), name.split('.').pop()];
    assert.ok(manifest.subjects[subject], `js/subj/${name}: subject has no topics in data/t`);
    const hash = crypto.createHash('sha1').update(lf(fs.readFileSync(path.join(dir, name)))).digest('hex').slice(0, 10);
    assert.equal(manifest.subjects[subject][ext], hash, `js/subj/${name}: stale manifest; run python src/build_data.py`);
  }
  for (const [subject, entry] of Object.entries(manifest.subjects)) {
    for (const ext of ['js', 'css']) {
      if (entry[ext]) assert.ok(files.includes(`${subject}.${ext}`), `manifest lists missing js/subj/${subject}.${ext}`);
    }
  }
});

test('Cache versions: index.html app.css?v= / app.js?v= and DATA_VERSION equal the build hash; manifest v per subject', () => {
  // Same formula as build_version() / subject_version() in src/build_data.py.
  const crypto = require('node:crypto');
  const RUN = 'รัน python src/build_data.py (เลขเวอร์ชันแคชไม่ตรงกับไฟล์ปัจจุบัน)';
  const DV = /(const DATA_VERSION = ")[^"]*(";)/g;
  const dv = [...source.matchAll(DV)];
  assert.equal(dv.length, 1, 'app.js must declare const DATA_VERSION = "…"; exactly once');
  const expected = crypto.createHash('sha1')
    .update(lf(Buffer.from(source.replace(DV, '$1$2'), 'utf8'))).update('\0')
    .update(lf(read('app.css'))).update('\0')
    .update(lf(read('data/manifest.json'))).digest('hex').slice(0, 10);
  const html = read('index.html').toString('utf8');
  const token = re => { const m = [...html.matchAll(re)]; assert.equal(m.length, 1, `index.html must contain ${re.source} exactly once`); return m[0][1]; };
  const got = { 'app.css?v=': token(/app\.css\?v=([^"'&\s>]+)/g), 'app.js?v=': token(/app\.js\?v=([^"'&\s>]+)/g),
    DATA_VERSION: source.match(/const DATA_VERSION = "([^"]*)";/)[1] };
  assert.deepEqual(got, { 'app.css?v=': expected, 'app.js?v=': expected, DATA_VERSION: expected }, RUN);
  const manifest = parseJson(read('data/manifest.json'), 'data/manifest.json');
  for (const subject of Object.keys(manifest.subjects)) {
    const h = crypto.createHash('sha1');
    topicFiles.filter(file => file.startsWith(`${subject}__`))
      .forEach((file, i) => h.update((i ? '\n' : '') + topics.get(file).html, 'utf8'));
    assert.equal(manifest.subjects[subject].v, h.digest('hex').slice(0, 10), `${subject}: manifest v — ${RUN}`);
  }
});

test('In-content links (#/subject/topic[/id] and #id) point at existing pages and elements', () => {
  // Router format: see "router (v5)" in app.js. Plain #id links must target an id in the same topic.
  const ids = html => new Set(attrValues(html, 'id'));
  const pages = new Set(['', 'glossary', 'flash', 'quiz', 'search']);
  const bad = [];
  for (const [file, topic] of topics) {
    for (const href of attrValues(topic.html, 'href').filter(h => h.startsWith('#'))) {
      const legacy = /^#s=([\w-]+)$/.exec(href);        // old route form, still routed
      if (legacy) { if (!registry.subjects.some(s => s.id === legacy[1])) bad.push(`${file}: ${href} (unknown subject)`); continue; }
      if (!href.startsWith('#/')) {                          // #id in this topic, or #<topic id> of the same subject
        const id = decodeURIComponent(href.slice(1)), subject = file.split('__')[0], deep = registry.deep[subject];
        const isTopic = deep && [...deep.topics, ...(deep.summary || [])].some(t => t.id === id);
        if (!ids(topic.html).has(id) && !isTopic) bad.push(`${file}: ${href} (no such id in this topic or topic in this subject)`);
        continue;
      }
      const [subject, seg, anchor] = href.slice(2).split('/').map(decodeURIComponent);
      if (pages.has(subject)) continue;
      const deep = registry.deep[subject];
      if (!registry.subjects.some(s => s.id === subject)) { bad.push(`${file}: ${href} (unknown subject)`); continue; }
      if (!seg || seg === 'sum' || seg === 'full') continue;
      const target = deep && [...deep.topics, ...(deep.summary || [])].find(t => t.id === seg);
      if (!target) { bad.push(`${file}: ${href} (unknown topic)`); continue; }
      if (anchor && !ids(topics.get(`${subject}__${seg}.json`).html).has(anchor)) bad.push(`${file}: ${href} (no id "${anchor}" in ${seg})`);
    }
  }
  assert.deepEqual(bad, [], 'Broken in-content links');
});

test('Every HTML and metadata demo slot has a registered function', () => {
  assert.deepEqual(registry.invalidDemoKeys, [], 'Registry contains a non-function');
  const keys = new Set(registry.demoKeys);
  const unknown = [...new Set([...htmlDemoSlots, ...metadataDemoSlots])]
    .filter(key => !keys.has(key));
  assert.deepEqual(unknown, [], 'Unknown demo keys (registration check only, not rendering)');
});

test('Every figure reference resolves to a non-empty WebP; media counts are retained', () => {
  const files = new Set(figureFiles);
  for (const key of new Set(figureSlots)) {
    assert.match(key, /^[A-Za-z0-9_.-]+$/, `Unsafe figure ID: ${key}`);
    assert.ok(files.has(`${key}.webp`), `Missing figure: figs/${key}.webp`);
    const bytes = read(`figs/${key}.webp`);
    assert.ok(bytes.length > 12, `Empty/truncated figure: ${key}`);
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF', `${key}: WebP RIFF header`);
    assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP', `${key}: WebP format header`);
  }
  // Headers establish file type, not successful browser decoding or visual quality.
  for (const [file, topic] of topics) {
    for (const tag of topic.html.matchAll(/<img\b[^>]*>/gi)) {
      const src = attrValues(tag[0], 'src')[0];
      if (src && !/^(?:[a-z]+:|\/\/|\/)/i.test(src)) {
        const asset = src.split(/[?#]/, 1)[0];
        assert.ok(fs.existsSync(path.join(ROOT, asset)), `${file}: missing image src ${src}`);
      }
    }
  }
});

test('Index-blocking files and protected-block markers remain present', () => {
  assert.ok(fs.existsSync(path.join(ROOT, '.nojekyll')));
  assert.match(read('robots.txt').toString('utf8'), /Disallow:\s*\//i);
  assert.match(read('index.html').toString('utf8'), /<meta\b[^>]*name=["']robots["'][^>]*noindex/i);
  protectedBlock(appBytes);
});

test('Original ZIP comparison: topics/media retained; generated TAU block byte-identical', {
  skip: baselineZip ? false : 'Optional: pass --baseline-zip to compare with the original upload'
}, () => {
  const options = { maxBuffer: 32 * 1024 * 1024 };
  const members = execFileSync('unzip', ['-Z1', baselineZip], options)
    .toString('utf8').split(/\r?\n/).filter(Boolean);
  const candidates = members.filter(member => /(?:^|\/)app\.js$/.test(member));
  assert.equal(candidates.length, 1, 'Baseline ZIP must have one app.js');
  const prefix = candidates[0].slice(0, -'app.js'.length);
  const baselineRead = relative => execFileSync('unzip', ['-p', baselineZip, prefix + relative], options);
  const baselineApp = baselineRead('app.js');
  assert.ok(protectedBlock(appBytes).equals(protectedBlock(baselineApp)),
    'Protected generated TAU block differs from original ZIP; source assembly is required');
  const baselineRegistry = sourceRegistry(baselineApp.toString('utf8'));
  for (const key of baselineRegistry.demoKeys) {
    assert.ok(registry.demoKeys.includes(key), `Original demo function removed: ${key}`);
  }
  const baselineRows = metadataRows(baselineRegistry);
  assert.ok(rows.length >= baselineRows.length, 'Metadata row count decreased');
  assert.ok(metadataDemoSlots.length >= metadataDemos(baselineRows).length,
    'Metadata demo slot count decreased');
  for (const member of members.filter(name => name.startsWith(`${prefix}data/t/`) && name.endsWith('.json'))) {
    const file = member.slice((`${prefix}data/t/`).length);
    assert.ok(topics.has(file), `Original topic file removed: ${file}`);
    const original = parseJson(baselineRead(`data/t/${file}`), member);
    for (const attribute of ['data-demo', 'data-fig']) {
      const remaining = attrValues(topics.get(file).html, attribute);
      for (const key of attrValues(original.html, attribute)) {
        const at = remaining.indexOf(key);
        assert.ok(at >= 0, `${file}: original ${attribute} slot removed: ${key}`);
        remaining.splice(at, 1);
      }
    }
  }
  for (const member of members.filter(name => name.startsWith(`${prefix}figs/`) && /\.webp$/i.test(name))) {
    assert.ok(figureFiles.includes(member.slice((`${prefix}figs/`).length)),
      `Original figure file removed: ${member}`);
  }
});

test('Report structural coverage without implying full runtime validation', t => {
  t.diagnostic(JSON.stringify({
    populatedSubjects: Object.keys(registry.deep).length,
    topicAndSummaryFiles: topicFiles.length,
    registeredDemoFunctions: registry.demoKeys.length,
    htmlDemoSlots: htmlDemoSlots.length,
    metadataDemoSlots: metadataDemoSlots.length,
    figureSlots: figureSlots.length,
    uniqueReferencedFigures: new Set(figureSlots).size,
    figureFiles: figureFiles.length,
    scope: 'Static source integrity, not browser rendering or complete academic verification'
  }));
});
