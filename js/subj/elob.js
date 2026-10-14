/* js/subj/elob.js — แบบจำลองของวิชา elob (STD2) · สร้างโดย _work/std2/tools/assemble.py จาก _work/elobstd2/demos/ — ห้ามแก้ไฟล์นี้ตรง ๆ แก้ที่ต้นฉบับแล้วประกอบใหม่ · โหลดโดย subjAssets() เมื่อเปิดวิชา · ห้ามแตะ document ที่ระดับบนสุด */
/* --- elob6-algo.js --- */
/* elob6-algo — สวิตช์กลับขั้ว: อัลกอริทึม 11 → 00 → 22 → 00 กับรูปคลื่น u_ВЫХ(t) หนึ่งคาบ และค่าประสิทธิผล (6.2)
   ที่มา: Л6 сл. 11 (วงจรหลักการ: коммутаторы S1, S2 สามตำแหน่ง 1/0/2 เดินสายไขว้ + ตารางรหัส 11/22/00) · сл. 17 (สูตร (6.2)) · ผู้เรียบเรียงทำ
   สูตร: U = √( (2/T)·∫₀^τ u²_ВЫХ dt ) = U_m·√(2τ/T)   (6.2)
   ค่าอ้างอิง (ตรวจด้วย python): τ = T/4 → U = U_m·√0,5 = 0,70711·U_m · τ = T/2 (11 ↔ 22) → U = U_m · τ = T/8 → U = 0,5·U_m
     สัดส่วนเวลา: +U_ВХ 25 % · 0 50 % · −U_ВХ 25 %
   ส่วนของผู้เรียบเรียง (บอกบนจอ): ค่า τ = T/4 · ภาพทั้งหมด · ตัวเลข 0,707 / 0,500 / สัดส่วนเวลา · การตรวจด้วยอินทิเกรตเชิงตัวเลข */
