/* Service worker ของ Study Program — เปิดอ่านได้แม้ไม่มีเน็ต
   ลงทะเบียนจาก app.js เฉพาะบนเว็บจริง (https ที่ไม่ใช่ localhost) — preview.bat / verify.py บนเครื่องไม่ใช้ตัวนี้
   กลยุทธ์
   · หน้าเว็บ (navigate)    เน็ตก่อน รอไม่เกิน 4 วินาที แล้วค่อยใช้สำเนาในเครื่อง
   · ไฟล์อื่นในเว็บเดียวกัน   ส่งสำเนาในเครื่องทันทีถ้ามี แล้วโหลดใหม่เบื้องหลังให้ครั้งหน้าสดเสมอ (stale-while-revalidate)
                            ไม่มีสำเนาก็โหลดจากเน็ต · เน็ตล่มก็ใช้สำเนารุ่นอื่นของไฟล์เดียวกัน (ต่างกันแค่ ?v=)
   · คำขอที่ตั้ง cache: "reload" (ปุ่มเก็บ/อัปเดตสำเนาออฟไลน์ของ app.js — offlineSave)  เน็ตก่อนเสมอ แล้วเก็บตัวใหม่แทนตัวเดิม
                            เน็ตล่มค่อยใช้สำเนา — ปุ่ม «อัปเดต» จึงได้ไฟล์ล่าสุดจริง ไม่ใช่สำเนาเดิมที่ส่งกลับทันที
   · เก็บไฟล์ใหม่แล้วลบรุ่นเก่าที่ต่างกันแค่ ?v= ทิ้ง ไม่ให้ app.js รุ่นเก่า ๆ กองในเครื่อง
   · หน้าเว็บลบไฟล์ของวิชาที่ผู้อ่านไม่เก็บแล้วเอง (offlineRemove ใน app.js ลบจากทุก cache ที่ขึ้นต้น "atlas-")
   แก้ไฟล์นี้แล้วเบราว์เซอร์จะติดตั้งตัวใหม่เองในการเปิดครั้งถัดไป · เปลี่ยน CACHE เมื่อโครงของสำเนาเปลี่ยน (ล้างสำเนาทั้งหมดของทุกคน —
   ต้องล้าง atlas-offline-v1 ในหน้าเว็บให้ตรงกันด้วย ไม่งั้นหน้าวิชาจะบอกว่าเก็บไว้แล้วทั้งที่สำเนาหายไป)
   S3 (28 ก.ย. 2026): เพิ่มทาง cache: "reload" — คีย์และรูปแบบของสำเนาเหมือนเดิม จึงคง "atlas-v1" ไว้ สำเนาที่ผู้อ่านเก็บไว้แล้วใช้ต่อได้
   S9 (ปิดรุ่น v6): เก็บเป็นหน้าเว็บ (SHELL) เฉพาะการเปิดหน้าเว็บจริง (./ หรือ index.html) — เดิมทุกการเปิดในขอบเขต
   (เช่นเปิดรูปในแท็บใหม่) ถูกเก็บทับเป็นหน้าเว็บ แล้วตอนออฟไลน์เปิดเว็บได้รูปนั้นแทน · คง "atlas-v1" ไว้ด้วยเหตุผลเดิม */
const CACHE = "atlas-v1";
const SHELL = new URL("./", self.registration.scope).href;
const isShell = url => { const p = url.href.split(/[?#]/)[0]; return p === SHELL || p === SHELL + "index.html"; };

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !req.url.startsWith(SHELL)) return;
  if (req.headers.has("range")) return;
  if (req.mode === "navigate" && isShell(url)) e.respondWith(page(req));
  else if (req.mode === "navigate") e.respondWith(asset(req, e));    // เปิดไฟล์อื่นตรง ๆ (รูป JSON) — สำเนาของไฟล์นั้นเอง ไม่ใช่หน้าเว็บ
  else if (req.cache === "reload" || req.cache === "no-store") e.respondWith(fresh(req));
  else e.respondWith(asset(req, e));
});

async function fresh(req) {
  const c = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok && res.type === "basic") { await c.put(req, res.clone()); await prune(c, req.url); }
    return res;
  } catch (err) {
    return (await c.match(req)) || (await c.match(req, { ignoreSearch: true })) || Response.error();
  }
}

async function page(req) {
  const c = await caches.open(CACHE);
  const net = fetch(req).then(res => { if (res.ok) c.put(SHELL, res.clone()); return res; });
  net.catch(() => {});
  const late = new Promise(res => setTimeout(res, 4000, null));
  try {
    const res = await Promise.race([net, late]);
    if (res) return res;
    return (await c.match(SHELL)) || await net;
  } catch (err) {
    return (await c.match(SHELL)) || new Response(
      '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Study Program</title><p style="font:16px sans-serif;padding:32px">ออฟไลน์ และเครื่องนี้ยังไม่เคยเปิดเว็บนี้ — ต่อเน็ตแล้วลองใหม่</p>',
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}

async function asset(req, e) {
  const c = await caches.open(CACHE);
  const hit = await c.match(req);
  const net = fetch(req).then(async res => {
    if (res.ok && res.type === "basic") { await c.put(req, res.clone()); await prune(c, req.url); }
    return res;
  }).catch(() => null);
  if (hit) { e.waitUntil(net); return hit; }
  const res = await net;
  if (res) return res;
  return (await c.match(req, { ignoreSearch: true })) || Response.error();
}

async function prune(c, href) {
  const u = new URL(href);
  if (!u.search) return;
  for (const k of await c.keys()) {
    const ku = new URL(k.url);
    if (ku.pathname === u.pathname && ku.search !== u.search) await c.delete(k);
  }
}
