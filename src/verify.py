"""ตรวจเว็บก่อนส่ง ตาม CLAUDE.md หัวข้อ 4

    python src/verify.py                 # ทุกวิชาใน data/manifest.json · CPU ช้า 6 เท่า
    python src/verify.py --subject tau   # เฉพาะวิชาเดียว
    python src/verify.py --no-throttle   # ไม่จำลองมือถือ (เร็วกว่ามาก)

ต้องผ่านทุกข้อ: ทุกวิชาเปิดได้ · ไม่มี .tfail · canvas = [data-demo] · รูปทุกใบ
naturalWidth > 0 · ค้นหาคำรัสเซียเจอ · ไม่มี page error
· กล่อง/ช่องรูปในหน้า ต้องเท่ากับไฟล์ใน data/t (ของหายต้องรู้) · โครง figure มี .fw+img ครบ
· จำนวนต่อวิชาต้องไม่ลดลงจาก src/verify-baseline.json — ตั้งใจเปลี่ยนจำนวน ให้รัน --update-baseline
พึ่งแค่ playwright กับ stdlib · ห้ามเปิดด้วย file:// จึงเปิดเซิร์ฟเวอร์เองใน thread
"""
import argparse
import http.server
import json
import re
import socket
import sys
import threading
import time
from functools import partial
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)   # ให้เห็นความคืบหน้าแม้ redirect ไปไฟล์

ROOT = Path(__file__).resolve().parent.parent
QUERY = "Передаточная функция"   # คำค้นทดสอบ ควรเจอในหลายวิชา
BASELINE = ROOT / "src" / "verify-baseline.json"
BLOCKED_HOSTS = ("fonts.googleapis.com", "fonts.gstatic.com")


# ---------- เซิร์ฟเวอร์ในเครื่อง (เงียบ ไม่พิมพ์ log) ----------
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def free_port(start=8765):
    for p in range(start, start + 50):
        with socket.socket() as s:
            try:
                s.bind(("127.0.0.1", p))
                return p
            except OSError:
                continue
    raise RuntimeError("หาพอร์ตว่างไม่ได้")


def start_server(port):
    handler = partial(QuietHandler, directory=str(ROOT))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    th = threading.Thread(target=srv.serve_forever, daemon=True)
    th.start()
    return srv


# ---------- ช่วยเลื่อนหน้าและรอ ----------
# เลื่อนทั้งรอบภายในหน้าเดียว (ไม่ต้องยิง CDP ทีละก้าว ซึ่งช้ามากตอน CPU ถูกถ่วง)
SCROLL_ALL = """async (maxSteps) => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < maxSteps; i++) {
    const h = document.documentElement.scrollHeight;
    window.scrollBy(0, Math.max(300, window.innerHeight - 100));
    await sleep(50);
    if (window.scrollY + window.innerHeight >= h - 4) return i + 1;
  }
  return maxSteps;
}"""

# กล่องที่ยังไม่โหลด = ยังมี data-lazy (observer ยังไม่เห็น) หรือมี .tload ที่ไม่ใช่ .tfail (fetch ยังไม่กลับ)
PENDING_BOXES = "document.querySelectorAll('#view .tbody[data-lazy], #view .tbody > .tload:not(.tfail)').length"

COUNTS = """() => {
  const v = document.getElementById('view');
  const imgs = [...v.querySelectorAll('figure.ifig[data-fig] img')];
  return {
    boxes: v.querySelectorAll('.tbody:not([data-lazy])').length,
    pending: v.querySelectorAll('.tbody[data-lazy], .tbody > .tload:not(.tfail)').length,
    tfail: v.querySelectorAll('.tfail').length,
    demos: v.querySelectorAll('[data-demo]').length,
    canvas: v.querySelectorAll('canvas').length,
    figs: v.querySelectorAll('figure.ifig[data-fig]').length,
    imgs_ok: imgs.filter(i => i.naturalWidth > 0).length,
    imgs_nosrc: imgs.filter(i => !i.getAttribute('src')).length,
    fw_bad: [...v.querySelectorAll('figure.ifig[data-fig]')].filter(f => !f.querySelector('.fw img')).length,
  };
}"""

IMGS_DONE = """() => [...document.querySelectorAll('#view figure.ifig[data-fig] img')]
  .every(i => i.getAttribute('src') && i.complete)"""


