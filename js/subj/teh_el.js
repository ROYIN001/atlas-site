/* js/subj/teh_el.js — แบบจำลองของวิชา teh_el (STD2) · สร้างโดย _work/std2/tools/assemble.py จาก _work/teh_elstd2/demos/ — ห้ามแก้ไฟล์นี้ตรง ๆ แก้ที่ต้นฉบับแล้วประกอบใหม่ · โหลดโดย subjAssets() เมื่อเปิดวิชา · ห้ามแตะ document ที่ระดับบนสุด */
/* --- te12-bode.js --- */
/* te12-bode — แอนิเมชัน 6 ขั้น: บวก ЛАЧХ ทีละภาคของ ОУ แล้วอ่านเฟสที่จุดตัด 0 дБ (УВ2 · Л11 сл. 12–14 · ฉบับเดิม te-12 หัวข้อ 5)
   ที่มา: Л11 сл. 12 (หนึ่งภาค = ตัวขยายอุดมคติ + R1 อนุกรม + C1 ปรสิตลงกราวด์ → ตัวกรองต่ำผ่านอันดับหนึ่ง, −20 дБ/дек, เฟสสูงสุด −90°),
     сл. 13 (K1 = 25 · K2 = 20 · K3 = 15 дБ → K0 = 60 дБ, ω1 < ω2 < ω3), сл. 14 (กราฟ ЛАЧХ/ФЧХ สองชั้น, จุด B C D, เส้นประ K_К(ω) ชันเดียวจาก ω0)
     ตารางฉบับเดิม: 1 ภาค −20 / −90° เสถียรเสมอ · 2 ภาค −40 / −180° ขอบเสถียรภาพ · 3 ภาค −60 / −270° แกว่งเองได้
   สูตรที่ใช้: K(ω) = ∏ Kᵢ/√(1 + (ω/ωᵢ)²) · φ(ω) = −Σ arctg(ω/ωᵢ) · เส้นหัก (асимптотическая ЛАЧХ) = Σ [Kᵢ − 20·lg(ω/ωᵢ)₊]
   ค่าอ้างอิง (python ตรวจแล้ว): ω1 = 10^3,5 ≈ 3,2·10³ · ω2 = 10⁴ · ω3 = 10^4,5 ≈ 3,2·10⁴ рад/с · เส้นกำกับตัดแกน 0 дБ ที่ 10⁵ พอดี (B 60 · C 50 · D 30 дБ)
     ωср จริง: 1 ภาค ≈ 5,6·10⁴ (ψ = −87°) · 2 ภาค ≈ 7,5·10⁴ (ψ ≈ −170°) · 3 ภาค ≈ 9,8·10⁴ (ψ ≈ −244°)
     หลังแก้ไข (เติมจุดหักต่ำ ω0 = 2 рад/с): ωср ≈ 1,7·10³ · ψ ≈ −131° · ระยะเผื่อเฟส ≈ 49°
   ส่วนที่เป็นของผู้เรียบเรียง (บอกบนจอ): ค่า ω1 ω2 ω3 ω0 (สไลด์ไม่ระบุตัวเลข) · แบบจำลองจุดหักต่ำของลักษณะที่แก้ไข · การโยงกับเกณฑ์ไนควิสต์ของ ТАУ */