Object.assign(DEMOS, {
  "elob6-algo": function (host) {
    const nf = window.STEPS2.nf;
    const ED = '<span class="ed">ผู้เรียบเรียงคำนวณ</span>', EDC = '<span class="ed">ผู้เรียบเรียงเลือก</span>';

    /* ---------- ข้อมูล (คำนวณสดทั้งหมด) ---------- */
    const TAU = 0.25;                                             // τ/T · ผู้เรียบเรียงเลือก
    const SEG = [
      { code: "11", a: 0, b: TAU, u: 1 },                         // ช่วง 0 … τ
      { code: "00", a: TAU, b: 0.5, u: 0 },                       // ช่วงหยุด τ … T/2
      { code: "22", a: 0.5, b: 0.5 + TAU, u: -1 },                // ช่วง T/2 … T/2+τ
      { code: "00", a: 0.5 + TAU, b: 1, u: 0 }                    // ช่วงหยุด T/2+τ … T
    ];
    const uAt = t => { for (let i = 0; i < SEG.length; i++) if (t >= SEG[i].a && t < SEG[i].b) return SEG[i].u; return 0; };
    let acc = 0; const NS = 4000;
    for (let i = 0; i < NS; i++) { const u = uAt((i + 0.5) / NS); acc += u * u; }
    const UrmsNum = Math.sqrt(acc / NS);                          // อินทิเกรตเชิงตัวเลขของ u² ตลอดคาบ
    const Urms = Math.sqrt(2 * TAU);                              // (6.2)
    const Urms1 = Math.sqrt(2 * 0.5);                             // อัลกอริทึมที่ 1: τ = T/2
    const TAU8 = 0.125, Urms8 = Math.sqrt(2 * TAU8);              // ช่วงหยุดยาวขึ้น: τ = T/8
    const share = k => SEG.reduce((s, g) => s + (g.u === k ? g.b - g.a : 0), 0);
    const pPos = share(1), pZero = share(0), pNeg = share(-1);
    const tauS = "T/" + Math.round(1 / TAU), tau8S = "T/" + Math.round(1 / TAU8);
    const pct = x => nf(x * 100, 0) + " %";

    /* ---------- MathML ---------- */
    const mi = s => "<mi>" + s + "</mi>", mn = s => "<mn>" + s + "</mn>", mo = s => "<mo>" + s + "</mo>";
    const sub = (b, s) => "<msub>" + b + s + "</msub>";
    const row = (...a) => "<mrow>" + a.join("") + "</mrow>";
    const mt = s => "<math>" + s + "</math>";
    const Um = sub(mi("U"), mi("m"));
    const F = {
      U62: mt(mi("U") + mo("=") + Um + mo("·") + "<msqrt>" + "<mfrac>" + row(mn("2"), mi("τ")) + mi("T") + "</mfrac>" + "</msqrt>")
    };

    const STEPS = [
      { title: "ทั้งคู่อยู่ตำแหน่ง 0 — รหัส 00",
        text: "สวิตช์ S1 และ S2 (коммутаторы) มีสามตำแหน่ง: 1 (บน) · 0 (กลาง = ตัดขาด) · 2 (ล่าง) และเดินสายไขว้กัน · รหัสสองหลักบอกตำแหน่งของ S1 และ S2 ตามลำดับ (сл. 11) · เริ่มต้นทั้งคู่อยู่ตำแหน่ง 0 แหล่ง U_ВХ จึงไม่ต่อกับโหลดเลย ทำให้ได้ u_ВЫХ = 0",
        alt: "วงจรหลักการ แหล่ง U_ВХ ด้านซ้าย สวิตช์ S1 และ S2 อยู่ตำแหน่งกลาง ไม่มีเส้นทางไปโหลด Z_Н ด้านขวา รหัส 00 กราฟ u_ВЫХ ยังว่างเปล่า",
        nums: [
          { k: "รหัส S1 / S2", v: "00 (ทั้งคู่ตำแหน่ง 0)" },
          { k: "แรงดันขาออก", v: "u_ВЫХ = 0" }
        ] },
      { title: "รหัส 11 — พัลส์บวก",
        text: "S1 และ S2 ไปตำแหน่ง 1 พร้อมกัน: ขั้ว + ของแหล่งต่อกับขั้วออกด้านบน ขั้ว − ต่อกับขั้วออกด้านล่าง กระแสผ่านโหลดจากบนลงล่าง ได้ u_ВЫХ = +U_ВХ ตลอดช่วง 0 … τ (τ คือความกว้างของพัลส์)",
        alt: "สวิตช์ทั้งสองอยู่ตำแหน่ง 1 เส้นทางสีเขียวอมน้ำเงินจากขั้วบวกผ่านโหลดลงล่างกลับขั้วลบ กราฟมีพัลส์บวกช่วงแรก",
        nums: [
          { k: "รหัส S1 / S2", v: "11" },
          { k: "ช่วงเวลา", v: "0 … τ = 0 … " + tauS },
          { k: "แรงดันขาออก", v: "u_ВЫХ = +U_ВХ", big: true }
        ] },
      { title: "รหัส 00 — ช่วงหยุด (пауза)",
        text: "สวิตช์ทั้งสองกลับตำแหน่ง 0 โหลดถูกตัดขาดจากแหล่ง ทำให้ u_ВЫХ = 0 ตลอดช่วง τ … T/2 (สวิตช์อุดมคติ โหลดตัวต้านทาน — ถ้าโหลดมีความเหนี่ยวนำ กระแสหยุดทันทีไม่ได้ วงจรจริงจึงมีไดโอดย้อนกลับ ดูส่วนที่ 3) · ความยาวของช่วงหยุดคือตัวปรับแรงดันขาออก: ที่คาบ T คงที่ ยิ่งยาว ค่าประสิทธิผลยิ่งต่ำ · ในภาพเลือก τ = " + tauS + " " + EDC,
        alt: "สวิตช์กลับตำแหน่งกลาง เส้นทางไปโหลดหายไป กราฟลากเส้นราบที่ศูนย์ต่อจากพัลส์บวก",
        nums: [
          { k: "รหัส S1 / S2", v: "00" },
          { k: "ช่วงเวลา", v: "τ … T/2 = " + tauS + " … T/2" },
          { k: "ความยาวช่วงหยุด", v: "T/2 − τ = " + tauS, note: "ผู้เรียบเรียงเลือก τ = " + tauS }
        ] },
      { title: "รหัส 22 — พัลส์ลบ",
        text: "S1 และ S2 ไปตำแหน่ง 2 พร้อมกัน: เพราะสายไขว้ ขั้ว + ของแหล่งไปต่อกับขั้วออกด้านล่าง ขั้ว − ไปต่อกับขั้วออกด้านบน กระแสผ่านโหลดทิศกลับ จากล่างขึ้นบน ได้ u_ВЫХ = −U_ВХ ตลอดช่วง T/2 … T/2 + τ",
        alt: "สวิตช์ทั้งสองอยู่ตำแหน่ง 2 เส้นทางสีแดงม่วงไขว้ผ่านโหลดขึ้นบน กราฟมีพัลส์ลบช่วงที่สาม",
        nums: [
          { k: "รหัส S1 / S2", v: "22" },
          { k: "ช่วงเวลา", v: "T/2 … T/2 + τ = T/2 … " + nf(0.5 + TAU, 2) + "·T" },
          { k: "แรงดันขาออก", v: "u_ВЫХ = −U_ВХ", big: true }
        ] },
      { title: "รหัส 00 · ครบคาบ",
        text: "ช่วงหยุดที่สองปิดคาบ ได้รูปคลื่นสามระดับ +U_ВХ / 0 / −U_ВХ ตามลำดับรหัส 11 → 00 → 22 → 00 (อัลกอริทึมที่ 2 ของสไลด์ 11) · เวลาที่อยู่ในแต่ละระดับต่อหนึ่งคาบนับจากรูป " + ED,
        alt: "กราฟครบหนึ่งคาบ พัลส์บวก ศูนย์ พัลส์ลบ ศูนย์ รหัสกำกับด้านบนเป็น 11 00 22 00",
        nums: [
          { k: "ลำดับรหัสในหนึ่งคาบ", v: "11 → 00 → 22 → 00", big: true },
          { k: "สัดส่วนเวลาในแต่ละระดับ", v: "+U_ВХ " + pct(pPos) + " · 0 " + pct(pZero) + " · −U_ВХ " + pct(pNeg) }
        ] },
      { title: "ค่าประสิทธิผล (6.2)",
        text: "ค่าประสิทธิผลของแรงดันสองพัลส์ต่อคาบ (บวกและลบ กว้าง τ เท่ากัน · ในวงจรหลักการนี้แอมพลิจูด U_m = U_ВХ) คือ " + F.U62 + " · ที่ τ = " + tauS + " ได้ " + nf(Urms, 3) + "·U_m ผู้เรียบเรียงคำนวณ · เทียบอัลกอริทึมที่ 1 (11 ↔ 22 ไม่มีช่วงหยุด τ = T/2) ซึ่งได้ U = U_m พอดี เส้นประคือคลื่นสี่เหลี่ยม (меандр) · ค่าประสิทธิผลแปรตามรากที่สองของ 2τ/T ไม่ใช่ตามสัดส่วนตรง " + ED,
        alt: "กราฟสามระดับพร้อมเส้นประของคลื่นสี่เหลี่ยมสองระดับ และเส้นจุดแสดงระดับค่าประสิทธิผล 0,707 เท่าของแอมพลิจูด",
        nums: [
          { k: "สูตร (6.2) · сл. 17", v: F.U62 },
          { k: "อัลกอริทึมที่ 2 · τ = " + tauS, v: "U = U_m·√(2·" + nf(TAU, 2) + ") = " + nf(Urms, 3) + "·U_m", big: true, note: ED + " ตรวจด้วยการหาปริพันธ์ของ u² ตลอดคาบเชิงตัวเลข ได้ " + nf(UrmsNum, 3) + "·U_m" },
          { k: "อัลกอริทึมที่ 1 · τ = T/2 (меандр)", v: "U = U_m·√(2·" + nf(0.5, 2) + ") = " + nf(Urms1, 3) + "·U_m" },
          { k: "ช่วงหยุดยาวขึ้น · τ = " + tau8S, v: "U = U_m·√(2·" + nf(TAU8, 3) + ") = " + nf(Urms8, 3) + "·U_m" }
        ] }
    ];

    /* ตัวห้อยในข้อความ HTML: U_ВХ → U<sub>ВХ</sub> */
    const fx = t => String(t).replace(/([Uu])_(ВХ|ВЫХ|m)/g, "$1<sub>$2</sub>");
    STEPS.forEach(st => {
      st.title = fx(st.title); st.text = fx(st.text);
      (st.nums || []).forEach(n => { n.k = fx(n.k); n.v = Array.isArray(n.v) ? n.v.map(fx) : fx(n.v); if (n.note) n.note = fx(n.note); });
    });

    const STATE = [0, 1, 0, 2, 0, 0];                              // ตำแหน่งสวิตช์ของแต่ละขั้น
    const PROG = [0, TAU, 0.5, 0.5 + TAU, 1, 1];                    // ความคืบหน้าบนแกนเวลา (สัดส่วนของ T)
    const IDX = { 1: 0, 0: 1, 2: 2 };                              // ลำดับขั้วสัมผัสจากบนลงล่าง
    const CODE = ["00", "11", "22"];

    return window.STEPS2(host, {
      label: "แอนิเมชันทีละขั้น",
      title: 'สวิตช์กลับขั้ว: อัลกอริทึม 11 → 00 → 22 → 00 <span style="white-space:nowrap">(сл. 11, 17)</span>',
      aria: "แอนิเมชันทีละขั้น: วงจรหลักการของอินเวอร์เตอร์ สวิตช์ S1 S2 รหัส 11 00 22 00 และรูปคลื่นแรงดันขาออกหนึ่งคาบ",
      legend: [
        { cls: "lg-ref", text: "พัลส์บวก (11)" },
        { cls: "lg-new", text: "พัลส์ลบ (22) · เส้นจุด = ค่าประสิทธิผล U" },
        { cls: "lg-meas dash", text: "อัลกอริทึมที่ 1 (11 ↔ 22)" }
      ],
      steps: STEPS,
      caption: "วงจรหลักการและรหัสสวิตช์ตามสไลด์ 11 · สูตร (6.2) ตามสไลด์ 17 · τ = " + tauS + " ผู้เรียบเรียงเลือก",
      height: w => w < 620 ? 520 : Math.round(Math.max(330, Math.min(400, w * 0.42))),
      draw(ctx, W, H, step, C, anim) {
        const P = window.STEPS2.pen(ctx, W, H, C);
        const stack = W < 620;
        const clamp01 = x => Math.max(0, Math.min(1, x));
        const lerp = (a, b, t) => a + (b - a) * t;
        const e = anim.e, prev = anim.from;
        const sNow = STATE[step], sPrev = STATE[prev];
        const act = s => s === sNow ? (sPrev === sNow ? 1 : e) : (s === sPrev ? 1 - e : 0);
        const stCol = s => s === 1 ? C.ref : s === 2 ? C.new : C.ink3;

        /* ป้ายที่มีตัวห้อย: U_{ВХ} */
        function rich(txt, x, y, color, o) {
          o = o || {};
          const size = o.size || 13, wt = o.weight || 600, halo = o.halo === undefined ? 4 : o.halo;
          const parts = [], re = /([_^])\{([^}]*)\}/g;
          let last = 0, m;
          while ((m = re.exec(txt))) {
            if (m.index > last) parts.push({ t: txt.slice(last, m.index), k: 0 });
            parts.push({ t: m[2], k: m[1] === "_" ? 1 : 2 });
            last = re.lastIndex;
          }
          if (last < txt.length) parts.push({ t: txt.slice(last), k: 0 });
          let tw = 0;
          parts.forEach(p => { P.font(p.k ? size * 0.74 : size, wt, o.mono); p.w = ctx.measureText(p.t).width; tw += p.w; });
          const al = o.align || "left";
          let left = al === "left" ? x : al === "right" ? x - tw : x - tw / 2;
          left = Math.max(4, Math.min(W - 4 - tw, left));
          y = Math.max(10, Math.min(H - 10, y));
          ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
          [halo > 0 ? 0 : 1, 1].forEach(pass => {
            let cx = left;
            parts.forEach(p => {
              P.font(p.k ? size * 0.74 : size, wt, o.mono);
              const dy = p.k === 1 ? size * 0.27 : p.k === 2 ? -size * 0.34 : 0;
              if (pass === 0) { ctx.lineWidth = halo; ctx.strokeStyle = C.bg; ctx.strokeText(p.t, cx, y + dy); }
              else { ctx.fillStyle = color; ctx.fillText(p.t, cx, y + dy); }
              cx += p.w;
            });
          });
          return { x: left, y: y, w: tw };
        }
        function rrect(x, y, w, h, r) {
          ctx.beginPath();
          ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
          ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
          ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
          ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
        }

        /* =================== วงจรหลักการ (сл. 11) =================== */
        const cb = stack ? { x: 8, y: 4, w: W - 16, h: 236 } : { x: 10, y: 8, w: Math.round(W * 0.41), h: H - 16 };
        const X = f => cb.x + f * cb.w, Y = f => cb.y + f * cb.h;
        const xS = X(0.09), xP = X(0.27), xC = X(0.44), xO = X(0.75), xL = X(0.86);
        const bB = X(0.535), bA = X(0.60), bD = X(0.665);
        const yP1 = Y(0.20), yP2 = Y(0.80), dY = 0.115 * cb.h;
        const c1 = [yP1 - dY, yP1, yP1 + dY], c2 = [yP2 - dY, yP2, yP2 + dY];
        const yT = Y(0.41), yB = Y(0.59), yM = Y(0.5), rh = 0.075 * cb.h;

        const hop = 4.5;                                          // สะพานข้ามเส้นที่ไม่ต่อกัน
        const WD = [[xC, c2[2]], [bD, c2[2]], [bD, yB + hop]];
        for (let k = 0; k <= 8; k++) { const ph = Math.PI * k / 8; WD.push([bD + hop * Math.sin(ph), yB + hop * Math.cos(ph)]); }
        WD.push([bD, yT]);
        const FEED1 = [[xS, yP1], [xP, yP1]], FEED2 = [[xS, yP2], [xP, yP2]];
        const WA = [[xC, c1[0]], [bA, c1[0]], [bA, yT]];
        const WB = [[xC, c1[2]], [bB, c1[2]], [bB, yB]];
        const WC = [[xC, c2[0]], [bA, c2[0]], [bA, yB]];
        const yPl1 = Y(0.45), yPl2 = Y(0.52);
        const SRC1 = [[xS, yP1], [xS, yPl1]], SRC2 = [[xS, yPl2], [xS, yP2]];
        const LOADT = [[xL, yT], [xL, yM - rh]], LOADB = [[xL, yM + rh], [xL, yB]];
        const BASE = [FEED1, FEED2, WA, WB, WC, WD, [[bA, yT], [xL, yT]], [[bB, yB], [xL, yB]], LOADT, LOADB, SRC1, SRC2];
        const ACT = {
          1: [SRC1, SRC2, FEED1, WA, [[bA, yT], [xL, yT]], LOADT, LOADB, [[bA, yB], [xL, yB]], WC, FEED2],
          2: [SRC1, SRC2, FEED1, WB, [[bB, yB], [xL, yB]], LOADT, LOADB, [[bD, yT], [xL, yT]], WD, FEED2]
        };
        BASE.forEach(pts => P.seg(pts, C.ink3, 1.7));
        [1, 2].forEach(s => {
          const a = act(s);
          if (a > 0.01) ACT[s].forEach(pts => P.seg(pts, stCol(s), 3.2, [], a));
        });
        [[bA, yB], [bD, yT]].forEach(p => { ctx.beginPath(); ctx.arc(p[0], p[1], 2.7, 0, Math.PI * 2); ctx.fillStyle = C.ink2; ctx.fill(); });

        /* สวิตช์ S1, S2: ก้านสวิตช์เลื่อนตามขั้น */
        const bIdx = lerp(IDX[sPrev], IDX[sNow], e);
        const settled = e > 0.5 ? sNow : sPrev;
        const bladeCol = settled === 0 ? C.ink : stCol(settled);
        [[yP1, c1, "S1", -13], [yP2, c2, "S2", 13]].forEach(sw => {
          const yP = sw[0], cs = sw[1];
          P.seg([[xP, yP], [xC, yP + (bIdx - 1) * dY]], bladeCol, 3.4);
          ["1", "0", "2"].forEach((d, i) => {
            ctx.beginPath(); ctx.arc(xC, cs[i], 3.3, 0, Math.PI * 2);
            ctx.fillStyle = C.bg; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = C.ink2; ctx.stroke();
            P.label(d, xC + 9, cs[i] + (i === 1 ? 0 : (i === 0 ? -9 : 9)), C.ink2, { size: 12, mono: true, halo: 3 });
          });
          ctx.beginPath(); ctx.arc(xP, yP, 3.8, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
          rich(sw[2], xP - 5, yP + sw[3], C.ink, { size: 13, align: "right" });
        });
        /* หมายเหตุ: ตัวเลขตำแหน่ง 1 อยู่เหนือสาย ตำแหน่ง 2 อยู่ใต้สาย ตำแหน่ง 0 ไม่มีสาย */

        /* แหล่งจ่าย */
        P.seg([[xS - 10, yPl1], [xS + 10, yPl1]], C.ink, 2.4);
        P.seg([[xS - 5, yPl2], [xS + 5, yPl2]], C.ink, 4.4);
        rich("+", xS - 16, yPl1 - 6, C.ink2, { size: 14, weight: 700, align: "center", halo: 0 });
        rich("−", xS - 16, yPl2 + 7, C.ink2, { size: 14, weight: 700, align: "center", halo: 0 });
        rich("U_{ВХ}", xS + 13, (yPl1 + yPl2) / 2, C.ink, { size: 13, halo: 3 });

        /* ลูกศรกระแส (เห็นเมื่อสวิตช์ต่อ) */
        [1, 2].forEach(s => {
          const a = act(s);
          if (a < 0.02) return;
          ctx.save(); ctx.globalAlpha = a;
          const xm = (xS + xP) / 2;
          P.arrow(xm - 9, yP1, xm + 9, yP1, stCol(s), 2.2, 8);
          P.arrow(xm + 9, yP2, xm - 9, yP2, stCol(s), 2.2, 8);
          const dir = s === 1 ? 1 : -1;
          P.arrow(xL + 12, yM - dir * (rh - 2), xL + 12, yM + dir * (rh - 2), stCol(s), 2.4, 8);
          ctx.restore();
        });

        /* โหลด Z_Н และขั้วออก */
        rrect(xL - 6, yM - rh, 12, 2 * rh, 2); ctx.fillStyle = C.bg; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C.ink2; ctx.stroke();
        rich("Z_{Н}", xL - 11, yM, C.ink, { size: 13, align: "right", halo: 3 });
        P.ring(xO, yT, 3.8, C.ink2, 1.8); P.ring(xO, yB, 3.8, C.ink2, 1.8);
        [1, 2].forEach(s => {
          const a = act(s);
          if (a < 0.02) return;
          ctx.save(); ctx.globalAlpha = a;
          P.label(s === 1 ? "+" : "−", xO, yT - 13, stCol(s), { size: 16, weight: 700, align: "center", halo: 3 });
          P.label(s === 1 ? "−" : "+", xO, yB + 14, stCol(s), { size: 16, weight: 700, align: "center", halo: 3 });
          ctx.restore();
        });

        /* ป้ายรหัสสวิตช์ */
        {
          const bw = 52, bh = 38, bx = X(0.395) - bw / 2, by = yM - bh / 2;
          rrect(bx, by, bw, bh, 7); ctx.fillStyle = C.sunk; ctx.fill();
          ctx.lineWidth = 1.6; ctx.strokeStyle = settled === 0 ? C.line2 : stCol(settled); ctx.stroke();
          rich("รหัส", bx + bw / 2, by + 9, C.ink3, { size: 10.5, weight: 500, align: "center", halo: 0 });
          rich(CODE[settled], bx + bw / 2, by + bh - 12, settled === 0 ? C.ink2 : stCol(settled), { size: 20, weight: 700, mono: true, align: "center", halo: 0 });
        }

        /* =================== กราฟ u_ВЫХ(t) =================== */
        const gb = stack ? { x: 10, y: cb.y + cb.h + 10, w: W - 20, h: H - (cb.y + cb.h + 10) - 4 }
                         : { x: cb.x + cb.w + 12, y: 8, w: W - (cb.x + cb.w + 12) - 12, h: H - 16 };
        const mL = stack ? 46 : 50, mR = 12;
        const gx0 = gb.x + mL, gw = gb.w - mL - mR;
        const sy = gb.y + 2, sh = 22;
        const py0 = sy + sh + 16, py1 = gb.y + gb.h - 38;
        const yz = (py0 + py1) / 2, half = (py1 - py0) / 2, amp = half * 0.84;
        const tx = t => gx0 + t * gw, uy = u => yz - u * amp;
        const tD = lerp(PROG[prev], PROG[step], e);              // ความคืบหน้าที่วาดแล้ว

        /* ตารางและแกน */
        ctx.lineWidth = 1; ctx.strokeStyle = C.grid; ctx.setLineDash([]);
        ctx.beginPath();
        [-1, 1].forEach(u => { ctx.moveTo(gx0, uy(u)); ctx.lineTo(gx0 + gw, uy(u)); });
        const TICK = [0, TAU, 0.5, 0.5 + TAU, 1];
        TICK.forEach(t => { ctx.moveTo(tx(t), py0 - 4); ctx.lineTo(tx(t), py1 + 3); });
        ctx.stroke();
        P.seg([[gx0, yz], [gx0 + gw + 4, yz]], C.ink3, 1.6);
        P.arrow(gx0 + gw - 2, yz, gx0 + gw + 6, yz, C.ink3, 1.6, 7);
        P.seg([[gx0, py0 - 4], [gx0, py1 + 3]], C.ink3, 1.6);
        rich("+U_{ВХ}", gx0 - 6, uy(1), C.ink2, { size: 11.5, align: "right", halo: 3 });
        rich("0", gx0 - 6, uy(0), C.ink2, { size: 11.5, align: "right", halo: 3 });
        rich("−U_{ВХ}", gx0 - 6, uy(-1), C.ink2, { size: 11.5, align: "right", halo: 3 });
        rich("u_{ВЫХ}", gx0 - 6, (uy(0) + uy(1)) / 2, C.ink, { size: 12.5, align: "right", halo: 3 });
        const TL = ["0", "τ", "T/2", "T/2+τ", "T"];
        TICK.forEach((t, i) => P.label(TL[i], tx(t), py1 + 16, i === 1 ? C.ref : C.ink2, { size: 11.5, align: "center", halo: 3 }));
        P.label("t", gx0 + gw + 1, yz - 11, C.ink3, { size: 12, align: "right", halo: 3, weight: 500 });

        /* แถบรหัสด้านบน */
        rich("รหัส", gb.x + 2, sy + sh / 2, C.ink3, { size: 11, weight: 500, halo: 0 });
        SEG.forEach(sg => {
          const cov = clamp01((tD - sg.a) / (sg.b - sg.a));
          if (cov <= 0.001) return;
          const xa = tx(sg.a), xb = tx(sg.b), col = sg.u > 0 ? C.ref : sg.u < 0 ? C.new : C.ink3;
          const bw = (xb - xa) * cov - 3;
          if (bw > 2) {
            ctx.save(); ctx.globalAlpha = 0.16; rrect(xa + 1.5, sy, bw, sh, 4); ctx.fillStyle = col; ctx.fill(); ctx.restore();
            rrect(xa + 1.5, sy, bw, sh, 4); ctx.lineWidth = 1.5; ctx.strokeStyle = col; ctx.stroke();
          }
          const ta = clamp01((cov - 0.5) / 0.4);
          if (ta > 0.02) { ctx.save(); ctx.globalAlpha = ta; rich(sg.code, (xa + xb) / 2, sy + sh / 2, sg.u === 0 ? C.ink2 : col, { size: 14, weight: 700, mono: true, align: "center", halo: 0 }); ctx.restore(); }
        });

        /* รูปคลื่น (วาดเพิ่มทีละช่วง) */
        const pts = [[tx(0), uy(0)]];
        SEG.forEach(sg => {
          if (tD <= sg.a) return;
          const tb = Math.min(sg.b, tD);
          pts.push([tx(sg.a), uy(sg.u)], [tx(tb), uy(sg.u)]);
          if (sg.u !== 0) {
            ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = sg.u > 0 ? C.ref : C.new;
            ctx.fillRect(tx(sg.a), Math.min(uy(sg.u), yz), tx(tb) - tx(sg.a), Math.abs(uy(sg.u) - yz)); ctx.restore();
          }
        });
        /* เส้นรูปคลื่น: ตัดสีตามระดับ */
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i];
          const far = Math.abs(a[1] - yz) > Math.abs(b[1] - yz) ? a[1] : b[1];
          const lvl = (yz - far) / amp;
          P.seg([a, b], lvl > 0.5 ? C.ref : lvl < -0.5 ? C.new : C.ink2, 2.8);
        }
        if (tD > 0.002 && step <= 4 || (step === 5 && anim.p < 1)) {
          const hx = tx(tD), hu = tD >= 1 ? 0 : uAt(Math.max(0, tD - 1e-4));
          P.dot(hx, uy(hu), 5, hu > 0 ? C.ref : hu < 0 ? C.new : C.ink2);
        } else if (tD <= 0.002) {
          P.dot(tx(0), uy(0), 5, C.ink2);
        }
        /* ป้ายช่วงหยุด */
        {
          const fadeP = step === 2 ? 1 : (anim.from === 2 ? 1 - e : 0);
          if (fadeP > 0.02) { ctx.save(); ctx.globalAlpha = fadeP; P.label(gw * (0.5 - TAU) < 110 ? "หยุด (пауза)" : "ช่วงหยุด (пауза)", (tx(TAU) + tx(0.5)) / 2, uy(0) - 15, C.ink2, { size: 12, align: "center" }); ctx.restore(); }
        }

        /* ขั้น 6: меандр (เส้นประ) และระดับค่าประสิทธิผล */
        const fa = anim.fade(5);
        if (fa > 0.01) {
          ctx.save(); ctx.globalAlpha = fa;
          P.seg([[tx(0), uy(0)], [tx(0), uy(1)], [tx(0.5), uy(1)], [tx(0.5), uy(-1)], [tx(1), uy(-1)], [tx(1), uy(0)]], C.meas, 2.4, [7, 5]);
          P.seg([[gx0, uy(Urms)], [gx0 + gw, uy(Urms)]], C.new, 1.8, [2, 4]);
          P.seg([[gx0, uy(-Urms)], [gx0 + gw, uy(-Urms)]], C.new, 1.8, [2, 4]);
          rich("U = " + nf(Urms, 3) + "·U_{m}", tx(0.52), uy(Urms) + 11, C.new, { size: 12, weight: 700 });
          rich("U = U_{m} (меандр)", tx(0.52), uy(1) + 10, C.meas, { size: 12, weight: 700 });
          ctx.restore();
        }
      }
    });
  }
});
/* --- elob6-phase.js --- */
/* elob6-phase — ปรับแรงดันอินเวอร์เตอร์สะพานด้วยการเลื่อนเฟสของกิ่ง S3, S4: ไม่ปรับ → เลื่อน δ → U₂ มีช่วงศูนย์ → U = U_m√q → ตาราง q → U/U_m
   ที่มา: วัสดุแจก «К теме 3 л.6 Инверторы» หน้า 2 (แผนภาพพัลส์ S1–S4 และ U₂ · q = 2t_и/T (6.7)) · (6.2) U = U_m√(2τ/T) ของ Л6 сл. 17 · ผู้เรียบเรียงทำ
   แบบจำลอง: S1, S2 นำสลับกันครึ่งคาบ · S3, S4 เป็นรูปเดียวกันแต่ถ่วงไป δ · U₂ = U_m·(S1·S4 − S2·S3)
     คู่ทแยง (S1, S4) นำพร้อมกัน → +U_m · (S2, S3) → −U_m · นอกนั้น 0
     ช่วงซ้อนของคู่ทแยงในครึ่งคาบ = T/2 − δ = t_и = qT/2 → δ = (1 − q)·T/2
   ใช้: q = 2t_и/T (6.7) · U = U_m·√q (6.8 = (6.2) เมื่อ τ = t_и)
   ค่าอ้างอิง (ตรวจด้วย node): q = 0,5 → δ = T/4 · t_и = T/4 · U/U_m = 0,70711
     ตาราง q → U/U_m: 1,00 → 1,000 · 0,75 → 0,866 · 0,50 → 0,707 · 0,25 → 0,500 · 0,10 → 0,316 · q ลด 1 → 0,25 (×0,25) แต่ U ลด 1 → 0,500 (×0,50)
   ส่วนของผู้เรียบเรียง (บอกบนจอ): q = 0,5 · δ = (1 − q)T/2 · สูตร (6.8) · ตาราง q → U/U_m · ภาพทั้งหมด */