def scroll_to_bottom(page, max_steps=1600):
    """เลื่อนทีละหน้าจอจนสุด — IntersectionObserver (900 px) จะสั่งโหลดกล่องระหว่างทาง
    ความสูงหน้าเพิ่มขึ้นเรื่อย ๆ เมื่อกล่องเติมเนื้อหา จึงเช็กจุดสุดใหม่ทุกก้าว"""
    page.evaluate(SCROLL_ALL, max_steps)


def wait_boxes(page, timeout_ms):
    try:
        page.wait_for_function(f"() => {PENDING_BOXES} === 0", timeout=timeout_ms)
        return True
    except Exception:
        return False


def wait_images(page, timeout_ms):
    try:
        page.wait_for_function(IMGS_DONE, timeout=timeout_ms)
        return True
    except Exception:
        return False


VERBOSE = False


def lap(label, t0):
    """พิมพ์เวลาของแต่ละช่วงเมื่อ --verbose คืนเวลาปัจจุบันไว้จับช่วงถัดไป"""
    now = time.perf_counter()
    if VERBOSE:
        print(f"      {label:<12} {now - t0:6.1f}s")
    return now


def load_pass(page, timeout_ms):
    """เลื่อนจนสุด → รอกล่อง → เลื่อนอีกรอบให้ SUKAFIG (800 px) ใส่ src รูป → รอรูป"""
    t = time.perf_counter()
    scroll_to_bottom(page);            t = lap("scroll1", t)
    wait_boxes(page, timeout_ms);      t = lap("boxes1", t)
    # กล่องที่เพิ่งเติมอาจดันเนื้อหาลงไปอีก เลื่อนซ้ำจนสุดจริง ๆ แล้วรออีกครั้ง
    scroll_to_bottom(page);            t = lap("scroll2", t)
    wait_boxes(page, timeout_ms);      t = lap("boxes2", t)
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(100)
    scroll_to_bottom(page);            t = lap("scroll3", t)
    wait_images(page, timeout_ms);     t = lap("images", t)


def set_mode(page, mode):
    """สลับโหมด สรุป/ฉบับเต็ม ด้วยปุ่มจริง คืน False ถ้าวิชานี้ไม่มีแถบโหมด"""
    btn = page.query_selector(f'#view .modebar [data-mode="{mode}"]')
    if not btn:
        return False
    if "on" not in (btn.get_attribute("class") or "").split():
        # el.click() ตรง ๆ ไม่ผ่านการรอ "stable" ของ Playwright — แถบโหมดเป็น sticky
        # หน้ายาว ๆ ที่ CPU ถูกถ่วง 6 เท่าทำให้กล่องขยับตลอดจนคลิกปกติค้างครบ 90 วินาที
        btn.evaluate("el => el.click()")
        page.wait_for_selector("#view section.topic .tbody", timeout=15000)
    return True


# ---------- ตรวจวิชาเดียว ----------
def check_subject(page, base, sid, errors, timeout_ms):
    n0 = len(errors)
    t0 = time.perf_counter()
    # route จริง: app.js อ่าน location.hash รูปแบบ #s=<id> ทั้งตอนโหลดและตอน hashchange
    # เปลี่ยนแค่ hash (ไม่โหลด app.js 2.2 MB ใหม่) เหมือนผู้อ่านกดการ์ดวิชา
    page.evaluate("id => { location.hash = '#s=' + id; }", sid)
    # go() ตั้ง state แล้ววาดทันที — รอจน state ชี้วิชานี้และมี section.topic ของมันแล้ว
    page.wait_for_function(
        "id => typeof state !== 'undefined' && state.v === 'subject' && state.id === id && "
        "document.querySelector('#view section.topic')",
        arg=sid, timeout=timeout_ms)

    res = {"id": sid, "sum_boxes": None, "sum_tfail": None}
    lap("navigate", t0)
    t1 = time.perf_counter()
    has_modes = set_mode(page, "full")
    lap("mode=full", t1)
    load_pass(page, timeout_ms)
    c = page.evaluate(COUNTS)
    res.update(c)

    sum_ok = True
    if has_modes:
        # โหมดสรุป: ตรวจเงื่อนไขเดียวกัน แต่ไม่รวมเข้าบรรทัด SUMMARY (นับเฉพาะฉบับเต็ม)
        set_mode(page, "sum")
        load_pass(page, timeout_ms)
        cs = page.evaluate(COUNTS)
        res["sum"] = cs
        res["sum_boxes"] = cs["boxes"]
        res["sum_tfail"] = cs["tfail"]
        res["tfail"] += cs["tfail"]
        sum_ok = (cs["boxes"] > 0 and cs["pending"] == 0 and cs["tfail"] == 0
                  and cs["demos"] == cs["canvas"] and cs["figs"] == cs["imgs_ok"]
                  and cs.get("fw_bad", 0) == 0)
        set_mode(page, "full")   # คืนค่า localStorage เป็นฉบับเต็ม

    res["errors"] = len(errors) - n0
    res["secs"] = time.perf_counter() - t0
    res["ok"] = (
        res["boxes"] > 0 and res["pending"] == 0 and res["tfail"] == 0
        and res["demos"] == res["canvas"] and res["figs"] == res["imgs_ok"]
        and res.get("fw_bad", 0) == 0 and res["errors"] == 0 and sum_ok
    )
    return res


