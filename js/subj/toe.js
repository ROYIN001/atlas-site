/* js/subj/toe.js — แบบจำลองของวิชา toe (STD2) · สร้างโดย _work/std2/tools/assemble.py จาก _work/toestd2/demos/ — ห้ามแก้ไฟล์นี้ตรง ๆ แก้ที่ต้นฉบับแล้วประกอบใหม่ · โหลดโดย subjAssets() เมื่อเปิดวิชา · ห้ามแตะ document ที่ระดับบนสุด */
/* --- toe5-classic.js --- */
/* toe5-classic — วิธีคลาสสิกทีละขั้น: งานประจำวิชา вариант 1489 (วงจรอันดับสอง U → S → R → [(L + R₁) ∥ C])
   สูตร: курсовая работа (1.1)–(1.16) · ผู้เรียบเรียงทำ
   ใช้: a = RCL · b = RR₁C + L · c = R + R₁ · p₁,₂ = (−b ± √(b² − 4ac))/(2a) · i_пр = U/c · u_Cпр = i_пр·R₁
        A₁ = −i_пр·p₂/(p₂ − p₁) · A₂ = i_пр·p₁/(p₂ − p₁) · i₂ = i_пр + A₁e^{p₁t} + A₂e^{p₂t}
        u_C = L·di₂/dt + R₁·i₂ · i₃ = C·du_C/dt · i₁ = i₂ + i₃
   ค่าอ้างอิง (ตรวจด้วย python + RK4): p₁ = −614,0 · p₂ = −4886,0 с⁻¹ · i_пр = 1,6667 А · u_Cпр = 83,333 В · A₁ = −1,9062 · A₂ = 0,23954
        u_C,max = 94,577 В ที่ 0,854 мс · i₃,min = −0,1025 А ที่ 1,34 мс · i₁,min = 0,5423 А ที่ 0,854 мс
        เข้าแถบ ±5 % ถาวร: i₂ 5,097 · i₁ 5,311 · i₃ 1,874 · u_C 2,689 мс
   ส่วนของผู้เรียบเรียง (บอกบนจอ): L = 0,1 Гн และ R₁ = 50 Ом (คำนวณจาก (1.8)) · u_Cпр · ยอด u_C · i₃ ต่ำสุด · เวลาเข้าแถบ ±5 % · τ · ภาพทั้งหมด */
