/* js/subj/asu.js — แบบจำลองของวิชา asu (STD2) · สร้างโดย _work/std2/tools/assemble.py จาก _work/asustd2/demos/ — ห้ามแก้ไฟล์นี้ตรง ๆ แก้ที่ต้นฉบับแล้วประกอบใหม่ · โหลดโดย subjAssets() เมื่อเปิดวิชา · ห้ามแตะ document ที่ระดับบนสุด */
/* --- asu6-clock.js --- */
/* asu6-clock — ผัง СЧВО จากบนลงล่าง: НХВ → ช่องกระจาย → БХВ ของยาน → ЛХВ(П) ของผู้ใช้ → НСПП (УВ4)
   ที่มา: Л7 сл. 19 (ผัง СЧВО · ตัวชี้วัด Δf = (f₀ − f₁)/f₀ ต่อวัน · ระดับ Δf ของแต่ละกล่อง) · сл. 20 (НСПП 14Б761/762/763 สามชั้น)
     · ฉบับเดิม asu-6 หัวข้อ 7 (7.1–7.3) — ตัวเลขระดับ Δf และชื่อกล่องตามฉบับเดิมทุกตัว
   สูตร (ผู้เรียบเรียง): Δt ≈ Δf·T (T = 86 400 с) · ΔD = c·Δt (c = 299 792,458 км/с)
   ค่าอ้างอิง (python ตรวจแล้ว): 10⁻¹⁴ → 0,864 нс → 0,26 м · 10⁻¹³ → 8,64 нс → 2,59 м · 10⁻¹² → 86,4 нс → 25,9 м
     · 10⁻¹¹ → 0,864 мкс → 259 м · 10⁻⁸ → 864 мкс → 259 км · 1 мкс → 299,8 м ≈ 300 м
   ส่วนที่เป็นของผู้เรียบเรียง (บอกบนจอ): การคำนวณเวลาคลาดและระยะคลาดต่อวัน · มาตราส่วนลอการิทึมและแถบเดียวที่อ่านได้ทั้งสองหน่วย */
