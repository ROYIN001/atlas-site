# ตรวจตัวคงตำแหน่งที่อ่าน (router: pinPick/pinKeep · 16 ต.ค. 2026) ในเบราว์เซอร์จริง — รันมือ ไม่อยู่ใน node --test และ CI
#   python tests/pin.browser.py [<โฟลเดอร์เว็บ>]   (Playwright ของ Python ตัวเดียวกับ src/verify.py · เครื่องนี้ไม่มี playwright ของ Node)
# ที่มา: ลิงก์ตรง #/suka/suka-isu แล้วเปลี่ยนขนาดหน้าต่าง → หัวข้อด้านบนที่ยังว่างเติมเนื้อหา แต่ Chromium ไม่ปรับตำแหน่ง
#   (เนื้อหาที่เติมมี <details> ปิดอยู่ใน .std2 ซึ่งเป็น container · ตอนเปลี่ยนขนาดจอ Chromium งดปรับ) → ผู้อ่านตกไปหัวข้อก่อนหน้า 2 000–230 000 px
# ข้อที่ต้องผ่าน: ลิงก์ตรงแล้วเปลี่ยนขนาดจอ (1000 · 390 px) ยังอยู่หัวข้อเดิม ข้อความที่อ่านห่างเส้นใต้แถบเท่าเดิม ·
#   เติมหัวข้อด้านบน (fillBody) ตำแหน่งไม่ขยับ · เลื่อนขึ้น/ลงด้วยล้อเมาส์ ข้อความที่เส้นอ่านเลื่อนเท่าระยะที่เลื่อนพอดี ·
#   เปิด <details> ที่ปิดอยู่เหนือเส้นแล้วเลื่อนไปหา (แบบ Ctrl+F) ไม่ถูกชดเชยหนี · ปุ่ม ↑ ถึงบนสุด · ย่อเมนู [ / โหมดอ่าน ] คงตำแหน่ง (railKeep ไม่ถูกชดเชยซ้ำ) · html.pin-read เฉพาะหน้าวิชา · ไม่มี page error / เซิร์ฟเวอร์ภายนอก
import http.server, os, socketserver, sys, threading, time
from functools import partial
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # โฟลเดอร์เว็บอื่นได้
if hasattr(sys.stdout, "reconfigure"): sys.stdout.reconfigure(encoding="utf-8")


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


httpd = socketserver.ThreadingTCPServer(("127.0.0.1", 0), partial(Quiet, directory=ROOT))
httpd.daemon_threads = True
threading.Thread(target=httpd.serve_forever, daemon=True).start()
BASE = "http://127.0.0.1:%d/" % httpd.server_address[1]
results = []


def check(name, ok, info=None):
    results.append(ok)
    print(("ok   " if ok else "FAIL ") + name + ("" if info is None else "  — " + str(info)), flush=True)


# ข้อความที่เส้นอ่าน: องค์ประกอบเล็ก (< 500 px) ใต้เส้นใต้แถบ + ระยะจากเส้น
LINE = """() => { const line = navOffset() + 6, r = view.querySelector('.wrap').getBoundingClientRect();
  let e = document.elementFromPoint(Math.round(r.left + Math.min(r.width, 600) / 2), line);
  if (e && e.getBoundingClientRect().height > 500) e = null;
  window.__ref = e || null; return e ? Math.round(e.getBoundingClientRect().top - navOffset()) : null; }"""
REF = "() => window.__ref && window.__ref.isConnected ? Math.round(window.__ref.getBoundingClientRect().top - navOffset()) : null"
TOP = "(id) => Math.round(document.getElementById(id).getBoundingClientRect().top - navOffset())"
CUR = "() => { const c = currentTopicEl(); return c ? c.id : null; }"


def new_page(b, w, h, errors, external):
    ctx = b.new_context(viewport={"width": w, "height": h})
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
    pg.on("console", lambda m: errors.append("console: " + m.text) if m.type == "error" else None)
    pg.on("request", lambda r: external.add(r.url) if r.url.startswith("http") and not r.url.startswith(BASE) else None)
    return ctx, pg


