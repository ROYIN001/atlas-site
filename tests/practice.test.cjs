// Run: node --test tests/practice.test.cjs
// S5: data/qa (คำถามสอบปากเปล่าทุกวิชา จาก src/build_steps/qa.py) ต้องตรงกับ details.qa ใน data/t
// และโค้ดฝั่งหน้าเว็บ (ช่อง SLOT S5 ใน app.js) ใช้กติกา id เดียวกัน — การเทียบกับ DOM จริงอยู่ใน tests/practice.browser.cjs
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const T = path.join(ROOT, 'data', 't');
const QA = path.join(ROOT, 'data', 'qa');
const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const QA_TAG = /<details\b[^>]*\bclass="(?:[^"]*\s)?qa(?:\s[^"]*)?"[^>]*>/g;

function topicsBySubject() {
  const out = {};
  for (const f of fs.readdirSync(T).filter(n => n.endsWith('.json')).sort()) {
    const [sid, tid] = f.slice(0, -5).split('__');
    (out[sid] = out[sid] || []).push({ tid, html: JSON.parse(fs.readFileSync(path.join(T, f), 'utf8')).html });
  }
  return out;
}
const TOPICS = topicsBySubject();
const INDEX = JSON.parse(fs.readFileSync(path.join(QA, '_index.json'), 'utf8'));
const load = sid => JSON.parse(fs.readFileSync(path.join(QA, sid + '.json'), 'utf8'));

test('every subject with details.qa has data/qa/<sid>.json with the same number of questions, per topic too', () => {
  let total = 0;
  for (const [sid, topics] of Object.entries(TOPICS)) {
    const want = {};
    topics.forEach(t => { const n = (t.html.match(QA_TAG) || []).length; if (n) want[t.tid] = n; });
    const n = Object.values(want).reduce((a, b) => a + b, 0);
    if (!n) { assert.ok(!fs.existsSync(path.join(QA, sid + '.json')), `${sid}: no questions, no file`); continue; }
    const items = load(sid);
    assert.equal(items.length, n, `${sid}: question count equals details.qa in data/t`);
    const got = {};
    items.forEach(x => { got[x.tid] = (got[x.tid] || 0) + 1; });
    assert.deepEqual(got, want, `${sid}: per-topic counts`);
    assert.equal(INDEX[sid].n, n, `${sid}: _index n`);
    assert.deepEqual(INDEX[sid].t, want, `${sid}: _index t`);
    total += n;
  }
  assert.equal(Object.keys(INDEX).length, fs.readdirSync(QA).filter(f => f.endsWith('.json') && f !== '_index.json').length);
  assert.ok(total > 2000, 'all subjects covered (' + total + ')');
});

test('question ids are unique within each subject, keep existing ids, and follow "qa-" + stableId otherwise', () => {
  for (const sid of Object.keys(INDEX)) {
    const items = load(sid), ids = items.map(x => x.id);
    assert.equal(new Set(ids).size, ids.length, `${sid}: ids unique`);
    const own = new Set();
    TOPICS[sid].forEach(t => { for (const m of t.html.matchAll(QA_TAG)) { const id = /\bid="([^"]+)"/.exec(m[0]); if (id) own.add(id[1]); } });
    own.forEach(id => assert.ok(ids.includes(id), `${sid}: existing id kept: ${id}`));
    for (const x of items) {
      assert.ok(own.has(x.id) || /^qa-[0-9a-z]+(-[\w-]+)?$/.test(x.id), `${sid}: id shape ${x.id}`);
      assert.equal(typeof x.q, 'string'); assert.ok(x.q.length > 0, `${sid}/${x.id}: question text`);
      assert.equal(typeof x.hasRu, 'boolean');
    }
    // fix = ids that differ from the base rule (same question in several topics) — each must exist at its topic/position
    for (const [tid, byPos] of Object.entries(INDEX[sid].fix || {})) {
      const inTopic = items.filter(x => x.tid === tid);
      for (const [i, id] of Object.entries(byPos)) assert.equal(inTopic[+i].id, id, `${sid}/${tid}#${i}: fix id at position`);
    }
  }
});

test('answers carry no demos, figures or scripts (replaced by a link back to the content)', () => {
  for (const sid of Object.keys(INDEX)) {
    for (const x of load(sid)) {
      assert.doesNotMatch(x.a_html, /data-demo=|<figure\b|<script\b/i, `${sid}/${x.id}: cleaned answer`);
    }
  }
});

test('quiz2 counts in _index match data/t', () => {
  for (const [sid, topics] of Object.entries(TOPICS)) {
    if (!INDEX[sid]) continue;
    const want = {};
    topics.forEach(t => { const n = (t.html.match(/data-demo="quiz2"/g) || []).length; if (n) want[t.tid] = n; });
    assert.deepEqual(INDEX[sid].z, want, `${sid}: quiz2 per topic`);
  }
});

test('build output is compact JSON with sorted subjects and a trailing newline (deterministic re-runs)', () => {
  const raw = fs.readFileSync(path.join(QA, '_index.json'), 'utf8');
  assert.ok(raw.endsWith('\n'));
  const o = JSON.parse(raw);
  assert.equal(raw.length, JSON.stringify(o).length + 1, 'compact separators');   // JS reorders integer-like keys, so compare length
  assert.deepEqual(Object.keys(o), Object.keys(o).sort());
});
