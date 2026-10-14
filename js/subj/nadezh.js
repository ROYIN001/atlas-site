/* js/subj/nadezh.js — แบบจำลองของวิชา nadezh (STD2) · สร้างโดย _work/std2/tools/assemble.py จาก _work/nadezhstd2/demos/ — ห้ามแก้ไฟล์นี้ตรง ๆ แก้ที่ต้นฉบับแล้วประกอบใหม่ · โหลดโดย subjAssets() เมื่อเปิดวิชา · ห้ามแตะ document ที่ระดับบนสุด */
/* --- nas5-reduce.js --- */
/* nas5-reduce — ยุบ ССН ทีละชั้น: สำรองรายชิ้นส่วน (раздельное) เทียบสำรองทั้งระบบ (общее) ด้วยชิ้นส่วน 4 ตัว P = 0,9
   สูตร: งานศึกษาด้วยตนเอง ข้อ 2 (сл. 48 · เฉลยในข้อความบรรยาย) · ผู้เรียบเรียงทำ
   แบบ 1: (1 ∥ 1) — (2 ∥ 2) → คู่ขนาน 1 − (1 − P)² = 2P − P² → P₁c = [P(2 − P)]²
   แบบ 2: (1 — 2) ∥ (1 — 2) → สายอนุกรม P² → P₂c = 1 − (1 − P²)² = 2P² − P⁴ = P²(2 − P²)
   อัตราส่วน P₁c/P₂c = (2 − P)²/(2 − P²) · (2 − P)² − (2 − P²) = 2(1 − P)² > 0 ⇒ อัตราส่วน > 1 เมื่อ 0 < P < 1 (และ < 2)
   ค่าอ้างอิง (ตรวจด้วย python): P = 0,9 → คู่ขนาน 0,99 · P₁c = 0,9801 · สาย 0,81 · P₂c = 0,9639 · อัตราส่วน 1,016807 (1,017)
     P = 0,5 → P₁c = 0,5625 · P₂c = 0,4375 · อัตราส่วน 1,286 · นับสถานะ 2⁴ = 16: แบบ 1 ทำงานได้ 9 สถานะ แบบ 2 ทำงานได้ 7 สถานะ
   ส่วนของผู้เรียบเรียง (บอกบนจอ): ค่า P = 0,9 · ตัวเลขทุกตัว · การนับสถานะ 9/16 กับ 7/16 · ภาพทั้งหมด */