# ---------- ค้นหา ----------
def check_search(page, base, timeout_ms):
    page.goto("about:blank")
    page.goto(base, wait_until="domcontentloaded")
    page.wait_for_selector("#view .subj-grid .subj", timeout=timeout_ms)
    # loadIndex() ยิง 1.2 s หลัง load แล้วเติม IXHAY — รอสูงสุด 5 s (ตามหัวข้อ 4)
    ix_ready = True
    try:
        page.wait_for_function("() => Object.keys(IXHAY).length > 0", timeout=5000)
    except Exception:
        ix_ready = False
    page.fill("#search", QUERY)        # handler หน่วง 160 ms แล้ว go({v:"search"})
    try:
        page.wait_for_selector("#view .res-item", timeout=timeout_ms)
    except Exception:
        pass
    hits = page.evaluate("document.querySelectorAll('#view .res-item').length")
    ix_keys = page.evaluate("Object.keys(IXHAY).length")
    return hits, ix_ready, ix_keys


# ---------- main ----------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--subject", help="ตรวจเฉพาะวิชานี้ (id ใน manifest)")
    ap.add_argument("--no-throttle", action="store_true", help="ไม่จำลอง CPU ช้า 6 เท่า")
    ap.add_argument("--port", type=int, default=0)
    ap.add_argument("--timeout", type=int, default=90, help="วินาทีต่อการรอแต่ละขั้น")
    ap.add_argument("--verbose", action="store_true", help="พิมพ์เวลาแต่ละช่วงของทุกวิชา")
    ap.add_argument("--update-baseline", action="store_true",
                    help="บันทึกจำนวนของรอบนี้ลง src/verify-baseline.json — ใช้เมื่อตั้งใจเพิ่ม/ลดเนื้อหา")
    args = ap.parse_args()
    global VERBOSE
    VERBOSE = args.verbose
    timeout_ms = args.timeout * 1000

    from playwright.sync_api import sync_playwright

    man = json.loads((ROOT / "data" / "manifest.json").read_text(encoding="utf-8"))
    subjects = list(man.get("subjects", {}).keys())
    if args.subject:
        if args.subject not in subjects:
            print(f"ไม่พบวิชา {args.subject} ใน manifest: {subjects}")
            return 1
        subjects = [args.subject]

    port = args.port or free_port()
    base = f"http://127.0.0.1:{port}/"
    srv = start_server(port)
    errors = []          # page error + console error ทั้งหมด (ข้อความ)
    t_all = time.perf_counter()
    home_ready = float("nan")
    results = []
    hits, ix_ready, ix_keys = 0, False, 0
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            ctx = browser.new_context(viewport={"width": 1280, "height": 900})
            # บล็อกฟอนต์ Google — ไม่งั้นเวลาโหลดเพี้ยนไป 13 วินาที (ตอบ CSS ว่างแทน abort เพื่อไม่ให้เกิด console error ปลอม)
            ctx.route(
                lambda url: any(h in url for h in BLOCKED_HOSTS),
                lambda route: route.fulfill(status=200, content_type="text/css", body=""),
            )
            # ให้ผู้อ่านจำลองเริ่มที่โหมดฉบับเต็ม (MODE อ่านจาก localStorage ตอนโหลด)
            ctx.add_init_script('try{localStorage.setItem("atlas-mode-v1","full")}catch(e){}')
            def fresh_page():
                pg = ctx.new_page()
                pg.set_default_timeout(timeout_ms)
                pg.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
                pg.on("console", lambda m: errors.append(f"console.error: {m.text}") if m.type == "error" else None)
                if not args.no_throttle:
                    ctx.new_cdp_session(pg).send("Emulation.setCPUThrottlingRate", {"rate": 6})
                return pg

            page = fresh_page()

            # 1) หน้าแรกใช้งานได้ = การ์ดวิชาปรากฏ (subjCard → button.subj ใน .subj-grid)
            t0 = time.perf_counter()
            page.goto(base, wait_until="domcontentloaded")
            page.wait_for_selector("#view .subj-grid .subj[data-go]", timeout=timeout_ms)
            home_ready = time.perf_counter() - t0
            cards = page.evaluate("document.querySelectorAll('#view .subj-grid .subj').length")
            print(f"home ready {home_ready:.2f}s · {cards} cards · throttle {'off' if args.no_throttle else 'x6'} · {base}")

            # 2) ทุกวิชาที่มีเนื้อหาเต็ม
            print(f"{'id':8} {'boxes':>5} {'sum(b/d/f)':>12} {'demo/cv':>8} {'fig/ok':>8} {'tfail':>5} {'err':>3} {'secs':>6}  status")
            for sid in subjects:
                # หน้าใหม่ทุกวิชา: DOM ของวิชาก่อนหน้า (ЭОЛА สูงราว 830 000 px) ทำให้หน้าหน่วง
                # จนคลิกแถบโหมดของวิชาถัดไปไม่ทัน — เหมือนผู้อ่านที่เปิดทีละวิชา
                if page.url != "about:blank":
                    page.close()
                    page = fresh_page()
                page.goto(base, wait_until="domcontentloaded")
                page.wait_for_selector("#view .subj-grid .subj[data-go]", timeout=timeout_ms)
                try:
                    r = check_subject(page, base, sid, errors, timeout_ms)
                except Exception as e:
                    errors.append(f"script: {sid}: {e}")
                    r = {"id": sid, "boxes": 0, "pending": -1, "tfail": 0, "demos": 0, "canvas": 0,
                         "figs": 0, "imgs_ok": 0, "imgs_nosrc": 0, "sum_boxes": None, "sum_tfail": None,
                         "errors": 1, "secs": 0.0, "ok": False}
                results.append(r)
                # คอลัมน์ sum = โหมดสรุป: กล่อง/แบบจำลอง/รูป (แบบจำลองกับรูปต้องติดตั้งครบเช่นกัน)
                s = r.get("sum")
                sb = "-" if not s else f"{s['boxes']}b/{s['demos']}d/{s['figs']}f"
                flag = "ok" if r["ok"] else "FAIL"
                extra = ""
                if s and (s["demos"] != s["canvas"] or s["figs"] != s["imgs_ok"] or s["pending"]):
                    extra += f" sum:cv={s['canvas']} ok={s['imgs_ok']} pending={s['pending']}"
                if r["pending"]:
                    extra += f" pending={r['pending']}"
                if r["imgs_nosrc"]:
                    extra += f" nosrc={r['imgs_nosrc']}"
                if r.get("fw_bad"):
                    extra += f" fw_bad={r['fw_bad']}"
                print(f"{r['id']:8} {r['boxes']:>5} {sb:>12} {r['demos']:>3}/{r['canvas']:<4} "
                      f"{r['figs']:>3}/{r['imgs_ok']:<4} {r['tfail']:>5} {r['errors']:>3} {r['secs']:>6.1f}  {flag}{extra}")

            # 3) ค้นหา
            hits, ix_ready, ix_keys = check_search(page, base, timeout_ms)
            print(f"search «{QUERY}» → {hits} hits · IXHAY {ix_keys} rows{'' if ix_ready else ' (ดัชนีมาไม่ทัน 5 s)'}")
            browser.close()
    finally:
        srv.shutdown()
        srv.server_close()

    for e in errors:
        print("  ! " + e[:300])

    # ---------- data/t ↔ DOM — ของหายต้องรู้ (กฎ «จำนวนต้องไม่ลดลง» ครึ่งแรก) ----------
    def expected_from_files(sid):
        full = summ = figs_full = figs_sum = 0
        for f in (ROOT / "data" / "t").glob(f"{sid}__*.json"):
            tid = f.stem.split("__", 1)[1]
            n_fig = f.read_text(encoding="utf-8").count("data-fig=")
            if re.fullmatch(r".+-s[1-4]", tid):
                summ += 1; figs_sum += n_fig
            else:
                full += 1; figs_full += n_fig
        return full, summ, figs_full, figs_sum

    xfail = []
    for r in results:
        ef, es, gf, gs = expected_from_files(r["id"])
        if ef + es == 0:
            xfail.append(f"{r['id']}: ไม่มีไฟล์ใน data/t เลย"); continue
        if r["boxes"] != ef:
            xfail.append(f"{r['id']}: กล่องฉบับเต็ม {r['boxes']} ≠ ไฟล์หัวข้อ {ef} (หัวข้อไม่ได้ลงทะเบียนใน DEEP หรือหายจากหน้า)")
        if r.get("sum_boxes") is not None and es and r["sum_boxes"] != es:
            xfail.append(f"{r['id']}: กล่องโหมดสรุป {r['sum_boxes']} ≠ ไฟล์ summary {es}")
        if r["figs"] != gf:
            xfail.append(f"{r['id']}: ช่องรูปฉบับเต็ม {r['figs']} ≠ data-fig ในไฟล์หัวข้อ {gf}")
        srm = r.get("sum")
        if srm and srm["figs"] != gs:
            xfail.append(f"{r['id']}: ช่องรูปโหมดสรุป {srm['figs']} ≠ data-fig ในไฟล์ summary {gs}")

    # ---------- baseline — จำนวนต้องไม่ลดลงระหว่าง commit (ครึ่งหลัง) ----------
    base, bfail = {}, []
    if BASELINE.exists():
        try:
            base = json.loads(BASELINE.read_text(encoding="utf-8"))
        except Exception as e:
            bfail.append(f"baseline: อ่าน {BASELINE.name} ไม่ได้: {e}")
    if not args.update_baseline:      # --update-baseline = ตั้งใจเปลี่ยนจำนวน จึงไม่เทียบ
        for r in results:
            b = base.get(r["id"]) or {}
            for k in ("boxes", "demos", "figs", "sum_boxes"):
                v, bv = r.get(k), b.get(k)
                if v is not None and bv is not None and v < bv:
                    bfail.append(f"{r['id']}: {k} ลดลงจาก baseline {bv} → {v} (ตั้งใจ? รันด้วย --update-baseline)")
    for m in xfail + bfail:
        print("  ✗ " + m)

    tot = lambda k: sum(r[k] for r in results)
    ok = (
        len(results) == len(subjects) and all(r["ok"] for r in results)
        and hits > 0 and len(errors) == 0 and not xfail and not bfail
    )
    print(f"SUMMARY subjects={len(results)} boxes={tot('boxes')} tfail={tot('tfail')} "
          f"demos={tot('demos')} canvas={tot('canvas')} figs={tot('figs')} imgs_ok={tot('imgs_ok')} "
          f"errors={len(errors)} search_hits={hits} home_ready_s={home_ready:.2f} {'PASS' if ok else 'FAIL'}")
    print(f"total {time.perf_counter() - t_all:.1f}s")
    bad_ids = {m.split(":", 1)[0] for m in xfail}
    if args.update_baseline:
        for r in results:
            if r["ok"] and r["id"] not in bad_ids:
                base[r["id"]] = {"boxes": r["boxes"], "demos": r["demos"],
                                 "figs": r["figs"], "sum_boxes": r.get("sum_boxes")}
        BASELINE.write_text(json.dumps(base, ensure_ascii=False, indent=1, sort_keys=True) + "\n", encoding="utf-8")
        print(f"baseline บันทึกแล้ว → src/{BASELINE.name} ({len(base)} วิชา)")
    elif not BASELINE.exists():
        print("หมายเหตุ: ยังไม่มี src/verify-baseline.json — รันครั้งแรกด้วย --update-baseline เพื่อเปิดเกราะ «จำนวนต้องไม่ลดลง»")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
