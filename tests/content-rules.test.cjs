#!/usr/bin/env node
'use strict';
// กติกาเนื้อหาที่ตรวจด้วยเครื่องได้ (CLAUDE.md หัวข้อ 5, 7, 12) — ทุกหัวข้อใน data/t และสตริงใน app.js / js/subj
//   ก  อักษรไทยติดซีริลลิกในคำเดียว (เช่น «สл.», «сูตร»)
//   ข  ทุกหัวข้อ (ไม่รวม *-map และบล็อกสรุป *-s1..s4) มีบรรทัดอ้างอิงต้นทางใกล้ท้าย
//   ค  id ในหัวข้อไม่ซ้ำกันทั้งวิชา และไม่ชนกับรหัสหัวข้อ (ใช้เป็นปลายทางลิงก์ #/<วิชา>/<หัวข้อ>/<id>)
//   ง  ข้อความที่พูดกับเจ้าของงาน/Claude หรืออ้างเครื่องของเจ้าของงาน — ผู้อ่านไม่ควรเห็น
//   จ  tests/content-allow.json = รายการยกเว้นชั่วคราวของเนื้อหาเดิม แบบ ratchet: ลดได้เท่านั้น
//      (แก้หัวข้อแล้ว ต้องลบออกจากรายการด้วย — ไม่งั้นเทสต์ตกว่า «ลบออกจาก content-allow.json»)
// Run: node --test tests/content-rules.test.cjs

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const ALLOW_FILE = path.join(ROOT, 'tests', 'content-allow.json');
const ALLOW = JSON.parse(fs.readFileSync(ALLOW_FILE, 'utf8'));
// เพดานของรายการยกเว้น (28 ก.ย. 2026) — ลดได้เท่านั้น: แก้เนื้อหาแล้วลดตัวเลขนี้ตามจำนวนที่เหลือจริง
// ห้ามเพิ่ม — หัวข้อใหม่ต้องผ่านกติกาตั้งแต่แรก
const CAP = { 'source-line': 37, 'thai-cyrillic': 15, 'owner-talk': 22 };

const topics = fs.readdirSync(path.join(ROOT, 'data', 't')).filter(f => f.endsWith('.json')).sort()
  .map(file => {
    const [sid, tid] = file.slice(0, -5).split('__');
    return { file, sid, tid, html: JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 't', file), 'utf8')).html };
  });

const stripScripts = html => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ');
const plain = html => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

// ---- ก ----
const THAI_CYR = /[฀-๿][А-яЁё]|[А-яЁё][฀-๿]/g;