(function () {
  "use strict";
  const KD = [25, 20, 15];                         // дБ ของแต่ละภาค (สไลด์ 13)
  const LG = [3.5, 4, 4.5];                        // lg ω ของจุดหัก (ค่าตัวอย่างผู้เรียบเรียง)
  const WS = LG.map(l => Math.pow(10, l));
  const W0 = 2, L0 = Math.log10(2);                // ω0 ของลักษณะที่แก้ไข (ค่าตัวอย่าง)
  const DEG = 180 / Math.PI;
  const DBMAX = 76, DBMIN = -20, PHMAX = 300;
  const SUP = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
  const sup = n => String(n).split("").map(ch => SUP[ch] || ch).join("");
  const p10 = l => Math.pow(10, l);
  const ED = t => '<span class="ed">' + t + "</span>";

  /* ผลรวมถ่วงน้ำหนัก w[i] (0…1) ต่อภาค — ใช้ทำแอนิเมชัน «เติมภาค» ให้เส้นเลื่อนต่อเนื่อง */
  function Kw(l, w) {                              // ลักษณะจริง (дБ)
    const f = p10(l); let s = 0;
    for (let i = 0; i < 3; i++) s += w[i] * (KD[i] - 10 * Math.log10(1 + Math.pow(f / WS[i], 2)));
    return s;
  }
  function Pw(l, w) {                              // เฟสจริง (°)
    const f = p10(l); let s = 0;
    for (let i = 0; i < 3; i++) s -= w[i] * Math.atan(f / WS[i]) * DEG;
    return s;
  }
  function Aw(l, w) {                              // เส้นกำกับ (дБ)
    let s = 0;
    for (let i = 0; i < 3; i++) s += w[i] * (KD[i] - 20 * Math.max(0, l - LG[i]));
    return s;
  }
  const ALL = [1, 1, 1];
  const KC = l => Kw(l, ALL) - 10 * Math.log10(1 + Math.pow(p10(l) / W0, 2));   // เติมจุดหักต่ำ ω0
  const PC = l => Pw(l, ALL) - Math.atan(p10(l) / W0) * DEG;
  const AC = l => Aw(l, ALL) - 20 * Math.max(0, l - L0);
  function root(f) { let lo = 0, hi = 8; for (let i = 0; i < 48; i++) { const m = (lo + hi) / 2; if (f(m) > 0) lo = m; else hi = m; } return (lo + hi) / 2; }

  function fw(l) {                                 // 10^l → «3,2·10³»
    let e = Math.floor(l + 1e-9), m = Math.pow(10, l - e), s = m.toFixed(1);
    if (s === "10.0") { s = "1.0"; e++; }
    return (s === "1.0" ? "" : s.replace(".", ",") + "·") + "10" + sup(e);
  }

  const MM_K = '<math><mi>K</mi><mo stretchy="false">(</mo><mi>ω</mi><mo stretchy="false">)</mo><mo>=</mo><munder><mo>∏</mo><mi>i</mi></munder><mfrac><msub><mi>K</mi><mi>i</mi></msub>' +
    '<msqrt><mn>1</mn><mo>+</mo><msup><mrow><mo>(</mo><mfrac><mi>ω</mi><msub><mi>ω</mi><mi>i</mi></msub></mfrac><mo>)</mo></mrow><mn>2</mn></msup></msqrt></mfrac></math>';
  const MM_P = '<math><mi>φ</mi><mo stretchy="false">(</mo><mi>ω</mi><mo stretchy="false">)</mo><mo>=</mo><mo>−</mo><munder><mo>∑</mo><mi>i</mi></munder><mi mathvariant="normal">arctg</mi>' +
    '<mfrac><mi>ω</mi><msub><mi>ω</mi><mi>i</mi></msub></mfrac></math>';

  function geo(W, H) {
    const narrow = W < 480;
    const x0 = narrow ? 40 : 50, rm = 12, t0 = 14, bm = 38, gap = 26;
    const usable = H - t0 - bm - gap;
    const hA = Math.round(usable * 0.58);
    return { narrow, x0, pw: W - x0 - rm, t0, hA, tB: t0 + hA + gap, hB: usable - hA };
  }

  Object.assign(DEMOS, { "te12-bode": function (host) {
    const nf = (v, d) => window.STEPS2.nf(v, d);
    const wn = n => [1, n >= 2 ? 1 : 0, n >= 3 ? 1 : 0];
    const cr = [1, 2, 3].map(n => { const l = root(l2 => Kw(l2, wn(n))); return { l: l, ph: Pw(l, wn(n)) }; });
    const lcC = root(KC), phC = PC(lcC);
    const wc = k => fw(cr[k].l) + " рад/с";
    const psi = v => "ψ = " + nf(v, 0) + "°";
    const lin = db => Math.pow(10, db / 20);

    const steps = [
      { title: "ภาคเดียว = ตัวกรองต่ำผ่านอันดับหนึ่ง",
        text: "หลังตัวขยายอุดมคติมีตัวต้านทาน R<sub>1</sub> อนุกรมและตัวเก็บประจุปรสิต C<sub>1</sub> ลงกราวด์ (สไลด์ 12) จึงเป็นตัวกรองความถี่ต่ำผ่านหนึ่งอันดับ · ลักษณะเฉพาะแอมพลิจูด–ความถี่แบบลอการิทึม (ЛАЧХ) ราบที่ K<sub>1</sub> แล้วลาดลง −20 дБ/дек หลังจุดหัก ω<sub>1</sub> และเฟสเลื่อนได้สูงสุด −90°",
        alt: "กราฟสองชั้น ชั้นบนเป็นอัตราขยายเป็น дБ ชั้นล่างเป็นเฟส เส้นหนาราบที่ 25 дБ แล้วลาดลงหลังจุดหัก ω₁ เฟสลดจาก 0 ไปเข้าใกล้ −90 องศา",
        nums: [
          { k: "ฟังก์ชันที่ใช้คำนวณทุกตัวเลขบนจอ", v: [MM_K, MM_P] },
          { k: "จุดหัก ω<sub>1</sub> <span class=\"src-note\">(ค่าตัวอย่าง)</span>" + ED("ผู้เรียบเรียง"), v: fw(LG[0]) + " рад/с" },
          { k: "ชานราบ K<sub>1</sub>", v: nf(KD[0], 0) + " дБ", note: "= " + nf(lin(KD[0]), 1) + " เท่า" },
          { k: "ที่ ω<sub>1</sub> ค่าจริงของ K(ω)", v: nf(Kw(LG[0], wn(1)), 1) + " дБ", note: "เส้นหักบอก " + nf(KD[0], 0) + " дБ · ต่างกัน " + nf(KD[0] - Kw(LG[0], wn(1)), 1) + " дБ" },
          { k: "ตัดแกน 0 дБ ที่ ω<sub>ср</sub> (частота среза)", v: wc(0) + " · " + psi(cr[0].ph), big: true, note: "เฟสไม่เกิน −90° → เสถียรเสมอ" }
        ] },
      { title: "บวกภาค 2: ЛАЧХ บวกกันใน дБ",
        text: "ภาค 2 (K<sub>2</sub> = 20 дБ ที่ ω<sub>2</sub>) ต่ออนุกรมกับภาค 1 · ЛАЧХ ของแต่ละภาคบวกกันในหน่วย дБ ซึ่งตรงกับการคูณอัตราขยายจริง · หลัง ω<sub>2</sub> ความชันเป็น −40 дБ/дек และเฟสเข้าใกล้ −180°",
        alt: "เส้นของภาคที่สองปรากฏ เส้นรวมหนาราบที่ 45 дБ หักที่ ω₁ และหักอีกครั้งที่ ω₂ ความชันหลังสุดเป็น −40 เฟสรวมเข้าใกล้ −180 องศา จุดตัด 0 дБ เลื่อนไปทางขวา",
        nums: [
          { k: "อัตราขยายรวม K<sub>1</sub> + K<sub>2</sub>", v: nf(KD[0], 0) + " + " + nf(KD[1], 0) + " = " + nf(KD[0] + KD[1], 0) + " дБ", big: true,
            note: "= " + nf(lin(KD[0]), 1) + " × " + nf(lin(KD[1]), 0) + " = " + nf(lin(KD[0] + KD[1]), 1) + " เท่า" },
          { k: "จุดหัก B · C (เส้นกำกับ)", v: nf(Aw(LG[0], wn(2)), 0) + " дБ ที่ ω<sub>1</sub> · " + nf(Aw(LG[1], wn(2)), 0) + " дБ ที่ ω<sub>2</sub>" },
          { k: "ความชันหลัง ω<sub>2</sub>", v: "−40 дБ/дек" },
          { k: "ตัดแกน 0 дБ ที่ ω<sub>ср</sub>", v: wc(1) + " · " + psi(cr[1].ph), big: true,
            note: "ยังไม่ถึง −180° แต่เหลือเผื่อเพียง " + nf(180 + cr[1].ph, 0) + "° → ขอบเสถียรภาพ" }
        ] },
      { title: "ภาค 3: K₀ = 60 дБ และเส้นหักสี่ช่วง",
        text: "ภาค 3 (K<sub>3</sub> = 15 дБ ที่ ω<sub>3</sub>) · K<sub>0</sub> = K<sub>1</sub> + K<sub>2</sub> + K<sub>3</sub> เส้นรวมเป็นเส้นหักสี่ช่วง ชานราบ → จุด B (ชันเป็น −20 дБ/дек) → จุด C (−40) → จุด D (−60) · เฟสรวม ψ เป็นผลบวกของ ψ<sub>1</sub> ψ<sub>2</sub> ψ<sub>3</sub> ซึ่งแต่ละเส้นถึง −90° จึงเข้าใกล้ −270°",
        alt: "เส้นของภาคที่สามปรากฏ เส้นรวมหนาราบที่ 60 дБ หักสามจุด B C D ความชันหลังสุด −60 дБ ต่อเดคาด เส้นเฟสรวมลงไปใกล้ −270 องศา",
        nums: [
          { k: "อัตราขยายรวม K<sub>0</sub>", v: nf(KD[0], 0) + " + " + nf(KD[1], 0) + " + " + nf(KD[2], 0) + " = " + nf(KD[0] + KD[1] + KD[2], 0) + " дБ", big: true,
            note: "= " + nf(lin(60), 0) + " เท่า" },
          { k: "จุดหัก B · C · D (เส้นกำกับ)", v: [0, 1, 2].map(i => nf(Aw(LG[i], wn(3)), 0)).join(" · ") + " дБ ที่ ω<sub>1</sub> · ω<sub>2</sub> · ω<sub>3</sub>" },
          { k: "ความชันแต่ละช่วงหลังจุดหัก", v: "−20 · −40 · −60 дБ/дек" },
          { k: "เฟสรวมที่สูงสุด (ตารางในหัวข้อ)", v: "−270°" }
        ] },
      { title: "ที่ K = 0 дБ เฟสเลย −180° หรือไม่",
        text: "อ่านเฟสรวมที่ความถี่ซึ่ง ЛАЧХ ตัดแกน 0 дБ (เท่ากับปิดวงป้อนกลับเต็ม β = 1 " + ED("ผู้เรียบเรียงกำหนด") + " วงรอบ β·K จึงเท่ากับ K ของ ОУ — กรณีเข้มงวดที่สุด) · ถ้าเฟสถึง −180° การป้อนกลับลบกลายเป็นการป้อนกลับบวก และวงจรแกว่งเอง (самовозбуждение) · เทียบจำนวนภาค: 1 ภาค เสถียรเสมอ · 2 ภาค ขอบเสถียรภาพ · 3 ภาค แกว่งเองได้",
        alt: "ที่จุดตัด 0 дБ ของเส้นรวมสามภาค มีเส้นประลงไปอ่านเฟส ได้ประมาณ −244 องศา ซึ่งอยู่ในเขตแรเงาต่ำกว่า −180 องศา",
        nums: [
          { k: "ความถี่ตัด ω<sub>ср</sub> ของ 3 ภาค (ฟังก์ชันจริง)", v: wc(2) },
          { k: "เฟสรวมที่ความถี่นั้น", v: psi(cr[2].ph), big: true, note: "เลย −180° ไป " + nf(-180 - cr[2].ph, 0) + "° → แกว่งเองได้" },
          { k: "1 ภาค", v: wc(0) + " · " + psi(cr[0].ph), note: "เสถียรเสมอ" },
          { k: "2 ภาค", v: wc(1) + " · " + psi(cr[1].ph), note: "ขอบเสถียรภาพ" },
          { k: "3 ภาค", v: wc(2) + " · " + psi(cr[2].ph), note: "แกว่งเองได้" }
        ] },
      { title: "ลักษณะที่แก้ไขแล้ว K<sub>К</sub>(ω): ชันเดียว −20 дБ/дек",
        text: "ลักษณะเฉพาะที่แก้ไขความถี่แล้ว (เส้นประ) ลาดลงชันเดียว −20 дБ/дек ตั้งแต่ ω<sub>0</sub> จนตัดแกน 0 дБ จึงมีระยะเผื่อเฟสเพียงพอ · แบบจำลองบนจอ: เติมจุดหักต่ำที่ ω<sub>0</sub> ให้ ОУ เดิม " + ED("ผู้เรียบเรียงจำลอง") + " ω<sub>0</sub> บนจอต่ำกว่าตำแหน่งที่รูปสไลด์ 14 วาดไว้ เพราะแบบจำลองนี้ไม่ย้ายจุดหักเดิม · วิธีแก้ไขจริงไม่ได้อธิบายในบรรยาย (ดู Балуев หน้า 251–265)",
        alt: "เส้นประของลักษณะที่แก้ไขแล้ว เริ่มลาดลงตั้งแต่ ω₀ ที่ความถี่ต่ำ ตัดแกน 0 дБ ที่ประมาณ 1,7 คูณ 10 ยกกำลัง 3 เฟสที่จุดนั้นประมาณ −131 องศา ห่างจากเส้น −180 องศา",
        nums: [
          { k: "ω<sub>0</sub> <span class=\"src-note\">(ค่าตัวอย่าง)</span>" + ED("ผู้เรียบเรียง"), v: nf(W0, 0) + " рад/с" },
          { k: "ความถี่ตัด ω<sub>ср</sub> หลังแก้ไข", v: fw(lcC) + " рад/с", note: "ต่ำกว่าก่อนแก้ไข " + nf(Math.pow(10, cr[2].l - lcC), 0) + " เท่า" },
          { k: "เฟสรวมที่จุดตัด", v: psi(phC), big: true, note: "ห่าง −180° อยู่ " + nf(180 + phC, 0) + "° (ระยะเผื่อเฟส)" }
        ] },
      { title: "สรุป: อ่านเฟสที่จุดตัด 0 дБ — กรณีป้อนกลับเต็ม β = 1",
        text: "เส้นหักบนกราฟคือเส้นกำกับ (асимптотическая ЛАЧХ) ส่วนความถี่ตัดและเฟสบนจอคำนวณจากฟังก์ชันจริง · เงื่อนไข: ที่ K = 0 дБ เฟสต้องยังไม่ถึง −180° · แนวคิดระยะเผื่อเสถียรภาพนี้ตรงกับเกณฑ์ของ Найквист ที่เรียนในวิชา ТАУ ซึ่งใช้กับวงรอบ β·K — ที่นี่ β = 1 ถ้า β < 1 จุดตัดเลื่อนไปที่ K = 1/β ซึ่งเฟสสะสมยังน้อยกว่า จึงเสถียรง่ายกว่า " + ED("ผู้เรียบเรียงโยงให้"),
        alt: "เทียบสองกรณีบนกราฟเดียวกัน ก่อนแก้ไขเฟสที่จุดตัดอยู่ใต้เส้น −180 องศา หลังแก้ไขอยู่เหนือเส้น −180 องศา",
        nums: [
          { k: "ก่อนแก้ไข (3 ภาค)", v: psi(cr[2].ph) + " ✗", big: true, note: "เลย −180° ไป " + nf(-180 - cr[2].ph, 0) + "° → แกว่งเอง" },
          { k: "หลังแก้ไข (ชันเดียว −20 дБ/дек)", v: psi(phC) + " ✓", big: true, note: "เผื่ออยู่ " + nf(180 + phC, 0) + "°" }
        ] }
    ];

    return window.STEPS2(host, {
      label: "แอนิเมชันทีละขั้น",
      title: 'ลักษณะแอมพลิจูด (ЛАЧХ) และเฟส (ФЧХ) ของ ОУ: บวกทีละภาค แล้วอ่านเฟสที่จุดตัด 0 дБ <span style="white-space:nowrap">(сл. 12–14)</span>',
      aria: "แอนิเมชันบวกลักษณะเฉพาะแอมพลิจูดความถี่แบบลอการิทึมของตัวขยายเชิงการคำนวณทีละภาค แล้วดูเฟสที่จุดตัดศูนย์เดซิเบล",
      legend: [
        { cls: "lg-ref", text: "ภาค 1" },
        { cls: "lg-meas", text: "ภาค 2" },
        { cls: "lg-lin", text: "ภาค 3" },
        { color: "var(--ink)", text: "รวม (เส้นกำกับ)" },
        { cls: "dash", color: "var(--ink-3)", text: "รวม (ค่าจริง)" },
        { cls: "lg-new dash", text: "หลังแก้ไข" }
      ],
      steps: steps,
      caption: "ที่มา: Л11 сл. 12–14 · K₁ = 25 · K₂ = 20 · K₃ = 15 дБ จากสไลด์ 13 · ค่าตัวอย่างผู้เรียบเรียง: ω₁ = 3,2·10³ · ω₂ = 10⁴ · ω₃ = 3,2·10⁴ рад/с (สไลด์ไม่ระบุตัวเลข) และ ω₀ = 2 рад/с ของลักษณะที่แก้ไข · เส้นหักเป็นเส้นกำกับ (асимптотическая ЛАЧХ) ส่วนความถี่ตัดและเฟสบนจอคำนวณจากฟังก์ชันจริง",
      height: w => Math.round(Math.min(460, Math.max(320, w * 0.66))),
      draw(ctx, W, H, step, C, anim) {
        const P = window.STEPS2.pen(ctx, W, H, C);
        const g = geo(W, H), nr = g.narrow;
        const X = l => g.x0 + l / 6 * g.pw;
        const YA = db => g.t0 + (DBMAX - db) / (DBMAX - DBMIN) * g.hA;
        const YB = ph => g.tB + (-ph) / PHMAX * g.hB;
        const w = [1, anim.fade(1), anim.fade(2)];
        const cc = anim.fade(4), dz = anim.fade(3), vd = anim.fade(5);
        const dim = 1 - 0.6 * cc;
        const col = [C.ref, C.meas, C.lin];
        const sz = nr ? 10.5 : 11.5;
        const lab = (t, x, y, c, o) => P.label(t, x, y, c, Object.assign({ size: sz, weight: 600 }, o));
        const span = (a, b) => {
          const now = step >= a && step <= b, was = anim.from >= a && anim.from <= b;
          if (now === was) return now ? 1 : 0;
          return now ? Math.max(0, Math.min(1, (anim.p - 0.25) / 0.55)) : 1 - Math.max(0, Math.min(1, anim.p / 0.35));
        };
        /* ป้ายที่มีตัวห้อย: parts = [[ข้อความ, 0|1(ห้อย)], …] วาดต่อกันพร้อมขอบพื้นหลัง */
        const slab = (parts, x, y, color, al) => {
          let tw = 0;
          parts.forEach(q => { P.font(q[1] ? sz * 0.74 : sz, 700); tw += ctx.measureText(q[0]).width; });
          let cx = al === "right" ? x - tw : al === "center" ? x - tw / 2 : x;
          cx = Math.max(4, Math.min(W - 4 - tw, cx));
          ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
          [true, false].forEach(halo => {
            let px = cx;
            parts.forEach(q => {
              P.font(q[1] ? sz * 0.74 : sz, 700);
              const yy = y + (q[1] ? 3 : 0);
              if (halo) { ctx.lineWidth = 4; ctx.strokeStyle = C.bg; ctx.strokeText(q[0], px, yy); }
              else { ctx.fillStyle = color; ctx.fillText(q[0], px, yy); }
              px += ctx.measureText(q[0]).width;
            });
          });
        };
        const alpha = a => { ctx.globalAlpha = Math.max(0, Math.min(1, a)); };
        const curve = (f, color, wd, dash, a) => {
          const pts = [];
          for (let l = 0; l <= 6.0001; l += 0.05) pts.push([X(l), f(l)]);
          P.seg(pts, color, wd, dash, a);
        };

        /* ---------- กริด ป้ายแกน ---------- */
        ctx.lineWidth = 1; ctx.setLineDash([]);
        for (let l = 0; l <= 6; l++) {
          const x = X(l);
          P.seg([[x, g.t0], [x, g.t0 + g.hA]], C.grid, 1);
          P.seg([[x, g.tB], [x, g.tB + g.hB]], C.grid, 1);
          lab("10" + sup(l), x, g.tB + g.hB + 13, C.ink3, { align: "center", weight: 500, halo: 0 });
        }
        lab("ω, рад/с", W - 6, g.tB + g.hB + 28, C.ink3, { align: "right", weight: 500, halo: 0 });
        [60, 40, 20, 0, -20].forEach(db => {
          P.seg([[g.x0, YA(db)], [g.x0 + g.pw, YA(db)]], db === 0 ? C.line2 : C.grid, db === 0 ? 1.6 : 1);
          lab(nf(db, 0), g.x0 - 5, YA(db), db === 0 ? C.ink : C.ink3, { align: "right", weight: db === 0 ? 700 : 500, halo: 0 });
        });
        lab("K, дБ", g.x0 - 5, g.t0 - 4, C.ink3, { align: "right", weight: 500, halo: 0 });
        [0, -90, -180, -270].forEach(ph => {
          if (ph !== -180) P.seg([[g.x0, YB(ph)], [g.x0 + g.pw, YB(ph)]], C.grid, 1);
          lab(nf(ph, 0) + "°", g.x0 - 5, YB(ph), ph === -180 ? C.crit : C.ink3, { align: "right", weight: ph === -180 ? 700 : 500, halo: 0 });
        });
        lab("ψ, °", g.x0 - 5, g.tB - 15, C.ink3, { align: "right", weight: 500, halo: 0 });
        // เขตเฟสเลย −180°
        ctx.save(); ctx.globalAlpha = 0.1 * dz; ctx.fillStyle = C.crit;
        ctx.fillRect(g.x0, YB(-180), g.pw, g.tB + g.hB - YB(-180)); ctx.restore();
        P.seg([[g.x0, YB(-180)], [g.x0 + g.pw, YB(-180)]], C.crit, 1.6, [6, 4], 0.45 + 0.55 * dz);
        ctx.lineWidth = 1; ctx.strokeStyle = C.line;
        ctx.strokeRect(g.x0 + 0.5, g.t0 + 0.5, g.pw, g.hA); ctx.strokeRect(g.x0 + 0.5, g.tB + 0.5, g.pw, g.hB);

        /* ---------- เส้นจุดหัก ω₁ ω₂ ω₃ ω₀ ---------- */
        for (let i = 0; i < 3; i++) {
          const x = X(LG[i]), a = w[i] * dim;
          if (a > 0.01) {
            P.seg([[x, g.t0], [x, g.t0 + g.hA]], col[i], 1.1, [4, 4], 0.6 * a);
            P.seg([[x, g.tB], [x, g.tB + g.hB]], col[i], 1.1, [4, 4], 0.6 * a);
            alpha(a); lab("ω" + "₁₂₃"[i], x, g.t0 + 9, col[i], { align: "center", weight: 700 }); alpha(1);
          }
        }
        if (cc > 0.01) {
          const x = X(L0);
          P.seg([[x, g.t0], [x, g.t0 + g.hA]], C.new, 1.1, [4, 4], 0.7 * cc);
          alpha(cc); lab("ω₀", x, YA(-11), C.new, { align: "center", weight: 700 }); alpha(1);
        }

        /* ---------- ชั้นบน: ЛАЧХ ---------- */
        ctx.save(); ctx.beginPath(); ctx.rect(g.x0, g.t0, g.pw, g.hA); ctx.clip();
        P.seg([0, ...LG, 6].map(l => [X(l), YA(Aw(l, w))]), C.ink, 3.2);
        for (let i = 0; i < 3; i++) {
          if (w[i] > 0.01) P.seg([[X(0), YA(KD[i])], [X(LG[i]), YA(KD[i])], [X(6), YA(KD[i] - 20 * (6 - LG[i]))]], col[i], 1.6, [], w[i] * dim);
        }
        curve(l => YA(Kw(l, w)), C.ink3, 1.4, [2, 3], 0.9);
        if (cc > 0.01) P.seg([0, L0, ...LG, 6].map(l => [X(l), YA(AC(l))]), C.new, 2.4, [8, 5], cc);
        ctx.restore();

        /* ---------- ชั้นล่าง: ФЧХ ---------- */
        ctx.save(); ctx.beginPath(); ctx.rect(g.x0, g.tB, g.pw, g.hB); ctx.clip();
        for (let i = 0; i < 3; i++) {
          if (w[i] > 0.01) curve(l => YB(-w[i] * Math.atan(p10(l) / WS[i]) * DEG), col[i], 1.4, [], 0.9 * w[i] * dim);
        }
        curve(l => YB(Pw(l, w)), C.ink, 3.2, [], 1);
        if (cc > 0.01) curve(l => YB(PC(l)), C.new, 2.4, [8, 5], cc);
        ctx.restore();

        /* ---------- ป้ายระดับ จุด B C D ความชัน ---------- */
        const si = Math.min(2, anim.p < 0.5 ? anim.from : step);
        const kt = KD.reduce((s, k, i) => s + w[i] * k, 0);
        lab((si === 0 ? "K₁" : si === 1 ? "K₁ + K₂" : "K₀") + " = " + nf(Math.round(kt), 0) + " дБ", g.x0 + 8, YA(Aw(0, w)) - 11, C.ink, { align: "left", weight: 700 });
        for (let i = 0; i < 3; i++) {
          if (w[i] < 0.05) continue;
          alpha(w[i]);
          const x = X(LG[i]), y = YA(Aw(LG[i], w));
          P.dot(x, y, 3.8, C.ink);
          lab("BCD"[i], x - 7, y + 12, C.ink, { align: "right", weight: 700 });
          const lm = i < 2 ? (LG[i] + LG[i + 1]) / 2 : LG[2] + 0.2;
          lab("−" + 20 * (i + 1) + (nr ? "" : " дБ/дек"), X(lm) + 5, YA(Aw(lm, w)) - 10, C.ink2, { align: "left", weight: 600 });
          alpha(1);
        }
        if (cc > 0.01) {
          alpha(cc); slab(nr ? [["K", 0], ["К", 1]] : [["K", 0], ["К", 1], ["(ω)", 0]], X(1.9) + 6, YA(AC(1.9)) - 11, C.new, "left"); alpha(1);
        }

        /* ---------- จุดตัด 0 дБ และเฟสที่จุดนั้น ---------- */
        const lc = root(l => Kw(l, w)), pc = Pw(lc, w), xc = X(lc);
        P.seg([[xc, YA(0)], [xc, YB(pc)]], C.ink2, 1.2, [2, 3], 0.85);
        P.dot(xc, YA(0), 4.6, C.ink); P.dot(xc, YB(pc), 4.6, C.ink);
        slab(nr ? [[fw(lc), 0]] : [["ω", 0], ["ср", 1], [" = " + fw(lc) + " рад/с", 0]], xc - 7, YA(0) + 13, C.ink, "right");
        lab(psi(pc), xc - 8, YB(pc) + 12, C.ink, { align: "right", weight: 700 });
        if (dz > 0.01 && pc < -180) {
          alpha(dz);
          const bx = xc + 8, y1 = YB(-180), y2 = YB(pc);
          P.arrow(bx, (y1 + y2) / 2, bx, y1, C.crit, 1.6, 6); P.arrow(bx, (y1 + y2) / 2, bx, y2, C.crit, 1.6, 6);
          lab("เลย " + nf(-180 - pc, 0) + "°", bx + 6, (y1 + y2) / 2, C.crit, { align: "left", weight: 700 });
          alpha(1);
        }
        if (cc > 0.01) {
          alpha(cc);
          const xk = X(lcC);
          P.seg([[xk, YA(0)], [xk, YB(phC)]], C.new, 1.2, [2, 3]);
          P.dot(xk, YA(0), 4.6, C.new); P.dot(xk, YB(phC), 4.6, C.new);
          slab(nr ? [[fw(lcC), 0]] : [["ω", 0], ["ср", 1], [" = " + fw(lcC) + " рад/с", 0]], xk - 7, YA(0) + 13, C.new, "right");
          lab(psi(phC), xk + 8, YB(phC) + 12, C.new, { align: "left", weight: 700 });
          const bx = xk - 8, y1 = YB(-180), y2 = YB(phC);
          P.arrow(bx, (y1 + y2) / 2, bx, y1, C.ok, 1.6, 6); P.arrow(bx, (y1 + y2) / 2, bx, y2, C.ok, 1.6, 6);
          lab("เผื่อ " + nf(180 + phC, 0) + "°", bx - 6, (y1 + y2) / 2, C.ok, { align: "right", weight: 700 });
          alpha(1);
        }
        // เขตอันตราย + ผลตัดสิน (ช่องว่างซ้ายล่างของชั้นเฟส)
        const sd = span(3, 4);
        if (sd > 0.01) { alpha(sd); lab(nr ? "เลย −180° = แกว่งเอง" : "เลย −180° → แกว่งเอง (самовозбуждение)", g.x0 + 8, YB(-225), C.crit, { align: "left", weight: 700 }); alpha(1); }
        if (vd > 0.01) {
          alpha(vd);
          lab("ก่อนแก้ " + psi(cr[2].ph) + " ✗", g.x0 + 8, YB(-225), C.crit, { align: "left", weight: 700 });
          lab("หลังแก้ " + psi(phC) + " ✓", g.x0 + 8, YB(-140), C.ok, { align: "left", weight: 700 });
          alpha(1);
        }
      }
    });
  } });
})();
/* --- te12-chain.js --- */
/* te12-chain — แอนิเมชัน 5 ขั้น: ผังย่อโซ่ภายใน ОУ ทีละภาค และพารามิเตอร์ที่เกิดจากแต่ละภาค (УВ1 · Л11 сл. 8–9, 13, 16 · ฉบับเดิม te-12 หัวข้อ 2, 3, 6)
   ที่มา: Л11 сл. 8 (u_вх → ДУ → УН → ЭП → u_вых · คุณลักษณะสี่ข้อ คำต่อคำ), сл. 9 (พารามิเตอร์ 7 + 5 + 4), сл. 13 (Входной каскад → Усилитель амплитуды →
     Выходной каскад · K1 = 25 · K2 = 20 · K3 = 15 дБ · K0 = 60 дБ), сл. 16 + รูป te-f37 (ห้ากลุ่ม ДУ СК УА ЭП УЗТ · I_ЗАД · C_К ที่ VT7 · VD1 VD2 ไบแอส)
     ตารางฉบับเดิมข้อ 6: Входной = ДУ · Промежуточный = СК + УА · Выходной = ЭП
   สูตรที่ใช้: K₀ = K₁ + K₂ + K₃ (дБ) · 20·lg(25·10³) = 88,0 дБ · 20·lg(1000·10³) = 120 дБ (ช่วง K_УД ของตารางพารามิเตอร์ทั่วไป)
   ส่วนที่เป็นของผู้เรียบเรียง (บอกบนจอ): ผังย่อห้ากล่อง (ย่อจากวงจรจริงในรูป te-f37) · การจัดพารามิเตอร์เข้ากับภาคที่กำหนดค่านั้นเป็นหลัก ·
     การแปลง K_УД เป็น дБ · การจับคู่ภาคเข้า/กลาง/ออกของสไลด์ 13 กับกลุ่มของสไลด์ 16 */
