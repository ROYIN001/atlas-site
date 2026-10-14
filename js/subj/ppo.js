/* js/subj/ppo.js — แบบจำลองของวิชา ppo (STD2) · สร้างโดย _work/std2/tools/assemble.py จาก _work/ppostd2/demos/ — ห้ามแก้ไฟล์นี้ตรง ๆ แก้ที่ต้นฉบับแล้วประกอบใหม่ · โหลดโดย subjAssets() เมื่อเปิดวิชา · ห้ามแตะ document ที่ระดับบนสุด */
/* --- ppo5-code.js --- */
/* ppo5-code — ถอดรหัสสั่งซื้อ ПЛК150-X.X-X ทีละช่อง (4 ขั้น)
   ที่มา: Л5 сл. 22 (ตารางรหัสสั่งซื้อ) · ฉบับเดิม ppo-5 การ์ด 2.2 และตารางสเปกการ์ด 2.1 (сл. 21, 24)
   ค่าอ้างอิงจากฉบับเดิม: X1 220 = 220 В AC · 24 = 24 В DC (ช่วงไฟเลี้ยง ПЛК150-24: 18…29 В DC · ПЛК150-220: 90…264 В AC 47…63 Гц)
     X2 И = ЦАП «ток 4…20 мА» · У = ЦАП «напряжение 0…10 В» · А = ток 4…20 мА или напряжение 0…10 В
     X3 L = 360 байт · M = без ограничения · ตัวอย่างสไลด์ ПЛК150-24.И-L · ПЛК150-220.А-М · ПЛК150-220.У-L · เป้าหมาย CoDeSys ПЗ 1–4 = PLC150.U-L
   ของผู้เรียบเรียง (บอกบนจอ): เลือก ПЛК150-24.И-L เป็นรหัสที่ถอด · ภาพแถบหน่วยความจำ (ไม่ตามมาตราส่วน) */
(function () {
  "use strict";
  const clamp01 = x => Math.max(0, Math.min(1, x));

  const XS = [
    { th: "แรงดันไฟเลี้ยง", ru: "Напряжение питания", sel: 1, opts: [
      { k: "220", t: "220 В AC", s: "переменный ток · กระแสสลับ" },
      { k: "24", t: "24 В DC", s: "постоянный ток · กระแสตรง" }] },
    { th: "ชนิดเอาต์พุตแอนะล็อกในตัว (ЦАП)", ru: "Тип встроенных аналоговых выходных элементов", sel: 0, opts: [
      { k: "И", t: "กระแส 4…20 мА", s: "ЦАП «ток 4…20 мА»" },
      { k: "У", t: "แรงดัน 0…10 В", s: "ЦАП «напряжение 0…10 В»" },
      { k: "А", t: "กระแสหรือแรงดัน", s: "ток 4…20 мА или напряжение 0…10 В" }] },
    { th: "ขีดจำกัดพื้นที่ I/O", ru: "Размер лицензионного ограничения на область ввода-вывода", sel: 0, opts: [
      { k: "L", t: "จำกัด 360 байт", s: "лицензионное ограничение", mem: "L" },
      { k: "M", t: "ไม่จำกัด", s: "без ограничения", mem: "M" }] }
  ];
  const PARTS = ["ПЛК150-", "24", ".", "И", "-", "L"];

  const STEPS = [
    { title: "ถอดรหัสสั่งซื้อ <span lang=\"ru\">ПЛК150-24.И-L</span> ทีละช่อง",
      text: "รหัสมีสามช่อง X เรียงตามลำดับ คือไฟเลี้ยง · ชนิดเอาต์พุตแอนะล็อก · ขีดจำกัดพื้นที่ I/O อ่านทีละช่องก็รู้ว่าเครื่องเป็นรุ่นไหน",
      alt: "รหัสสั่งซื้อ ПЛК150-24.И-L ช่อง X ทั้งสามถูกไฮไลต์ด้วยสีต่างกัน ใต้รหัสมีแถวถอดความหมายสามแถว",
      nums: [
        { k: "<span lang=\"ru\">ПЛК150-24.И-L</span> อ่านได้ว่า", v: "กระแสตรง 24 В · เอาต์พุตกระแส 4…20 мА · จำกัด 360 байт", big: true },
        { k: "ตัวอย่างที่สไลด์ 22 ยกไว้", v: ["<span lang=\"ru\">ПЛК150-24.И-L</span>", "<span lang=\"ru\">ПЛК150-220.А-М</span>", "<span lang=\"ru\">ПЛК150-220.У-L</span>"] }
      ] },
    { title: "X ที่ 1 = แรงดันไฟเลี้ยง (<span lang=\"ru\">Напряжение питания</span>)",
      text: "ตัวเลขช่องแรกบอกชนิดของไฟเลี้ยง — <b>220</b> คือกระแสสลับ 220 В (переменного тока) ส่วน <b>24</b> คือกระแสตรง 24 В (постоянного тока) · รหัสตัวอย่างเป็น 24 จึงใช้ไฟเลี้ยงกระแสตรง",
      alt: "ช่อง X ที่ 1 ซึ่งเป็น 24 ถูกไฮไลต์ ด้านล่างมีสองการ์ดคือ 220 เท่ากับ 220 โวลต์กระแสสลับ และ 24 เท่ากับ 24 โวลต์กระแสตรง โดยการ์ด 24 ถูกเลือก",
      nums: [
        { k: "<span lang=\"ru\">ПЛК150-24</span> รับไฟเลี้ยงได้", v: "18…29 В DC (ค่าปกติ 24 В)", note: "ตารางสเปกในการ์ด 2.1" },
        { k: "<span lang=\"ru\">ПЛК150-220</span> รับไฟเลี้ยงได้", v: "90…264 В AC · 47…63 Гц (ค่าปกติ 220 В)" }
      ] },
    { title: "X ที่ 2 = ชนิดเอาต์พุตแอนะล็อก (<span lang=\"ru\">ЦАП</span>)",
      text: "ตัวแปลงดิจิทัลเป็นแอนะล็อก (ЦАП) ในตัวเครื่องมีสามแบบ — <b>И</b> ให้กระแส 4…20 мА · <b>У</b> ให้แรงดัน 0…10 В · <b>А</b> ให้ได้ทั้งกระแส 4…20 мА หรือแรงดัน 0…10 В · รหัสตัวอย่างเป็น И",
      alt: "ช่อง X ที่ 2 ซึ่งเป็น И ถูกไฮไลต์ ด้านล่างมีสามการ์ด И У А โดยการ์ด И ถูกเลือก",
      nums: [
        { k: "И · У · А", v: "กระแส 4…20 мА · แรงดัน 0…10 В · กระแสหรือแรงดัน" },
        { k: "ใช้กับขาเอาต์พุตแอนะล็อกของ ПЛК150", v: "AO 1, AO 2 + AO 0", note: "การ์ด 2.1" }
      ] },
    { title: "X ที่ 3 = ขีดจำกัดพื้นที่ I/O",
      text: "ช่องสุดท้ายบอกขนาดพื้นที่ I/O ตามสิทธิ์การใช้งาน (<span lang=\"ru\">лицензионное ограничение</span>) — <b>L</b> จำกัดที่ 360 байт · <b>M</b> ไม่จำกัด · รหัสตัวอย่างเป็น L",
      alt: "ช่อง X ที่ 3 ซึ่งเป็น L ถูกไฮไลต์ ด้านล่างมีสองการ์ด L จำกัด 360 ไบต์ และ M ไม่จำกัด โดยการ์ด L ถูกเลือก",
      nums: [
        { k: "เป้าหมายใน CoDeSys ของ ПЗ 1–4", v: "PLC150.U-L", big: true, note: "รุ่นเอาต์พุตแรงดัน (У) จำกัด 360 байт (L)" }
      ] }
  ];

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function T(ctx, C, txt, x, y, col, o) {
    o = o || {};
    let sz = o.size || 12;
    const mk = s => { ctx.font = (o.wt || 600) + " " + s + "px " + (o.mono ? C.mono : C.font); };
    mk(sz);
    if (o.maxW) while (sz > (o.min || 8.5) && ctx.measureText(txt).width > o.maxW) { sz -= 0.5; mk(sz); }
    ctx.fillStyle = col; ctx.textAlign = o.align || "left"; ctx.textBaseline = o.base || "middle";
    ctx.fillText(txt, x, y);
    return ctx.measureText(txt).width;
  }
  function tint(ctx, color, a) { ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = color; ctx.fill(); ctx.restore(); }

  Object.assign(DEMOS, {
    "ppo5-code": function (host) {
      return window.STEPS2(host, {
        label: "แอนิเมชันทีละขั้น",
        title: "ถอดรหัสสั่งซื้อ <span lang=\"ru\">ПЛК150-X.X-X</span> <span style=\"white-space:nowrap\">(сл. 22)</span>",
        aria: "แอนิเมชันถอดรหัสสั่งซื้อ ПЛК150 ทีละช่อง X",
        legend: [
          { cls: "lg-ref", text: "X ที่ 1 ไฟเลี้ยง" },
          { cls: "lg-lin", text: "X ที่ 2 เอาต์พุตแอนะล็อก" },
          { cls: "lg-meas", text: "X ที่ 3 พื้นที่ I/O" }
        ],
        steps: STEPS,
        caption: "ตารางรหัสสั่งซื้อ Л5 · сл. 22 · ช่วงไฟเลี้ยงจากสเปก ПЛК150 (сл. 21, 24) · รหัส <span lang=\"ru\">ПЛК150-24.И-L</span> เป็นตัวอย่างที่ผู้เรียบเรียงเลือกถอด และภาพแถบหน่วยความจำเป็นภาพประกอบของผู้เรียบเรียง ไม่ตามมาตราส่วน",
        height: w => w < 520 ? 318 : 300,
        duration: () => 600,
        draw(ctx, W, H, step, C, anim) {
          const narrow = W < 520;
          const colr = [C.ref, C.lin, C.meas];
          const fs = narrow ? 25 : Math.min(40, Math.round(W * 0.044));
          ctx.font = "700 " + fs + "px " + C.mono;
          const ws = PARTS.map(p => ctx.measureText(p).width);
          const tot = ws.reduce((a, b) => a + b, 0);
          let x = Math.round((W - tot) / 2);
          const cy = narrow ? 50 : 56;
          const emAt = (i, s) => s === 0 ? 1 : (s === i + 1 ? 1 : 0.3);
          const em = i => anim.p < 1 ? emAt(i, anim.from) + (emAt(i, step) - emAt(i, anim.from)) * anim.e : emAt(i, step);

          /* ---- แถบรหัส ---- */
          PARTS.forEach((p, j) => {
            const isX = j === 1 || j === 3 || j === 5, i = (j - 1) / 2;
            if (isX) {
              const e = em(i), bw = ws[j] + 12, bh = fs * 1.5;
              rr(ctx, x - 6, cy - bh / 2, bw, bh, 6);
              tint(ctx, colr[i], 0.18 * e);
              ctx.lineWidth = 1.2 + 1.4 * e; ctx.strokeStyle = colr[i];
              ctx.save(); ctx.globalAlpha *= 0.35 + 0.65 * e; ctx.stroke(); ctx.restore();
              ctx.save(); ctx.globalAlpha *= 0.4 + 0.6 * e;
              T(ctx, C, p, x + ws[j] / 2, cy, C.ink, { size: fs, wt: 700, mono: true, align: "center" });
              T(ctx, C, "X" + (i + 1), x + ws[j] / 2, cy - bh / 2 - 9, colr[i], { size: 11.5, wt: 700, align: "center" });
              ctx.restore();
            } else {
              ctx.save(); ctx.globalAlpha *= step === 0 ? 1 : 0.7;
              T(ctx, C, p, x, cy, C.ink2, { size: fs, wt: 700, mono: true });
              ctx.restore();
            }
            x += ws[j];
          });

          const py = cy + fs * 0.75 + 18;
          const x0 = narrow ? 10 : Math.max(12, Math.round((W - 820) / 2));
          const pw = W - 2 * x0, f = narrow ? 1 : 1.16;

          /* ---- แถวถอดความหมายรวม (ขั้น ①) ---- */
          function rowsPanel(al) {
            ctx.save(); ctx.globalAlpha *= al;
            const gap = 8, rh = Math.min(narrow ? 64 : 74, (H - py - 10 - 2 * gap) / 3);
            XS.forEach((X, i) => {
              const y = py + i * (rh + gap), o = X.opts[X.sel];
              rr(ctx, x0, y, pw, rh, 8); tint(ctx, colr[i], 0.1);
              ctx.lineWidth = 1.6; ctx.strokeStyle = colr[i]; ctx.stroke();
              T(ctx, C, "X" + (i + 1), x0 + 24, y + rh / 2, colr[i], { size: 15 * f, wt: 700, align: "center" });
              T(ctx, C, X.th, x0 + 48, y + rh * 0.32, C.ink, { size: 12 * f, wt: 600, maxW: pw - 58 });
              T(ctx, C, o.k + " = " + o.t, x0 + 48, y + rh * 0.7, colr[i], { size: 13.5 * f, wt: 700, maxW: pw - 58 });
            });
            ctx.restore();
          }

          /* ---- การ์ดตัวเลือกของช่อง X ที่ i (ขั้น ②–④) ---- */
          function optPanel(i, al) {
            ctx.save(); ctx.globalAlpha *= al;
            const X = XS[i], n = X.opts.length, col = colr[i];
            T(ctx, C, "X ที่ " + (i + 1) + " · " + X.th, x0 + 2, py + 6, col, { size: 13 * f, wt: 700, maxW: pw - 4 });
            T(ctx, C, X.ru, x0 + 2, py + 24, C.ink3, { size: 10.5 * f, wt: 500, maxW: pw - 4, min: 8 });
            const top = py + 40, avail = H - top - 10, gap = 8;
            let cw, ch, cols;
            if (narrow) { cols = 1; cw = pw; ch = Math.min(58, (avail - gap * (n - 1)) / n); }
            else { cols = n; cw = Math.min(290, (pw - gap * (n - 1)) / n); ch = Math.min(120, avail); }
            const gx = narrow ? x0 : x0 + (pw - (cw * cols + gap * (cols - 1))) / 2;
            X.opts.forEach((o, j) => {
              const sel = j === X.sel;
              const cx = gx + (narrow ? 0 : j * (cw + gap)), cyy = top + (narrow ? j * (ch + gap) : 0);
              ctx.save(); ctx.globalAlpha *= sel ? 1 : 0.8;
              rr(ctx, cx, cyy, cw, ch, 8);
              if (sel) { tint(ctx, col, 0.16); ctx.lineWidth = 2.4; ctx.strokeStyle = col; }
              else { ctx.fillStyle = C.bg; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = C.line2; }
              ctx.stroke();
              const kw = o.k.length > 2 ? 50 : 40;
              T(ctx, C, o.k, cx + kw / 2 + 4, cyy + ch / 2, sel ? col : C.ink2, { size: (o.k.length > 2 ? 19 : 23) * f, wt: 700, mono: true, align: "center", maxW: kw });
              const barW = o.mem ? (narrow ? 96 : 84) : 0;
              const tx = cx + kw + 12, tw = cw - kw - 22 - barW - (sel ? 16 : 0);
              T(ctx, C, o.t, tx, cyy + ch * 0.36, C.ink, { size: 12.5 * f, wt: 600, maxW: tw });
              T(ctx, C, o.s, tx, cyy + ch * 0.7, C.ink3, { size: 10.5 * f, wt: 500, maxW: tw, min: 8 });
              if (sel) T(ctx, C, "✓", cx + cw - 14, cyy + ch / 2, col, { size: 17, wt: 700, align: "center" });
              if (o.mem) {                                   // แถบหน่วยความจำ (ภาพประกอบ)
                const bx1 = cx + cw - (sel ? 22 : 10) - barW, bx2 = bx1 + barW - 12, by = cyy + ch / 2 - 2, bh = 12;
                ctx.lineWidth = 1.4; ctx.strokeStyle = col;
                if (o.mem === "L") {
                  ctx.fillStyle = C.wash; ctx.fillRect(bx1, by - bh / 2, bx2 - bx1, bh);
                  ctx.strokeRect(bx1, by - bh / 2, bx2 - bx1, bh);
                  ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx2, by - bh / 2 - 5); ctx.lineTo(bx2, by + bh / 2 + 5); ctx.stroke();
                  T(ctx, C, "360 байт", (bx1 + bx2) / 2, by + bh / 2 + 11, col, { size: 10, wt: 600, align: "center" });
                } else {
                  ctx.fillStyle = C.wash; ctx.fillRect(bx1, by - bh / 2, (bx2 - bx1) * 0.6, bh);
                  ctx.strokeRect(bx1, by - bh / 2, (bx2 - bx1) * 0.6, bh);
                  ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(bx1 + (bx2 - bx1) * 0.6, by); ctx.lineTo(bx2 - 4, by); ctx.stroke(); ctx.setLineDash([]);
                  window.STEPS2.pen(ctx, W, H, C).arrow(bx2 - 8, by, bx2 + 6, by, col, 1.6, 7);
                  T(ctx, C, "ไม่จำกัด", (bx1 + bx2) / 2, by + bh / 2 + 11, col, { size: 10, wt: 600, align: "center" });
                }
              }
              ctx.restore();
            });
            ctx.restore();
          }

          function panel(s, al) { if (al <= 0.01) return; if (s === 0) rowsPanel(al); else optPanel(s - 1, al); }
          if (anim.p < 1 && anim.from !== step) { panel(anim.from, 1 - anim.e); panel(step, anim.e); }
          else panel(step, 1);
        }
      });
    }
  });
})();
/* --- ppo5-lang.js --- */
/* ppo5-lang — ตรรกะเดียว «Пуск/Стоп ค้างสถานะ» ใน 5 ภาษาของ МЭК 61131-3 (6 ขั้น)
   ที่มา: Л5 текст (ภาษา IL ST LD FBD) · คู่มือ «Программирование ПЛК на языках МЭК» ЛР 1–5 (SFC = ЛР 5, ไม่มีในบรรยายที่ 5) · ฉบับเดิม ppo-5 h3 «ห้าภาษา»
   ข้อความจากฉบับเดิมที่ใช้: LD = контакты и обмотки реле, ขนาน = ИЛИ, อนุกรม = И, |/| = หน้าสัมผัสกลับสถานะ · FBD ลำดับ «слева направо, сверху вниз»
     บล็อกเริ่มคำนวณเมื่อรู้ค่าอินพุตครบ · IL = аккумулятор, ตัวขยาย N (กลับค่า) · ST = Pascal, := และ ; · SFC = шаги и переходы, ขั้นเริ่มต้นกรอบคู่,
     ข้ามขั้นเมื่อขั้นก่อนหน้าทำงานและเงื่อนไขเป็น TRUE
   ของผู้เรียบเรียง (บอกบนจอ): ตัวอย่าง Пуск/Стоп ค้างสถานะ (ฉบับเดิมไม่มีตัวอย่างนี้) · ชื่อตัวแปร Start Stop Motor · ค่าตัวอย่าง Start = 1, Stop = 0 → Motor = 1
     ค่าเดิมของ Motor ที่อ่านคือ 1 (ผลเท่ากันแม้ค่าเดิมเป็น 0 เพราะ Start = 1) · รายการ IL สี่บรรทัด LD Start / OR Motor / ANDN Stop / ST Motor
     สมการ Motor := (Start OR Motor) AND NOT Stop · ผัง SFC สองขั้น Ожидание → Работа */