// ---- ง ----  แต่ละข้อมีเหตุผลกำกับ — คำที่ใช้ได้ตามปกติ (เช่นสัญญาณ «ส่งกลับมาที่ยาน») ต้องไม่ติด
const OWNER_RULES = [
  [/บอกผม|ให้ผม|ส่งกลับมาให้|ส่งกลับมา(?=\s*(?:[.»"<]|$))|ตามที่สั่งไว้/g, 'พูดกับเจ้าของงาน/Claude'],
  [/เจ้าของ(?:งาน|โปรเจกต์|โครงการ)/g, 'อ้างเจ้าของงาน'],
  [/Russian lesson|_work\//g, 'อ้างโฟลเดอร์ในเครื่องของเจ้าของงาน'],
  // «โฟลเดอร์» ที่ชี้โฟลเดอร์ต้นฉบับในเครื่องเจ้าของงาน (ในโฟลเดอร์ / จากโฟลเดอร์ / โฟลเดอร์ต้นฉบับ …)
  // โฟลเดอร์ของโปรแกรม (CoDeSys «เปิดโฟลเดอร์ Timer», «word/media/» ใน .docx) และ «ในโฟลเดอร์เดียวกันนี้»
  // ในข้อความถึงผู้อ่านที่เปิดสำเนาในเครื่องตัวเอง ใช้ได้ ไม่นับ
  [/(?:ใน|จาก)โฟลเดอร์(?!เดียวกัน)|โฟลเดอร์(?:ต้นฉบับ|เอกสาร|ของภาควิชา|ของวิชา|ของเจ้าของ)/g, 'อ้างโฟลเดอร์ของเจ้าของงาน'],
  [/[^\s"'<>/]\.(?:pptx|docx|pdf)\b|ไฟล์\s*(?:<[^>]*>\s*)*\.(?:pptx|docx|pdf)\b/gi, 'ชื่อไฟล์ต้นฉบับ (.pptx/.docx/.pdf) — อ้างเป็นบรรยาย/ตำรา/หน้าแทน'],
];
// ลิงก์ภายนอก (เช่นเอกสาร .pdf ของ TI/Stanford) เป็นแหล่งอ้างอิงที่ผู้อ่านเปิดได้ — ตัดออกก่อนตรวจ
const stripUrls = s => s.replace(/\b(?:href|src)\s*=\s*(["'])[\s\S]*?\1/gi, ' ').replace(/https?:\/\/[^\s"'<>]+/g, ' ');

function ownerHits(text) {
  const t = stripUrls(text), out = [];
  for (const [re, why] of OWNER_RULES) {
    for (const m of t.matchAll(re)) out.push(`${why}: «…${t.slice(Math.max(0, m.index - 30), m.index + m[0].length + 20).replace(/\s+/g, ' ')}…»`);
  }
  return out;
}

// ---- ข ----
const SOURCE_KW = /แหล่งอ้างอิง|แหล่งที่มา|ที่มา|ต้นทาง|อ้างอิง|Источник|Литература/;
const needsSource = tid => !/-map$|-s[1-4]$/.test(tid);
function hasSourceLine(html) {
  const h = stripScripts(html);
  if (SOURCE_KW.test(plain(h).slice(-800))) return true;
  // บรรทัดอ้างอิงยาว ๆ (เช่น История/СН ЛА) อยู่ในองค์ประกอบ class="src" — ผ่านถ้าหลังองค์ประกอบนั้นเหลือข้อความ ≤ 800 ตัว
  const opens = [...h.matchAll(/<([a-zA-Z][\w-]*)\b[^>]*\bclass\s*=\s*"(?:[^"]*\s)?src(?:\s[^"]*)?"[^>]*>/g)];
  if (!opens.length) return false;
  const last = opens[opens.length - 1], name = last[1];
  let depth = 1, pos = last.index + last[0].length;
  const re = new RegExp(`<(/?)${name}\\b[^>]*>`, 'g');
  re.lastIndex = pos;
  for (let m; (m = re.exec(h));) {
    depth += m[1] ? -1 : 1;
    if (!depth) { pos = m.index + m[0].length; break; }
  }
  return plain(h.slice(pos)).length <= 800;
}

// ---- ค ----  (วิธีนับเดียวกับ tagAttrs ใน audit-integrity / tag_attrs ใน src/counts.py)
function ids(html) {
  const clean = html.replace(/<!--[\s\S]*?-->/g, '').replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi, '$1</script>');
  return (clean.match(/<[A-Za-z][^>]*>/g) || []).flatMap(tag => [...tag.matchAll(/(?<![\w-])id\s*=\s*(["'])([\s\S]*?)\1/g)].map(m => m[2]));
}

// ---- สตริงใน app.js / js/subj — ตัวอ่านโค้ดขนาดเล็ก: เก็บเฉพาะสตริง/เทมเพลต ข้ามคอมเมนต์และ regex ----
function jsStrings(src) {
  const out = [];
  const KW = new Set(['return', 'typeof', 'case', 'in', 'of', 'void', 'delete', 'new', 'else', 'do', 'throw', 'yield', 'await', 'instanceof']);
  let i = 0, prev = '';                 // prev = ตัวสำคัญก่อนหน้า (ใช้แยก / หาร กับ /regex/)
  const braces = [];                   // ความลึก { } ภายใน ${ … } ของเทมเพลต
  const n = src.length;
  const readString = q => {
    let j = i + 1, s = '';
    while (j < n && src[j] !== q) { if (src[j] === '\\') { s += src[j + 1]; j += 2; } else s += src[j++]; }
    out.push({ at: i, s }); i = j + 1; prev = 'str';
  };
  const readTemplate = () => {        // จาก ` หรือ } ที่ปิด ${ — อ่านถึง ` หรือ ${
    let j = i + 1, s = '';
    while (j < n && src[j] !== '`' && !(src[j] === '$' && src[j + 1] === '{')) {
      if (src[j] === '\\') { s += src[j + 1]; j += 2; } else s += src[j++];
    }
    out.push({ at: i, s });
    if (src[j] === '`') { i = j + 1; prev = 'str'; } else { braces.push(0); i = j + 2; prev = '('; }
  };
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { i = src.indexOf('\n', i); if (i < 0) break; continue; }
    if (c === '/' && d === '*') { i = src.indexOf('*/', i + 2); if (i < 0) break; i += 2; continue; }
    if (c === '"' || c === "'") { readString(c); continue; }
    if (c === '`') { readTemplate(); continue; }
    if (c === '/') {
      const isRegex = prev === '' || /[(,=:[!&|?{};+\-*%<>~^]$/.test(prev) || KW.has(prev);
      if (isRegex) {
        let j = i + 1, cls = false;
        while (j < n && (cls || src[j] !== '/')) {
          if (src[j] === '\\') j++;
          else if (src[j] === '[') cls = true;
          else if (src[j] === ']') cls = false;
          else if (src[j] === '\n') break;
          j++;
        }
        i = j + 1; while (/[a-z]/i.test(src[i] || '')) i++;
        prev = 'regex'; continue;
      }
      i++; prev = '/'; continue;
    }
    if (braces.length) {
      if (c === '{') braces[braces.length - 1]++;
      else if (c === '}') {
        if (braces[braces.length - 1] === 0) { braces.pop(); readTemplate(); continue; }
        braces[braces.length - 1]--;
      }
    }
    if (/\s/.test(c)) { i++; continue; }
    if (/[\w$]/.test(c)) {
      let j = i; while (j < n && /[\w$]/.test(src[j])) j++;
      prev = src.slice(i, j); i = j; continue;
    }
    prev = c; i++;
  }
  return out;
}

const lineOf = (src, at) => { let l = 1; for (let k = src.indexOf('\n'); k >= 0 && k < at; k = src.indexOf('\n', k + 1)) l++; return l; };

function codeFiles() {
  const dir = path.join(ROOT, 'js', 'subj');
  const subj = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort().map(f => `js/subj/${f}`) : [];
  return ['app.js', ...subj].map(rel => ({ rel, src: fs.readFileSync(path.join(ROOT, rel), 'utf8') }));
}

// ---- ratchet: เทียบผลจริงกับรายการยกเว้น ----
function ratchet(rule, found) {
  // found: { key: [ข้อความ…] } ที่ผิดกติกาตอนนี้ · allow: { key: จำนวนที่ยอม } หรือ [key…] (ยอม 1)
  const raw = ALLOW[rule] || {};
  const allow = Array.isArray(raw) ? Object.fromEntries(raw.map(k => [k, 1])) : raw;
  const bad = [], stale = [];
  for (const [key, hits] of Object.entries(found)) {
    const a = allow[key] || 0;
    if (hits.length > a) bad.push(`${key}: ${hits.length} จุด${a ? ` (ยกเว้นไว้ ${a})` : ''}\n      ${hits.slice(0, 4).join('\n      ')}`);
  }
  for (const [key, a] of Object.entries(allow)) {
    const got = (found[key] || []).length;
    if (got < a) stale.push(`${key}: เหลือ ${got} จาก ${a} — ลดหรือลบออกจาก tests/content-allow.json («${rule}»)`);
  }
  const total = Object.values(allow).reduce((x, y) => x + y, 0);
  return { bad, stale, total };
}

function check(rule, found) {
  const { bad, stale, total } = ratchet(rule, found);
  assert.ok(total <= CAP[rule], `tests/content-allow.json «${rule}» ยกเว้นรวม ${total} เกินเพดาน ${CAP[rule]} — รายการนี้ลดได้เท่านั้น`);
  if (stale.length) assert.fail('รายการยกเว้นค้าง — แก้เนื้อหาแล้วต้องลบออกด้วย (ratchet):\n    ' + stale.join('\n    '));
  if (bad.length) assert.fail(`ผิดกติกา «${rule}» ${bad.length} ที่:\n    ` + bad.join('\n    '));
}

// node tests/content-rules.test.cjs --list 2> ค้าง.json → ทุกจุดที่ยังผิดกติกา (รวมที่ยกเว้นไว้) เป็น JSON ทาง stderr
const LIST = process.argv.includes('--list') ? {} : null;
const report = (rule, found) => (LIST ? (LIST[rule] = found) : check(rule, found));

test('ก · no Thai letter glued to a Cyrillic letter inside one word (data/t + strings in app.js/js/subj)', () => {
  const found = {};
  for (const t of topics) {
    const hits = [...plain(t.html).matchAll(THAI_CYR)].map(m => '«' + plain(t.html).slice(Math.max(0, m.index - 15), m.index + 17) + '»');
    if (hits.length) found[t.file] = hits;
  }
  for (const { rel, src } of codeFiles()) {
    for (const s of jsStrings(src)) {
      for (const m of s.s.matchAll(THAI_CYR)) {
        // คีย์ = ไฟล์ + ข้อความรอบจุด (ไม่ใช้เลขบรรทัด — session อื่นแก้ app.js แล้วบรรทัดเลื่อน)
        const around = s.s.slice(Math.max(0, m.index - 8), m.index + 10).replace(/\s+/g, ' ');
        (found[`${rel} «${around}»`] ||= []).push(`บรรทัด ${lineOf(src, s.at)}`);
      }
    }
  }
  report('thai-cyrillic', found);
});

test('ข · every lesson topic (not *-map, not summary *-s1..s4) ends with a source line', () => {
  const found = {};
  for (const t of topics) {
    if (needsSource(t.tid) && !hasSourceLine(t.html)) found[`${t.sid}__${t.tid}`] = ['ไม่พบบรรทัดอ้างอิงต้นทาง (แหล่งอ้างอิง/ที่มา/ต้นทาง …) ใน 800 ตัวอักษรท้าย'];
  }
  report('source-line', found);
});

test('ค · element ids are unique within a subject and do not collide with topic ids', () => {
  const seen = new Map(), bad = [];
  const tids = new Map();
  for (const t of topics) { if (!tids.has(t.sid)) tids.set(t.sid, new Set()); tids.get(t.sid).add(t.tid); }
  for (const t of topics) {
    for (const id of ids(t.html)) {
      const key = `${t.sid}#${id}`;
      if (seen.has(key)) bad.push(`${t.sid}: id «${id}» ซ้ำใน ${seen.get(key)} และ ${t.tid}`);
      else seen.set(key, t.tid);
      if (tids.get(t.sid).has(id)) bad.push(`${t.sid}/${t.tid}: id «${id}» ชนกับรหัสหัวข้อ`);
    }
  }
  assert.deepEqual(bad, [], 'id ซ้ำ — ตั้งชื่อขึ้นต้นด้วยรหัสหัวข้อ (CLAUDE.md หัวข้อ 13)');
});

test('ง · reader-facing text never talks to the owner/Claude or points at the owner\'s machine', () => {
  const found = {};
  for (const t of topics) {
    const hits = ownerHits(t.html);
    if (hits.length) found[t.file] = hits;
  }
  for (const { rel, src } of codeFiles()) {
    for (const s of jsStrings(src)) {
      for (const h of ownerHits(s.s)) (found[`${rel} ${h}`] ||= []).push(`บรรทัด ${lineOf(src, s.at)}`);
    }
  }
  report('owner-talk', found);
});

test('string scanner sanity: finds strings, skips comments and regex literals', () => {
  const got = jsStrings('a = "x/y"; // "no"\n/* \'no\' */ b = /["\']/g.test(c) ? `t${ {k: "in"}.k }u` : 1 / 2 / 3;').map(s => s.s);
  assert.deepEqual(got, ['x/y', 't', 'in', 'u']);
  assert.ok(jsStrings(fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8')).length > 10000, 'app.js string scan looks broken');
});

if (LIST) process.once('beforeExit', () => process.stderr.write(JSON.stringify(LIST, null, 1) + '\n'));