(function () {
  "use strict";
  const CL = 299792.458 * 1000;                // м/с
  const TD = 86400;                            // с ใน 1 วัน
  const nf = (v, d) => window.STEPS2.nf(v, d);
  const sig3 = v => nf(v, v >= 100 ? 0 : v >= 10 ? 1 : v >= 1 ? 2 : 3);
  const fmtT = t => t < 5e-7 ? sig3(t * 1e9) + " нс" : t < 1e-3 ? sig3(t * 1e6) + " мкс" : sig3(t * 1e3) + " мс";
  const fmtD = m => m < 1 ? nf(m, 2) + " м" : m < 1000 ? sig3(m) + " м" : sig3(m / 1000) + " км";
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const T_LO = 1e-10, T_HI = 2e-3;
  const SPAN = Math.log10(T_HI / T_LO);
  const fx = t => clamp01((Math.log10(t) + 10) / SPAN);

  /* แถว: ป้ายสองบรรทัด · Δf ต่ำ–สูง (null = ไม่มีตัวเลขในฉบับเดิม) · ขั้นที่ปรากฏ · สี */
  const SUP = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
  const pw = e => "10⁻" + String(e).split("").map(c => SUP[+c]).join("");   // pw(14) = 10⁻¹⁴
  const ROWS = [
    { a: "НХВ РФ · НХВ США", b: "~" + pw(14), lo: 14, hi: 14, k: 0, c: "ref" },
    { a: "ช่องกระจาย", b: "РВСТВ·ТВСТВ·КНС·СЕВ КВ", lo: null, k: 1, c: "ink" },
    { a: "БХВ КА ГЛОНАСС", b: "~" + pw(13), lo: 13, hi: 13, k: 2, c: "new" },
    { a: "БХВ КА прочих", b: pw(11) + "…" + pw(12), lo: 12, hi: 11, k: 2, c: "new" },
    { a: "ЛХВП потребителей", b: pw(8) + "…" + pw(11), lo: 11, hi: 8, k: 3, c: "meas" },
    { a: "НСПП 14Б761", b: "1 класс · Центр · " + pw(14), lo: 14, hi: 14, k: 4, c: "deep" },
    { a: "НСПП 14Б762", b: "2 класс · ЗПУ · " + pw(13), lo: 13, hi: 13, k: 4, c: "deep" },
    { a: "НСПП 14Б763", b: "3 класс · ОКИК · " + pw(12), lo: 12, hi: 12, k: 4, c: "deep" }
  ];
  const dT = e => Math.pow(10, -e) * TD;        // เวลาคลาดใน 1 วัน (с) ที่ Δf = 10⁻ᵉ
  const dD = e => dT(e) * CL;                   // ระยะคลาด (м)
  const unitOf = s => s.split(" ")[1];
  const join2 = (a, b) => unitOf(a) === unitOf(b) ? a.split(" ")[0] + "–" + b : a + "–" + b;   // 25,9–259 м · 86,4 нс–0,864 мкс
  const rng = r => r.lo === r.hi ? [fmtT(dT(r.lo)), fmtD(dD(r.lo))] : [join2(fmtT(dT(r.lo)), fmtT(dT(r.hi))), join2(fmtD(dD(r.lo)), fmtD(dD(r.hi)))];
  const ln = e => nf(dT(e) * 1e9, 3);           // ไม่ใช้ตรง ๆ — เก็บไว้ให้ตรวจเลข
  void ln;

  const STEPS = [
    { title: "หน่วยรักษาเวลาแห่งชาติ (НХВ) อยู่บนสุด",
      text: "ผัง СЧВО ไล่จากบนลงล่าง · บนสุดคือ НХВ (национальный хранитель времени) ของรัสเซีย (สไลด์เทียบกับของสหรัฐฯ ด้วยลูกศร Δt) ตัวชี้วัดคือความไม่เสถียรสัมพัทธ์ของความถี่ต่อวัน Δf — ยิ่งเล็กนาฬิกายิ่งดี",
      alt: "แถวบนสุดของผัง НХВ ระดับ Δf ประมาณ 10 ยกกำลังลบ 14 มีแถบสั้นมากบนมาตราส่วนลอการิทึม",
      nums: [
        { k: "Δf = (f₀ − f₁) / f₀ ต่อวัน", v: "~" + pw(14), big: true },
        { k: "คำนวณโดยผู้เรียบเรียง · เวลาคลาดใน 1 วัน (86 400 с)", v: "Δt = " + fmtT(dT(14)) + " · ΔD = " + fmtD(dD(14)) }
      ] },
    { title: "ช่องกระจายเวลาและความถี่",
      text: "จาก НХВ เวลาและความถี่ถูกกระจายลงไปทางสามช่องตามผัง: วิทยุและโทรทัศน์เวลาแม่นยำ (РВСТВ, ТВСТВ) · ระบบนำร่องดาวเทียม КНС (GPS, ГЛОНАСС) · ระบบเวลาเอกภาพของกองกำลังอวกาศ СЕВ КВ",
      alt: "แถวที่สองเป็นช่องกระจายเวลา ไม่มีตัวเลข Δf มีป้าย РВСТВ ТВСТВ КНС และ СЕВ КВ",
      nums: [
        { k: "สามช่องกระจาย", v: ["РВСТВ · ТВСТВ — วิทยุ/โทรทัศน์เวลา", "КНС — GPS, ГЛОНАСС", "СЕВ КВ — ระบบเวลาเอกภาพ"] },
        { k: "สิ่งที่ส่งลงไป", v: "ЧВИ — ข้อมูลความถี่-เวลา", note: "สไลด์ไม่ให้ Δf ของช่องกระจาย" }
      ] },
    { title: "นาฬิกาบนยาน (БХВ)",
      text: "ยานแต่ละดวงมีนาฬิกาบนยาน (бортовой хранитель времени · БХВ) ถือสเกลเวลาบนยาน · ยาน ГЛОНАСС ใช้นาฬิกาที่ดีกว่ายานทั่วไปประมาณหนึ่งถึงสองอันดับ",
      alt: "สองแถวของ БХВ ยาน ГЛОНАСС ระดับ 10 ยกกำลังลบ 13 และยานอื่นระดับ 10 ยกกำลังลบ 11 ถึงลบ 12 แถบยาวขึ้นตามลำดับ",
      nums: [
        { k: "БХВ КА ГЛОНАСС ~" + pw(13), v: "Δt = " + fmtT(dT(13)) + " · ΔD = " + fmtD(dD(13)), big: true },
        { k: "БХВ КА прочих " + pw(11) + "…" + pw(12), v: rng(ROWS[3]).join(" · ΔD = ").replace(/^/, "Δt = "), note: "ผู้เรียบเรียงคำนวณทั้งหมด: Δt = Δf · 86 400 с" }
      ] },
    { title: "นาฬิกาท้องถิ่นของผู้ใช้ (ЛХВП)",
      text: "ผู้ใช้ปลายทางมีหน่วยรักษาเวลาท้องถิ่น (локальный хранитель времени потребителя · ЛХВП) ที่หยาบที่สุดในผัง · ที่ระดับล่างสุด " + pw(8) + " ถ้าไม่ปรับเทียบเลยทั้งวัน เวลาคลาดเกือบ 1 мс",
      alt: "แถว ЛХВП ของผู้ใช้ระดับ 10 ยกกำลังลบ 8 ถึงลบ 11 แถบยาวที่สุดเกือบถึงปลายมาตราส่วน",
      nums: [
        { k: "ЛХВП потребителей", v: pw(8) + "…" + pw(11), big: true },
        { k: "ที่ " + pw(8) + " (ผู้เรียบเรียงคำนวณ)", v: "Δt = " + fmtT(dT(8)) + " · ΔD = " + fmtD(dD(8)) },
        { k: "ที่ " + pw(11), v: "Δt = " + fmtT(dT(11)) + " · ΔD = " + fmtD(dD(11)) }
      ] },
    { title: "НСПП สามชั้นความแม่นยำ",
      text: "เครื่องรับเวลาภาคพื้นประจำที่ (НСПП) สร้างและเก็บสเกลเวลามาตรฐานแล้วจ่ายสัญญาณและรหัสเวลาที่ผูกกับ UTC (SU) ให้ผู้ใช้ · สามชั้นลดหลั่นจากศูนย์ → ศูนย์สำรอง → สถานี",
      alt: "สามแถวของ НСПП 14Б761 ชั้น 1 ที่ศูนย์ 14Б762 ชั้น 2 ที่ ЗПУ และ 14Б763 ชั้น 3 ที่ ОКИК แถบยาวขึ้นตามลำดับ",
      nums: [
        { k: "14Б761 · 1 класс · Центр", v: pw(14) + " → " + fmtT(dT(14)) + " · " + fmtD(dD(14)) },
        { k: "14Б762 · 2 класс · ЗПУ", v: pw(13) + " → " + fmtT(dT(13)) + " · " + fmtD(dD(13)) },
        { k: "14Б763 · 3 класс · ОКИК", v: pw(12) + " → " + fmtT(dT(12)) + " · " + fmtD(dD(12)), note: "ผู้เรียบเรียงคำนวณเวลาคลาดและระยะคลาดต่อวัน" }
      ] },
    { title: "ทำไมต้องมีผังนี้: โยงกลับวิธีไม่ต้องถาม",
      text: "วิธีไม่ต้องถาม (беззапросный) ได้ระยะจากเวลาทางเดียว ΔD = c·Δt จึงต้องมีนาฬิกายานกับสถานีตรงกัน · เทียบกับเส้นอ้างอิง 1 мкс บนกราฟ: นาฬิกาที่คลาดแค่ 1 мкс ระยะก็ผิด ≈ 300 м — ผังนี้คือเหตุผลที่ СБНО ต้องพึ่ง СЧВО",
      alt: "เส้นประแนวตั้งที่ 1 ไมโครวินาที พาดผ่านทุกแถว มีเพียงแถบของ ЛХВП ที่ยาวเลยเส้น บอกว่านาฬิกาที่คลาดเกินนี้ทำให้ระยะผิดราว 300 เมตร",
      nums: [
        { k: "ผลต่อเนื่อง (ผู้เรียบเรียง)", v: "Δt ≈ Δf · T  ·  ΔD = c · Δt", big: true, note: "T = 86 400 с · c = 299 792,458 км/с" },
        { k: "นาฬิกายานกับสถานีคลาดกัน 1 мкс", v: "ΔD = " + nf(CL * 1e-6, 1) + " м ≈ 300 м" }
      ] }
  ];

  Object.assign(DEMOS, {
    "asu6-clock": function (host) {
      return window.STEPS2(host, {
        label: "แอนิเมชันทีละขั้น",
        title: 'ผัง СЧВО จากบนลงล่าง: Δf → เวลาคลาด → ระยะคลาด <span style="white-space:nowrap">(лек. 7, сл. 19–20)</span>',
        aria: "แอนิเมชันทีละขั้น ผังระบบความถี่และเวลา СЧВО จากหน่วยรักษาเวลาแห่งชาติถึงผู้ใช้ พร้อมแถบเวลาคลาดและระยะคลาดต่อวัน",
        legend: [
          { cls: "lg-ref", text: "НХВ" },
          { cls: "lg-new", text: "БХВ (ยาน)" },
          { cls: "lg-meas", text: "ЛХВП (ผู้ใช้)" },
          { cls: "lg-deep", text: "НСПП", color: "var(--s2-deep)" }
        ],
        steps: STEPS,
        caption: "ที่มา: Л7 сл. 19 (ผัง СЧВО · ระดับ Δf ของแต่ละกล่อง) · сл. 20 (НСПП สามชั้น) · แถบแสดงเวลาคลาดใน 1 วัน Δt = Δf·86 400 с และระยะคลาด ΔD = c·Δt ที่ผู้เรียบเรียงคำนวณ — มาตราส่วนลอการิทึม แถบเดียวอ่านได้ทั้งสองหน่วย · ช่วงสีจางคือช่วง Δf ที่สไลด์ให้เป็นช่วง",
        height: w => Math.round(Math.min(440, Math.max(390, w * 0.64))),
        duration: () => 1000,
        draw(ctx, W, H, step, C, anim) {
          const P = window.STEPS2.pen(ctx, W, H, C);
          const nar = W < 560, pad = 8;
          const labW = nar ? 122 : Math.min(250, Math.round(W * 0.3));
          const txtW = nar ? 108 : 160;
          const bx0 = pad + labW + 10, bx1 = W - pad - txtW, barW = bx1 - bx0;
          const top = 8, axisH = 44, rowH = (H - top - axisH) / ROWS.length, boxH = rowH - 6;
          const X = t => bx0 + barW * fx(t);
          function font(sz, wt, mono) { ctx.font = (wt || 600) + " " + sz.toFixed(1) + "px " + (mono ? C.mono : C.font); }
          function fit(txt, maxW, sz, wt) { font(sz, wt); let s = sz; while (s > 8.5 && ctx.measureText(txt).width > maxW) { s -= 0.5; font(s, wt); } return s; }
          function rr(x, y, w, h, r) {
            ctx.beginPath();
            ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
            ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
          }
          const act = k => k === 0 ? step === 0 : k === 1 ? step === 1 : k === 2 ? step === 2 : k === 3 ? step === 3 : step === 4;

          /* เส้นกริดทุกเดคาดของมาตราส่วนลอการิทึม */
          ctx.save(); ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
          for (let e = -9; e <= -3; e++) { const x = Math.round(X(Math.pow(10, e))) + 0.5; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, H - axisH + 4); ctx.stroke(); }
          ctx.restore();
          ctx.save(); ctx.strokeStyle = C.line2; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(bx0, H - axisH + 4.5); ctx.lineTo(bx1 + 4, H - axisH + 4.5); ctx.stroke(); ctx.restore();

          /* แกน: เวลา (บน) · ระยะ (ล่าง) — c·1 нс = 0,3 м */
          [[1e-9, "1 нс", "0,3 м"], [1e-6, "1 мкс", "300 м"], [1e-3, "1 мс", "300 км"]].forEach(a => {
            const x = X(a[0]);
            P.label(a[1], x, H - axisH + 17, C.meas, { size: 10.5, weight: 600, align: "center", halo: 0 });
            P.label(a[2], x, H - axisH + 32, C.lin, { size: 10.5, weight: 600, align: "center", halo: 0 });
          });
          P.label("Δt/วัน", pad, H - axisH + 17, C.meas, { size: 10.5, weight: 700, halo: 0 });
          P.label("ΔD", pad, H - axisH + 32, C.lin, { size: 10.5, weight: 700, halo: 0 });

          /* แถว */
          ROWS.forEach((r, i) => {
            const y = top + i * rowH, appear = anim.fade(r.k), cy = y + boxH / 2;
            const on = act(r.k) || step === 5;
            const colr = r.c === "ink" ? C.ink2 : C[r.c];
            ctx.save();
            ctx.globalAlpha = 0.14 + 0.86 * appear;
            rr(pad, y, labW, boxH, 7);
            ctx.fillStyle = on ? C.wash : C.bg; ctx.fill();
            ctx.setLineDash(step < r.k ? [4, 3] : []);
            ctx.lineWidth = on && step !== 5 ? 2.4 : 1.3; ctx.strokeStyle = step < r.k ? C.line2 : colr; ctx.stroke(); ctx.setLineDash([]);
            font(nar ? 11.5 : 13, 700); fit(r.a, labW - 12, nar ? 11.5 : 13, 700);
            ctx.fillStyle = on ? colr : C.ink; ctx.textAlign = "left"; ctx.textBaseline = "middle";
            ctx.fillText(r.a, pad + 7, y + boxH * 0.32);
            fit(r.b, labW - 12, nar ? 9.5 : 11, 500); ctx.fillStyle = C.ink2;
            ctx.fillText(r.b, pad + 7, y + boxH * 0.71);
            /* ลูกศรลงไปแถวถัดไป */
            if (i < 2) P.arrow(pad + labW - 16, y + boxH, pad + labW - 16, y + rowH + 1, step < r.k ? C.line2 : C.ink3, 1.3, 5);
            ctx.restore();

            ctx.save();
            ctx.globalAlpha = appear;
            if (r.lo !== null) {
              const g = step >= r.k ? (anim.from >= r.k ? 1 : anim.e) : (anim.from >= r.k ? 1 - anim.p : 0);
              const x0 = bx0, xl = x0 + (X(dT(r.lo)) - x0) * g, xh = x0 + (X(dT(r.hi)) - x0) * g, bh = Math.min(14, boxH * 0.42);
              ctx.fillStyle = colr; ctx.fillRect(x0, cy - bh / 2, Math.max(2, xl - x0), bh);
              if (r.hi !== r.lo) {
                ctx.globalAlpha = appear * 0.38; ctx.fillRect(xl, cy - bh / 2, Math.max(0, xh - xl), bh);
                ctx.globalAlpha = appear; ctx.strokeStyle = colr; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]); ctx.strokeRect(xl + 0.5, cy - bh / 2 + 0.5, Math.max(0, xh - xl - 1), bh - 1); ctx.setLineDash([]);
              }
              const tx = rng(r);
              ctx.globalAlpha = appear * clamp01(g * 1.4);
              fit(tx[0], txtW - 6, nar ? 10.5 : 12, 600); ctx.fillStyle = C.meas; ctx.textAlign = "left"; ctx.textBaseline = "middle";
              ctx.fillText(tx[0], bx1 + 8, cy - boxH * 0.2);
              fit(tx[1], txtW - 6, nar ? 10.5 : 12, 600); ctx.fillStyle = C.lin;
              ctx.fillText(tx[1], bx1 + 8, cy + boxH * 0.22);
            } else if (step !== 5) {
              fit("ส่งต่อ ЧВИ ลงไปถึงผู้ใช้", barW + txtW - 4, nar ? 11 : 12.5, 500); ctx.fillStyle = C.ink2;
              ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText("ส่งต่อ ЧВИ ลงไปถึงผู้ใช้", bx0 + 4, cy);
            }
            ctx.restore();
          });

          /* ขั้น 6: เส้นอ้างอิง Δt = 1 мкс ↔ ΔD ≈ 300 м */
          const a5 = anim.fade(5);
          if (a5 > 0) {
            const x = X(1e-6);
            ctx.save(); ctx.globalAlpha = a5;
            P.seg([[x, top], [x, H - axisH + 4]], C.new, 2, [6, 4]);
            const cy1 = top + 1 * rowH + boxH / 2;
            P.label("1 мкс ≈ 300 м", x - 6, cy1, C.new, { size: nar ? 11 : 12.5, weight: 700, align: "right" });
            ctx.restore();
          }
        }
      });
    }
  });
})();
/* --- asu6-flow.js --- */
/* asu6-flow — วงจรข้อมูลของ СБНО (УВ2): КА → РТС → АКОТИ → БЦ → (НУ · ЭИ · ЦУ) → ОКИК → КА รอบถัดไป
   ที่มา: Л7 сл. 10–11 (ИТНП · НУ · ЭИ) · сл. 12 (งานปฐมภูมิ/ทุติยภูมิ) · сл. 13 (ผังโครงสร้าง СБНО) · сл. 17 (ประมวลผลเบื้องต้น 4 ขั้น)
     · ฉบับเดิม asu-6 หัวข้อ 3–5 · ไม่มีสูตร (ข้อความที่ขึ้นจอยกจากนิยามบนสไลด์)
   ส่วนที่เป็นของผู้เรียบเรียง (บอกบนจอ): การจัดวางกล่องและลำดับขั้นของแอนิเมชัน (สไลด์ 13 เป็นผังนิ่ง) · ภาพรวม «วงปิด» */
