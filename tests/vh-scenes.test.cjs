/* ด่านกันแผนที่ ВИ ที่ตรวจแล้วถูกสคริปต์รุ่นเก่าทับ
   _work/vhist/tools/build_map.py ไม่รู้จักช่อง say ของฉากแผนที่ ถ้ารันซ้ำ ฉากและการแก้ทั้งหมดจะหาย
   ตั้งใจเพิ่มหรือลดฉาก: แก้ tests/vh-scenes.json พร้อมอธิบายใน commit */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const base = JSON.parse(fs.readFileSync(path.join(__dirname, "vh-scenes.json"), "utf8"));

test("แผนที่ ВИ มีฉากไม่น้อยกว่าที่ตรวจแล้ว", () => {
  const low = [];
  for (const [k, n] of Object.entries(base)) {
    const j = JSON.parse(fs.readFileSync(path.join(root, "data/vh", k + ".json"), "utf8"));
    const got = (j.events || []).filter(e => e.say).length;
    if (got < n) low.push(`${k}: ${got} < ${n}`);
  }
  assert.deepStrictEqual(low, [], "ฉากแผนที่หาย — อย่ารัน build_map.py กับแผนที่ที่ตรวจแล้ว: " + low.join(" · "));
});
