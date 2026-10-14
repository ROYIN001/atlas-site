/* js/subj/suka.js — แบบจำลองของวิชา suka (STD2) · สร้างโดย _work/std2/tools/assemble.py จาก _work/sukastd2/demos/ — ห้ามแก้ไฟล์นี้ตรง ๆ แก้ที่ต้นฉบับแล้วประกอบใหม่ · โหลดโดย subjAssets() เมื่อเปิดวิชา · ห้ามแตะ document ที่ระดับบนสุด */
/* --- suka6-logic.js --- */
/* suka6-logic — กฎตรรกะของ СУУД с УРД: แบ่งระนาบเฟสเป็น 9 บริเวณ → ค่า Φ ของแต่ละบริเวณ → วิถีจริงจากการจำลองเชิงตัวเลขจนเข้าวงแกว่งตัวเอง
   สูตร: Л6 сл. 16–18 · рис. 9–10 · กฎแบบแยกกรณีตามสไลด์ 18 · วิถีที่จำลองและค่าตัวอย่างผู้เรียบเรียงทำ */
Object.assign(DEMOS, {
  "suka6-logic": function (host) {
    const nf = window.STEPS2.nf;
    /* ค่าตัวอย่าง (ผู้เรียบเรียงเลือก) · หน่วย ° และ °/с */
    const PHI1 = 2, DPHI1 = 0.5, WN = 0.2, PHI_0 = 6, DPHI_0 = 1.5, PI_DEG = 180;
    /* กฎตรรกะตามสไลด์ 18 */
    const FI = (p, v) => (p > -PI_DEG && p < -PHI1 && v <= DPHI1) ? 1 : (p > PHI1 && p <= PI_DEG && v >= -DPHI1) ? -1 : 0;
    const GRID = [[7, 8, 1], [6, 9, 2], [5, 4, 3]];               // เลขบริเวณตามรูป 9 (แถวบน→ล่าง · ซ้าย→ขวา)
    const regionOf = (p, v) => GRID[v >= DPHI1 ? 0 : v <= -DPHI1 ? 2 : 1][p >= PHI1 ? 2 : p <= -PHI1 ? 0 : 1];
    const REG = {};
    GRID.forEach((rw, row) => rw.forEach((r, col) => {
      const f = FI([-5, 0, 5][col], [1, 0, -1][row]);               // ค่า Φ ที่จุดตัวแทนในบริเวณ
      REG[r] = { r, row, col, f, g: (r === 1 || r === 5) ? 1 : (r === 2 || r === 6) ? 2 : 3 };
    }));
    const regList = f => Object.keys(REG).map(Number).filter(r => REG[r].f === f).sort((a, b) => a - b).join(", ");
    const R0 = regionOf(PHI_0, DPHI_0);

    /* ---------- จำลอง φ̈ = Φ(φ, φ̇)·w_ном ---------- */
    function simulate() {
      const H = 0.01, REC = 0.05, LIM = 600;
      const adv = (p, v, f, tau) => [p + v * tau + 0.5 * f * WN * tau * tau, v + f * WN * tau];   // เมื่อ Φ คงที่ในช่วง τ คำตอบแม่นยำ
      let t = 0, p = PHI_0, v = DPHI_0, f = FI(p, v), lastRec = 0, entries = 0, guard = 0;
      const pts = [{ t, p, v, f }], evs = [], ent = [];
      while (t < LIM && entries < 4 && guard++ < 400000) {
        let tau = H, np = adv(p, v, f, tau);
        if (FI(np[0], np[1]) !== f) {                              // Φ เปลี่ยนในช่วงนี้ → หาเวลาสลับด้วยการแบ่งครึ่ง
          let lo = 0, hi = H;
          for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2, q = adv(p, v, f, m); if (FI(q[0], q[1]) !== f) hi = m; else lo = m; }
          tau = hi; np = adv(p, v, f, tau);
        }
        if (f !== 0 && v * np[1] < 0) {                            // จุดกลับ (φ̇ = 0) ในช่วงนี้ — เก็บไว้วัดแอมพลิจูด
          const ts = -v / (f * WN);
          pts.push({ t: t + ts, p: p + v * ts + 0.5 * f * WN * ts * ts, v: 0, f });
        }
        t += tau; p = np[0]; v = np[1];
        const g = FI(p, v);
        if (g !== f) {
          evs.push({ i: pts.length, t, from: f, to: g });
          if (f === 0 && g === 1) { entries++; ent.push(pts.length); }
          f = g; pts.push({ t, p, v, f }); lastRec = t;
        } else if (t - lastRec >= REC - 1e-9) { pts.push({ t, p, v, f }); lastRec = t; }
      }
      const cyc = ent.length >= 4 ? [ent[ent.length - 2], ent[ent.length - 1]] : null;   // วงสุดท้าย = ระหว่างการเข้า Φ = +1 สองครั้งสุดท้าย
      let A = 0;
      if (cyc) for (let i = cyc[0]; i <= cyc[1]; i++) A = Math.max(A, Math.abs(pts[i].p));
      return { pts, evs, ent, cyc, T: pts[pts.length - 1].t, A, Tc: cyc ? pts[cyc[1]].t - pts[cyc[0]].t : NaN };
    }
    const SIM = simulate();
    const A_F = PHI1 + DPHI1 * DPHI1 / (2 * WN);                   // แอมพลิจูดตามสูตร
    const T_F = 4 * PHI1 / DPHI1 + 4 * DPHI1 / WN;                 // คาบตามสูตร: แล่นเฉื่อย 2 ครั้ง + โค้ง 2 ครั้ง
    const tFirst = SIM.evs.length ? SIM.evs[0].t : NaN, tEnter = SIM.ent.length ? SIM.pts[SIM.ent[0]].t : NaN;
    const ED = '<span class="ed">ผู้เรียบเรียงเลือกค่า</span>', EC = '<span class="ed">ผู้เรียบเรียงคำนวณ</span>';

    /* ---------- MathML ---------- */
    const mi = s => "<mi>" + s + "</mi>", mn = s => "<mn>" + s + "</mn>", mo = s => "<mo>" + s + "</mo>", mth = s => "<math>" + s + "</math>";
    const rm = s => '<mi mathvariant="normal">' + s + "</mi>";
    const sb = (b, s) => "<msub>" + b + s + "</msub>";
    const sq = b => "<msup>" + b + "<mn>2</mn></msup>";
    const dot = b => '<mover accent="true">' + b + '<mo stretchy="false" style="font-size:1.6em">&#x02D9;</mo></mover>';
    const ddot = b => '<mover accent="true">' + b + '<mo stretchy="false" style="font-size:1.6em">&#x00A8;</mo></mover>';
    const frac = (a, b) => "<mfrac><mrow>" + a + "</mrow><mrow>" + b + "</mrow></mfrac>";
    const par = x => '<mo stretchy="false">(</mo>' + x + '<mo stretchy="false">)</mo>';
    const phi = mi("φ"), dphi = dot(phi), p1 = sb(phi, mn(1)), d1 = sb(dphi, mn(1)), wn = sb(mi("w"), rm("ном"));
    const EQ = mo("="), PL = mo("+"), MI = mo("−"), TT = mo("·"), GT = mo("&gt;"), LT = mo("&lt;"), LE = mo("≤"), GE = mo("≥"), AB = x => '<mo stretchy="false">|</mo>' + x + '<mo stretchy="false">|</mo>';
    const PHm = mth(phi), DPm = mth(dphi), P1m = mth(p1), D1m = mth(d1), WNm = mth(wn);
    const nw = x => '<span style="white-space:nowrap">' + x + "</span>";
    const MP1 = nw("−" + P1m), MD1 = nw("−" + D1m), PMP1 = nw("±" + P1m);
    const FIfn = mi("Φ") + par(phi + mo(",") + dphi);
    const FIeq = f => mth(mi("Φ") + EQ + (f > 0 ? PL + mn(1) : f < 0 ? MI + mn(1) : mn(0)));
    const Fs = f => (f > 0 ? "+1" : f < 0 ? "−1" : "0");

    const STEPS = [
      { title: "แบ่งระนาบเฟสเป็น 9 บริเวณ",
        text: "เซนเซอร์มุม (ДУ) และเซนเซอร์ความเร็วเชิงมุม (ДУС) มีย่านไม่ตอบสนอง (зона нечувствительности) " + P1m + " และ " + D1m + " · เส้น " + mth(phi + EQ + mo("±") + p1) + " และ " + mth(dphi + EQ + mo("±") + d1) +
          " (เส้นประ) จึงแบ่งระนาบเฟสเป็น 9 บริเวณ ในแต่ละบริเวณสัญญาณของเซนเซอร์ทั้งสองคงที่ ตัวขยาย-แปลงสัญญาณ (УП) จึงสั่งค่าเดียวได้ · ข้ามเส้นเมื่อใด Φ เปลี่ยนค่าได้ เรียกว่าเส้นสลับ (линия переключения) · " +
          "ค่าตัวอย่าง " + P1m + " = " + nf(PHI1, 0) + "° " + D1m + " = " + nf(DPHI1, 1) + " °/с " + WNm + " = " + nf(WN, 1) + " °/с² " + ED + " · เส้น " + mth(phi + EQ + mo("±") + mi("π")) + " อยู่ไกลเกินขอบภาพ",
        alt: "ระนาบเฟสถูกแบ่งด้วยเส้นประแนวตั้งสองเส้นที่ φ เท่ากับบวกลบ 2 องศา และเส้นประแนวนอนสองเส้นที่ φ จุดเท่ากับบวกลบ 0,5 องศาต่อวินาที เป็น 9 บริเวณ หมายเลข 7 8 1 แถวบน 6 9 2 แถวกลาง 5 4 3 แถวล่าง",
        nums: [
          { k: "ย่านไม่ตอบสนอง", v: [P1m + " = " + nf(PHI1, 0) + "°", D1m + " = " + nf(DPHI1, 1) + " °/с"] },
          { k: "ความเร่งเชิงมุมที่ УРД ให้ได้", v: WNm + " = " + nf(WN, 1) + " °/с²" },
          { k: "จุดเริ่ม → บริเวณ", v: "(" + nf(PHI_0, 0) + "°, " + nf(DPHI_0, 1) + " °/с) → บริเวณ " + R0 }
        ] },
      { title: "บริเวณ 1 และ 5 · ยานกำลังหนี",
        text: "เมื่อ " + mth(AB(phi) + GT + p1) + " และ " + mth(AB(dphi) + GT + d1) + " และเครื่องหมายของ " + PHm + " กับ " + DPm + " เหมือนกัน (บริเวณ 1 และ 5) ยานกำลังหนีจากตำแหน่ง " + mth(phi + EQ + mn(0)) +
          " จึงต้องใช้โมเมนต์เต็มที่ โดยให้เครื่องหมายของ Φ ตรงข้ามกับเครื่องหมายของ " + DPm + " → บริเวณ 1: " + FIeq(REG[1].f) + " · บริเวณ 5: " + FIeq(REG[5].f) + " (ข้อความบรรยาย стр. 13 ข้อ 1)",
        alt: "บริเวณ 1 มุมขวาบนระบายสีสำหรับ Φ เท่ากับลบ 1 และบริเวณ 5 มุมซ้ายล่างระบายสีสำหรับ Φ เท่ากับบวก 1 ลูกศรชี้ทิศที่ยานกำลังหนีออกจากศูนย์",
        nums: [
          { k: "บริเวณ 1", v: mth(phi + GT + p1 + mo(",") + dphi + GT + d1) + " → " + FIeq(REG[1].f), big: true },
          { k: "บริเวณ 5", v: mth(phi + LT + MI + p1 + mo(",") + dphi + LT + MI + d1) + " → " + FIeq(REG[5].f), big: true },
          { k: "จุดเริ่ม (" + nf(PHI_0, 0) + "°, " + nf(DPHI_0, 1) + " °/с)", v: "อยู่ในบริเวณ " + R0 + " → Φ = " + Fs(REG[R0].f) }
        ] },
      { title: "บริเวณ 2 และ 6 · คงค่าเดิมเพื่อเสถียรภาพ",
        text: "ในบริเวณ 2 ความเร็วเล็กลงแล้ว (" + mth(AB(dphi) + LT + d1) + ") แต่ " + PHm + " ยังเกิน " + P1m + " · คงค่า Φ ของบริเวณ 1 ไว้ (" + FIeq(REG[2].f) + ") เพื่อให้กระบวนการเสถียร · บริเวณ 6 คงค่าของบริเวณ 5 (" + FIeq(REG[6].f) + ") (ข้อความบรรยาย стр. 13 ข้อ 2)",
        alt: "บริเวณ 2 ถัดจากบริเวณ 1 ลงมาและบริเวณ 6 ถัดจากบริเวณ 5 ขึ้นไป ระบายสีตามค่า Φ เดียวกับบริเวณข้างเคียง",
        nums: [
          { k: "บริเวณ 2", v: mth(phi + GT + p1 + mo(",") + AB(dphi) + LT + d1) + " → " + FIeq(REG[2].f), big: true },
          { k: "บริเวณ 6", v: mth(phi + LT + MI + p1 + mo(",") + AB(dphi) + LT + d1) + " → " + FIeq(REG[6].f), big: true }
        ] },
      { title: "บริเวณ 3, 7 · 4, 8 · 9 → Φ = 0",
        text: "บริเวณ 3 และ 7: เครื่องหมายของ " + PHm + " กับ " + DPm + " ต่างกัน ยานกำลังเข้าหา " + mth(phi + EQ + mn(0)) + " ด้วยความเฉื่อยอยู่แล้ว · บริเวณ 4 และ 8: มุมเล็กแล้ว (" + mth(AB(phi) + LE + p1) + ") แม้ความเร็วยังมาก · " +
          "บริเวณ 9: เซนเซอร์ทั้งสองไม่ให้สัญญาณ → ไม่เปิด УРД (Φ = 0) เพื่อประหยัดสารทำงาน (рабочее тело) (ข้อความบรรยาย стр. 13–14 ข้อ 3–5)",
        alt: "บริเวณ 3 4 7 8 และ 9 ระบายสีสำหรับ Φ เท่ากับ 0 ทำให้ทั้ง 9 บริเวณมีสีครบสามสี ลูกศรในบริเวณ 3 และ 7 ชี้เข้าหาศูนย์",
        nums: [
          { k: "Φ = −1", v: "บริเวณ " + regList(-1) },
          { k: "Φ = +1", v: "บริเวณ " + regList(1) },
          { k: "Φ = 0", v: "บริเวณ " + regList(0) },
          { k: "กฎตามสไลด์ 18", v: mth(FIfn + EQ + mo("{") + "<mtable><mtr><mtd>" + PL + mn(1) + "</mtd><mtd><mtext>&#160;เมื่อ&#160;</mtext>" + MI + mi("π") + LT + phi + LT + MI + p1 + "<mtext>&#160;และ&#160;</mtext>" + dphi + LE + d1 + "</mtd></mtr>" +
              "<mtr><mtd>" + MI + mn(1) + "</mtd><mtd><mtext>&#160;เมื่อ&#160;</mtext>" + p1 + LT + phi + LE + mi("π") + "<mtext>&#160;และ&#160;</mtext>" + dphi + GE + MI + d1 + "</mtd></mtr>" +
              "<mtr><mtd>" + mn(0) + "</mtd><mtd><mtext>&#160;กรณีอื่น</mtext></mtd></mtr></mtable>") }
        ] },
      { title: "วิถีจริง · จำลองเชิงตัวเลข",
        text: "จำลอง " + mth(ddot(phi) + EQ + FIfn + TT + wn) + " ด้วยกฎตามสไลด์ 18 จากจุดเริ่ม (" + nf(PHI_0, 0) + "°, " + nf(DPHI_0, 1) + " °/с) ในบริเวณ " + R0 + " (ขั้นเวลา 0,01 с · หาเวลาสลับ Φ ด้วยการแบ่งครึ่งช่วงเวลา) " + EC +
          " · สีของเส้นคือค่า Φ ขณะนั้น: Φ = −1 จน " + DPm + " ลดถึง " + MD1 + " ที่ t = " + nf(tFirst, 1) + " с แล้ว Φ = 0 ยานแล่นด้วยความเฉื่อยผ่านแถบ " + PMP1 + " จน " + PHm + " < " + MP1 + " ที่ t = " + nf(tEnter, 1) + " с Φ จึงเป็น +1 · จากนั้น Φ สลับซ้ำเป็นรอบ",
        alt: "เส้นวิถีค่อย ๆ ยาวขึ้นจากจุดเริ่มในบริเวณ 1 โค้งลงขวาด้วยสีของ Φ เท่ากับลบ 1 แล้วแล่นตรงไปทางซ้ายด้วยสีของ Φ เท่ากับ 0 เข้าวงปิดรอบศูนย์ซ้ำสามรอบ",
        nums: [
          { k: "Φ: −1 → 0", v: "t = " + nf(tFirst, 1) + " с (" + DPm + " ถึง " + MD1 + ")" },
          { k: "Φ: 0 → +1 ครั้งแรก", v: "t = " + nf(tEnter, 1) + " с (" + PHm + " ถึง " + MP1 + ")" },
          { k: "จำลองจนครบ 3 รอบของวงสุดท้าย", v: "t = " + nf(SIM.T, 1) + " с" },
          { k: "จำนวนครั้งที่ Φ สลับค่า", v: nf(SIM.evs.length, 0) + " ครั้ง", big: true }
        ] },
      { title: "วงแกว่งตัวเอง (автоколебания)",
        text: "หลังเข้าสู่วงปิด วิถีไม่เปลี่ยนอีก: แล่นเป็นเส้นตรงที่ " + mth(dphi + EQ + mo("±") + d1) + " ระหว่าง " + MP1 + " ถึง " + P1m + " แล้วโค้งเป็นพาราโบลานอกแถบ " + PMP1 + " กลับมา · ปลายโค้งอยู่ที่ " + DPm + " = 0 จึงได้แอมพลิจูดมุม " +
          mth(mi("A") + EQ + p1 + PL + frac(sq(d1), mn(2) + wn)) + " = " + nf(PHI1, 0) + " + " + nf(DPHI1 * DPHI1, 2) + " / " + nf(2 * WN, 1) + " = " + nf(A_F, 3) + "° " + EC + " · จำลองวัดได้ " + nf(SIM.A, 3) + "° · " +
          "กระบวนการชั่วครู่จบด้วยการแกว่งตัวเองคงตัว (ข้อความบรรยาย стр. 14)",
        alt: "ภาพขยายรอบศูนย์ แสดงวงปิดของวิถีสุดท้ายเป็นเส้นตรงที่ความเร็ว 0,5 องศาต่อวินาทีสองเส้นและโค้งพาราโบลาสองโค้ง ไฮไลต์ด้วยสีม่วง พร้อมป้ายแอมพลิจูด",
        nums: [
          { k: "แอมพลิจูด A (สูตร)", v: mth(mi("A") + EQ + p1 + PL + frac(sq(d1), mn(2) + wn)) + " = " + nf(A_F, 3) + "°", big: true },
          { k: "แอมพลิจูด A (วัดจากวงสุดท้าย)", v: nf(SIM.A, 3) + "°" },
          { k: "คาบ T (สูตร)", v: "4 · " + nf(PHI1, 0) + " / " + nf(DPHI1, 1) + " + 4 · " + nf(DPHI1, 1) + " / " + nf(WN, 1) + " = " + nf(4 * PHI1 / DPHI1, 0) + " + " + nf(4 * DPHI1 / WN, 0) + " = " + nf(T_F, 1) + " с" },
          { k: "คาบที่วัดได้", v: nf(SIM.Tc, 1) + " с" }
        ] }
    ];

    /* ---------- ข้อความหลายส่วน (ตัวห้อย/จุดอนุพันธ์) บน canvas ---------- */
    function rich(ctx, C, parts, x, y, size, color, o) {
      o = o || {};
      const wt = o.weight || 600, halo = o.halo === undefined ? 3.5 : o.halo;
      const toks = parts.map(p => typeof p === "string" ? { t: p } : p);
      const setf = (t, s) => { ctx.font = (t.i ? "italic " : "") + (t.b ? 700 : wt) + " " + s.toFixed(1) + "px " + C.font; };
      function measure(sz) {
        let tot = 0;
        const ms = toks.map(t => {
          const s = sz * (t.s || 1);
          setf(t, s); const mw = t.t ? ctx.measureText(t.t).width : 0;
          let sw = 0;
          if (t.sub) { setf(t, s * 0.72); sw = ctx.measureText(t.sub).width; }
          const wd = mw + sw + (sw ? 1 : 0);
          tot += wd; return { mw, wd, s };
        });
        return { tot, ms };
      }
      let sz = size, m = measure(sz);
      if (o.fit && m.tot > o.fit) { sz = Math.max(size * 0.72, size * o.fit / m.tot); m = measure(sz); }
      let x0 = o.align === "center" ? x - m.tot / 2 : o.align === "right" ? x - m.tot : x;
      if (o.W) x0 = Math.max(3, Math.min(o.W - 3 - m.tot, x0));
      ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
      for (let pass = halo > 0 ? 0 : 1; pass < 2; pass++) {
        let cx = x0;
        toks.forEach((t, i) => {
          const s = m.ms[i].s, bx = cx + m.ms[i].mw + (t.sub ? 1 : 0);
          const piece = (txt, px, py, ps) => {
            setf(t, ps);
            if (pass === 0) { ctx.lineWidth = halo; ctx.strokeStyle = C.bg; ctx.strokeText(txt, px, py); } else { ctx.fillStyle = t.c || color; ctx.fillText(txt, px, py); }
          };
          if (t.t) piece(t.t, cx, y, s);
          if (pass === 1 && t.d && t.t) {            // จุดอนุพันธ์วาดเอง (φ̇) ให้อยู่เหนือตัวอักษรพอดี
            ctx.fillStyle = t.c || color;
            const xm = cx + m.ms[i].mw / 2, yd = y - s * (t.dy || 0.56), rd = Math.max(1.2, s * 0.07);
            ctx.beginPath(); ctx.arc(xm, yd, rd, 0, Math.PI * 2); ctx.fill();
          }
          if (t.sub) piece(t.sub, bx, y + s * 0.30, s * 0.72);
          cx += m.ms[i].wd;
        });
      }
      return { x: x0, w: m.tot };
    }
    const PHd = { t: "φ", d: 1 };                           // φ̇
    const FULL = { x0: -8, x1: 14.5, y0: -2.2, y1: 2.2 }, ZOOM = { x0: -4, x1: 4, y0: -1.1, y1: 1.1 };

    return window.STEPS2(host, {
      label: "แอนิเมชันทีละขั้น",
      title: 'กฎตรรกะ: 9 บริเวณ → Φ → วิถีจริงจนเข้าวงแกว่งตัวเอง <span style="white-space:nowrap">(сл. 16–18)</span>',
      aria: "แอนิเมชันการแบ่งระนาบเฟสเป็นเก้าบริเวณ ค่าของฟังก์ชันควบคุม Φ ในแต่ละบริเวณ และวิถีที่จำลองเชิงตัวเลขจนเข้าวงแกว่งตัวเอง",
      legend: [
        { cls: "lg-ref", text: "Φ = +1 แรงขับบวก (УРД+)" },
        { cls: "lg-lin", text: "Φ = 0 ไม่ขับ" },
        { cls: "lg-new", text: "Φ = −1 แรงขับลบ (УРД−)" },
        { cls: "dot", text: "จุดเริ่ม", color: "var(--accent-2)" },
        { cls: "", text: "วงแกว่งตัวเอง", color: "var(--s2-deep)" }
      ],
      steps: STEPS,
      caption: "การแบ่งบริเวณและเหตุผลตามข้อความบรรยายที่ 6 (рис. 9–10) · กฎตามสไลด์ 18 · วิถีคำนวณด้วยกฎนี้ — ผู้เรียบเรียงทำ · ค่าตัวอย่างผู้เรียบเรียงเลือก",
      height: w => w < 520 ? Math.round(Math.max(420, w * 1.1)) : 440,
      duration: (from, to) => (to === 4 && from < 4) ? 5200 : (from >= 5 || to >= 5) ? 1100 : 650,
      draw(ctx, w, h, k, C, anim) {
        const P = window.STEPS2.pen(ctx, w, h, C);
        const narrow = w < 520, ks = w < 480 ? 0.92 : 1;
        const R = (parts, x, y, size, color, o) => rich(ctx, C, parts, x, y, size * ks, color, Object.assign({ W: w }, o || {}));
        const e = anim.e, lerp = (a, b, t) => a + (b - a) * t, clamp = x => Math.max(0, Math.min(1, x));
        const qe = (k === 4 && anim.from < 4) ? clamp(anim.p * 7) : e;   // ขั้นจำลองใช้เวลานาน — ภาพประกอบเปลี่ยนเร็วตอนต้น
        const L = { x: narrow ? 38 : 50, y: 12, r: w - 12, b: h - (narrow ? 30 : 34) };
        const zf = lerp(anim.from >= 5 ? 1 : 0, k >= 5 ? 1 : 0, e);
        const V = { x0: lerp(FULL.x0, ZOOM.x0, zf), x1: lerp(FULL.x1, ZOOM.x1, zf), y0: lerp(FULL.y0, ZOOM.y0, zf), y1: lerp(FULL.y1, ZOOM.y1, zf) };
        const X = v => L.x + (v - V.x0) / (V.x1 - V.x0) * (L.r - L.x);
        const Y = v => L.b - (v - V.y0) / (V.y1 - V.y0) * (L.b - L.y);
        const FC = f => (f > 0 ? C.ref : f < 0 ? C.new : C.lin);
        const lab = (parts, x, y, color, a, o) => { if (a > 0.02) { ctx.save(); ctx.globalAlpha = a; R(parts, x, y, (o && o.size) || 11.5, color, Object.assign({ weight: 700 }, o || {})); ctx.restore(); } };

        /* กรอบ + เส้นตาราง + ป้ายแกน */
        const xs = zf > 0.5 ? 1 : 5, ys = zf > 0.5 ? 0.5 : 1;
        ctx.save();
        ctx.lineWidth = 1; ctx.strokeStyle = C.grid;
        for (let v = Math.ceil(V.x0 / xs) * xs; v <= V.x1 + 1e-9; v += xs) { const px = X(v); if (px > L.x && px < L.r) { ctx.beginPath(); ctx.moveTo(px, L.y); ctx.lineTo(px, L.b); ctx.stroke(); } }
        for (let v = Math.ceil(V.y0 / ys) * ys; v <= V.y1 + 1e-9; v += ys) { const py = Y(v); if (py > L.y && py < L.b) { ctx.beginPath(); ctx.moveTo(L.x, py); ctx.lineTo(L.r, py); ctx.stroke(); } }
        ctx.restore();
        for (let v = Math.ceil(V.x0 / xs) * xs; v <= V.x1 + 1e-9; v += xs) { const px = X(v); if (px >= L.x + 4 && px <= L.r - 4) R([nf(Math.abs(v) < 1e-9 ? 0 : v, 0)], px, L.b + 13, 10.5, C.ink3, { align: "center", halo: 0 }); }
        for (let v = Math.ceil(V.y0 / ys) * ys; v <= V.y1 + 1e-9; v += ys) { const py = Y(v); if (py >= L.y + 4 && py <= L.b - 4) R([nf(Math.abs(v) < 1e-9 ? 0 : v, ys < 1 ? 1 : 0)], L.x - 5, py, 10.5, C.ink3, { align: "right", halo: 0 }); }

        /* ---------- เนื้อใน (ตัดขอบ) ---------- */
        ctx.save();
        ctx.beginPath(); ctx.rect(L.x, L.y, L.r - L.x, L.b - L.y); ctx.clip();

        /* สีพื้นบริเวณตามค่า Φ — ปรากฏทีละกลุ่มตามขั้น */
        const rx = col => (col === 0 ? [V.x0 - 2, -PHI1] : col === 1 ? [-PHI1, PHI1] : [PHI1, V.x1 + 2]);
        const ry = row => (row === 0 ? [DPHI1, V.y1 + 2] : row === 1 ? [-DPHI1, DPHI1] : [V.y0 - 2, -DPHI1]);
        Object.keys(REG).forEach(key => {
          const g = REG[key], vis = anim.fade(g.g);
          if (vis <= 0.01) return;
          const em = lerp(anim.from === g.g ? 1 : 0, k === g.g ? 1 : 0, qe);
          const xa = rx(g.col), ya = ry(g.row);
          ctx.save(); ctx.globalAlpha = vis * (0.13 + 0.12 * em); ctx.fillStyle = FC(g.f);
          ctx.fillRect(X(xa[0]), Y(ya[1]), X(xa[1]) - X(xa[0]), Y(ya[0]) - Y(ya[1]));
          ctx.restore();
        });

        /* แกน + เส้นสลับ */
        P.arrow(L.x, Y(0), L.r - 1, Y(0), C.ink3, 1.4, 8);
        P.arrow(X(0), L.b, X(0), L.y + 1, C.ink3, 1.4, 8);
        ctx.save(); ctx.setLineDash([7, 5]); ctx.strokeStyle = C.ink2; ctx.lineWidth = 1.6;
        [-PHI1, PHI1].forEach(v => { ctx.beginPath(); ctx.moveTo(X(v), L.y); ctx.lineTo(X(v), L.b); ctx.stroke(); });
        [-DPHI1, DPHI1].forEach(v => { ctx.beginPath(); ctx.moveTo(L.x, Y(v)); ctx.lineTo(L.r, Y(v)); ctx.stroke(); });
        ctx.restore();

        /* ---------- วิถีจริง ---------- */
        const pts = SIM.pts, T = SIM.T;
        const tv = anim.fade(4);
        const prog = (k === 4 && anim.from < 4) ? anim.p : 1;
        const trajA = k >= 4 ? 1 : tv;
        let tcur = 0;
        if (trajA > 0.01) {
          const tc = prog * T; tcur = tc;
          let n = 0; while (n < pts.length && pts[n].t <= tc) n++;
          const list = pts.slice(0, n).map(q => ({ x: X(q.p), y: Y(q.v), f: q.f }));
          let head = null;
          if (n < pts.length && n > 0) {
            const a = pts[n - 1], b = pts[n], u = (tc - a.t) / (b.t - a.t || 1);
            head = { x: X(a.p + (b.p - a.p) * u), y: Y(a.v + (b.v - a.v) * u), f: a.f };
            list.push(head);
          }
          ctx.save(); ctx.globalAlpha = trajA;
          /* ไฮไลต์วงสุดท้าย */
          const vc = anim.fade(5);
          if (SIM.cyc && vc > 0.01) {
            const cl = pts.slice(SIM.cyc[0], SIM.cyc[1] + 1).map(q => [X(q.p), Y(q.v)]);
            P.seg(cl, C.deep, 11, [], 0.3 * vc);
          }
          /* เส้นวิถี แบ่งเป็นช่วงตามค่า Φ */
          let run = [[list[0].x, list[0].y]], rf = list[0].f;
          for (let i = 1; i < list.length; i++) {
            if (list[i - 1].f !== rf) { P.seg(run, FC(rf), 2.6); run = [[list[i - 1].x, list[i - 1].y]]; rf = list[i - 1].f; }
            run.push([list[i].x, list[i].y]);
          }
          if (run.length > 1) P.seg(run, FC(rf), 2.6);
          /* ลูกศรทิศวนบนวงสุดท้าย */
          if (SIM.cyc && vc > 0.01) {
            ctx.save(); ctx.globalAlpha = vc;
            let a = SIM.cyc[0];
            for (let i = SIM.cyc[0] + 1; i <= SIM.cyc[1]; i++) {
              if (pts[i].f !== pts[a].f || i === SIM.cyc[1]) {
                const m = Math.floor((a + i) / 2), q0 = pts[Math.max(a, m - 1)], q1 = pts[Math.min(i, m + 1)], q = pts[m];
                let dx = X(q1.p) - X(q0.p), dy = Y(q1.v) - Y(q0.v); const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
                P.arrow(X(q.p) - dx * 8, Y(q.v) - dy * 8, X(q.p) + dx * 3, Y(q.v) + dy * 3, FC(pts[a].f), 2.4, 10);
                a = i;
              }
            }
            ctx.restore();
          }
          if (head && prog < 1) P.dot(head.x, head.y, 4.8, FC(head.f));
          ctx.restore();
        }

        /* จุดเริ่ม */
        P.dot(X(PHI_0), Y(DPHI_0), 6, C.meas);

        /* ป้ายแอมพลิจูด A */
        const va = anim.fade(5);
        if (va > 0.01) {
          ctx.save(); ctx.globalAlpha = va;
          ctx.setLineDash([3, 4]); ctx.strokeStyle = C.deep; ctx.lineWidth = 1.4;
          [-SIM.A, SIM.A].forEach(v => { ctx.beginPath(); ctx.moveTo(X(v), L.y); ctx.lineTo(X(v), L.b); ctx.stroke(); });
          ctx.setLineDash([]);
          P.arrow(X(0), Y(0), X(SIM.A) - 1, Y(0), C.deep, 2.6, 10);
          ctx.restore();
        }
        ctx.restore();   // เลิกตัดขอบ

        /* ---------- ป้ายบนภาพ ---------- */
        R(["φ, °"], L.r - 4, Y(0) - 11, 11.5, C.ink2, { align: "right", weight: 700 });
        R([PHd, ", °/с"], X(0) + 7, L.y + 11, 11.5, C.ink2, { weight: 700 });
        /* ชื่อเส้นสลับ: φ ที่ขอบบน · φ̇ ที่ขอบซ้าย */
        const tl = L.y + 25;
        R([{ t: "φ", sub: "1" }], X(PHI1) + 4, tl, 11, C.ink2, { weight: 700 });
        R(["−", { t: "φ", sub: "1" }], X(-PHI1) - 4, tl, 11, C.ink2, { align: "right", weight: 700 });
        R([{ t: "φ", d: 1, sub: "1" }], L.x + 5, Y(DPHI1) - 11, 11, C.ink2, { weight: 700 });
        R(["−", { t: "φ", d: 1, sub: "1" }], L.x + 5, Y(-DPHI1) + 11, 11, C.ink2, { weight: 700 });
        lab(["จุดเริ่ม"], X(PHI_0), Y(DPHI_0) - 16, C.meas, 1 - zf, { align: "center", halo: 4 });

        /* เลขบริเวณ + ค่า Φ */
        const bv = 1 - zf;
        if (bv > 0.02) {
          Object.keys(REG).forEach(key => {
            const g = REG[key];
            const bx = g.col === 0 ? Math.max(L.x + 24, X(-PHI1) - 32) : g.col === 1 ? X(0) : Math.min(L.r - 24, X(PHI1) + 32);
            const by = g.row === 0 ? Math.max(L.y + 24, Y(DPHI1) - 34) : g.row === 1 ? Y(0) : Math.min(L.b - 26, Y(-DPHI1) + 36);
            const vis = anim.fade(g.g), cur = lerp(anim.from === g.g ? 1 : 0, k === g.g ? 1 : 0, qe);
            ctx.save(); ctx.globalAlpha = bv;
            P.ring(bx, by, 11, vis > 0.5 ? FC(g.f) : C.ink3, 2);
            R([String(g.r)], bx, by, 12.5, C.ink, { align: "center", weight: 700, halo: 0 });
            ctx.restore();
            lab(["Φ = " + Fs(g.f)], bx, by + 24, FC(g.f), vis * bv, { align: "center", size: 11, halo: 3.5 });
            /* ลูกศรทิศการเคลื่อนที่ตามเครื่องหมาย φ̇ — บริเวณ 1 5 (หนี) และ 3 7 (เข้าหา) */
            const dirR = (g.r === 1 || g.r === 7) ? 1 : (g.r === 5 || g.r === 3) ? -1 : 0;
            if (dirR && cur * bv > 0.02) {
              ctx.save(); ctx.globalAlpha = cur * bv * vis;
              P.arrow(bx + dirR * 18, by, bx + dirR * 42, by, C.ink2, 2.2, 9);
              ctx.restore();
            }
          });
        }

        /* เวลาจำลอง */
        if (k >= 4 && !(k === 4 && anim.from < 4 && anim.p <= 0.001)) lab(["t = " + nf(tcur, 1) + " с"], L.x + 6, L.y + 11, C.ink2, 1, { align: "left" });

        /* ป้ายวงสุดท้าย */
        if (va > 0.01 && SIM.cyc) {
          lab(["A = " + nf(SIM.A, 3) + "°"], X(SIM.A / 2), Y(0) - 13, C.deep, va, { align: "center" });
          lab(["Φ = −1"], X(SIM.A) + 9, Y(0) + 14, C.new, va, { align: "left" });
          lab(["Φ = +1"], X(-SIM.A) - 9, Y(0) + 14, C.ref, va, { align: "right" });
          lab(["Φ = 0 · แล่นด้วยความเฉื่อย"], X(0), Y(DPHI1) - 13, C.lin, va, { align: "center", size: 11 });
          lab(["Φ = 0"], X(0), Y(-DPHI1) + 13, C.lin, va, { align: "center", size: 11 });
        }
      }
    });
  }
});
/* --- suka6-loop.js --- */
/* suka6-loop — สัญญาณหนึ่งรอบในวงปิดของ СУУД с УРД: КА → ДУ/ДУС → УП → УРД → КА · สูตร: Л6 сл. 7–10 · (7)–(10) · กฎตรรกะ сл. 16–18
   ภาพ ค่าตัวอย่าง และการไล่สัญญาณทีละบล็อกผู้เรียบเรียงทำ */