Object.assign(DEMOS, {
  "elob6-phase": function (host) {
    const nf = window.STEPS2.nf;

    /* ---------- ข้อมูลและตัวเลข (คำนวณสดจากสูตร) ---------- */
    const Q = 0.5;                       // q ที่ผู้เรียบเรียงเลือก
    const DQ = (1 - Q) / 2;              // δ/T = (1 − q)/2
    const TI = Q / 2;                    // t_и/T = q/2  (6.7)
    const UQ = Math.sqrt(Q);             // U/U_m = √q   (6.8)
    const QS = [1, 0.75, 0.5, 0.25, 0.1].map(q => ({ q: q, u: Math.sqrt(q) }));
    const LOW = QS[3], HIGH = QS[0];     // กับดัก: q ลด 1 → 0,25
    const fr = x => Math.abs(x - 0.5) < 1e-9 ? "T/2" : Math.abs(x - 0.25) < 1e-9 ? "T/4" : nf(x, 2) + "·T";
    const ED_C = '<span class="ed">ผู้เรียบเรียงคำนวณ</span>';
    const ED_E = '<span class="ed">ผู้เรียบเรียงเสริม</span>';
    const ED_S = '<span class="ed">ผู้เรียบเรียงเลือก</span>';

    /* MathML ย่อ */
    const mi = s => "<mi>" + s + "</mi>", mn = s => "<mn>" + s + "</mn>", mo = s => "<mo>" + s + "</mo>";
    const sub = (b, s) => "<msub>" + b + s + "</msub>";
    const row = (...a) => "<mrow>" + a.join("") + "</mrow>";
    const mt = s => "<math>" + s + "</math>";
    const frac = (a, b) => "<mfrac>" + a + b + "</mfrac>";
    const sqrt = a => "<msqrt>" + a + "</msqrt>";
    const mTi = sub(mi("t"), mi("и")), mUm = sub(mi("U"), mi("m")), mU2 = sub(mi("U"), mn("2"));
    const F = {
      U2: mt(mU2), Um: mt(mUm), ti: mt(mTi), q: mt(mi("q")), d: mt(mi("δ")),
      pUm: mt(mo("+") + mUm), mUm: mt(mo("−") + mUm),
      q67: mt(mi("q") + mo("=") + frac(row(mn("2"), mo("·"), mTi), mi("T"))),
      ti67: mt(mTi + mo("=") + frac(row(mi("q"), mo("·"), mi("T")), mn("2"))),
      u62: mt(mi("U") + mo("=") + mUm + mo("·") + sqrt(frac(row(mn("2"), mi("τ")), mi("T")))),
      u68: mt(mi("U") + mo("=") + mUm + mo("·") + sqrt(mi("q"))),
      ratio: mt(frac(mi("U"), mUm) + mo("=") + sqrt(mi("q")))
    };

    const STEPS = [
      { title: "ไม่ปรับ (нерегулируемый): พัลส์เต็มครึ่งคาบ",
        text: "สะพานมีสี่สวิตช์ S1–S4 (VT1–VT4) · ตามวัสดุแจก สวิตช์แต่ละตัวนำกระแสกว้าง 0,5·T พอดี คู่ทแยง S1 กับ S4 นำพร้อมกัน แล้วสลับเป็น S2 กับ S3 โดยไม่มีช่องว่าง · " +
          F.U2 + " จึงเป็นสี่เหลี่ยมเต็ม (меандр) คือ " + F.pUm + " ครึ่งคาบแรก และ " + F.mUm + " ครึ่งคาบหลัง · ช่วงที่คู่ทแยงนำพร้อมกันยาวเท่าครึ่งคาบ จึงได้ q = 1",
        alt: "แผนภาพพัลส์ห้าแถว S1 ถึง S4 กว้างครึ่งคาบ S1 กับ S4 ตรงกัน S2 กับ S3 ตรงกัน แถว U2 เป็นสี่เหลี่ยมเต็มบวกลบ แถบ q และ U ต่อ Um เต็มหลอด",
        nums: [
          { k: "ความกว้างพัลส์ของแต่ละสวิตช์", v: nf(0.5, 1) + "·T" },
          { k: "คู่ทแยงที่นำพร้อมกัน", v: "S1 + S4 → " + F.pUm + " · S2 + S3 → " + F.mUm },
          { k: "สัมประสิทธิ์การเติมเต็มพัลส์ q (коэффициент заполнения)", v: F.q67 + " = 2 · " + nf(0.5, 1) + " = " + nf(1, 2), big: true },
          { k: "ค่าประสิทธิผล", v: F.ratio + " = " + nf(1, 3) }
        ] },
      { title: "เลื่อนเฟสกิ่งขวา (S3, S4)",
        text: "เลื่อนพัลส์ของ S3 และ S4 ไปทางขวาอีกเป็นเวลา δ ส่วน S1 กับ S2 อยู่ที่เดิม (เส้นประคือตำแหน่งเดิม) · คู่ทแยงจึงซ้อนกันได้เฉพาะช่วงท้ายของครึ่งคาบ: S1 กับ S4 ซ้อนกันแคบลง S2 กับ S3 ก็เช่นกัน · " +
          "ที่ q = " + nf(Q, 2) + " " + ED_S + " ต้องเลื่อน δ = (1 − q)·T/2 = " + fr(DQ) + " " + ED_C + " · แถบ q ด้านล่างลดลงตามการเลื่อน",
        alt: "พัลส์ของ S3 และ S4 เลื่อนไปทางขวา มีลูกศรและเส้นประแสดงตำแหน่งเดิม ช่วงที่คู่ทแยงซ้อนกันแคบลง แถว U2 มีช่องว่างศูนย์ แถบ q ลดเหลือครึ่งหนึ่ง",
        nums: [
          { k: "ระยะเลื่อนเฟส δ", v: F.d + " = (1 − " + nf(Q, 2) + ")·T/2 = " + fr(DQ), big: true, note: "ผู้เรียบเรียงคำนวณจาก δ = (1 − q)·T/2" },
          { k: "ช่วงที่ S1 กับ S4 ซ้อนกันในครึ่งคาบแรก", v: "T/2 − δ = " + fr(TI) }
        ] },
      { title: "U<sub>2</sub> มีช่วงศูนย์: q = 2t<sub>и</sub>/T (6.7)",
        text: "ช่วงที่ไม่มีคู่ทแยงนำครบทั้งคู่ ปลายทั้งสองของหม้อแปลงอยู่ที่ศักย์เดียวกัน " + F.U2 + " จึงเป็นศูนย์ (แถบสีเหลือง) " + ED_E +
          " · เหลือพัลส์บวกและลบอย่างละหนึ่งพัลส์ต่อคาบ กว้าง " + F.ti + " = qT/2 = " + fr(TI) +
          " · สัมประสิทธิ์การเติมเต็มพัลส์ (6.7) คือ " + F.q67 + " และเมื่อ " + F.ti + " = T/2 จะได้ q = 1 ซึ่งคือกรณีไม่ปรับ",
        alt: "แถว U2 มีแถบสีเหลืองสี่ช่วงที่เป็นศูนย์ และมีวงเล็บบอกความกว้างพัลส์ t เหนือพัลส์บวกและพัลส์ลบแรก",
        nums: [
          { k: "ความกว้างพัลส์ต่อครึ่งคาบ", v: F.ti67 + " = " + fr(TI) },
          { k: "ช่วงศูนย์ต่อครึ่งคาบ", v: "δ = " + fr(DQ) },
          { k: "สัมประสิทธิ์การเติมเต็มพัลส์ (6.7)", v: F.q67 + " = 2 · " + nf(TI, 2) + " = " + nf(Q, 2), big: true }
        ] },
      { title: "ค่าประสิทธิผล: U = U<sub>m</sub>√q (6.8)",
        text: "ค่าประสิทธิผล (действующее значение) ของพัลส์สี่เหลี่ยมกว้าง τ ต่อครึ่งคาบ คือ " + F.u62 + " (6.2 · สไลด์ 17) · ที่นี่ τ = " + F.ti + " จึงได้ " + F.u68 +
          " (6.8 · " + ED_E + ") · ที่ q = " + nf(Q, 2) + " ได้ " + nf(UQ, 3) + "·" + F.Um + " " + ED_C +
          " · เส้นประบน " + F.U2 + " คือระดับ ±U ของสี่เหลี่ยมเต็มที่มีค่าประสิทธิผลเท่ากัน",
        alt: "เส้นประสองเส้นที่ระดับบวกและลบ 0,707 เท่าของ Um ตัดผ่านพัลส์ของ U2 แถบ U ต่อ Um ยาว 0,707",
        nums: [
          { k: "สูตร (6.2) ของสไลด์ 17", v: F.u62 },
          { k: "ที่ τ = " + F.ti + " (6.8)", v: F.u68, note: "ผู้เรียบเรียงเสริม" },
          { k: "แทน q = " + nf(Q, 2), v: "U = " + F.Um + " · √" + nf(Q, 2) + " = " + nf(UQ, 3) + " · " + F.Um, big: true, note: "ผู้เรียบเรียงคำนวณ" },
          { k: "เทียบกับแบบไม่ควบคุม (q = " + nf(1, 2) + ")", v: "U = " + F.Um }
        ] },
      { title: "ตาราง q → U/U<sub>m</sub> และกับดัก",
        text: "คำนวณ " + F.ratio + " ของทุก q ในตาราง (ค่าตรงกับตารางใต้สูตร 6.8 ในการ์ด 3.1 " + ED_C + ") · " +
          "<b>กับดัก:</b> แรงดันลดตามรากที่สอง ไม่ใช่เชิงเส้น — q ลดเหลือ " + nf(LOW.q / HIGH.q, 2) + " เท่า (จาก " + nf(HIGH.q, 2) + " เป็น " + nf(LOW.q, 2) +
          ") แต่ U ลดเหลือเพียง " + nf(LOW.u / HIGH.u, 2) + " เท่า (จาก " + nf(HIGH.u, 3) + " เป็น " + nf(LOW.u, 3) + ")",
        alt: "กราฟ U ต่อ Um เทียบกับ q เส้นโค้งรากที่สองอยู่เหนือเส้นตรง มีห้าจุดตามตาราง ลูกศรสีแดงที่ q เท่ากับ 0,25 แสดงช่องว่างระหว่างเส้นโค้งกับเส้นตรง",
        nums: QS.map(r => ({
          k: "q = " + nf(r.q, 2) + (r.q === 1 ? " (ไม่ปรับ)" : r.q === Q ? " (ที่ใช้ในขั้น 2–4)" : ""),
          v: "U/" + F.Um + " = √" + nf(r.q, 2) + " = " + nf(r.u, 3), big: r.q === Q
        })) }
    ];

    return window.STEPS2(host, {
      label: "แอนิเมชันทีละขั้น",
      title: 'ปรับแรงดันอินเวอร์เตอร์สะพานด้วยการเลื่อนเฟส <span style="white-space:nowrap">(6.7)–(6.8)</span>',
      aria: "แอนิเมชันทีละขั้น: ปรับแรงดันอินเวอร์เตอร์สะพานด้วยการเลื่อนเฟสของสวิตช์ S3 และ S4",
      legend: [
        { cls: "lg-ref", text: "<span>คู่ทแยง S1·S4 → +U<sub>m</sub></span>" },
        { cls: "lg-new", text: "<span>คู่ทแยง S2·S3 → −U<sub>m</sub></span>" },
        { cls: "lg-meas", text: "<span>ช่วงศูนย์ของ U<sub>2</sub></span>" },
        { cls: "lg-meas dash", text: "ค่าประสิทธิผล U", color: "var(--s2-deep)" }
      ],
      steps: STEPS,
      caption: "แผนภาพพัลส์ตามวัสดุแจก «К теме 3 л.6 Инверторы» หน้า 2 · (6.8) ผู้เรียบเรียงเสริม · q = 0,5 ผู้เรียบเรียงเลือก",
      height: w => w < 520 ? 410 : 430,
      draw(ctx, W, H, step, C, anim) {
        const P = window.STEPS2.pen(ctx, W, H, C);
        const narrow = W < 520;
        const clamp01 = x => Math.max(0, Math.min(1, x));
        const inR = (s, a, b) => s >= a && s <= b;
        /* ความทึบของฉากที่ใช้ในขั้น a…b (ขึ้นตอนเข้า หายตอนออก ทั้งเดินหน้าและถอยหลัง) */
        const scene = (a, b) => {
          const now = inR(step, a, b), was = inR(anim.from, a, b);
          if (now && was) return 1;
          if (now) return clamp01(anim.p * 1.6);
          if (was) return clamp01(1 - anim.p * 2.2);
          return 0;
        };
        const withA = (a, fn) => { if (a <= 0.01) return; ctx.save(); ctx.globalAlpha *= a; fn(); ctx.restore(); };

        /* ป้ายที่มีตัวห้อย: U_{m} · t_{и} */
        function rich(txt, x, y, color, o) {
          o = o || {};
          const size = o.size || 13, wt = o.weight || 600;
          const parts = [], re = /([_^])\{([^}]*)\}/g;
          let last = 0, m;
          while ((m = re.exec(txt))) {
            if (m.index > last) parts.push({ t: txt.slice(last, m.index), k: 0 });
            parts.push({ t: m[2], k: m[1] === "_" ? 1 : 2 });
            last = re.lastIndex;
          }
          if (last < txt.length) parts.push({ t: txt.slice(last), k: 0 });
          let tw = 0;
          parts.forEach(p => { P.font(p.k ? size * 0.72 : size, wt, o.mono); p.w = ctx.measureText(p.t).width; tw += p.w; });
          const al = o.align || "left";
          let left = al === "left" ? x : al === "right" ? x - tw : x - tw / 2;
          left = Math.max(4, Math.min(W - 4 - tw, left));
          y = Math.max(10, Math.min(H - 10, y));
          ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
          const halo = o.halo === undefined ? 4 : o.halo;
          [halo > 0 ? 0 : 1, 1].forEach(pass => {
            let cx = left;
            parts.forEach(p => {
              P.font(p.k ? size * 0.72 : size, wt, o.mono);
              const dy = p.k === 1 ? size * 0.26 : p.k === 2 ? -size * 0.34 : 0;
              if (pass === 0) { ctx.lineWidth = halo; ctx.strokeStyle = C.bg; ctx.strokeText(p.t, cx, y + dy); }
              else { ctx.fillStyle = color; ctx.fillText(p.t, cx, y + dy); }
              cx += p.w;
            });
          });
          return { x: left, y: y, w: tw };
        }

        /* ================= ภาพที่ 1–4: แผนภาพพัลส์ + แถบ q, U/U_m ================= */
        const gD = scene(0, 3);
        withA(gD, () => {
          /* ระยะเลื่อน δ (หน่วย T) ที่กำลังแสดง: เลื่อนระหว่างขั้น 1 → 2 */
          const dOf = s => s >= 1 ? DQ : 0;
          const d = dOf(anim.from) + (dOf(step) - dOf(anim.from)) * anim.e;
          const qN = 1 - 2 * d, uN = Math.sqrt(qN);

          const lm = narrow ? 50 : 70, rm = narrow ? 10 : 18, pw = W - lm - rm;     // กว้างของ 2 คาบ
          const X = f => lm + f / 2 * pw;
          const rowH = narrow ? 28 : 32, rgap = 5, y0 = narrow ? 26 : 28;
          const rowY = i => y0 + i * (rowH + rgap);
          const Ut = y0 + 4 * (rowH + rgap) + (narrow ? 28 : 30), Uh = narrow ? 96 : 104;
          const half = (Uh - 12) / 2, Uc = Ut + Uh / 2;
          const by = Ut + Uh + 18;

          /* ช่วงเวลา: จุดเปลี่ยนที่ k/2 และ k/2 + d */
          const raw = [0, 2];
          for (let k = -1; k <= 4; k++) [k / 2, k / 2 + d].forEach(b => { if (b > 1e-9 && b < 2 - 1e-9) raw.push(b); });
          raw.sort((a, b) => a - b);
          const bps = raw.filter((b, i) => i === 0 || b - raw[i - 1] > 1e-9);
          const md = v => ((v % 1) + 1) % 1;
          const segs = [];
          for (let i = 0; i + 1 < bps.length; i++) {
            const a = bps[i], b = bps[i + 1], m = (a + b) / 2;
            const on = [md(m) < 0.5, md(m) >= 0.5, md(m - d) >= 0.5, md(m - d) < 0.5];     // S1, S2, S3, S4
            segs.push({ a: a, b: b, on: on, u: (on[0] && on[3] ? 1 : 0) - (on[1] && on[2] ? 1 : 0) });
          }
          const rowCol = [C.ref, C.new, C.new, C.ref];

          /* แถบพื้นหลังช่วงที่คู่ทแยงซ้อนกัน */
          segs.forEach(s => {
            if (!s.u) return;
            ctx.fillStyle = s.u > 0 ? C.ref : C.new; ctx.globalAlpha *= 0.08;
            ctx.fillRect(X(s.a), y0 - 2, X(s.b) - X(s.a), Ut + Uh - y0 + 2);
            ctx.globalAlpha /= 0.08;
          });

          /* กริดเวลา */
          ctx.lineWidth = 1;
          [0, 0.5, 1, 1.5, 2].forEach((f, i) => {
            const x = Math.round(X(f)) + 0.5;
            ctx.strokeStyle = i % 2 ? C.grid : C.line2; ctx.setLineDash(i % 2 ? [3, 4] : []);
            ctx.beginPath(); ctx.moveTo(x, y0 - 4); ctx.lineTo(x, Ut + Uh); ctx.stroke(); ctx.setLineDash([]);
            P.label(["0", "T/2", "T", "3T/2", "2T"][i], X(f), 12, C.ink3, { size: 11, weight: 500, align: "center", mono: true, halo: 3 });
          });

          /* แถบช่วงศูนย์ (ขั้น 3–4) */
          withA(scene(2, 3), () => {
            let first = true;
            segs.forEach(s => {
              if (s.u) return;
              const x1 = X(s.a), x2 = X(s.b);
              ctx.fillStyle = C.meas; ctx.globalAlpha *= 0.2; ctx.fillRect(x1, Ut, x2 - x1, Uh); ctx.globalAlpha /= 0.2;
              if (x2 - x1 > 22) withA(scene(2, 2), () => P.label(first ? "ศูนย์" : "0", (x1 + x2) / 2, Ut + 13, C.meas, { size: 12, align: "center", halo: 3 }));
              if (x2 - x1 > 22) first = false;
            });
          });

          /* แถว S1–S4 */
          for (let i = 0; i < 4; i++) {
            const yt = rowY(i), yHi = yt + 4, yLo = yt + rowH - 4;
            segs.forEach(s => {
              if (!s.on[i]) return;
              ctx.fillStyle = rowCol[i]; ctx.globalAlpha *= 0.22;
              ctx.fillRect(X(s.a), yHi, X(s.b) - X(s.a), yLo - yHi); ctx.globalAlpha /= 0.22;
            });
            const pts = [];
            segs.forEach(s => { const y = s.on[i] ? yHi : yLo; pts.push([X(s.a), y], [X(s.b), y]); });
            P.seg(pts, rowCol[i], 2.2);
            P.label("S" + (i + 1), lm - 8, yt + rowH / 2 - 5.5, C.ink, { size: 13, weight: 700, align: "right", halo: 0 });
            P.label("VT" + (i + 1), lm - 8, yt + rowH / 2 + 7, C.ink3, { size: 10.5, weight: 500, align: "right", halo: 0, mono: true });
          }

          /* แถว U₂ */
          segs.forEach(s => {
            if (!s.u) return;
            ctx.fillStyle = s.u > 0 ? C.ref : C.new; ctx.globalAlpha *= 0.3;
            const yy = Uc - s.u * half;
            ctx.fillRect(X(s.a), Math.min(yy, Uc), X(s.b) - X(s.a), Math.abs(yy - Uc)); ctx.globalAlpha /= 0.3;
          });
          P.seg([[lm, Uc], [lm + pw, Uc]], C.line2, 1);
          const up = [];
          segs.forEach(s => { const y = Uc - s.u * half; up.push([X(s.a), y], [X(s.b), y]); });
          P.seg(up, C.ink, 2.6);
          rich("+U_{m}", lm - 6, Uc - half, C.ink3, { size: 10.5, align: "right", halo: 0 });
          rich("−U_{m}", lm - 6, Uc + half, C.ink3, { size: 10.5, align: "right", halo: 0 });
          rich("U_{2}", lm - 6, Uc, C.ink, { size: 13, weight: 700, align: "right", halo: 0 });

          /* ขั้น 2: เส้นประตำแหน่งเดิม + ลูกศรเลื่อน */
          withA(scene(1, 1), () => {
            for (let i = 2; i < 4; i++) {
              const yt = rowY(i), yHi = yt + 4, yLo = yt + rowH - 4;
              const hiAt = i === 3 ? [[0, 0.5], [1, 1.5]] : [[0.5, 1], [1.5, 2]];
              const pts = [];
              let cur = null;
              [0, 0.5, 1, 1.5].forEach(a => {
                const hi = hiAt.some(h => Math.abs(h[0] - a) < 1e-9);
                const y = hi ? yHi : yLo;
                if (cur !== null) pts.push([X(a), cur]);
                pts.push([X(a), y], [X(a + 0.5), y]); cur = y;
              });
              P.seg(pts, C.ink3, 1.5, [4, 3]);
              const f0 = i === 3 ? 0 : 0.5;
              if (d * pw / 2 > 9) {
                const ym = yt + rowH / 2;
                P.arrow(X(f0) + 1, ym, X(f0 + d) - 1, ym, C.ink, 1.8, 7);
                P.label("δ", X(f0 + d) + 5, ym, C.ink, { size: 13, weight: 700, halo: 3 });
              }
            }
          });

          /* ขั้น 3: วงเล็บความกว้างพัลส์ t_и */
          withA(scene(2, 2), () => {
            let np = 0, nn = 0;
            segs.forEach(s => {
              const kind = s.u > 0 ? "p" : s.u < 0 ? "n" : "";
              if (!kind || (kind === "p" && np++) || (kind === "n" && nn++)) return;
              const x1 = X(s.a), x2 = X(s.b), yb = Ut - 8;
              P.seg([[x1, yb + 4], [x1, yb], [x2, yb], [x2, yb + 4]], C.ink2, 1.6);
              rich("t_{и} = " + fr(s.b - s.a), (x1 + x2) / 2, yb - 11, C.ink, { size: 12, weight: 700, align: "center", halo: 3 });
            });
          });

          /* ขั้น 4: ระดับค่าประสิทธิผล ±U */
          withA(scene(3, 3), () => {
            const yp = Uc - uN * half, yn = Uc + uN * half;
            P.seg([[lm, yp], [lm + pw, yp]], C.deep, 1.9, [6, 4]);
            P.seg([[lm, yn], [lm + pw, yn]], C.deep, 1.9, [6, 4]);
            rich("+U", lm - 6, yp, C.deep, { size: 11.5, weight: 700, align: "right", halo: 3 });
            rich("−U", lm - 6, yn, C.deep, { size: 11.5, weight: 700, align: "right", halo: 3 });
          });

          /* แถบ q และ U/U_m */
          const bar = (y, name, valTxt, frac, col) => {
            rich(name, lm, y + 6, C.ink2, { size: 12.5, weight: 600, halo: 0 });
            rich(valTxt, lm + pw, y + 6, col, { size: 14, weight: 700, align: "right", halo: 0 });
            const by2 = y + 17, bh = 14;
            ctx.fillStyle = C.sunk; ctx.fillRect(lm, by2, pw, bh);
            ctx.fillStyle = col; ctx.fillRect(lm, by2, pw * frac, bh);
            ctx.lineWidth = 1; ctx.strokeStyle = C.line2; ctx.strokeRect(lm + 0.5, by2 + 0.5, pw - 1, bh - 1);
            P.label("0", lm, by2 + bh + 9, C.ink3, { size: 10.5, weight: 500, mono: true, align: "center", halo: 0 });
            P.label("1", lm + pw, by2 + bh + 9, C.ink3, { size: 10.5, weight: 500, mono: true, align: "center", halo: 0 });
          };
          bar(by, "q = 2t_{и}/T", nf(qN, 2), qN, C.lin);
          bar(by + 48, step >= 3 ? "U/U_{m} = √q" : "U/U_{m}", nf(uN, 3), uN, C.deep);
        });

        /* ================= ภาพที่ 5: กราฟ U/U_m = √q ================= */
        const gP = scene(4, 4);
        withA(gP, () => {
          const pl = narrow ? 48 : 72, pr = narrow ? 20 : 34, pt = 52, pb = H - (narrow ? 54 : 58);
          const X = q => pl + q * (W - pl - pr), Y = u => pb - u * (pb - pt);
          ctx.lineWidth = 1; ctx.strokeStyle = C.grid; ctx.beginPath();
          [0.25, 0.5, 0.75, 1].forEach(v => { const y = Math.round(Y(v)) + 0.5; ctx.moveTo(pl, y); ctx.lineTo(W - pr, y); });
          QS.forEach(r => { const x = Math.round(X(r.q)) + 0.5; ctx.moveTo(x, pt); ctx.lineTo(x, pb); });
          ctx.stroke();
          P.seg([[pl, pt - 8], [pl, pb], [W - pr + 4, pb]], C.ink3, 1.5);
          [[0, "0"], [0.25, "0,25"], [0.5, "0,50"], [0.75, "0,75"], [1, "1"]].forEach(a =>
            P.label(a[1], pl - 7, Y(a[0]), C.ink3, { size: 11, weight: 500, align: "right", mono: true, halo: 0 }));
          P.label("0", pl, pb + 13, C.ink3, { size: 11, weight: 500, align: "center", mono: true, halo: 0 });
          QS.forEach(r => P.label(nf(r.q, 2), X(r.q), pb + 13, C.ink2, { size: 11, weight: 600, align: "center", mono: true, halo: 0 }));
          rich("q = 2t_{и}/T", W - pr, pb + 33, C.ink3, { size: 12, weight: 500, align: "right", halo: 0 });
          rich("U/U_{m}", pl + 8, pt - 22, C.ink2, { size: 13, weight: 700, halo: 0 });

          const ext = (step === 4 && anim.from !== 4 && anim.p < 1) ? anim.e : 1;
          /* เส้นตรง U/U_m = q ที่เปรียบเทียบ */
          P.seg([[X(0), Y(0)], [X(1), Y(1)]], C.ink3, 1.6, [6, 5]);
          rich("เส้นตรง U/U_{m} = q", W - pr - 8, Y(0.44), C.ink3, { size: 12, weight: 500, align: "right" });
          /* เส้นโค้ง √q */
          const pts = [];
          for (let i = 0; i <= 120; i++) { const t = i / 120, q = ext * t * t; pts.push([X(q), Y(Math.sqrt(q))]); }   // q ∝ t² ให้จุดถี่ใกล้ 0
          P.seg(pts, C.new, 3);
          if (ext > 0.45) rich("U/U_{m} = √q", X(0.4) - 12, Y(Math.sqrt(0.4)) - 15, C.new, { size: 13, weight: 700, align: "right" });

          /* ห้าจุดของตาราง */
          const lab = [[0, -15, "center"], [6, -15, "right"], [6, -15, "right"], [6, -15, "right"], [10, 9, "left"]];
          QS.forEach((r, i) => {
            if (r.q > ext + 1e-9) return;
            const x = X(r.q), y = Y(r.u), chosen = r.q === Q;
            P.seg([[x, pb], [x, y]], C.deep, 1.3, [3, 4], 0.9);
            P.dot(x, y, chosen ? 7 : 5.5, chosen ? C.deep : C.new);
            P.label(nf(r.u, 3), x + lab[i][0], y + lab[i][1], chosen ? C.deep : C.new, { size: 12.5, weight: 700, align: lab[i][2] });
            if (chosen) rich("q = " + nf(Q, 2) + " (ที่เลือก)", x + 11, y + 18, C.deep, { size: 12, weight: 600 });
          });

          /* กับดัก: q 1 → 0,25 แต่ U 1 → 0,500 */
          const tA = clamp01((step === 4 && anim.from !== 4 ? anim.p - 0.6 : 1) / 0.4);
          withA(tA, () => {
            const xq = X(LOW.q) + 12;
            P.arrow(xq, Y(LOW.q) - 3, xq, Y(LOW.u) + 4, C.trap, 2, 8);
            P.arrow(xq, Y(LOW.u) + 4, xq, Y(LOW.q) - 3, C.trap, 2, 8);
            rich("q: " + nf(HIGH.q, 2) + " → " + nf(LOW.q, 2) + " (× " + nf(LOW.q / HIGH.q, 2) + ")", W - pr, Y(0.16), C.trap, { size: 12.5, weight: 700, align: "right" });
            rich("U/U_{m}: " + nf(HIGH.u, 3) + " → " + nf(LOW.u, 3) + " (× " + nf(LOW.u / HIGH.u, 2) + ")", W - pr, Y(0.08), C.trap, { size: 12.5, weight: 700, align: "right" });
          });
        });
      }
    });
  }
});
/* --- elob6-pp.js --- */
/* elob6-pp — อินเวอร์เตอร์แบบพุช-พูลจุดศูนย์ (нулевая схема, push-pull): ทรานซิสเตอร์ผลัดกันนำครึ่งคาบ ฟลักซ์ในแกนกลับทิศ และสวิตช์ที่ปิดต้องทน 2·U_ВХ
   ที่มา: Л6 сл. 17 (วงจรและรูปคลื่น i_К1 i_К2 I_ВХ u_вых) · сл. 19 б (วงจรเดียวกันพร้อมช่องควบคุม u_у1 u_у2; สะพาน (а): ปิดทน ≈ U_ВХ) · сл. 20 (ฟลักซ์กลับทิศ) · ผู้เรียบเรียงทำ
   ฟิสิกส์: ขณะ VT1 นำ แรงดันตกคร่อมครึ่งบน w1.1 ≈ U_ВХ (ละแรงดันตกบนสวิตช์) · ขดสองครึ่งพันบนแกนเดียวกันด้วยจำนวนรอบเท่ากัน จึงเหนี่ยวนำ U_ВХ เท่ากันในครึ่งล่าง w1.2
     ปลายล่างของ w1.2 (ต่อ VT2 ที่ปิด) = U_ВХ (จุดกลาง) + U_ВХ (เหนี่ยวนำ) = 2·U_ВХ
   ค่าอ้างอิง: U_ВХ = 27 В · 2·U_ВХ = 54 В · วงจรสะพาน ≈ U_ВХ = 27 В
   ส่วนของผู้เรียบเรียง (บอกบนจอ): U_ВХ = 27 В · 54 В · ทิศฟลักซ์ที่วาด (ทิศอ้างอิงตามการพันที่สมมติ) · ยอดพัลส์ที่ไต่เล็กน้อยในรูป (รูปร่างตามสไลด์ 17 ไม่ใช่ค่าวัด) */