(function () {
  "use strict";
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const RU = t => '<span lang="ru">' + t + "</span>";
  const LANGS = [
    { name: "LD · Ladder Diagram (РКС)", kind: "g" },
    { name: "FBD · Function Block Diagram", kind: "g" },
    { name: "IL · Instruction List", kind: "t" },
    { name: "ST · Structured Text", kind: "t" },
    { name: "SFC · Sequential Function Chart", kind: "g" }
  ];
  const EXP = "Start = 1, Stop = 0 → Motor = 1";

  const STEPS = [
    { title: "LD: ขั้นบันไดรีเลย์ — Start ขนานกับ Motor แล้วอนุกรมกับ /Stop",
      text: "หน้าสัมผัสต่อ<b>ขนาน = ИЛИ</b> ต่อ<b>อนุกรม = И</b> · Start (" + RU("Пуск") + ") ขนานกับหน้าสัมผัส Motor ที่ค้างสถานะ แล้วอนุกรมกับหน้าสัมผัสกลับสถานะ Stop (|/|) ซึ่งนำไฟเมื่อ Stop = 0 ไปถึงขดลวด Motor",
      alt: "ผังขั้นบันไดระหว่างรางไฟซ้ายขวา หน้าสัมผัส Start กับ Motor ต่อขนานกัน ตามด้วยหน้าสัมผัสกลับสถานะ Stop แล้วขดลวด Motor เส้นทั้งหมดมีไฟ",
      nums: [
        { k: "สัญญาณตัวอย่างของผู้เรียบเรียง", v: EXP, big: true },
        { k: "ปล่อยปุ่ม Start (Start = 0)", v: "Motor ยังติดอยู่", note: "หน้าสัมผัส Motor ที่ขนานกันนำไฟแทน (" + "самоподхват" + ")" }
      ] },
    { title: "FBD: บล็อก OR ตามด้วย AND ที่มีอินพุตกลับค่า",
      text: "บล็อกสี่เหลี่ยม อินพุตอยู่ซ้าย เอาต์พุตอยู่ขวา · ค่าเดิมของ Motor กับ Start เข้าบล็อก OR ผลเข้าบล็อก AND พร้อม Stop ที่กลับค่า (วงกลมเล็ก) แล้วออกเป็น Motor ซึ่งวนกลับเข้า OR · บล็อกเริ่มคำนวณเมื่อรู้ค่าอินพุตครบทุกตัว (" + RU("слева направо, сверху вниз") + ")",
      alt: "บล็อก OR รับ Motor และ Start ส่งผลไป AND ซึ่งมีอินพุต Stop แบบกลับค่า ผลออกเป็น Motor และมีเส้นวนกลับไปอินพุตของ OR เส้นที่มีค่า 1 ถูกไฮไลต์",
      nums: [
        { k: "ค่าที่ไหลผ่านบล็อก", v: "OR: 1 OR 1 = 1 · AND: 1 AND NOT 0 = 1", big: true },
        { k: "วงกลมเล็กที่อินพุต Stop", v: "NOT — กลับ 0 เป็น 1", note: "เส้น Stop เป็น 0 จึงไม่ถูกไฮไลต์" }
      ] },
    { title: "IL: รายการคำสั่งสี่บรรทัดผ่านตัวสะสมผล",
      text: "ทุกคำสั่งทำงานกับ<b>ตัวสะสมผล</b> (аккумулятор) ตัวเดียว — LD โหลดค่าเข้าไป · OR และ ANDN กระทำกับค่าที่อยู่ในนั้น (ANDN = AND กับค่ากลับของตัวถูกดำเนินการ ตัวขยาย N) · ST เขียนค่าที่อยู่ในนั้นออกไปยังตัวแปร",
      alt: "ตารางสี่แถว LD Start, OR Motor, ANDN Stop, ST Motor แต่ละแถวมีกล่องค่าตัวสะสมผลที่เป็น 1 และแถวสุดท้ายเขียน Motor เท่ากับ 1",
      nums: [
        { k: "ค่าในตัวสะสมผลหลังแต่ละบรรทัด", v: "1 → 1 → 1 → Motor := 1", big: true },
        { k: "บรรทัด ANDN Stop", v: "ACC = 1 AND NOT 0 = 1", note: "ผู้เรียบเรียงเขียนรายการนี้เป็นตัวอย่าง" }
      ] },
    { title: "ST: นิพจน์บรรทัดเดียวคล้าย Pascal",
      text: "กำหนดค่าด้วย <b>:=</b> และปิดคำสั่งด้วย <b>;</b> · แทนค่า Start = 1, Motor = 1, Stop = 0 ลงในนิพจน์ แล้วคำนวณจากวงเล็บชั้นในสุดออกมาทีละชั้น",
      alt: "บรรทัดคำสั่ง Motor := (Start OR Motor) AND NOT Stop; แล้วตามด้วยสามบรรทัดแสดงการแทนค่าและการคำนวณจนได้ Motor := 1",
      nums: [
        { k: "แทนค่า → คำนวณ", v: "(1 OR 1) AND NOT 0 → 1 AND 1 → 1", big: true },
        { k: "ผลลัพธ์", v: "Motor := 1" }
      ] },
    { title: "SFC: ขั้นกับเงื่อนไขข้ามขั้น",
      text: "ขั้น (" + RU("шаг") + ") เรียงตามเวลา เชื่อมกันด้วยเงื่อนไขข้ามขั้น (" + RU("переход") + ") · ขั้นเริ่มต้นมีกรอบคู่ · เงื่อนไขทำงานเมื่อ<b>ขั้นก่อนหน้าทำงานอยู่ และเงื่อนไขเป็น TRUE</b> — Start AND NOT Stop = TRUE จึงข้ามจากขั้น Ожидание (รอ) ไปขั้น Работа (ทำงาน) ซึ่งสั่ง Motor := TRUE · จุดสีเขียวหน้ากล่อง = ขั้นที่ทำงานอยู่",
      alt: "ผังสองขั้น Ожидание กรอบคู่ และ Работа มีเงื่อนไขข้ามขั้นลง Start AND NOT Stop เป็นจริง จุดสัญลักษณ์ขั้นที่ทำงานอยู่ย้ายไปที่ Работа และเงื่อนไข Stop พากลับขึ้นไปที่ Ожидание",
      nums: [
        { k: "เงื่อนไขข้ามขั้นลง", v: "Start AND NOT Stop = 1 AND 1 = TRUE", big: true },
        { k: "ขั้นที่ทำงานอยู่", v: "Работа → Motor := TRUE", note: "SFC ไม่มีในบรรยายที่ 5 (มีในคู่มือ ЛР 5)" }
      ] },
    { title: "สรุป: ห้าภาษา — กราฟิก 3 · ข้อความ 2",
      text: "ตรรกะเดียวกันได้ผลเท่ากันทุกภาษา (" + EXP + ") · <b>กราฟิก</b> (" + RU("графические") + ") คือ LD, FBD, SFC · <b>ข้อความ</b> (" + RU("текстовые") + ") คือ IL, ST",
      alt: "การ์ดห้าใบ สามใบเป็นภาษากราฟิกคือ LD FBD SFC สองใบเป็นภาษาข้อความคือ IL ST ทุกใบได้ผลเป็น Motor เท่ากับ 1",
      nums: [
        { k: "กราฟิก", v: "LD · FBD · SFC" },
        { k: "ข้อความ", v: "IL · ST" },
        { k: "จำง่าย ๆ", v: "LD ตู้รีเลย์ · FBD วงจรบล็อก · SFC ลำดับขั้น · IL แอสเซมเบลอร์ · ST Pascal" }
      ] }
  ];

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function tint(ctx, color, a) { ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = color; ctx.fill(); ctx.restore(); }
  function T(ctx, C, txt, x, y, col, o) {
    o = o || {};
    let sz = o.size || 12;
    const mk = s => { ctx.font = (o.wt || 600) + " " + s + "px " + (o.mono ? C.mono : C.font); };
    mk(sz);
    if (o.maxW) while (sz > (o.min || 8.5) && ctx.measureText(txt).width > o.maxW) { sz -= 0.5; mk(sz); }
    ctx.fillStyle = col; ctx.textAlign = o.align || "left"; ctx.textBaseline = o.base || "middle";
    ctx.fillText(txt, x, y);
    return ctx.measureText(txt).width;
  }
  /* ชื่อ = ค่า (ค่า 1 สีมีไฟ · 0 สีเทา) จัดกึ่งกลางที่ x */
  function nv(E, name, val, cx, y, size) {
    const { ctx, C } = E, sz = size || 12;
    ctx.font = "700 " + sz + "px " + C.font; const w1 = ctx.measureText(name + " ").width;
    ctx.font = "700 " + sz + "px " + C.mono; const w2 = ctx.measureText("= " + val).width;
    let x = cx - (w1 + w2) / 2;
    x = Math.max(4, Math.min(E.W - 4 - w1 - w2, x));
    T(ctx, C, name + " ", x, y, C.ink, { size: sz, wt: 700 });
    T(ctx, C, "= " + val, x + w1, y, val ? C.ok : C.ink3, { size: sz, wt: 700, mono: true });
  }
  function contact(E, x, y, nc, col, w) {
    const P = E.P;
    P.seg([[x - 7, y - 12], [x - 7, y + 12]], col, w);
    P.seg([[x + 7, y - 12], [x + 7, y + 12]], col, w);
    if (nc) P.seg([[x - 10, y + 11], [x + 10, y - 11]], col, w);
  }
  function coil(E, x, y, col, w, on) {
    const ctx = E.ctx;
    if (on) { ctx.beginPath(); ctx.arc(x, y, 8, 0, 2 * Math.PI); tint(ctx, E.C.ok, 0.3); }
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(x + 5, y, 14, Math.PI * 0.72, Math.PI * 1.28); ctx.stroke();
    ctx.beginPath(); ctx.arc(x - 5, y, 14, -Math.PI * 0.28, Math.PI * 0.28); ctx.stroke();
    ctx.restore();
  }

  /* ---------------- LD ---------------- */
  function drawLD(E, prog, y0, y1) {
    const { ctx, W, C, P, narrow } = E;
    const lw = Math.min(W - 24, 680), L = (W - lw) / 2 + 6, R = L + lw - 12, S = R - L;
    const ym = y0 + (y1 - y0) * 0.33, yb = ym + 68;
    const xJ1 = L + 0.07 * S, xJ2 = L + 0.34 * S, cG = (xJ1 + xJ2) / 2, cS = L + 0.53 * S, cC = L + 0.81 * S;
    const segs = [[[L, ym], [xJ1, ym]], [[xJ1, ym], [xJ1, yb]], [[xJ1, ym], [cG - 7, ym]], [[cG + 7, ym], [xJ2, ym]],
      [[xJ1, yb], [cG - 7, yb]], [[cG + 7, yb], [xJ2, yb]], [[xJ2, ym], [xJ2, yb]], [[xJ2, ym], [cS - 7, ym]],
      [[cS + 7, ym], [cC - 14, ym]], [[cC + 14, ym], [R, ym]]];
    const pass = (wire, sym, on, w) => {
      segs.forEach(s => P.seg(s, wire, w));
      contact(E, cG, ym, false, sym, w); contact(E, cG, yb, false, sym, w); contact(E, cS, ym, true, sym, w);
      coil(E, cC, ym, sym, w, on);
    };
    const sweepX = L - 6 + (S + 30) * prog;
    ctx.save(); ctx.beginPath(); ctx.rect(sweepX, 0, W, E.H); ctx.clip(); pass(C.ink3, C.ink3, false, 2); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, sweepX, E.H); ctx.clip(); pass(C.ok, C.ok, prog > 0.9, 3.2); ctx.restore();
    P.seg([[L, ym - 30], [L, yb + 30]], C.ink2, 3.4);
    P.seg([[R, ym - 30], [R, yb + 30]], C.ink2, 3.4);
    const ly = ym - 27;
    nv(E, "Start", 1, cG, ly, narrow ? 11.5 : 12.5);
    nv(E, "Stop", 0, cS, ly, narrow ? 11.5 : 12.5);
    nv(E, "Motor", 1, cC, ly, narrow ? 11.5 : 12.5);
    nv(E, "Motor", 1, cG, yb - 27, narrow ? 11.5 : 12.5);
    T(ctx, C, "|/| นำไฟเมื่อ Stop = 0", cS, ym + 27, C.ink3, { size: narrow ? 9.5 : 10.5, wt: 500, align: "center", maxW: S * 0.3, min: 8 });
    T(ctx, C, "ขดลวด (" + "обмотка" + ")", cC, ym + 27, C.ink3, { size: narrow ? 9.5 : 10.5, wt: 500, align: "center", maxW: S * 0.26, min: 8 });
    T(ctx, C, "ขนาน = ИЛИ (Motor ค้างสถานะ) · อนุกรม = И", (L + R) / 2, yb + 30, C.ink3, { size: narrow ? 10 : 11, wt: 500, align: "center", maxW: S, min: 8 });
  }

  /* ---------------- FBD ---------------- */
  function drawFBD(E, prog, y0, y1) {
    const { ctx, W, C, P, narrow } = E;
    const lw = Math.min(W - 24, 620), ox = (W - lw) / 2, k = lw / 390;
    const X = u => ox + u * k, sz = Math.min(1.25, k);
    const h = (y1 - y0), top = y0 + h * 0.5 - 62 + 40;       // y0 ของบล็อก
    const by = top, yfb = by - 26, ys = by + 82;
    const pin = { i1: by + 14, i2: by + 42, o: by + 28 };
    const bw = 50 * sz, bh = 56;
    const orx = X(86), andx = X(198);
    const wires = [
      { p: [[X(52), pin.i2], [orx, pin.i2]], v: 1 },                                                         // Start
      { p: [[X(272), pin.o], [X(272), yfb], [X(42), yfb], [X(42), pin.i1], [orx, pin.i1]], v: 1 },        // Motor วนกลับ
      { p: [[orx + bw, pin.o], [X(167), pin.o], [X(167), pin.i1], [andx, pin.i1]], v: 1 },                   // ผล OR
      { p: [[X(50), ys], [X(178), ys], [X(178), pin.i2], [andx - 8, pin.i2]], v: 0 },                        // Stop
      { p: [[andx + bw, pin.o], [X(294), pin.o]], v: 1 }                                                      // ผล AND → Motor
    ];
    const sweepX = ox - 4 + (lw + 8) * prog;
    ctx.save(); ctx.beginPath(); ctx.rect(sweepX, 0, W, E.H); ctx.clip();
    wires.forEach(w => P.seg(w.p, C.ink3, 2)); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, sweepX, E.H); ctx.clip();
    wires.forEach(w => P.seg(w.p, w.v ? C.ok : C.ink3, w.v ? 3.2 : 2));
    P.dot(X(272), pin.o, 3.6, C.ok);
    ctx.restore();
    /* บล็อก */
    const blk = (x, name, sub) => {
      rr(ctx, x, by, bw, bh, 6); ctx.fillStyle = C.bg; ctx.fill(); tint(ctx, C.ok, prog > 0.6 ? 0.14 : 0);
      ctx.lineWidth = 2.2; ctx.strokeStyle = prog > 0.6 ? C.ok : C.ink2; ctx.stroke();
      T(ctx, C, name, x + bw / 2, by + 24, C.ink, { size: 13.5, wt: 700, align: "center", mono: true });
      T(ctx, C, sub, x + bw / 2, by + 41, C.ink3, { size: 10.5, wt: 600, align: "center", mono: true });
    };
    blk(orx, "OR", ">=1"); blk(andx, "AND", "&");
    ctx.beginPath(); ctx.arc(andx - 4, pin.i2, 4, 0, 2 * Math.PI); ctx.fillStyle = C.bg; ctx.fill();
    ctx.lineWidth = 1.8; ctx.strokeStyle = C.ink; ctx.stroke();
    /* ตัวแปรขาเข้า/ออก */
    const fsz = narrow ? 11.5 : 12.5;
    T(ctx, C, "Start", X(8), pin.i2, C.ink, { size: fsz, wt: 700 });
    T(ctx, C, "Stop", X(8), ys, C.ink, { size: fsz, wt: 700 });
    const ob = { x: X(294), w: 72 * sz, h: 28 };
    rr(ctx, ob.x, pin.o - ob.h / 2, ob.w, ob.h, 6); ctx.fillStyle = C.bg; ctx.fill(); tint(ctx, C.ok, prog > 0.8 ? 0.18 : 0);
    ctx.lineWidth = 2; ctx.strokeStyle = prog > 0.8 ? C.ok : C.ink2; ctx.stroke();
    T(ctx, C, "Motor", ob.x + ob.w / 2, pin.o, C.ink, { size: fsz, wt: 700, align: "center" });
    nv(E, "Motor (ค่าเดิมที่วนกลับ)", 1, (X(42) + X(272)) / 2, yfb - 9, narrow ? 10.5 : 11.5);
    /* ค่าบนเส้น */
    const tag = (txt, x, y, v) => E.P.label(txt, x, y, v ? C.ok : C.ink3, { size: 10.5, weight: 700, mono: true, align: "center", halo: 3 });
    tag("1", X(70), pin.i2 - 9, 1); tag("0", X(114), ys - 9, 0); tag("1", X(151), pin.o - 9, 1); tag("1", X(260), pin.o - 9, 1);
    T(ctx, C, "○ = กลับค่า (NOT) · Stop 0 → 1", X(198) + bw / 2, ys + 22, C.ink3, { size: narrow ? 10 : 11, wt: 500, align: "center", maxW: lw * 0.6, min: 8 });
  }

  /* ---------------- IL ---------------- */
  function drawIL(E, prog, y0, y1) {
    const { ctx, W, C, P, narrow } = E;
    const lw = Math.min(W - 20, 620), L = (W - lw) / 2, R = L + lw;
    const rows = [
      { op: "LD", arg: "Start", m: "โหลดค่า Start เข้าตัวสะสมผล", acc: "ACC = 1" },
      { op: "OR", arg: "Motor", m: "OR กับ Motor → 1 OR 1", acc: "ACC = 1" },
      { op: "ANDN", arg: "Stop", m: "AND กับค่ากลับของ Stop → 1 AND NOT 0", acc: "ACC = 1" },
      { op: "ST", arg: "Motor", m: "เขียนค่าในตัวสะสมผลลงตัวแปร Motor", acc: "Motor := 1" }
    ];
    const rh = Math.min(58, (y1 - y0 - 4) / 4), act = prog >= 1 ? 99 : Math.min(3, Math.floor(prog * 4));
    const fs = narrow ? 15 : 17;
    ctx.font = "700 " + fs + "px " + C.mono; const opW = ctx.measureText("ANDN ").width;
    const bw = narrow ? 88 : 108, bh = 28;
    rows.forEach((r, i) => {
      const y = y0 + 2 + i * rh;
      if (i === act) { rr(ctx, L, y, lw, rh - 4, 8); tint(ctx, C.wash, 1); ctx.lineWidth = 1.4; ctx.strokeStyle = C.lin; ctx.stroke(); }
      T(ctx, C, String(i + 1), L + 10, y + (rh - 4) * 0.34, C.ink3, { size: 10, wt: 600, mono: true, align: "center" });
      T(ctx, C, r.op, L + 22, y + (rh - 4) * 0.34, C.lin, { size: fs, wt: 700, mono: true });
      T(ctx, C, r.arg, L + 22 + opW, y + (rh - 4) * 0.34, C.ink, { size: fs, wt: 700, mono: true });
      T(ctx, C, r.m, L + 22, y + (rh - 4) * 0.74, C.ink2, { size: narrow ? 10.5 : 11.5, wt: 500, maxW: lw - bw - 40, min: 8.5 });
      const seen = i <= act, a = seen ? (i === act && prog < 1 ? clamp01((prog * 4 - i) * 1.6) : 1) : 0;
      const bx = R - bw - 6, by = y + (rh - 4) / 2 - bh / 2;
      ctx.save(); ctx.globalAlpha *= 0.28 + 0.72 * a;
      rr(ctx, bx, by, bw, bh, 6); ctx.fillStyle = C.bg; ctx.fill(); tint(ctx, C.ok, 0.16 * a);
      ctx.lineWidth = 1.6; ctx.strokeStyle = a > 0.2 ? C.ok : C.line2; ctx.setLineDash(a > 0.2 ? [] : [3, 3]); ctx.stroke(); ctx.setLineDash([]);
      const parts = r.acc.split(" ");
      T(ctx, C, a > 0.2 ? r.acc : "ACC = ?", bx + bw / 2, by + bh / 2, a > 0.2 ? C.ok : C.ink3, { size: narrow ? 12 : 13, wt: 700, mono: true, align: "center", maxW: bw - 10, min: 8.5 });
      void parts;
      ctx.restore();
      if (i < 3) P.arrow(bx + bw / 2, by + bh + 1, bx + bw / 2, by + rh - 1, a > 0.2 ? C.ok : C.line2, 1.6, 6);
    });
  }

  /* ---------------- ST ---------------- */
  function drawST(E, prog, y0, y1) {
    const { ctx, W, C, narrow } = E;
    const fs = narrow ? 13.5 : 18;
    const tokens = [["Motor", C.ink], [" := ", C.new], ["(", C.ink], ["Start", C.ink], [" OR ", C.lin], ["Motor", C.ink], [")", C.ink], [" AND NOT ", C.lin], ["Stop", C.ink], [";", C.new]];
    ctx.font = "700 " + fs + "px " + C.mono;
    const ws = tokens.map(t => ctx.measureText(t[0]).width), tot = ws.reduce((a, b) => a + b, 0);
    let x = Math.max(8, (W - tot) / 2); const x0 = x, ys = y0 + 22;
    const pos = [];
    tokens.forEach((t, i) => { pos.push(x); T(ctx, C, t[0], x, ys, t[1], { size: fs, wt: 700, mono: true }); x += ws[i]; });
    const mark = (i, label, align) => {
      const cx = pos[i] + ws[i] / 2;
      E.P.seg([[cx, ys + fs * 0.7], [cx, ys + 24]], C.new, 1.4);
      T(ctx, C, label, cx, ys + 33, C.new, { size: narrow ? 10.5 : 11.5, wt: 700, align: align, maxW: 150, min: 8.5 });
    };
    mark(1, ":= กำหนดค่า", "center"); mark(9, "; ปิดคำสั่ง", "right");
    const ev = [
      ["แทนค่า Start = 1, Motor = 1, Stop = 0", "Motor := (1 OR 1) AND NOT 0;"],
      ["วงเล็บ: 1 OR 1 = 1 · กลับค่า: NOT 0 = 1", "Motor := 1 AND 1;"],
      ["1 AND 1 = 1", "Motor := 1;"]
    ];
    const bh = Math.min(50, (y1 - (ys + 58)) / 3);
    ev.forEach((e, i) => {
      const a = prog >= 1 ? 1 : clamp01(prog * 3.4 - i);
      if (a <= 0.01) return;
      const y = ys + 56 + i * bh;
      ctx.save(); ctx.globalAlpha *= a;
      T(ctx, C, (i + 1) + ". " + e[0], x0, y, C.ink2, { size: narrow ? 10.5 : 11.5, wt: 500, maxW: W - 2 * x0, min: 8.5 });
      ctx.font = "700 " + (fs - 0.5) + "px " + C.mono;
      const full = e[1], w1 = ctx.measureText(full).width;
      T(ctx, C, full, x0, y + 20, i === 2 ? C.ok : C.ink, { size: fs - 0.5, wt: 700, mono: true });
      if (i === 2) { void w1; }
      ctx.restore();
    });
  }

  /* ---------------- SFC ---------------- */
  function drawSFC(E, prog, y0, y1) {
    const { ctx, W, C, P, narrow } = E;
    const lw = Math.min(W - 24, 560), L = (W - lw) / 2;
    const cx = L + lw * 0.4, bw = Math.min(150, lw * 0.36), bh = 40, xl = L + 8;
    const yA = y0 + 8, t1 = yA + bh + 30, yR = t1 + 30, t2 = yR + bh + 30, yBack = t2 + 28;
    const stp = (y, name, sub, active, init) => {
      const a = clamp01(active);
      rr(ctx, cx - bw / 2, y, bw, bh, 4); ctx.fillStyle = C.bg; ctx.fill(); tint(ctx, C.ok, 0.2 * a);
      ctx.lineWidth = 2.2; ctx.strokeStyle = a > 0.5 ? C.ok : C.ink2; ctx.stroke();
      if (init) { rr(ctx, cx - bw / 2 + 4, y + 4, bw - 8, bh - 8, 2); ctx.lineWidth = 1.4; ctx.stroke(); }
      T(ctx, C, name, cx, y + bh * 0.42, C.ink, { size: narrow ? 12.5 : 13.5, wt: 700, align: "center" });
      T(ctx, C, sub, cx, y + bh * 0.76, C.ink3, { size: narrow ? 9.5 : 10.5, wt: 500, align: "center", maxW: bw - 10, min: 8 });
    };
    const e = prog, tA = 1 - clamp01(e * 1.6), tR = clamp01(e * 1.6 - 0.6);
    const aActive = prog >= 1 ? 0 : tA, rActive = prog >= 1 ? 1 : tR;
    P.seg([[cx, yA + bh], [cx, yR]], C.ink2, 2);
    P.seg([[cx, yR + bh], [cx, yBack]], C.ink2, 2);
    P.seg([[cx, yBack], [xl, yBack], [xl, yA - 6], [cx, yA - 6]], C.ink2, 1.8);
    P.arrow(cx, yA - 6, cx, yA, C.ink2, 1.8, 7);
    /* ข้ามขั้น */
    const tr = (y, cond, val, ok) => {
      P.seg([[cx - 14, y], [cx + 14, y]], ok ? C.ok : C.ink2, 3.4);
      const cw = T(ctx, C, cond, cx + 22, y - 1, ok ? C.ok : C.ink2, { size: narrow ? 11 : 12, wt: 700, maxW: W - cx - 100, min: 8.5 });
      T(ctx, C, "= " + val, Math.min(W - 14 - 52, cx + 22 + cw + 8), y - 1, ok ? C.ok : C.ink3, { size: narrow ? 11 : 12, wt: 700, mono: true });
    };
    tr(t1, "Start AND NOT Stop", "TRUE", true);
    tr(t2, "Stop", "FALSE", false);
    stp(yA, "Ожидание", "ขั้นเริ่มต้น (กรอบคู่)", aActive, true);
    stp(yR, "Работа", "ทำงาน", rActive, false);
    /* การกระทำ */
    const ax = cx + bw / 2 + 12, aw = Math.max(70, Math.min(170, W - ax - 12));
    P.seg([[cx + bw / 2, yR + bh / 2], [ax, yR + bh / 2]], C.ink2, 1.6);
    rr(ctx, ax, yR + 4, aw, bh - 8, 4); ctx.fillStyle = C.bg; ctx.fill(); tint(ctx, C.ok, 0.18 * rActive);
    ctx.lineWidth = 1.8; ctx.strokeStyle = rActive > 0.5 ? C.ok : C.line2; ctx.stroke();
    T(ctx, C, "Motor := TRUE", ax + aw / 2, yR + bh / 2, rActive > 0.5 ? C.ok : C.ink3, { size: narrow ? 11.5 : 12.5, wt: 700, mono: true, align: "center", maxW: aw - 8, min: 8.5 });
    /* โทเคนขั้นที่ทำงานอยู่ */
    const ty = yA + bh / 2 + (yR - yA) * clamp01(e * 1.4 - 0.1);
    const tx = cx - bw / 2 - 12;
    P.dot(tx, prog >= 1 ? yR + bh / 2 : ty, 6, C.ok);
  }

  /* ---------------- สรุป ---------------- */
  function drawSum(E, prog, y0, y1) {
    const { ctx, W, C, P, narrow } = E;
    const g3 = ["LD", "FBD", "SFC"], g2 = ["IL", "ST"];
    const gapG = 10, pad = 10;
    let cards;
    if (narrow) {
      const h = Math.min(96, (y1 - y0 - 44) / 2), w3 = (W - 2 * pad - 2 * 8) / 3, w2 = (W - 2 * pad - 8) / 2;
      cards = g3.map((n, i) => ({ n, x: pad + i * (w3 + 8), y: y0 + 18, w: w3, h })).concat(g2.map((n, i) => ({ n, x: pad + i * (w2 + 8), y: y0 + 18 + h + 26, w: w2, h })));
      cards.hdr = [[pad, y0 + 8, "กราฟิก (графические)", C.lin], [pad, y0 + 18 + h + 14, "ข้อความ (текстовые)", C.ref]];
    } else {
      const w = Math.min(170, (W - 2 * pad - 4 * 10 - gapG) / 5), tot = 5 * w + 3 * 10 + gapG, sx = (W - tot) / 2, h = Math.min(130, y1 - y0 - 30);
      cards = g3.map((n, i) => ({ n, x: sx + i * (w + 10), y: y0 + 26, w, h })).concat(g2.map((n, i) => ({ n, x: sx + 3 * w + 2 * 10 + gapG + 10 + i * (w + 10), y: y0 + 26, w, h })));
      cards.hdr = [[sx, y0 + 12, "กราฟิก (графические)", C.lin], [cards[3].x, y0 + 12, "ข้อความ (текстовые)", C.ref]];
    }
    cards.hdr.forEach(hd => T(ctx, C, hd[2], hd[0], hd[1], hd[3], { size: narrow ? 11.5 : 12.5, wt: 700 }));
    cards.forEach((c, i) => {
      const a = prog >= 1 ? 1 : clamp01(prog * 5.5 - i * 0.7), kind = i < 3 ? C.lin : C.ref;
      if (a <= 0.01) return;
      ctx.save(); ctx.globalAlpha *= a;
      rr(ctx, c.x, c.y, c.w, c.h, 8); ctx.fillStyle = C.bg; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = kind; ctx.stroke();
      T(ctx, C, c.n, c.x + 9, c.y + 14, kind, { size: 14, wt: 700, mono: true });
      const bx = c.x + 8, by = c.y + 26, bw = c.w - 16, bh = c.h - 26 - 24;
      if (c.n === "LD") {
        const ym = by + bh * 0.5;
        P.seg([[bx, by + 2], [bx, by + bh - 2]], C.ink2, 2.4); P.seg([[bx + bw, by + 2], [bx + bw, by + bh - 2]], C.ink2, 2.4);
        P.seg([[bx, ym], [bx + bw * 0.25, ym]], C.ok, 2.2); P.seg([[bx + bw * 0.39, ym], [bx + bw * 0.55, ym]], C.ok, 2.2);
        contact(E, bx + bw * 0.32, ym, false, C.ok, 1.8); contact(E, bx + bw * 0.58 + 0, ym - 0, true, C.ok, 1.8);
        P.seg([[bx + bw * 0.65, ym], [bx + bw * 0.74, ym]], C.ok, 2.2); coil(E, bx + bw * 0.82, ym, C.ok, 1.8, true);
      } else if (c.n === "FBD") {
        const ym = by + bh * 0.5, bwid = bw * 0.28, hh = Math.min(bh * 0.6, 30);
        [[bx + bw * 0.16, "OR"], [bx + bw * 0.58, "AND"]].forEach(q => {
          rr(ctx, q[0], ym - hh / 2, bwid, hh, 3); ctx.fillStyle = C.bg; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = C.ok; ctx.stroke();
          T(ctx, C, q[1], q[0] + bwid / 2, ym, C.ink, { size: 9, wt: 700, mono: true, align: "center" });
        });
        P.seg([[bx, ym - 5], [bx + bw * 0.16, ym - 5]], C.ok, 1.8); P.seg([[bx, ym + 7], [bx + bw * 0.16, ym + 7]], C.ink3, 1.8);
        P.seg([[bx + bw * 0.44, ym], [bx + bw * 0.58, ym]], C.ok, 1.8); P.seg([[bx + bw * 0.86, ym], [bx + bw, ym]], C.ok, 1.8);
      } else if (c.n === "SFC") {
        const mx = bx + bw * 0.4, sw = bw * 0.5, sh = Math.min(20, bh * 0.32);
        rr(ctx, mx - sw / 2, by + 2, sw, sh, 2); ctx.fillStyle = C.bg; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = C.ink2; ctx.stroke();
        rr(ctx, mx - sw / 2 + 3, by + 5, sw - 6, sh - 6, 1); ctx.lineWidth = 1; ctx.stroke();
        const y2 = by + bh - sh - 2;
        rr(ctx, mx - sw / 2, y2, sw, sh, 2); ctx.fillStyle = C.bg; ctx.fill(); tint(ctx, C.ok, 0.25); ctx.lineWidth = 1.8; ctx.strokeStyle = C.ok; ctx.stroke();
        P.seg([[mx, by + 2 + sh], [mx, y2]], C.ink2, 1.6); P.seg([[mx - 7, (by + 2 + sh + y2) / 2], [mx + 7, (by + 2 + sh + y2) / 2]], C.ok, 3);
      } else if (c.n === "IL") {
        ["LD    Start", "OR    Motor", "ANDN  Stop", "ST    Motor"].forEach((ln, j) => T(ctx, C, ln, bx + 2, by + 6 + j * Math.min(14, bh / 4), C.ink, { size: narrow ? 10 : 11, wt: 700, mono: true, maxW: bw - 2, min: 8 }));
      } else {
        const l1 = narrow ? ["Motor := (Start OR", "Motor) AND NOT Stop;"] : ["Motor :=", "(Start OR Motor)", "AND NOT Stop;"];
        l1.forEach((ln, j) => T(ctx, C, ln, bx + 2, by + 8 + j * Math.min(16, bh / 3), C.ink, { size: narrow ? 10 : 11, wt: 700, mono: true, maxW: bw - 2, min: 8 }));
      }
      T(ctx, C, "Motor = 1", c.x + c.w / 2, c.y + c.h - 11, C.ok, { size: 11.5, wt: 700, mono: true, align: "center" });
      ctx.restore();
    });
  }

  const PANELS = [drawLD, drawFBD, drawIL, drawST, drawSFC, drawSum];

  Object.assign(DEMOS, {
    "ppo5-lang": function (host) {
      return window.STEPS2(host, {
        label: "แอนิเมชันทีละขั้น",
        title: "ตรรกะเดียว «Пуск/Стоп» ค้างสถานะ ใน 5 ภาษา <span style=\"white-space:nowrap\">(МЭК 61131-3)</span>",
        aria: "แอนิเมชันตรรกะสตาร์ทหยุดค้างสถานะเดียวกันในห้าภาษาโปรแกรม ПЛК ทีละภาษา",
        legend: [
          { cls: "", color: "var(--ok)", text: "เส้น/ค่าที่ «มีไฟ» (1)" },
          { cls: "lg-lin", text: "ป้ายภาษากราฟิก · คำสั่ง IL" },
          { cls: "lg-ref", text: "ป้ายภาษาข้อความ" },
          { cls: "lg-new", text: ":= และ ;" }
        ],
        steps: STEPS,
        caption: "ตัวอย่าง Пуск/Стоп ค้างสถานะ (<span lang=\"ru\">самоподхват</span>) และชื่อตัวแปร Start, Stop, Motor เป็นของผู้เรียบเรียง · ลักษณะของแต่ละภาษาตาม Л5 และคู่มือ «Программирование ПЛК на языках МЭК» (ЛР 1–5) · SFC ไม่มีในบรรยายที่ 5",
        height: w => w < 520 ? 336 : Math.round(Math.min(360, Math.max(330, w * 0.4))),
        duration: () => 1300,
        draw(ctx, W, H, step, C, anim) {
          const P = window.STEPS2.pen(ctx, W, H, C);
          const narrow = W < 520;
          const E = { ctx, W, H, C, P, narrow };
          const animating = anim.p < 1 && anim.from !== step;
          const prog = animating ? anim.e : 1;
          /* หัวภาษา */
          if (step < 5) {
            const L = LANGS[step], kc = L.kind === "g" ? C.lin : C.ref;
            T(ctx, C, L.name, 14, 18, C.ink, { size: narrow ? 13 : 14.5, wt: 700, maxW: W - 140, min: 9.5 });
            const kt = L.kind === "g" ? "กราฟิก" : "ข้อความ";
            ctx.font = "700 11px " + C.font;
            const kw = ctx.measureText(kt).width + 18;
            rr(ctx, W - 14 - kw, 7, kw, 22, 11); tint(ctx, kc, 0.14); ctx.lineWidth = 1.4; ctx.strokeStyle = kc; ctx.stroke();
            T(ctx, C, kt, W - 14 - kw / 2, 18.5, kc, { size: 11, wt: 700, align: "center" });
          } else {
            T(ctx, C, "สรุปห้าภาษา", 14, 18, C.ink, { size: narrow ? 13 : 14.5, wt: 700 });
          }
          /* แผงของภาษา */
          ctx.save();
          if (animating) ctx.globalAlpha *= clamp01(anim.p / 0.18);
          PANELS[step](E, prog, 40, H - 42);
          ctx.restore();
          /* ค่าสัญญาณชุดเดียวกันทุกขั้น */
          const chips = [["Start (Пуск) = 1", C.ok, 1], ["Stop (Стоп) = 0", C.ink3, 0], ["→ Motor = 1", C.ok, 1]];
          let size = narrow ? 11 : 12;
          ctx.font = "700 " + size + "px " + C.font;
          let ws = chips.map(c => ctx.measureText(c[0]).width + 18);
          if (ws.reduce((a, b) => a + b, 0) + 16 > W - 12) { chips[0][0] = "Start = 1"; chips[1][0] = "Stop = 0"; ws = chips.map(c => ctx.measureText(c[0]).width + 18); }
          let x = (W - (ws.reduce((a, b) => a + b, 0) + 8 * 2)) / 2;
          chips.forEach((c, i) => {
            rr(ctx, x, H - 33, ws[i], 24, 12);
            if (c[2]) tint(ctx, c[1], 0.15);
            ctx.lineWidth = 1.5; ctx.strokeStyle = c[1]; ctx.stroke();
            T(ctx, C, c[0], x + ws[i] / 2, H - 21, c[1], { size: size, wt: 700, align: "center" });
            x += ws[i] + 8;
          });
        }
      });
    }
  });
})();
/* --- ppo5-scan.js --- */
/* ppo5-scan — รอบทำงานของ ПЛК ทีละขั้น: ขั้วต่อ ↔ PII/PIQ ↔ โปรแกรม (7 ขั้น)
   ที่มา: Л5 сл. 18 (Рабочий цикл ПЛК: Включение → Очистка памяти вывода → Опрос входов и сохранение в PII → Программа ПЛК → Передача образа процесса на выходы)
     ฉบับเดิม ppo-5 h3 «รอบสแกน» · ข้อความที่ใช้คำต่อคำ: «любые последующие изменения состояний входных сигналов не регистрируются»,
     «Образ процесса выходных сигналов хранится в буфере вывода до его перезаписи»
   ค่าอ้างอิงจากฉบับเดิม: เวลารอบของ ПЛК150 T_ц = 1 мс (ตารางสเปก сл. 21, 24) · T_ц = t_вх + t_прог + t_вых (5.3) · ช่วงหน่วง 1…2 T_ц
   ของผู้เรียบเรียง (บอกบนจอ): โปรแกรมตัวอย่าง Q0 := I1, Q1 := I0 · ค่าอินพุตเริ่มต้น I = 1,0,0,0 · t_вх = t_вых = 0,25 мс, t_прог = 0,50 мс
     (ชุดเดียวกับ ppoScan) · ขอบ I1 ที่ 0,40 мс → Q0 เปลี่ยนที่ 2,00 мс = หน่วง 1,60 мс · พัลส์ตัวอย่าง 0,30…0,60 мс (ยาว 0,30 мс < T_ц)
     โดยตั้งสมมุติว่าอินพุตถูกสุ่มอ่านที่ต้นรอบและเอาต์พุตถูกส่งที่ปลายรอบ (ให้ผลตรงกับช่วง 1…2 T_ц ของ (5.3)) */