(function () {
  "use strict";
  const ED = t => '<span class="ed">' + t + "</span>";
  const KD = [25, 20, 15];
  const BOX = [
    { n: "ДУ", sub: "дифференциальный усилитель", g: 0 },
    { n: "СК", sub: "согласующий каскад", g: 1 },
    { n: "УА", sub: "усилитель амплитуды", g: 1 },
    { n: "ЭП", sub: "эмиттерный повторитель", g: 2 }
  ];
  const GRP = [{ th: "ภาคเข้า", ru: "Входной каскад" }, { th: "ภาคกลาง", ru: "Усилитель амплитуды" }, { th: "ภาคออก", ru: "Выходной каскад" }];
  /* ชิปพารามิเตอร์: [ฐาน, ตัวห้อย, คำอธิบายสั้น] · ขั้นที่ปรากฏ */
  const CHIPS = [
    { at: 1, list: [["U", "СМ", "แรงดันออฟเซต"], ["ΔU", "СМ", "การลอยของ UСМ"], ["I", "ВХ", "กระแสอินพุต"], ["ΔI", "ВХ", "ผลต่างกระแสอินพุต"],
      ["K", "ПСС", "กดสัญญาณโหมดร่วม"], ["R", "ВХД", "อินพุตผลต่าง"], ["R", "ВХС", "อินพุตโหมดร่วม"]] },
    { at: 2, list: [["ระดับ DC", "", "เลื่อนระดับไฟตรง"]] },
    { at: 2, list: [["K", "УД", "ส่วนหลักของอัตราขยายรวม"], ["C", "К", "ตัวแก้ไขความถี่"]] },
    { at: 3, list: [["R", "ВЫХ", "อิมพีแดนซ์ออกต่ำ"], ["I", "ВЫХ", "กระแสขับโหลด"]] }
  ];

  function layout(W) {
    const wide = W >= 640;
    const pad = 6, tw = wide ? 52 : 30, ag = wide ? 26 : 12;
    const bw = (W - 2 * pad - 2 * tw - 5 * ag) / 4;
    const bh = wide ? 50 : 40, uy = 8, uh = wide ? 28 : 24;
    const by = uy + uh + (wide ? 26 : 22);
    const x0 = pad + tw + ag;
    const pitch = wide ? 22 : 19;
    const ry = by + bh + 12;
    const H = ry + 7 * pitch + 12;
    return { wide, pad, tw, ag, bw, bh, uy, uh, by, x0, pitch, ry, H, ym: by + bh / 2,
      bx: i => x0 + i * (bw + ag), xEnd: x0 + 4 * bw + 3 * ag };
  }

  Object.assign(DEMOS, { "te12-chain": function (host) {
    const nf = (v, d) => window.STEPS2.nf(v, d);
    const db = v => 20 * Math.log10(v);
    const sb = (b, s) => b + "<sub>" + s + "</sub>";
    const lo = db(25e3), hi = db(1000e3);

    const steps = [
      { title: "โซ่ภายใน ОУ (วงจรขยายปฏิบัติการ) และคุณลักษณะสี่ข้อ",
        text: "ผังย่อของโซ่ภายใน ОУ (สไลด์ 8 และ 16): " + sb("u", "вх") + " → ДУ (ภาคขยายผลต่าง) → СК (ภาคปรับระดับ) → УА (ภาคขยายแรงดัน) → ЭП (ตัวตามอิมิตเตอร์) → " + sb("u", "вых") +
          " · УЗТ (หน่วยกำหนดกระแส) จ่ายกระแสอ้างอิง " + sb("I", "ЗАД") + " ให้ทุกภาค · เลข 1–3 บนกล่องคือคุณลักษณะที่เกิดที่ภาคนั้น ส่วนข้อ 4 เป็นของทั้งตัว ОУ " + ED("ผังย่อของผู้เรียบเรียง"),
        alt: "ผังโซ่ห้ากล่อง จากอินพุตผ่าน ДУ СК УА ЭП ไปเอาต์พุต มีกล่อง УЗТ ด้านบนต่อลูกศรประลงทุกกล่อง และเส้นประป้อนกลับจากเอาต์พุตย้อนมาอินพุตด้านล่าง",
        nums: [
          { k: "<b>1</b> · ภาคเข้า ДУ", v: "อินพุตแบบผลต่างความต้านทานสูง (дифференциальный высокоомный вход)" },
          { k: "<b>2</b> · ภาคกลาง УА (ให้ส่วนหลัก)", v: "อัตราขยายสูง (высокий коэффициент усиления)" },
          { k: "<b>3</b> · ภาคออก ЭП", v: "เอาต์พุตความต้านทานต่ำที่ค่อนข้างมีกำลัง (низкоомный (сравнительно мощный) выход)" },
          { k: "<b>4</b> · ทั้งตัว ОУ", v: "ต่อวงจรแก้ไขความถี่และวงจรป้อนกลับได้หลายแบบ (конструкция позволяет подключить различные корректирующие цепи и цепи обратной связи)" }
        ] },
      { title: "ДУ: อินพุตผลต่าง อิมพีแดนซ์สูง",
        text: "ДУ (дифференциальный усилитель) คือคู่ VT1/VT4 พร้อมกระจกกระแสเป็นโหลดพลวัต ให้อิมพีแดนซ์อินพุตสูงและกดสัญญาณโหมดร่วม · พารามิเตอร์ความแม่นยำสี่ตัวยกมาจากบรรยายที่ 10 โดยตรง · ชิปด้านล่างจัดตามภาคที่กำหนดค่านั้นเป็นหลัก " + ED("ผู้เรียบเรียงจัด"),
        alt: "กล่อง ДУ สว่างขึ้น ใต้กล่องมีชิปพารามิเตอร์เจ็ดตัวคือ UСМ ΔUСМ IВХ ΔIВХ KПСС RВХД และ RВХС",
        nums: [
          { k: "ความแม่นยำ (статические)", v: [sb("U", "СМ"), "Δ" + sb("U", "СМ"), sb("I", "ВХ"), "Δ" + sb("I", "ВХ")].join(" · "), note: "ความหมายเหมือนบรรยายที่ 10 ทุกประการ" },
          { k: "กลุ่มสัญญาณเล็ก (малосигнальные)", v: [sb("K", "ПСС"), sb("R", "ВХД"), sb("R", "ВХС")].join(" · "), note: sb("R", "ВХД") + " กับ " + sb("R", "ВХС") + " เป็นคนละค่า ใช้แทนกันไม่ได้" },
          { k: "เหตุผลของโครงสร้าง", v: "อินพุตอิมพีแดนซ์สูง → ไม่ดูดกระแสจากแหล่งสัญญาณ", note: "ทำได้ด้วย ДУ ที่มีแหล่งจ่ายกระแส หรือคู่ทรานซิสเตอร์สนามไฟฟ้า" }
        ] },
      { title: "СК + УА: เลื่อนระดับ แล้วขยายแรงดันหลัก",
        text: "СК (согласующий каскад) เชื่อมระดับศักย์ไฟตรงของ ДУ เข้ากับภาคขยาย · УА (усилитель амплитуды — สไลด์ 8 เรียกว่า УН) ให้อัตราขยายแรงดันหลัก ใช้แหล่งจ่ายกระแสเป็นโหลดพลวัต และเป็นที่ติดตั้งตัวเก็บประจุแก้ไขความถี่ " + sb("C", "К"),
        alt: "กล่อง СК และ УА สว่างขึ้น ใต้กล่องมีชิป ระดับ DC ที่ СК และชิป KУД กับ CК ที่ УА ชิปของ ДУ จางลง",
        nums: [
          { k: "อัตราขยายแรงดัน " + sb("K", "УД") + " ที่ต้องจำ", v: "25·10³ … 1000·10³ เท่า", big: true,
            note: "≈ " + nf(lo, 0) + " … " + nf(hi, 0) + " дБ " + ED("ผู้เรียบเรียงคำนวณ") },
          { k: "ตัวเก็บประจุแก้ไข " + sb("C", "К"), v: "จากเบส VT7 ถึงคอลเลกเตอร์ VT9 ในรูป", note: "เรื่องเสถียรภาพกับลักษณะแอมพลิจูด-ความถี่ (ЛАЧХ) ดูแอนิเมชันในส่วนที่ 2" }
        ] },
      { title: "ЭП: เอาต์พุตอิมพีแดนซ์ต่ำ ขับโหลด",
        text: "ЭП (двухтактный эмиттерный повторитель) คือคู่คอมพลีเมนทารี VT10/VT11 ขับโหลดได้โดยแรงดันไม่ตก · ไดโอด VD1, VD2 ระหว่างเบสสร้างไบแอสกำจัดความเพี้ยนแบบขั้นบันได",
        alt: "กล่อง ЭП สว่างขึ้น ใต้กล่องมีชิป RВЫХ และ IВЫХ ชิปของภาคก่อนหน้าจางลง",
        nums: [
          { k: "พารามิเตอร์ที่เกิดที่ภาคนี้", v: [sb("R", "ВЫХ"), sb("I", "ВЫХ")].join(" · ") },
          { k: "เหตุผลของโครงสร้าง", v: "เอาต์พุตอิมพีแดนซ์ต่ำ → แรงดันไม่ตกเมื่อต่อโหลด", note: "สลับกับ «อินพุตอิมพีแดนซ์สูง» ของ ДУ ไม่ได้" },
          { k: "ไดโอด VD1, VD2", v: "ไบแอสของคู่ทรานซิสเตอร์ภาคออก", note: "ไม่ใช่ไดโอดป้องกัน" }
        ] },
      { title: "รวม: K₀ = K₁ + K₂ + K₃ ใน дБ",
        text: "สไลด์ 13 แบ่ง ОУ เป็นภาคเข้า ภาคกลาง (усилитель амплитуды) ภาคออก — " + ED("ผู้เรียบเรียงจับคู่") + " กับกล่อง ДУ · СК + УА · ЭП ของสไลด์ 16 — ให้อัตราขยาย K₁ K₂ K₃ ที่จุดหัก ω₁ ω₂ ω₃ · อัตราขยายรวมบวกกันในหน่วย дБ ซึ่งตรงกับการคูณอัตราขยายจริง · แอนิเมชัน ЛАЧХ ถัดไปใช้ตัวเลขชุดนี้วาดเส้นหัก",
        alt: "แถบสามช่วงสีต่างกันต่อกัน ภาคเข้า 25 ภาคกลาง 20 ภาคออก 15 รวมเป็น 60 дБ ใต้กล่องของแต่ละกลุ่ม",
        nums: [
          { k: "อัตราขยายรวม " + sb("K", "0"), v: KD.join(" + ") + " = " + nf(KD[0] + KD[1] + KD[2], 0) + " дБ", big: true,
            note: "= " + nf(Math.pow(10, 60 / 20), 0) + " เท่า · ค่าตามสไลด์ 13 · แต่ ЭП ของวงจรสไลด์ 16 มี K<sub>U</sub> ≈ 1 (0 дБ) อัตราขยายจริงมาจาก ДУ และ УА" },
          { k: "จับคู่กับกลุ่มของสไลด์ 16", v: "ภาคเข้า = ДУ · ภาคกลาง = СК + УА · ภาคออก = ЭП" }
        ] }
    ];

    return window.STEPS2(host, {
      label: "แอนิเมชันทีละขั้น",
      title: 'ผังหน้าที่ของ ОУ ทีละภาค: พารามิเตอร์ใดมาจากภาคไหน <span style="white-space:nowrap">(сл. 8–9, 13, 16)</span>',
      aria: "แอนิเมชันผังโซ่ภายในของตัวขยายเชิงการคำนวณทีละภาค พร้อมพารามิเตอร์ที่เกิดจากแต่ละภาคและการรวมอัตราขยายเป็นเดซิเบล",
      legend: [
        { cls: "lg-ref", text: "ภาคเข้า (ДУ)" },
        { cls: "lg-meas", text: "ภาคกลาง (СК · УА)" },
        { cls: "lg-lin", text: "ภาคออก (ЭП)" },
        { cls: "dash", color: "var(--ink-3)", text: "УЗТ หน่วยกำหนดกระแส" }
      ],
      steps: steps,
      caption: "ที่มา: Л11 сл. 8 (โซ่และคุณลักษณะสี่ข้อ), сл. 9 (พารามิเตอร์), сл. 13 (K₁ K₂ K₃), сл. 16 (ห้ากลุ่ม ДУ СК УА ЭП УЗТ) · กล่องเรียงตามป้ายบนวงจรในรูปถัดไป · ผังย่อนี้และการจัดพารามิเตอร์เข้ากับภาคเป็นของผู้เรียบเรียง ไม่ใช่สไลด์ · ตัวเลข 25 / 20 / 15 дБ คือตัวอย่างสอนหลักการของสไลด์ 13 ไม่ใช่ค่าของวงจรจริง",
      height: w => layout(w).H,
      draw(ctx, W, H, step, C, anim) {
        const P = window.STEPS2.pen(ctx, W, H, C);
        const L = layout(W), wide = L.wide;
        const sz = wide ? 12 : 11.5;
        const gcol = [C.ref, C.meas, C.lin];
        const clamp01 = x => Math.max(0, Math.min(1, x));
        const A = a => { ctx.globalAlpha = clamp01(a); };
        const span = (a, b) => {
          const now = step >= a && step <= b, was = anim.from >= a && anim.from <= b;
          if (now === was) return now ? 1 : 0;
          return now ? clamp01((anim.p - 0.25) / 0.55) : 1 - clamp01(anim.p / 0.35);
        };
        /* ข้อความที่มีตัวห้อย: parts = สตริง หรือ [[ข้อความ, 0|1(ห้อย)], …] */
        function txt(parts, x, y, color, o) {
          o = o || {};
          if (typeof parts === "string") parts = [[parts, 0]];
          const s0 = o.size || sz, wt = o.weight || 600;
          const fnt = q => P.font(q[1] ? s0 * 0.8 : s0, wt);
          let tw = 0;
          parts.forEach(q => { fnt(q); tw += ctx.measureText(q[0]).width; });
          let cx = o.align === "right" ? x - tw : o.align === "center" ? x - tw / 2 : x;
          cx = Math.max(3, Math.min(W - 3 - tw, cx));
          ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
          [true, false].forEach(halo => {
            if (halo && o.halo === 0) return;
            let px = cx;
            parts.forEach(q => {
              fnt(q);
              const yy = y + (q[1] ? 3 : 0);
              if (halo) { ctx.lineWidth = 4; ctx.strokeStyle = C.bg; ctx.strokeText(q[0], px, yy); }
              else { ctx.fillStyle = color; ctx.fillText(q[0], px, yy); }
              px += ctx.measureText(q[0]).width;
            });
          });
          return tw;
        }
        function width(parts, size, wt) {
          if (typeof parts === "string") parts = [[parts, 0]];
          let tw = 0;
          parts.forEach(q => { P.font(q[1] ? size * 0.8 : size, wt || 600); tw += ctx.measureText(q[0]).width; });
          return tw;
        }
        function rr(x, y, w, h, r) {
          ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
          ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
        }
        const B = i => ({ x: L.bx(i), y: L.by, w: L.bw, h: L.bh });
        const ym = L.ym;

        /* ---------- УЗТ ---------- */
        {
          const x1 = L.bx(0), x2 = L.bx(3) + L.bw;
          ctx.save(); A(0.85);
          rr(x1, L.uy, x2 - x1, L.uh, 7); ctx.fillStyle = C.sunk; ctx.fill();
          ctx.setLineDash([5, 4]); ctx.lineWidth = 1.3; ctx.strokeStyle = C.ink3; ctx.stroke(); ctx.setLineDash([]);
          txt(wide ? [["УЗТ", 0], [" — устройство задания тока · I", 0], ["ЗАД", 1]] : [["УЗТ · I", 0], ["ЗАД", 1]], (x1 + x2) / 2, L.uy + L.uh / 2, C.ink2, { align: "center" });
          ctx.restore();
          for (let i = 0; i < 4; i++) {
            const xc = B(i).x + L.bw / 2;
            P.seg([[xc, L.uy + L.uh], [xc, L.by - 9]], C.ink3, 1.3, [3, 3], 0.9);
            P.arrow(xc, L.by - 9, xc, L.by - 1, C.ink3, 1.3, 6);
          }
        }

        /* ---------- ลูกศรเชื่อม + ขั้ว ---------- */
        const act = [span(1, 1), span(2, 2), span(2, 2), span(3, 3)];
        const all = span(4, 4), dimF = span(1, 3);
        const arrows = [[L.pad + L.tw, B(0).x, 0, 1], [B(0).x + L.bw, B(1).x, 1, 2], [B(1).x + L.bw, B(2).x, 2, 2], [B(2).x + L.bw, B(3).x, 3, 3]];
        arrows.forEach((a, i) => {
          const hot = i === 0 ? act[0] : act[i];
          ctx.save(); A(1 - 0.4 * dimF * (1 - hot));
          P.arrow(a[0] + 2, ym, a[1] - 2, ym, hot > 0.5 ? gcol[BOX[i].g] : C.ink3, 1.8, 7);
          ctx.restore();
          if (hot > 0.3 && anim.p < 1 && step === [1, 2, 2, 3][i]) {
            for (let j = 0; j < 3; j++) { const f = (anim.p * 2 + j / 3) % 1; P.dot(a[0] + (a[1] - a[0]) * f, ym, 3.4, gcol[BOX[i].g]); }
          }
        });
        P.arrow(B(3).x + L.bw + 2, ym, L.xEnd + L.ag - 2, ym, C.ink3, 1.8, 7);
        txt([["u", 0], ["вх", 1]], L.pad + L.tw / 2, ym, C.ink, { align: "center", size: sz + 1, weight: 700 });
        txt([["u", 0], ["вых", 1]], L.xEnd + L.ag + L.tw / 2 + 2, ym, C.ink, { align: "center", size: sz + 1, weight: 700 });

        /* ---------- กล่อง ---------- */
        BOX.forEach((b, i) => {
          const r = B(i), h = Math.max(act[i], all);
          ctx.save(); A(1 - 0.4 * dimF * (1 - act[i]));
          rr(r.x, r.y, r.w, r.h, 9); ctx.fillStyle = C.bg; ctx.fill();
          ctx.save(); A(h * 0.9); ctx.fillStyle = C.wash; rr(r.x, r.y, r.w, r.h, 9); ctx.fill(); ctx.restore();
          ctx.lineWidth = 1.5 + 1.2 * h; ctx.strokeStyle = gcol[b.g]; rr(r.x, r.y, r.w, r.h, 9); ctx.stroke();
          P.font(wide ? 16 : 15, 700); ctx.fillStyle = h > 0.5 ? gcol[b.g] : C.ink; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(b.n, r.x + r.w / 2, r.y + (wide ? 18 : r.h / 2));
          if (wide) {
            let s2 = 10.5; P.font(s2, 500);
            while (s2 > 8.5 && ctx.measureText(b.sub).width > r.w - 10) { s2 -= 0.5; P.font(s2, 500); }
            ctx.fillStyle = C.ink2; ctx.fillText(b.sub, r.x + r.w / 2, r.y + 37);
          }
          ctx.restore();
        });

        /* ---------- ขั้น ①: เลขคุณลักษณะ 1–3 + เส้นป้อนกลับ (ข้อ 4) ---------- */
        const s0 = span(0, 0);
        if (s0 > 0.01) {
          ctx.save(); A(s0);
          [[0, "1"], [2, "2"], [3, "3"]].forEach(t => {
            const r = B(t[0]), cx = r.x + r.w - 5, cy = r.y + 1;
            ctx.beginPath(); ctx.arc(cx, cy, 8.5, 0, Math.PI * 2); ctx.fillStyle = gcol[BOX[t[0]].g]; ctx.fill();
            ctx.lineWidth = 2; ctx.strokeStyle = C.bg; ctx.stroke();
            P.font(11, 700); ctx.fillStyle = C.bg; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(t[1], cx, cy + 0.5);
          });
          const xr = L.xEnd + L.ag + L.tw / 2 + 2, xl = L.pad + L.tw / 2, y1 = ym + 12, y2 = L.ry + (wide ? 64 : 58);
          P.seg([[xr, y1], [xr, y2], [xl, y2], [xl, y1 + 7]], C.ink3, 1.5, [5, 4]);
          P.arrow(xl, y1 + 8, xl, y1 - 1, C.ink3, 1.5, 6);
          const tx = (xl + xr) / 2;
          ctx.beginPath(); ctx.arc(L.pad + L.tw + 14, y2 - 17 - (wide ? 0 : 3), 8.5, 0, Math.PI * 2); ctx.fillStyle = C.ink2; ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = C.bg; ctx.stroke();
          P.font(11, 700); ctx.fillStyle = C.bg; ctx.textAlign = "center"; ctx.fillText("4", L.pad + L.tw + 14, y2 - 16.5 - (wide ? 0 : 3));
          const t1 = wide ? "ต่อวงจรแก้ไข (корректирующие цепи) และวงจรป้อนกลับ (обратная связь) ภายนอกได้" : "ต่อวงจรแก้ไขและวงจรป้อนกลับภายนอกได้";
          txt(t1, tx + 12, y2 - 17 - (wide ? 0 : 3), C.ink2, { align: "center", size: wide ? 12 : 10.5, weight: 500 });
          ctx.restore();
        }

        /* ---------- ขั้น ②–④: ชิปพารามิเตอร์ ---------- */
        const colOf = [0, 1, 2, 3];
        CHIPS.forEach((cg, ci) => {
          const al = span(cg.at, 3);
          if (al < 0.01) return;
          const bi = colOf[ci], r = B(bi), g = BOX[bi].g;
          ctx.save(); A(al * (step === cg.at ? 1 : 0.5));
          cg.list.forEach((c, k) => {
            const y = L.ry + 8 + k * L.pitch + L.pitch / 2 - 2;
            const parts = c[1] ? [[c[0], 0], [c[1], 1]] : [[c[0], 0]];
            const cw = width(parts, sz, 700) + 12;
            rr(r.x, y - 8.5, cw, 17, 6); ctx.fillStyle = C.bg; ctx.fill();
            ctx.lineWidth = 1.3; ctx.strokeStyle = gcol[g]; ctx.stroke();
            txt(parts, r.x + 6, y, C.ink, { weight: 700, halo: 0 });
            if (wide) {
              const room = r.w + L.ag - cw - 6;
              let s2 = 10.5; P.font(s2, 500);
              while (s2 > 8.5 && ctx.measureText(c[2]).width > room) { s2 -= 0.5; P.font(s2, 500); }
              ctx.fillStyle = C.ink2; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(c[2], r.x + cw + 6, y);
            }
          });
          ctx.restore();
        });

        /* ---------- ขั้น ⑤: วงเล็บกลุ่ม + แถบ дБ ---------- */
        const s4 = span(4, 4);
        if (s4 > 0.01) {
          const grp = [[0, 0], [1, 2], [3, 3]];
          ctx.save(); A(s4);
          grp.forEach((gr, gi) => {
            const x1 = B(gr[0]).x, x2 = B(gr[1]).x + L.bw, y = L.ry + 4;
            P.seg([[x1, y - 4], [x1, y], [x2, y], [x2, y - 4]], gcol[gi], 2);
            txt(GRP[gi].th, (x1 + x2) / 2, y + 13, gcol[gi], { align: "center", weight: 700 });
            if (wide) txt(GRP[gi].ru, (x1 + x2) / 2, y + 27, C.ink2, { align: "center", size: 11, weight: 500, halo: 0 });
          });
          ctx.restore();
          const by0 = L.ry + (wide ? 56 : 42), bh0 = wide ? 34 : 24, x0 = L.bx(0), totW = L.xEnd - x0;
          const reveal = totW * s4;
          let cum = 0;
          KD.forEach((k, i) => {
            const sx = x0 + totW * cum / 60, sw = totW * k / 60;
            const vis = Math.max(0, Math.min(sw, x0 + reveal - sx));
            cum += k;
            if (vis < 1) return;
            ctx.fillStyle = gcol[i]; ctx.fillRect(sx, by0, vis, bh0);
            ctx.lineWidth = 2; ctx.strokeStyle = C.bg; ctx.strokeRect(sx, by0, vis, bh0);
            if (vis > sw - 2) {
              P.font(wide ? 13 : 10.5, 700); ctx.fillStyle = C.bg; ctx.textAlign = "center"; ctx.textBaseline = "middle";
              ctx.fillText(wide ? "K" + "₁₂₃"[i] + " = " + k + " дБ" : k + " дБ", sx + sw / 2, by0 + bh0 / 2 + 0.5);
            }
          });
          ctx.save(); A(s4 * clamp01((s4 - 0.5) * 2));
          txt("K₀ = " + KD.join(" + ") + " = " + nf(KD[0] + KD[1] + KD[2], 0) + " дБ", x0 + totW / 2, by0 + bh0 + (wide ? 22 : 18), C.ink, { align: "center", size: wide ? 14 : 11.5, weight: 700 });
          ctx.restore();
        }
      }
    });
  } });
})();