(function () {
  "use strict";
  const clamp01 = x => Math.max(0, Math.min(1, x));

  const STEPS = [
    { title: "ยานผ่านสถานี: РТС วัด ИТНП",
      text: "ยานเข้าเขตมองเห็นของสถานี (ОКИК) · РТС (радиотехнические средства) หันจานตาม ЦУ (целеуказания) ที่คำนวณไว้จากรอบก่อน ติดตามยานผ่านช่องวิทยุกับ БКУ บนยาน แล้ววัด ИТНП (ระยะ ความเร็วเชิงรัศมี ทิศ)",
      alt: "กล่องยาน КА ส่งลูกศรสีเหลืองอำพันป้าย ИТНП ไปที่กล่อง РТС ของสถานี ОКИК",
      nums: [
        { k: "РТС วัด", v: "ИТНП = D · v<sub>r</sub> · азимут · угол места" },
        { k: "จานหันตาม", v: "ЦУ ของรอบก่อน", note: "ЦУ = มุมหันจานตามเวลา (азимут, угол места)" }
      ] },
    { title: "ประมวลผลเบื้องต้นที่ ОКИК (АКОТИ)",
      text: "АКОТИ รับ ИТНП จาก РТС แล้วทำสี่ขั้นตามสไลด์ 17: เฉลี่ยและใส่ค่าแก้ → ประทับเวลา (จาก ПП СЕВ) → บันทึกเป็นชุดข้อมูล → เข้ารหัสทนสัญญาณรบกวนแล้วส่งขึ้นสายสื่อสารไป БЦ",
      alt: "ลูกศร ИТНП จาก РТС ไปกล่อง АКОТИ ซึ่งสว่างขึ้น แถบล่างแสดงขั้นประมวลผลสี่ขั้น",
      nums: [
        { k: "สี่ขั้น (คำตอบข้อสอบ — ต้องตอบให้ครบ)", v: ["① осреднение (หาค่าเฉลี่ย), ввод поправок (ใส่ค่าแก้)", "② привязка ко времени", "③ запись в память ЭВМ", "④ кодирование и выдача в линию связи с БЦ"] }
      ] },
    { title: "ส่ง ИТНП ไป БЦ",
      text: "ИТНП ที่ประมวลแล้วออกจาก ОКИК ผ่านระบบสื่อสารและส่งข้อมูล (СС и ПД) ไปศูนย์ขีปนวิถี (БЦ) ซึ่งรวมข้อมูลจากทุกสถานี",
      alt: "ลูกศร ИТНП จาก АКОТИ ไปกล่อง БЦ สีม่วงซึ่งสว่างขึ้น",
      nums: [
        { k: "กระแสข้อมูลขึ้น", v: "ИТНП → БЦ", big: true, note: "ดิบจากสถานี: D, v<sub>r</sub>, азимут, угол места" }
      ] },
    { title: "БЦ หา НУ (งานปฐมภูมิ 1)",
      text: "БЦ แก้ปัญหาผกผัน: จากชุด D, v<sub>r</sub> ของหลายสถานีหลายเวลา หาเวกเตอร์หกค่าที่อธิบายค่าวัดทั้งหมดได้ดีที่สุด (метод наименьших квадратов) ได้ НУ ณ เวลา t แล้วส่งลงมาที่ ОКИК",
      alt: "กล่อง БЦ ส่งลูกศรสีม่วงป้าย НУ กลับไปที่ АКОТИ",
      nums: [
        { k: "НУ — начальные условия", v: "(x, y, z, V<sub>x</sub>, V<sub>y</sub>, V<sub>z</sub>) ณ เวลา t", big: true, note: "หรือหกธาตุวงโคจรเคปเลอร์ (a, e, i, Ω, ω, τ)" },
        { k: "ทำไมต้องหกค่า", v: "สมการการเคลื่อนที่อันดับสองในสามมิติ" }
      ] },
    { title: "พยากรณ์ → ЭИ (งานปฐมภูมิ 2)",
      text: "จาก НУ อินทิเกรตไปข้างหน้า (ปัญหาตรง) ได้ตารางตำแหน่งที่พยากรณ์ของยานตามเวลา คือ ЭИ (эфемеридная информация) — ผู้ใช้ทุกคนต้องการ: ОКИК, ЦУП (ศูนย์ควบคุมการบิน) และยานเอง",
      alt: "กล่อง БЦ ส่งลูกศรสีน้ำเงินป้าย ЭИ ไปที่ АКОТИ ต่อจาก НУ",
      nums: [
        { k: "ЭИ — эфемеридная информация", v: "точки прогнозируемого положения КА с привязкой ко времени", big: true },
        { k: "เทียบกับ НУ", v: "НУ กะทัดรัด (6 ค่า + เวลา) · ЭИ ใหญ่แต่พร้อมใช้" }
      ] },
    { title: "งานทุติยภูมิ: ใช้ НУ และ ЭИ ต่อ",
      text: "งานทุติยภูมิของ СБНО ใช้ НУ/ЭИ เป็นข้อมูลตั้งต้น (สไลด์ 12) · БЦ ส่ง НУ ลงไปที่ ПУ ЦУП (กลุ่มวางแผน ГП ใช้สร้างแผนปฏิบัติการ ОП) และที่ БГ ของ ОКИК (คำนวณ ЦУ ให้ РТС)",
      alt: "ลูกศร НУ แตกจาก БЦ ไปที่ ПУ ЦУП และจาก АКОТИ ไปที่กล่อง БГ",
      nums: [
        { k: "งานทุติยภูมิ (บางข้อ)", v: ["расчёт ЗРВ · расчёт ЦУ", "освещённость (การได้รับแสงอาทิตย์) · коррекция орбиты (การปรับวงโคจร)", "время существования · трасса полёта"] },
        { k: "ปลายทางของ НУ", v: "ПУ ЦУП (КП → ГП → ОП) · БГ ของ ОКИК" }
      ] },
    { title: "ЦУ และ ЭИ กลับไปที่ РТС: วงปิด",
      text: "БГ คำนวณ ЦУ จาก НУ ส่งให้ РТС พร้อม ЭИ ที่มาจาก АКОТИ · РТС ใช้หันจานติดตามยานในรอบถัดไป ได้ ИТНП ชุดใหม่ วงจึงปิด (СКПО ก็ต้องมี ЦУ กับอีเฟเมริส (эфемериды) เช่นกัน)",
      alt: "ลูกศร ЦУ จาก БГ และ ЭИ จาก АКОТИ ไปที่ РТС และลูกศรประโค้งจาก РТС กลับไปยาน КА แสดงรอบถัดไป",
      nums: [
        { k: "สองกระแสลงจาก БЦ", v: "НУ · ЭИ", note: "ЦУ ไม่ได้มาจาก БЦ — БГ ของสถานีคำนวณจาก НУ" },
        { k: "หนึ่งกระแสขึ้นสู่ БЦ", v: "ИТНП", note: "ข้อมูลใหม่ในรอบถัดไป" }
      ] }
  ];

  /* กล่อง: ชื่อ · บรรทัดรอง · สี · ขั้นแรกที่เกี่ยวข้อง · ขั้นที่เรืองแสง */
  const BX = [
    { t: "КА", s: "БКУ · ยาน", c: "new", f: 0, on: [0, 6] },
    { t: "РТС", s: "วัด ИТНП · ОКИК", c: "ref", f: 0, on: [0, 6] },
    { t: "АКОТИ", s: "ประมวลผลเบื้องต้น", c: "ref", f: 1, on: [1, 2] },
    { t: "БЦ", s: "ศูนย์ขีปนวิถี", c: "deep", f: 2, on: [2, 3, 4, 5] },
    { t: "БГ", s: "กลุ่มขีปนวิถี ОКИК", c: "ref", f: 5, on: [5, 6] },
    { t: "ПУ ЦУП", s: "КП → ГП · แผน ОП", c: "ink", f: 5, on: [5] }
  ];
  const STRIP = [
    ["РТС วัด ИТНП: D · v_r · азимут · угол места", "จานหันตาม ЦУ ที่คำนวณไว้จากรอบก่อน"],
    ["① осреднение, ввод поправок (при необходимости)", "② привязка ко времени (ПП СЕВ → метки времени)", "③ запись информационных посылок в память ЭВМ", "④ кодирование помехоустойчивым кодом → линия связи с БЦ"],
    ["ИТНП → БЦ ผ่านระบบสื่อสารและส่งข้อมูล (СС и ПД)", "ข้อมูลที่เข้ารหัสทนสัญญาณรบกวนแล้ว"],
    ["งานปฐมภูมิ 1 · НУ = (x, y, z, V_x, V_y, V_z) ณ เวลา t", "ปัญหาผกผัน: หาหกค่าจากค่าวัดหลายสถานีด้วยวิธีกำลังสองน้อยที่สุด (МНК)"],
    ["งานปฐมภูมิ 2 · прогнозирование → ЭИ", "ปัญหาตรง: อินทิเกรตจาก НУ ได้ตารางตำแหน่งตามเวลา"],
    ["งานทุติยภูมิใช้ НУ/ЭИ: ЗРВ · ЦУ · освещённость · трасса …", "ПУ ЦУП (КП → ГП) ใช้ НУ สร้าง ОП", "БГ ใช้ НУ คำนวณ ЦУ ให้ РТС"],
    ["ЦУ → РТС (หันจานรอบถัดไป) · ЭИ → РТС", "วงปิด: ยานผ่านสถานีรอบใหม่ → ИТНП ชุดใหม่"]
  ];

  function lay(W, H) {
    const wide = W >= 640, NH = W >= 640 ? 98 : 88, pad = 10;
    let B, y0;
    if (wide) {
      const gap = 46, bw = (W - 2 * pad - 3 * gap) / 4, bh = 64, vg = 62;
      y0 = Math.max(26, Math.round((H - NH - (2 * bh + vg)) / 2));
      const cell = (c, r) => ({ x: pad + c * (bw + gap), y: y0 + r * (bh + vg), w: bw, h: bh });
      B = [cell(0, 0), cell(1, 0), cell(2, 0), cell(3, 0), cell(2, 1), cell(3, 1)];
    } else {
      const gap = 40, bw = (W - 2 * pad - gap) / 2, bh = 50, vg = 42;
      y0 = 30;
      const cell = (c, r) => ({ x: pad + c * (bw + gap), y: y0 + r * (bh + vg), w: bw, h: bh });
      B = [cell(0, 0), cell(1, 0), cell(1, 1), cell(1, 2), cell(0, 1), cell(0, 2)];
    }
    return { wide, B, NH, y0, strip: { x: pad, y: H - NH + 6, w: W - 2 * pad, h: NH - 12 } };
  }
  function an(b, side, off) {
    off = off || 0;
    if (side === "l") return [b.x, b.y + b.h / 2 + off];
    if (side === "r") return [b.x + b.w, b.y + b.h / 2 + off];
    if (side === "t") return [b.x + b.w / 2 + off, b.y];
    return [b.x + b.w / 2 + off, b.y + b.h];                     // "b"
  }
  /* ลูกศร: จุดต้น/ปลาย (ดัชนีกล่อง, ด้าน, ระยะเลื่อนตามขอบ) · k = ขั้นที่ปรากฏ */
  function arrows(L) {
    const B = L.B, w = L.wide;
    const A = [];
    if (w) {
      A.push({ k: 0, c: "meas", lab: "ИТНП", p: [an(B[0], "r"), an(B[1], "l")] });
      A.push({ k: 1, c: "meas", lab: "ИТНП", p: [an(B[1], "r", -18), an(B[2], "l", -18)] });
      A.push({ k: 2, c: "meas", lab: "ИТНП", p: [an(B[2], "r", -18), an(B[3], "l", -18)] });
      A.push({ k: 3, c: "deep", lab: "НУ", p: [an(B[3], "l", 0), an(B[2], "r", 0)] });
      A.push({ k: 4, c: "lin", lab: "ЭИ", p: [an(B[3], "l", 18), an(B[2], "r", 18)] });
      A.push({ k: 5, c: "deep", lab: "НУ", p: [an(B[3], "b"), an(B[5], "t")] });
      A.push({ k: 5, c: "deep", lab: "НУ", p: [an(B[2], "b"), an(B[4], "t")] });
      A.push({ k: 6, c: "lin", lab: "ЭИ", p: [an(B[2], "l", 18), an(B[1], "r", 18)] });
      const q0 = an(B[4], "l"), q2 = an(B[1], "b");
      A.push({ k: 6, c: "ref", lab: "ЦУ", p: [q0, [q2[0], q0[1]], q2], labAt: [q2[0] + 16, q0[1] - 11] });
    } else {
      A.push({ k: 0, c: "meas", lab: "ИТНП", p: [an(B[0], "r"), an(B[1], "l")] });
      A.push({ k: 1, c: "meas", lab: "ИТНП", p: [an(B[1], "b", -26), an(B[2], "t", -26)] });
      A.push({ k: 2, c: "meas", lab: "ИТНП", p: [an(B[2], "b", -26), an(B[3], "t", -26)] });
      A.push({ k: 3, c: "deep", lab: "НУ", p: [an(B[3], "t", 0), an(B[2], "b", 0)] });
      A.push({ k: 4, c: "lin", lab: "ЭИ", p: [an(B[3], "t", 26), an(B[2], "b", 26)] });
      A.push({ k: 5, c: "deep", lab: "НУ", p: [an(B[3], "l"), an(B[5], "r")] });
      A.push({ k: 5, c: "deep", lab: "НУ", p: [an(B[2], "l"), an(B[4], "r")] });
      A.push({ k: 6, c: "lin", lab: "ЭИ", p: [an(B[2], "t", 26), an(B[1], "b", 26)] });
      A.push({ k: 6, c: "ref", lab: "ЦУ", p: [[B[4].x + B[4].w - 12, B[4].y], [B[1].x + 12, B[1].y + B[1].h]], labAt: "mid" });
    }
    return A;
  }

  Object.assign(DEMOS, {
    "asu6-flow": function (host) {
      return window.STEPS2(host, {
        label: "แอนิเมชันทีละขั้น",
        title: 'วงจรข้อมูลของ СБНО: จากค่าวัดถึง ЦУ รอบถัดไป <span style="white-space:nowrap">(лек. 7, сл. 10–13)</span>',
        aria: "แอนิเมชันทีละขั้น วงจรข้อมูลของระบบ СБНО จากการวัด ИТНП ถึงการส่ง ЦУ และ ЭИ กลับ",
        legend: [
          { cls: "lg-meas", text: "ИТНП (ขึ้นไป БЦ)" },
          { cls: "lg-deep", text: "НУ", color: "var(--s2-deep)" },
          { cls: "lg-lin", text: "ЭИ" },
          { cls: "lg-ref", text: "ЦУ · กล่อง ОКИК" }
        ],
        steps: STEPS,
        caption: "ที่มา: Л7 сл. 10–11 (นิยาม ИТНП · НУ · ЭИ) · сл. 12 (งานของ СБНО) · сл. 13 (ผังโครงสร้าง) · сл. 17 (ประมวลผลเบื้องต้นสี่ขั้น) · ผู้เรียบเรียงเรียงขั้นและจัดวางกล่องเป็นแอนิเมชันจากผังนิ่งบนสไลด์ 13 ผังจริงมีบล็อก СС и ПД และ ПП СЕВ เพิ่ม (ดูตารางในเจาะลึก)",
        height: w => w >= 640 ? Math.round(Math.min(440, Math.max(380, w * 0.5))) : 382,
        duration: () => 1100,
        draw(ctx, W, H, step, C, anim) {
          const P = window.STEPS2.pen(ctx, W, H, C);
          const L = lay(W, H), nar = !L.wide;
          const A = arrows(L);
          const col = k => C[k];
          function font(sz, wt) { ctx.font = (wt || 600) + " " + sz.toFixed(1) + "px " + C.font; }
          function fit(txt, maxW, sz, wt) {
            font(sz, wt); let s = sz;
            while (s > 8.5 && ctx.measureText(txt).width > maxW) { s -= 0.5; font(s, wt); }
            return s;
          }
          function rr(b, r) {
            ctx.beginPath();
            ctx.moveTo(b.x + r, b.y); ctx.arcTo(b.x + b.w, b.y, b.x + b.w, b.y + b.h, r); ctx.arcTo(b.x + b.w, b.y + b.h, b.x, b.y + b.h, r);
            ctx.arcTo(b.x, b.y + b.h, b.x, b.y, r); ctx.arcTo(b.x, b.y, b.x + b.w, b.y, r); ctx.closePath();
          }
          const flen = pts => { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; };
          function along(pts, f) {
            let rest = f * flen(pts);
            for (let i = 1; i < pts.length; i++) {
              const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
              if (rest <= l || i === pts.length - 1) { const u = l ? clamp01(rest / l) : 0; return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u]; }
              rest -= l;
            }
            return pts[pts.length - 1];
          }

          /* ---------- ลูกศรข้อมูล ---------- */
          A.forEach(a => {
            const on = step >= a.k, act = step === a.k;
            const pts = a.p;
            const dx = pts[pts.length - 1][0] - pts[pts.length - 2][0], dy = pts[pts.length - 1][1] - pts[pts.length - 2][1];
            const dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl;
            const e = pts.slice(); e[0] = [pts[0][0] + (pts.length === 2 ? (pts[1][0] - pts[0][0]) / flen(pts) * 3 : 0), pts[0][1] + (pts.length === 2 ? (pts[1][1] - pts[0][1]) / flen(pts) * 3 : 0)];
            e[e.length - 1] = [pts[pts.length - 1][0] - ux * 3, pts[pts.length - 1][1] - uy * 3];
            ctx.save();
            if (!on) {
              ctx.globalAlpha = 0.4; P.seg(e, C.line2, 1.2, [4, 4]);
            } else {
              const af = anim.fade(a.k);
              ctx.globalAlpha = 0.5 + 0.5 * af;
              const colr = act ? col(a.c) : C.ink3, wd = act ? 2.4 : 1.5;
              if (e.length > 2) P.seg(e.slice(0, -1), colr, wd);
              const q = e[e.length - 2], z = e[e.length - 1];
              P.arrow(q[0], q[1], z[0], z[1], colr, wd, act ? 9 : 7);
              if (act && anim.p < 1) {
                for (let j = 0; j < 3; j++) { const m = along(e, (anim.p * 1.8 + j / 3) % 1); P.dot(m[0], m[1], 3.4, col(a.c)); }
              }
              ctx.globalAlpha = 0.45 + 0.55 * af;
              let lp;
              if (a.labAt === "mid") lp = [(pts[0][0] + pts[1][0]) / 2 + 17, (pts[0][1] + pts[1][1]) / 2];
              else if (a.labAt) lp = a.labAt;
              else { const m = along(pts, 0.5); lp = [m[0], m[1]]; }
              P.label(a.lab, lp[0], lp[1], act ? col(a.c) : C.ink2, { size: nar ? 10.5 : 11.5, weight: 700, align: "center", halo: 3.5 });
            }
            ctx.restore();
          });

          /* วงปิด: РТС → КА (รอบถัดไป) */
          {
            const a6 = anim.fade(6);
            if (a6 > 0) {
              const u = L.B[1], k = L.B[0], yy = Math.max(14, Math.min(u.y, k.y) - 14);
              ctx.save(); ctx.globalAlpha = a6;
              P.seg([[u.x + u.w / 2, u.y], [u.x + u.w / 2, yy], [k.x + k.w / 2, yy]], C.ref, 1.8, [6, 4]);
              P.arrow(k.x + k.w / 2, yy, k.x + k.w / 2, k.y - 1, C.ref, 1.8, 8);
              P.label("รอบถัดไป", (u.x + u.w / 2 + k.x + k.w / 2) / 2, yy, C.ref, { size: nar ? 10.5 : 11.5, weight: 700, align: "center", halo: 3.5 });
              ctx.restore();
            }
          }

          /* ---------- กล่อง ---------- */
          L.B.forEach((b, i) => {
            const d = BX[i], colr = d.c === "ink" ? C.ink2 : col(d.c);
            const seen = anim.fade(d.f), act = d.on.indexOf(step) >= 0;
            ctx.save();
            ctx.globalAlpha = 0.38 + 0.62 * seen;
            rr(b, 9);
            ctx.fillStyle = act ? C.wash : C.bg; ctx.fill();
            ctx.setLineDash(step < d.f ? [5, 4] : []);
            ctx.lineWidth = act ? 2.6 : 1.4; ctx.strokeStyle = step < d.f ? C.line2 : colr; ctx.stroke(); ctx.setLineDash([]);
            font(nar ? 14 : 16, 700); ctx.fillStyle = act ? colr : C.ink; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(d.t, b.x + b.w / 2, b.y + b.h * (nar ? 0.38 : 0.36));
            fit(d.s, b.w - 12, nar ? 10.5 : 12, 500); ctx.fillStyle = C.ink2;
            ctx.fillText(d.s, b.x + b.w / 2, b.y + b.h * (nar ? 0.74 : 0.72));
            ctx.restore();
          });
          if (L.wide && step === 1) {                               // ПП СЕВ ป้อนเวลาให้ АКОТИ (สไลด์ 13)
            const b = L.B[2];
            ctx.save(); ctx.globalAlpha = anim.fade(1);
            P.arrow(b.x + b.w / 2, b.y - 20, b.x + b.w / 2, b.y - 1, C.ink3, 1.5, 7);
            P.label("ПП СЕВ · เวลา", b.x + b.w / 2, b.y - 28, C.ink2, { size: 11, weight: 600, align: "center" });
            ctx.restore();
          }
          if (step === 2) {                                         // ช่องสื่อสาร СС и ПД ระหว่าง ОКИК กับ БЦ
            const s = L.B[2], t = L.B[3];
            ctx.save(); ctx.globalAlpha = anim.fade(2);
            const lp = L.wide ? [(s.x + s.w + t.x) / 2, s.y + s.h / 2 + 34] : [s.x + s.w / 2 + 26, (s.y + s.h + t.y) / 2];
            P.label("СС и ПД", lp[0], lp[1], C.ink2, { size: nar ? 10.5 : 11.5, weight: 600, align: L.wide ? "center" : "left" });
            ctx.restore();
          }

          /* ---------- แถบหมายเหตุประจำขั้น ---------- */
          const sp = L.strip, lines = STRIP[step];
          ctx.save();
          rr(sp, 8); ctx.fillStyle = C.sunk; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = C.line; ctx.stroke();
          ctx.globalAlpha = anim.from === step ? 1 : clamp01(anim.p * 1.6);
          const lh = lines.length > 3 ? 16.5 : lines.length > 2 ? 18 : 20, top = sp.y + (sp.h - lh * lines.length) / 2 + lh / 2;
          lines.forEach((t, i) => {
            fit(t, sp.w - 16, nar ? 11 : 12.5, i === 0 && lines.length < 4 ? 600 : 500);
            ctx.fillStyle = i === 0 && lines.length < 4 ? C.ink : C.ink2; ctx.textAlign = "left"; ctx.textBaseline = "middle";
            ctx.fillText(t, sp.x + 9, top + i * lh);
          });
          ctx.restore();
        }
      });
    }
  });
})();
/* --- asu6-ways.js --- */
/* asu6-ways — สามวิธีสร้างสัญญาณวัดวิถีใน ИТНП (УВ1): а) прямой → отражённый · б) запросный → ответный · в) сигнал КА · ดอปเปลอร์
   ที่มา: Л7 сл. 8 (рис. 3.3.1 а/б/в) · ฉบับเดิม asu-6 หัวข้อ 1–2 · สูตรทางเดียวของ Л14 сл. 6: d_j = c·(t_п − t_j), v_rj = c·(f_п − f_j)/f_j
   สูตรที่ใช้: D = c·τ/2 (แบบถามตอบ τ = เวลาไป-กลับ) · D = c·(t_прм − t_изл) (ทางเดียว) · Δf = f₀·v_r/c ↔ v_r = c·Δf/f₀ (ทางเดียว: ยานส่ง สถานีรับ)
   ค่าอ้างอิง (python ตรวจแล้ว): c = 299 792,458 км/с · D = 2 000 км → τ = 13,34 мс · ทางเดียว 6,67 мс · นาฬิกาคลาด 1 мкс → ΔD = 299,8 м ≈ 300 м
     f₀ = 2 ГГц, v_r = 3 км/с → Δf = 20,01 кГц
   ส่วนที่เป็นของผู้เรียบเรียง (บอกบนจอ): ค่าตัวอย่าง D, f₀, v_r · ภาพเส้นเวลา · การขยายความถี่ที่เพี้ยนในภาพคลื่น (ไม่ตามมาตราส่วน) · เหตุผลดัดแปลงสูตรแบบไป-กลับ (หารสอง) */