(function () {
  "use strict";
  const nf = (v, d) => window.STEPS2.nf(v, d);
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const T_IN = 0.25, T_PR = 0.5, T_OUT = 0.25, T_C = T_IN + T_PR + T_OUT;   // мс
  const T_E = 0.4, PU0 = 0.3, PU1 = 0.6;
  const DELAY = 2 * T_C - T_E;
  const RU = t => '<span lang="ru">' + t + "</span>";

  /* สถานะของแต่ละขั้น (ฉากผัง) · nw = ค่าที่เพิ่งเปลี่ยน · gh = ค่าที่ «ยังไม่เปลี่ยน» ทั้งที่ควรสังเกต */
  const ST = [
    { I: [1, 0, 0, 0], P: [null, null, null, null], O: [0, 0], Q: [0, 0], nw: ["O0", "O1"], gh: [], act: [0, 1], cyc: "เปิดเครื่อง", ck: -1, thr: 0.3,
      msg: ["เปิดเครื่อง → ล้าง PIQ เป็น 0", "(ทำครั้งเดียว อยู่นอกวง)"] },
    { I: [1, 0, 0, 0], P: [1, 0, 0, 0], O: [0, 0], Q: [0, 0], nw: ["P0", "P1", "P2", "P3"], gh: [], act: [2], cyc: "รอบที่ 1", ck: -1, thr: 0.55,
      msg: ["อ่านขั้วต่ออินพุตทั้งหมด", "พร้อมกัน → เก็บลง PII"] },
    { I: [1, 1, 0, 0], P: [1, 0, 0, 0], O: [0, 0], Q: [0, 0], nw: ["I1"], gh: ["P1"], act: [3], cyc: "รอบที่ 1", ck: 1, thr: 0.25,
      msg: ["I1 เปลี่ยนเป็น 1 ที่ขั้วต่อ", "แต่ PII·I1 ยังเป็น 0"] },
    { I: [1, 1, 0, 0], P: [1, 0, 0, 0], O: [0, 1], Q: [0, 1], nw: ["O1", "Q1"], gh: ["Q0"], act: [4], cyc: "รอบที่ 1", ck: 1, thr: 0.75,
      msg: ["ส่ง PIQ ออกขั้วต่อ · Q1 เปลี่ยน", "Q0 ยังเป็น 0 (ค่าเดิม)"] },
    { I: [1, 1, 0, 0], P: [1, 1, 0, 0], O: [1, 1], Q: [0, 1], nw: ["P1", "O0"], gh: [], act: [2, 3], loop: true, cyc: "รอบที่ 2", ck: 1, thr: 0.8,
      msg: ["รอบใหม่: PII·I1 = 1", "โปรแกรมเปลี่ยน PIQ·Q0 เป็น 1"] },
    { I: [1, 1, 0, 0], P: [1, 1, 0, 0], O: [1, 1], Q: [1, 1], nw: ["Q0"], gh: [], act: [4], cyc: "รอบที่ 2", ck: 0, thr: 0.55,
      msg: ["ส่งออก → Q0 เปลี่ยนเป็น 1"] }
  ];
  const BOXES = [
    { th: "เปิดเครื่อง", ru: ["Включение ПЛК"], c: "ink3" },
    { th: "ล้างเอาต์พุต (ครั้งเดียว)", ru: ["Очистка памяти вывода"], c: "ink3" },
    { th: "อ่านอินพุตลง PII", ru: ["Опрос входов и сохранение в PII"], c: "meas" },
    { th: "รันโปรแกรม", ru: ["Программа ПЛК", "Команда 1 … Команда n"], c: "lin" },
    { th: "ส่งภาพเอาต์พุตออก", ru: ["Передача образа процесса на выходы"], c: "meas" }
  ];

  const STEPS = [
    { title: "เปิดเครื่อง ล้างหน่วยความจำเอาต์พุต (ครั้งเดียว)",
      text: "เริ่มจากกล่อง 1 <b>เปิดเครื่อง</b> (" + RU("Включение ПЛК") + ") แล้วกล่อง 2 <b>ล้างหน่วยความจำเอาต์พุต</b> (" + RU("Очистка памяти вывода") + ") — PIQ เป็น 0 ทั้งหมด ขั้นนี้อยู่<b>นอกวง</b> ทำครั้งเดียวหลังเปิดเครื่อง จากนั้นจึงเข้าวงที่กล่อง 3",
      alt: "ผังรอบทำงานแนวตั้งห้ากล่อง กล่อง 1 และ 2 สว่างขึ้น ด้านขวามีแถวขั้วต่ออินพุต PII PIQ และขั้วต่อเอาต์พุต โดย PIQ ทั้งสองช่องเป็น 0",
      nums: [
        { k: "ภาพของเอาต์พุต PIQ หลังล้าง", v: "Q0 = 0 · Q1 = 0" },
        { k: "ลำดับตามสไลด์ 18", v: "1 → 2 → วนซ้ำ [3 → 4 → 5]", note: "ลูกศรวนกลับไปกล่อง 3 ไม่ผ่านกล่อง 2" }
      ] },
    { title: "รอบที่ 1: อ่านขั้วต่ออินพุตทั้งหมดลง PII",
      text: "ต้นรอบ ระบบ «ถ่ายภาพ» สถานะของขั้วต่ออินพุตทุกตัว<b>พร้อมกัน</b> เก็บเป็น <b>PII</b> (" + RU("образ процесса входных сигналов") + ") — จากนี้ไปโปรแกรมอ่านจากภาพนี้เท่านั้น ไม่อ่านขั้วต่อโดยตรง",
      alt: "กล่อง 3 สว่างขึ้น ค่าของขั้วต่ออินพุต I0 ถึง I3 ซึ่งเป็น 1 0 0 0 ถูกคัดลอกลงช่อง PII ทั้งสี่ช่องพร้อมกัน",
      nums: [
        { k: "ขั้วต่ออินพุต I0 · I1 · I2 · I3", v: "1 · 0 · 0 · 0" },
        { k: "PII หลังอ่าน", v: "1 · 0 · 0 · 0", big: true }
      ] },
    { title: "ระหว่างรันโปรแกรม ปุ่ม I1 เปลี่ยนเป็น 1 — แต่ PII ยังเป็น 0",
      text: "โปรแกรมอ่านจาก PII ไม่ได้อ่านจากขั้วต่อ — I1 ที่เพิ่งเปลี่ยน<b>ยังไม่ถูกบันทึก</b> (" + RU("любые последующие изменения состояний входных сигналов не регистрируются") + ") จนกว่าจะถึงการอ่านต้นรอบถัดไป โปรแกรมจึง «ไม่เห็น» การกดปุ่มนี้",
      alt: "ช่องขั้วต่อ I1 เปลี่ยนเป็น 1 มีวงแหวนสีเน้น แต่ช่อง PII ของ I1 ยังเป็น 0 กล่อง 4 รันโปรแกรมโดยอ่านจาก PII",
      nums: [
        { k: "ขั้วต่อ I1 (ของจริง)", v: "0 → 1", big: true },
        { k: "PII · I1 (ภาพที่โปรแกรมเห็น)", v: "ยังเป็น 0", big: true },
        { k: "โปรแกรมตัวอย่าง", v: "Q0 := I1 · Q1 := I0", note: "ผู้เรียบเรียงตั้งเป็นตัวอย่าง" }
      ] },
    { title: "ท้ายรอบที่ 1: เขียน PIQ แล้วส่งออกขั้วต่อ — Q0 ยังเป็น 0",
      text: "โปรแกรมเขียนผลลง PIQ (Q0 := PII·I1 = 0 · Q1 := PII·I0 = 1) แล้วกล่อง 5 ส่ง PIQ ออกขั้วต่อเอาต์พุต Q1 เปลี่ยนตามภาพที่อ่านไว้ แต่ <b>Q0 ยังเป็นค่าเดิม</b>ทั้งที่ I1 = 1 แล้ว · PIQ เก็บไว้ในบัฟเฟอร์จนกว่าจะถูกเขียนทับ (" + RU("хранится в буфере вывода до его перезаписи") + ")",
      alt: "ช่อง PIQ ได้ค่า 0 1 และถูกส่งไปขั้วต่อเอาต์พุต Q1 เป็น 1 ส่วน Q0 ยังเป็น 0 ขณะที่ I1 ที่ขั้วต่อเป็น 1 แล้ว",
      nums: [
        { k: "PIQ ที่โปรแกรมเขียน · Q0 , Q1", v: "0 · 1" },
        { k: "ขั้วต่อเอาต์พุต Q0 · Q1", v: "0 · 1", big: true, note: "Q0 ยังไม่ตอบสนองต่อ I1" }
      ] },
    { title: "รอบที่ 2: PII ได้ I1 = 1 → โปรแกรมเปลี่ยน PIQ",
      text: "ลูกศรวนกลับมาที่กล่อง 3 (ไม่ผ่านการล้างเอาต์พุตอีก) ต้นรอบใหม่ ระบบอ่าน I1 = 1 เข้า PII โปรแกรม<b>เห็นการกดปุ่มเป็นครั้งแรก</b> และเขียน PIQ·Q0 = 1",
      alt: "ลูกศรวนกลับไปกล่อง 3 ค่า I1 ถูกคัดลอกเป็น 1 ในช่อง PII จากนั้นโปรแกรมเขียน 1 ลงช่อง Q0 ของ PIQ ส่วนขั้วต่อเอาต์พุต Q0 ยังเป็น 0",
      nums: [
        { k: "PII · I1", v: "0 → 1", big: true },
        { k: "PIQ · Q0", v: "0 → 1", big: true },
        { k: "ขั้วต่อเอาต์พุต Q0", v: "ยังเป็น 0 จนกว่าจะส่งออก" }
      ] },
    { title: "ท้ายรอบที่ 2: ส่งออก → Q0 เปลี่ยนเป็น 1",
      text: "กล่อง 5 ส่ง PIQ ออกขั้วต่อ ขั้วต่อเอาต์พุต Q0 จึงเปลี่ยนเป็น 1 — ช้ากว่าการกดปุ่ม I1 มากกว่าหนึ่งรอบ นี่คือที่มาของ <b>เวลาตอบสนอง</b> ของ ПЛК",
      alt: "ช่องขั้วต่อเอาต์พุต Q0 เปลี่ยนเป็น 1 มีวงแหวนสีเน้น Q1 ยังเป็น 1",
      nums: [
        { k: "ขั้วต่อเอาต์พุต Q0 · Q1", v: "1 · 1", big: true }
      ] },
    { title: "เวลาตอบสนอง: จากขอบสัญญาณถึงเอาต์พุต 1…2 รอบ",
      text: "ในตัวอย่างนี้ I1 ขึ้นที่ " + nf(T_E, 2) + " мс หลังจุดอ่านของรอบ 1 · Q0 เปลี่ยนที่ปลายรอบ 2 = " + nf(2 * T_C, 2) + " мс · หน่วงรวม " + nf(DELAY, 2) + " мс อยู่ในช่วง T<sub>ц</sub>…2 T<sub>ц</sub> · พัลส์สั้นกว่า T<sub>ц</sub> ที่ตกอยู่ระหว่างจุดอ่านสองจุด <b>PII ไม่เห็นเลย</b>",
      alt: "แผนภาพเวลาสองรอบ แต่ละรอบแบ่งเป็นอ่าน โปรแกรม และส่ง ด้านล่างมีเส้นสัญญาณ I1 ที่ขั้วต่อ PII·I1 PIQ·Q0 และ Q0 ที่ขั้วต่อ ซึ่งขึ้นช้ากว่ากันตามลำดับ และแถวพัลส์สั้นที่ PII มองไม่เห็น",
      nums: [
        { k: "T<sub>ц</sub> = t<sub>вх</sub> + t<sub>прог</sub> + t<sub>вых</sub>", v: nf(T_IN, 2) + " + " + nf(T_PR, 2) + " + " + nf(T_OUT, 2) + " = " + nf(T_C, 2) + " мс", note: "T<sub>ц</sub> = 1 мс ตามสเปก ПЛК150 · การแบ่งสามส่วนผู้เรียบเรียงตั้งเอง" },
        { k: "จาก I1 ขึ้น (" + nf(T_E, 2) + " мс) ถึง Q0 เปลี่ยน (" + nf(2 * T_C, 2) + " мс)", v: nf(DELAY, 2) + " мс", big: true, note: "ผู้เรียบเรียงคำนวณ · อยู่ในช่วง " + nf(T_C, 2) + "…" + nf(2 * T_C, 2) + " мс" },
        { k: "พัลส์ตัวอย่างยาว " + nf(PU1 - PU0, 2) + " мс < T<sub>ц</sub>", v: "ตกระหว่างจุดอ่านที่ 0 мс กับ 1,00 мс → PII เป็น 0 ตลอด", note: "τ ≥ T<sub>ц</sub> จึงรับประกันว่าตรวจพบ" }
      ] }
  ];

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function tint(ctx, color, a) { ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = color; ctx.fill(); ctx.restore(); }
  function T(ctx, C, txt, x, y, col, o) {
    o = o || {};
    let sz = o.size || 12;
    const mk = s => { ctx.font = (o.wt || 600) + " " + s + "px " + (o.mono ? C.mono : C.font); };
    mk(sz);
    if (o.maxW) while (sz > (o.min || 8.5) && ctx.measureText(txt).width > o.maxW) { sz -= 0.5; mk(sz); }
    ctx.fillStyle = col; ctx.textAlign = o.align || "left"; ctx.textBaseline = o.base || "middle";
    ctx.fillText(txt, x, y);
    return ctx.measureText(txt).width;
  }
  function wrap(ctx, C, txt, maxW, size) {
    ctx.font = "500 " + size + "px " + C.font;
    const words = txt.split(" "), out = [];
    let cur = "";
    words.forEach(w => {
      const t = cur ? cur + " " + w : w;
      if (cur && ctx.measureText(t).width > maxW) { out.push(cur); cur = w; } else cur = t;
    });
    if (cur) out.push(cur);
    return out;
  }
  function polyPt(pts, f) {
    let tot = 0; const L = [];
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(d); tot += d; }
    let s = clamp01(f) * tot;
    for (let i = 0; i < L.length; i++) {
      if (s <= L[i] || i === L.length - 1) { const u = L[i] ? s / L[i] : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u]; }
      s -= L[i];
    }
    return pts[pts.length - 1];
  }

  Object.assign(DEMOS, {
    "ppo5-scan": function (host) {
      return window.STEPS2(host, {
        label: "แอนิเมชันทีละขั้น",
        title: "รอบทำงานของ <span lang=\"ru\">ПЛК</span>: ขั้วต่อ ↔ PII/PIQ ↔ โปรแกรม <span style=\"white-space:nowrap\">(сл. 18)</span>",
        aria: "แอนิเมชันรอบทำงานของคอนโทรลเลอร์โปรแกรมได้ทีละขั้น",
        legend: [
          { cls: "lg-meas", text: "ขั้วต่อ (สัญญาณจริง)" },
          { cls: "lg-ref", text: "ภาพ PII/PIQ" },
          { cls: "lg-lin", text: "โปรแกรม" },
          { cls: "lg-new", text: "ค่าที่เพิ่งเปลี่ยน" },
          { cls: "", color: "var(--ok)", text: "ค่า 1 (มีไฟ)" }
        ],
        steps: STEPS,
        caption: "Л5 · сл. 18 (<span lang=\"ru\">Рабочий цикл ПЛК</span>) · T<sub>ц</sub> = 1 мс ตามสเปก ПЛК150 (сл. 21, 24) · โปรแกรมตัวอย่าง Q0 := I1, Q1 := I0 · ค่าอินพุตเริ่มต้นและการแบ่งเวลา t<sub>вх</sub>/t<sub>прог</sub>/t<sub>вых</sub> = 0,25/0,50/0,25 мс · จังหวะ I1 ที่ 0,40 мс และพัลส์ 0,30 мс เป็นค่าตัวอย่างของผู้เรียบเรียง · ตัวเลขทั้งหมดเป็นภาพประกอบ ไม่ใช่การวัดจริง",
        height: w => w < 520 ? 344 : 372,
        duration: (a, b) => (a === 6 || b === 6) ? 700 : 1500,
        draw(ctx, W, H, step, C, anim) {
          const P = window.STEPS2.pen(ctx, W, H, C);
          const narrow = W < 520;
          const col = k => C[k];
          const sa = Math.min(step, 5), fa = Math.min(anim.from, 5);
          const animating = anim.p < 1 && fa !== sa;
          const S = ST[sa];
          const early = animating && anim.p < S.thr;
          const V = ST[early ? fa : sa];
          const aB = step === 6 ? (anim.from === 6 ? 1 : anim.e) : (anim.from === 6 ? 1 - anim.e : 0);

          /* =================== ฉากผังรอบทำงาน =================== */
          function sceneA(al) {
            ctx.save(); ctx.globalAlpha *= al;
            const topM = 8;
            const hb = narrow ? [38, 38, 58, 60, 58] : [42, 42, 60, 64, 60];
            const g = (H - 2 * topM - hb.reduce((a, b) => a + b, 0)) / 4;
            const bx = narrow ? 22 : 30, bw = narrow ? Math.round(W * 0.41) : Math.min(400, Math.round(W * 0.42));
            const bR = bx + bw;
            const dx = bR + (narrow ? 26 : 70), dw = narrow ? W - dx - 8 : Math.min(360, W - dx - 20);
            const xb = (bR + dx) / 2, xl = bx - 10;
            const B = []; let yy = topM;
            hb.forEach(h => { B.push({ x: bx, y: yy, w: bw, h: h }); yy += h + g; });
            const rh = narrow ? 42 : 46, ch = rh - 14;
            const dtop = B[2].y, dbot = B[4].y + B[4].h, rg = (dbot - dtop - 4 * rh) / 3;
            const gc = narrow ? 4 : 8, cw = Math.min(narrow ? 60 : 74, (dw - 3 * gc) / 4);
            const R = [dtop, dtop + rh + rg, dtop + 2 * (rh + rg), dbot - rh];
            const cellX = j => dx + j * (cw + gc), cellY = r => R[r] + 14;
            const yI = R[0] + 14 + ch / 2, yP = R[1] + 14 + ch / 2 - 2;
            const yA = Math.min(R[1] + 14 + ch - 3, B[3].y + B[3].h - 10);
            const yBw = Math.min(R[2] + 14 + 6, B[3].y + B[3].h - 6), yPq = R[2] + 14 + ch / 2 + 2, yQ = R[3] + 14 + ch / 2;
            const y3m = Math.min((yI + yP) / 2, B[2].y + B[2].h - 8), y5m = (yPq + yQ) / 2;
            const loopY5 = B[4].y + B[4].h / 2, loopY3 = B[2].y + B[2].h / 2;
            const PATH = {
              br1: [[dx, yI], [xb, yI], [xb, yP], [dx - 1, yP]],
              rd: [[dx, yA], [bR + 1, yA]],
              wr: [[bR + 1, yBw], [dx, yBw]],
              br2: [[dx, yPq], [xb, yPq], [xb, yQ], [dx - 1, yQ]],
              loop: [[bx, loopY5], [xl, loopY5], [xl, loopY3], [bx - 1, loopY3]]
            };
            const act = S.act;
            const on = k => act.indexOf(k) >= 0;

            /* ---- กล่องผัง + ลูกศรระหว่างกล่อง ---- */
            for (let i = 0; i < 4; i++) {
              const a = B[i], b = B[i + 1];
              P.arrow(a.x + a.w / 2, a.y + a.h + 1, b.x + b.w / 2, b.y - 1, C.ink3, 1.4, 6);
            }
            BOXES.forEach((d, i) => {
              const b = B[i], c = col(d.c), a = on(i);
              rr(ctx, b.x, b.y, b.w, b.h, 8);
              ctx.fillStyle = a ? C.wash : C.bg; ctx.fill();
              ctx.lineWidth = a ? 2.6 : 1.3; ctx.strokeStyle = a ? (d.c === "ink3" ? C.ink2 : c) : C.line2; ctx.stroke();
              rr(ctx, b.x + 6, b.y + 6, 16, 16, 4); tint(ctx, a ? c : C.ink3, 0.16);
              T(ctx, C, String(i + 1), b.x + 14, b.y + 14.5, a ? (d.c === "ink3" ? C.ink2 : c) : C.ink3, { size: 11, wt: 700, align: "center" });
              T(ctx, C, d.th, b.x + 28, b.y + 14, a ? (d.c === "ink3" ? C.ink : c) : C.ink, { size: narrow ? 11.5 : 12.5, wt: 700, maxW: b.w - 34, min: 9.5 });
              let ly = b.y + 30;
              d.ru.forEach(line => {
                const ls = wrap(ctx, C, line, b.w - 16, narrow ? 9.8 : 10.8);
                ls.forEach(t => { T(ctx, C, t, b.x + 8, ly, C.ink2, { size: narrow ? 9.8 : 10.8, wt: 500, maxW: b.w - 14, min: 8 }); ly += narrow ? 12 : 13; });
              });
              if (i === 1 && !narrow) T(ctx, C, "นอกวง", b.x + b.w - 8, b.y + 14, C.ink3, { size: 9.5, wt: 600, align: "right" });
            });
            /* ลูกศรวนกลับ 5 → 3 */
            {
              const lc = S.loop ? C.new : (on(4) ? C.ink2 : C.ink3);
              P.seg(PATH.loop, lc, S.loop ? 2.4 : 1.5);
              P.arrow(xl + 2, loopY3, bx - 1, loopY3, lc, S.loop ? 2.4 : 1.5, 7);
            }

            /* ---- ตัวเชื่อมกล่อง ↔ ข้อมูล ---- */
            const wire = (pts, color, w, both) => {
              P.seg(pts.slice(0, -1).concat([pts[pts.length - 1]]), color, w);
              const n = pts.length;
              P.arrow(pts[n - 2][0], pts[n - 2][1], pts[n - 1][0], pts[n - 1][1], color, w, 7);
              if (both) P.arrow(pts[1][0], pts[1][1], pts[0][0], pts[0][1], color, w, 7);
            };
            const act3 = on(2), act4 = on(3), act5 = on(4);
            wire(PATH.br1, act3 ? C.meas : C.ink3, act3 ? 2.2 : 1.4);
            P.seg([[bR + 1, y3m], [xb, y3m]], act3 ? C.meas : C.ink3, act3 ? 2.2 : 1.4);
            P.dot(xb, y3m, 2.6, act3 ? C.meas : C.ink3);
            wire(PATH.rd, act4 ? C.lin : C.ink3, act4 ? 2.2 : 1.4);
            wire(PATH.wr, act4 ? C.lin : C.ink3, act4 ? 2.2 : 1.4, true);
            wire(PATH.br2, act5 ? C.meas : C.ink3, act5 ? 2.2 : 1.4);
            P.seg([[bR + 1, y5m], [xb, y5m]], act5 ? C.meas : C.ink3, act5 ? 2.2 : 1.4);
            P.dot(xb, y5m, 2.6, act5 ? C.meas : C.ink3);

            /* ---- แถวข้อมูล ---- */
            const lab = (r, full, short, color) => {
              ctx.font = "600 10px " + C.font;
              const t = ctx.measureText(full).width <= dw ? full : short;
              T(ctx, C, t, dx, R[r] + 6, color, { size: narrow ? 10 : 11, wt: 600, maxW: dw, min: 8.5 });
            };
            lab(0, "ขั้วต่ออินพุต (Входные клеммы)", "ขั้วต่ออินพุต", C.meas);
            lab(1, "PII · ภาพของอินพุต", "PII", C.ref);
            lab(2, "PIQ · ภาพของเอาต์พุต", "PIQ", C.ref);
            lab(3, "ขั้วต่อเอาต์พุต (Выходные клеммы)", "ขั้วต่อเอาต์พุต", C.meas);
            const showFlags = !early;
            const cell = (r, j, name, val, kind, key) => {
              const x = cellX(j), y = cellY(r), color = kind === "term" ? C.meas : C.ref;
              rr(ctx, x, y, cw, ch, 6);
              if (kind === "mem") tint(ctx, C.wash, 1); else { ctx.fillStyle = C.bg; ctx.fill(); }
              if (val === 1) tint(ctx, C.ok, 0.22);
              ctx.lineWidth = 1.6; ctx.strokeStyle = color; ctx.setLineDash(val === null ? [3, 3] : []); ctx.stroke(); ctx.setLineDash([]);
              T(ctx, C, name, x + cw / 2, y + 7, C.ink3, { size: 9.5, wt: 600, align: "center" });
              T(ctx, C, val === null ? "–" : String(val), x + cw / 2, y + ch * 0.66, val === 1 ? C.ok : C.ink3, { size: narrow ? 14 : 16, wt: 700, mono: true, align: "center" });
              const isNew = showFlags && S.nw.indexOf(key) >= 0, isGh = showFlags && S.gh.indexOf(key) >= 0;
              if (isNew) {
                rr(ctx, x - 2.5, y - 2.5, cw + 5, ch + 5, 8); ctx.lineWidth = 2.4; ctx.strokeStyle = C.new; ctx.stroke();
                if (animating) {
                  const u = clamp01((anim.p - S.thr) / (1 - S.thr + 0.0001)), e = 3 + 9 * u;
                  ctx.save(); ctx.globalAlpha *= 1 - u; rr(ctx, x - e, y - e, cw + 2 * e, ch + 2 * e, 8 + e / 2); ctx.lineWidth = 2; ctx.strokeStyle = C.new; ctx.stroke(); ctx.restore();
                }
              } else if (isGh) {
                rr(ctx, x - 2.5, y - 2.5, cw + 5, ch + 5, 8); ctx.lineWidth = 2; ctx.strokeStyle = C.new; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
              }
            };
            for (let j = 0; j < 4; j++) {
              cell(0, j, "I" + j, V.I[j], "term", "I" + j);
              cell(1, j, "I" + j, V.P[j], "mem", "P" + j);
            }
            for (let j = 0; j < 2; j++) {
              cell(2, j, "Q" + j, V.O[j], "mem", "O" + j);
              cell(3, j, "Q" + j, V.Q[j], "term", "Q" + j);
            }

            /* ---- จุดข้อมูลไหลตามลูกศร (ระหว่างเปลี่ยนขั้น) ---- */
            if (animating) {
              const run = (path, t0, t1, color) => {
                const u = (anim.p - t0) / (t1 - t0);
                if (u <= 0 || u >= 1.25) return;
                for (let j = 0; j < 3; j++) {
                  const f = u - j * 0.13;
                  if (f > 0 && f < 1) { const q = polyPt(PATH[path], f); P.dot(q[0], q[1], 3.8, color); }
                }
              };
              if (sa === 1) run("br1", 0, 0.6, C.meas);
              else if (sa === 2) run("rd", 0, 0.5, C.lin);
              else if (sa === 3) { run("wr", 0, 0.4, C.lin); run("br2", 0.4, 0.9, C.meas); }
              else if (sa === 4) { run("loop", 0, 0.3, C.new); run("br1", 0.25, 0.6, C.meas); run("rd", 0.5, 0.75, C.lin); run("wr", 0.7, 0.98, C.lin); }
              else if (sa === 5) run("br2", 0, 0.6, C.meas);
            }

            /* ---- ป้ายรอบ + ข้อความสั้นประจำขั้น ---- */
            {
              const bt = S.cyc;
              ctx.font = "700 " + (narrow ? 11.5 : 12.5) + "px " + C.font;
              const tw = ctx.measureText(bt).width + 18;
              rr(ctx, dx, topM + 2, tw, 22, 11); tint(ctx, C.lin, 0.14); ctx.lineWidth = 1.4; ctx.strokeStyle = C.lin; ctx.stroke();
              T(ctx, C, bt, dx + tw / 2, topM + 13, C.lin, { size: narrow ? 11.5 : 12.5, wt: 700, align: "center" });
              S.msg.forEach((t, i) => {
                T(ctx, C, t, dx, topM + 40 + i * (narrow ? 17 : 19), i === S.ck ? C.new : C.ink2, { size: narrow ? 11 : 12.5, wt: i === S.ck ? 700 : 600, maxW: W - dx - 6, min: 9 });
              });
            }
            ctx.restore();
          }

          /* =================== ฉากเส้นเวลา (ขั้น ⑦) =================== */
          function sceneB(al) {
            ctx.save(); ctx.globalAlpha *= al;
            const xL = narrow ? 84 : 128, xR = W - 14, TS = 2.18, X = t => xL + (xR - xL) * t / TS;
            const yb = 32, hb = 22;
            /* แถบรอบ */
            [0, 1].forEach(c => {
              const segs = [[0, T_IN, "อ่าน", C.meas], [T_IN, T_IN + T_PR, "โปรแกรม", C.lin], [T_IN + T_PR, T_C, "ส่ง", C.meas]];
              segs.forEach(s => {
                const x1 = X(c * T_C + s[0]), x2 = X(c * T_C + s[1]);
                ctx.beginPath(); ctx.rect(x1, yb, x2 - x1, hb); tint(ctx, s[3], 0.16);
                ctx.lineWidth = 1.2; ctx.strokeStyle = s[3]; ctx.stroke();
                T(ctx, C, s[2], (x1 + x2) / 2, yb + hb / 2, C.ink, { size: 10, wt: 600, align: "center", maxW: x2 - x1 - 3, min: 7.5 });
              });
              T(ctx, C, "รอบที่ " + (c + 1) + " · Tц = " + nf(T_C, 2) + " мс", (X(c * T_C) + X((c + 1) * T_C)) / 2, yb - 11, C.ink2, { size: narrow ? 10.5 : 11.5, wt: 600, align: "center", maxW: (xR - xL) / TS - 6, min: 8.5 });
            });
            T(ctx, C, "รอบ", xL - 8, yb + hb / 2, C.ink3, { size: 10.5, wt: 600, align: "right" });
            const rp = Math.min(50, (H - 150) / 5), y0 = yb + hb + 22;
            const rows = [
              { n: "I1 ขั้วต่อ", c: C.meas, pts: [[0, 0], [T_E, 0], [T_E, 1], [TS, 1]], ev: T_E },
              { n: "PII · I1", c: C.ref, pts: [[0, 0], [T_C, 0], [T_C, 1], [TS, 1]], ev: T_C },
              { n: "PIQ · Q0", c: C.ref, pts: [[0, 0], [T_C + T_IN + T_PR * 0.8, 0], [T_C + T_IN + T_PR * 0.8, 1], [TS, 1]], ev: T_C + T_IN + T_PR * 0.8 },
              { n: "Q0 ขั้วต่อ", c: C.meas, pts: [[0, 0], [2 * T_C, 0], [2 * T_C, 1], [TS, 1]], ev: 2 * T_C },
              { n: "พัลส์สั้น", c: C.meas, pts: [[0, 0], [PU0, 0], [PU0, 1], [PU1, 1], [PU1, 0], [TS, 0]], ev: -1 }
            ];
            /* เส้นนำแนวตั้งที่จุดอ่าน/ส่ง */
            [0, 1, 2].forEach(k => {
              P.seg([[X(k * T_C), yb + hb], [X(k * T_C), y0 + 5 * rp - 4]], C.line2, 1.1, [3, 4]);
            });
            const yBase = r => y0 + r * rp + rp - 11, yHigh = r => y0 + r * rp + 9;
            rows.forEach((r, i) => {
              T(ctx, C, r.n, xL - 8, y0 + i * rp + rp / 2 + 1, i === 4 ? C.crit : C.ink, { size: narrow ? 10.5 : 11.5, wt: 600, align: "right", maxW: xL - 12, min: 8.5 });
              const pts = r.pts.map(p => [X(p[0]), p[1] ? yHigh(i) : yBase(i)]);
              pts.unshift([xL, yBase(i)]); pts[1][1] = yBase(i);
              P.seg(pts, r.c, 2.2, i === 4 ? [] : []);
              if (r.ev >= 0) P.dot(X(r.ev), yBase(i) - (yBase(i) - yHigh(i)) / 2, 3.6, C.new);
            });
            /* พัลส์สั้น: คร่อมระหว่างจุดอ่านสองจุด */
            {
              const y = y0 + 4 * rp + rp / 2;
              ctx.save(); ctx.globalAlpha *= 0.9;
              T(ctx, C, "PII ไม่เห็นพัลส์นี้", X(1) + 7, y + 2, C.crit, { size: narrow ? 10.5 : 11.5, wt: 700, maxW: xR - X(1) - 8, min: 8.5 });
              ctx.restore();
            }
            /* ลูกศรหน่วงเวลา */
            {
              const ya = y0 + 5 * rp + 8;
              P.seg([[X(T_E), y0 + 8], [X(T_E), ya + 4]], C.new, 1.2, [3, 3]);
              P.arrow(X(T_E) + 1, ya, X(2) - 1, ya, C.new, 2, 8);
              P.arrow(X(2) - 1, ya, X(T_E) + 1, ya, C.new, 2, 8);
              T(ctx, C, "หน่วง " + nf(DELAY, 2) + " мс · อยู่ในช่วง " + nf(T_C, 0) + "…" + nf(2 * T_C, 0) + " Tц", (X(T_E) + X(2)) / 2, ya + 16, C.new, { size: narrow ? 11 : 12.5, wt: 700, align: "center", maxW: X(2) - X(T_E) + 20, min: 8.5 });
              ["0", nf(T_C, 2) + " мс", nf(2 * T_C, 2) + " мс"].forEach((t, k) => {
                T(ctx, C, t, Math.min(W - 24, X(k * T_C)), H - 9, C.ink3, { size: 10, wt: 600, align: "center" });
              });
            }
            ctx.restore();
          }

          if (aB < 0.99) sceneA(1 - aB);
          if (aB > 0.01) sceneB(aB);
        }
      });
    }
  });
})();
