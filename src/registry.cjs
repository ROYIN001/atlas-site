#!/usr/bin/env node
'use strict';
// อ่านทะเบียนของ app.js (DEEP · SUBJECTS · คีย์ DEMOS) โดยรันเฉพาะส่วนประกาศก่อน «APP» ใน vm
// ใช้ร่วมกันระหว่าง tests/audit-integrity.test.cjs กับ src/counts.py (เรียกไฟล์นี้ด้วย node แล้วอ่าน JSON)
//
//   node src/registry.cjs      → JSON { demoKeys: [...], metaDemos: { <วิชา>: [คีย์เดโมใน DEEP] } }
//
// ไม่มี document/เครือข่าย/timer ให้โค้ด — js/subj/<วิชา>.js ต่อท้ายเพื่อให้คีย์ของวิชาที่แยกไฟล์ถูกนับด้วย

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const APP_MARKER = '/* ================= APP ================= */';

function subjectScripts(root = ROOT) {
  const dir = path.join(root, 'js', 'subj');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(name => name.endsWith('.js')).sort()
    .map(name => ({ name, code: fs.readFileSync(path.join(dir, name), 'utf8') }));
}

function sourceRegistry(source, root = ROOT) {
  const boundary = source.indexOf(APP_MARKER);
  if (boundary < 0) throw new Error('Cannot find the boundary before browser application startup');
  if (source.indexOf(APP_MARKER, boundary + APP_MARKER.length) !== -1)
    throw new Error('Application startup marker must be unique');
  // Run only declarations and registration IIFEs from this trusted repository.
  // The reduced-motion query is the one startup dependency in this prefix.
  // This checks registered function values; it never invokes a demo function.
  const context = vm.createContext({
    window: { matchMedia: () => ({ matches: false }) }
  }, { codeGeneration: { strings: false, wasm: false } });
  const result = vm.runInContext(source.slice(0, boundary) + '\n' +
    subjectScripts(root).map(f => f.code).join('\n;\n') + '\n' +
    '({deep: DEEP, subjects: SUBJECTS, demoKeys: Object.keys(DEMOS),' +
    ' invalidDemoKeys: Object.keys(DEMOS).filter(k => typeof DEMOS[k] !== "function")})',
    context, { timeout: 3000, filename: 'app.js:declarations-and-registries' });
  // Convert data out of the VM realm before comparing it with local JSON data.
  return JSON.parse(JSON.stringify(result));
}

// คีย์เดโมที่ประกาศในเมทาดาทา DEEP (topic.demo / topic.demos) แยกตามวิชา
function metaDemos(registry) {
  const out = {};
  for (const [subject, data] of Object.entries(registry.deep)) {
    out[subject] = [...(data.topics || []), ...(data.summary || [])]
      .flatMap(t => t.demos || (t.demo ? [t.demo] : []));
  }
  return out;
}

module.exports = { ROOT, APP_MARKER, subjectScripts, sourceRegistry, metaDemos };

if (require.main === module) {
  const reg = sourceRegistry(fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'));
  process.stdout.write(JSON.stringify({ demoKeys: reg.demoKeys, metaDemos: metaDemos(reg) }));
}