Object.assign(DEMOS, {
  "suka6-loop": function (host) {
    const nf = window.STEPS2.nf;
    const DEG = 180 / Math.PI;
    /* ค่าตัวอย่าง (ผู้เรียบเรียงเลือก) */
    const PHI = 3, DPHI = 0.2, PHI1 = 1, DPHI1 = 0.5, PT = 10, LA = 1.5, IPH = 1000, PI_DEG = 180;
    /* เซนเซอร์แบบรีเลย์ (9), (10) */
    const uDU = PHI >= PHI1 && PHI <= PI_DEG ? 1 : PHI <= -PHI1 && PHI > -PI_DEG ? -1 : 0;
    const uDUS = DPHI >= DPHI1 ? 1 : DPHI <= -DPHI1 ? -1 : 0;
    /* บริเวณบนระนาบเฟสตามรูป 9 และกฎตรรกะตามสไลด์ 18 */
    const GRID = [[7, 8, 1], [6, 9, 2], [5, 4, 3]];
    const col = PHI >= PHI1 ? 2 : PHI <= -PHI1 ? 0 : 1, row = DPHI >= DPHI1 ? 0 : DPHI <= -DPHI1 ? 2 : 1;
    const REG = GRID[row][col];
    const FI = (PHI > -PI_DEG && PHI < -PHI1 && DPHI <= DPHI1) ? 1 : (PHI > PHI1 && PHI <= PI_DEG && DPHI >= -DPHI1) ? -1 : 0;   // Φ(φ, φ̇)
    const SEL = FI;                                        // +1 → УРД+ · −1 → УРД− · 0 → ไม่ส่งคำสั่ง
    const SG = SEL > 0 ? "+" : SEL < 0 ? "−" : "";
    const MM = SEL * 2 * PT * LA;                          // M^у = ±2P_ном l (7)
    const ACC = MM / IPH, ACCD = ACC * DEG;
    const sgn = (v, d) => (v > 0 ? "+" : "") + nf(v, d);
    const ED = '<span class="ed">ผู้เรียบเรียงเลือกค่า</span>', EC = '<span class="ed">ผู้เรียบเรียงคำนวณ</span>';

    /* ---------- MathML ---------- */
    const mi = s => "<mi>" + s + "</mi>", mo = s => "<mo>" + s + "</mo>", mth = s => "<math>" + s + "</math>";
    const rm = s => '<mi mathvariant="normal">' + s + "</mi>";
    const sb = (b, s) => "<msub>" + b + "<mi>" + s + "</mi></msub>";
    const sb1 = b => "<msub>" + b + "<mn>1</mn></msub>";
    const sbsp = (b, s, p) => "<msubsup>" + b + "<mi>" + s + "</mi>" + p + "</msubsup>";
    const dot = b => '<mover accent="true">' + b + '<mo stretchy="false" style="font-size:1.6em">&#x02D9;</mo></mover>';
    const ddot = b => '<mover accent="true">' + b + '<mo stretchy="false" style="font-size:1.6em">&#x00A8;</mo></mover>';
    const frac = (a, b) => "<mfrac><mrow>" + a + "</mrow><mrow>" + b + "</mrow></mfrac>";
    const EQ = mo("="), tx = s => "<mtext>" + s + "</mtext>";
    const phi = mi("φ"), dphi = dot(mi("φ"));
    const SGN = SEL > 0 ? "+" : SEL < 0 ? "−" : "";
    const Mm = sbsp(mi("M"), "φ", rm("у" + SGN)), Mv = sbsp(mi("M"), "φ", rm("в"));
    const PHm = mth(phi), DPm = mth(dphi), DDm = mth(ddot(phi)), P1m = mth(sb1(phi)), D1m = mth(sb1(dphi));
    const uPhi = mth(sb(mi("u"), "φ")), uDphi = mth("<msub>" + mi("u") + dphi + "</msub>"), uSel = mth(sb(mi("u"), "у" + SGN));
    const uNomPhi = mth(sb(mi("u"), "φ ном")), uNomDphi = mth("<msub>" + mi("u") + "<mrow>" + dphi + rm("ном") + "</mrow></msub>");
    const sgn3 = u => (u > 0 ? "+" : u < 0 ? "−" : "0");
    const LT = "<mo>&lt;</mo>", GT = "<mo>&gt;</mo>", LE = "<mo>≤</mo>", GE = "<mo>≥</mo>", MIN = "<mo>−</mo>", ABS = s => tx("|") + s + tx("|");
    const condRegion = mth(col === 2 ? phi + GT + sb1(phi) : col === 0 ? phi + LT + MIN + sb1(phi) : ABS(phi) + LT + sb1(phi)) + " และ " +
      mth(row === 0 ? dphi + GT + sb1(dphi) : row === 2 ? dphi + LT + MIN + sb1(dphi) : ABS(dphi) + LT + sb1(dphi));
    const FIs = FI > 0 ? "+1" : FI < 0 ? "−1" : "0";
    const lawTxt = mth(FI < 0 ? sb1(phi) + LT + phi + LE + mi("π") + tx(" และ ") + dphi + GE + MIN + sb1(dphi) + mo("→") + mi("Φ") + EQ + mo("−") + "<mn>1</mn>"
      : FI > 0 ? MIN + mi("π") + LT + phi + LT + MIN + sb1(phi) + tx(" และ ") + dphi + LE + sb1(dphi) + mo("→") + mi("Φ") + EQ + mo("+") + "<mn>1</mn>"
      : tx("ไม่เข้าเงื่อนไข +1 หรือ −1 ") + mo("→") + mi("Φ") + EQ + "<mn>0</mn>");
    const MV = (MM < 0 ? "−" : MM > 0 ? "+" : "") + nf(Math.abs(MM), 0);
    const TWO = (SEL < 0 ? "−" : "") + "2";

    const STEPS = [
      { title: "วงปิดของ СУУД с УРД",
        text: "ยาน (КА) ถูกวัดมุม " + PHm + " ด้วยเซนเซอร์มุม (ДУ) และวัดความเร็วเชิงมุม " + DPm + " ด้วยเซนเซอร์ความเร็วเชิงมุม (ДУС) · สัญญาณทั้งสองเข้าตัวขยาย-แปลงสัญญาณ (УП) " +
          "ซึ่งสั่งวาล์ว ЭПК ของเครื่องยนต์ไอพ่นควบคุมคู่ УРД+ หรือ УРД− (หัวฉีด РС) แล้วโมเมนต์ควบคุมก็กลับเข้ายาน ครบหนึ่งวงปิด · ตัวอย่างนี้ใช้สถานะ " + PHm + " = " + nf(PHI, 0) + "° และ " + DPm + " = " + nf(DPHI, 1) + " °/с " + ED,
        alt: "แผนภาพบล็อกของวงปิด ยาน เซนเซอร์มุม เซนเซอร์ความเร็วเชิงมุม ตัวขยายแปลงสัญญาณ และเครื่องยนต์ไอพ่นควบคุมสองคู่ พร้อมกราฟรีเลย์ของเซนเซอร์สองตัว",
        nums: [
          { k: "สถานะของยานขณะนี้", v: PHm + " = " + nf(PHI, 0) + "° · " + DPm + " = " + nf(DPHI, 1) + " °/с" },
          { k: "ย่านไม่ตอบสนอง", v: P1m + " = " + nf(PHI1, 0) + "° · " + D1m + " = " + nf(DPHI1, 1) + " °/с" },
          { k: "УРД และยาน", v: mth(sb(mi("P"), "ном")) + " = " + nf(PT, 0) + " Н · l = " + nf(LA, 1) + " м · " + mth(sb(mi("I"), "φ")) + " = " + nf(IPH, 0) + " кг·м²" }
        ] },
      { title: "เซนเซอร์มุม ДУ (9)",
        text: "เซนเซอร์มุมเป็นรีเลย์ที่มีย่านไม่ตอบสนอง (зона нечувствительности) " + P1m + " · ที่ " + PHm + " = " + nf(PHI, 0) + "° ซึ่งเกิน " + P1m + " = " + nf(PHI1, 0) + "° เซนเซอร์จึงให้ " + uPhi + " = " + (uDU ? sgn3(uDU) : "") + (uDU ? uNomPhi : "0") +
          " · กราฟแสดงเฉพาะช่วง ±5° ใกล้ศูนย์ (ช่วงเต็มของ ДУ คือ −π … π)",
        alt: "กราฟรีเลย์ของเซนเซอร์มุม จุดที่ φ เท่ากับ 3 องศาอยู่บนระดับ +u",
        nums: [
          { k: "เงื่อนไขตาม (9)", v: P1m + " ≤ " + PHm + " ≤ π : " + nf(PHI1, 0) + "° ≤ " + nf(PHI, 0) + "° ≤ " + nf(PI_DEG, 0) + "°" },
          { k: "สัญญาณออก", v: uPhi + " = " + (uDU ? sgn3(uDU) : "") + (uDU ? uNomPhi : "0"), big: true }
        ] },
      { title: "เซนเซอร์ความเร็วเชิงมุม ДУС (10)",
        text: "เซนเซอร์ความเร็วเชิงมุมก็เป็นรีเลย์เช่นกัน · " + mth(tx("|") + dphi + tx("|")) + " = " + nf(Math.abs(DPHI), 1) + " °/с น้อยกว่า " + D1m + " = " + nf(DPHI1, 1) + " °/с จึงอยู่ในย่านไม่ตอบสนอง เซนเซอร์ให้ " +
          uDphi + " = " + (uDUS ? sgn3(uDUS) + uNomDphi : "0") + " · วงปิดยังไม่ได้รับสัญญาณความเร็วจากตัวนี้",
        alt: "กราฟรีเลย์ของเซนเซอร์ความเร็วเชิงมุม จุดที่ความเร็วเชิงมุมเท่ากับ 0,2 องศาต่อวินาทีอยู่ในย่านที่สัญญาณออกเป็นศูนย์",
        nums: [
          { k: "เงื่อนไขตาม (10)", v: mth(mo("−") + sb1(dphi)) + " < " + DPm + " < " + D1m + " : " + nf(-DPHI1, 1) + " < " + nf(DPHI, 1) + " < " + nf(DPHI1, 1) + " °/с" },
          { k: "สัญญาณออก", v: uDphi + " = " + (uDUS ? sgn3(uDUS) + uNomDphi : "0"), big: true }
        ] },
      { title: "ตัวขยาย-แปลงสัญญาณ УП ใช้กฎตรรกะ",
        text: "УП รับคู่สัญญาณ (" + uPhi + ", " + uDphi + ") = (" + sgn3(uDU) + ", " + sgn3(uDUS) + ") ซึ่งตรงกับบริเวณ " + REG + " ของระนาบเฟส (" + condRegion.replace(/φ̇/g, "\u03c6\u0307") + ") · " +
          "กฎตรรกะของส่วนที่ 4 ให้ Φ = " + FIs + " จึงส่งคำสั่ง " + uSel + " ไปยังคู่ УРД" + SGN,
        alt: "ตัวขยายแปลงสัญญาณได้คู่สัญญาณบวกกับศูนย์ ตรงกับบริเวณ 2 ได้ Φ เท่ากับลบ 1 แล้วส่งคำสั่งไปคู่ УРД ลบ",
        nums: [
          { k: "คู่สัญญาณ → บริเวณ", v: "(" + sgn3(uDU) + ", " + sgn3(uDUS) + ") → บริเวณ " + REG },
          { k: "กฎตามสไลด์ 18", v: lawTxt, note: nf(PHI1, 0) + "° < " + nf(PHI, 0) + "° ≤ " + nf(PI_DEG, 0) + "° · " + nf(DPHI, 1) + " ≥ " + nf(-DPHI1, 1) },
          { k: "ค่าของ Φ", v: mth(mi("Φ") + "<mo stretchy=\"false\">(</mo>" + phi + "<mo>,</mo>" + dphi + "<mo stretchy=\"false\">)</mo>" + EQ + (FI ? "<mo>" + (FI < 0 ? "−" : "+") + "</mo><mn>1</mn>" : "<mn>0</mn>")), big: true }
        ] },
      { title: "УРД" + SGN + " ให้แรงขับ → โมเมนต์ควบคุม (7)",
        text: "คำสั่ง " + uSel + " เปิดวาล์ว ЭПК" + SGN + " หัวฉีด РС" + SGN + " ทั้งคู่ (ปลายแขนสองข้าง) พ่นด้วยแรงขับ " + mth(sb(mi("P"), "ном")) + " = " + nf(PT, 0) + " Н ได้โมเมนต์ควบคุม " + mth(Mm) + " = " + TWO + mth(sb(mi("P"), "ном")) +
          "l = " + TWO + " · " + nf(PT, 0) + " · " + nf(LA, 1) + " = " + MV + " Н·м · เครื่องหมายลบหมายถึงโมเมนต์ที่ต้านมุม " + PHm + " ซึ่งเป็นบวก",
        alt: "บล็อก УРД ลบ ทำงาน ส่งโมเมนต์ลบ 30 นิวตันเมตรเข้าตัวยาน",
        nums: [
          { k: "โมเมนต์ของคู่ УРД" + SGN, v: mth(Mm) + " = " + TWO + " · " + nf(PT, 0) + " · " + nf(LA, 1) + " = " + MV + " Н·м", big: true }
        ] },
      { title: "КА ตอบสนอง แล้ววนกลับเข้าเซนเซอร์",
        text: "โมเมนต์ " + MV + " Н·м กระทำกับยาน ตามสมการ (6) เมื่อ " + mth(Mv) + " = 0 ได้ " + mth(ddot(phi) + EQ + frac(Mm, sb(mi("I"), "φ"))) + " = " + MV + " / " + nf(IPH, 0) + " = " + nf(ACC, 2) + " рад/с² (" + nf(ACCD, 2) + " °/с²) " + EC + " · " +
          DPm + " เริ่มลดลง ค่าใหม่ของ " + PHm + " และ " + DPm + " วนกลับไปที่ ДУ และ ДУС ปิดเป็นวงปิด · ถ้า " + mth(tx("|") + dphi + tx("|")) + " โตถึง " + D1m + " (ความเร็วลดผ่านศูนย์ไปถึง −0,5 °/с ในราว 0,41 с ขณะ φ ≈ 2,94°) เซนเซอร์ความเร็วให้ −u ยานเข้าบริเวณ 3 กฎตรรกะให้ Φ = 0 УРД ปิด " + EC,
        alt: "บล็อกยานรับโมเมนต์ลบ ความเร่งเชิงมุมลบ 0,03 เรเดียนต่อวินาทีกำลังสอง และเส้นสัญญาณวนกลับไปที่เซนเซอร์",
        nums: [
          { k: "ความเร่งเชิงมุม", v: DDm + " = " + mth(frac(Mm, sb(mi("I"), "φ"))) + " = " + MV + " / " + nf(IPH, 0) + " = " + nf(ACC, 2) + " рад/с²", big: true },
          { k: "เป็นองศา", v: "≈ " + nf(ACCD, 2) + " °/с²" },
          { k: "ผลต่อความเร็วเชิงมุม", v: mth(ddot(phi)) + " < 0 → " + DPm + " ลดลง" }
        ] }
    ];

    /* ---------- ข้อความหลายส่วน (ตัวห้อย/ตัวยก/จุดอนุพันธ์/สี) บน canvas ---------- */
    function rich(ctx, C, parts, x, y, size, color, o) {
      o = o || {};
      const wt = o.weight || 500, halo = o.halo === undefined ? 3.5 : o.halo;
      const toks = parts.map(p => typeof p === "string" ? { t: p } : p);
      const setf = (t, s) => { ctx.font = (t.i ? "italic " : "") + (t.b ? 700 : wt) + " " + s.toFixed(1) + "px " + C.font; };
      function measure(sz) {
        let tot = 0;
        const ms = toks.map(t => {
          const s = sz * (t.s || 1);
          setf(t, s); const mw = t.t ? ctx.measureText(t.t).width : 0;
          let sw = 0;
          if (t.sub) { setf(t, s * 0.72); sw = ctx.measureText(t.sub).width; }
          if (t.sup) { setf(t, s * 0.72); sw = Math.max(sw, ctx.measureText(t.sup).width); }
          const wd = mw + sw + (sw ? 1 : 0);
          tot += wd; return { mw, wd, s };
        });
        return { tot, ms };
      }
      let sz = size, m = measure(sz);
      if (o.fit && m.tot > o.fit) { sz = Math.max(size * 0.72, size * o.fit / m.tot); m = measure(sz); }
      let x0 = o.align === "center" ? x - m.tot / 2 : o.align === "right" ? x - m.tot : x;
      if (o.W) x0 = Math.max(3, Math.min(o.W - 3 - m.tot, x0));
      ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
      for (let pass = halo > 0 ? 0 : 1; pass < 2; pass++) {
        let cx = x0;
        toks.forEach((t, i) => {
          const s = m.ms[i].s, bx = cx + m.ms[i].mw + (t.sub || t.sup ? 1 : 0);
          const piece = (txt, px, py, ps) => {
            setf(t, ps);
            if (pass === 0) { ctx.lineWidth = halo; ctx.strokeStyle = C.bg; ctx.strokeText(txt, px, py); } else { ctx.fillStyle = t.c || color; ctx.fillText(txt, px, py); }
          };
          if (t.t) piece(t.t, cx, y, s);
          if (pass === 1 && t.d && t.t) {            // จุดอนุพันธ์วาดเอง (φ̇) ให้อยู่เหนือตัวอักษรพอดี
            ctx.fillStyle = t.c || color;
            const xm = cx + m.ms[i].mw / 2, yd = y - s * (t.dy || 0.5), rd = Math.max(1.2, s * 0.07);
            for (let j = 0; j < t.d; j++) { ctx.beginPath(); ctx.arc(xm + (j - (t.d - 1) / 2) * s * 0.2, yd, rd, 0, Math.PI * 2); ctx.fill(); }
          }
          if (t.sub) piece(t.sub, bx, y + s * 0.30, s * 0.72);
          if (pass === 1 && t.subd && t.sub) {       // จุดอนุพันธ์เหนือตัวห้อย
            setf(t, s * 0.72);
            ctx.fillStyle = t.c || color; ctx.beginPath(); ctx.arc(bx + ctx.measureText(t.sub).width / 2, y + s * 0.30 - s * 0.72 * 0.56, Math.max(1, s * 0.05), 0, Math.PI * 2); ctx.fill();
          }
          if (t.sup) piece(t.sup, bx, y - s * 0.40, s * 0.72);
          cx += m.ms[i].wd;
        });
      }
      return { x: x0, w: m.tot };
    }
    const PH = { t: "φ", d: 1, dy: 0.56 };               // φ̇

    return window.STEPS2(host, {
      label: "แอนิเมชันทีละขั้น",
      title: 'สัญญาณหนึ่งรอบในวงปิดของ СУУД с УРД <span style="white-space:nowrap">(сл. 7–10)</span>',
      aria: "แอนิเมชันสัญญาณหนึ่งรอบในวงปิดของระบบควบคุมการเคลื่อนที่เชิงมุมที่ใช้เครื่องยนต์ไอพ่นควบคุม",
      legend: [{ cls: "lg-new", text: "เส้นทางของขั้นนี้" }, { cls: "lg-ref", text: "ผ่านมาแล้ว" }, { cls: "lg-lin", text: "ลักษณะรีเลย์ของเซนเซอร์" }],
      steps: STEPS,
      caption: "แผนภาพตามสไลด์ 7 · ลักษณะรีเลย์ (8)–(10) · ค่าตัวอย่างผู้เรียบเรียงเลือก · สไลด์ 7–10 ไม่มีตัวเลข ตัวเลขทั้งหมดบนภาพเป็นตัวอย่างประกอบ",
      height: w => w < 600 ? Math.round(Math.max(480, w * 1.26)) : 390,
      draw(ctx, w, h, k, C, anim) {
        const P = window.STEPS2.pen(ctx, w, h, C);
        const narrow = w < 600, ks = w < 480 ? 0.92 : 1;
        const clamp = x => Math.max(0, Math.min(1, x));
        const V = (a, b) => {
          const inn = s => (s >= a && s <= b ? 1 : 0);
          const vt = inn(anim.to), vf = inn(anim.from);
          if (anim.p >= 1 || vt === vf) return vt;
          return vt ? clamp((anim.p - 0.4) / 0.5) : 1 - clamp(anim.p / 0.4);
        };
        const entering = anim.p < 1 && anim.from < k;
        const R = (parts, x, y, size, color, o) => rich(ctx, C, parts, x, y, size * ks, color, Object.assign({ W: w }, o || {}));

        /* ---------- ที่ว่างของภาพ ---------- */
        const D = narrow ? { x: 6, y: 8, w: w - 12, h: Math.round(h * 0.60) } : { x: 8, y: 8, w: Math.round(w * 0.58), h: h - 16 };
        const GA = narrow ? { x: 6, y: D.y + D.h + 8, w: (w - 12 - 10) / 2, h: h - (D.y + D.h + 8) - 6 }
          : { x: D.x + D.w + 12, y: 8, w: w - (D.x + D.w + 12) - 8, h: (h - 16 - 10) / 2 };
        const GB = narrow ? { x: GA.x + GA.w + 10, y: GA.y, w: GA.w, h: GA.h } : { x: GA.x, y: GA.y + GA.h + 10, w: GA.w, h: GA.h };

        const bh = narrow ? 40 : 46, bot = narrow ? 22 : 28;
        const gapY = (D.h - bot - 4 * bh) / 3;
        const rc = i => D.y + bh / 2 + i * (bh + gapY);
        const cxL = D.x + D.w * 0.27, cxR = D.x + D.w * 0.73, cxC = D.x + D.w / 2;
        const bw = D.w * 0.30, wbw = D.w * 0.56;
        const xl = D.x + 10, xr = D.x + D.w - 10;

        /* ---------- เส้นสัญญาณ ---------- */
        const mkSeg = (pts, cur, g, sel) => ({ pts, cur, g, sel });
        const SEGS = {
          phi: mkSeg([[cxC - wbw / 2, rc(3)], [xl, rc(3)], [xl, rc(0)], [cxL - bw / 2, rc(0)]], [1, 5], 0, true),
          dphi: mkSeg([[cxC + wbw / 2, rc(3)], [xr, rc(3)], [xr, rc(0)], [cxR + bw / 2, rc(0)]], [2, 5], 0, true),
          uphi: mkSeg([[cxL, rc(0) + bh / 2], [cxL, rc(1) - bh / 2]], [1], 1, true),
          udphi: mkSeg([[cxR, rc(0) + bh / 2], [cxR, rc(1) - bh / 2]], [2], 1, true),
          upl: mkSeg([[cxL, rc(1) + bh / 2], [cxL, rc(2) - bh / 2]], SEL > 0 ? [3] : [], 2, SEL > 0),
          umi: mkSeg([[cxR, rc(1) + bh / 2], [cxR, rc(2) - bh / 2]], SEL < 0 ? [3] : [], 2, SEL < 0),
          mpl: mkSeg([[cxL, rc(2) + bh / 2], [cxL, rc(3) - bh / 2]], SEL > 0 ? [4] : [], 3, SEL > 0),
          mmi: mkSeg([[cxR, rc(2) + bh / 2], [cxR, rc(3) - bh / 2]], SEL < 0 ? [4] : [], 3, SEL < 0)
        };
        function modeOf(cur) { if (k === 0) return "all"; if (cur.indexOf(k) >= 0) return "cur"; if (cur.some(c => c < k)) return "done"; return "pend"; }
        function partial(pts, f) {
          if (f >= 1) return pts;
          let tot = 0; const ls = [];
          for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); ls.push(l); tot += l; }
          let rest = tot * f; const out = [pts[0]];
          for (let i = 0; i < ls.length; i++) {
            if (rest >= ls[i]) { out.push(pts[i + 1]); rest -= ls[i]; } else { const t = rest / ls[i]; out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]); break; }
          }
          return out;
        }
        const e = anim.e;
        function drawSeg(s) {
          const md = modeOf(s.cur);
          let f = 1, colr = C.ink3, wd = 1.5, dash = null, al = 0.8;
          if (md === "all") { const sw = anim.p < 1 && anim.from !== 0 ? e : 1; f = clamp(sw * 4 - s.g); colr = C.new; wd = 3; al = 1; }
          else if (md === "cur") { f = entering ? e : 1; colr = C.new; wd = 3.2; al = 1; }
          else if (md === "done") { colr = C.ref; wd = 2.2; al = 1; }
          else if (!s.sel) { dash = [4, 4]; al = 0.6; }
          if (f <= 0.01) return md;
          const pts = partial(s.pts, f);
          ctx.save(); ctx.globalAlpha = al; ctx.setLineDash(dash || []);
          if (f >= 0.999) {
            const a = pts[pts.length - 2], b = pts[pts.length - 1];
            P.seg(pts.slice(0, -1).concat([[a[0] + (b[0] - a[0]) * 0.9, a[1] + (b[1] - a[1]) * 0.9]]), colr, wd, dash);
            ctx.setLineDash([]); P.arrow(a[0] + (b[0] - a[0]) * 0.9, a[1] + (b[1] - a[1]) * 0.9, b[0], b[1], colr, wd, 9);
          } else P.seg(pts, colr, wd, dash);
          ctx.restore();
          return md;
        }

        /* ---------- บล็อก ---------- */
        function blockMode(cur) { if (k === 0) return "pend"; if (cur.indexOf(k) >= 0) return "cur"; if (cur.some(c => c < k)) return "done"; return "pend"; }
        function block(cx, cy, bw_, name, sub, cur, nameParts) {
          const md = blockMode(cur), x = cx - bw_ / 2, y = cy - bh / 2;
          ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, bw_, bh, 9) : ctx.rect(x, y, bw_, bh);
          ctx.fillStyle = C.sunk; ctx.fill();
          if (md === "cur") { ctx.save(); ctx.globalAlpha = 0.14; ctx.fillStyle = C.new; ctx.fill(); ctx.restore(); }
          ctx.lineWidth = md === "cur" ? 2.6 : md === "done" ? 2 : 1.4;
          ctx.strokeStyle = md === "cur" ? C.new : md === "done" ? C.ref : C.line2; ctx.stroke();
          const subY = cy + 10 * ks;
          R(nameParts || [name], cx, sub ? cy - 8 * ks : cy, 14, C.ink, { align: "center", weight: 700, halo: 0, fit: bw_ - 8 });
          if (sub) R(Array.isArray(sub) ? sub : [sub], cx, subY, 10.5, md === "cur" ? C.new : C.ink3, { align: "center", weight: 600, halo: 0, fit: bw_ - 8 });
        }
        const wideSub = !narrow;
        const aPar = md => md;

        /* ---------- ลำดับการวาด: เส้น → บล็อก → ป้าย ---------- */
        const segMode = {};
        Object.keys(SEGS).forEach(n => { segMode[n] = modeOf(SEGS[n].cur); });

        /* บล็อก */
        const selSide = SEL;
        block(cxL, rc(0), bw, "ДУ", wideSub ? "เซนเซอร์มุม" : null, [1]);
        block(cxR, rc(0), bw, "ДУС", wideSub ? "เซนเซอร์ความเร็วเชิงมุม" : null, [2]);
        const upSub = k >= 3 && k !== 0 ? [{ t: "(" + (uDU > 0 ? "+" : uDU < 0 ? "−" : "0") + ", " + (uDUS > 0 ? "+" : uDUS < 0 ? "−" : "0") + ") → บริเวณ " + REG + " → Φ = " + (FI > 0 ? "+1" : FI < 0 ? "−1" : "0") }] : (wideSub ? "ตัวขยาย-แปลงสัญญาณ" : null);
        block(cxC, rc(1), wbw, "УП", upSub, [3]);
        block(cxL, rc(2), bw, "УРД+", "ЭПК+ → РС+", SEL > 0 ? [4] : []);
        block(cxR, rc(2), bw, "УРД−", "ЭПК− → РС−", SEL < 0 ? [4] : []);
        const kaSub = k >= 5 ? [{ t: "φ", d: 2, dy: 0.56 }, " = M/I", { t: "", sub: "φ" }, " = " + nf(ACC, 2) + " рад/с²"] : (wideSub ? "ยาน (объект управления)" : null);
        block(cxC, rc(3), wbw, "КА", kaSub, [5]);

        /* เส้น */
        Object.keys(SEGS).forEach(n => drawSeg(SEGS[n]));
        /* รบกวน M^в = 0 */
        {
          const y0 = D.y + D.h - 2, y1 = rc(3) + bh / 2;
          ctx.save(); ctx.globalAlpha = 0.7; P.seg([[cxC, y0], [cxC, y1 + 5]], C.ink3, 1.4, [3, 3]); ctx.setLineDash([]); P.arrow(cxC, y1 + 5, cxC, y1, C.ink3, 1.4, 7); ctx.restore();
          R([{ t: "M", sup: "в" }, " = 0"], cxC + 8, (y0 + y1) / 2 + 2, 11, C.ink3, { weight: 600, halo: 0 });
        }

        /* ป้ายสัญญาณ */
        const gm = i => (rc(i) + bh / 2 + rc(i + 1) - bh / 2) / 2;
        const lc = n => { const m = segMode[n]; return m === "cur" || m === "all" ? C.new : m === "done" ? C.ref : C.ink3; };
        const sgnU = u => (u > 0 ? "+u" : u < 0 ? "−u" : "0");
        R([{ t: "u", sub: "φ" }].concat(k >= 1 ? [" = ", { t: sgnU(uDU), sub: uDU ? "ном" : "" }] : []), cxL - 6, gm(0), 11.5, lc("uphi"), { align: "right", weight: 700, fit: cxL - xl - 8 });
        R([{ t: "u", sub: "φ", subd: 1 }].concat(k >= 2 ? [" = ", { t: sgnU(uDUS), sub: uDUS ? "ном" : "" }] : []), cxR + 6, gm(0), 11.5, lc("udphi"), { weight: 700, fit: xr - cxR - 8 });
        R([{ t: "u", sub: "у+" }], cxL - 6, gm(1), 11.5, lc("upl"), { align: "right", weight: 700 });
        R([{ t: "u", sub: "у−" }], cxR + 6, gm(1), 11.5, lc("umi"), { weight: 700 });
        R([{ t: "M", sup: "у+" }].concat(k >= 4 && SEL > 0 ? [" = " + MV + " Н·м"] : []), cxL - 6, gm(2), 11.5, lc("mpl"), { align: "right", weight: 700, fit: cxL - xl - 8 });
        R([{ t: "M", sup: "у−" }].concat(k >= 4 && SEL < 0 ? [" = " + MV + " Н·м"] : []), cxR + 6, gm(2), 11.5, lc("mmi"), { weight: 700, fit: xr - cxR - 8 });
        const lp = lc("phi"), ld = lc("dphi");
        R(["φ"], xl, (rc(0) + rc(3)) / 2, 13, lp, { align: "center", weight: 700, halo: 3.5 });
        R([{ t: "φ", d: 1, dy: 0.56 }], xr, (rc(0) + rc(3)) / 2, 13, ld, { align: "center", weight: 700, halo: 3.5 });
        if (k >= 3 || k === 0) {                // คำสั่งที่ УП ตัดสินใจ: Φ
          const fx = SEL > 0 ? cxL : cxR;
          const fv = V(3, 3) + (k === 0 ? 0 : 0);
          if (k >= 3) {
            ctx.save(); ctx.globalAlpha = k === 3 ? Math.max(fv, 0.0) : 1;
            R(["Φ = " + (FI > 0 ? "+1" : FI < 0 ? "−1" : "0")], cxC, gm(1) + (narrow ? 0 : 0), 12.5, C.new, { align: "center", weight: 700, halo: 3.5 });
            ctx.restore();
          }
        }

        /* ======================= กราฟรีเลย์ ======================= */
        function relay(Rc, o) {
          const st = o.mode;
          ctx.beginPath(); ctx.roundRect ? ctx.roundRect(Rc.x, Rc.y, Rc.w, Rc.h, 9) : ctx.rect(Rc.x, Rc.y, Rc.w, Rc.h);
          ctx.fillStyle = C.bg; ctx.fill();
          ctx.lineWidth = st === "cur" ? 2.6 : st === "done" ? 1.8 : 1.2;
          ctx.strokeStyle = st === "cur" ? C.new : st === "done" ? C.ref : C.line; ctx.stroke();
          R([o.title], Rc.x + 9, Rc.y + 12, 11.5, C.ink, { weight: 700, halo: 0, fit: Rc.w - 14 });
          const gx0 = Rc.x + 10, gx1 = Rc.x + Rc.w - 12, gy0 = Rc.y + 28, gy1 = Rc.y + Rc.h - 10;
          const ym = (gy0 + gy1) / 2, ys = (gy1 - gy0) / 2 / 1.55, xc = (gx0 + gx1) / 2, xs = (gx1 - gx0) / 2 / o.xmax;
          const X = v => xc + v * xs, Y = u => ym - u * ys;
          ctx.fillStyle = C.wash; ctx.globalAlpha = 0.9; ctx.fillRect(X(-o.x1), gy0, X(o.x1) - X(-o.x1), gy1 - gy0); ctx.globalAlpha = 1;
          ctx.save(); ctx.setLineDash([4, 3]); ctx.strokeStyle = C.line2; ctx.lineWidth = 1;
          [1, -1].forEach(u => { ctx.beginPath(); ctx.moveTo(gx0, Y(u)); ctx.lineTo(gx1, Y(u)); ctx.stroke(); });
          ctx.restore();
          P.arrow(gx0, ym, gx1, ym, C.ink3, 1.3, 7);
          P.arrow(xc, gy1, xc, gy0 - 4, C.ink3, 1.3, 7);
          ctx.strokeStyle = C.ink3; ctx.lineWidth = 1.3; ctx.beginPath();
          [-o.x1, o.x1].forEach(v => { ctx.moveTo(X(v), ym - 3); ctx.lineTo(X(v), ym + 3); }); ctx.stroke();
          /* เส้นลักษณะ */
          P.seg([[gx0, Y(-1)], [X(-o.x1), Y(-1)], [X(-o.x1), Y(0)], [X(o.x1), Y(0)], [X(o.x1), Y(1)], [gx1, Y(1)]], C.lin, 2.5);
          /* ป้าย */
          R(o.up, gx0 + 3, Y(1) - 8, 10.5, C.ink2, { weight: 600, halo: 3 });
          R(o.dn, gx0 + 3, Y(-1) + 9, 10.5, C.ink2, { weight: 600, halo: 3 });
          R(o.xl, gx1 - 1, ym - 9, 10.5, C.ink3, { align: "right", weight: 600, halo: 3 });
          R(o.yl, xc + 5, gy0 - 1, 10.5, C.ink3, { weight: 600, halo: 3 });
          R(o.tp, X(o.x1), ym + 11, 10.5, C.ink2, { align: "center", weight: 600, halo: 3 });
          R(o.tn, X(-o.x1), ym - 10, 10.5, C.ink2, { align: "center", weight: 600, halo: 3 });
          /* จุดสถานะปัจจุบัน */
          const a = o.vis;
          if (a > 0.01) {
            ctx.save(); ctx.globalAlpha = a;
            const px_ = X(o.val), py_ = Y(o.uOut);
            if (o.uOut) { ctx.setLineDash([3, 3]); ctx.strokeStyle = st === "cur" ? C.new : C.ref; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(px_, ym); ctx.lineTo(px_, py_); ctx.stroke(); ctx.setLineDash([]); }
            P.dot(px_, py_, 6, st === "cur" ? C.new : C.ref);
            R(o.vl, px_, o.below ? ym + 22 : ym - 14, 10.5, st === "cur" ? C.new : C.ref, { align: "center", weight: 700, halo: 3.5 });
            ctx.restore();
          }
        }
        relay(GA, {
          mode: k === 0 ? "pend" : k === 1 ? "cur" : "done", title: narrow ? "ДУ (9)" : "เซนเซอร์มุม ДУ · (9)", xmax: 5, x1: PHI1,
          up: [{ t: "+u", sub: "ном" }], dn: [{ t: "−u", sub: "ном" }], xl: ["φ, °"], yl: [{ t: "u", sub: "φ" }],
          tp: [{ t: "φ", sub: "1" }], tn: [{ t: "−φ", sub: "1" }],
          val: PHI, uOut: uDU, vis: V(1, 5), vl: ["φ = " + nf(PHI, 0) + "°"], below: true
        });
        relay(GB, {
          mode: k === 0 || k === 1 ? "pend" : k === 2 ? "cur" : "done", title: narrow ? "ДУС (10)" : "เซนเซอร์ความเร็วเชิงมุม ДУС · (10)", xmax: 1.2, x1: DPHI1,
          up: [{ t: "+u", sub: "ном" }], dn: [{ t: "−u", sub: "ном" }], xl: [PH, ", °/с"], yl: [{ t: "u", sub: "φ", subd: 1 }],
          tp: [{ t: "φ", d: 1, dy: 0.56, sub: "1" }], tn: ["−", { t: "φ", d: 1, dy: 0.56, sub: "1" }],
          val: DPHI, uOut: uDUS, vis: V(2, 5), vl: [PH, " = " + nf(DPHI, 1) + " °/с"], below: false
        });
      }
    });
  }
});
/* --- suka6-model.js --- */
/* suka6-model — จากสมการเต็มสู่สมการทั่วไปของการหมุนของยาน: dK/dt = M → สมการออยเลอร์ → มุมเล็ก → I_φ φ̈ = M_φ^у + M_φ^в
   สูตร: Л6 сл. 4–6 · (1)–(6) · ภาพ ค่าตัวอย่าง และการเทียบขนาดพจน์ไขว้ผู้เรียบเรียงทำ */