def idle(pg, ms=3500):
    pg.wait_for_function("() => typeof NAVBUSY !== 'undefined' && NAVBUSY === 0 && state.v === 'subject' && performance.now() > %d" % ms, timeout=60000)
    time.sleep(0.6)


with sync_playwright() as p:
    b = p.chromium.launch()
    errors, external = [], set()

    # 1) ลิงก์ตรงแล้วเปลี่ยนขนาดจอ — หัวข้อเดิม · ข้อความที่อ่านห่างเส้นเท่าเดิม (±60 px: หัวหัวข้อตัดบรรทัดใหม่ได้)
    for sid, tid, el in [("suka", "suka-isu", "ki-top"), ("suka", "suka-l20", "suka-l20"), ("surn", "surn-15", "surn-15")]:
        for w, h in [(1000, 760), (390, 760)]:
            ctx, pg = new_page(b, 1280, 904, errors, external)
            pg.goto(BASE + "#/%s/%s" % (sid, tid)); idle(pg)
            y0 = pg.evaluate(TOP, el)
            pg.set_viewport_size({"width": w, "height": h}); time.sleep(2.5)
            y1, cur, hs = pg.evaluate(TOP, el), pg.evaluate(CUR), pg.evaluate("location.hash")
            check("#/%s/%s แล้วเปลี่ยนจอเป็น %dx%d → ยังอยู่ %s" % (sid, tid, w, h, tid), cur == tid and hs == "#/%s/%s" % (sid, tid) and abs(y1 - y0) <= 200,
                  {"ระยะจากเส้น": [y0, y1], "หัวข้อ": cur, "hash": hs})
            ctx.close()

    # 2) เติมหัวข้อที่ยังว่างด้านบน (สิ่งที่เกิดเมื่อเลื่อนขึ้นอ่าน) — ตำแหน่งไม่ขยับ
    for sid, tid in [("suka", "suka-isu"), ("surn", "surn-15")]:
        ctx, pg = new_page(b, 1280, 904, errors, external)
        pg.goto(BASE + "#/%s/%s" % (sid, tid)); idle(pg)
        y0 = pg.evaluate(TOP, tid)
        filled = pg.evaluate("""async (t) => { const secs = [...document.querySelectorAll('#view section.topic[id]')], i = secs.findIndex(s => s.id === t);
          let k = i - 1; while (k >= 0 && !secs[k].querySelector('.tbody[data-lazy]')) k--;
          if (k < 0) return null; await fillBody(secs[k].querySelector('.tbody[data-lazy]')); return secs[k].id; }""", tid)
        time.sleep(2)
        y1 = pg.evaluate(TOP, tid)
        check("เติม %s ด้านบน %s → ตำแหน่งเดิม (±2 px)" % (filled, tid), filled is None or abs(y1 - y0) <= 2, [y0, y1])
        ctx.close()

    # 3) ล้อเมาส์ขึ้น/ลง: ข้อความที่เส้นอ่านเลื่อนเท่าระยะที่เลื่อนพอดี (ไม่นับข้อความใหม่ที่เพิ่งเลื่อนเข้าเส้น)
    for sid, tid, dy, n in [("suka", "suka-l16", -800, 40), ("suka", "suka-l3", 700, 40)]:
        ctx, pg = new_page(b, 1280, 904, errors, external)
        pg.goto(BASE + "#/%s/%s" % (sid, tid)); idle(pg)
        pg.mouse.move(500, 500); worst, bad = 0, 0
        for i in range(n):
            pg.evaluate("""() => { const m = new WeakMap(), line = navOffset() + 6, secs = [...document.querySelectorAll('#view section.topic')];
              let i = secs.findIndex(s => s.getBoundingClientRect().bottom > line); if (i < 0) i = secs.length - 1;
              for (const s of secs.slice(Math.max(0, i - 1), i + 2)) for (const e of s.querySelectorAll('*')) m.set(e, e.getBoundingClientRect().top);
              window.__pre = m; }""")
            pg.mouse.wheel(0, dy); time.sleep(0.45)
            err = pg.evaluate("""(dy) => { const r = view.querySelector('.wrap').getBoundingClientRect();
              const e = document.elementFromPoint(Math.round(r.left + Math.min(r.width, 600) / 2), navOffset() + 6);
              if (!e || !window.__pre.has(e) || e.getBoundingClientRect().height > 500) return null;
              return Math.round(e.getBoundingClientRect().top - window.__pre.get(e) + dy); }""", dy)
            if err is not None:
                worst = max(worst, abs(err)); bad += abs(err) > 30
        check("ล้อเมาส์ %+d × %d จาก %s → ไม่มีจุดกระโดด (> 30 px)" % (dy, n, tid), bad == 0, {"worst": worst, "jumps": bad})
        ctx.close()

    # 3b) เปิด <details> ที่ปิดอยู่เหนือเส้นอ่านแล้วเลื่อนไปหาในงานเดียวกัน (สิ่งที่ Ctrl+F ทำ) — ตัวคงตำแหน่งต้องไม่เลื่อนหนีจากเป้าหมาย
    ctx, pg = new_page(b, 1280, 904, errors, external)
    pg.goto(BASE + "#/suka/suka-l18"); idle(pg)
    r = pg.evaluate("""() => { const ds = [...document.querySelectorAll('#view .std2 details.deep:not([open])')].filter(d => d.getBoundingClientRect().bottom < -400);
      const d = ds[ds.length - 1]; if (!d) return null;
      d.open = true; d.scrollIntoView({ block: 'start', behavior: 'instant' }); window.__find = d; return Math.round(d.getBoundingClientRect().top); }""")
    time.sleep(1.5)
    r2 = pg.evaluate("() => window.__find ? Math.round(window.__find.getBoundingClientRect().top) : null")
    check("เปิด details เหนือเส้นแล้วเลื่อนไปหา (แบบ Ctrl+F) → เป้าหมายอยู่ที่เดิม (±3 px)", r is not None and r2 is not None and abs(r2 - r) <= 3, [r, r2])
    ctx.close()

    # 4) ปุ่ม ↑ ขึ้นถึงบนสุดแม้หัวข้อด้านบนเติมระหว่างทาง
    ctx, pg = new_page(b, 1280, 904, errors, external)
    pg.goto(BASE + "#/suka/suka-l20"); idle(pg)
    pg.mouse.wheel(0, -900); time.sleep(0.8)
    pg.evaluate("document.getElementById('topBtn').click()"); time.sleep(5)
    check("ปุ่ม ↑ → บนสุด และงานกระโดดจบ", pg.evaluate("scrollY") < 2 and pg.evaluate("NAVBUSY") == 0, pg.evaluate("[Math.round(scrollY), NAVBUSY]"))
    check("html.pin-read เฉพาะหน้าวิชา", "pin-read" in pg.evaluate("document.documentElement.className"))
    pg.evaluate("go({v: 'overview'})"); time.sleep(0.5)
    check("ออกจากหน้าวิชา → ไม่มี html.pin-read", "pin-read" not in pg.evaluate("document.documentElement.className"))
    ctx.close()

    # 5) ย่อ/ขยายเมนู [ และโหมดอ่าน ] — railKeep ชดเชยเองแล้ว ตัวคงตำแหน่งต้องไม่ชดเชยซ้ำ
    for key in ["BracketLeft", "BracketRight"]:
        ctx, pg = new_page(b, 1500, 900, errors, external)
        pg.goto(BASE + "#/suka/suka-l7"); idle(pg)
        pg.mouse.move(600, 500); pg.mouse.wheel(0, 3000); time.sleep(1.2)
        t0 = pg.evaluate(LINE); pg.keyboard.press(key); time.sleep(1.5); t1 = pg.evaluate(REF)
        check("ปุ่ม %s คงข้อความที่อ่าน (±3 px)" % key, t0 is not None and t1 is not None and abs(t1 - t0) <= 3, [t0, t1])
        ctx.close()

    check("ไม่มี page error / console.error", not errors, errors[:5])
    check("ไม่เรียกเซิร์ฟเวอร์ภายนอก", not external, sorted(external)[:5])
    b.close()

httpd.shutdown()
print("\n%d/%d ผ่าน" % (sum(results), len(results)))
sys.exit(0 if all(results) else 1)