Object.assign(DEMOS, {
  "toe5-classic": function (host) {
    const nf = window.STEPS2.nf;

    /* ---------- ข้อมูลและตัวเลข (คำนวณสดจากสูตร) ---------- */
    const U = 100, CAP = 20e-6, R = 10;                  // ตามงาน
    const K_A = 2e-5, K_C = 60;                          // สัมประสิทธิ์ใน (1.8): RCL และ R + R₁
    const L = K_A / (R * CAP), R1 = K_C - R;             // ผู้เรียบเรียงคำนวณ
    const a = R * CAP * L, b = R * R1 * CAP + L, c = R + R1, D = b * b - 4 * a * c;
    const sq = Math.sqrt(D), p1 = (-b + sq) / (2 * a), p2 = (-b - sq) / (2 * a);
    const ip = U / c, up = ip * R1;
    const A1 = -ip * p2 / (p2 - p1), A2 = ip * p1 / (p2 - p1);
    const B1 = A1 * (L * p1 + R1), B2 = A2 * (L * p2 + R1);     // u_C = B₁e^{p₁t} + B₂e^{p₂t} + u_Cпр
    const e1 = t => Math.exp(p1 * t), e2 = t => Math.exp(p2 * t);
    const i2f = t => A1 * e1(t) + A2 * e2(t) + ip;
    const di2 = t => A1 * p1 * e1(t) + A2 * p2 * e2(t);
    const d2i2 = t => A1 * p1 * p1 * e1(t) + A2 * p2 * p2 * e2(t);
    const ucf = t => L * di2(t) + R1 * i2f(t);
    const i3f = t => CAP * (L * d2i2(t) + R1 * di2(t));
    const i1f = t => i2f(t) + i3f(t);
    const TG = 0.01;                                     // แกนเวลา 0…10 мс
    const tau1 = 1 / Math.abs(p1), tau2 = 1 / Math.abs(p2);

    let tI3 = 0, i3Min = 0;                              // ค่าต่ำสุดของ i₃
    for (let k = 0; k <= 5000; k++) { const t = k * 2e-6, q = i3f(t); if (q < i3Min) { i3Min = q; tI3 = t; } }
    let lo = 1e-6, hi = tI3;                             // u_C สูงสุดเมื่อ i₃ = 0 (หาด้วยการแบ่งครึ่ง)
    for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (i3f(m) > 0) lo = m; else hi = m; }
    const tMax = (lo + hi) / 2, ucMax = ucf(tMax), i1AtMax = i1f(tMax);
    const lastOut = (f, fin, band) => { let last = 0; for (let k = 0; k <= 15000; k++) { const t = k * 2e-6; if (Math.abs(f(t) - fin) > band) last = t; } return last; };
    const BAND = 0.05 * ip;                              // ±5 % ของ i_пр (ใช้กับ i₃ ด้วย เพราะค่าคงตัวเป็น 0)
    const tS2 = lastOut(i2f, ip, BAND), tS1 = lastOut(i1f, ip, BAND), tS3 = lastOut(i3f, 0, BAND);
    const tS = Math.max(tS1, tS2, tS3), tSu = lastOut(ucf, up, 0.05 * up);
    let paperMax = 0;                                    // ยอดของ u_C ตามสัมประสิทธิ์ที่พิมพ์ใน (1.14)
    for (let k = 0; k <= 5000; k++) { const t = k * 2e-6, v = 21.734 * Math.exp(-614 * t) - 105.0447 * Math.exp(-4886 * t) + 83.35; if (v > paperMax) paperMax = v; }
    const i0 = U / R;                                    // i₁(0⁺) = i₃(0⁺)

    const SUP = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
    function sci(x, d) {
      const e = Math.floor(Math.log10(Math.abs(x)) + 1e-9);
      const m = nf(x / Math.pow(10, e), d || 0);
      return (m === "1" ? "" : m + "·") + "10" + String(e).split("").map(ch => SUP[ch]).join("");
    }
    const ms = (t, d) => nf(t * 1000, d === undefined ? 2 : d);
    const ED = '<span class="ed">ผู้เรียบเรียงคำนวณ</span>';
    const sb = (s, t) => s + "<sub>" + t + "</sub>";
    const I = { i1: "i₁", i2: "i₂", i3: "i₃", uC: sb("u", "C"), ipr: sb("i", "пр"), upr: sb("u", "Cпр") };

    /* MathML ย่อ */
    const mi = s => "<mi>" + s + "</mi>", mn = s => "<mn>" + s + "</mn>", mo = s => "<mo>" + s + "</mo>";
    const msub = (x, y) => "<msub>" + x + y + "</msub>", msup = (x, y) => "<msup>" + x + y + "</msup>";
    const mrow = (...z) => "<mrow>" + z.join("") + "</mrow>";
    const mfrac = (x, y) => "<mfrac>" + x + y + "</mfrac>";
    const mt = s => "<math>" + s + "</math>";
    const mR1 = msub(mi("R"), mn("1")), mp1 = msub(mi("p"), mn("1")), mp2 = msub(mi("p"), mn("2"));
    const mA1 = msub(mi("A"), mn("1")), mA2 = msub(mi("A"), mn("2")), mipr = msub(mi("i"), mi("пр"));
    const F = {
      char: mt(mi("R") + mi("C") + mi("L") + msup(mi("p"), mn("2")) + mo("+") + mrow(mo("("), mi("R"), mR1, mi("C"), mo("+"), mi("L"), mo(")")) + mi("p") +
        mo("+") + mrow(mo("("), mi("R"), mo("+"), mR1, mo(")")) + mo("=") + mn("0")),
      ipr: mt(mipr + mo("=") + mfrac(mi("U"), mrow(mi("R"), mo("+"), mR1))),
      A1: mt(mA1 + mo("=") + mo("−") + mipr + mo("·") + mfrac(mp2, mrow(mp2, mo("−"), mp1))),
      A2: mt(mA2 + mo("=") + mipr + mo("·") + mfrac(mp1, mrow(mp2, mo("−"), mp1)))
    };

    const STEPS = [
      { title: "ก่อนสับสวิตช์ (t &lt; 0)",
        text: "วงจรอันดับสอง (цепь второго порядка) มีตัวสะสมพลังงานสองตัวที่ไม่ต่อกัน คือตัวเหนี่ยวนำ L กับตัวเก็บประจุ C จึงต้องใช้เงื่อนไขเริ่มต้นสองค่า · " +
          "สวิตช์ S ยังเปิดอยู่ ทุกกระแสเป็นศูนย์ งานระบุเงื่อนไขเริ่มต้นศูนย์ (нулевые начальные условия) และกระแสตัวเหนี่ยวนำกับแรงดันตัวเก็บประจุต่อเนื่องผ่านการสับ จึงเริ่มจาก 0 ทั้งคู่ · " +
          "งานให้ U, C และ R มา แต่ไม่ได้ระบุ L กับ R₁ เป็นตัวเลข ค่าสองตัวนี้ " + ED + " ย้อนจากสัมประสิทธิ์ของสมการ (1.8)",
        alt: "วงจรจากแหล่ง U ผ่านสวิตช์ S ที่เปิดอยู่ ตัวต้านทาน R ถึงจุดต่อ แล้วแยกเป็นกิ่งตัวเหนี่ยวนำ L อนุกรมกับ R₁ และกิ่งตัวเก็บประจุ C กราฟเปล่ายังไม่มีเส้น",
        nums: [
          { k: "ข้อมูลตามงาน", v: "U = " + nf(U, 0) + " В · R = " + nf(R, 0) + " Ом · C = " + nf(CAP * 1e6, 0) + " мкФ" },
          { k: "L และ R₁ (จากสัมประสิทธิ์ (1.8))", v: ["RCL = " + sci(K_A) + " ⇒ L = " + nf(L, 1) + " Гн", "R + R₁ = " + nf(K_C, 0) + " ⇒ R₁ = " + nf(R1, 0) + " Ом"],
            note: "ตรวจ: RR₁C + L = " + nf(b, 2) + " ตรงกับ (1.8)" },
          { k: "เงื่อนไขเริ่มต้นศูนย์", v: sb("u", "C") + "(0⁻) = 0 · " + sb("i", "L") + "(0⁻) = 0" }
        ] },
      { title: "โหมดคงตัวใหม่ (t → ∞)",
        text: "ปิดสวิตช์แล้วรอนานจนวงจรนิ่ง (установившийся режим) ภายใต้แหล่งคงที่ ตัวเหนี่ยวนำทำตัวเป็นลวดตัวนำ ตัวเก็บประจุทำตัวเป็นวงจรเปิด (ตามกฎที่งานใช้หาค่าคงตัว) · " +
          "วงจรเหลือ R อนุกรมกับ R₁ กระแสผ่านกิ่ง C เป็นศูนย์ · แรงดันคงตัวบน C เท่ากับแรงดันตก R₁ " + ED,
        alt: "วงจรเมื่อสวิตช์ปิด ตัวเหนี่ยวนำถูกแทนด้วยเส้นลวด ตัวเก็บประจุเป็นวงจรเปิด บนกราฟมีเส้นประระดับ 1,667 แอมแปร์และ 83,33 โวลต์",
        nums: [
          { k: "กระแสคงตัว (принужденная составляющая)", v: F.ipr + " = " + nf(U, 0) + "/" + nf(c, 0) + " = " + nf(ip, 3) + " А", big: true,
            note: "ต้นฉบับเขียน «размыкание ключа» แต่สูตรนี้คือกรณีปิดสวิตช์ต่อแหล่ง" },
          { k: "แรงดันคงตัวบน C", v: I.upr + " = " + I.ipr + "·R₁ = " + nf(up, 2) + " В", note: "สูตร (1.14) ในงานพิมพ์ 83,35 В ต่างจากค่าคำนวณ " + nf(Math.abs(83.35 - up), 2) + " В " + ED },
          { k: "กระแสกิ่ง C", v: sb("i", "3пр") + " = 0" }
        ] },
      { title: "สมการลักษณะเฉพาะและราก",
        text: "องค์ประกอบอิสระ (свободная составляющая) ใช้สมการเอกพันธ์ของ i₂ จาก (1.5) · แทนการหาอนุพันธ์ด้วย p ได้สมการลักษณะเฉพาะ (характеристическое уравнение) (1.6) ซึ่งสัมประสิทธิ์ตรงกับ (1.8) · " +
          "D = b² − 4ac &gt; 0 รากจึงเป็นจำนวนจริงสองค่าที่ต่างกัน (действительные и различные) ไม่มีส่วนจินตภาพ ผลตอบสนองจึงไม่แกว่ง · " +
          "แต่ละรากให้เอ็กซ์โพเนนเชียลหนึ่งตัว ค่าคงตัวเวลาของมันคือ τ = 1/|p| " + ED,
        alt: "เส้นจำนวนจริงของ p มีจุดสองจุดที่ลบ 4886 และลบ 614 ด้านล่างเป็นแถบความยาว τ₂ สั้นและ τ₁ ยาวบนมาตราเวลาเดียวกับกราฟ",
        nums: [
          { k: "สมการลักษณะเฉพาะ (1.6) → (1.8)", v: [F.char, nf(a * 1e5, 0) + "·10⁻⁵·p² + " + nf(b, 2) + "·p + " + nf(c, 0) + " = 0"] },
          { k: "ดิสคริมิแนนต์ (1.9)", v: "D = b² − 4ac = " + nf(D, 4) },
          { k: "ราก (1.10)", v: ["p₁ = " + nf(p1, 0) + " с⁻¹", "p₂ = " + nf(p2, 0) + " с⁻¹"], big: true },
          { k: "ค่าคงตัวเวลา τ = 1/|p|", v: "τ₁ = " + ms(tau1) + " мс · τ₂ = " + ms(tau2) + " мс" }
        ] },
      { title: "เงื่อนไขเริ่มต้น → ค่าคงตัว A₁ A₂",
        text: "คำตอบของ i₂ คือ i<sub>пр</sub> + A₁e<sup>p₁t</sup> + A₂e<sup>p₂t</sup> (1.11) · ที่ t = 0 ตัวเหนี่ยวนำกับตัวเก็บประจุว่างอยู่: i₂(0) = 0 และ u<sub>C</sub>(0) = 0 · " +
          "เพราะ u<sub>C</sub> = L·di₂/dt + R₁·i₂ จึงได้ di₂/dt(0) = 0 · สองเงื่อนไขนี้เป็นระบบสมการของ A₁ กับ A₂ (1.12) · งานพิมพ์ A₁ = −1,9065 และ A₂ = 0,24 ซึ่งตรงกับค่าที่นี่เมื่อปัดเป็นสามตำแหน่ง (ค่าละเอียด −1,9062 และ 0,2395 ต่างกันเพราะการปัดเศษ)",
        alt: "กราฟ i₂ เริ่มที่ศูนย์พร้อมเส้นสัมผัสแนวนอนที่จุดเริ่ม แล้วค่อย ๆ ขึ้นสู่ 1,667 แอมแปร์",
        nums: [
          { k: "เงื่อนไขเริ่มต้น", v: "i₂(0) = 0 · " + sb("u", "C") + "(0) = 0 ⇒ di₂/dt(0) = 0" },
          { k: "ระบบสมการ (1.12)", v: ["A₁ + A₂ = −" + I.ipr + " = " + nf(-ip, 3), "p₁·A₁ + p₂·A₂ = 0"] },
          { k: "ผลเฉลย", v: [F.A1 + " = " + nf(A1, 3), F.A2 + " = " + nf(A2, 3)], big: true, note: "งานพิมพ์ −1,9065 และ 0,24" }
        ] },
      { title: "กราฟ i₂ และ u<sub>C</sub>",
        text: "u<sub>C</sub> = L·di₂/dt + R₁·i₂ ให้สูตรของ u<sub>C</sub> ในรูปเอ็กซ์โพเนนเชียลเดิม (1.14) · u<sub>C</sub> พุ่งเกินค่าคงตัว " + nf(up, 2) + " В ขึ้นไปถึงยอด " + nf(ucMax, 2) +
          " В ที่ t = " + ms(tMax, 3) + " мс แล้วลดลงสู่ค่าคงตัว ไม่ลดลงต่ำกว่าค่าคงตัวอีก · i₂ เพิ่มจาก 0 ไป " + nf(ip, 3) + " А โดยไม่ขึ้นเกินค่าคงตัว (di₂/dt &gt; 0 ทุก t &gt; 0) · " +
          "ยอดและเวลาของยอด " + ED + " โดยหาจุดที่ i₃ = 0",
        alt: "กราฟ i₂ สีเขียวอมฟ้าขึ้นช้าไม่เกิน 1,667 แอมแปร์ กราฟ u_C สีส้มพุ่งเร็วถึงยอดประมาณ 94,6 โวลต์ ที่ราว 0,85 มิลลิวินาที แล้วลงสู่ 83,33 โวลต์",
        nums: [
          { k: "u<sub>C</sub>(t) จาก (1.14)", v: nf(B1, 2) + "·e<sup>" + nf(p1, 0) + "t</sup> " + (B2 < 0 ? "−" : "+") + " " + nf(Math.abs(B2), 2) + "·e<sup>" + nf(p2, 0) + "t</sup> + " + nf(up, 2) + " В",
            note: "งานพิมพ์ 21,734 · −105,0447 · 83,35" },
          { k: "ยอดของ u<sub>C</sub>", v: sb("u", "C,max") + " = " + nf(ucMax, 2) + " В ที่ " + sb("t", "max") + " = " + ms(tMax, 3) + " мс", big: true,
            note: "กราฟในงานอ่านด้วยตาได้ราว 97 В แต่สูตร (1.14) ที่พิมพ์ในงานให้ " + nf(paperMax, 1) + " В" },
          { k: "เกินค่าคงตัว", v: nf(ucMax - up, 2) + " В (" + nf((ucMax - up) / up * 100, 1) + " %)" }
        ] },
      { title: "กราฟ i₁ และ i₃",
        text: "ที่ t = 0⁺ ตัวเก็บประจุยังไม่มีประจุ (u<sub>C</sub> = 0) จึงทำตัวเหมือนลัดวงจร: i₃(0⁺) = i₁(0⁺) = U/R = " + nf(i0, 0) + " А เพราะ i₂ ยังเป็น 0 · " +
          "จากนั้น i₃ = C·du<sub>C</sub>/dt ตกเร็วจนกลับทิศเล็กน้อย (ต่ำสุด " + nf(i3Min, 3) + " А ที่ " + ms(tI3) + " мс) แล้วเข้าหา 0 · " +
          "i₁ = i₂ + i₃ ลดลงเหลือ " + nf(i1AtMax, 3) + " А ที่ยอดของ u<sub>C</sub> แล้วเพิ่มสู่ " + nf(ip, 3) + " А · ค่าต่ำสุดของ i₃ จุดต่ำของ i₁ และเวลาเข้าแถบ ±5 % " + ED,
        alt: "กราฟ i₁ และ i₃ เริ่มที่ 10 แอมแปร์ ตกลงเร็ว i₃ ลงต่ำกว่าศูนย์เล็กน้อยแล้วกลับเข้าศูนย์ i₁ ต่ำสุดประมาณ 0,54 แล้วขึ้นสู่ 1,667 มีเส้นตั้งที่ 5,31 มิลลิวินาที",
        nums: [
          { k: "ที่ t = 0⁺ (C ลัดวงจร)", v: "i₃ = i₁ = U/R = " + nf(i0, 0) + " А", big: true },
          { k: "ค่าต่ำสุด", v: ["i₃ = " + nf(i3Min, 3) + " А ที่ " + ms(tI3) + " мс", "i₁ = " + nf(i1AtMax, 3) + " А ที่ " + ms(tMax, 3) + " мс"] },
          { k: "ค่าคงตัว", v: "i₁ → " + nf(ip, 3) + " А · i₃ → 0" },
          { k: "เข้าแถบ ±5 % (±" + nf(BAND, 3) + " А) แล้วไม่ออกอีก", v: ["i₂ " + ms(tS2) + " · i₁ " + ms(tS1) + " · i₃ " + ms(tS3) + " мс", "ทุกกระแส: " + ms(tS) + " мс"], big: true,
            note: "แถบของ i₃ ใช้ ±5 % ของ i<sub>пр</sub> เพราะค่าคงตัวเป็น 0 · u<sub>C</sub> เข้าแถบ ±5 % ของ " + nf(up, 2) + " В ที่ " + ms(tSu) + " мс" }
        ] }
    ];

    return window.STEPS2(host, {
      label: "แอนิเมชันทีละขั้น",
      title: 'วิธีคลาสสิกทีละขั้น: งานประจำวิชา <span style="white-space:nowrap">вариант 1489</span>',
      aria: "แอนิเมชันทีละขั้น: วิธีคลาสสิกกับวงจรอันดับสอง R, L, R₁, C งานประจำวิชา",
      legend: [
        { cls: "lg-new", text: "i₁ (จากแหล่ง)" },
        { cls: "lg-ref", text: "i₂ (ผ่าน L)" },
        { cls: "lg-lin", text: "i₃ (ผ่าน C)" },
        { cls: "lg-meas", text: "<span>u<sub>C</sub> (แกนขวา В)</span>" }
      ],
      steps: STEPS,
      caption: "วงจรและสูตรตามงานประจำวิชาตัวอย่าง (вариант 1489) · L และ R₁ ผู้เรียบเรียงคำนวณจากสัมประสิทธิ์ของสมการ (1.8) · กราฟวาดจากสูตร (1.13)–(1.16) โดยใช้ค่าสัมประสิทธิ์ที่ไม่ปัดเศษ",
      height: w => w < 520 ? 548 : Math.round(Math.max(500, Math.min(540, w * 0.64))),
      draw(ctx, W, H, step, C, anim) {
        const P = window.STEPS2.pen(ctx, W, H, C);
        const narrow = W < 520;
        const padX = narrow ? 12 : 22;
        const clamp01 = x => Math.max(0, Math.min(1, x));
        const lerp = (x, y, t) => x + (y - x) * t;
        const inR = (s, x, y) => s >= x && s <= y;
        const scene = (x, y) => {
          const now = inR(step, x, y), was = inR(anim.from, x, y);
          if (now && was) return 1;
          if (now) return clamp01(anim.p * 1.6);
          if (was) return clamp01(1 - anim.p * 2.2);
          return 0;
        };
        const rv = k => {                                   // ความคืบหน้าของเส้นที่ปรากฏตั้งแต่ขั้น k (กวาดซ้าย → ขวา)
          const now = step >= k, was = anim.from >= k;
          if (now && was) return 1;
          if (now) return anim.e;
          if (was) return 1 - anim.e;
          return 0;
        };
        const cI1 = C.new, cI2 = C.ref, cI3 = C.lin, cUC = C.meas;

        /* ป้ายที่มีตัวห้อย/ตัวยก: u_{C} · i_{пр} */
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

        /* ============================ บน: วงจร ============================ */
        const cH = 172;
        {
          const WW = Math.min(W, 640), ox = (W - WW) / 2;
          const y1 = 36, y2 = 124, ym = (y1 + y2) / 2;
          const xs = ox + padX + 16;
          const Lsw = Math.min(58, WW * 0.13), xSw0 = ox + WW * 0.17, xSw1 = xSw0 + Lsw;
          const Rw = Math.min(58, WW * 0.13), xR0 = ox + WW * 0.38, xR1 = xR0 + Rw;
          const xn = ox + WW * 0.64, xc = ox + WW - (narrow ? 58 : 70);
          const closed = anim.fade(1, 0.05);                  // 0 = เปิด · 1 = ปิด (ค่อย ๆ เปลี่ยนตามขั้น)
          const eq = scene(1, 1);                             // วงจรแทนที่สภาวะคงตัว
          const s5 = scene(5, 5);
          const ink = C.ink2;
          ctx.lineCap = "round"; ctx.lineJoin = "round";
          const wire = (pts, col, w) => P.seg(pts, col || ink, w || 2);

          /* สายไฟ */
          wire([[xs, y1], [xSw0, y1]]); wire([[xSw1, y1], [xR0, y1]]); wire([[xR1, y1], [xc, y1], [xc, ym - 4]]);
          wire([[xs, y2], [xc, y2], [xc, ym + 4]]);
          wire([[xn, y2 - 15], [xn, y2]]);                    // ก้นกิ่ง L–R₁ ต่อเข้ารางล่าง

          /* แหล่ง U */
          wire([[xs, y1], [xs, ym - 7]]); wire([[xs, ym + 3], [xs, y2]]);
          wire([[xs - 12, ym - 7], [xs + 12, ym - 7]], C.ink, 2.6); wire([[xs - 6, ym + 3], [xs + 6, ym + 3]], C.ink, 2.6);
          P.label("+", xs - 17, ym - 14, C.ink3, { size: 12, align: "center", halo: 0 });
          rich("U", xs + 15, ym - 2, C.ink, { size: 14, weight: 700 });

          /* สวิตช์ S : ใบมีดยกขึ้นเมื่อเปิด */
          const th = (1 - closed) * 0.4;
          wire([[xSw0, y1], [xSw0 + Lsw * Math.cos(th), y1 - Lsw * Math.sin(th)]], C.ink, 2.6);
          P.ring(xSw0, y1, 3.4, C.ink); P.ring(xSw1, y1, 3.4, C.ink);
          rich("S", (xSw0 + xSw1) / 2, y1 + 17, C.ink, { size: 14, weight: 700, align: "center" });

          /* R */
          ctx.lineWidth = 2; ctx.strokeStyle = ink; ctx.fillStyle = C.bg;
          ctx.beginPath(); ctx.rect(xR0, y1 - 7, Rw, 14); ctx.fill(); ctx.stroke();
          rich("R", (xR0 + xR1) / 2, y1 + 18, C.ink, { size: 14, weight: 700, align: "center" });

          /* จุดต่อ */
          wire([[xn, y1], [xn, y1 + 28]]);
          P.dot(xn, y1, 3.8, C.ink); P.dot(xn, y2, 3.8, C.ink);

          /* กิ่ง L อนุกรม R₁ */
          const lya = y1 + 28, lyb = y1 + 52, rya = y1 + 55, ryb = y1 + 75;
          ctx.save(); ctx.globalAlpha = 1 - 0.8 * eq;
          ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xn, lya);
          for (let k = 0; k < 4; k++) ctx.ellipse(xn, lya + (lyb - lya) / 4 * (k + 0.5), 7, (lyb - lya) / 8, 0, -Math.PI / 2, Math.PI / 2, false);
          ctx.stroke();
          ctx.restore();
          if (eq > 0.01) { ctx.save(); ctx.globalAlpha = eq; wire([[xn, lya], [xn, lyb]], C.deep, 3.4); ctx.restore(); }
          wire([[xn, lyb], [xn, rya]]);
          ctx.lineWidth = 2; ctx.strokeStyle = ink; ctx.fillStyle = C.bg;
          ctx.beginPath(); ctx.rect(xn - 5, rya, 10, ryb - rya); ctx.fill(); ctx.stroke();
          wire([[xn, ryb], [xn, y2 - 15]]);
          const lLab = 1 - eq;
          if (lLab > 0.01) { ctx.save(); ctx.globalAlpha = lLab; rich("L", xn + 14, lya + 12, C.ink, { size: 14, weight: 700 }); ctx.restore(); }
          if (eq > 0.01) { ctx.save(); ctx.globalAlpha = eq; rich("L = ลวด", xn + 14, lya + 12, C.deep, { size: 12.5, weight: 700 }); ctx.restore(); }
          rich("R_{1}", xn + 13, (rya + ryb) / 2, C.ink, { size: 14, weight: 700 });

          /* กิ่ง C */
          const cy1 = ym - 4, cy2 = ym + 4;
          ctx.save(); ctx.globalAlpha = 1 - 0.7 * eq;
          wire([[xc - 13, cy1], [xc + 13, cy1]], ink, 2.8); wire([[xc - 13, cy2], [xc + 13, cy2]], ink, 2.8);
          ctx.restore();
          if (s5 > 0.01) { ctx.save(); ctx.globalAlpha = s5; wire([[xc, cy1], [xc, cy2]], C.lin, 3.6); ctx.restore(); }
          const cLab = 1 - Math.max(eq, s5);
          if (cLab > 0.01) { ctx.save(); ctx.globalAlpha = cLab; rich("C", xc + 18, ym, C.ink, { size: 14, weight: 700 }); ctx.restore(); }
          if (eq > 0.01) { ctx.save(); ctx.globalAlpha = eq; rich("C = เปิด", xc + 18, ym, C.deep, { size: 12.5, weight: 700 }); ctx.restore(); }
          if (s5 > 0.01) { ctx.save(); ctx.globalAlpha = s5; rich("ลัดวงจร", xc + 18, ym, C.lin, { size: 12.5, weight: 700 }); ctx.restore(); }

          /* ลูกศรกระแส (ไล่สีตามเส้นกราฟ) */
          const ca = 0.3 + 0.7 * closed;
          const noI3 = eq;                                    // สภาวะคงตัว: i₃ = 0
          ctx.save(); ctx.globalAlpha = ca;
          const xa = xR1 + 6;
          P.arrow(xa, y1 - 11, xa + 24, y1 - 11, cI1, 2.2, 8);
          P.arrow(xn - 10, y1 + 5, xn - 10, y1 + 24, cI2, 2.2, 8);
          ctx.restore();
          ctx.save(); ctx.globalAlpha = ca * (1 - 0.75 * noI3);
          P.arrow(xc - 10, y1 + 5, xc - 10, y1 + 24, cI3, 2.2, 8);
          ctx.restore();
          const lab1 = 1 - s5;
          if (lab1 > 0.01) {
            ctx.save(); ctx.globalAlpha = lab1;
            rich("i_{1}", xa + 12, y1 - 24, cI1, { size: 14, weight: 700, align: "center" });
            rich("i_{3}", xc - 17, y1 + 14, cI3, { size: 14, weight: 700, align: "right" });
            ctx.restore();
          }
          if (s5 > 0.01) {
            ctx.save(); ctx.globalAlpha = s5;
            rich("i_{1} = " + nf(i0, 0) + " А", xa + 12, y1 - 25, cI1, { size: 12.5, weight: 700, align: "center" });
            rich("i_{3} = " + nf(i0, 0) + " А", xc - 17, y1 + 14, cI3, { size: 12.5, weight: 700, align: "right" });
            ctx.restore();
          }
          rich("i_{2}", xn - 17, y1 + 14, cI2, { size: 14, weight: 700, align: "right" });

          /* แถวค่าองค์ประกอบ */
          rich("U = " + nf(U, 0) + " В · R = " + nf(R, 0) + " Ом · C = " + nf(CAP * 1e6, 0) + " мкФ", W / 2, 146, C.ink2, { size: 12.5, weight: 500, align: "center", halo: 0 });
          rich("L = " + nf(L, 1) + " Гн · R_{1} = " + nf(R1, 0) + " Ом (คำนวณจาก (1.8))", W / 2, 163, C.deep, { size: 12.5, weight: 600, align: "center", halo: 0 });
        }

        /* ============================ ล่าง: กราฟ ============================ */
        const pl = narrow ? 42 : 56, pr = narrow ? 44 : 58;
        const pt = cH + 30, pb = H - (narrow ? 40 : 44);
        const X = t => pl + t / TG * (W - pl - pr);
        const Mx = s => (s >= 5 ? 1 : 0);
        const mix = Mx(anim.from) + (Mx(step) - Mx(anim.from)) * anim.e;
        const lLo = lerp(0, -2, mix), lHi = lerp(2, 11, mix), rLo = lerp(0, -20, mix), rHi = lerp(120, 110, mix);
        const YL = v => pb - (v - lLo) / (lHi - lLo) * (pb - pt);
        const YR = v => pb - (v - rLo) / (rHi - rLo) * (pb - pt);
        const gridA = Math.max(scene(0, 1), scene(3, 5));
        const gx = (x0, y0, x1, y1) => { ctx.moveTo(Math.round(x0) + 0.5, Math.round(y0) + 0.5); ctx.lineTo(Math.round(x1) + 0.5, Math.round(y1) + 0.5); };

        /* ตาราง */
        ctx.save();
        ctx.lineWidth = 1; ctx.strokeStyle = C.grid;
        ctx.beginPath();
        for (let t = 0; t <= 10.01; t += 2) gx(X(t * 1e-3), pt, X(t * 1e-3), pb);
        ctx.stroke();
        const tkA = [0, 0.5, 1, 1.5, 2], tkB = [-2, 0, 2, 4, 6, 8, 10];
        [[tkA, 1 - mix, 60], [tkB, mix, 10]].forEach(g => {
          if (g[1] * gridA < 0.01) return;
          ctx.globalAlpha = g[1] * gridA;
          ctx.beginPath(); g[0].forEach(v => gx(pl, YL(v), W - pr, YL(v))); ctx.stroke();
          g[0].forEach(v => {
            P.label(nf(v, v % 1 ? 1 : 0), pl - 6, YL(v), C.ink3, { size: 11.5, weight: 500, align: "right", mono: true, halo: 0 });
            P.label(nf(v * g[2], 0), W - pr + 6, YL(v), C.ink3, { size: 11.5, weight: 500, mono: true, halo: 0 });
          });
        });
        ctx.restore();
        ctx.strokeStyle = C.ink3; ctx.lineWidth = 1.1; ctx.globalAlpha = 0.55;
        ctx.strokeRect(pl + 0.5, pt + 0.5, W - pl - pr, pb - pt); ctx.globalAlpha = 1;
        if (mix * gridA > 0.01) { ctx.save(); ctx.globalAlpha = mix * gridA; P.seg([[pl, YL(0)], [W - pr, YL(0)]], C.ink3, 1.4); ctx.restore(); }
        for (let t = 0; t <= 10.01; t += 2) P.label(String(t), X(t * 1e-3), pb + 13, C.ink3, { size: 11.5, weight: 500, align: "center", mono: true, halo: 0 });
        P.label("t, мс", W - pr, pb + 29, C.ink3, { size: 11.5, weight: 500, align: "right", halo: 0 });
        if (gridA > 0.01) {
          ctx.save(); ctx.globalAlpha = gridA;
          P.label("i, А", pl, pt - 13, C.ink2, { size: 12.5 });
          rich("u_{C}, В", W - pr, pt - 13, cUC, { size: 12.5, align: "right" });
          ctx.restore();
        }

        /* เส้นระดับคงตัว */
        const asy = Math.max(scene(1, 1), 0.65 * scene(3, 5));
        if (asy > 0.01) {
          ctx.save(); ctx.beginPath(); ctx.rect(pl, pt, W - pl - pr, pb - pt); ctx.clip();
          ctx.globalAlpha = asy;
          P.seg([[pl, YL(ip)], [W - pr, YL(ip)]], C.ink2, 1.5, [6, 4]);
          P.seg([[pl, YR(up)], [W - pr, YR(up)]], cUC, 1.5, [6, 4]);
          ctx.restore();
        }
        const s1 = scene(1, 1);
        if (s1 > 0.01) {
          ctx.save(); ctx.globalAlpha = s1;
          rich("i_{1пр} = i_{2пр} = " + nf(ip, 3) + " А", pl + 8, YL(ip) - 13, C.ink2, { size: 12.5, weight: 700 });
          rich("u_{Cпр} = " + nf(up, 2) + " В", pl + 8, YR(up) + 14, cUC, { size: 12.5, weight: 700 });
          rich("i_{3пр} = 0", pl + 8, YL(0) - 13, cI3, { size: 12.5, weight: 700 });
          P.label("t → ∞", W - pr - 6, YL(0.45), C.ink3, { size: 12.5, align: "right" });
          ctx.restore();
        }

        /* ขั้น 1: ก่อนสับ */
        const s0 = scene(0, 0);
        if (s0 > 0.01) {
          ctx.save(); ctx.globalAlpha = s0;
          P.seg([[pl, YL(0)], [W - pr, YL(0)]], C.ink3, 3);
          P.label("t < 0 : ทุกกระแส = 0 และ u_C = 0", W / 2, pt + (pb - pt) * 0.45, C.ink2, { size: 13.5, align: "center" });
          P.label("ยังไม่สับสวิตช์ — กราฟรอเส้น", W / 2, pt + (pb - pt) * 0.45 + 24, C.ink3, { size: 12.5, weight: 500, align: "center" });
          ctx.restore();
        }

        /* ขั้น 3: เส้นจำนวนของ p + ค่าคงตัวเวลา */
        const sp = scene(2, 2);
        if (sp > 0.01) {
          ctx.save(); ctx.globalAlpha = sp;
          const pmax = 5600, x0 = pl + 4, x1 = W - pr - 10;
          const Xp = p => x0 + (p + pmax) / pmax * (x1 - x0);
          const yl = pt + 74;
          P.arrow(x0 - 2, yl, W - pr - 2, yl, C.ink3, 1.6, 8);
          const tk = narrow ? 2000 : 1000;
          for (let v = -4 * 1000; v <= 0; v += tk) {
            P.seg([[Xp(v), yl - 4], [Xp(v), yl + 4]], C.ink3, 1.3);
            P.label(nf(v, 0), Xp(v), yl + 17, C.ink3, { size: 11, weight: 500, align: "center", mono: true, halo: 0 });
          }
          P.label("p, с⁻¹ (แกนจริง)", x0, pt + 14, C.ink2, { size: 12.5 });
          P.seg([[Xp(0), yl - 46], [Xp(0), yl + 30]], C.ink3, 1.2, [3, 4]);
          P.label("Im p = 0", Xp(0) - 6, pt + 30, C.ok, { size: 12, align: "right" });
          P.dot(Xp(p2), yl, 6, cI1); P.dot(Xp(p1), yl, 6, cI2);
          rich("p_{2} = " + nf(p2, 0), Xp(p2) + 4, yl - 24, cI1, { size: 13, weight: 700, align: "center" });
          rich("p_{1} = " + nf(p1, 0), Xp(p1) - 4, yl - 24, cI2, { size: 13, weight: 700, align: "center" });
          P.label("รากจริงสองค่า ไม่มีส่วนจินตภาพ → ไม่แกว่ง", W / 2, yl + 42, C.ok, { size: 12.5, align: "center" });
          /* แถบ τ บนมาตราเวลาเดียวกับกราฟ */
          const yb1 = yl + 100, yb2 = yb1 + 34, bh = 14;
          P.label("τ = 1/|p| บนแกนเวลา (мс) เดียวกับกราฟ", pl, yb1 - 28, C.ink2, { size: 12.5 });
          ctx.fillStyle = cI2; ctx.fillRect(X(0), yb1 - bh / 2, X(tau1) - X(0), bh);
          ctx.fillStyle = cI1; ctx.fillRect(X(0), yb2 - bh / 2, X(tau2) - X(0), bh);
          rich("τ_{1} = " + ms(tau1) + " мс (ช้า)", X(tau1) + 8, yb1, cI2, { size: 12.5, weight: 700 });
          rich("τ_{2} = " + ms(tau2) + " мс (เร็ว)", Math.max(X(tau2) + 8, X(tau1) + 8 - 70), yb2, cI1, { size: 12.5, weight: 700 });
          ctx.restore();
        }

        /* เส้นกราฟ */
        const dimOld = 1 - 0.4 * mix;
        const curve = (fn, ymap, color, wd, frac, alpha) => {
          if (frac <= 0.001) return;
          const pts = [], n = 520, m = Math.max(1, Math.floor(n * frac));
          for (let k = 0; k <= m; k++) { const t = TG * k / n; pts.push([X(t), ymap(fn(t))]); }
          ctx.save(); ctx.beginPath(); ctx.rect(pl, pt, W - pl - pr, pb - pt); ctx.clip();
          P.seg(pts, color, wd, [], alpha);
          ctx.restore();
        };
        curve(i2f, YL, cI2, 2.8 - 0.8 * mix, rv(3), dimOld);
        curve(ucf, YR, cUC, 2.8 - 0.8 * mix, rv(4), dimOld);
        curve(i3f, YL, cI3, 2.8, rv(5), 1);
        curve(i1f, YL, cI1, 2.8, rv(5), 1);

        /* ขั้น 4: เงื่อนไขเริ่มต้น */
        const s3 = scene(3, 3);
        if (s3 > 0.01) {
          ctx.save(); ctx.globalAlpha = s3;
          P.seg([[X(0), YL(0)], [X(1.5e-3), YL(0)]], C.deep, 1.8, [5, 3]);
          P.ring(X(0), YL(0), 5, C.deep);
          rich("i₂(0) = 0 และ i₂′(0) = 0", X(1.9e-3), YL(0.34), C.deep, { size: 12.5, weight: 700 });
          rich("u_{C}(0) = 0", X(1.9e-3), YL(0.34) + 17, C.deep, { size: 12.5, weight: 700 });
          rich("i_{2} → " + nf(ip, 3) + " А", W - pr - 6, YL(ip) + 15, cI2, { size: 12.5, weight: 700, align: "right" });
          ctx.restore();
        }

        /* ขั้น 5: ยอดของ u_C */
        const s4 = scene(4, 4);
        if (s4 > 0.01) {
          ctx.save(); ctx.globalAlpha = s4 * clamp01((rv(4) - 0.2) / 0.8);
          const px = X(tMax), py = YR(ucMax);
          P.seg([[px, py], [px, pb]], C.deep, 1.3, [3, 4]);
          P.dot(px, py, 5.5, cUC);
          rich("u_{C,max} = " + nf(ucMax, 2) + " В", px + 11, py - 15, cUC, { size: 12.5, weight: 700 });
          rich("t = " + ms(tMax, 3) + " мс", px + 7, pb - 13, C.deep, { size: 12, weight: 600 });
          rich("u_{Cпр} = " + nf(up, 2) + " В", W - pr - 6, YR(up) + 14, cUC, { size: 12.5, weight: 700, align: "right" });
          rich("i_{2} → " + nf(ip, 3) + " А (ไม่เกิน)", W - pr - 6, YL(ip) - 13, cI2, { size: 12.5, weight: 700, align: "right" });
          ctx.restore();
        }

        /* ขั้น 6: i₁ i₃ */
        const s5 = scene(5, 5);
        if (s5 > 0.01) {
          ctx.save(); ctx.globalAlpha = s5 * clamp01((rv(5) - 0.15) / 0.85);
          ctx.fillStyle = C.ref; ctx.globalAlpha *= 0.14;
          ctx.fillRect(X(0), YL(ip * 1.05), X(TG) - X(0), YL(ip * 0.95) - YL(ip * 1.05));
          ctx.restore();
          ctx.save(); ctx.globalAlpha = s5 * clamp01((rv(5) - 0.3) / 0.7);
          P.seg([[X(tS), pt], [X(tS), pb]], C.deep, 1.5, [5, 4]);
          rich("ทุกกระแสอยู่ใน ±5 %", X(tS) + 7, pt + 14, C.deep, { size: 12.5, weight: 700 });
          rich("ตั้งแต่ t = " + ms(tS) + " мс", X(tS) + 7, pt + 31, C.deep, { size: 12.5, weight: 700 });
          P.dot(X(0), YL(i0), 5, cI1);
          rich("t = 0⁺ : i_{1} = i_{3} = " + nf(i0, 0) + " А", X(0) + 18, YL(i0) + 9, C.ink, { size: 12.5, weight: 700 });
          P.dot(X(tI3), YL(i3Min), 4.5, cI3);
          rich("i_{3} ต่ำสุด " + nf(i3Min, 2) + " А", X(tI3) + 9, YL(i3Min) + 14, cI3, { size: 12, weight: 700 });
          rich("i_{1} → " + nf(ip, 3) + " А", W - pr - 6, YL(ip) - 13, cI1, { size: 12.5, weight: 700, align: "right" });
          rich("i_{3} → 0", W - pr - 6, YL(0) - 12, cI3, { size: 12.5, weight: 700, align: "right" });
          ctx.restore();
        }
      }
    });
  }
});
/* --- toe5-modes.js --- */
/* toe5-modes — เลือก R: ไม่แกว่ง วิกฤต หรือแกว่ง (วงจรลำดับที่สองของงานประจำวิชา вариант 1489 · U → S → R → [(L + R₁) ∥ C])
   สูตร: курсовая работа (1.5)–(1.10) · ผู้เรียบเรียงทำ
   ใช้: a = RCL · b = RR₁C + L · c = R + R₁ · D(R) = b² − 4ac = (R₁²C² − 4CL)R² − 2R₁CL·R + L² · R_кр = รากบวกของ D(R) = 0
        u_C ตอบสนองต่อสมการ a·u″ + b·u′ + c·u = R₁U · u(0) = 0 · u′(0) = U/(RC) · u_Cпр = U·R₁/(R + R₁)
        รากจริง: u = u_пр + B₁e^{p₁t} + B₂e^{p₂t}, B₁ = (V₀ + p₂u_пр)/(p₁ − p₂), B₂ = −(V₀ + p₁u_пр)/(p₁ − p₂)
        รากซ้ำ: u = u_пр + (−u_пр + (V₀ + p·u_пр)t)e^{pt}
        รากเชิงซ้อน: u = u_пр + e^{αt}(−u_пр·cos ωt + (V₀ + α·u_пр)/ω · sin ωt)   (V₀ = U/(RC))
        ξ = b/(2√(ac)) (ξ = 1 ⇔ D = 0) · RLC อนุกรม L, C เดียวกัน: ξ = (R/2)√(C/L)
   ค่าอ้างอิง (ตรวจด้วย python เทียบกับ RK4): R_кр = 26,1204 Ом · R = 10: p = −614, −4886 · u_Cпр = 83,33 · ยอด 94,577 В ที่ 0,854 мс
        R = R_кр: p = −1207,11 · u_Cпр = 65,685 · ยอด 82,535 В ที่ 1,414 мс
        R = 40: α = −875 ω = 599,48 · u_Cпр = 55,556 · ยอด 73,497 В ที่ 1,688 мс · ต่ำสุดหลังยอด 55,373 В ที่ 6,93 мс
        สูตร (1.7) ที่พิมพ์ในงาน (R₁C² แทน R₁²C²) ให้ 25,02 Ом ตรงกับ «r = 25 Ом» ในงาน
   ส่วนของผู้เรียบเรียง (บอกบนจอ): L = 0,1 Гн และ R₁ = 50 Ом (จาก (1.8)) · R_кр · กรณี R = 26,1 / 40 Ом · ξ และการเทียบกับ RLC อนุกรม · ภาพทั้งหมด */