(function () {
  "use strict";
  const CL = 299792.458;                       // км/с
  const D0 = 2000;                             // км — ตัวอย่างของผู้เรียบเรียง
  const TAU = 2 * D0 / CL * 1000;              // мс ไป-กลับ
  const T1 = D0 / CL * 1000;                   // мс ทางเดียว
  const TMAX = 14;                             // มาตราส่วนเส้นเวลา (мс)
  const F0 = 2e9, VR = 3;                      // Гц · км/с — ตัวอย่างของผู้เรียบเรียง
  const DF = F0 * VR / CL;                     // Гц
  const DCLK = CL * 1e-6 * 1000;               // м ต่อ 1 мкс
  const nf = (v, d) => window.STEPS2.nf(v, d);
  const clamp01 = x => Math.max(0, Math.min(1, x));

  const STEPS = [
    { title: "ИТНП วัดอะไรจากภาคพื้น",
      text: "สถานี (ОКИК) วัดพารามิเตอร์นำร่องปัจจุบัน (ИТНП) ของยานสามอย่างจากข้างนอก: ระยะเฉียง D, ความเร็วเชิงรัศมี v<sub>r</sub> และทิศ (азимут, угол места) · ข้อต่างอยู่ที่ว่า «ใครส่งสัญญาณและสัญญาณเดินทางกี่ขา» — สไลด์ 8 ให้สามแบบ",
      alt: "สถานีภาคพื้นอยู่ซ้ายล่าง ยานอยู่ขวาบน เส้นประระหว่างสองจุดคือระยะ D ลูกศรตามแนวเส้นคือความเร็วเชิงรัศมี ส่วนโค้งที่สถานีคือมุมเงย",
      nums: [
        { k: "ระยะเฉียง · ความเร็วเชิงรัศมี · ทิศ", v: "D · v<sub>r</sub> · азимут, угол места" },
        { k: "สามแบบสร้างสัญญาณ (рис. 3.3.1)", v: "а) отражение · б) запросный · в) сигнал КА" }
      ] },
    { title: "а) прямой → отражённый: ยานเป็นเป้าสะท้อน",
      text: "สถานีส่งสัญญาณตรง (прямой) ไปที่ยาน สัญญาณสะท้อนจากผิวยานกลับมา (отражённый) · ยานไม่ต้องมีอุปกรณ์อะไรเลย จึงใช้กับวัตถุที่ไม่ร่วมมือ (เศษอวกาศ ยานเสีย) · แต่สัญญาณที่กลับมาอ่อนมาก (∝ 1/D⁴)",
      alt: "สถานีส่งพัลส์สีเหลืองอำพันไปที่ยาน ยานไม่มีอุปกรณ์ สะท้อนกลับเป็นเส้นประบางสีน้ำเงิน เส้นเวลาด้านล่างแสดงส่งที่ศูนย์และรับที่ Δt",
      nums: [
        { k: "ตัวอย่างผู้เรียบเรียง: D = " + nf(D0, 0).replace(/^(\d)(\d{3})$/, "$1 $2") + " км", v: "Δt = 2D/c = " + nf(TAU, 2) + " мс" },
        { k: "ระยะจากเวลาไป-กลับ", v: "D = c·Δt / 2", big: true,
          note: "c = 299 792,458 км/с · สูตรนี้ผู้เรียบเรียงดัดแปลงจากสูตรทางเดียว Л14 сл. 6 (ไป-กลับจึงหารสอง)" },
        { k: "ข้อจำกัด", v: "สัญญาณสะท้อนอ่อนมาก ∝ 1/D⁴", note: "ผู้เรียบเรียงเสริม (สมการเรดาร์) — สไลด์ 8 มีเฉพาะรูปและป้ายลูกศร" }
      ] },
    { title: "б) запросный → ответный: ยานมีเครื่องทวน",
      text: "สถานีส่งสัญญาณถาม (запросный) ยานมีเครื่องทวน (ответчик) ตอบกลับ (ответный) ด้วยกำลังของตัวเอง · สถานีเดียววัดเวลาไป-กลับ Δt ได้ตรง ๆ ไม่ต้องให้นาฬิกาสองฝั่งตรงกัน จึงวัดระยะได้แม่น",
      alt: "สถานีส่งสัญญาณถามสีเหลืองอำพันไปที่ยานซึ่งมีกล่องเครื่องตอบรับ ยานส่งสัญญาณตอบสีน้ำเงินเส้นหนากลับมา เส้นเวลาแสดงส่งที่ศูนย์ ยานตอบที่ครึ่งหนึ่ง และรับที่ Δt",
      nums: [
        { k: "ตัวอย่างเดียวกับขั้น 2", v: "D = " + nf(D0, 0).replace(/^(\d)(\d{3})$/, "$1 $2") + " км → Δt = " + nf(TAU, 2) + " мс" },
        { k: "ระยะ", v: "D = c·Δt / 2", big: true, note: "วัดเวลาที่สถานีเดียว · ถ้าเครื่องทวนหน่วง τ ใช้ D = c·(Δt − τ)/2" },
        { k: "ข้อดี", v: "ไม่ต้องให้นาฬิกาสองฝั่งตรงกัน", note: "ต้องมีเครื่องทวน (ответчик) บนยาน" }
      ] },
    { title: "в) беззапросный (сигнал КА): ยานส่งเอง สถานีฟัง",
      text: "ยานมีอุปกรณ์ส่ง (передатчик) ส่งสัญญาณของตัวเอง สถานีรับอย่างเดียว · สัญญาณเดินทางขาเดียว จึงได้ระยะต่อเมื่อนาฬิกายานกับสถานีตรงกัน — คลาดแค่ 1 мкс ระยะก็ผิดราว 300 м (ต้องพึ่ง СЧВО)",
      alt: "ยานส่งสัญญาณสีน้ำเงินลงมาที่สถานีขาเดียว มีนาฬิกาที่ยานและสถานี เส้นเวลาแสดงส่งที่ยานที่ศูนย์ และรับที่สถานีหลังผ่านไปครึ่งหนึ่งของเวลาไป-กลับ",
      nums: [
        { k: "ระยะจากสัญญาณทางเดียว", v: "D = c·(t<sub>прм</sub> − t<sub>изл</sub>)", big: true,
          note: "ตัวอย่าง D = 2 000 км ใช้เวลา " + nf(T1, 2) + " мс — ครึ่งหนึ่งของ Δt ไป-กลับ" },
        { k: "นาฬิกายานกับสถานีคลาดกัน δt = 1 мкс", v: "ΔD = c·δt ≈ " + nf(DCLK, 0) + " м",
          note: "ผู้เรียบเรียงคำนวณ · โยงไป СЧВО (แบบไม่ต้องถาม ต้องพึ่งระบบเวลา-ความถี่ СЧВО)" },
        { k: "ข้อดี", v: "วัดดอปเปลอร์ได้ดี · หลายสถานีรับพร้อมกันได้" }
      ] },
    { title: "ดอปเปลอร์: ความถี่ที่รับเพี้ยนบอก v<sub>r</sub>",
      text: "ยานที่ส่งสัญญาณความถี่ f₀ กำลังเข้าหาสถานี คลื่นถูกอัดให้ถี่ขึ้น ความถี่ที่รับได้จึงสูงกว่า f₀ เท่ากับ Δf · วัด Δf ได้ก็ได้ความเร็วเชิงรัศมี v<sub>r</sub> (ส่วนของความเร็วตามแนวเล็ง) · ยานออกห่าง ความถี่ที่รับได้จะต่ำลง",
      alt: "คลื่นรอบยานถูกอัดแน่นทางด้านสถานี ลูกศรความเร็วของยานมีส่วนตามแนวเล็งคือ v_r ด้านล่างเทียบคลื่นความถี่ f ศูนย์กับคลื่นที่รับได้ซึ่งถี่กว่า",
      nums: [
        { k: "ค่าตัวอย่างผู้เรียบเรียง (ไม่ใช่ของภาควิชา)", v: "f₀ = 2 ГГц · v<sub>r</sub> = 3 км/с" },
        { k: "ความถี่ที่เพี้ยน (ทางเดียว)", v: "Δf = f₀·v<sub>r</sub> / c = " + nf(DF / 1000, 2) + " кГц", big: true },
        { k: "อ่านกลับเป็นความเร็ว", v: "v<sub>r</sub> = c·Δf / f₀", note: "ยานเข้าหา → f สูงขึ้น · ออกห่าง → ต่ำลง" }
      ] }
  ];

  Object.assign(DEMOS, {
    "asu6-ways": function (host) {
      return window.STEPS2(host, {
        label: "แอนิเมชันทีละขั้น",
        title: 'สามวิธีสร้างสัญญาณวัดวิถี ИТНП <span style="white-space:nowrap">(лек. 7, сл. 8)</span>',
        aria: "แอนิเมชันทีละขั้น สามวิธีสร้างสัญญาณวัดวิถี ИТНП และดอปเปลอร์",
        legend: [
          { cls: "lg-ref", text: "สถานี (ОКИК)" },
          { cls: "lg-new", text: "ยาน (КА)" },
          { cls: "lg-meas", text: "สัญญาณขาไป" },
          { cls: "lg-lin", text: "สัญญาณขากลับ" }
        ],
        steps: STEPS,
        caption: "ชื่อวิธีและป้ายสัญญาณตามรูป 3.3.1 บนสไลด์ 8 (Л7) · สูตรทางเดียวจาก Л14 сл. 6 แล้วผู้เรียบเรียงดัดแปลงเป็นแบบไป-กลับ · ค่าตัวอย่าง D = 2 000 км, f₀ = 2 ГГц, v<sub>r</sub> = 3 км/с, ภาพเส้นเวลา และภาพคลื่น (ขยายการเพี้ยนมาก ไม่ตามมาตราส่วน) เป็นของผู้เรียบเรียง",
        height: w => Math.round(Math.min(430, Math.max(300, w * 0.6))),
        duration: (a, b) => b >= 1 && b <= 3 ? 1500 : 800,
        draw(ctx, W, H, step, C, anim) {
          const P = window.STEPS2.pen(ctx, W, H, C);
          const nar = W < 520, FS = nar ? 12 : 13;
          const sh = H - 96;                                      // ความสูงของฉาก (ใต้ลงไปคือแผงล่าง)
          const S = [Math.round(W * 0.13), sh - 40], K = [Math.round(W * 0.85), 44];
          const L = Math.hypot(K[0] - S[0], K[1] - S[1]);
          const d = [(K[0] - S[0]) / L, (K[1] - S[1]) / L];
          const nUp = [d[1], -d[0]], nDn = [-d[1], d[0]];          // ตั้งฉากเส้นเล็ง: ซ้ายบน · ขวาล่าง
          const at = (t, o, n) => [S[0] + (K[0] - S[0]) * t + (n ? n[0] * o : 0), S[1] + (K[1] - S[1]) * t + (n ? n[1] * o : 0)];
          const q = anim.from === step ? 1 : anim.e;               // ความคืบหน้าของแอนิเมชันภายในขั้นนี้
          function span(a, b) {
            const now = step >= a && step <= b, was = anim.from >= a && anim.from <= b;
            if (now === was) return now ? 1 : 0;
            return now ? clamp01((anim.p - 0.2) / 0.6) : 1 - clamp01(anim.p / 0.35);
          }
          function font(sz, wt) { ctx.font = (wt || 600) + " " + (sz * (nar ? 0.92 : 1)).toFixed(1) + "px " + C.font; }
          function lab(t, p, col, o) { return P.label(t, p[0], p[1], col, Object.assign({ size: FS }, o || {})); }
          /* v с индексом r — ตัวห้อย r วาดเอง (ฟอนต์ไม่มีตัวห้อยยูนิโค้ด) */
          function vr(p, col, size) {
            const o = { size: size, weight: 700, halo: 0 };
            P.font(size, 700); const wv = ctx.measureText("v").width;
            P.font(size * 0.68, 700); const wr = ctx.measureText("r").width;
            const x0 = p[0] - (wv + wr) / 2;
            P.label("v", x0, p[1], col, o);
            P.label("r", x0 + wv + 0.5, p[1] + size * 0.28, col, { size: size * 0.68, weight: 700, halo: 0 });
          }
          /* เส้นลูกศรที่ค่อย ๆ ยาวออกจาก a ไป b ตามสัดส่วน f (0…1) พร้อมจุดพัลส์ที่ปลาย */
          function shoot(a, b, col, f, wd, dash) {
            if (f <= 0.02) return;
            const e = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
            if (dash) { P.seg([a, e], col, wd, dash); if (f >= 0.999) P.arrow(a[0] + (e[0] - a[0]) * 0.97, a[1] + (e[1] - a[1]) * 0.97, e[0], e[1], col, wd, 7); }
            else P.arrow(a[0], a[1], e[0], e[1], col, wd, f >= 0.999 ? 9 : 6);
            if (f < 0.999) P.dot(e[0], e[1], 4.2, col);
          }
          function sat(p, a) {
            ctx.save(); ctx.globalAlpha *= a === undefined ? 1 : a;
            ctx.fillStyle = C.new; ctx.strokeStyle = C.bg; ctx.lineWidth = 1.5;
            ctx.fillRect(p[0] - 6, p[1] - 5, 12, 10);
            [-1, 1].forEach(sg => { ctx.fillStyle = C.new; ctx.globalAlpha *= 0.55; ctx.fillRect(p[0] + sg * 7 - (sg < 0 ? 12 : 0), p[1] - 3, 12, 6); ctx.globalAlpha /= 0.55; });
            ctx.restore();
          }
          function dish(p) {
            const ang = Math.atan2(K[1] - S[1], K[0] - S[0]);
            ctx.save(); ctx.fillStyle = C.ref; ctx.strokeStyle = C.ref; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(p[0], p[1], 13, ang - Math.PI / 2, ang + Math.PI / 2); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(p[0] - 9, p[1] + 15); ctx.lineTo(p[0] + 9, p[1] + 15); ctx.stroke();
            ctx.restore();
          }
          function clock(p, col) {
            ctx.save(); ctx.beginPath(); ctx.arc(p[0], p[1], 7.5, 0, 6.2832); ctx.fillStyle = C.bg; ctx.fill();
            ctx.lineWidth = 1.6; ctx.strokeStyle = col; ctx.stroke();
            ctx.beginPath(); ctx.moveTo(p[0], p[1] - 5); ctx.lineTo(p[0], p[1]); ctx.lineTo(p[0] + 3.6, p[1] + 2); ctx.stroke();
            ctx.restore();
          }
          function tri(x, y, up, col) {                           // ▲ รับ · ▼ ส่ง
            ctx.beginPath();
            if (up) { ctx.moveTo(x, y - 7); ctx.lineTo(x - 6, y + 4); ctx.lineTo(x + 6, y + 4); }
            else { ctx.moveTo(x, y + 7); ctx.lineTo(x - 6, y - 4); ctx.lineTo(x + 6, y - 4); }
            ctx.closePath(); ctx.fillStyle = col; ctx.fill();
          }

          /* ---------------- ฉาก: สถานีและยาน ---------------- */
          dish(S);
          lab("ОКИК", [S[0], S[1] + 30], C.ref, { align: "center", weight: 700 });
          sat(K);
          lab("КА", [K[0] - 20, K[1] - 14], C.new, { align: "right", weight: 700 });

          /* ขั้น 1: ภาพรวมสามปริมาณ */
          const a0 = span(0, 0);
          if (a0 > 0) {
            ctx.save(); ctx.globalAlpha = a0;
            P.seg([S, K], C.ink3, 1.4, [5, 5]);
            lab("D", at(0.5, 15, nUp), C.ink, { align: "center", size: FS + 2, weight: 700 });
            const a = at(0.7, 0), b = at(0.86, 0);
            P.arrow(a[0], a[1], b[0], b[1], C.lin, 2.4, 9);
            vr(at(0.78, 15, nDn), C.lin, FS + 2);
            const r = nar ? 46 : 58, ang = Math.atan2(K[1] - S[1], K[0] - S[0]);
            P.seg([S, [S[0] + r + 22, S[1]]], C.ink3, 1.2, [3, 4]);
            ctx.beginPath(); ctx.arc(S[0], S[1], r, ang, 0); ctx.lineWidth = 2; ctx.strokeStyle = C.meas; ctx.stroke();
            lab("угол места", [S[0] + r + 8, S[1] - 12], C.meas, { size: FS - 1.5, weight: 600 });
            ctx.restore();
          }

          /* ขั้น 2–4: สัญญาณ */
          if (step >= 1 && step <= 3) {
            const o = step === 3 ? 0 : 5;
            const A = at(0, o, nUp), B = at(1, o, nUp), A2 = at(0, o, nDn), B2 = at(1, o, nDn);
            const pa = at(0.04, 0), pb = at(0.96, 0);
            void pa; void pb;
            if (step === 1) {
              shoot(at(0.05, 5, nUp), at(0.93, 5, nUp), C.meas, clamp01(q / 0.5), 2.4);
              if (q > 0.5) {
                const f = clamp01((q - 0.5) / 0.5);
                shoot(at(0.93, 5, nDn), at(0.05, 5, nDn), C.lin, f, 1.3, [4, 4]);
              }
              ctx.save(); ctx.globalAlpha = clamp01((q - 0.45) / 0.2);
              ctx.beginPath(); ctx.arc(K[0], K[1], 16, 0, 6.2832); ctx.lineWidth = 1.6; ctx.strokeStyle = C.lin; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
              ctx.restore();
              lab("прямой сигнал", at(0.56, 12, nUp), C.meas, { align: "right", weight: 700 });
              lab("отражённый (อ่อนมาก)", at(0.34, 14, nDn), C.lin, { align: "left", weight: 700 });
              lab("ไม่มีอุปกรณ์ (нет)", [K[0], K[1] + 32], C.ink2, { align: "center", size: FS - 1.5, weight: 500 });
            } else if (step === 2) {
              shoot(at(0.05, 5, nUp), at(0.93, 5, nUp), C.meas, clamp01(q / 0.5), 2.4);
              ctx.save(); ctx.globalAlpha = clamp01((q - 0.45) / 0.2);
              const bx = K[0], by = K[1] + 22;
              ctx.fillStyle = C.bg; ctx.strokeStyle = C.new; ctx.lineWidth = 1.8;
              ctx.fillRect(bx - 8, by - 7, 16, 14); ctx.strokeRect(bx - 8, by - 7, 16, 14);
              ctx.beginPath(); ctx.moveTo(bx - 4, by); ctx.lineTo(bx + 4, by); ctx.moveTo(bx + 1, by - 3); ctx.lineTo(bx + 4, by); ctx.lineTo(bx + 1, by + 3); ctx.stroke();
              lab("ответчик", [bx, by + 18], C.new, { align: "center", weight: 700, size: FS - 1 });
              ctx.restore();
              if (q > 0.5) shoot(at(0.93, 5, nDn), at(0.05, 5, nDn), C.lin, clamp01((q - 0.5) / 0.5), 2.8);
              lab("запросный сигнал", at(0.56, 12, nUp), C.meas, { align: "right", weight: 700 });
              lab("ответный сигнал", at(0.34, 14, nDn), C.lin, { align: "left", weight: 700 });
            } else {
              shoot(at(0.9, 0), at(0.06, 0), C.lin, clamp01(q), 2.8);
              const bx = K[0] - 10, by = K[1] + 22;
              ctx.fillStyle = C.bg; ctx.strokeStyle = C.new; ctx.lineWidth = 1.8;
              ctx.fillRect(bx - 8, by - 7, 16, 14); ctx.strokeRect(bx - 8, by - 7, 16, 14);
              ctx.beginPath(); ctx.moveTo(bx - 4, by + 2); ctx.lineTo(bx, by - 3); ctx.lineTo(bx + 4, by + 2); ctx.stroke();
              lab("передатчик", [bx + 6, by + 18], C.new, { align: "center", weight: 700, size: FS - 1 });
              lab("сигнал КА", at(0.56, 12, nUp), C.lin, { align: "right", weight: 700 });
              clock([K[0] + 20, K[1] + 22], C.ink2);
              clock([S[0] + 38, S[1] + 14], C.ink2);
              lab("นาฬิกาสองฝั่งต้องตรงกัน", at(0.3, 14, nDn), C.ink2, { align: "left", size: FS - 1.5, weight: 500 });
            }
            void A; void B; void A2; void B2;
          }

          /* ขั้น 5: ดอปเปลอร์ — คลื่นรอบยานถูกอัดทางด้านสถานี */
          const a4 = span(4, 4);
          if (a4 > 0) {
            ctx.save(); ctx.globalAlpha = a4;
            P.seg([S, K], C.ink3, 1.1, [4, 5]);
            const vdir = [-1, 0.0], vl = nar ? 46 : 62;
            const rho = nar ? 22 : 30, shift = nar ? 7 : 10;
            const toS = Math.atan2(S[1] - K[1], S[0] - K[0]);
            for (let i = 1; i <= (nar ? 4 : 5); i++) {
              const cx = K[0] + shift * i * 0.9 * (-vdir[0]), cy = K[1] - shift * i * 0.9 * vdir[1], r = rho * i * 0.78;
              ctx.beginPath(); ctx.arc(cx, cy, r, toS - 0.62, toS + 0.62);
              ctx.lineWidth = 1.5; ctx.strokeStyle = C.lin; ctx.globalAlpha = a4 * (1 - i * 0.12); ctx.stroke();
            }
            ctx.globalAlpha = a4;
            const v1 = [K[0] + vdir[0] * vl, K[1] + vdir[1] * vl];
            P.arrow(K[0] - 4, K[1] + 14, v1[0] - 4, v1[1] + 14, C.new, 2.4, 9);
            lab("v (ความเร็วยาน)", [K[0] - vl * 0.5, K[1] + 31], C.new, { align: "center", weight: 700, size: FS - 1 });
            const pr = at(0.66, 0), pr2 = at(0.84, 0);
            P.arrow(pr2[0], pr2[1], pr[0], pr[1], C.lin, 2.6, 9);
            vr(at(0.75, 15, nDn), C.lin, FS + 2);
            lab("คลื่นถี่ขึ้นทางด้านสถานี", at(0.5, 12, nUp), C.lin, { align: "right", weight: 600, size: FS - 1 });
            ctx.restore();
          }

          /* ---------------- แผงล่าง ---------------- */
          ctx.save(); ctx.strokeStyle = C.line; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(8, sh + 0.5); ctx.lineTo(W - 8, sh + 0.5); ctx.stroke(); ctx.restore();
          const xa = Math.max(58, Math.round(W * 0.15)), xb = W - 14;
          const tx = t => xa + (xb - xa) * t / TMAX;
          const r1 = sh + 27, r2 = sh + 56;

          /* ขั้น 1: ชิปสามปริมาณ */
          if (a0 > 0) {
            ctx.save(); ctx.globalAlpha = a0;
            const names = [["D", "ระยะ (дальность)"], ["VR", "ความเร็วเชิงรัศมี"], ["az · ε", "ทิศ (азимут, угол места)"]];
            const gw = (W - 16 - 2 * 8) / 3, cols = [C.ink, C.lin, C.meas];
            names.forEach((nm, i) => {
              const x = 8 + i * (gw + 8), y = sh + 12, h = 64;
              ctx.beginPath(); ctx.rect(x, y, gw, h); ctx.fillStyle = C.sunk; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = cols[i]; ctx.stroke();
              if (nm[0] === "VR") vr([x + gw / 2, y + 20], cols[i], nar ? 16 : 18);
              else P.label(nm[0], x + gw / 2, y + 20, cols[i], { align: "center", size: nar ? 15 : 17, weight: 700, halo: 0 });
              font(nar ? 10.5 : 11.5, 500);
              const parts = nm[1].split(" (");
              ctx.fillStyle = C.ink2; ctx.textAlign = "center"; ctx.textBaseline = "middle";
              ctx.fillText(parts[0], x + gw / 2, y + 41, gw - 8);
              if (parts[1]) ctx.fillText("(" + parts[1], x + gw / 2, y + 55, gw - 8);
              ctx.textAlign = "left";
            });
            ctx.restore();
          }

          /* ขั้น 2–4: เส้นเวลา */
          const aT = span(1, 3);
          if (aT > 0) {
            ctx.save(); ctx.globalAlpha = aT;
            [[r1, "КА", C.new], [r2, "ОКИК", C.ref]].forEach(r => {
              P.seg([[xa, r[0]], [xb, r[0]]], C.line2, 1.3);
              lab(r[1], [6, r[0]], r[2], { size: FS - 1, weight: 700, halo: 0 });
            });
            [0, 5, 10].forEach(t => {
              P.seg([[tx(t), sh + 68], [tx(t), sh + 73]], C.ink3, 1.2);
              P.label(String(t) + (t === 10 ? " мс" : ""), tx(t), sh + 84, C.ink3, { size: 10.5, weight: 500, align: "center", halo: 0 });
            });
            const mk = (x, y, up, col, txt, al, dy) => { tri(x, y, up, col); lab(txt, [x, y + (dy || (up ? 20 : -20))], col, { size: FS - 1.5, weight: 700, align: al || "center" }); };
            const f2 = clamp01(q / 0.5), fR = clamp01((q - 0.5) / 0.5);
            if (step === 1 || step === 2) {
              const col = step === 1 ? C.meas : C.lin;
              mk(tx(0), r2, false, C.meas, "ส่ง", "left", -17);
              ctx.save(); ctx.globalAlpha *= clamp01((q - 0.4) / 0.2);
              const xm = tx(TAU / 2);
              ctx.beginPath(); ctx.moveTo(xm, r1 - 6); ctx.lineTo(xm + 6, r1); ctx.lineTo(xm, r1 + 6); ctx.lineTo(xm - 6, r1); ctx.closePath();
              ctx.fillStyle = step === 1 ? C.lin : C.new; ctx.fill();
              lab(step === 1 ? "สะท้อน" : "ตอบ", [xm, r1 - 17], step === 1 ? C.lin : C.new, { size: FS - 1.5, weight: 700, align: "center" });
              ctx.restore();
              if (fR > 0) {
                ctx.save(); ctx.globalAlpha *= clamp01(fR * 3);
                tri(tx(TAU), r2, true, col);
                lab("รับ", [tx(TAU), r2 - 17], col, { size: FS - 1.5, weight: 700, align: "right" });
                ctx.restore();
                const xe = tx(0) + (tx(TAU) - tx(0)) * fR;
                P.seg([[tx(0) + 8, r2], [xe, r2]], C.ink2, 2.2);
                if (fR > 0.55) lab("Δt = " + nf(TAU, 2) + " мс", [(tx(0) + tx(TAU)) / 2, r2 + 13], C.ink, { size: FS - 1, weight: 700, align: "center" });
              }
            } else {
              mk(tx(0), r1, false, C.lin, "t_изл", "left", -17);
              if (fR > 0) {
                ctx.save(); ctx.globalAlpha *= clamp01(fR * 3);
                tri(tx(T1), r2, true, C.lin);
                lab("t_прм", [tx(T1), r2 - 17], C.lin, { size: FS - 1.5, weight: 700, align: "center" });
                ctx.restore();
                P.seg([[tx(0), r1 + 8], [tx(0), r2]], C.line2, 1.2, [3, 3]);
                const xe = tx(0) + (tx(T1) - tx(0)) * fR;
                P.seg([[tx(0), r2], [xe, r2]], C.ink2, 2.2);
                if (fR > 0.55) lab(nf(T1, 2) + " мс", [(tx(0) + tx(T1)) / 2, r2 + 13], C.ink, { size: FS - 1, weight: 700, align: "center" });
              }
            }
            ctx.restore();
          }

          /* ขั้น 5: เทียบคลื่น f₀ กับ f */
          if (a4 > 0) {
            ctx.save(); ctx.globalAlpha = a4;
            const wave = (y, lamb, col) => {
              ctx.beginPath();
              for (let x = xa; x <= xb; x += 1.5) {
                const yy = y - 9 * Math.sin((x - xa) / lamb * 6.2832);
                if (x === xa) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
              }
              ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke();
            };
            wave(sh + 27, 26, C.ink3); wave(sh + 66, 20, C.lin);
            lab("f₀", [6, sh + 27], C.ink2, { size: FS + 1, weight: 700, halo: 0 });
            lab("f", [6, sh + 66], C.lin, { size: FS + 1, weight: 700, halo: 0 });
            lab("ที่ยานส่ง", [xb, sh + 9], C.ink2, { size: FS - 2, weight: 500, align: "right" });
            lab("ที่สถานีรับ (เพี้ยนขยายให้เห็น)", [xb, sh + 88], C.lin, { size: FS - 2, weight: 500, align: "right" });
            ctx.restore();
          }
        }
      });
    }
  });
})();
