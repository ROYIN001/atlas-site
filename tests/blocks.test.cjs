#!/usr/bin/env node
'use strict';
// บล็อกที่ประกอบอัตโนมัติใน app.js / app.css (ทะเบียน src/blocks.json) ต้องไม่ถูกแก้มือ —
// แก้ที่ต้นฉบับใน _work/ แล้วรันสคริปต์ประกอบ จากนั้น python src/blocks.py --update <ชื่อบล็อก>
// sha1 = ข้อความ marker เริ่ม…ท้าย marker จบ เป็น UTF-8 หลัง CRLF → LF (สูตรเดียวกับ src/blocks.py)

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const REG = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'blocks.json'), 'utf8'));
const texts = {};
const text = file => texts[file] || (texts[file] = fs.readFileSync(path.join(ROOT, file), 'utf8'));

function block(src, b) {
  const s = src.indexOf(b.start);
  if (s < 0) return { err: 'ไม่พบ marker เริ่ม' };
  if (src.indexOf(b.start, s + 1) >= 0) return { err: 'marker เริ่มซ้ำ' };
  const e = src.indexOf(b.end, s + b.start.length);
  if (e < 0) return { err: 'ไม่พบ marker จบ' };
  if (src.indexOf(b.end, e + 1) >= 0) return { err: 'marker จบซ้ำ' };
  return { chunk: src.slice(s, e + b.end.length) };
}

test('generated blocks in app.js/app.css match src/blocks.json (no hand edits)', () => {
  const bad = [];
  for (const [name, b] of Object.entries(REG.blocks)) {
    const { chunk, err } = block(text(b.file), b);
    if (err) { bad.push(`${name}: ${b.file} ${err}`); continue; }
    const sha = crypto.createHash('sha1').update(chunk.replace(/\r\n/g, '\n'), 'utf8').digest('hex').slice(0, 12);
    if (sha !== b.sha1) {
      bad.push(`${name} (${b.file}) ถูกแก้โดยไม่ผ่านต้นฉบับ — แก้ที่ ${b.source} แล้วรัน ${b.build} ` +
        `(รันสคริปต์ประกอบแล้วจริง: python src/blocks.py --update ${name})`);
    }
  }
  if (bad.length) assert.fail('บล็อกประกอบอัตโนมัติ:\n    ' + bad.join('\n    '));
});

test('block registry entries are complete and do not overlap', () => {
  const spans = {};
  for (const [name, b] of Object.entries(REG.blocks)) {
    for (const k of ['file', 'start', 'end', 'source', 'build', 'sha1']) assert.ok(b[k], `${name}: missing ${k}`);
    const src = text(b.file), s = src.indexOf(b.start), e = src.indexOf(b.end, s) + b.end.length;
    (spans[b.file] ||= []).push([s, e, name]);
  }
  for (const list of Object.values(spans)) {
    list.sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < list.length; i++) assert.ok(list[i][0] >= list[i - 1][1], `${list[i - 1][2]} overlaps ${list[i][2]}`);
  }
});