Object.assign(DEMOS, {
  "elob6-pp": function (host) {
    const nf = window.STEPS2.nf;
    const ED = '<span class="ed">ผู้เรียบเรียงคำนวณ</span>', EDC = '<span class="ed">ผู้เรียบเรียงเลือก</span>';

    /* ---------- ข้อมูล ---------- */
    const UIN = 27;                                  // U_ВХ [В] · ผู้เรียบเรียงเลือก
    const UOFF = 2 * UIN;                            // แรงดันที่สวิตช์ปิดต้องทนในวงจรจุดศูนย์
    const UBR = UIN;                                 // วงจรสะพาน (сл. 19 а)
    const KAP = 0.18;                                // ยอดพัลส์กระแสไต่ขึ้นเล็กน้อยตามกระแสแม่เหล็ก (รูปร่างตามสไลด์ 17 · ใช้วาดเท่านั้น)
    const PHASE = 0.5 * 360;                         // i_К2 เลื่อนจาก i_К1 ครึ่งคาบ → องศา
    const UIN_S = nf(UIN, 0) + " В", UOFF_S = nf(UOFF, 0) + " В", UBR_S = nf(UBR, 0) + " В";

    const STEPS = [
      { title: "วงจรและส่วนประกอบ",
        text: "หม้อแปลง T มีขดปฐมภูมิสองครึ่ง: w1.1 (บน) และ w1.2 (ล่าง) · แหล่ง U_ВХ ต่อเข้าที่จุดกลาง (нулевая точка) ของขดนี้ · ปลายนอกของแต่ละครึ่งต่อกับทรานซิสเตอร์ VT1 และ VT2 ซึ่งอีกขาลงกราวด์ · สัญญาณ u_у1 และ u_у2 สั่งให้ผลัดกันนำ (двухтактный) · ขดทุติยภูมิ w2 จ่ายโหลด Z_Н · ตอนนี้ VT1 กับ VT2 ปิดทั้งคู่ ไม่มีกระแส · U_ВХ = " + UIN_S + " " + EDC + " เป็นค่าตัวอย่างให้ตัวเลขชัด",
        alt: "วงจรจุดศูนย์ แหล่ง U_ВХ ต่อเข้าจุดกลางของขดปฐมภูมิ w1.1 w1.2 ปลายขดต่อทรานซิสเตอร์ VT1 อยู่บน VT2 อยู่ล่าง ลงกราวด์ แกนหม้อแปลง ขดทุติยภูมิ w2 ต่อโหลด Z_Н กราฟด้านล่างยังว่าง",
        nums: [
          { k: "แรงดันแหล่งจ่าย (ค่าตัวอย่าง)", v: "U_ВХ = " + UIN_S, note: "ผู้เรียบเรียงเลือก" },
          { k: "ขดปฐมภูมิ", v: "w1.1 + w1.2 · จุดกลางต่อ +U_ВХ" },
          { k: "ทรานซิสเตอร์", v: "VT1, VT2 ปิดทั้งคู่ · i_К1 = i_К2 = 0" }
        ] },
      { title: "ครึ่งคาบแรก: VT1 นำ",
        text: "u_у1 เปิด VT1 กระแส i_К1 ไหลจาก + ผ่านจุดกลางขึ้นไปใน w1.1 ผ่าน VT1 ลงกราวด์ แรงดัน U_ВХ ตกคร่อมครึ่งบน w1.1 ฟลักซ์ในแกนวิ่งทิศหนึ่ง (ทิศอ้างอิงตามการพันที่สมมติ) และ w2 ให้ u_вых เป็นบวก · ครึ่งล่าง w1.2 อยู่บนแกนเดียวกัน จึงถูกเหนี่ยวนำให้มีแรงดัน U_ВХ เท่ากัน บวกเข้ากับแรงดันที่จุดกลาง → ปลายล่างที่ต่อ VT2 (ปิดอยู่) มีศักย์ ≈ " + UIN_S + " + " + UIN_S + " = " + UOFF_S + " " + ED,
        alt: "VT1 นำ เส้นทางกระแสสีเขียวอมน้ำเงินจากแหล่งไปจุดกลางขึ้นขดบนผ่าน VT1 ลงกราวด์ ลูกศรฟลักซ์ชี้ขึ้น ขั้วบวกที่ปลายโหลดด้านบน ป้ายที่ VT2 ระบุว่าทนประมาณ 54 โวลต์",
        nums: [
          { k: "ทรานซิสเตอร์", v: "VT1 นำ · VT2 ปิด · i_К2 = 0" },
          { k: "แรงดันตกคร่อมขดนำกระแส w1.1", v: "≈ U_ВХ = " + UIN_S },
          { k: "แรงดันที่ VT2 (ปิด) ต้องทน", v: "≈ U_ВХ + U_ВХ = 2·U_ВХ = " + UOFF_S, big: true, note: "(ละเลยแรงดันตกบนสวิตช์ที่นำ)" }
        ] },
      { title: "ครึ่งคาบหลัง: VT2 นำ",
        text: "u_у2 เปิด VT2 (VT1 ปิด) กระแส i_К2 ไหลผ่านครึ่งล่าง w1.2 จากจุดกลางลงไปหา VT2 ฟลักซ์ในแกนกลับทิศ และ u_вых กลับเป็นลบ · ปลายบนของ w1.1 ที่ต่อ VT1 (ปิดอยู่) มีศักย์ ≈ " + UIN_S + " + " + UIN_S + " = " + UOFF_S + " เท่ากัน · ทั้งสองครึ่งคาบใช้ขดคนละครึ่ง แกนจึงถูกกวาดกลับสองทิศ (сл. 20) " + ED,
        alt: "VT2 นำ เส้นทางกระแสสีส้มจากจุดกลางลงขดล่างผ่าน VT2 ลูกศรฟลักซ์ชี้ลง ขั้วลบที่ปลายโหลดด้านบน ป้ายที่ VT1 ระบุว่าทนประมาณ 54 โวลต์",
        nums: [
          { k: "ทรานซิสเตอร์", v: "VT2 นำ · VT1 ปิด · i_К1 = 0" },
          { k: "แรงดันตกคร่อมขดนำกระแส w1.2", v: "≈ U_ВХ = " + UIN_S },
          { k: "แรงดันที่ VT1 (ปิด) ต้องทน", v: "≈ U_ВХ + U_ВХ = 2·U_ВХ = " + UOFF_S, big: true, note: "ผู้เรียบเรียงคำนวณ" }
        ] },
      { title: "รูปคลื่น",
        text: "ต่อสองครึ่งคาบเข้าด้วยกันได้รูปคลื่นของสไลด์ 17: i_К1 กับ i_К2 เป็นพัลส์กว้างครึ่งคาบเหมือนกัน แต่เลื่อนกันครึ่งคาบ · กระแสจากแหล่ง I_ВХ = i_К1 + i_К2 จึงต่อเนื่องและเกือบคงที่ · u_вых สลับบวก–ลบครึ่งคาบละเท่ากัน เป็นสี่เหลี่ยมสมมาตร (меандр) ตรงกับอัลกอริทึม 11 → 22 ของสไลด์ 11 · ยอดพัลส์ที่ไต่ขึ้นเล็กน้อยในรูปคือรูปร่างตามสไลด์ ไม่ใช่ค่าวัด",
        alt: "กราฟสี่แถว สองคาบ กระแส i_К1 และ i_К2 เป็นพัลส์สลับกันครึ่งคาบ I_ВХ เกือบเป็นเส้นระดับเดียว u_вых เป็นคลื่นสี่เหลี่ยมสมมาตร",
        nums: [
          { k: "i_К2 เลื่อนจาก i_К1", v: "T/2 = " + nf(PHASE, 0) + "°" },
          { k: "กระแสจากแหล่ง", v: "I_ВХ = i_К1 + i_К2 ≈ คงที่" },
          { k: "แรงดันขาออก", v: "+U_m2 / −U_m2 ครึ่งคาบละเท่ากัน (меандр)" }
        ] },
      { title: "สรุปข้อดีสามข้อ และราคาที่จ่าย",
        text: "ข้อดี: ① รูปคลื่นขาออกสมมาตร ② กระแสขาเข้าเกือบคงที่ ซึ่งสำคัญเมื่อแหล่งจ่ายเป็นแบตเตอรี่ ③ แกนหม้อแปลงถูกกวาดกลับทั้งสองทิศ · ราคาที่จ่าย: สวิตช์ที่ปิดต้องทน 2·U_ВХ = " + UOFF_S + " ขณะที่วงจรสะพาน (сл. 19 а) ทนแค่ U_ВХ = " + UBR_S + " → เมื่อแรงดันแหล่งสูง วงจรสะพานได้เปรียบ " + ED,
        alt: "ภาพเดียวกันพร้อมหมายเลข 1 ถึง 3 กำกับข้อดี ลูกศรฟลักซ์สองทิศในแกน และป้ายแรงดันที่สวิตช์ทั้งสองต้องทน 54 โวลต์",
        nums: [
          { k: "ข้อดี (сл. 17, 20)", v: "① สมมาตร · ② I_ВХ เกือบคงที่ · ③ แกนกลับทิศสองทาง" },
          { k: "ราคา: สวิตช์ที่ปิดทน · จุดศูนย์", v: "≈ 2·U_ВХ = " + UOFF_S, big: true },
          { k: "เทียบ · สะพาน (сл. 19 а)", v: "≈ U_ВХ = " + UBR_S + " · ต่างกัน " + nf(UOFF / UBR, 0) + " เท่า", note: "ผู้เรียบเรียงคำนวณ" }
        ] }
    ];
    /* ตัวห้อยในข้อความ HTML: U_ВХ → U<sub>ВХ</sub> */
    const fx = t => String(t).replace(/([UuiI])_(ВХ|вых|m2|К1|К2|у1|у2|К)(?![A-Za-zА-Яа-я0-9])/g, "$1<sub>$2</sub>")
      .replace(/\b(w)(1\.1|1\.2)\b/g, (m, a, b) => a + "<sub>" + b + "</sub>").replace(/\bw2\b/g, "w<sub>2</sub>");
    STEPS.forEach(st => {
      st.title = fx(st.title); st.text = fx(st.text);
      (st.nums || []).forEach(n => { n.k = fx(n.k); n.v = Array.isArray(n.v) ? n.v.map(fx) : fx(n.v); if (n.note) n.note = fx(n.note); });
    });

    const STATE = [0, 1, 2, 0, 0];                   // VT ที่นำในแต่ละขั้น
    const PROG = [0, 0.5, 1, 2, 2];                  // ความคืบหน้าบนแกนเวลา (จำนวนคาบ)

    return window.STEPS2(host, {
      label: "แอนิเมชันทีละขั้น",
      title: 'อินเวอร์เตอร์แบบพุช-พูลจุดศูนย์ทีละครึ่งคาบ <span style="white-space:nowrap">(сл. 17, 19 б, 20)</span>',
      aria: "แอนิเมชันทีละขั้น: อินเวอร์เตอร์แบบพุช-พูลจุดศูนย์ ทรานซิสเตอร์ VT1 VT2 ผลัดกันนำ ฟลักซ์ในแกนกลับทิศ รูปคลื่นสองคาบ และแรงดันที่สวิตช์ปิดต้องทน",
      legend: [
        { cls: "lg-ref", text: "VT1 · i_К1" },
        { cls: "lg-meas", text: "VT2 · i_К2" },
        { cls: "lg-lin", text: "I_ВХ" },
        { cls: "lg-new", text: "u_вых" }
      ],
      steps: STEPS,
      caption: "วงจรและรูปคลื่นตามสไลด์ 17 · การเปรียบเทียบตามสไลด์ 19 · U_ВХ = " + UIN_S + " ผู้เรียบเรียงเลือก",
      height: w => w < 640 ? 540 : Math.round(Math.max(360, Math.min(430, w * 0.46))),
      draw(ctx, W, H, step, C, anim) {
        const P = window.STEPS2.pen(ctx, W, H, C);
        const stack = W < 640;
        const clamp01 = x => Math.max(0, Math.min(1, x));
        const lerp = (a, b, t) => a + (b - a) * t;
        const e = anim.e, prev = anim.from;
        const sNow = STATE[step], sPrev = STATE[prev];
        const act = s => s === sNow ? (sPrev === sNow ? 1 : e) : (s === sPrev ? 1 - e : 0);
        const at = k => step === k ? (prev === k ? 1 : e) : (prev === k ? 1 - e : 0);   // ความทึบของสิ่งที่แสดงเฉพาะขั้น k
        const stCol = s => s === 1 ? C.ref : C.meas;
        const sumA = anim.fade(4);

        function rich(txt, x, y, color, o) {
          o = o || {};
          const size = o.size || 13, wt = o.weight || 600, halo = o.halo === undefined ? 4 : o.halo;
          const parts = [], re = /([_^])\{([^}]*)\}/g;
          let last = 0, m;
          while ((m = re.exec(txt))) {
            if (m.index > last) parts.push({ t: txt.slice(last, m.index), k: 0 });
            parts.push({ t: m[2], k: m[1] === "_" ? 1 : 2 });
            last = re.lastIndex;
          }
          if (last < txt.length) parts.push({ t: txt.slice(last), k: 0 });
          let tw = 0;
          parts.forEach(p => { P.font(p.k ? size * 0.74 : size, wt, o.mono); p.w = ctx.measureText(p.t).width; tw += p.w; });
          const al = o.align || "left";
          let left = al === "left" ? x : al === "right" ? x - tw : x - tw / 2;
          left = Math.max(3, Math.min(W - 3 - tw, left));
          y = Math.max(9, Math.min(H - 9, y));
          ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
          [halo > 0 ? 0 : 1, 1].forEach(pass => {
            let cx = left;
            parts.forEach(p => {
              P.font(p.k ? size * 0.74 : size, wt, o.mono);
              const dy = p.k === 1 ? size * 0.27 : p.k === 2 ? -size * 0.34 : 0;
              if (pass === 0) { ctx.lineWidth = halo; ctx.strokeStyle = C.bg; ctx.strokeText(p.t, cx, y + dy); }
              else { ctx.fillStyle = color; ctx.fillText(p.t, cx, y + dy); }
              cx += p.w;
            });
          });
          return { x: left, y: y, w: tw };
        }
        function rrect(x, y, w, h, r) {
          ctx.beginPath();
          ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
          ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
          ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
          ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
        }
        function badge(n, x, y, color) {
          ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
          rich(String(n), x, y + 0.5, "#fff", { size: 11.5, weight: 700, align: "center", halo: 0 });
        }

        /* =================== วงจร (сл. 17) =================== */
        const cwS = Math.min(W - 12, 430);
        const cb = stack ? { x: Math.round((W - cwS) / 2), y: 4, w: cwS, h: 268 } : { x: 8, y: 6, w: Math.round(W * 0.47), h: H - 12 };
        const sc = Math.max(0.85, Math.min(1.3, Math.min(cb.h / 262, cb.w / 370)));
        const X = f => cb.x + f * cb.w, Y = f => cb.y + f * cb.h;
        const xS = X(0.07), xVT = X(0.25), xP = X(0.46);
        const xBar = xVT - 8 * sc, xCE = xVT + 9 * sc, xB0 = xBar - 15 * sc;
        const yTop = Y(0.13), yBot = Y(0.87), yMid = Y(0.5), hVT = 0.25 * cb.h;
        const yE1 = yTop + hVT, yE2 = yBot - hVT, yc1 = yTop + hVT / 2, yc2 = yBot - hVT / 2;
        const xK1 = xP + 24 * sc, xK2 = xK1 + 28 * sc, xKc = (xK1 + xK2) / 2;
        const yK0 = Y(0.2), yK1 = Y(0.8);
        const xQ = xK2 + 24 * sc, ySt = Y(0.27), ySb = Y(0.73);
        const xL = X(0.93), rh = 0.1 * cb.h;
        const yPl1 = yMid + 0.075 * cb.h, yPl2 = yMid + 0.125 * cb.h, yG = yMid + 0.27 * cb.h;
        const hump = 7.5 * sc;

        function coil(x, y0, y1, dir, color, w, alpha) {
          const n = Math.max(2, 2 * Math.round((y1 - y0) / (26 * sc)));
          const ry = (y1 - y0) / n / 2;
          ctx.save(); ctx.globalAlpha *= alpha === undefined ? 1 : alpha;
          ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.setLineDash([]);
          for (let i = 0; i < n; i++) {
            ctx.beginPath(); ctx.ellipse(x, y0 + ry * (2 * i + 1), hump, ry, 0, -Math.PI / 2, Math.PI / 2, dir < 0); ctx.stroke();
          }
          ctx.restore();
        }
        function gnd(x, y, dir, color, w) {
          ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.setLineDash([]);
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + dir * 6);
          [[6, 7], [9.5, 4.5], [13, 2]].forEach(a => { ctx.moveTo(x - a[1] * sc, y + dir * a[0]); ctx.lineTo(x + a[1] * sc, y + dir * a[0]); });
          ctx.stroke(); ctx.restore();
        }
        function bjt(yc, up, color, w, alpha) {            // up = ขาคอลเลกเตอร์อยู่ด้านบน
          const d = up ? -1 : 1, yC = up ? yTop : yBot, yEt = up ? yE1 : yE2;
          ctx.save(); ctx.globalAlpha *= alpha === undefined ? 1 : alpha;
          P.seg([[xB0, yc], [xBar, yc]], color, w);
          P.seg([[xBar, yc - 12 * sc], [xBar, yc + 12 * sc]], color, w + 1.4);
          P.seg([[xCE, yC], [xCE, yc + d * 14 * sc], [xBar, yc + d * 4.5 * sc]], color, w);
          const ex = xCE, ey = yc - d * 14 * sc;
          P.seg([[xBar, yc - d * 4.5 * sc], [ex, ey], [xCE, yEt]], color, w);
          const ang = Math.atan2(ey - (yc - d * 4.5 * sc), ex - xBar), hs = 7 * sc;   // หัวลูกศรที่อิมิตเตอร์ (NPN)
          const hx = ex - Math.cos(ang) * 2, hy = ey - Math.sin(ang) * 2;
          ctx.beginPath(); ctx.moveTo(ex, ey);
          ctx.lineTo(ex - hs * Math.cos(ang - 0.45), ey - hs * Math.sin(ang - 0.45));
          ctx.lineTo(ex - hs * Math.cos(ang + 0.45), ey - hs * Math.sin(ang + 0.45));
          ctx.closePath(); ctx.fillStyle = color; ctx.fill(); void hx; void hy;
          ctx.restore();
        }

        /* ฐาน (สีกลาง) */
        const gray = C.ink3;
        P.seg([[xS, yMid], [xP, yMid]], gray, 1.8);                       // สาย +U_ВХ → จุดกลาง
        P.seg([[xS, yMid], [xS, yPl1]], gray, 1.8); P.seg([[xS, yPl2], [xS, yG]], gray, 1.8);
        P.seg([[xS - 10 * sc, yPl1], [xS + 10 * sc, yPl1]], C.ink, 2.4);
        P.seg([[xS - 5 * sc, yPl2], [xS + 5 * sc, yPl2]], C.ink, 4.4);
        gnd(xS, yG, 1, C.ink2, 1.8);
        P.seg([[xCE, yTop], [xP, yTop]], gray, 1.8); P.seg([[xCE, yBot], [xP, yBot]], gray, 1.8);
        gnd(xCE, yE1, 1, C.ink2, 1.8); gnd(xCE, yE2, -1, C.ink2, 1.8);
        bjt(yc1, true, C.ink2, 2); bjt(yc2, false, C.ink2, 2);
        coil(xP, yTop, yMid, -1, C.ink2, 2.2); coil(xP, yMid, yBot, -1, C.ink2, 2.2);
        P.seg([[xK1, yK0], [xK1, yK1]], C.ink2, 3); P.seg([[xK2, yK0], [xK2, yK1]], C.ink2, 3);
        coil(xQ, ySt, ySb, 1, C.ink2, 2.2);
        P.seg([[xQ, ySt], [xL, ySt], [xL, yMid - rh]], gray, 1.8); P.seg([[xQ, ySb], [xL, ySb], [xL, yMid + rh]], gray, 1.8);
        ctx.beginPath(); ctx.arc(xP, yMid, 3, 0, Math.PI * 2); ctx.fillStyle = C.ink2; ctx.fill();    // จุดกลาง

        /* เส้นทางกระแสของแต่ละจังหวะ */
        [1, 2].forEach(s => {
          const a = act(s);
          if (a < 0.01) return;
          const col = stCol(s), up = s === 1, yT = up ? yTop : yBot, yEm = up ? yE1 : yE2, ycs = up ? yc1 : yc2;
          ctx.save(); ctx.globalAlpha = a;
          P.seg([[xS, yMid], [xP, yMid]], col, 3.2);
          P.seg([[xS, yMid], [xS, yPl1]], col, 3.2); P.seg([[xS, yPl2], [xS, yG]], col, 3.2);
          P.seg([[xCE, yT], [xP, yT]], col, 3.2);
          coil(xP, up ? yTop : yMid, up ? yMid : yBot, -1, col, 3.4);
          bjt(ycs, up, col, 3);
          gnd(xCE, yEm, up ? 1 : -1, col, 2.6); gnd(xS, yG, 1, col, 2.6);
          /* ลูกศรกระแส */
          const xm = xS + (xCE - xS) * 0.45;
          P.arrow(xm - 12, yMid, xm + 12, yMid, col, 2.4, 8);
          const xa = (xCE + xP) / 2;
          P.arrow(xa + 14, yT, xa - 14, yT, col, 2.4, 8);
          const ya = yMid + (up ? -1 : 1) * 0.18 * cb.h;
          P.arrow(xP + 11 * sc, ya + (up ? 14 : -14), xP + 11 * sc, ya + (up ? -14 : 14), col, 2.4, 8);
          /* ขดทุติยภูมิ: ขั้วและกระแสผ่านโหลด */
          coil(xQ, ySt, ySb, 1, col, 3.2);
          P.seg([[xQ, ySt], [xL, ySt], [xL, yMid - rh]], col, 3); P.seg([[xQ, ySb], [xL, ySb], [xL, yMid + rh]], col, 3);
          const dir = up ? 1 : -1;
          P.arrow(xL + 13 * sc, yMid - dir * (rh - 3), xL + 13 * sc, yMid + dir * (rh - 3), col, 2.4, 8);
          P.label(up ? "+" : "−", xL, ySt - 13, col, { size: 16, weight: 700, align: "center", halo: 3 });
          P.label(up ? "−" : "+", xL, ySb + 14, col, { size: 16, weight: 700, align: "center", halo: 3 });
          ctx.restore();
        });
        /* โหลด */
        rrect(xL - 6, yMid - rh, 12, 2 * rh, 2); ctx.fillStyle = C.bg; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C.ink2; ctx.stroke();
        rich("Z_{Н}", xL - 11, yMid, C.ink, { size: 13, align: "right", halo: 3 });

        /* ฟลักซ์ในแกน */
        {
          const fU = Math.max(act(1), sumA), fD = Math.max(act(2), sumA);
          const dx = sumA > 0.5 ? 6 * sc : 0;
          if (fU > 0.02) { ctx.save(); ctx.globalAlpha = fU; P.arrow(xKc - dx, Y(0.64), xKc - dx, Y(0.36), C.ref, 2.6, 8); ctx.restore(); }
          if (fD > 0.02) { ctx.save(); ctx.globalAlpha = fD; P.arrow(xKc + dx, Y(0.36), xKc + dx, Y(0.64), C.meas, 2.6, 8); ctx.restore(); }
          rich("Φ", xKc - (sumA > 0.02 ? 9 : 0), yK0 - 12, C.ink, { size: 15, align: "center", halo: 3 });
          rich("T", xKc, yK1 + 14, C.ink, { size: 13, align: "center", halo: 3 });
          if (sumA > 0.02) { ctx.save(); ctx.globalAlpha = sumA; badge(3, xKc + 12, yK0 - 12, C.deep); ctx.restore(); }
        }

        /* ป้ายชื่อ */
        rich("U_{ВХ}", xS + 13, yPl1 + 1, C.ink, { size: 13, halo: 3 });
        P.label("= " + UIN_S, xS + 13, yPl2 + 6, C.ink2, { size: 11.5, weight: 500, halo: 3 });
        rich("+", xS - 14 * sc, yPl1 - 5, C.ink2, { size: 14, weight: 700, align: "center", halo: 0 });
        rich("−", xS - 14 * sc, yPl2 + 6, C.ink2, { size: 14, weight: 700, align: "center", halo: 0 });
        {
          const wa = act(1), wb = act(2);
          rich("I_{ВХ}", xS + (xCE - xS) * 0.45, yMid - 14, wa + wb > 0.3 ? C.lin : C.ink2, { size: 12.5, align: "center", halo: 3 });
        }
        rich("VT1", xCE + 9 * sc, yc1, C.ink, { size: 13, halo: 3 });
        rich("VT2", xCE + 9 * sc, yc2, C.ink, { size: 13, halo: 3 });
        rich("u_{у1}", xB0 - 3, yc1, C.ink2, { size: 12, align: "right", halo: 3 });
        rich("u_{у2}", xB0 - 3, yc2, C.ink2, { size: 12, align: "right", halo: 3 });
        rich("w_{1.1}", xP - hump - 5, yMid - 0.1 * cb.h, C.ink, { size: 12.5, align: "right", halo: 3 });
        rich("w_{1.2}", xP - hump - 5, yMid + 0.1 * cb.h, C.ink, { size: 12.5, align: "right", halo: 3 });
        rich("w_{2}", xQ + hump + 6, yMid - 0.1 * cb.h, C.ink, { size: 12.5, halo: 3 });
        {
          const wa = act(1), wb = act(2);
          rich("i_{К1}", (xCE + xP) / 2, yTop + 12, wa > 0.3 ? C.ref : C.ink3, { size: 12, align: "center", halo: 3 });
          rich("i_{К2}", (xCE + xP) / 2, yBot - 12, wb > 0.3 ? C.meas : C.ink3, { size: 12, align: "center", halo: 3 });
        }
        /* แรงดันที่สวิตช์ปิดต้องทน */
        {
          const aBot = Math.max(act(1), sumA), aTop = Math.max(act(2), sumA);
          const plain = sumA > 0.5;
          const mid = (xCE + xP) / 2 + 6;
          if (aBot > 0.02) { ctx.save(); ctx.globalAlpha = aBot; rich((plain ? "ปิดทน" : "VT2 ปิด: ทน") + " ≈ 2·U_{ВХ} = " + nf(UOFF, 0) + " В", mid, yBot + 15, C.crit, { size: 12.5, align: "center", halo: 4 }); ctx.restore(); }
          if (aTop > 0.02) { ctx.save(); ctx.globalAlpha = aTop; rich((plain ? "ปิดทน" : "VT1 ปิด: ทน") + " ≈ 2·U_{ВХ} = " + nf(UOFF, 0) + " В", mid, yTop - 15, C.crit, { size: 12.5, align: "center", halo: 4 }); ctx.restore(); }
        }

        /* =================== กราฟรูปคลื่น (сл. 17) =================== */
        const gb = stack ? { x: 6, y: cb.y + cb.h + 4, w: W - 12, h: H - (cb.y + cb.h + 4) - 4 }
                         : { x: cb.x + cb.w + 8, y: 6, w: W - (cb.x + cb.w + 8) - 10, h: H - 12 };
        const mL = 44, mR = 8;
        const gx0 = gb.x + mL, gw = gb.w - mL - mR;
        const sy = gb.y + 2, sh = 20;
        const gTop = sy + sh + 8, gBot = gb.y + gb.h - 26;
        const NR = 4, gap = 7, rhh = (gBot - gTop - gap * (NR - 1)) / NR;
        const ry0 = i => gTop + i * (rhh + gap), ry1 = i => ry0(i) + rhh;
        const tx = t => gx0 + t / 2 * gw;
        const tD = lerp(PROG[prev], PROG[step], e);

        /* รูปคลื่นของแต่ละแถว (หน่วยสัมพัทธ์) */
        const i1 = [], i2 = [], iin = [], uo = [];
        for (let j = 0; j < 2; j++) {
          i1.push([j, 0], [j, 1], [j + 0.5, 1 + KAP], [j + 0.5, 0], [j + 1, 0]);
          i2.push([j, 0], [j + 0.5, 0], [j + 0.5, 1], [j + 1, 1 + KAP], [j + 1, 0]);
          uo.push([j, 1], [j + 0.5, 1], [j + 0.5, -1], [j + 1, -1]);
          if (j === 0) uo.push([j + 1, 1]);
        }
        for (let h = 0; h < 4; h++) { iin.push([h / 2, 1], [(h + 1) / 2, 1 + KAP]); if (h < 3) iin.push([(h + 1) / 2, 1]); }
        const ROWS = [
          { lab: "i_{К1}", col: C.ref, pts: i1, lo: -0.05, hi: 1.42, fill: true },
          { lab: "i_{К2}", col: C.meas, pts: i2, lo: -0.05, hi: 1.42, fill: true },
          { lab: "I_{ВХ}", col: C.lin, pts: iin, lo: -0.05, hi: 1.42, fill: false },
          { lab: "u_{вых}", col: C.new, pts: uo, lo: -1.3, hi: 1.3, fill: false }
        ];
        const vy = (r, v) => ry1(r) - (v - ROWS[r].lo) / (ROWS[r].hi - ROWS[r].lo) * rhh;

        /* ตารางครึ่งคาบและป้ายเวลา */
        ctx.lineWidth = 1; ctx.strokeStyle = C.grid; ctx.setLineDash([]);
        ctx.beginPath();
        for (let k = 0; k <= 4; k++) { const x = gx0 + gw * k / 4; ctx.moveTo(x, gTop - 3); ctx.lineTo(x, gBot + 3); }
        ctx.stroke();
        ["0", "T/2", "T", "3T/2", "2T"].forEach((s, k) => P.label(s, gx0 + gw * k / 4, gBot + 15, C.ink2, { size: 11.5, align: "center", halo: 3 }));
        ROWS.forEach((R, r) => {
          const base = vy(r, 0);
          P.seg([[gx0, base], [gx0 + gw, base]], C.line2, 1.2);
          P.seg([[gx0, ry0(r)], [gx0, ry1(r)]], C.ink3, 1.4);
          rich(R.lab, gx0 - 6, r === 3 ? (ry0(r) + ry1(r)) / 2 - 7 : (ry0(r) + ry1(r)) / 2, R.col, { size: 12.5, align: "right", halo: 3 });
        });
        rich("±U_{m2}", gx0 - 6, (ry0(3) + ry1(3)) / 2 + 8, C.ink3, { size: 10.5, weight: 500, align: "right", halo: 3 });

        /* แถบ VT ด้านบน */
        rich("VT", gb.x + 4, sy + sh / 2, C.ink3, { size: 11, weight: 500, halo: 0 });
        for (let h = 0; h < 4; h++) {
          const a = h / 2, b = (h + 1) / 2, cov = clamp01((tD - a) / (b - a));
          if (cov <= 0.001) continue;
          const col = h % 2 === 0 ? C.ref : C.meas, xa = tx(a), xb = tx(b), bw = (xb - xa) * cov - 3;
          if (bw > 2) {
            ctx.save(); ctx.globalAlpha = 0.16; rrect(xa + 1.5, sy, bw, sh, 4); ctx.fillStyle = col; ctx.fill(); ctx.restore();
            rrect(xa + 1.5, sy, bw, sh, 4); ctx.lineWidth = 1.5; ctx.strokeStyle = col; ctx.stroke();
          }
          const ta = clamp01((cov - 0.5) / 0.4);
          if (ta > 0.02) { ctx.save(); ctx.globalAlpha = ta; rich(h % 2 === 0 ? "VT1" : "VT2", (xa + xb) / 2, sy + sh / 2, col, { size: 12.5, weight: 700, mono: true, align: "center", halo: 0 }); ctx.restore(); }
        }

        /* เส้นรูปคลื่น (ตัดตามความคืบหน้า) */
        if (tD > 0.004) {
          ctx.save(); ctx.beginPath(); ctx.rect(gx0 - 1, gb.y, Math.max(0, tx(tD) - gx0 - 1.4), gb.h); ctx.clip();
          ROWS.forEach((R, r) => {
            const pp = R.pts.map(p => [tx(p[0]), vy(r, p[1])]);
            if (R.fill) {
              ctx.save(); ctx.globalAlpha = 0.16; ctx.beginPath(); ctx.moveTo(pp[0][0], vy(r, 0));
              pp.forEach(q => ctx.lineTo(q[0], q[1])); ctx.lineTo(pp[pp.length - 1][0], vy(r, 0)); ctx.closePath(); ctx.fillStyle = R.col; ctx.fill(); ctx.restore();
            }
            P.seg(pp, R.col, 2.4);
          });
          ctx.restore();
          if (step <= 3) {
            const hx = tx(tD);
            ctx.save(); ctx.globalAlpha = 0.55; P.seg([[hx, gTop - 3], [hx, gBot + 3]], C.ink3, 1.3, [4, 3]); ctx.restore();
          }
        }

        /* ป้ายอธิบายแถว */
        {
          const a3 = anim.fade(3);
          const sh2 = at(3);
          if (sh2 > 0.02) {   // i_К2 เลื่อนครึ่งคาบ
            ctx.save(); ctx.globalAlpha = sh2;
            const yy = ry0(1) + rhh * 0.52;
            P.arrow(tx(0) + 3, yy, tx(0.5) - 3, yy, C.ink2, 1.8, 7); P.arrow(tx(0.5) - 3, yy, tx(0) + 3, yy, C.ink2, 1.8, 7);
            P.label("เลื่อน T/2", (tx(0) + tx(0.5)) / 2, yy - 11, C.ink, { size: 12, align: "center", halo: 3 });
            ctx.restore();
          }
          if (a3 > 0.02) {
            ctx.save(); ctx.globalAlpha = a3;
            const yI = ry0(2) + rhh * 0.62;
            P.label("เกือบคงที่", tx(1.5) + 9, yI, C.lin, { size: 12.5, align: "center", halo: 4 });
            const yU = (ry0(3) + ry1(3)) / 2;
            P.label("สมมาตร", tx(0.75) + 9, yU, C.new, { size: 12.5, align: "center", halo: 4 });
            ctx.restore();
          }
          if (sumA > 0.02) {
            ctx.save(); ctx.globalAlpha = sumA;
            badge(2, tx(1.5) - 24, ry0(2) + rhh * 0.62, C.lin);
            badge(1, tx(0.75) - 24, (ry0(3) + ry1(3)) / 2, C.new);
            ctx.restore();
          }
        }
      }
    });
  }
});