Object.assign(DEMOS, {
  "suka6-model": function (host) {
    const nf = window.STEPS2.nf;
    const sg = (v, d) => (v >= 0 ? "+" : "") + nf(v, d);
    const DEG = 180 / Math.PI;
    /* ค่าตัวอย่าง (ผู้เรียบเรียงเลือก) และสิ่งที่คำนวณจากมัน */
    const IX = 1000, IY = 1200, IZ = 800, OM = 0.01, PT = 10, LA = 1.5;
    const CR = [(IZ - IY) * OM * OM, (IX - IZ) * OM * OM, (IY - IX) * OM * OM];   // พจน์ไขว้ของสมการแกน x, y, z (Н·м)
    const MU = 2 * PT * LA;                                                        // M^у = 2Pl (7)
    const RATIO = Math.abs(CR[0]) / MU;
    const ACC = MU / IX, ACCD = ACC * DEG;
    const ED = '<span class="ed">ผู้เรียบเรียงเลือกค่า</span>', EC = '<span class="ed">ผู้เรียบเรียงคำนวณ</span>';

    /* ---------- MathML ---------- */
    const mi = s => "<mi>" + s + "</mi>", mo = s => "<mo>" + s + "</mo>", mth = s => "<math>" + s + "</math>";
    const rm = s => '<mi mathvariant="normal">' + s + "</mi>";
    const sb = (b, s) => "<msub>" + b + "<mi>" + s + "</mi></msub>";
    const sbsp = (b, s, p) => "<msubsup>" + b + "<mi>" + s + "</mi>" + p + "</msubsup>";
    const BAR = '<mo stretchy="false">&#x00AF;</mo>';
    const vec = n => '<mover accent="true"><mi>' + n + "</mi>" + BAR + "</mover>";
    const dot = b => '<mover accent="true">' + b + '<mo stretchy="false" style="font-size:1.6em">&#x02D9;</mo></mover>';
    const ddot = b => '<mover accent="true">' + b + '<mo stretchy="false" style="font-size:1.6em">&#x00A8;</mo></mover>';
    const frac = (a, b) => "<mfrac><mrow>" + a + "</mrow><mrow>" + b + "</mrow></mfrac>";
    const SU = rm("у"), SV = rm("в"), EQ = mo("="), PL = mo("+"), MN = mo("−");
    const PA = '<mo stretchy="false">(</mo>', PB = '<mo stretchy="false">)</mo>';
    const IJ = (a, b) => sb(mi("I"), a + b);
    const W = a => sb(mi("ω"), a);
    const DKDT = frac(mi("d") + vec("K"), mi("dt"));
    const F = {
      e1: mth(DKDT + EQ + vec("M")),
      e2: mth(DKDT + PL + vec("ω") + mo("×") + vec("K") + EQ + vec("M")),
      kiw: mth(vec("K") + EQ + mi("I") + vec("ω")),
      mat: mth(mi("I") + EQ + "<mrow><mo>[</mo><mtable>" +
        ["xx xy xz", "yx yy yz", "zx zy zz"].map(r => "<mtr>" + r.split(" ").map(c => "<mtd>" + sb(mi("I"), c) + "</mtd>").join("") + "</mtr>").join("") +
        "</mtable><mo>]</mo></mrow>"),
      eu: [
        mth(IJ("x", "x") + sb(dot(mi("ω")), "x") + PL + PA + IJ("z", "z") + MN + IJ("y", "y") + PB + W("y") + W("z") + EQ + sb(mi("M"), "x")),
        mth(IJ("y", "y") + sb(dot(mi("ω")), "y") + PL + PA + IJ("x", "x") + MN + IJ("z", "z") + PB + W("x") + W("z") + EQ + sb(mi("M"), "y")),
        mth(IJ("z", "z") + sb(dot(mi("ω")), "z") + PL + PA + IJ("y", "y") + MN + IJ("x", "x") + PB + W("y") + W("x") + EQ + sb(mi("M"), "z"))
      ],
      kin: ["γ|x", "ψ|y", "ϑ|z"].map(s => { const a = s.split("|"); return mth(dot(mi(a[0])) + EQ + W(a[1])); }),
      dyn: ["x|γ", "y|ψ", "z|ϑ"].map(s => { const a = s.split("|"); return mth(IJ(a[0], a[0]) + ddot(mi(a[1])) + EQ + sbsp(mi("M"), a[0], SU) + PL + sbsp(mi("M"), a[0], SV)); }),
      gen: mth(sb(mi("I"), "φ") + ddot(mi("φ")) + EQ + sbsp(mi("M"), "φ", SU) + PL + sbsp(mi("M"), "φ", SV)),
      acc: mth(ddot(mi("φ")) + EQ + frac(sbsp(mi("M"), "φ", SU), sb(mi("I"), "φ")))
    };

    const STEPS = [
      { title: "กฎอนุรักษ์โมเมนตัมเชิงมุม (1)",
        text: "อัตราเปลี่ยนของโมเมนตัมเชิงมุม (кинетический момент) " + mth(vec("K")) + " ของยานที่หมุนรอบจุดตรึง เท่ากับโมเมนต์รวม " + mth(vec("M")) +
          " ของแรงภายนอกทั้งหมดที่กระทำกับยาน โดยคิดรอบจุดหมุนเดียวกัน (ศูนย์กลางมวล O) · สมการ (1) เป็นสมการเวกเตอร์ ยังไม่ได้เลือกระบบพิกัด",
        alt: "กล่องแทนตัวยานแบบ 3 มิติ มีลูกศรโมเมนตัมเชิงมุม K และลูกศรโมเมนต์ M ออกจากศูนย์กลางมวล",
        nums: [{ k: "กฎอนุรักษ์ (1)", v: F.e1 }] },
      { title: "ในแกนที่ผูกกับตัวยาน (2)",
        text: "แยกเวกเตอร์เป็นองค์ประกอบบนแกน x, y, z ที่ผูกกับตัวยาน และถือว่ายานเป็นวัตถุแข็งเกร็ง (абсолютно твёрдое тело) จะได้ " + F.e2 + " โดย " + F.kiw +
          " และ " + mth(mi("I")) + " คือเมทริกซ์ความเฉื่อย · ตัวบนเส้นทแยงเป็นโมเมนต์ความเฉื่อยหลัก (главные) ตัวนอกเส้นทแยงเป็นโมเมนต์เหวี่ยง (центробежные) " +
          "· โดยทั่วไป " + mth(vec("K")) + " ไม่ขนานกับ " + mth(vec("ω")) + " (ขนานเฉพาะเมื่อ " + mth(vec("ω")) + " อยู่บนแกนหลักความเฉื่อย หรือโมเมนต์ความเฉื่อยหลักเท่ากันทุกแกน)",
        alt: "แกน x y z ผูกกับตัวยาน ลูกศร ω และลูกศร K = Iω ซึ่งโดยทั่วไปไม่ขนานกัน",
        nums: [{ k: "สมการ (2)", v: F.e2 }, { k: "โมเมนตัมเชิงมุม", v: F.kiw }, { k: "เมทริกซ์ความเฉื่อย", v: F.mat }] },
      { title: "แกนหลักความเฉื่อย → สมการออยเลอร์ (3)",
        text: "ถ้าแกนที่ผูกกับตัวยานเป็นแกนหลักความเฉื่อย โมเมนต์เหวี่ยงเป็นศูนย์ เมทริกซ์ " + mth(mi("I")) + " เหลือเฉพาะเส้นทแยง สมการ (2) จึงกลายเป็นสมการพลวัตของออยเลอร์ (динамические уравнения Эйлера) สามสมการ · " +
          "แต่ละสมการยังมีผลคูณของความเร็วเชิงมุมอีกสองแกนติดมา เป็นพจน์ไขว้ ทำให้สมการไม่เชิงเส้นและเชื่อมไขว้กัน (перекрёстные связи) · ค่าตัวอย่าง " + mth(mi("I")) +
          " = diag(" + nf(IX, 0) + "; " + nf(IY, 0) + "; " + nf(IZ, 0) + ") кг·м² " + ED,
        alt: "สมการออยเลอร์สามสมการ พจน์ไขว้ของสมการแกน x ถูกไฮไลต์",
        nums: [{ k: "สมการออยเลอร์ (3)", v: F.eu }] },
      { title: "เทียบขนาดพจน์ไขว้กับโมเมนต์ควบคุม",
        text: "ใส่ตัวเลขตัวอย่าง: ความเร็วเชิงมุมทุกแกน " + nf(OM, 2) + " рад/с คู่เครื่องยนต์ไอพ่นควบคุม (УРД) แรงขับ P = " + nf(PT, 0) + " Н ระยะ l = " + nf(LA, 1) + " м ได้ " +
          mth(sbsp(mi("M"), "φ", SU)) + " = 2Pl = " + nf(MU, 0) + " Н·м ส่วนพจน์ไขว้ของสมการแกน x มีขนาด " + nf(Math.abs(CR[0]), 2) + " Н·м คิดเป็น " + nf(RATIO * 100, 2) +
          " % ของโมเมนต์ควบคุม (ราว 1 ต่อ " + nf(MU / Math.abs(CR[0]), 0) + ") จึงตัดทิ้งได้เมื่อความเร็วเชิงมุมเล็ก · " + ED + " " + EC,
        alt: "คู่เครื่องยนต์ไอพ่นที่ปลายแขนสองข้างของตัวยาน และแถบเทียบขนาดโมเมนต์ควบคุม 30 นิวตันเมตรกับพจน์ไขว้ 0,04 นิวตันเมตรซึ่งเล็กจนแทบมองไม่เห็น",
        nums: [
          { k: "พจน์ไขว้ ของสมการแกน x", v: "(" + nf(IZ, 0) + " − " + nf(IY, 0) + ") · " + nf(OM, 2) + " · " + nf(OM, 2) + " = " + nf(CR[0], 2) + " Н·м" },
          { k: "พจน์ไขว้ ของสมการแกน y และ z", v: sg(CR[1], 2) + " และ " + sg(CR[2], 2) + " Н·м" },
          { k: "โมเมนต์ควบคุม 2Pl", v: "2 · " + nf(PT, 0) + " · " + nf(LA, 1) + " = " + nf(MU, 0) + " Н·м" },
          { k: "อัตราส่วน", v: nf(Math.abs(CR[0]), 2) + " / " + nf(MU, 0) + " = " + nf(RATIO * 100, 2) + " %", big: true }
        ] },
      { title: "มุมและความเร็วเชิงมุมเล็ก → สมการแยกอิสระ",
        text: "เมื่อ γ, ψ, ϑ และ ω เล็ก ให้แทน sin ด้วยมุมเอง แทน cos ด้วย 1 และตัดผลคูณของปริมาณเล็ก (ลำดับที่สอง) · สมการจลนศาสตร์ (4) เหลือ " + F.kin[0] + " " + F.kin[1] + " " + F.kin[2] +
          " และสมการพลวัตแยกเป็นสามสมการอิสระ (5) ที่ไม่ผูกกัน · γ คือ Roll (крен) รอบแกน x · ψ คือ Yaw (рыскание) รอบแกน y · ϑ คือ Pitch (тангаж) รอบแกน z",
        alt: "ลูกศรโค้งสามเส้นรอบแกน x y z แทนมุม γ Roll, ψ Yaw และ ϑ Pitch",
        nums: [{ k: "สมการจลนศาสตร์ที่เหลือ", v: F.kin }, { k: "สมการ (5) แยกอิสระ", v: F.dyn }] },
      { title: "สมการทั่วไป (6)",
        text: "สามสมการ (5) หน้าตาเหมือนกัน จึงเขียนรวมเป็นสมการเดียว " + F.gen + " เมื่อ φ ∈ {γ, ψ, ϑ} · " + mth(sbsp(mi("M"), "φ", SU)) + " คือโมเมนต์ควบคุม (управляющий) " +
          mth(sbsp(mi("M"), "φ", SV)) + " คือโมเมนต์รบกวน (возмущающий) · ตัวอย่าง φ = γ ไม่มีโมเมนต์รบกวน: ความเร่งเชิงมุม " + nf(ACC, 2) + " рад/с² ≈ " + nf(ACCD, 2) + " °/с² " + EC,
        alt: "สมการทั่วไป I_φ φ̈ = M_φ^у + M_φ^в และตัวอย่างความเร่งเชิงมุม 0,03 เรเดียนต่อวินาทีกำลังสอง",
        nums: [
          { k: "สมการทั่วไป (6)", v: F.gen },
          { k: "ตัวอย่าง φ = γ · " + mth(sbsp(mi("M"), "φ", SV)) + " = 0", v: F.acc },
          { k: "แทนค่า", v: nf(MU, 0) + " / " + nf(IX, 0) + " = " + nf(ACC, 2) + " рад/с²", big: true, note: "≈ " + nf(ACCD, 2) + " °/с²" }
        ] }
    ];

    /* ---------- เรขาคณิตสามมิติ (isometric: x ไปขวาล่าง · y ขึ้น · z ไปซ้ายล่าง ระบบมือขวา) ---------- */
    const HX = 0.9, HY = 0.55, HZ = 0.75, ZL = 1.6, FL = 0.75;
    const TIP = [2.05, 1.5, 2.05];
    const VK = [1.0, 1.55, 0.35], VW = [1.35, 1.0, -0.1], VM = [-0.6, 0.9, 1.5];
    const DK0 = (() => { const n = Math.hypot(VM[0], VM[1], VM[2]); return [VK[0] + VM[0] / n * 0.75, VK[1] + VM[1] / n * 0.75, VK[2] + VM[2] / n * 0.75]; })();
    const ARC = [{ c: [1.45, 0, 0], ax: 0, r: 0.45 }, { c: [0, 1.1, 0], ax: 1, r: 0.5 }, { c: [0, 0, 1.35], ax: 2, r: 0.45 }];
    const proj = (x, y, z) => [0.866 * (x - z), y - 0.5 * (x + z)];
    function arcPt(a, t) {
      const c = a.r * Math.cos(t), s = a.r * Math.sin(t);
      return a.ax === 0 ? [a.c[0], a.c[1] + c, a.c[2] + s] : a.ax === 1 ? [a.c[0] + s, a.c[1], a.c[2] + c] : [a.c[0] + c, a.c[1] + s, a.c[2]];
    }
    const B = (() => {
      const pts = [];
      [-1, 1].forEach(a => [-1, 1].forEach(b => [-1, 1].forEach(c => pts.push([a * HX, b * HY, c * HZ]))));
      pts.push([TIP[0], 0, 0], [0, TIP[1], 0], [0, 0, TIP[2]], VK, VW, VM, DK0, [0, 0, -ZL], [0, -FL, ZL], [0, FL, -ZL]);
      ARC.forEach(a => { for (let i = 0; i <= 12; i++) pts.push(arcPt(a, 0.5 + 4.2 * i / 12)); });
      let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
      pts.forEach(p => { const q = proj(p[0], p[1], p[2]); u0 = Math.min(u0, q[0]); u1 = Math.max(u1, q[0]); v0 = Math.min(v0, q[1]); v1 = Math.max(v1, q[1]); });
      return { u0: u0 - 0.2, u1: u1 + 0.2, v0: v0 - 0.2, v1: v1 + 0.2 };
    })();

    /* ---------- ข้อความหลายส่วน (ตัวห้อย/ตัวยก/สี) บน canvas ---------- */
    function rich(ctx, C, parts, x, y, size, color, o) {
      o = o || {};
      const wt = o.weight || 500, halo = o.halo === undefined ? 3.5 : o.halo;
      const toks = parts.map(p => typeof p === "string" ? { t: p } : p);
      const setf = (t, s) => { ctx.font = (t.i ? "italic " : "") + (t.b ? 700 : wt) + " " + s.toFixed(1) + "px " + C.font; };
      function measure(sz) {
        let tot = 0;
        const ms = toks.map(t => {
          const s = sz * (t.s || 1);
          setf(t, s); const mw = t.t ? ctx.measureText(t.t).width : 0;
          let sw = 0;
          if (t.sub) { setf(t, s * 0.72); sw = ctx.measureText(t.sub).width; }
          if (t.sup) { setf(t, s * 0.72); sw = Math.max(sw, ctx.measureText(t.sup).width); }
          const wd = mw + sw + (sw ? 1 : 0);
          tot += wd; return { mw, wd, s };
        });
        return { tot, ms };
      }
      let sz = size, m = measure(sz);
      if (o.fit && m.tot > o.fit) { sz = Math.max(size * 0.75, size * o.fit / m.tot); m = measure(sz); }
      let x0 = o.align === "center" ? x - m.tot / 2 : o.align === "right" ? x - m.tot : x;
      if (o.W) x0 = Math.max(4, Math.min(o.W - 4 - m.tot, x0));
      ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
      for (let pass = halo > 0 ? 0 : 1; pass < 2; pass++) {
        let cx = x0;
        toks.forEach((t, i) => {
          const s = m.ms[i].s, bx = cx + m.ms[i].mw + (t.sub || t.sup ? 1 : 0);
          const piece = (txt, px, py, ps) => {
            setf(t, ps);
            if (pass === 0) { ctx.lineWidth = halo; ctx.strokeStyle = C.bg; ctx.strokeText(txt, px, py); } else { ctx.fillStyle = t.c || color; ctx.fillText(txt, px, py); }
          };
          if (t.t) piece(t.t, cx, y, s);
          if (pass === 1 && t.d && t.t) {            // จุดอนุพันธ์วาดเอง (φ̇ φ̈) ให้อยู่เหนือตัวอักษรพอดี
            ctx.fillStyle = t.c || color;
            const xm = cx + m.ms[i].mw / 2, yd = y - s * (t.dy || 0.5), rd = Math.max(1.2, s * 0.07);
            for (let j = 0; j < t.d; j++) { ctx.beginPath(); ctx.arc(xm + (j - (t.d - 1) / 2) * s * 0.2, yd, rd, 0, Math.PI * 2); ctx.fill(); }
          }
          if (t.sub) piece(t.sub, bx, y + s * 0.30, s * 0.72);
          if (t.sup) piece(t.sup, bx, y - s * 0.40, s * 0.72);
          cx += m.ms[i].wd;
        });
      }
      return { x: x0, w: m.tot };
    }

    return window.STEPS2(host, {
      label: "แอนิเมชันทีละขั้น",
      title: 'จากสมการเต็มสู่สมการทั่วไปของการหมุนของยาน <span style="white-space:nowrap">(сл. 4–6)</span>',
      aria: "แอนิเมชันจากสมการเต็มสู่สมการทั่วไปของการหมุนของยานทีละขั้น",
      steps: STEPS,
      caption: "สมการตามข้อความบรรยายที่ 6 (1)–(6) · ค่าโมเมนต์ความเฉื่อย/แรงขับ/ความเร็วเชิงมุมในตัวอย่างผู้เรียบเรียงเลือกเพื่อเทียบขนาดพจน์ ·  ภาพยานเป็นกล่องสมมติ ไม่ใช่ยานจริง",
      height: w => w < 560 ? Math.round(Math.max(540, w * 1.46)) : 410,
      draw(ctx, w, h, k, C, anim) {
        const P = window.STEPS2.pen(ctx, w, h, C);
        const narrow = w < 560, ks = w < 480 ? 0.92 : 1;
        const clamp = x => Math.max(0, Math.min(1, x));
        /* ความทึบของสิ่งที่แสดงเฉพาะขั้น a…b (ไม่ซ้อนกันตอนเปลี่ยนขั้น) */
        const V = (a, b) => {
          const inn = s => (s >= a && s <= b ? 1 : 0);
          const vt = inn(anim.to), vf = inn(anim.from);
          if (anim.p >= 1 || vt === vf) return vt;
          return vt ? clamp((anim.p - 0.4) / 0.5) : 1 - clamp(anim.p / 0.4);
        };
        const pic = narrow ? { x: 0, y: 0, w: w, h: Math.round(h * 0.45) } : { x: 0, y: 0, w: Math.round(w * 0.44), h: h };
        const pan = narrow ? { x: 0, y: pic.h, w: w, h: h - pic.h } : { x: pic.w, y: 0, w: w - pic.w, h: h };
        ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath();
        if (narrow) { ctx.moveTo(10, pic.h + 0.5); ctx.lineTo(w - 10, pic.h + 0.5); } else { ctx.moveTo(pic.w + 0.5, 12); ctx.lineTo(pic.w + 0.5, h - 12); }
        ctx.stroke();

        /* ======================= ภาพยาน ======================= */
        const mg = 12;
        const sc = Math.min((pic.w - 2 * mg) / (B.u1 - B.u0), (pic.h - 2 * mg) / (B.v1 - B.v0));
        const ox = pic.x + pic.w / 2 - sc * (B.u0 + B.u1) / 2, oy = pic.y + pic.h / 2 + sc * (B.v0 + B.v1) / 2;
        const S = (x, y, z) => { const p = proj(x, y, z); return [ox + sc * p[0], oy - sc * p[1]]; };
        const SA = a => S(a[0], a[1], a[2]);
        const O = S(0, 0, 0);
        const face = (pts, shade) => {
          ctx.beginPath(); pts.forEach((p, i) => { const q = SA(p); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.closePath();
          ctx.fillStyle = C.wash; ctx.fill();
          if (shade) { ctx.fillStyle = "rgba(0,0,0," + shade + ")"; ctx.fill(); }
          ctx.lineWidth = 1.5; ctx.strokeStyle = C.ink2; ctx.lineJoin = "round"; ctx.stroke();
        };
        const lab = (txt, p, col, o) => P.label(txt, p[0], p[1], col, o);
        const away = (p, from, d) => { const dx = p[0] - from[0], dy = p[1] - from[1], n = Math.hypot(dx, dy) || 1; return [p[0] + dx / n * d, p[1] + dy / n * d]; };

        const aThr = V(3, 3);
        if (aThr > 0.01) {                     // แขนและแรงขับของคู่ УРД ด้านหลัง (ถูกกล่องบังบางส่วน)
          ctx.globalAlpha = aThr;
          P.seg([S(0, 0, -ZL), S(0, 0, -HZ)], C.ink2, 3);
          const a = S(0, 0, -ZL), b = S(0, FL, -ZL);
          P.arrow(a[0], a[1], b[0], b[1], C.new, 2.6, 10);
          ctx.globalAlpha = 1;
        }
        face([[-HX, -HY, HZ], [HX, -HY, HZ], [HX, HY, HZ], [-HX, HY, HZ]], 0.13);        // หน้า +z
        face([[HX, -HY, -HZ], [HX, -HY, HZ], [HX, HY, HZ], [HX, HY, -HZ]], 0.06);       // หน้า +x
        face([[-HX, HY, -HZ], [HX, HY, -HZ], [HX, HY, HZ], [-HX, HY, HZ]], 0);          // หน้าบน +y
        ctx.beginPath(); ctx.arc(O[0], O[1], 3.2, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();

        const aAx = V(1, 5);
        if (aAx > 0.01) {                      // แกนที่ผูกกับตัวยาน
          ctx.globalAlpha = aAx;
          const ax = [[[HX, 0, 0], [TIP[0], 0, 0], "x"], [[0, HY, 0], [0, TIP[1], 0], "y"], [[0, 0, HZ], [0, 0, TIP[2]], "z"]];
          ax.forEach(a => {
            const p = SA(a[0]), q = SA(a[1]);
            P.arrow(p[0], p[1], q[0], q[1], C.ink2, 1.6, 8);
            const t = away(q, O, 11 * ks);
            lab(a[2], t, C.ink2, { size: 13 * ks, weight: 700, mono: true, align: "center", halo: 3 });
          });
          lab("O", [O[0] - 9, O[1] + 11], C.ink3, { size: 11 * ks, mono: true, align: "right", halo: 3 });
          ctx.globalAlpha = 1;
        }
        const aThr2 = V(3, 3);
        if (aThr2 > 0.01) {                    // แขนและแรงขับด้านหน้า + ระยะ l + โมเมนต์ M^у รอบแกน x
          ctx.globalAlpha = aThr2;
          const p0 = S(0, 0, HZ), p1 = S(0, 0, ZL);
          P.seg([p0, p1], C.ink2, 3);
          ctx.beginPath(); ctx.arc(p1[0], p1[1], 4, 0, Math.PI * 2); ctx.fillStyle = C.new; ctx.fill();
          ctx.beginPath(); ctx.arc(S(0, 0, -ZL)[0], S(0, 0, -ZL)[1], 4, 0, Math.PI * 2); ctx.fill();
          const f1 = S(0, -FL, ZL);
          P.arrow(p1[0], p1[1], f1[0], f1[1], C.new, 2.6, 10);
          lab("P", away(f1, p1, 11 * ks), C.new, { size: 14 * ks, weight: 700, align: "center" });
          const fb = S(0, FL, -ZL);
          lab("P", away(fb, S(0, 0, -ZL), 11 * ks), C.new, { size: 14 * ks, weight: 700, align: "center" });
          const ml = S(0, -0.28, ZL * 0.62);                     // ระยะ l วัดจากศูนย์กลางมวลถึงแกนแรงขับ
          P.seg([S(0, -0.18, 0), S(0, -0.18, ZL)], C.ink3, 1.2, [4, 3]);
          lab("l = " + nf(LA, 1) + " м", [ml[0] + 6 * ks, ml[1] + 4], C.ink2, { size: 12 * ks, weight: 600, align: "left", halo: 3.5 });
          ctx.globalAlpha = 1;
        }
        function arc3(a, t0, t1, col, wd) {
          const pts = [], n = 40;
          for (let i = 0; i <= n; i++) pts.push(SA(arcPt(a, t0 + (t1 - t0) * i / n)));
          P.seg(pts, col, wd || 2.4);
          P.arrow(pts[n - 3][0], pts[n - 3][1], pts[n][0], pts[n][1], col, wd || 2.4, 9);
          return pts;
        }
        const aMu = V(3, 3);
        if (aMu > 0.01) {                       // โมเมนต์ควบคุม M^у รอบแกน x
          ctx.globalAlpha = aMu;
          const pts = arc3(ARC[0], 0.5, 4.7, C.new, 2.6);
          const pm = pts[22], pc = SA(ARC[0].c);
          const tp = away(pm, pc, 20 * ks);
          rich(ctx, C, [{ t: "M", sub: "x", sup: "у" }, " = 2Pl"], Math.min(tp[0], pic.x + pic.w - 38 * ks), tp[1], 13 * ks, C.new, { weight: 700, align: "center", W: w });
          ctx.globalAlpha = 1;
        }

        const aV1 = V(0, 0);
        if (aV1 > 0.01) {                       // ขั้น 1: K และ M
          ctx.globalAlpha = aV1;
          const kt = SA(VK), mt = SA(VM), dk = SA(DK0);
          P.arrow(O[0], O[1], mt[0], mt[1], C.new, 2.8, 10);
          P.arrow(O[0], O[1], kt[0], kt[1], C.ref, 2.8, 10);
          const d1 = [kt[0] + (dk[0] - kt[0]) * 0.8, kt[1] + (dk[1] - kt[1]) * 0.8];
          P.seg([kt, d1], C.ref, 1.8, [5, 4]);
          P.arrow(d1[0], d1[1], dk[0], dk[1], C.ref, 1.8, 8);
          lab("K", away(kt, O, 12 * ks), C.ref, { size: 17 * ks, weight: 700, align: "center" });
          lab("M", away(mt, O, 12 * ks), C.new, { size: 17 * ks, weight: 700, align: "center" });
          lab("dK/dt", [dk[0] - 8, dk[1] - 10], C.ref, { size: 12.5 * ks, weight: 600, align: "center" });
          ctx.globalAlpha = 1;
        }
        const aV2 = V(1, 2);
        if (aV2 > 0.01) {                       // ขั้น 2–3: ω และ K = Iω
          ctx.globalAlpha = aV2;
          const kt = SA(VK), wt = SA(VW);
          P.arrow(O[0], O[1], wt[0], wt[1], C.meas, 2.8, 10);
          P.arrow(O[0], O[1], kt[0], kt[1], C.ref, 2.8, 10);
          lab("ω", away(wt, O, 12 * ks), C.meas, { size: 17 * ks, weight: 700, align: "center" });
          lab("K = Iω", away(kt, O, 17 * ks), C.ref, { size: 14 * ks, weight: 700, align: "center" });
          ctx.globalAlpha = 1;
        }
        const aArc = V(4, 5);
        if (aArc > 0.01) {                      // ขั้น 5–6: มุม γ ψ ϑ
          ctx.globalAlpha = aArc;
          const cols = [C.meas, C.lin, C.new], names = ["γ Roll", "ψ Yaw", "ϑ Pitch"];
          ARC.forEach((a, i) => {
            const pts = arc3(a, 0.5, 4.7, cols[i], 2.6);
            const pm = pts[22], pc = SA(a.c);
            const tp = away(pm, pc, 20 * ks);
            lab(names[i], [Math.max(pic.x + 34, Math.min(pic.x + pic.w - 34, tp[0])), tp[1]], cols[i], { size: 12.5 * ks, weight: 700, align: "center" });
          });
          ctx.globalAlpha = 1;
        }

        /* ======================= แผงสูตร ======================= */
        const px = pan.x + 14, pw = pan.w - 28;
        const R = (parts, x, y, size, color, o) => rich(ctx, C, parts, x, y, size * ks, color, Object.assign({ W: w, fit: pw - (x - px) }, o || {}));
        const hd = (txt, y) => R([txt], px, y, 12.5, C.ink3, { weight: 600 });
        const BO = (t, c, extra) => Object.assign({ t: t, b: true, c: c }, extra || {});
        const T0 = pan.y + 24 * ks;

        let a = V(0, 0);
        if (a > 0.01) {                         // ขั้น 1
          ctx.globalAlpha = a;
          hd("(1)  กฎอนุรักษ์โมเมนตัมเชิงมุม", T0);
          R(["закон сохранения момента количества движения"], px, T0 + 17 * ks, 11, C.ink3, { weight: 400 });
          R(["d", BO("K", C.ref), " / dt  =  ", BO("M", C.new)], px, T0 + 70 * ks, 32, C.ink, { weight: 600 });
          R([BO("K", C.ref, { s: 1.1 }), "   โมเมนตัมเชิงมุม ของยาน"], px, T0 + 128 * ks, 14, C.ink, {});
          R(["кинетический момент"], px + 24 * ks, T0 + 145 * ks, 11, C.ink3, { weight: 400 });
          R([BO("M", C.new, { s: 1.1 }), "   โมเมนต์รวม ของแรงภายนอก"], px, T0 + 175 * ks, 14, C.ink, {});
          R(["главный момент внешних сил"], px + 24 * ks, T0 + 192 * ks, 11, C.ink3, { weight: 400 });
          R(["ตัวหนาหรือลูกศรบน = เวกเตอร์"], px, T0 + 222 * ks, 11.5, C.ink3, { weight: 400 });
          ctx.globalAlpha = 1;
        }
        a = V(1, 1);
        if (a > 0.01) {                         // ขั้น 2
          ctx.globalAlpha = a;
          hd("(2)  ในแกนที่ผูกกับตัวยาน", T0);
          R(["связанная система координат"], px, T0 + 17 * ks, 11, C.ink3, { weight: 400 });
          R(["d", BO("K", C.ref), "/dt + ", BO("ω", C.meas), " × ", BO("K", C.ref), " = ", BO("M", C.new)], px, T0 + 54 * ks, 22, C.ink, { weight: 600 });
          R([BO("K", C.ref), "  =  ", "I ", BO("ω", C.meas)], px, T0 + 90 * ks, 19, C.ink, { weight: 600 });
          const mx = px + 34 * ks, mw = Math.min(pw - 44 * ks, 250), rh = 27 * ks, my = T0 + 140 * ks;
          R(["I  ="], px, my + rh, 19, C.ink, { weight: 600, fit: 36 });
          const idx = ["xx", "xy", "xz", "yx", "yy", "yz", "zx", "zy", "zz"];
          idx.forEach((s, i) => {
            const r = (i / 3) | 0, c = i % 3, diag = r === c;
            R([{ t: "I", sub: s, b: diag, c: diag ? C.ref : C.meas }], mx + mw * (c * 2 + 1) / 6, my + r * rh, 16, C.ink, { align: "center", weight: 500, fit: mw / 3 - 4 });
          });
          ctx.strokeStyle = C.ink2; ctx.lineWidth = 1.6; ctx.beginPath();
          const y0 = my - rh * 0.62, y1 = my + rh * 2.62;
          ctx.moveTo(mx + 6, y0); ctx.lineTo(mx, y0); ctx.lineTo(mx, y1); ctx.lineTo(mx + 6, y1);
          ctx.moveTo(mx + mw - 6, y0); ctx.lineTo(mx + mw, y0); ctx.lineTo(mx + mw, y1); ctx.lineTo(mx + mw - 6, y1);
          ctx.stroke();
          const ly = my + rh * 3.45;
          ctx.fillStyle = C.ref; ctx.fillRect(px, ly - 5, 10, 10);
          R(["โมเมนต์ความเฉื่อยหลัก (главные)"], px + 16, ly, 12.5, C.ink2, { weight: 500 });
          ctx.fillStyle = C.meas; ctx.fillRect(px, ly + 22 * ks - 5, 10, 10);
          R(["โมเมนต์เหวี่ยง (центробежные)"], px + 16, ly + 22 * ks, 12.5, C.ink2, { weight: 500 });
          ctx.globalAlpha = 1;
        }
        a = V(2, 2);
        if (a > 0.01) {                         // ขั้น 3
          ctx.globalAlpha = a;
          hd("แกนที่ผูกกับตัวยาน = แกนหลักความเฉื่อย", T0);
          R([{ t: "I", sub: "xy" }, " = ", { t: "I", sub: "xz" }, " = … = 0", "   (โมเมนต์เหวี่ยงเป็นศูนย์)"], px, T0 + 24 * ks, 13, C.ink2, { weight: 500 });
          R(["I = diag(" + nf(IX, 0) + "; " + nf(IY, 0) + "; " + nf(IZ, 0) + ") кг·м²"], px, T0 + 52 * ks, 14, C.ink, { weight: 600 });
          hd("(3)  สมการพลวัตของออยเลอร์ (уравнения Эйлера)", T0 + 92 * ks);
          const rows = [
            [["x", "x", "z", "y"], "y", "z"],
            [["y", "y", "x", "z"], "x", "z"],
            [["z", "z", "y", "x"], "y", "x"]
          ];
          const sz = 15.5, ry = T0 + 128 * ks, rg = 40 * ks;
          rows.forEach((r, i) => {
            const y = ry + i * rg, ax = r[0][0];
            const left = R([{ t: "I", sub: ax + ax }, " ", { t: "ω", d: 1, dy: 0.38, sub: ax }, " + "], px, y, sz, C.ink, { fit: 9999 });
            const cr = R(["(", { t: "I", sub: r[0][2] + r[0][2] }, " − ", { t: "I", sub: r[0][3] + r[0][3] }, ") ", { t: "ω", sub: r[1] }, " ", { t: "ω", sub: r[2] }],
              left.x + left.w, y, sz, C.new, { fit: 9999, weight: 700 });
            R([" = ", { t: "M", sub: ax }], cr.x + cr.w, y, sz, C.ink, { fit: 9999 });
            if (i === 0) {
              ctx.strokeStyle = C.new; ctx.lineWidth = 1.5; ctx.beginPath();
              const rx = cr.x - 4, ry0 = y - 14 * ks, rw = cr.w + 8, rr = 7;
              ctx.moveTo(rx + rr, ry0); ctx.arcTo(rx + rw, ry0, rx + rw, ry0 + 28 * ks, rr); ctx.arcTo(rx + rw, ry0 + 28 * ks, rx, ry0 + 28 * ks, rr);
              ctx.arcTo(rx, ry0 + 28 * ks, rx, ry0, rr); ctx.arcTo(rx, ry0, rx + rw, ry0, rr); ctx.closePath(); ctx.stroke();
            }
          });
          R(["กรอบ = พจน์ไขว้ ที่ทำให้ไม่เชิงเส้น"], px, ry + 3 * rg - 8 * ks, 11.5, C.new, { weight: 500 });
          ctx.globalAlpha = 1;
        }
        a = V(3, 3);
        if (a > 0.01) {                         // ขั้น 4
          ctx.globalAlpha = a;
          hd("เทียบขนาดพจน์ (ค่าตัวอย่าง)", T0);
          R(["(", { t: "I", sub: "zz" }, " − ", { t: "I", sub: "yy" }, ") ", { t: "ω", sub: "y" }, " ", { t: "ω", sub: "z" }, "  =  (" + nf(IZ, 0) + " − " + nf(IY, 0) + ") · " + nf(OM, 2) + " · " + nf(OM, 2)], px, T0 + 30 * ks, 13.5, C.ink, { weight: 500 });
          R(["=  " + nf(CR[0], 2) + " Н·м"], px + 20 * ks, T0 + 54 * ks, 15, C.new, { weight: 700 });
          R([{ t: "M", sup: "у" }, " = 2Pl = 2 · " + nf(PT, 0) + " · " + nf(LA, 1) + "  =  " + nf(MU, 0) + " Н·м"], px, T0 + 86 * ks, 15, C.ref, { weight: 700 });
          const grow = anim.from !== 3 && anim.p < 1 ? anim.e : 1;
          const by = T0 + 128 * ks, bh = 15 * ks;
          R(["โมเมนต์ควบคุม ", { t: "M", sup: "у" }, " = " + nf(MU, 0) + " Н·м"], px, by - 14 * ks, 12, C.ink3, { weight: 600 });
          ctx.fillStyle = C.ref; ctx.fillRect(px, by, pw * grow, bh);
          R(["พจน์ไขว้ = " + nf(Math.abs(CR[0]), 2) + " Н·м (ขนาด)"], px, by + bh + 22 * ks, 12, C.ink3, { weight: 600 });
          const sliver = Math.max(2.5, pw * RATIO) * grow;
          ctx.fillStyle = C.new; ctx.fillRect(px, by + bh + 34 * ks, sliver, bh);
          ctx.strokeStyle = C.line2; ctx.lineWidth = 1; ctx.strokeRect(px + 0.5, by + bh + 34 * ks + 0.5, pw - 1, bh - 1);
          R([nf(RATIO * 100, 2) + " %  ← แทบมองไม่เห็นในสเกลเดียวกัน"], px + 12 * ks, by + bh + 34 * ks + bh / 2, 12, C.new, { weight: 600 });
          ctx.globalAlpha = 1;
        }
        a = V(4, 4);
        if (a > 0.01) {                         // ขั้น 5
          ctx.globalAlpha = a;
          hd("มุมและความเร็วเชิงมุมเล็ก (малые)", T0);
          const chips = ["sin φ → φ", "cos φ → 1", "ω·ω → 0"];
          const cw = (pw - 2 * 8) / 3;
          chips.forEach((t, i) => {
            const cx = px + i * (cw + 8), cy = T0 + 18 * ks;
            ctx.beginPath(); ctx.roundRect ? ctx.roundRect(cx, cy, cw, 28 * ks, 8) : ctx.rect(cx, cy, cw, 28 * ks);
            ctx.fillStyle = C.sunk; ctx.fill(); ctx.strokeStyle = C.line2; ctx.lineWidth = 1; ctx.stroke();
            R([t], cx + cw / 2, cy + 14 * ks, 13, C.ink, { align: "center", weight: 600, fit: cw - 8, halo: 0 });
          });
          hd("สมการจลนศาสตร์ (4) เหลือ", T0 + 78 * ks);
          const cols = [C.meas, C.lin, C.new], an = ["γ", "ψ", "ϑ"], wx = ["x", "y", "z"];
          an.forEach((g, i) => R([{ t: g, b: true, c: cols[i], d: 1, dy: g === "γ" ? 0.38 : 0.56 }, " = ", { t: "ω", sub: wx[i] }], px + i * pw / 3, T0 + 104 * ks, 17, C.ink, { weight: 600, fit: pw / 3 - 6 }));
          hd("สมการพลวัต (5) แยกอิสระ", T0 + 142 * ks);
          const ax = ["x", "y", "z"];
          an.forEach((g, i) => R([{ t: "I", sub: ax[i] + ax[i] }, " ", { t: g, b: true, c: cols[i], d: 2, dy: g === "γ" ? 0.38 : 0.56 }, " = ", { t: "M", sub: ax[i], sup: "у" }, " + ", { t: "M", sub: ax[i], sup: "в" }],
            px, T0 + (172 + i * 34) * ks, 16, C.ink, { weight: 500 }));
          ctx.globalAlpha = 1;
        }
        a = V(5, 5);
        if (a > 0.01) {                         // ขั้น 6
          ctx.globalAlpha = a;
          hd("(6)  สมการทั่วไป (обобщённое уравнение)", T0);
          R([{ t: "I", sub: "φ" }, " ", { t: "φ", d: 2, dy: 0.56 }, " = ", { t: "M", sub: "φ", sup: "у" }, " + ", { t: "M", sub: "φ", sup: "в" }], px, T0 + 46 * ks, 26, C.ink, { weight: 600 });
          R(["φ ∈ { ", BO("γ", C.meas), ", ", BO("ψ", C.lin), ", ", BO("ϑ", C.new), " }"], px, T0 + 86 * ks, 17, C.ink, { weight: 600 });
          hd("ตัวอย่าง φ = γ  ·  ไม่มีโมเมนต์รบกวน", T0 + 124 * ks);
          R([{ t: "φ", c: C.meas, b: true, d: 2, dy: 0.56 }, " = ", { t: "M", sub: "φ", sup: "у" }, " / ", { t: "I", sub: "φ" }], px, T0 + 156 * ks, 17, C.ink, { weight: 600 });
          R(["=  " + nf(MU, 0) + " / " + nf(IX, 0)], px + 20 * ks, T0 + 186 * ks, 16, C.ink, { weight: 500 });
          R(["=  " + nf(ACC, 2) + " рад/с²"], px + 20 * ks, T0 + 214 * ks, 17, C.new, { weight: 700 });
          R(["≈  " + nf(ACCD, 2) + " °/с²"], px + 20 * ks, T0 + 242 * ks, 15, C.ink2, { weight: 600 });
          ctx.globalAlpha = 1;
        }
      }
    });
  }
});
/* --- suka6-parab.js --- */
/* suka6-parab — สามกรณีของ Φ บนระนาบเฟส: Φ = 0 เส้นตรง · Φ = +1 พาราโบลาเปิดขวา · Φ = −1 พาราโบลาเปิดซ้าย · สูตร: Л6 сл. 11–15 · (14)–(16)
   ภาพ ค่าตัวอย่าง และตัวเลขที่คำนวณจากสมการ (16) ผู้เรียบเรียงทำ */
Object.assign(DEMOS, {
  "suka6-parab": function (host) {
    const nf = window.STEPS2.nf;
    /* ค่าตัวอย่าง (ผู้เรียบเรียงเลือก) · หน่วย ° และ °/с */
    const PHI0 = -10, DPHI0 = 2, W1 = 0.5, W2 = 1.0;
    const XMIN = -16, XMAX = 8, YMAX = 5;                         // ขอบเขตภาพ
    /* จากสมการ (16): φ̇² = φ̇₀² + 2·Φ·w·(φ − φ₀) → จุดยอดบนแกน φ ที่ φ_v = φ₀ − Φ·φ̇₀²/(2w) */
    const vert = (s, wv) => PHI0 - s * DPHI0 * DPHI0 / (2 * wv);
    const phiOnV = (s, wv, v) => vert(s, wv) + s * v * v / (2 * wv);   // φ ที่ความเร็ว v บนวิถี
    const T0 = (0 - PHI0) / DPHI0;                                // เวลาถึง φ = 0 เมื่อ Φ = 0
    const VP = vert(1, W1), VM = vert(-1, W1), VM2 = vert(-1, W2);
    const V0P = Math.sqrt(DPHI0 * DPHI0 + 2 * W1 * (0 - PHI0));  // φ̇ ที่ φ = 0 เมื่อ Φ = +1
    const TV = DPHI0 / W1;                                        // เวลาถึงจุดยอดเมื่อ Φ = −1
    const PCMP = -15, A1 = Math.sqrt(2 * W1 * (VM - PCMP)), A2 = Math.sqrt(2 * W2 * (VM2 - PCMP));
    const DD = 8, B1 = Math.sqrt(2 * W1 * DD), B2 = Math.sqrt(2 * W2 * DD);
    const ED = '<span class="ed">ผู้เรียบเรียงเลือกค่า</span>', EC = '<span class="ed">ผู้เรียบเรียงคำนวณ</span>';

    /* ---------- MathML ---------- */
    const mi = s => "<mi>" + s + "</mi>", mn = s => "<mn>" + s + "</mn>", mo = s => "<mo>" + s + "</mo>", mth = s => "<math>" + s + "</math>";
    const rm = s => '<mi mathvariant="normal">' + s + "</mi>";
    const sb = (b, s) => "<msub>" + b + s + "</msub>";
    const sq = b => "<msup>" + b + "<mn>2</mn></msup>";
    const dot = b => '<mover accent="true">' + b + '<mo stretchy="false" style="font-size:1.6em">&#x02D9;</mo></mover>';
    const frac = (a, b) => "<mfrac><mrow>" + a + "</mrow><mrow>" + b + "</mrow></mfrac>";
    const par = x => '<mo stretchy="false">(</mo>' + x + '<mo stretchy="false">)</mo>';
    const phi = mi("φ"), dphi = dot(phi), phi0 = sb(phi, mn(0)), dphi0 = sb(dphi, mn(0)), wn = sb(mi("w"), rm("ном")), phiV = sb(phi, mi("v"));
    const EQ = mo("="), PL = mo("+"), MI = mo("−"), TT = mo("·"), AB = x => '<mo stretchy="false">|</mo>' + x + '<mo stretchy="false">|</mo>';
    const PHm = mth(phi), DPm = mth(dphi), WNm = mth(wn), P0m = mth(phi0), D0m = mth(dphi0), PVm = mth(phiV);
    const gen = s => mth(sq(dphi) + EQ + sq(dphi0) + (s > 0 ? PL : MI) + mn(2) + wn + par(phi + MI + phi0));
    const sgnPhi0 = (PHI0 < 0 ? PL : MI) + mn(nf(Math.abs(PHI0), 0));
    const num = (s, wv) => mth(sq(dphi) + EQ + mn(nf(DPHI0 * DPHI0, 0)) + (s > 0 ? PL : MI) + mn(nf(2 * wv, 1)) + TT + par(phi + sgnPhi0));
    const vertN = (s, wv) => mth(phiV + EQ + mn(nf(PHI0, 0)) + (s > 0 ? MI : PL) + frac(mn(nf(DPHI0 * DPHI0, 0)), mn(2) + TT + mn(nf(wv, 1))) + EQ + mn(nf(vert(s, wv), 0)));

    const STEPS = [
      { title: "ระนาบเฟสและจุดเริ่ม",
        text: "ระนาบเฟส (фазовая плоскость) มีแกนนอนเป็นมุม " + PHm + " แกนตั้งเป็นความเร็วเชิงมุม " + DPm + " · ยานเริ่มที่ (" + P0m + ", " + D0m + ") = (" + nf(PHI0, 0) + "°, " + nf(DPHI0, 0) + " °/с) " + ED +
          " · สมบัติ 1 ของวิถีเฟส (фазовая траектория) ตามสไลด์ 11: ครึ่งบน (" + mth(dphi + mo(">") + mn(0)) + ") จุดเฟสวิ่งไปทางขวา คือ " + PHm + " เพิ่มขึ้น · ครึ่งล่าง (" + mth(dphi + mo("<") + mn(0)) + ") วิ่งไปทางซ้าย คือ " + PHm + " ลดลง",
        alt: "ระนาบเฟสมีลูกศรจางในครึ่งบนชี้ไปทางขวาและในครึ่งล่างชี้ไปทางซ้าย และมีจุดเริ่มที่ φ เท่ากับลบ 10 องศา φ จุดเท่ากับ 2 องศาต่อวินาที",
        nums: [
          { k: "จุดเริ่ม", v: "(" + nf(PHI0, 0) + "°, " + nf(DPHI0, 0) + " °/с)" },
          { k: "ความเร่งเชิงมุมที่ УРД ให้ได้", v: WNm + " = " + nf(W1, 1) + " °/с²" },
          { k: "สมบัติ 1", v: [mth(dphi + mo(">") + mn(0)) + " → ไปทางขวา", mth(dphi + mo("<") + mn(0)) + " → ไปทางซ้าย"] }
        ] },
      { title: "Φ = 0 · วิ่งด้วยความเฉื่อย",
        text: "เมื่อ Φ = 0 УРД ไม่ทำงาน ไม่มีโมเมนต์ควบคุม " + mth(sq(dphi) + EQ + sq(dphi0)) + " ความเร็วเชิงมุมคงที่ → วิถีเป็นเส้นตรงขนานแกน " + PHm + " (สไลด์ 14) · ที่ " + D0m + " = " + nf(DPHI0, 0) + " °/с ยานถึง " + PHm + " = 0° ในเวลา (0 − (" + nf(PHI0, 0) + ")) / " + nf(DPHI0, 0) + " = " + nf(T0, 0) + " с " + EC,
        alt: "เส้นตรงแนวนอนที่ความเร็วเชิงมุม 2 องศาต่อวินาที ลูกศรชี้ไปทางขวา",
        nums: [
          { k: "วิถีเฟส (Φ = 0)", v: mth(sq(dphi) + EQ + sq(dphi0)), big: true },
          { k: "ผลที่ได้", v: DPm + " = " + nf(DPHI0, 0) + " °/с คงที่" },
          { k: "เวลาถึง φ = 0°", v: "t = " + nf(T0, 0) + " с" }
        ] },
      { title: "Φ = +1 · พาราโบลาเปิดขวา",
        text: "เมื่อ Φ = +1 โมเมนต์เป็นบวก " + DPm + " เพิ่มขึ้นตามเวลา · สมการ (16) กลายเป็นพาราโบลา (парабола) สมมาตรรอบแกน " + PHm + " ปากเปิดทางขวา (เส้นเต็ม) · ครึ่งบนวิ่งไปขวาและขึ้น ครึ่งล่างวิ่งไปซ้ายและขึ้นเข้าหาจุดยอด · จุดยอดอยู่ที่ " +
          PVm + " = " + nf(VP, 0) + "° " + EC,
        alt: "พาราโบลาปากเปิดทางขวาเป็นเส้นเต็มผ่านจุดเริ่ม จุดยอดอยู่บนแกน φ ที่ลบ 14 องศา",
        nums: [
          { k: "วิถีเฟส (Φ = +1)", v: gen(1), big: true },
          { k: "ใส่ตัวเลข", v: num(1, W1) },
          { k: "จุดยอด (φ̇ = 0)", v: vertN(1, W1) },
          { k: "ที่ φ = 0°", v: DPm + " = √" + nf(DPHI0 * DPHI0 + 2 * W1 * (0 - PHI0), 0) + " = " + nf(V0P, 2) + " °/с" }
        ] },
      { title: "Φ = −1 · พาราโบลาเปิดซ้าย",
        text: "เมื่อ Φ = −1 โมเมนต์เป็นลบ " + DPm + " ลดลง · พาราโบลาปากเปิดทางซ้าย (เส้นประ) · จากจุดเริ่มต้องใช้เวลา " + D0m + "/" + WNm + " = " + nf(TV, 0) + " с จึงถึงจุดยอด " + PVm + " = " + nf(VM, 0) + "° " + EC +
          " · สมบัติ 2: วิถีตัดแกน " + PHm + " ตั้งฉากเสมอ เพราะที่จุดตัด " + DPm + " = 0 (สไลด์ 11)",
        alt: "พาราโบลาปากเปิดทางซ้ายเป็นเส้นประผ่านจุดเริ่ม จุดยอดอยู่บนแกน φ ที่ลบ 6 องศา และตัดแกนตั้งฉาก",
        nums: [
          { k: "วิถีเฟส (Φ = −1)", v: gen(-1), big: true },
          { k: "ใส่ตัวเลข", v: num(-1, W1) },
          { k: "จุดยอด (φ̇ = 0)", v: vertN(-1, W1) },
          { k: "เวลาถึงจุดยอด", v: "t = " + nf(DPHI0, 0) + " / " + nf(W1, 1) + " = " + nf(TV, 0) + " с" }
        ] },
      { title: mth(wn) + " มากขึ้น → ปากพาราโบลากว้างขึ้น",
        text: "เพิ่ม " + WNm + " จาก " + nf(W1, 1) + " เป็น " + nf(W2, 1) + " °/с² " + ED + " · พาราโบลา Φ = −1 ผ่านจุดเริ่มเดิม แต่จุดยอดขยับเข้ามาที่ " + PVm + " = " + nf(VM2, 0) + "° " + EC +
          " · เส้นของ " + WNm + " ที่มากกว่าอยู่นอกกว่าทางซ้ายของจุดเริ่ม (ระหว่างจุดเริ่มกับจุดยอด เส้นใหม่อยู่ด้านในเพราะจุดยอดขยับเข้ามา) คือปากกว้างขึ้นในแนว " + DPm + " (ข้อความบรรยาย стр. 11) · ที่ " + PHm + " = " + nf(PCMP, 0) + "° ได้ " + mth(AB(dphi)) + " = " + nf(A1, 2) + " → " + nf(A2, 2) + " °/с",
        alt: "พาราโบลาเส้นประสองเส้นผ่านจุดเริ่มเดียวกัน เส้นของ w เท่ากับ 1,0 มีจุดยอดที่ลบ 8 องศาและอยู่นอกเส้นของ w เท่ากับ 0,5",
        nums: [
          { k: "จุดยอดของ Φ = −1", v: [mth(wn + EQ + mn(nf(W1, 1))) + " → " + PVm + " = " + nf(VM, 0) + "°", mth(wn + EQ + mn(nf(W2, 1))) + " → " + PVm + " = " + nf(VM2, 0) + "°"], big: true },
          { k: "ที่ φ = " + nf(PCMP, 0) + "°", v: mth(AB(dphi)) + " = " + nf(A1, 2) + " → " + nf(A2, 2) + " °/с" },
          { k: "ที่ระยะ " + nf(DD, 0) + "° จากจุดยอด", v: mth(AB(dphi) + EQ + "<msqrt>" + mn(2) + wn + mi("d") + "</msqrt>") + " = " + nf(B1, 2) + " → " + nf(B2, 2) + " °/с" }
        ] }
    ];

    /* ---------- ข้อความหลายส่วน (ตัวห้อย/จุดอนุพันธ์) บน canvas ---------- */
    function rich(ctx, C, parts, x, y, size, color, o) {
      o = o || {};
      const wt = o.weight || 600, halo = o.halo === undefined ? 3.5 : o.halo;
      const toks = parts.map(p => typeof p === "string" ? { t: p } : p);
      const setf = (t, s) => { ctx.font = (t.i ? "italic " : "") + (t.b ? 700 : wt) + " " + s.toFixed(1) + "px " + C.font; };
      function measure(sz) {
        let tot = 0;
        const ms = toks.map(t => {
          const s = sz * (t.s || 1);
          setf(t, s); const mw = t.t ? ctx.measureText(t.t).width : 0;
          let sw = 0;
          if (t.sub) { setf(t, s * 0.72); sw = ctx.measureText(t.sub).width; }
          const wd = mw + sw + (sw ? 1 : 0);
          tot += wd; return { mw, wd, s };
        });
        return { tot, ms };
      }
      let sz = size, m = measure(sz);
      if (o.fit && m.tot > o.fit) { sz = Math.max(size * 0.72, size * o.fit / m.tot); m = measure(sz); }
      let x0 = o.align === "center" ? x - m.tot / 2 : o.align === "right" ? x - m.tot : x;
      if (o.W) x0 = Math.max(3, Math.min(o.W - 3 - m.tot, x0));
      ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
      for (let pass = halo > 0 ? 0 : 1; pass < 2; pass++) {
        let cx = x0;
        toks.forEach((t, i) => {
          const s = m.ms[i].s, bx = cx + m.ms[i].mw + (t.sub ? 1 : 0);
          const piece = (txt, px, py, ps) => {
            setf(t, ps);
            if (pass === 0) { ctx.lineWidth = halo; ctx.strokeStyle = C.bg; ctx.strokeText(txt, px, py); } else { ctx.fillStyle = t.c || color; ctx.fillText(txt, px, py); }
          };
          if (t.t) piece(t.t, cx, y, s);
          if (pass === 1 && t.d && t.t) {            // จุดอนุพันธ์วาดเอง (φ̇) ให้อยู่เหนือตัวอักษรพอดี
            ctx.fillStyle = t.c || color;
            const xm = cx + m.ms[i].mw / 2, yd = y - s * (t.dy || 0.56), rd = Math.max(1.2, s * 0.07);
            ctx.beginPath(); ctx.arc(xm, yd, rd, 0, Math.PI * 2); ctx.fill();
          }
          if (t.sub) piece(t.sub, bx, y + s * 0.30, s * 0.72);
          cx += m.ms[i].wd;
        });
      }
      return { x: x0, w: m.tot };
    }
    const PHd = { t: "φ", d: 1 };                           // φ̇

    /* ---------- เส้นโค้งวิถีเฟส (พิกัดข้อมูล) ---------- */
    function sampleV(s, wv, a, b) {
      const n = Math.max(2, Math.ceil(Math.abs(b - a) / 0.04) + 1), out = [];
      for (let i = 0; i < n; i++) { const v = a + (b - a) * i / (n - 1); out.push([phiOnV(s, wv, v), v]); }
      return out;
    }
    function curve(s, wv) {
      if (s === 0) return { past: [[XMIN, DPHI0], [PHI0, DPHI0]], fut: [[PHI0, DPHI0], [XMAX, DPHI0]] };
      const span = s > 0 ? XMAX - vert(s, wv) : vert(s, wv) - XMIN;
      const vmax = Math.min(YMAX - 0.05, Math.sqrt(2 * wv * span));
      return { past: sampleV(s, wv, -s * vmax, DPHI0), fut: sampleV(s, wv, DPHI0, s * vmax) };
    }
    const CV0 = curve(0, W1), CVP = curve(1, W1), CVM = curve(-1, W1), CVM2 = curve(-1, W2);

    return window.STEPS2(host, {
      label: "แอนิเมชันทีละขั้น",
      title: 'สามกรณีของ Φ บนระนาบเฟส <span style="white-space:nowrap">(сл. 11–15)</span>',
      aria: "แอนิเมชันวิถีเฟสของยานเมื่อฟังก์ชันควบคุม Φ เท่ากับ 0 บวก 1 และลบ 1 เส้นตรงและพาราโบลาสองทิศ",
      legend: [
        { cls: "lg-lin", text: "Φ = 0 เส้นตรง" },
        { cls: "lg-ref", text: "Φ = +1 เส้นเต็ม" },
        { cls: "lg-new dash", text: "Φ = −1 เส้นประ" },
        { cls: "dash", text: "Φ = −1 เมื่อ w ใหญ่ขึ้น", color: "var(--s2-deep)" }
      ],
      steps: STEPS,
      caption: "สมการ (14)–(16) และรูป 7–8 ของบรรยายที่ 6 · ค่าตัวอย่างผู้เรียบเรียงเลือก",
      height: w => w < 520 ? Math.round(Math.max(400, w * 1.1)) : 420,
      draw(ctx, w, h, k, C, anim) {
        const P = window.STEPS2.pen(ctx, w, h, C);
        const narrow = w < 520, ks = w < 480 ? 0.92 : 1;
        const R = (parts, x, y, size, color, o) => rich(ctx, C, parts, x, y, size * ks, color, Object.assign({ W: w }, o || {}));
        const e = anim.e, lerp = (a, b, t) => a + (b - a) * t;
        const L = { x: narrow ? 36 : 48, y: 12, r: w - 12, b: h - (narrow ? 30 : 34) };
        const X = v => L.x + (v - XMIN) / (XMAX - XMIN) * (L.r - L.x);
        const Y = v => L.b - (v + YMAX) / (2 * YMAX) * (L.b - L.y);
        const toPx = p => [X(p[0]), Y(p[1])];

        /* กรอบ เส้นตาราง ป้ายแกน */
        ctx.save();
        ctx.lineWidth = 1; ctx.strokeStyle = C.grid;
        for (let v = -16; v <= 8; v += 4) { ctx.beginPath(); ctx.moveTo(X(v), L.y); ctx.lineTo(X(v), L.b); ctx.stroke(); }
        for (let v = -4; v <= 4; v += 2) { ctx.beginPath(); ctx.moveTo(L.x, Y(v)); ctx.lineTo(L.r, Y(v)); ctx.stroke(); }
        ctx.strokeStyle = C.line2; ctx.strokeRect(L.x, L.y, L.r - L.x, L.b - L.y);
        ctx.restore();
        for (let v = -16; v <= 8; v += 4) R([nf(v, 0)], X(v), L.b + 13, 10.5, C.ink3, { align: "center", halo: 0 });
        for (let v = -4; v <= 4; v += 2) R([nf(v, 0)], L.x - 5, Y(v), 10.5, C.ink3, { align: "right", halo: 0 });

        /* ตัวช่วยเส้น */
        function partial(pts, f) {
          if (f >= 1) return pts;
          let tot = 0; const ls = [];
          for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); ls.push(l); tot += l; }
          let rest = tot * f; const out = [pts[0]];
          for (let i = 0; i < ls.length; i++) {
            if (rest >= ls[i]) { out.push(pts[i + 1]); rest -= ls[i]; }
            else { const t = rest / ls[i]; out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]); break; }
          }
          return out;
        }
        function at(pts, f) {                      // จุดที่สัดส่วนความยาว f พร้อมทิศ
          let tot = 0; const ls = [];
          for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); ls.push(l); tot += l; }
          let rest = tot * f;
          for (let i = 0; i < ls.length; i++) {
            if (rest <= ls[i] || i === ls.length - 1) {
              const t = ls[i] ? Math.min(1, rest / ls[i]) : 0, a = pts[i], b = pts[i + 1];
              return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, dx: (b[0] - a[0]) / (ls[i] || 1), dy: (b[1] - a[1]) / (ls[i] || 1) };
            }
            rest -= ls[i];
          }
          return null;
        }
        function head(pts, f, color, lw) {
          const q = at(pts, f); if (!q) return;
          P.arrow(q.x - q.dx * 7, q.y - q.dy * 7, q.x, q.y, color, lw, 9);
        }

        /* ---------- เนื้อใน กรอบ (ตัดขอบ) ---------- */
        ctx.save();
        ctx.beginPath(); ctx.rect(L.x, L.y, L.r - L.x, L.b - L.y); ctx.clip();

        /* ลูกศรสมบัติ 1 (ครึ่งบนไปขวา ครึ่งล่างไปซ้าย) */
        const at0 = s => (s === 0 ? 1 : 0);
        const A0 = lerp(at0(anim.from), at0(k), e);
        const fieldA = 0.16 + 0.7 * A0;
        [[-12.5, 1], [-3.5, 1], [4.5, 1], [-12.5, 3.7], [-3.5, 3.7], [4.5, 3.7]].forEach(q => {
          [1, -1].forEach(sg => {
            const x = X(q[0]), y = Y(sg * q[1]);
            ctx.save(); ctx.globalAlpha = fieldA; P.arrow(x - sg * 15, y, x + sg * 15, y, C.ink3, 1.6, 8); ctx.restore();
          });
        });

        /* แกน */
        P.arrow(L.x, Y(0), L.r - 1, Y(0), C.ink3, 1.4, 8);
        P.arrow(X(0), L.b, X(0), L.y + 1, C.ink3, 1.4, 8);

        /* เส้นโค้ง */
        const em = (j, kk) => (kk === j ? 1 : kk > j ? (j === 3 && kk === 4 ? 0.8 : 0.4) : 1);
        function paint(cv, j, color, dash, arrowsF, arrowsP) {
          const vis = anim.fade(j);
          if (vis <= 0.01) return;
          const E = lerp(em(j, anim.from), em(j, k), e);
          const prog = k === j && anim.from < j ? e : 1;
          const pa = cv.past.map(toPx), fu = cv.fut.map(toPx);
          ctx.save(); ctx.globalAlpha = vis;
          P.seg(pa, color, 1.6 + 0.8 * E, dash, 0.32 + 0.1 * E);
          P.seg(partial(fu, prog), color, 1.6 + 1.7 * E, dash, 0.42 + 0.58 * E);
          arrowsP.forEach(f => head(pa, f, color, 1.8));
          arrowsF.forEach(f => { if (prog >= f) head(fu, f, color, 2.2); });
          if (prog < 1) { const q = partial(fu, prog), t = q[q.length - 1]; P.dot(t[0], t[1], 4.5, color); }
          ctx.restore();
        }
        paint(CV0, 1, C.lin, [], [0.55], [0.5]);
        paint(CVP, 2, C.ref, [], [0.6], [0.35, 0.75]);
        paint(CVM, 3, C.new, [8, 6], [0.3, 0.8], [0.5]);
        paint(CVM2, 4, C.deep, [8, 6], [0.8], [0.5]);

        /* จุดยอดและมุมฉากตัดแกน φ */
        function vertex(xv, color, vis, perp) {
          if (vis <= 0.01) return;
          ctx.save(); ctx.globalAlpha = vis;
          if (perp) {
            const px = X(xv), py = Y(0), s = 9;
            ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.setLineDash([]);
            ctx.beginPath(); ctx.moveTo(px - s, py); ctx.lineTo(px - s, py - s); ctx.lineTo(px, py - s); ctx.stroke();
          }
          P.ring(X(xv), Y(0), 5, color, 2.2);
          ctx.restore();
        }
        vertex(VP, C.ref, anim.fade(2) * (k === 2 ? 1 : 0.5), false);
        vertex(VM, C.new, anim.fade(3) * (k === 3 ? 1 : 0.55), k <= 3);
        vertex(VM2, C.deep, anim.fade(4), false);

        /* ตัวเทียบ «ปากกว้างขึ้น» ที่ φ = −15° */
        const vb = anim.fade(4);
        if (vb > 0.01) {
          const xb = X(PCMP);
          ctx.save(); ctx.globalAlpha = vb; ctx.strokeStyle = C.ink2; ctx.lineWidth = 1.6; ctx.setLineDash([]);
          ctx.beginPath(); ctx.moveTo(xb, Y(-A1)); ctx.lineTo(xb, Y(-A2)); ctx.stroke();
          [A1, A2].forEach(a => { ctx.beginPath(); ctx.moveTo(xb - 4, Y(-a)); ctx.lineTo(xb + 4, Y(-a)); ctx.stroke(); });
          ctx.restore();
        }

        /* จุดเริ่ม */
        P.dot(X(PHI0), Y(DPHI0), 6, C.meas);
        ctx.restore();   // เลิกตัดขอบ

        /* ---------- ป้ายบนภาพ ---------- */
        const lab = (parts, x, y, color, a, o) => { if (a > 0.02) { ctx.save(); ctx.globalAlpha = a; R(parts, x, y, 11.5, color, Object.assign({ weight: 700 }, o || {})); ctx.restore(); } };
        R(["φ, °"], L.r - 4, Y(0) - 11, 11.5, C.ink2, { align: "right", weight: 700 });
        R([PHd, ", °/с"], X(0) + 7, L.y + 11, 11.5, C.ink2, { weight: 700 });
        lab(["จุดเริ่ม"], X(PHI0), Y(DPHI0) - 41, C.meas, 1, { align: "center", halo: 4 });
        lab(["(", { t: "φ", sub: "0" }, ", ", { t: "φ", d: 1, sub: "0" }, ")"], X(PHI0), Y(DPHI0) - 26, C.meas, 1, { align: "center", halo: 4 });
        if (anim.fade(1) > 0.01) {
          ctx.save(); ctx.globalAlpha = anim.fade(1) * (k === 1 ? 1 : 0.55);
          R(["Φ = 0"], X(XMAX) - 8, Y(DPHI0) - 12, 11.5, C.lin, { align: "right", weight: 700 }); ctx.restore();
        }
        lab(["Φ = +1"], X(XMAX) - 8, Y(3.55), C.ref, anim.fade(2) * (k === 2 ? 1 : 0.55), { align: "right" });
        lab(["Φ = −1"], X(-5.4), Y(1.5), C.new, anim.fade(3) * (k === 3 ? 1 : k === 4 ? 0.6 : 0.55), { align: "left" });
        lab([{ t: "φ", sub: "v" }, " = " + nf(VP, 0) + "°"], X(VP) + 9, Y(0) - 12, C.ref, anim.fade(2) * (k === 2 ? 1 : 0), { align: "left" });
        lab([{ t: "φ", sub: "v" }, " = " + nf(VM, 0) + "°"], X(VM) + 8, Y(0) + 13, C.new, anim.fade(3) * (k === 3 ? 1 : 0.5), { align: "left" });
        lab([{ t: "φ", sub: "v" }, " = " + nf(VM2, 0) + "°"], X(VM2) - 8, Y(0) + 13, C.deep, anim.fade(4), { align: "right" });
        lab(["ตัดแกน φ ตั้งฉาก"], X(VM) + 10, Y(0) - 19, C.new, anim.fade(3) * (k === 3 ? 1 : 0), { align: "left" });
        lab(["w = " + nf(W1, 1)], X(-15.6), Y(2.62), C.new, anim.fade(4), { align: "left" });
        lab(["w = " + nf(W2, 1)], X(-15.6), Y(4.3), C.deep, anim.fade(4), { align: "left" });
        lab(["ปากกว้างขึ้น"], X(PCMP) + 10, Y(-4.55), C.ink2, anim.fade(4), { align: "left" });
        /* ป้ายครึ่งระนาบของสมบัติ 1 */
        lab(["ครึ่งบน " , PHd, " > 0 : ไปทางขวา"], L.x + 6, L.y + 30, C.ink2, A0, { align: "left" });
        lab(["ครึ่งล่าง ", PHd, " < 0 : ไปทางซ้าย"], L.r - 6, L.b - 14, C.ink2, A0, { align: "right" });
      }
    });
  }
});
