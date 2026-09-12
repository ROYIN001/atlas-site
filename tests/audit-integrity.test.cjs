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
const APP_MARKER = '/* ================= APP ================= */';
const TAU_START = '/* ===== ТАУ: демонстрации (window.TAUDEMOS) ===== */';
const TAU_END = '/* ===== /ТАУ: демонстрации ===== */';
const MINIMUM = {
  subjects: 10, topics: 238, demoFunctions: 308,
  htmlDemoSlots: 361, metadataDemoSlots: 24,
  figureSlots: 782, figureFiles: 643
};
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

function sourceRegistry(source) {
  const boundary = source.indexOf(APP_MARKER);
  assert.ok(boundary >= 0, 'Cannot find the boundary before browser application startup');
  assert.equal(source.indexOf(APP_MARKER, boundary + APP_MARKER.length), -1,
    'Application startup marker must be unique');
  // Run only declarations and registration IIFEs from this trusted repository.
  // No document, network, timers, filesystem, or browser APIs are supplied.
  // The reduced-motion query is the one startup dependency in this prefix.
  // This checks registered function values; it never invokes a demo function.
  const context = vm.createContext({
    window: { matchMedia: () => ({ matches: false }) }
  }, { codeGeneration: { strings: false, wasm: false } });
  const result = vm.runInContext(source.slice(0, boundary) + '\n' +
    '({deep: DEEP, subjects: SUBJECTS, demoKeys: Object.keys(DEMOS),' +
    ' invalidDemoKeys: Object.keys(DEMOS).filter(k => typeof DEMOS[k] !== "function")})',
    context, { timeout: 3000, filename: 'app.js:declarations-and-registries' });
  // Convert data out of the VM realm before comparing it with local JSON data.
  return JSON.parse(JSON.stringify(result));
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

function plainForIndex(html) {
  // Same transformations as src/build_data.py. Search indexes are generated;
  // never repair their text manually when this assertion fails.
  return html.replace(/<[^>]*>/g, ' ').replace(/&#?[a-z0-9]{1,8};/gi, ' ')
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

test('JavaScript parses; all topic JSON objects contain non-empty HTML', () => {
  new vm.Script(source, { filename: 'app.js' });
  assert.ok(topicFiles.length >= MINIMUM.topics, 'Topic/summary files were removed');
  for (const [file, topic] of topics) {
    assert.equal(typeof topic.html, 'string', `${file}: html must be a string`);
    assert.ok(topic.html.trim().length > 0, `${file}: html must not be empty`);
  }
});

test('DEEP metadata and topic files match exactly, with no missing or orphan topics', () => {
  assert.ok(Object.keys(registry.deep).length >= MINIMUM.subjects);
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

test('Every HTML and metadata demo slot has a registered function', () => {
  assert.deepEqual(registry.invalidDemoKeys, [], 'Registry contains a non-function');
  assert.ok(registry.demoKeys.length >= MINIMUM.demoFunctions, 'Registered demos were removed');
  assert.ok(htmlDemoSlots.length >= MINIMUM.htmlDemoSlots, 'HTML demo slots were removed');
  assert.ok(metadataDemoSlots.length >= MINIMUM.metadataDemoSlots, 'Metadata demo slots were removed');
  const keys = new Set(registry.demoKeys);
  const unknown = [...new Set([...htmlDemoSlots, ...metadataDemoSlots])]
    .filter(key => !keys.has(key));
  assert.deepEqual(unknown, [], 'Unknown demo keys (registration check only, not rendering)');
});

test('Every figure reference resolves to a non-empty WebP; media counts are retained', () => {
  assert.ok(figureFiles.length >= MINIMUM.figureFiles, 'Figure files were removed');
  assert.ok(figureSlots.length >= MINIMUM.figureSlots, 'Figure slots were removed');
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