Object.assign(DEMOS, {
  "nas5-reduce": function (host) {
    const nf = window.STEPS2.nf;

    /* ---------- ตัวเลข (คำนวณสดจากสูตร) ---------- */
    const P = 0.9;
    const pair = 1 - Math.pow(1 - P, 2);                 // คู่ขนานของแบบ 1
    const P1c = pair * pair;                             // [P(2 − P)]²
    const chain = P * P;                                 // สายอนุกรมของแบบ 2
    const P2c = 1 - Math.pow(1 - chain, 2);              // 2P² − P⁴
    const ratio = P1c / P2c, ratioF = Math.pow(2 - P, 2) / (2 - P * P);
    const diffNum = Math.pow(2 - P, 2) - (2 - P * P), diff2 = 2 * Math.pow(1 - P, 2);
    const PL = 0.5, PL1 = Math.pow(PL * (2 - PL), 2), PL2 = PL * PL * (2 - PL * PL);
    /* นับสถานะ: ชิ้นส่วนเดียวกัน 4 ตัว [บน1, บน2, ล่าง1, ล่าง2] ทำงาน/เสีย */
    const NE = 4, NST = Math.pow(2, NE);
    let ok1 = 0, ok2 = 0, pr1 = 0, pr2 = 0;
    for (let m = 0; m < NST; m++) {
      const T1 = !!(m & 1), T2 = !!(m & 2), B1 = !!(m & 4), B2 = !!(m & 8);
      let pr = 1; [T1, T2, B1, B2].forEach(u => { pr *= u ? P : 1 - P; });
      if ((T1 || B1) && (T2 || B2)) { ok1++; pr1 += pr; }        // แบบ 1: (1 ∥ 1) — (2 ∥ 2)
      if ((T1 && T2) || (B1 && B2)) { ok2++; pr2 += pr; }        // แบบ 2: (1 — 2) ∥ (1 — 2)
    }
    const ED = '<span class="ed">ผู้เรียบเรียงคำนวณ</span>', EDC = '<span class="ed">ผู้เรียบเรียงเลือก</span>';

    /* MathML ย่อ */
    const mi = s => "<mi>" + s + "</mi>", mn = s => "<mn>" + s + "</mn>", mo = s => "<mo>" + s + "</mo>";
    const sub = (b, s) => "<msub>" + b + s + "</msub>", sup = (b, s) => "<msup>" + b + s + "</msup>";
    const row = (...a) => "<mrow>" + a.join("") + "</mrow>";
    const frac = (a, b) => "<mfrac>" + a + b + "</mfrac>";
    const mt = s => "<math>" + s + "</math>";
    const p = mi("P"), one = mn("1"), two = mn("2");
    const par = x => row(mo("("), x, mo(")"));
    const m1c = sub(mi("P"), row(mn("1"), mi("c"))), m2c = sub(mi("P"), row(mn("2"), mi("c")));
    const oneMinusP = row(one, mo("−"), p);
    const F = {
      P: mt(p), P1c: mt(m1c), P2c: mt(m2c),
      pair: mt(one + mo("−") + sup(par(oneMinusP), two) + mo("=") + two + p + mo("−") + sup(p, two)),
      p1c: mt(m1c + mo("=") + sup(row(mo("["), p, par(row(two, mo("−"), p)), mo("]")), two)),
      chain: mt(sup(p, two)),
      p2c: mt(m2c + mo("=") + two + sup(p, two) + mo("−") + sup(p, mn("4")) + mo("=") + sup(p, two) + par(row(two, mo("−"), sup(p, two)))),
      ratio: mt(frac(m1c, m2c) + mo("=") + frac(sup(par(row(two, mo("−"), p)), two), row(two, mo("−"), sup(p, two)))),
      diff: mt(sup(par(row(two, mo("−"), p)), two) + mo("−") + par(row(two, mo("−"), sup(p, two))) + mo("=") + two + sup(par(oneMinusP), two))
    };
    const pn = x => nf(x, 1), p2 = x => nf(x, 2);

    const STEPS = [
      { title: "สองแบบ ชิ้นส่วนเท่ากัน",
        text: "ระบบทั้งสองใช้ชิ้นส่วนชุดเดียวกัน 4 ตัว แต่ละตัวมี ВБР (вероятность безотказной работы — ความน่าจะเป็นที่ไม่ล้มเหลว) P = " + pn(P) + " เท่ากัน ต่างกันแค่จุดเชื่อม · " +
          "แบบ 1 สำรองรายชิ้นส่วน (раздельное, поэлементное): ชิ้นส่วน 1 มีตัวสำรองของตัวเอง ชิ้นส่วน 2 ก็เช่นกัน · " +
          "แบบ 2 สำรองทั้งระบบ (общее): สายโซ่ 1—2 ทั้งสายมีสายสำรองอีกหนึ่งสาย (сл. 48) · ค่า P สไลด์ให้เป็นสัญลักษณ์ ตัวเลข " + pn(P) + " " + EDC,
        alt: "สองโครงสร้างวางเทียบกัน แบบ 1 คือคู่ขนาน 1 กับ 1 ต่ออนุกรมกับคู่ขนาน 2 กับ 2 แบบ 2 คือสายอนุกรม 1 ต่อ 2 สองสายต่อขนานกัน ทุกกล่องเขียน 0,9",
        nums: [
          { k: "ชิ้นส่วนทั้งหมด", v: "4 ตัว · ВБР ทุกตัว P = " + pn(P) },
          { k: "แบบ 1 สำรองรายชิ้นส่วน (раздельное)", v: "(1 ∥ 1) — (2 ∥ 2)" },
          { k: "แบบ 2 สำรองทั้งระบบ (общее)", v: "(1 — 2) ∥ (1 — 2)" }
        ] },
      { title: "แบบ 1: ยุบแต่ละคู่ขนาน",
        text: "คู่ (1 ∥ 1) ทำงานได้เมื่ออย่างน้อยหนึ่งในสองตัวทำงาน จึงยุบเป็นกล่องเดียวที่ล้มเฉพาะเมื่อทั้งสองตัวล้ม · ที่ P = " + pn(P) + " ได้ " + nf(pair, 2) +
          " สองกล่อง (คู่ (2 ∥ 2) ก็เหมือนกัน) " + ED,
        alt: "แต่ละคู่ขนานของแบบ 1 ยุบเป็นกล่องสีแดงม่วงเดียว เขียน 0,99 สองกล่อง ต่ออนุกรมกัน",
        nums: [
          { k: "คู่ขนานหนึ่งคู่", v: F.pair },
          { k: "แทน P = " + pn(P), v: "1 − (1 − " + pn(P) + ")² = 1 − " + nf(Math.pow(1 - P, 2), 2) + " = " + nf(pair, 2), big: true }
        ] },
      { title: "แบบ 1: ต่ออนุกรม",
        text: "สองกล่อง " + nf(pair, 2) + " ต่ออนุกรมกัน ระบบทำงานเมื่อทั้งสองกล่องทำงาน จึงคูณกัน · " + mt(m1c) + " = [P(2 − P)]² = " + nf(pair, 2) + "² = " + nf(P1c, 4) + " " + ED,
        alt: "สองกล่อง 0,99 ยุบรวมเป็นกล่องใหญ่กล่องเดียว เขียน P1c เท่ากับ 0,9801",
        nums: [
          { k: "อนุกรมของสองคู่", v: F.p1c },
          { k: "แทนค่า", v: nf(pair, 2) + "² = " + nf(P1c, 4), big: true }
        ] },
      { title: "แบบ 2: ยุบแต่ละสาย",
        text: "สาย (1 — 2) ทำงานได้เมื่อทั้งสองตัวในสายทำงาน จึงยุบเป็นกล่องเดียวที่เท่ากับ P² · ที่ P = " + pn(P) + " ได้ " + nf(chain, 2) + " สองกล่อง " + ED,
        alt: "แต่ละสายของแบบ 2 ยุบเป็นกล่องสีแดงม่วงเดียว เขียน 0,81 สองกล่อง ต่อขนานกัน",
        nums: [
          { k: "สายอนุกรมหนึ่งสาย", v: F.chain + " = " + pn(P) + "² = " + nf(chain, 2), big: true }
        ] },
      { title: "แบบ 2: ต่อขนาน",
        text: "สองสาย " + nf(chain, 2) + " ต่อขนานกัน ระบบล้มเฉพาะเมื่อทั้งสองสายล้ม · " + mt(m2c) + " = 1 − (1 − P²)² = 2P² − P⁴ = P²(2 − P²) = " + nf(P2c, 4) + " " + ED,
        alt: "สองกล่อง 0,81 ยุบรวมเป็นกล่องใหญ่กล่องเดียว เขียน P2c เท่ากับ 0,9639",
        nums: [
          { k: "ขนานของสองสาย", v: F.p2c },
          { k: "แทน P = " + pn(P), v: "1 − (1 − " + nf(chain, 2) + ")² = 1 − " + nf(Math.pow(1 - chain, 2), 4) + " = " + nf(P2c, 4), big: true }
        ] },
      { title: "เทียบ: รายชิ้นส่วนดีกว่าเสมอ",
        text: "อัตราส่วน " + mt(m1c) + "/" + mt(m2c) + " = (2 − P)²/(2 − P²) = " + nf(ratio, 3) + " มากกว่า 1 เสมอเมื่อ 0 < P < 1 เพราะเศษลบส่วนเท่ากับ 2(1 − P)² > 0 · " +
          "ตัวอย่างสถานะ «1 บนเสีย + 2 ล่างเสีย»: แบบ 2 ล้ม เพราะทั้งสองสายขาด แต่แบบ 1 ยังทำงาน เพราะแต่ละคู่ยังเหลือตัวที่ดี · " +
          "สรุปตามเฉลยในข้อความบรรยาย: สำรองรายชิ้นส่วน (раздельное) ดีกว่าสำรองทั้งระบบ (общее) เมื่อใช้ชิ้นส่วนเท่ากัน · ตัวเลขในขั้นนี้ " + ED,
        alt: "กลับมาที่โครงสร้างเดิมของทั้งสองแบบ ใส่กากบาทที่กล่อง 1 บนและกล่อง 2 ล่างทั้งสองแบบ แบบ 1 ยังมีทางผ่านสีเขียว แบบ 2 ไม่มีทางผ่านเพราะทั้งสองสายขาด",
        nums: [
          { k: "อัตราส่วน", v: F.ratio + " = " + nf(P1c, 4) + " / " + nf(P2c, 4) + " = " + nf(ratio, 3), big: true },
          { k: "เศษ − ส่วน", v: F.diff + " = " + nf(diffNum, 2) + " > 0" },
          { k: "จาก " + NST + " สถานะของชิ้นส่วน " + NE + " ตัว ที่ระบบยังทำงาน", v: "แบบ 1 = " + ok1 + " · แบบ 2 = " + ok2, note: "ผู้เรียบเรียงนับ (เสีย/ไม่เสียต่อชิ้นส่วน รวม 2<sup>" + NE + "</sup> = " + NST + " สถานะ)" },
          { k: "ที่ P = " + nf(PL, 1) + " (ยิ่งชิ้นส่วนแย่ ความต่างยิ่งมาก)", v: nf(PL1, 4) + " เทียบ " + nf(PL2, 4) + " → " + nf(PL1 / PL2, 3) }
        ] }
    ];

    return window.STEPS2(host, {
      label: "แอนิเมชันทีละขั้น",
      title: 'ยุบ ССН ทีละชั้น: สำรองรายชิ้นส่วน เทียบ สำรองทั้งระบบ <span style="white-space:nowrap">(сл. 48)</span>',
      aria: "แอนิเมชันทีละขั้น: ยุบโครงสร้างความเชื่อถือได้ของระบบสำรองสองแบบ ชิ้นส่วน 4 ตัว",
      legend: [
        { cls: "lg-ref", text: "ชิ้นส่วนเดิม P = " + pn(P) },
        { cls: "lg-new", text: "กล่องที่ยุบแล้ว" },
        { cls: "lg-meas", text: "ทางที่ยังทำงาน", color: "var(--ok)" }
      ],
      steps: STEPS,
      caption: "ข้อมูลตามงานศึกษาด้วยตนเองข้อ 2 (сл. 48 · เฉลยในข้อความบรรยาย) · P = 0,9 ผู้เรียบเรียงเลือก",
      height: w => w < 640 ? 450 : 290,
      draw(ctx, W, H, step, C, anim) {
        const pen = window.STEPS2.pen(ctx, W, H, C);
        const stack = W < 640;
        const pad = stack ? 12 : 16;
        const clamp01 = x => Math.max(0, Math.min(1, x));
        const lerp = (a, b, t) => a + (b - a) * t;
        const inR = (s, a, b) => s >= a && s <= b;
        const scene = k => {
          const now = step === k, was = anim.from === k;
          if (now && was) return 1;
          if (now) return clamp01(anim.p * 1.6);
          if (was) return clamp01(1 - anim.p * 2.2);
          return 0;
        };
        /* สถานะของภาพ (0…1) นุ่ม ๆ ทั้งเดินหน้าและถอยหลัง */
        const tr = fn => lerp(fn(anim.from) ? 1 : 0, fn(step) ? 1 : 0, anim.e);
        const A = tr(s => inR(s, 1, 4)), B = tr(s => inR(s, 2, 4));
        const Cc = tr(s => inR(s, 3, 4)), D = tr(s => s === 4);
        const X = tr(s => s === 5);
        const R1 = tr(s => s >= 2), R2 = tr(s => s >= 4);

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
          parts.forEach(q => { pen.font(q.k ? size * 0.72 : size, wt, o.mono); q.w = ctx.measureText(q.t).width; tw += q.w; });
          const al = o.align || "left";
          let left = al === "left" ? x : al === "right" ? x - tw : x - tw / 2;
          left = Math.max(4, Math.min(W - 4 - tw, left));
          y = Math.max(10, Math.min(H - 10, y));
          ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
          [halo > 0 ? 0 : 1, 1].forEach(pass => {          // รอบแรก: ขอบพื้นหลังทุกส่วน · รอบสอง: ตัวอักษร (กันขอบของตัวยกทับตัวอักษรก่อนหน้า)
            let cx = left;
            parts.forEach(q => {
              pen.font(q.k ? size * 0.72 : size, wt, o.mono);
              const dy = q.k === 1 ? size * 0.26 : q.k === 2 ? -size * 0.34 : 0;
              if (pass === 0) { ctx.lineWidth = halo; ctx.strokeStyle = C.bg; ctx.strokeText(q.t, cx, y + dy); }
              else { ctx.fillStyle = color; ctx.fillText(q.t, cx, y + dy); }
              cx += q.w;
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
        const line = (pts, color, w, alpha) => { if (alpha > 0.01) pen.seg(pts, color, w || 2, [], alpha); };

        /* กล่อง: kind 0 = ชิ้นส่วนเดิม · 1 = กล่องที่ยุบแล้ว · 2 = ผลสุดท้าย */
        const bw = stack ? 58 : 66, bh = stack ? 42 : 48, dy = stack ? 27 : 31;
        function box(cx, cy, w, l1, l2, kind, alpha, o) {
          if (alpha < 0.01) return;
          o = o || {};
          ctx.save(); ctx.globalAlpha = alpha;
          rrect(cx - w / 2, cy - bh / 2, w, bh, 6);
          if (kind === 2) { ctx.fillStyle = C.new; ctx.fill(); }
          else { ctx.fillStyle = kind === 1 ? C.bg : C.wash; ctx.fill(); ctx.lineWidth = kind === 1 ? 2.4 : 1.8; ctx.strokeStyle = kind === 1 ? C.new : (o.ok ? C.ok : C.ref); ctx.stroke(); }
          const tc = kind === 2 ? C.bg : kind === 1 ? C.new : C.ink;
          rich(l1, cx, cy - 8, tc, { size: kind === 2 ? 14 : 13, weight: 700, align: "center", halo: 0 });
          rich(l2, cx, cy + 10, tc, { size: kind === 2 ? 14 : 12.5, weight: kind === 2 ? 700 : 500, align: "center", halo: 0, mono: true });
          if (o.fail > 0.01) {
            ctx.globalAlpha = alpha * o.fail;
            rrect(cx - w / 2, cy - bh / 2, w, bh, 6);
            ctx.fillStyle = C.bg; ctx.fill(); ctx.lineWidth = 2.6; ctx.strokeStyle = C.crit; ctx.stroke();
            rich(l1, cx, cy - 8, C.ink3, { size: 13, weight: 700, align: "center", halo: 0 });
            ctx.lineWidth = 3.6; ctx.lineCap = "round"; ctx.strokeStyle = C.crit; ctx.beginPath();
            ctx.moveTo(cx - w / 2 + 6, cy - bh / 2 + 6); ctx.lineTo(cx + w / 2 - 6, cy + bh / 2 - 6);
            ctx.moveTo(cx + w / 2 - 6, cy - bh / 2 + 6); ctx.lineTo(cx - w / 2 + 6, cy + bh / 2 - 6); ctx.stroke();
          }
          ctx.restore();
        }

        /* ---------- ตำแหน่งแผง ---------- */
        const panelH = stack ? 176 : 190;
        const panels = stack
          ? [{ x0: pad, pw: W - 2 * pad, y0: 6 }, { x0: pad, pw: W - 2 * pad, y0: 6 + panelH + 4 }]
          : [{ x0: pad, pw: (W - 3 * pad) / 2, y0: 8 }, { x0: pad * 2 + (W - 3 * pad) / 2, pw: (W - 3 * pad) / 2, y0: 8 }];
        const stripTop = (stack ? panels[1].y0 + panelH : panels[0].y0 + panelH) + 6;

        const head = (y0, x0, pw, title, scheme, stateOk) => {
          rich(title, x0, y0 + 10, C.ink, { size: 13.5, weight: 700 });
          rich(scheme, x0, y0 + 30, C.ink3, { size: 12.5, weight: 500 });
          if (X > 0.01) {
            ctx.save(); ctx.globalAlpha = X;
            rich(stateOk ? "ยังทำงาน" : "ล้ม", x0 + pw, y0 + 30, stateOk ? C.ok : C.crit, { size: 13.5, weight: 700, align: "right" });
            ctx.restore();
          }
        };

        /* ================= แบบ 1: (1 ∥ 1) — (2 ∥ 2) ================= */
        {
          const { x0, pw, y0 } = panels[0];
          const yc = y0 + 52 + dy + bh / 2;
          const xin = x0 + 4, xout = x0 + pw - 4;
          const xm = x0 + pw * 0.5, xaB = x0 + pw * 0.3, xbB = x0 + pw * 0.7;
          const xa = lerp(xaB, xm, B), xb = lerp(xbB, xm, B);
          const k = 1 - A, dd = dy * k;
          const hw = bw / 2, gl = hw + 12;
          head(y0, x0, pw, "แบบ 1 · สำรองรายชิ้นส่วน (раздельное)", "(1 ∥ 1) — (2 ∥ 2)", true);
          /* ทางผ่านของสถานะตัวอย่าง (เฉพาะขั้นสุดท้าย) */
          if (X > 0.01) {
            line([[xin, yc], [xa - gl, yc], [xa - gl, yc + dy], [xa + gl, yc + dy], [xa + gl, yc], [xb - gl, yc], [xb - gl, yc - dy], [xb + gl, yc - dy], [xb + gl, yc], [xout, yc]], C.ok, 5, X);
          }
          /* สายหลัก */
          const seg = (x1, x2, a) => { if (x2 > x1) line([[x1, yc], [x2, yc]], C.ink3, 2, a); };
          seg(xin, xa - gl, 1); seg(xb + gl, xout, 1); seg(xa + gl, xb - gl, 1);
          seg(xa - gl, xa + gl, A); seg(xb - gl, xb + gl, A);
          pen.arrow(xout - 10, yc, xout, yc, C.ink3, 2, 9);
          /* สาขาขนาน */
          [xa, xb].forEach(cx => {
            line([[cx - gl, yc - dd], [cx - gl, yc + dd]], C.ink3, 2, k);
            line([[cx + gl, yc - dd], [cx + gl, yc + dd]], C.ink3, 2, k);
            [yc - dd, yc + dd].forEach(yy => {
              line([[cx - gl, yy], [cx - hw, yy]], C.ink3, 2, k);
              line([[cx + hw, yy], [cx + gl, yy]], C.ink3, 2, k);
            });
          });
          /* ชิ้นส่วนเดิม */
          const oa = 1 - A;
          box(xa, yc - dd, bw, "1", pn(P), 0, oa, { fail: X });          // บน 1 (เสียในสถานะตัวอย่าง)
          box(xa, yc + dd, bw, "1", pn(P), 0, oa, { ok: X > 0.5 });
          box(xb, yc - dd, bw, "2", pn(P), 0, oa, { ok: X > 0.5 });
          box(xb, yc + dd, bw, "2", pn(P), 0, oa, { fail: X });          // ล่าง 2 (เสียในสถานะตัวอย่าง)
          /* กล่องที่ยุบแล้ว */
          box(xa, yc, bw + 6, "1 ∥ 1", nf(pair, 2), 1, A * (1 - B));
          box(xb, yc, bw + 6, "2 ∥ 2", nf(pair, 2), 1, A * (1 - B));
          box(xm, yc, bw + 22, "P_{1c}", nf(P1c, 4), 2, B);
          if (R1 > 0.01) {
            ctx.save(); ctx.globalAlpha = R1 * (1 - X);
            rich("P_{1c} = " + nf(P1c, 4), x0 + pw / 2, y0 + panelH - 12, C.new, { size: 15, weight: 700, align: "center" });
            ctx.restore();
          }
        }

        /* ================= แบบ 2: (1 — 2) ∥ (1 — 2) ================= */
        {
          const { x0, pw, y0 } = panels[1];
          const yc = y0 + 52 + dy + bh / 2;
          const xin = x0 + 4, xout = x0 + pw - 4;
          const xm = x0 + pw * 0.5, x1B = x0 + pw * 0.34, x2B = x0 + pw * 0.66;
          const busL = x0 + pw * 0.12, busR = x0 + pw * 0.88;
          const x1 = lerp(x1B, xm, Cc), x2 = lerp(x2B, xm, Cc);
          const k = 1 - D, dd = dy * k, hw = bw / 2;
          head(y0, x0, pw, "แบบ 2 · สำรองทั้งระบบ (общее)", "(1 — 2) ∥ (1 — 2)", false);
          line([[xin, yc], [busL, yc]], C.ink3, 2, 1);
          line([[busR, yc], [xout, yc]], C.ink3, 2, 1);
          pen.arrow(xout - 10, yc, xout, yc, C.ink3, 2, 9);
          line([[busL, yc], [busR, yc]], C.ink3, 2, D);
          line([[busL, yc - dd], [busL, yc + dd]], C.ink3, 2, k);
          line([[busR, yc - dd], [busR, yc + dd]], C.ink3, 2, k);
          [yc - dd, yc + dd].forEach(yy => line([[busL, yy], [busR, yy]], C.ink3, 2, k));
          const oc = 1 - Cc;
          box(x1, yc - dd, bw, "1", pn(P), 0, oc, { fail: X });          // บน 1 (เสียในสถานะตัวอย่าง)
          box(x2, yc - dd, bw, "2", pn(P), 0, oc);
          box(x1, yc + dd, bw, "1", pn(P), 0, oc);
          box(x2, yc + dd, bw, "2", pn(P), 0, oc, { fail: X });          // ล่าง 2 (เสียในสถานะตัวอย่าง)
          box(xm, yc - dd, bw + 6, "1 — 2", nf(chain, 2), 1, Cc * (1 - D));
          box(xm, yc + dd, bw + 6, "1 — 2", nf(chain, 2), 1, Cc * (1 - D));
          box(xm, yc, bw + 22, "P_{2c}", nf(P2c, 4), 2, D);
          if (R2 > 0.01) {
            ctx.save(); ctx.globalAlpha = R2 * (1 - X);
            rich("P_{2c} = " + nf(P2c, 4), x0 + pw / 2, y0 + panelH - 12, C.new, { size: 15, weight: 700, align: "center" });
            ctx.restore();
          }
        }

        /* ================= แถบสูตรด้านล่าง ================= */
        {
          ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath();
          ctx.moveTo(pad, stripTop + 0.5); ctx.lineTo(W - pad, stripTop + 0.5); ctx.stroke();
          const cx = W / 2, y1 = stripTop + 22, y2 = stripTop + 46, y3 = stripTop + 68;
          const S = [
            [["ชิ้นส่วน 4 ตัว P = " + pn(P) + " เท่ากันทุกตัว", C.ink, 14]],
            [["คู่ขนาน: 1 − (1 − P)^{2} = 2P − P^{2} = " + nf(pair, 2), C.new, 14]],
            [["P_{1c} = [P(2 − P)]^{2} = " + nf(pair, 2) + "^{2} = " + nf(P1c, 4), C.new, 14]],
            [["สายอนุกรม: P^{2} = " + pn(P) + "^{2} = " + nf(chain, 2), C.new, 14]],
            [["P_{2c} = 2P^{2} − P^{4} = P^{2}(2 − P^{2}) = " + nf(P2c, 4), C.new, 14]],
            [["P_{1c} / P_{2c} = (2 − P)^{2} / (2 − P^{2}) = " + nf(ratio, 3), C.new, 14],
             ["ตัวอย่างสถานะ: 1 บนเสีย + 2 ล่างเสีย", C.ink2, 12.5],
             ["แบบ 1 ยังทำงาน · แบบ 2 ล้ม", C.ink2, 12.5]]
          ];
          S.forEach((ls, k) => {
            const a = scene(k);
            if (a < 0.01) return;
            ctx.save(); ctx.globalAlpha = a;
            ls.forEach((l, i) => {
              if (i === 2) {      // บรรทัดสรุปสถานะ: ทำงาน/ล้ม คนละสี
                rich("แบบ 1 ยังทำงาน", cx - 6, y3, C.ok, { size: 12.5, weight: 700, align: "right" });
                rich("·", cx, y3, C.ink3, { size: 12.5, weight: 700, align: "center" });
                rich("แบบ 2 ล้ม", cx + 6, y3, C.crit, { size: 12.5, weight: 700 });
              } else rich(l[0], cx, i === 0 ? (ls.length > 1 ? y1 : y1 + 10) : y2, l[1], { size: l[2], weight: i === 0 ? 700 : 500, align: "center" });
            });
            ctx.restore();
          });
        }
      }
    });
  }
});
/* --- nas5-series.js --- */
/* nas5-series — ССН อนุกรม 20 องค์ประกอบ (ตัวอย่างที่ 3 ของบรรยายที่ 5): ตัวเดียวล้มทั้งสายล้ม → λ_C = nλ → P_C(t) → T_C → t_γc → สรุป «หารด้วย n / ยกกำลัง n»
   สูตร: сл. 29 (P_C = ΠP_i) · сл. 31 (λ_C = Σλ_i) · сл. 32 (T_C = 1/λ_C) · сл. 33 (t_γc) · сл. 34 (K_Г = Πk_Гi) · сл. 39 (ตัวอย่างที่ 3: n = 20, λ = 10⁻⁶ 1/ч) · ผู้เรียบเรียงทำ
   ใช้: P_i = e^(−λt) · P_C = e^(−nλt) = P_i^n · λ_C = nλ · T_C = 1/λ_C = T/n · t_γ = −ln(0,01γ)/λ · t_γc = t_γ/n · K_Г = k_Г^n
   ค่าอ้างอิง (ตรวจด้วย python): λ_C = 2·10⁻⁵ 1/ч · T_C = 5·10⁴ ч · t = 10⁴ ч: P_i = 0,99005 · P_C = 0,81873 · γ = 95 %: t_γ = 51 293,3 ч · t_γc = 2 564,7 ч
     P_C(T_C) = e⁻¹ = 0,3679 · k_Г = 0,95 → K_Г = 0,3585
   ส่วนของผู้เรียบเรียง (บอกบนจอ): t = 10⁴ ч · γ = 95 % · k_Г = 0,95 · ที่มาของ t_γ = −ln(0,01γ)/λ · ภาพทั้งหมด */
Object.assign(DEMOS, {
  "nas5-series": function (host) {
    const nf = window.STEPS2.nf;

    /* ---------- ข้อมูลและตัวเลข (คำนวณสดจากสูตร) ---------- */
    const N = 20, LAM = 1e-6, GAMMA = 95, T0 = 1e4, TMAX = 1.2e5, KG = 0.95, FAIL = 2;
    const LAMC = N * LAM, TONE = 1 / LAM, TC = 1 / LAMC;
    const TG = -Math.log(GAMMA / 100) / LAM, TGC = TG / N;
    const PI0 = Math.exp(-LAM * T0), PC0 = Math.exp(-LAMC * T0), PN0 = Math.pow(PI0, N);
    const PCTC = Math.exp(-LAMC * TC), KGC = Math.pow(KG, N);

    const SUP = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
    function sci(x, d) {                      // 2·10⁻⁵ · 10⁶ (แมนทิสซา 1 ตัดออก)
      const e = Math.floor(Math.log10(Math.abs(x)) + 1e-9);
      const m = nf(x / Math.pow(10, e), d || 0);
      return (m === "1" ? "" : m + "·") + "10" + String(e).split("").map(c => SUP[c]).join("");
    }
    const grp = v => nf(v, 0).replace(/\B(?=(\d{3})+(?!\d))/g, " ");   // 51 293 (เว้นวรรคไม่ตัดบรรทัด)
    const ED = '<span class="ed">ผู้เรียบเรียงคำนวณ</span>';

    /* MathML ย่อ */
    const mi = s => "<mi>" + s + "</mi>", mn = s => "<mn>" + s + "</mn>", mo = s => "<mo>" + s + "</mo>";
    const sub = (b, s) => "<msub>" + b + s + "</msub>", sup = (b, s) => "<msup>" + b + s + "</msup>";
    const row = (...a) => "<mrow>" + a.join("") + "</mrow>";
    const mt = s => "<math>" + s + "</math>";
    const under = (op, lo, hi) => "<munderover>" + op + lo + hi + "</munderover>";
    const idx1n = [row(mi("i"), mo("="), mn("1")), mi("n")];
    const mPC = sub(mi("P"), mi("C")), mPi = sub(mi("P"), mi("i")), mLC = sub(mi("λ"), mi("C")), mLi = sub(mi("λ"), mi("i"));
    const mTC = sub(mi("T"), mi("C")), mTG = sub(mi("t"), mi("γ")), mTGC = sub(mi("t"), row(mi("γ"), mi("c")));
    const mKG = sub(mi("K"), mi("Г")), mkg = sub(mi("k"), mi("Г"));
    const eNeg = x => sup(mi("e"), row(mo("−"), x));
    const F = {
      PC: mt(mPC), Pi: mt(mPi), LC: mt(mLC), TC: mt(mTC), TG: mt(mTG), TGC: mt(mTGC), KG: mt(mKG), kg: mt(mkg),
      prod: mt(mPC + mo("=") + under(mo("∏"), idx1n[0], idx1n[1]) + mPi),
      sum: mt(mLC + mo("=") + under(mo("∑"), idx1n[0], idx1n[1]) + mLi + mo("=") + mi("n") + mi("λ")),
      pi: mt(mPi + mo("=") + eNeg(row(mi("λ"), mi("t")))),
      pc: mt(mPC + mo("=") + eNeg(row(mLC, mi("t")))),
      pcn: mt(mPC + mo("=") + sup(mPi, mi("n"))),
      tc: mt(mTC + mo("=") + "<mfrac>" + mn("1") + mLC + "</mfrac>" + mo("=") + "<mfrac>" + mi("T") + mi("n") + "</mfrac>"),
      tg: mt(mTG + mo("=") + "<mfrac>" + row(mo("−"), mi("ln"), mo("("), mn("0,01"), mi("γ"), mo(")")) + mi("λ") + "</mfrac>"),
      tgc: mt(mTGC + mo("=") + "<mfrac>" + mTG + mi("n") + "</mfrac>"),
      kgn: mt(mKG + mo("=") + sup(mkg, mi("n")))
    };

    const STEPS = [
      { title: "ตรรกะอนุกรม: ตัวเดียวล้ม ทั้งสายล้ม",
        text: "ตัวอย่างที่ 3 (сл. 39): แบตเตอรี่ (аккумуляторная батарея) ของ СУ ЛА มี " + N + " เซลล์ต่อกันเป็นสายโซ่ เซลล์ใดเซลล์หนึ่งล้มเหลว (отказ) ทั้งแบตเตอรี่ล้ม · " +
          "ССН แบบอนุกรม (последовательная) จึงทำงานได้เมื่อทุกตัวทำงานพร้อมกัน ถ้าความล้มเหลวเป็นอิสระต่อกัน ความน่าจะเป็นที่ระบบทำงานคือผลคูณของทุกตัว (сл. 29)",
        alt: "สายโซ่กล่องหมายเลข 1 ถึง 20 ระหว่างขาเข้ากับขาออก กล่องที่ 3 มีกากบาทสีแดง กล่องอื่นจางลง แสดงว่าตัวเดียวล้มทั้งสายล้ม",
        nums: [
          { k: "ตัวอย่างที่ 3 (сл. 39)", v: "n = " + N + " เซลล์เท่ากัน · λ = " + sci(LAM) + " 1/ч" },
          { k: "ความน่าจะเป็นที่ระบบทำงาน (сл. 29)", v: F.prod }
        ] },
      { title: "λ ของระบบ: บวกกัน",
        text: "สมมติ λᵢ = const (เวลาทำงานจนล้มเหลวเป็นแบบเอ็กซ์โพเนนเชียล) ผลคูณของ exp(−λᵢt) จึงรวมเป็น exp(−Σλᵢ·t) · " +
          "อัตราล้มเหลว (интенсивность отказов) ของระบบเท่ากับผลรวมของทุกองค์ประกอบ (сл. 31) · ในตัวอย่างนี้ทุกตัวเท่ากัน จึงได้ nλ",
        alt: "แถบสองแถบ แถบสั้นแทน λ ขององค์ประกอบเดียว แถบยาวเรียงต่อกัน 20 ช่องแทน λ ของระบบ",
        nums: [
          { k: "อัตราล้มเหลวของแต่ละองค์ประกอบ", v: "λ = " + sci(LAM) + " 1/ч" },
          { k: "อัตราล้มเหลวของระบบ (сл. 31)", v: F.sum },
          { k: "แทนค่า n = " + N, v: F.LC + " = " + N + "·" + sci(LAM) + " = " + sci(LAMC) + " 1/ч", big: true, note: "ผู้เรียบเรียงคำนวณ" }
        ] },
      { title: "P(t) ของระบบดิ่งเร็วกว่า",
        text: "เส้นของ «องค์ประกอบเดียว» คือ " + mt(eNeg(row(mi("λ"), mi("t")))) + " ส่วนเส้นของระบบคือ " + mt(eNeg(row(mLC, mi("t")))) +
          " ซึ่งเท่ากับยกกำลัง n ของเส้นแรก · ที่ t = " + grp(T0) + " ч องค์ประกอบเดียวมีโอกาสล้มเหลวราว " + nf((1 - PI0) * 100, 1) + " % แต่ระบบ " + N +
          " ตัวมีโอกาสล้มเหลวราว " + nf((1 - PC0) * 100, 1) + " % · เวลา t ที่เลือกดูและตัวเลขเหล่านี้ " + ED,
        alt: "กราฟ P(t) สองเส้น เส้นขององค์ประกอบเดียวลดลงช้า เส้นของระบบ 20 ตัวลดลงเร็ว ที่ t เท่ากับ 10 000 ชั่วโมง ได้ 0,990 กับ 0,819",
        nums: [
          { k: "ที่ t = " + grp(T0) + " ч · องค์ประกอบเดียว", v: F.pi + " = " + nf(PI0, 3) },
          { k: "ที่ t = " + grp(T0) + " ч · ระบบ " + N + " ตัว", v: F.pc + " = " + nf(PC0, 3), big: true },
          { k: "ตรวจ: ยกกำลัง n", v: F.pcn + " = " + nf(PI0, 5) + "<sup>" + N + "</sup> = " + nf(PN0, 3), note: "ใช้ค่า P ที่ยังไม่ปัดเศษ" }
        ] },
      { title: "เวลาทำงานเฉลี่ย: สั้นลง n เท่า",
        text: "เวลาทำงานเฉลี่ยจนล้มเหลว (средняя наработка до отказа) ของแบบเอ็กซ์โพเนนเชียลคือ 1/λ · ระบบ " + N + " ตัวได้ " + mt(mTC) + " = 1/" + mt(mLC) +
          " = " + sci(TC) + " ч เทียบกับ T = " + sci(TONE) + " ч ของเซลล์เดียว (сл. 32, 39) · " +
          "เส้นตั้งบนกราฟคือ t = " + mt(mTC) + " ส่วน T = " + sci(TONE) + " ч อยู่ไกลเกินกราฟ (กราฟสุดที่ " + sci(TMAX, 1) + " ч) จึงแสดงเป็นลูกศร · ความน่าจะเป็น " + mt(eNeg(mn("1"))) + " ที่จุดบนกราฟ " + ED,
        alt: "เส้นตั้งที่ 50 000 ชั่วโมงบนกราฟ ตัดเส้นของระบบที่ความน่าจะเป็น 0,368 และลูกศรชี้ออกนอกกราฟบอกว่า T ของเซลล์เดียวคือหนึ่งล้านชั่วโมง",
        nums: [
          { k: "เซลล์เดียว", v: "T = 1/λ = " + sci(TONE) + " ч" },
          { k: "ระบบ " + N + " ตัว (сл. 32)", v: F.tc + " = " + sci(TC) + " ч", big: true, note: "ผู้เรียบเรียงคำนวณ" },
          { k: "ที่ t = " + mt(mTC) + " ระบบยังทำงานอยู่ด้วยความน่าจะเป็น", v: mt(eNeg(mn("1"))) + " = " + nf(PCTC, 3), note: "ผู้เรียบเรียงคำนวณ" }
        ] },
      { title: "แกมมาเปอร์เซ็นต์ γ = " + GAMMA + " %",
        text: "γ-เปอร์เซ็นต์ของเวลาทำงานจนล้มเหลว (гамма-процентная наработка) " + mt(mTG) + " คือเวลาที่ P(t) ยังเหลือ γ % · แบบเอ็กซ์โพเนนเชียล " + mt(mTG) +
          " = −ln(0,01γ)/λ · ที่ γ = " + GAMMA + " % องค์ประกอบเดียวได้ " + grp(TG) + " ч ระบบอนุกรมได้ " + mt(mTGC) + " = " + mt(mTG) + "/n = " + grp(TGC) +
          " ч (сл. 33) · ค่า γ ที่เลือกและตัวเลขทั้งสองนี้ " + ED,
        alt: "เส้นนอนที่ความน่าจะเป็น 0,95 ตัดเส้นขององค์ประกอบเดียวที่ 51 293 ชั่วโมง และตัดเส้นของระบบที่ 2 565 ชั่วโมง ลูกศร หารด้วย 20",
        nums: [
          { k: "ระดับที่ตัด", v: "P = 0,01γ = " + nf(GAMMA / 100, 2) },
          { k: "องค์ประกอบเดียว", v: F.TG + " = " + "−ln " + nf(GAMMA / 100, 2) + " / " + sci(LAM) + " = " + grp(TG) + " ч" },
          { k: "ระบบ " + N + " ตัว (сл. 33)", v: F.TGC + " = " + grp(TG) + " / " + N + " = " + grp(TGC) + " ч", big: true }
        ] },
      { title: "สรุป: หารด้วย n หรือยกกำลัง n",
        text: "อัตราล้มเหลวและเวลาทำงาน เปลี่ยนตาม n แบบเส้นตรง: λ คูณ n ส่วน T และ " + mt(mTG) + " หารด้วย n · " +
          "ความน่าจะเป็น P และสัมประสิทธิ์ความพร้อม " + mt(mKG) + " (коэффициент готовности) ยกกำลัง n (сл. 34) จึงตกเร็วกว่ามาก · " +
          "ค่า " + mt(mkg) + " = " + nf(KG, 2) + " เป็นตัวอย่างที่ผู้เรียบเรียงเลือก " + ED,
        alt: "ตารางสรุปห้าแถว สามแถวแรกคูณหรือหารด้วย 20 สองแถวหลังยกกำลัง 20",
        nums: [
          { k: "อัตราล้มเหลว (คูณ n)", v: F.LC + " = nλ: " + sci(LAM) + " → " + sci(LAMC) + " 1/ч" },
          { k: "เวลา (หารด้วย n)", v: "T: " + sci(TONE) + " → " + sci(TC) + " ч · " + F.TG + ": " + grp(TG) + " → " + grp(TGC) + " ч" },
          { k: "ความน่าจะเป็น (ยกกำลัง n · t = " + grp(T0) + " ч)", v: F.PC + " = " + mt(sup(mPi, mi("n"))) + ": " + nf(PI0, 3) + " → " + nf(PC0, 3) },
          { k: "สัมประสิทธิ์ความพร้อม (ยกกำลัง n · сл. 34)", v: F.KG + " = " + mt(sup(mkg, mi("n"))) + ": " + nf(KG, 2) + " → " + nf(KGC, 3) }
        ] }
    ];

    return window.STEPS2(host, {
      label: "แอนิเมชันทีละขั้น",
      title: 'ССН อนุกรม: จากองค์ประกอบสู่ระบบ <span style="white-space:nowrap">(сл. 29–34, 39)</span>',
      aria: "แอนิเมชันทีละขั้น: ระบบอนุกรม 20 องค์ประกอบ ตัวอย่างที่ 3",
      legend: [
        { cls: "lg-ref", text: "องค์ประกอบเดียว" },
        { cls: "lg-new", text: "ระบบอนุกรม " + N + " ตัว" },
        { cls: "lg-meas dash", text: "จุดที่อ่านค่า", color: "var(--s2-deep)" }
      ],
      steps: STEPS,
      caption: "ข้อมูลตามตัวอย่างที่ 3 ของบรรยายที่ 5 (сл. 39) · ค่าที่ t = 10 000 ч และ γ = 95 % ผู้เรียบเรียงเลือกเพื่อให้เห็นภาพ",
      height: w => w < 520 ? 480 : Math.round(Math.max(400, Math.min(460, w * 0.5))),
      draw(ctx, W, H, step, C, anim) {
        const P = window.STEPS2.pen(ctx, W, H, C);
        const narrow = W < 520, full = W >= 700;
        const padX = narrow ? 12 : 22;
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

        /* ป้ายที่มีตัวห้อย/ตัวยก: P_{C} = P_{i}^{n} */
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
          [halo > 0 ? 0 : 1, 1].forEach(pass => {          // รอบแรก: ขอบพื้นหลังทุกส่วน · รอบสอง: ตัวอักษร (กันขอบของตัวยกทับตัวอักษรก่อนหน้า)
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
        function rrect(x, y, w, h, r) {
          ctx.beginPath();
          ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
          ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
          ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
          ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
        }

        /* ================= บน: สายโซ่ ================= */
        const cy = narrow ? 56 : 58, bh = narrow ? 34 : 30;
        const ly0 = cy + 56;                               // เริ่มส่วนล่าง
        const items = full ? Array.from({ length: N }, (_, i) => String(i + 1)) : ["1", "2", "3", "…", String(N)];
        const x0 = padX, x1 = W - padX;
        const in0 = x0 + 24, in1 = x1 - 24;
        const cell = (in1 - in0) / items.length;
        const bw = Math.min(narrow ? 46 : 36, cell - (full ? 8 : 14));
        const f0 = scene(0, 0);                            // ฉากล้มเหลว
        const dim = 1 - 0.68 * f0;
        ctx.save(); ctx.globalAlpha = dim;
        P.arrow(x0, cy, x1, cy, C.ink3, 2, 9);
        items.forEach((s, i) => {
          const cx = in0 + cell * (i + 0.5);
          if (s === "…") { P.label("…", cx, cy, C.ink2, { size: 18, weight: 700, align: "center", halo: 6 }); return; }
          if (i === FAIL) return;
          rrect(cx - bw / 2, cy - bh / 2, bw, bh, 5);
          ctx.fillStyle = C.wash; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = C.ref; ctx.stroke();
          P.label(s, cx, cy, C.ink, { size: full ? 12 : 13.5, mono: true, align: "center", halo: 0 });
        });
        ctx.restore();
        {   // กล่องที่ล้ม (วาดเต็มความทึบเมื่อเป็นฉากล้มเหลว)
          const cx = in0 + cell * (FAIL + 0.5);
          rrect(cx - bw / 2, cy - bh / 2, bw, bh, 5);
          ctx.save(); ctx.globalAlpha = dim;
          ctx.fillStyle = C.wash; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = C.ref; ctx.stroke();
          P.label(items[FAIL], cx, cy, C.ink, { size: full ? 12 : 13.5, mono: true, align: "center", halo: 0 });
          ctx.restore();
          if (f0 > 0.01) {
            ctx.save(); ctx.globalAlpha = f0;
            rrect(cx - bw / 2, cy - bh / 2, bw, bh, 5);
            ctx.fillStyle = C.bg; ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = C.crit; ctx.stroke();
            ctx.lineWidth = 3.4; ctx.lineCap = "round"; ctx.strokeStyle = C.crit; ctx.beginPath();
            ctx.moveTo(cx - bw / 2 + 5, cy - bh / 2 + 5); ctx.lineTo(cx + bw / 2 - 5, cy + bh / 2 - 5);
            ctx.moveTo(cx + bw / 2 - 5, cy - bh / 2 + 5); ctx.lineTo(cx - bw / 2 + 5, cy + bh / 2 - 5); ctx.stroke();
            P.label("ล้มเหลว (отказ)", cx, cy - bh / 2 - 14, C.crit, { size: 13, align: "center" });
            ctx.restore();
          }
        }
        P.label("เข้า", x0, cy - 24, C.ink3, { size: 11.5, weight: 500 });
        P.label("ออก", x1, cy - 24, C.ink3, { size: 11.5, weight: 500, align: "right" });

        /* ข้อความใต้สายโซ่ */
        const s1 = scene(1, 1), infoA = 1 - Math.max(f0, s1);
        const yLab = cy + bh / 2 + 22;
        if (infoA > 0.01) {
          ctx.save(); ctx.globalAlpha = infoA;
          rich("n = " + N + " ตัว · λ_{i} = λ = " + sci(LAM) + " 1/ч เท่ากันทุกตัว", W / 2, yLab, C.ink2, { size: 12.5, weight: 500, align: "center" });
          ctx.restore();
        }
        if (f0 > 0.01) {
          ctx.save(); ctx.globalAlpha = f0;
          P.label("ทั้งสายล้ม — ไม่มีสัญญาณถึงขาออก", W / 2, yLab, C.crit, { size: 13, align: "center" });
          ctx.restore();
        }
        if (s1 > 0.01) {
          ctx.save(); ctx.globalAlpha = s1;
          const yb = cy + bh / 2 + 7;
          P.seg([[in0, yb - 4], [in0, yb], [in1, yb], [in1, yb - 4]], C.new, 1.8);
          rich("λ_{C} = λ_{1} + λ_{2} + … + λ_{" + N + "} = n·λ", W / 2, yLab + 2, C.new, { size: 13, align: "center" });
          ctx.restore();
        }

        /* ================= ล่าง ================= */
        /* ขั้น 1: กฎ P_C = ΠP_i */
        const s0 = scene(0, 0);
        if (s0 > 0.01) {
          ctx.save(); ctx.globalAlpha = s0;
          const lyH = H - 8 - ly0, ym = ly0 + Math.max(24, (lyH - 150) / 2 + 14);
          rich("P_{C} = P_{1} · P_{2} · … · P_{" + N + "}", W / 2, ym, C.new, { size: narrow ? 18 : 22, weight: 700, align: "center" });
          P.label("ตัวเดียวล้ม → ทั้งสายล้ม", W / 2, ym + 56, C.crit, { size: 14, align: "center" });
          P.label("ทุกตัวทำงานพร้อมกัน → ระบบจึงทำงาน", W / 2, ym + 86, C.ok, { size: 14, align: "center" });
          P.label("ความล้มเหลวของแต่ละตัวเป็นอิสระต่อกัน", W / 2, ym + 124, C.ink3, { size: 12.5, weight: 500, align: "center" });
          ctx.restore();
        }

        /* ขั้น 2: แถบ λ */
        if (s1 > 0.01) {
          ctx.save(); ctx.globalAlpha = s1;
          const lyH = H - 8 - ly0, barW = W - 2 * padX, u = barW / N, y1 = ly0 + Math.max(20, (lyH - 190) / 2 + 12), y2 = y1 + 106, bhh = 24;
          rich("องค์ประกอบเดียว: λ = " + sci(LAM) + " 1/ч", padX, y1, C.ref, { size: 13.5 });
          ctx.fillStyle = C.ref; ctx.fillRect(padX, y1 + 14, u - 2, bhh);
          P.label("1 ช่อง = λ", padX + u + 6, y1 + 14 + bhh / 2, C.ink3, { size: 12, weight: 500 });
          const nSeg = Math.round(N * s1);
          const labA = clamp01((s1 - 0.6) / 0.4);
          ctx.save(); ctx.globalAlpha = s1 * labA;
          rich("ระบบ " + N + " ตัว: λ_{C} = " + N + " × λ = " + sci(LAMC) + " 1/ч", padX, y2, C.new, { size: 13.5 });
          ctx.restore();
          for (let i = 0; i < nSeg; i++) { ctx.fillStyle = C.new; ctx.fillRect(padX + i * u, y2 + 14, u - 2, bhh); }
          ctx.strokeStyle = C.line2; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
          ctx.strokeRect(padX + 0.5, y2 + 14.5, barW - 2, bhh - 1); ctx.setLineDash([]);
          ctx.save(); ctx.globalAlpha = s1 * labA;
          rich("λ_{C} ยาวเป็น " + N + " เท่าของ λ — บวกกันตรง ๆ", W / 2, y2 + 64, C.ink2, { size: 13, weight: 500, align: "center" });
          ctx.restore();
          ctx.restore();
        }

        /* ขั้น 3–5: กราฟ */
        const chartA = scene(2, 4);
        if (chartA > 0.01) {
          ctx.save(); ctx.globalAlpha = chartA;
          const pl = narrow ? 46 : 58, pr = narrow ? 14 : 26, pt = ly0 + 28, pb = H - (narrow ? 42 : 46);
          const X = t => pl + t / TMAX * (W - pl - pr), Y = p => pb - p * (pb - pt);
          ctx.lineWidth = 1; ctx.strokeStyle = C.grid; ctx.beginPath();
          [0.25, 0.5, 0.75, 1].forEach(p => { const y = Math.round(Y(p)) + 0.5; ctx.moveTo(pl, y); ctx.lineTo(W - pr, y); });
          const tk = narrow ? 4e4 : 2e4;
          for (let t = tk; t <= TMAX + 1; t += tk) { const x = Math.round(X(t)) + 0.5; ctx.moveTo(x, pt); ctx.lineTo(x, pb); }
          ctx.stroke();
          P.seg([[pl, pt - 4], [pl, pb], [W - pr, pb]], C.ink3, 1.5);
          [[0, "0"], [0.5, "0,5"], [1, "1"]].forEach(a => P.label(a[1], pl - 7, Y(a[0]), C.ink3, { size: 11.5, weight: 500, align: "right", mono: true, halo: 0 }));
          for (let t = 0; t <= TMAX + 1; t += tk) P.label(String(Math.round(t / 1e4)), X(t), pb + 13, C.ink3, { size: 11.5, weight: 500, align: "center", mono: true, halo: 0 });
          P.label("t, ×10⁴ ч", W - pr, pb + 30, C.ink3, { size: 11.5, weight: 500, align: "right", halo: 0 });
          P.label("P(t)", 6, pt - 12, C.ink2, { size: 12.5 });

          const ext = (step >= 2 && anim.from < 2 && anim.p < 1) ? anim.e : 1;
          const labA = (step >= 2 && anim.from < 2) ? clamp01((anim.p - 0.6) / 0.4) : 1;
          const curve = (lam, color) => {
            const pts = [];
            for (let i = 0; i <= 120; i++) { const t = TMAX * ext * i / 120; pts.push([X(t), Y(Math.exp(-lam * t))]); }
            P.seg(pts, color, 2.8);
          };
          curve(LAM, C.ref); curve(LAMC, C.new);
          ctx.save(); ctx.globalAlpha = chartA * labA;
          rich("องค์ประกอบเดียว", X(0.6 * TMAX), Y(Math.exp(-LAM * 0.6 * TMAX)) + 17, C.ref, { size: 12.5, align: "center" });
          rich("ระบบ " + N + " ตัว", X(6.5e4) + 6, Y(Math.exp(-LAMC * 6.5e4)) - 14, C.new, { size: 12.5 });
          ctx.restore();

          /* ขั้น 3: จุดที่ t = 10 000 ч */
          const a2 = scene(2, 2);
          if (a2 > 0.01) {
            ctx.save(); ctx.globalAlpha = chartA * a2 * labA;
            P.seg([[X(T0), pb], [X(T0), Y(PI0)]], C.deep, 1.6, [4, 4]);
            P.label("t = " + grp(T0) + " ч", X(T0), pb + 30, C.deep, { size: 11.5, align: "center", halo: 0 });
            P.dot(X(T0), Y(PI0), 5.5, C.ref); P.dot(X(T0), Y(PC0), 5.5, C.new);
            rich("P_{i} = " + nf(PI0, 3), X(T0) + 10, Y(PI0) - 14, C.ref, { size: 13, weight: 700 });
            rich("P_{C} = " + nf(PC0, 3), X(T0) + 10, Y(PC0) - 14, C.new, { size: 13, weight: 700 });
            rich("P_{C} = P_{i}^{" + N + "}", X(8e4), Y(0.56), C.ink, { size: 14, align: "center" });
            ctx.restore();
          }
          /* ขั้น 4: T_C */
          const a3 = scene(3, 3);
          if (a3 > 0.01) {
            ctx.save(); ctx.globalAlpha = chartA * a3;
            P.seg([[X(TC), pb], [X(TC), Y(PCTC)]], C.deep, 1.8, [5, 4]);
            P.dot(X(TC), Y(PCTC), 5.5, C.deep);
            rich("T_{C} = " + sci(TC) + " ч", X(TC) + 8, Y(0.11), C.deep, { size: 13, weight: 700 });
            rich("e⁻¹ = " + nf(PCTC, 3), X(TC) + 10, Y(PCTC) - 14, C.deep, { size: 12.5 });
            const ya = Y(0.64);
            P.arrow(X(0.66 * TMAX), ya, X(TMAX) - 2, ya, C.ref, 2.4, 10);
            rich("T = " + sci(TONE) + " ч (เซลล์เดียว)", X(TMAX) - 2, ya - 15, C.ref, { size: 12.5, weight: 700, align: "right" });
            ctx.restore();
          }
          /* ขั้น 5: t_γ */
          const a4 = scene(4, 4);
          if (a4 > 0.01) {
            ctx.save(); ctx.globalAlpha = chartA * a4;
            const yg = Y(GAMMA / 100), xg = X(TG), xc = X(TGC);
            P.seg([[pl, yg], [xg, yg]], C.deep, 1.6, [5, 4]);
            P.seg([[xg, yg], [xg, pb]], C.ink3, 1.4, [3, 4]);
            P.seg([[xc, yg], [xc, pb]], C.ink3, 1.4, [3, 4]);
            P.arrow(xg - 7, yg, xc + 7, yg, C.deep, 2.2, 9);
            P.dot(xg, yg, 5.5, C.ref); P.dot(xc, yg, 5.5, C.new);
            rich("÷ " + N, (xg + xc) / 2, yg + 15, C.deep, { size: 13.5, weight: 700, align: "center" });
            rich("t_{γc} = " + grp(TGC) + " ч", xc + 6, Y(0.07), C.new, { size: 12.5, weight: 700 });
            rich("t_{γ} = " + grp(TG) + " ч", xg + 6, Y(0.17), C.ref, { size: 12.5, weight: 700 });
            rich("P = " + nf(GAMMA / 100, 2) + "  (γ = " + GAMMA + " %)", X(TMAX), yg - 13, C.deep, { size: 12.5, align: "right" });
            ctx.restore();
          }
          ctx.restore();
        }

        /* ขั้น 6: ตารางสรุป */
        const sA = scene(5, 5);
        if (sA > 0.01) {
          const rows = [
            { g: 0, badge: "คูณ " + N, f: "λ_{C} = n · λ", v: sci(LAM) + " → " + sci(LAMC) + " 1/ч", col: C.ref },
            { g: 0, badge: "หาร " + N, f: "T_{C} = T / n", v: sci(TONE) + " → " + sci(TC) + " ч", col: C.ref },
            { g: 0, badge: "หาร " + N, f: "t_{γc} = t_{γ} / n", v: grp(TG) + " → " + grp(TGC) + " ч", col: C.ref },
            { g: 1, badge: "ยกกำลัง " + N, f: "P_{C} = P_{i}^{n}", v: nf(PI0, 3) + " → " + nf(PC0, 3), col: C.new },
            { g: 1, badge: "ยกกำลัง " + N, f: "K_{Г} = k_{Г}^{n}", v: nf(KG, 2) + " → " + nf(KGC, 3), col: C.new }
          ];
          const rh = narrow ? 44 : 38, gap = 5, rx = padX, rw = W - 2 * padX;
          let y = ly0 + 8, k = 0;
          [["เวลาและอัตราล้มเหลว: เปลี่ยนตาม n แบบเส้นตรง", C.ref], ["ความน่าจะเป็น: ยกกำลัง n", C.new]].forEach((hd, g) => {
            const ha = clamp01(sA * 4 - k * 0.5);
            ctx.save(); ctx.globalAlpha = ha;
            P.label(hd[0], rx, y + 10, hd[1], { size: 13, weight: 700 });
            ctx.restore();
            y += 24;
            rows.filter(r => r.g === g).forEach(r => {
              const a = clamp01((sA - k * 0.1) * 2.2);
              ctx.save(); ctx.globalAlpha = a;
              rrect(rx, y, rw, rh, 7); ctx.fillStyle = C.sunk; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = C.line; ctx.stroke();
              rrect(rx + 8, y + (rh - 28) / 2, 76, 28, 6); ctx.fillStyle = r.col; ctx.fill();
              P.label(r.badge, rx + 8 + 38, y + rh / 2, C.bg, { size: 13, weight: 700, align: "center", halo: 0 });
              rich(r.f, rx + 94, y + rh / 2, C.ink, { size: 14, weight: 700 });
              rich(r.v, rx + rw - 10, y + rh / 2, C.ink, { size: 13.5, weight: 600, align: "right" });
              ctx.restore();
              y += rh + gap; k++;
            });
            y += 10;
          });
          ctx.save(); ctx.globalAlpha = sA;
          P.label("ตัวเลขทางขวา = องค์ประกอบเดียว → ระบบ " + N + " ตัว", W / 2, Math.min(H - 12, y + 8), C.ink3, { size: 12, weight: 500, align: "center", halo: 0 });
          ctx.restore();
        }
      }
    });
  }
});