Object.assign(DEMOS, {
  "toe5-modes": function (host) {
    const nf = window.STEPS2.nf;

    /* ---------- ข้อมูลและตัวเลข (คำนวณสดจากสูตร) ---------- */
    const U = 100, CAP = 20e-6, R10 = 10, R40 = 40;
    const K_A = 2e-5, K_C = 60;                          // สัมประสิทธิ์ใน (1.8) ที่ R = 10: RCL และ R + R₁
    const L = K_A / (R10 * CAP), R1 = K_C - R10;         // ผู้เรียบเรียงคำนวณ
    const coef = Rv => ({ a: Rv * CAP * L, b: Rv * R1 * CAP + L, c: Rv + R1 });
    const Dof = Rv => { const k = coef(Rv); return k.b * k.b - 4 * k.a * k.c; };
    const zf = Rv => { const k = coef(Rv); return k.b / (2 * Math.sqrt(k.a * k.c)); };      // สัมประสิทธิ์หน่วง วงจรนี้
    const zs = Rv => Rv / 2 * Math.sqrt(CAP / L);                                        // RLC อนุกรม L, C เดียวกัน
    let lo = R10, hi = 60;                                // R_кр: รากบวกของ D(R) = 0 (D(10) > 0 > D(60))
    for (let k = 0; k < 100; k++) { const m = (lo + hi) / 2; if (Dof(m) > 0) lo = m; else hi = m; }
    const Rcr = (lo + hi) / 2;
    const k2 = R1 * R1 * CAP * CAP - 4 * CAP * L, k1 = -2 * R1 * CAP * L, k0 = L * L;       // D(R) = k2·R² + k1·R + k0
    const k2t = R1 * CAP * CAP - 4 * CAP * L;             // สูตร (1.7) ตามที่พิมพ์ในงาน: R₁C² แทน R₁²C²
    const Rtyped = (-k1 - Math.sqrt(k1 * k1 - 4 * k2t * k0)) / (2 * k2t);

    /* u_C(t) จากเงื่อนไขเริ่มต้นศูนย์: u(0) = 0, u′(0) = U/(RC) */
    function model(Rv, kind) {
      const k = coef(Rv), D = k.b * k.b - 4 * k.a * k.c, up = U * R1 / k.c, V0 = U / (Rv * CAP);
      const m = { R: Rv, kind, up, V0, D, a: k.a, b: k.b, c: k.c };
      if (kind === "real") {
        const s = Math.sqrt(D);
        m.p1 = (-k.b + s) / (2 * k.a); m.p2 = (-k.b - s) / (2 * k.a);
        m.B1 = (V0 + m.p2 * up) / (m.p1 - m.p2); m.B2 = -(V0 + m.p1 * up) / (m.p1 - m.p2);
        m.f = t => up + m.B1 * Math.exp(m.p1 * t) + m.B2 * Math.exp(m.p2 * t);
      } else if (kind === "rep") {
        m.p = -k.b / (2 * k.a); m.B1 = -up; m.B2 = V0 + m.p * up;
        m.f = t => up + (m.B1 + m.B2 * t) * Math.exp(m.p * t);
      } else {
        m.al = -k.b / (2 * k.a); m.w = Math.sqrt(-D) / (2 * k.a);
        m.B1 = -up; m.B2 = (V0 + m.al * up) / m.w;
        m.f = t => up + Math.exp(m.al * t) * (m.B1 * Math.cos(m.w * t) + m.B2 * Math.sin(m.w * t));
        m.env = Math.hypot(m.B1, m.B2);
      }
      let mx = -1, tm = 0;
      for (let q = 0; q <= 3000; q++) { const t = q * 5e-6, v = m.f(t); if (v > mx) { mx = v; tm = t; } }
      let g0 = Math.max(0, tm - 1e-5), g1 = tm + 1e-5;        // ปรับยอดให้แม่นด้วย golden-section
      for (let q = 0; q < 60; q++) { const c1 = g1 - 0.6180339887 * (g1 - g0), c2 = g0 + 0.6180339887 * (g1 - g0); if (m.f(c1) < m.f(c2)) g0 = c1; else g1 = c2; }
      m.tMax = (g0 + g1) / 2; m.max = m.f(m.tMax);
      return m;
    }
    const M = [model(R10, "real"), model(Rcr, "rep"), model(R40, "cplx")];
    const m40 = M[2];
    let tCross = 0, uMin = 1e9, tMin = 0;                  // หลังยอด: ข้ามค่าคงตัวลงมาและต่ำสุด (เฉพาะ R = 40)
    for (let q = Math.round(m40.tMax / 5e-6); q <= 3000; q++) {
      const t = q * 5e-6, v = m40.f(t);
      if (!tCross && v < m40.up) {                        // จุดข้ามค่าคงตัว: แบ่งครึ่งระหว่างก้าวก่อนหน้ากับก้าวนี้
        let u0 = t - 5e-6, u1 = t;
        for (let w = 0; w < 50; w++) { const mm = (u0 + u1) / 2; if (m40.f(mm) > m40.up) u0 = mm; else u1 = mm; }
        tCross = (u0 + u1) / 2;
      }
      if (tCross && v < uMin) { uMin = v; tMin = t; }
    }
    const z10 = zf(R10), zcr = zf(Rcr), z40 = zf(R40), zinf = R1 / 2 * Math.sqrt(CAP / L), Rser = 2 * Math.sqrt(L / CAP);
    const TMAX = 0.015;                                    // แกนเวลา 0…15 мс

    const SUP = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
    function sci(x, d) {
      const e = Math.floor(Math.log10(Math.abs(x)) + 1e-9);
      const m = nf(Math.abs(x) / Math.pow(10, e), d || 0);
      return (x < 0 ? "−" : "") + (m === "1" ? "" : m + "·") + "10" + String(e).split("").map(ch => SUP[ch]).join("");
    }
    const ms = (t, d) => nf(t * 1000, d === undefined ? 2 : d);
    const ED = '<span class="ed">ผู้เรียบเรียงคำนวณ</span>';
    const sb = (s, t) => s + "<sub>" + t + "</sub>";
    const UCP = sb("u", "Cпр");
    const rootsRe = m => "p₁ = " + nf(m.p1, 0) + " · p₂ = " + nf(m.p2, 0) + " с⁻¹";

    /* MathML ย่อ */
    const mi = s => "<mi>" + s + "</mi>", mn = s => "<mn>" + s + "</mn>", mo = s => "<mo>" + s + "</mo>";
    const msub = (x, y) => "<msub>" + x + y + "</msub>", msup = (x, y) => "<msup>" + x + y + "</msup>";
    const mrow = (...z) => "<mrow>" + z.join("") + "</mrow>";
    const mfrac = (x, y) => "<mfrac>" + x + y + "</mfrac>";
    const msqrt = x => "<msqrt>" + x + "</msqrt>";
    const mt = s => "<math>" + s + "</math>";
    const mR1 = msub(mi("R"), mn("1"));
    const F = {
      D: mt(mi("D") + mo("(") + mi("R") + mo(")") + mo("=") + msup(mrow(mo("("), mi("R"), mR1, mi("C"), mo("+"), mi("L"), mo(")")), mn("2")) +
        mo("−") + mn("4") + mi("R") + mi("C") + mi("L") + mrow(mo("("), mi("R"), mo("+"), mR1, mo(")"))),
      zeta: mt(mi("ξ") + mo("=") + mfrac(mi("b"), mrow(mn("2"), msqrt(mi("a") + mi("c")))))
    };
    const fmtPoly = () => sci(k2, 0) + "·R² " + (k1 < 0 ? "−" : "+") + " " + sci(Math.abs(k1), 0) + "·R " + (k0 < 0 ? "−" : "+") + " " + nf(Math.abs(k0), 2);

    const STEPS = [
      { title: "ดิสคริมิแนนต์เป็นฟังก์ชันของ R",
        text: "ชนิดของการตอบสนองขึ้นกับเครื่องหมายของดิสคริมิแนนต์ (дискриминант) D = b² − 4ac ของสมการลักษณะเฉพาะ a·p² + b·p + c = 0 · " +
          "ในวงจรนี้ a = RCL, b = RR₁C + L, c = R + R₁ จึงขึ้นกับ R · D(R) เป็นพาราโบลาคว่ำ: D &gt; 0 เมื่อ R &lt; R<sub>кр</sub> รากเป็นจำนวนจริงต่างกัน ไม่แกว่ง · " +
          "D &lt; 0 เมื่อ R &gt; R<sub>кр</sub> รากเป็นคู่เชิงซ้อน แกว่ง · R<sub>кр</sub> คือรากบวกของ D(R) = 0 " + ED + " (L = " + nf(L, 1) + " Гн, R₁ = " + nf(R1, 0) + " Ом จาก (1.8) " + ED + ")",
        alt: "กราฟ D ของ R ช่วง 0 ถึง 60 โอห์ม เป็นพาราโบลาคว่ำ ตัดศูนย์ที่ประมาณ 26,1 โอห์ม ด้านซ้ายพื้นเขียวคือไม่แกว่ง ด้านขวาพื้นชมพูคือแกว่ง กราฟล่างยังว่าง",
        nums: [
          { k: "ดิสคริมิแนนต์ของ (1.6)", v: [F.D, "= " + fmtPoly() + " (Гн²)"] },
          { k: "R<sub>кр</sub> = รากบวกของ D(R) = 0", v: "R<sub>кр</sub> = " + nf(Rcr, 2) + " Ом", big: true,
            note: "สูตร (1.7) ที่พิมพ์ในงานใช้ R₁C² แทน R₁²C² จึงได้ " + nf(Rtyped, 2) + " Ом ซึ่งตรงกับ «r = 25 Ом» ในงาน · «R<sub>кр</sub> ≈ … Ом» ในงานไม่มีตัวเลข" }
        ] },
      { title: "R = " + nf(R10, 0) + " Ом (ค่าของงาน)",
        text: "D = " + nf(M[0].D, 4) + " &gt; 0 รากจริงต่างกัน (действительные и различные) ผลตอบสนองจึงเป็นผลรวมของเอ็กซ์โพเนนเชียลสองตัว · " +
          "ที่ t = 0⁺ ตัวเก็บประจุลัดวงจร i₃ = U/R จึงได้ u<sub>C</sub>′(0) = U/(RC) = " + sci(M[0].V0, 0) + " В/с · " +
          "u<sub>C</sub> พุ่งขึ้นเกินค่าคงตัว " + nf(M[0].up, 2) + " В ถึงยอด " + nf(M[0].max, 2) + " В ที่ " + ms(M[0].tMax, 3) + " мс แล้วลดลงโดยไม่ข้ามค่าคงตัวอีก — ไม่แกว่ง · " +
          "ค่า u<sub>C</sub>′(0) และยอด " + ED,
        alt: "กราฟ D ของ R มีจุดที่ R เท่ากับ 10 โอห์มในบริเวณสีเขียว กราฟล่างเส้น u_C ของ R เท่ากับ 10 พุ่งถึงประมาณ 94,6 โวลต์แล้วลดลงสู่ 83,33 โวลต์ไม่แกว่ง",
        nums: [
          { k: "ราก (D = " + nf(M[0].D, 4) + " > 0)", v: rootsRe(M[0]), big: true },
          { k: "ค่าคงตัวใหม่", v: UCP + " = U·R₁/(R + R₁) = " + nf(M[0].up, 2) + " В" },
          { k: "ยอดของ u<sub>C</sub>", v: nf(M[0].max, 2) + " В ที่ " + ms(M[0].tMax, 3) + " мс" }
        ] },
      { title: "R = R<sub>кр</sub> ≈ " + nf(Rcr, 1) + " Ом",
        text: "D = 0 รากซ้ำ (кратные корни) p = −b/(2a) = " + nf(M[1].p, 0) + " с⁻¹ · รูปคำตอบเปลี่ยนเป็น " + UCP + " + (B₁ + B₂t)e<sup>pt</sup> ไม่ใช่ผลรวมของสองเอ็กซ์โพเนนเชียลอีกต่อไป · " +
          "นี่คือขอบระหว่างสองแบบ ยังไม่แกว่ง · ค่าคงตัวใหม่เปลี่ยนเป็น " + nf(M[1].up, 2) + " В เพราะ R เปลี่ยน ยอดอยู่ที่ " + nf(M[1].max, 2) + " В ที่ " + ms(M[1].tMax, 3) + " мс · " +
          "ค่า R<sub>кр</sub> และกรณีนี้ " + ED,
        alt: "จุดบนกราฟ D ที่ศูนย์พอดีที่ R ประมาณ 26,1 โอห์ม กราฟล่างเพิ่มเส้นสีส้มของ R เท่ากับ R_кр ยอดต่ำกว่าเส้นของ R เท่ากับ 10 และค่าคงตัวต่ำลงเหลือ 65,7 โวลต์",
        nums: [
          { k: "รากซ้ำ (D = 0)", v: "p = −b/(2a) = " + nf(M[1].p, 0) + " с⁻¹", big: true },
          { k: "ค่าคงตัว B₁, B₂", v: ["B₁ = −" + UCP + " = " + nf(M[1].B1, 2) + " В", "B₂ = u<sub>C</sub>′(0) + p·" + UCP + " = " + sci(M[1].B2, 2) + " В/с"] },
          { k: "ค่าคงตัวใหม่ · ยอด", v: UCP + " = " + nf(M[1].up, 2) + " В · " + nf(M[1].max, 2) + " В ที่ " + ms(M[1].tMax, 3) + " мс" }
        ] },
      { title: "R = " + nf(R40, 0) + " Ом",
        text: "D = " + nf(m40.D, 4) + " &lt; 0 รากเป็นคู่เชิงซ้อน (комплексно-сопряжённые) p = α ± jω = " + nf(m40.al, 0) + " ± j" + nf(m40.w, 0) + " с⁻¹ · " +
          "คำตอบคือ " + UCP + " + e<sup>αt</sup>(B₁cos ωt + B₂sin ωt) แกว่งลู่เข้า · ยอด " + nf(m40.max, 2) + " В ที่ " + ms(m40.tMax, 3) + " мс แล้วข้ามค่าคงตัวลงมาที่ " + ms(tCross) +
          " мс ต่ำสุด " + nf(uMin, 2) + " В (ต่ำกว่าค่าคงตัว " + nf(m40.up - uMin, 2) + " В) · แกว่งเบามากเพราะหน่วงใกล้ขอบ เส้นประคือซอง " + UCP + " ± A·e<sup>αt</sup> · " +
          "ค่าคงตัว U·R₁/(R + R₁) ลดลงตาม R: " + nf(M[0].up, 2) + " → " + nf(M[1].up, 2) + " → " + nf(m40.up, 2) + " В · กรณีนี้และตัวเลขทั้งหมด " + ED,
        alt: "เส้นสีชมพูของ R เท่ากับ 40 โอห์มพุ่งถึงประมาณ 73,5 โวลต์ แล้วลงสู่ 55,56 โวลต์ ข้ามเส้นค่าคงตัวที่ 5,9 มิลลิวินาที มีเส้นประซองสลายล้อมรอบ เส้นประค่าคงตัวสามระดับต่างกัน",
        nums: [
          { k: "รากเชิงซ้อน (D = " + nf(m40.D, 4) + " < 0)", v: "p = " + nf(m40.al, 0) + " ± j" + nf(m40.w, 0) + " с⁻¹", big: true },
          { k: "คาบการแกว่ง · ซอง", v: "T = 2π/ω = " + ms(2 * Math.PI / m40.w) + " мс · A = " + nf(m40.env, 1) + " В" },
          { k: "หลังยอด", v: "ข้ามค่าคงตัวที่ " + ms(tCross) + " мс · ต่ำสุด " + nf(uMin, 2) + " В ที่ " + ms(tMin) + " мс" },
          { k: "ค่าคงตัวใหม่ตาม R", v: "R = 10 / " + nf(Rcr, 1) + " / 40 Ом → " + nf(M[0].up, 2) + " / " + nf(M[1].up, 2) + " / " + nf(m40.up, 2) + " В" }
        ] },
      { title: "สรุปกับดัก: R ใหญ่ทำให้แกว่ง",
        text: "วัดความแกว่งด้วยสัมประสิทธิ์หน่วง (коэффициент демпфирования) ξ = b/(2√(ac)) · ξ &gt; 1 ไม่แกว่ง, ξ = 1 คือ R<sub>кр</sub>, ξ &lt; 1 แกว่ง · " +
          "ในวงจรนี้ R ใหญ่ขึ้นแล้ว ξ <b>ลดลง</b>: " + nf(z10, 2) + " → " + nf(zcr, 2) + " → " + nf(z40, 2) + " ที่ R = 10 / " + nf(Rcr, 1) + " / 40 Ом · " +
          "เมื่อ U = 0 ตัว R จะอยู่ขนานกับกิ่ง L–R₁ และกิ่ง C เหมือน RLC ขนาน R ใหญ่ขึ้นยิ่งถ่ายพลังงานออกน้อย การแกว่งดับช้า<br>" +
          "RLC อนุกรมตรงข้าม: R ใหญ่ขึ้น ξ เพิ่ม จึงไม่แกว่ง (ξ = 1 ที่ R = 2√(L/C) = " + nf(Rser, 1) + " Ом เมื่อใช้ L, C เท่ากันนี้) — อย่านำสัญชาตญาณของ RLC อนุกรมมาใช้กับวงจรนี้ · การเทียบนี้ " + ED,
        alt: "กราฟ ξ ของ R ช่วง 0 ถึง 160 โอห์ม เส้นของวงจรนี้ลดลงจากสูงไปต่ำตัดเส้น ξ เท่ากับ 1 ที่ 26,1 โอห์ม เส้นประของ RLC อนุกรมเพิ่มขึ้นจากศูนย์ ตัดเส้น 1 ที่ 141 โอห์ม",
        nums: [
          { k: "สัมประสิทธิ์หน่วง " + F.zeta, v: ["R = 10 Ом: ξ = " + nf(z10, 2), "R = " + nf(Rcr, 1) + " Ом: ξ = " + nf(zcr, 2), "R = 40 Ом: ξ = " + nf(z40, 2)], big: true },
          { k: "R → ∞ (เหลือแต่ R₁ หน่วง)", v: "ξ → (R₁/2)·√(C/L) = " + nf(zinf, 3) },
          { k: "RLC อนุกรม L, C เดียวกัน (เทียบ)", v: "ξ = (R/2)·√(C/L) เพิ่มตาม R · ξ = 1 ที่ R = " + nf(Rser, 1) + " Ом" }
        ] }
    ];

    return window.STEPS2(host, {
      label: "แอนิเมชันทีละขั้น",
      title: "เลือก R: ไม่แกว่ง วิกฤต หรือแกว่ง",
      aria: "แอนิเมชันทีละขั้น: ดิสคริมิแนนต์ D ของ R และแรงดัน u_C ของ R เท่ากับ 10, R_кр และ 40 โอห์ม",
      legend: [
        { cls: "lg-ref", text: "R = 10 Ом (งาน)" },
        { cls: "lg-meas", text: "<span>R = R<sub>кр</sub></span>" },
        { cls: "lg-new", text: "R = 40 Ом" },
        { cls: "lg-lin dash", text: "RLC อนุกรม (เทียบ)" }
      ],
      steps: STEPS,
      caption: "ค่า R<sub>кр</sub> และกรณี R = 26,1 / 40 Ом ผู้เรียบเรียงคำนวณ · งานตัวอย่างเขียน «r = 25 Ом» จากสูตรที่พิมพ์ผิด (ดูหมายเหตุต้นฉบับในเนื้อหา)",
      height: w => w < 640 ? 560 : Math.round(Math.max(410, Math.min(450, w * 0.5))),
      draw(ctx, W, H, step, C, anim) {
        const P = window.STEPS2.pen(ctx, W, H, C);
        const narrow = W < 520, wide = W >= 640;
        const clamp01 = x => Math.max(0, Math.min(1, x));
        const inR = (s, x, y) => s >= x && s <= y;
        const scene = (x, y) => {
          const now = inR(step, x, y), was = inR(anim.from, x, y);
          if (now && was) return 1;
          if (now) return clamp01(anim.p * 1.6);
          if (was) return clamp01(1 - anim.p * 2.2);
          return 0;
        };
        const rv = k => {
          const now = step >= k, was = anim.from >= k;
          if (now && was) return 1;
          if (now) return anim.e;
          if (was) return 1 - anim.e;
          return 0;
        };
        const cc = [C.ref, C.meas, C.new];
        const colD = C.deep;

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
        const clipTo = r => { ctx.beginPath(); ctx.rect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); ctx.clip(); };
        const px = (x, y) => [Math.round(x) + 0.5, Math.round(y) + 0.5];
        const gline = (x0, y0, x1, y1) => { const a = px(x0, y0), b = px(x1, y1); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); };
        const frame = r => { ctx.save(); ctx.strokeStyle = C.ink3; ctx.lineWidth = 1.1; ctx.globalAlpha = 0.55; ctx.strokeRect(r.x0 + 0.5, r.y0 + 0.5, r.x1 - r.x0, r.y1 - r.y0); ctx.restore(); };

        /* ---------- เลย์เอาต์: จอแคบ = บน/ล่าง · จอกว้าง = ซ้าย/ขวา ---------- */
        let r1, r2;
        if (wide) {
          const sp = Math.round(W * 0.38);
          r1 = { x0: 52, y0: 44, x1: sp - 14, y1: H - 56 };
          r2 = { x0: sp + 52, y0: 44, x1: W - 18, y1: H - 56 };
        } else {
          r1 = { x0: 46, y0: 30, x1: W - 16, y1: 184 };
          r2 = { x0: 46, y0: 268, x1: W - 16, y1: H - 48 };
        }
        const lab = narrow ? 11 : 11.5;

        /* ============================ แผง 1: D(R) ============================ */
        {
          const RMAX = 60, dLo = -30, dHi = 14;
          const X1 = Rv => r1.x0 + Rv / RMAX * (r1.x1 - r1.x0);
          const Y1 = d => r1.y1 - (d - dLo) / (dHi - dLo) * (r1.y1 - r1.y0);
          const Dk = Rv => Dof(Rv) * 1e3;
          ctx.save();
          ctx.fillStyle = C.ref; ctx.globalAlpha = 0.09; ctx.fillRect(X1(0), r1.y0, X1(Rcr) - X1(0), r1.y1 - r1.y0);
          ctx.fillStyle = C.new; ctx.fillRect(X1(Rcr), r1.y0, X1(RMAX) - X1(Rcr), r1.y1 - r1.y0);
          ctx.restore();
          ctx.save(); ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.beginPath();
          [-30, -20, -10, 10].forEach(v => gline(r1.x0, Y1(v), r1.x1, Y1(v)));
          for (let Rv = 10; Rv < RMAX; Rv += 10) gline(X1(Rv), r1.y0, X1(Rv), r1.y1);
          ctx.stroke(); ctx.restore();
          frame(r1);
          P.seg([[r1.x0, Y1(0)], [r1.x1, Y1(0)]], C.ink3, 1.5);
          [-30, -20, -10, 0, 10].forEach(v => P.label(nf(v, 0), r1.x0 - 6, Y1(v), C.ink3, { size: lab, weight: 500, align: "right", mono: true, halo: 0 }));
          for (let Rv = 0; Rv <= RMAX; Rv += narrow ? 20 : 10) P.label(String(Rv), X1(Rv), r1.y1 + 13, C.ink3, { size: lab, weight: 500, align: "center", mono: true, halo: 0 });
          P.label("R, Ом", r1.x1, r1.y1 + 29, C.ink3, { size: lab, weight: 500, align: "right", halo: 0 });
          P.label("D, ×10⁻³ Гн²", r1.x0, r1.y0 - 13, C.ink2, { size: 12.5 });
          const pts = [];
          for (let q = 0; q <= 120; q++) { const Rv = RMAX * q / 120; pts.push([X1(Rv), Y1(Dk(Rv))]); }
          ctx.save(); clipTo(r1); P.seg(pts, C.ink, 2.6); ctx.restore();
          P.label("D > 0 · ไม่แกว่ง", X1(1.5), Y1(-14), C.ref, { size: 12.5 });
          P.label("D < 0 · แกว่ง", X1(Rcr) + 8, Y1(9), C.new, { size: 12.5 });
          /* R_кр */
          P.seg([[X1(Rcr), r1.y0], [X1(Rcr), r1.y1]], C.meas, 1.4, [4, 4]);
          const aCr = Math.max(scene(0, 0), 0.9 * (step >= 1 ? 1 : 0));
          P.dot(X1(Rcr), Y1(0), step === 2 ? 7 : 5, C.meas);
          rich("R_{кр} = " + nf(Rcr, 1) + " Ом", X1(Rcr) - 8, Y1(0) - 13, C.meas, { size: 12.5, weight: 700, align: "right" });
          /* จุดของแต่ละกรณี */
          const cases = [[R10, 1, 0], [R40, 3, 2]];
          cases.forEach(cs => {
            const al = anim.fade(cs[1], 0.2);
            if (al < 0.01) return;
            ctx.save(); ctx.globalAlpha = al;
            const cur = step === cs[1];
            P.dot(X1(cs[0]), Y1(Dk(cs[0])), cur ? 7.5 : 5, cc[cs[2]]);
            if (cs[2] === 0) rich("R = " + nf(R10, 0), X1(R10) + 8, Y1(Dk(R10)) - 12, cc[0], { size: 12.5, weight: 700 });
            else rich("R = " + nf(R40, 0), X1(R40) - 9, Y1(Dk(R40)) + 14, cc[2], { size: 12.5, weight: 700, align: "right" });
            ctx.restore();
          });
          if (step === 2) { ctx.save(); ctx.globalAlpha = scene(2, 2); ctx.beginPath(); ctx.arc(X1(Rcr), Y1(0), 10, 0, Math.PI * 2); ctx.strokeStyle = C.meas; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
        }

        /* ============================ แผง 2: u_C(t) หรือ ξ(R) ============================ */
        frame(r2);
        /* ---- u_C(t) (ขั้น 1–4) ---- */
        const pa = scene(0, 3);
        if (pa > 0.01) {
          const UMAX = 105;
          const X2 = t => r2.x0 + t / TMAX * (r2.x1 - r2.x0);
          const Y2 = u => r2.y1 - u / UMAX * (r2.y1 - r2.y0);
          ctx.save(); ctx.globalAlpha = pa;
          ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.beginPath();
          [25, 50, 75, 100].forEach(v => gline(r2.x0, Y2(v), r2.x1, Y2(v)));
          for (let t = 3; t < 15; t += 3) gline(X2(t * 1e-3), r2.y0, X2(t * 1e-3), r2.y1);
          ctx.stroke();
          frame(r2);
          [0, 25, 50, 75, 100].forEach(v => P.label(String(v), r2.x0 - 6, Y2(v), C.ink3, { size: lab, weight: 500, align: "right", mono: true, halo: 0 }));
          for (let t = 0; t <= 15; t += 3) P.label(String(t), X2(t * 1e-3), r2.y1 + 13, C.ink3, { size: lab, weight: 500, align: "center", mono: true, halo: 0 });
          P.label("t, мс", r2.x1, r2.y1 + 29, C.ink3, { size: lab, weight: 500, align: "right", halo: 0 });
          rich("u_{C}, В", r2.x0, r2.y0 - 13, C.meas, { size: 12.5 });
          ctx.restore();

          const s0 = scene(0, 0);
          if (s0 > 0.01) {
            ctx.save(); ctx.globalAlpha = s0 * pa;
            P.label("u_C(t) ของแต่ละ R", (r2.x0 + r2.x1) / 2, (r2.y0 + r2.y1) / 2 - 12, C.ink2, { size: 13.5, align: "center" });
            P.label("จะปรากฏในขั้นถัดไป", (r2.x0 + r2.x1) / 2, (r2.y0 + r2.y1) / 2 + 10, C.ink3, { size: 12.5, weight: 500, align: "center" });
            ctx.restore();
          }

          /* ซองและเส้นประค่าคงตัว */
          const s3a = scene(3, 3);
          [0, 1, 2].forEach(k => {
            const cur = scene(k + 1, k + 1), seen = rv(k + 1);
            if (seen < 0.01) return;
            const alp = pa * (0.3 + 0.7 * cur) * Math.min(1, seen * 1.5);
            ctx.save(); ctx.globalAlpha = alp;
            ctx.beginPath(); ctx.rect(r2.x0, r2.y0, r2.x1 - r2.x0, r2.y1 - r2.y0); ctx.clip();
            P.seg([[r2.x0, Y2(M[k].up)], [r2.x1, Y2(M[k].up)]], cc[k], 1.4, [6, 4]);
            ctx.restore();
          });
          if (s3a > 0.01) {
            ctx.save(); ctx.globalAlpha = pa * s3a * rv(3);
            ctx.beginPath(); ctx.rect(r2.x0, r2.y0, r2.x1 - r2.x0, r2.y1 - r2.y0); ctx.clip();
            const up1 = [], lo1 = [];
            for (let q = 0; q <= 300; q++) { const t = TMAX * q / 300, e = m40.env * Math.exp(m40.al * t); up1.push([X2(t), Y2(m40.up + e)]); lo1.push([X2(t), Y2(m40.up - e)]); }
            P.seg(up1, C.new, 1.3, [3, 3], 0.8); P.seg(lo1, C.new, 1.3, [3, 3], 0.8);
            ctx.restore();
          }
          /* เส้น u_C */
          M.forEach((m, k) => {
            const seen = rv(k + 1);
            if (seen <= 0.001) return;
            const cur = scene(k + 1, k + 1);
            const n = 500, cnt = Math.max(1, Math.floor(n * seen)), cp = [];
            for (let q = 0; q <= cnt; q++) { const t = TMAX * q / n; cp.push([X2(t), Y2(m.f(t))]); }
            ctx.save(); ctx.beginPath(); ctx.rect(r2.x0, r2.y0, r2.x1 - r2.x0, r2.y1 - r2.y0); ctx.clip();
            P.seg(cp, cc[k], 1.9 + 1.0 * cur, [], pa * (0.35 + 0.65 * cur));
            ctx.restore();
          });
          /* ยอดและป้ายของกรณีปัจจุบัน */
          M.forEach((m, k) => {
            const seen = rv(k + 1);
            if (seen < 0.4) return;
            const cur = scene(k + 1, k + 1);
            ctx.save(); ctx.globalAlpha = pa * (0.35 + 0.65 * cur);
            P.dot(X2(m.tMax), Y2(m.max), 2.5 + 2.5 * cur, cc[k]);
            ctx.restore();
            if (cur > 0.01) {
              ctx.save(); ctx.globalAlpha = pa * cur * clamp01((seen - 0.5) / 0.5);
              rich("ยอด " + nf(m.max, 2) + " В ที่ " + ms(m.tMax, 3) + " мс", r2.x1 - 6, Y2(99), cc[k], { size: 12.5, weight: 700, align: "right" });
              ctx.restore();
            }
          });
          /* ป้ายระดับคงตัว */
          const lv = step === 3 ? [0, 1, 2] : step >= 1 && step <= 3 ? [step - 1] : [];
          lv.forEach(k => {
            const al = pa * (step === 3 ? scene(3, 3) : scene(k + 1, k + 1));
            if (al < 0.01) return;
            ctx.save(); ctx.globalAlpha = al;
            rich(nf(M[k].up, 2) + " В", r2.x1 - 5, Y2(M[k].up) - 12, cc[k], { size: 12, weight: 700, align: "right" });
            ctx.restore();
          });
          /* ป้ายประเภทราก (มุมขวาล่าง) */
          const tag = [
            ["รากจริงต่างกัน", rootsRe(M[0]).replace(" · ", " , ")],
            ["รากซ้ำ (ขอบ)", "p = " + nf(M[1].p, 0) + " с⁻¹"],
            ["รากเชิงซ้อน", "p = " + nf(m40.al, 0) + " ± j" + nf(m40.w, 0) + " с⁻¹"]
          ];
          tag.forEach((tg, k) => {
            const al = pa * scene(k + 1, k + 1);
            if (al < 0.01) return;
            ctx.save(); ctx.globalAlpha = al;
            P.label("R = " + nf(M[k].R, k === 1 ? 1 : 0) + " Ом : " + tg[0], r2.x1 - 6, Y2(24), cc[k], { size: 12.5, align: "right" });
            P.label(tg[1], r2.x1 - 6, Y2(24) + 18, cc[k], { size: 12.5, weight: 500, align: "right" });
            ctx.restore();
          });
          if (s3a > 0.01) {
            ctx.save(); ctx.globalAlpha = pa * s3a * rv(3);
            const xc = X2(tCross), yc = Y2(m40.up);
            ctx.beginPath(); ctx.arc(xc, yc, 6, 0, Math.PI * 2); ctx.strokeStyle = C.deep; ctx.lineWidth = 2; ctx.stroke();
            P.label("ข้ามค่าคงตัวที่ " + ms(tCross) + " мс", xc + 2, yc + 22, C.deep, { size: 12, align: "center" });
            P.label("ค่าคงตัวเปลี่ยนตาม R", r2.x1 - 6, Y2(42), C.ink2, { size: 12, weight: 500, align: "right" });
            ctx.restore();
          }
        }

        /* ---- ξ(R) (ขั้น 5) ---- */
        const pz = scene(4, 4);
        if (pz > 0.01) {
          const RZ = 160, ZH = 2.4;
          const X3 = Rv => r2.x0 + Rv / RZ * (r2.x1 - r2.x0);
          const Y3 = z => r2.y1 - z / ZH * (r2.y1 - r2.y0);
          ctx.save(); ctx.globalAlpha = pz;
          ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.beginPath();
          [0.5, 1.5, 2].forEach(v => gline(r2.x0, Y3(v), r2.x1, Y3(v)));
          [40, 80, 120].forEach(v => gline(X3(v), r2.y0, X3(v), r2.y1));
          ctx.stroke();
          frame(r2);
          [0, 0.5, 1, 1.5, 2].forEach(v => P.label(nf(v, v % 1 ? 1 : 0), r2.x0 - 6, Y3(v), C.ink3, { size: lab, weight: 500, align: "right", mono: true, halo: 0 }));
          for (let Rv = 0; Rv <= RZ; Rv += 40) P.label(String(Rv), X3(Rv), r2.y1 + 13, C.ink3, { size: lab, weight: 500, align: "center", mono: true, halo: 0 });
          P.label("R, Ом", r2.x1, r2.y1 + 29, C.ink3, { size: lab, weight: 500, align: "right", halo: 0 });
          P.label("ξ (สัมประสิทธิ์หน่วง)", r2.x0, r2.y0 - 13, C.ink2, { size: 12.5 });
          const sw = rv(4);
          ctx.beginPath(); ctx.rect(r2.x0, r2.y0, r2.x1 - r2.x0, r2.y1 - r2.y0); ctx.clip();
          P.seg([[r2.x0, Y3(1)], [r2.x1, Y3(1)]], C.ink2, 1.5, [6, 4]);
          P.seg([[r2.x0, Y3(zinf)], [r2.x1, Y3(zinf)]], C.deep, 1.2, [2, 4], 0.8);
          const so = [], se = [];
          const nz = Math.max(2, Math.floor(160 * Math.min(1, sw * 1.2)));
          for (let q = 0; q <= nz; q++) { const Rv = 3 + (RZ - 3) * q / 160; so.push([X3(Rv), Y3(zf(Rv))]); se.push([X3(Rv), Y3(zs(Rv))]); }
          P.seg(se, C.lin, 2.4, [7, 5]);
          P.seg(so, C.deep, 2.8);
          ctx.restore();
          P.label("ξ = 1 (D = 0)", X3(92), Y3(1) - 11, C.ink2, { size: 12, align: "center" });
          [[R10, z10, 0], [Rcr, 1, 1], [R40, z40, 2]].forEach(q => P.dot(X3(q[0]), Y3(q[1]), 5.5, cc[q[2]]));
          rich("R = 10", X3(R10) + 8, Y3(z10) - 12, cc[0], { size: 12, weight: 700 });
          rich("R_{кр}", X3(Rcr) + 8, Y3(1) - 24, cc[1], { size: 12, weight: 700 });
          rich("R = 40", X3(R40) - 9, Y3(z40) + 14, cc[2], { size: 12, weight: 700, align: "right" });
          rich("วงจรนี้: R ↑ → ξ ↓", X3(46), Y3(2.12), C.deep, { size: 12.5, weight: 700 });
          rich("(แกว่งง่ายขึ้น)", X3(46), Y3(2.12) + 16, C.deep, { size: 12, weight: 500 });
          rich("RLC อนุกรม: R ↑ → ξ ↑", r2.x1 - 6, Y3(1.62), C.lin, { size: 12.5, weight: 700, align: "right" });
          rich("ξ → " + nf(zinf, 2) + " เมื่อ R → ∞", r2.x1 - 6, Y3(zinf) + 13, C.deep, { size: 12, weight: 500, align: "right" });
          ctx.beginPath(); ctx.arc(X3(Rser), Y3(1), 5, 0, Math.PI * 2); ctx.strokeStyle = C.lin; ctx.lineWidth = 2; ctx.stroke();
          rich(nf(Rser, 0) + " Ом", X3(Rser), Y3(1) + 17, C.lin, { size: 12, weight: 700, align: "center" });
          ctx.restore();
        }
      }
    });
  }
});
