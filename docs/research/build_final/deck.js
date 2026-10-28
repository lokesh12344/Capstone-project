// Builds final/Voice_Khata_Presentation.pptx (15 slides, 16:9, Calibri, white + navy).
// Slide order follows docs/research/ppt_slide_list.png, plus agenda, Rupee Error Rate,
// work plan and thank-you slides. Speaker notes on every slide.
const path = require("path");
const pptxgen = require("pptxgenjs");

const FIG = (f) => path.join(__dirname, "..", "figures", f);
const OUT = path.join(__dirname, "..", "final", "Voice_Khata_Presentation_v2.pptx");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 in
pres.title = "Offline Voice-Based Khata Entry";

const W = 13.333, M = 0.6;
const NAVY = "1F3A68", INK = "1A1A1A", MUTED = "5F6368", LINE = "D5DCE8", WHITE = "FFFFFF";
const BG = "EEF2F7", TINT = WHITE, SAFFRON = "E8A33D", SAFFRON_BG = "FDF3E1", DARK = "15223D", DARK2 = "22345C", SOFT = "C9D3E6";
const FONT = "Calibri";
const FOOTER = "Offline Voice-Based Khata Entry · Research Methodology · VESIT 2026–27";
const TOTAL = 16;
let n = 0;

function base(section, title, dark = false) {
  n += 1;
  const s = pres.addSlide();
  s.background = { color: dark ? DARK : BG };
  if (dark) {
    s.addShape(pres.shapes.OVAL, { x: 9.6, y: -1.6, w: 5.2, h: 5.2, fill: { color: DARK2, transparency: 30 }, line: { color: DARK2, transparency: 100 } });
    s.addShape(pres.shapes.OVAL, { x: 12.0, y: 5.6, w: 2.4, h: 2.4, fill: { color: SAFFRON, transparency: 45 }, line: { color: SAFFRON, transparency: 100 } });
  }
  if (section) s.addText(section.toUpperCase(), { isTextBox: true, x: M, y: 0.3, w: 8, h: 0.35, margin: 0,
    fontFace: FONT, fontSize: 13, bold: true, color: dark ? SAFFRON : NAVY, charSpacing: 2 });
  if (title) s.addText(title, { isTextBox: true, x: M, y: 0.65, w: W - 2 * M, h: 0.85, margin: 0,
    fontFace: FONT, fontSize: 34, bold: true, color: dark ? WHITE : INK, valign: "middle" });
  s.addText(FOOTER, { isTextBox: true, x: M, y: 7.0, w: 9, h: 0.3, margin: 0, fontFace: FONT, fontSize: 12, color: dark ? SOFT : MUTED });
  s.addText(`${n} / ${TOTAL}`, { isTextBox: true, x: W - M - 1.5, y: 7.0, w: 1.5, h: 0.3, margin: 0,
    fontFace: FONT, fontSize: 12, color: dark ? SOFT : MUTED, align: "right" });
  return s;
}

function card(s, x, y, w, h, fill = TINT) {
  const shadow = fill === DARK2 ? undefined : { type: "outer", blur: 8, offset: 2, angle: 90, color: "1F3A68", opacity: 0.12 };
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: fill }, rectRadius: 0.12, shadow });
}

function badge(s, x, y, label, d = 0.55) {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: NAVY }, line: { color: NAVY } });
  s.addText(String(label), { isTextBox: true, x, y, w: d, h: d, margin: 0, align: "center", valign: "middle",
    fontFace: FONT, fontSize: 20, bold: true, color: WHITE });
}

function text(s, t, x, y, w, h, o = {}) {
  s.addText(t, { isTextBox: true, x, y, w, h, margin: 0, fontFace: FONT, fontSize: 20, color: INK, valign: "top", ...o });
}

function bullets(s, items, x, y, w, h, size = 20) {
  s.addText(items.map((t, i) => ({ text: t, options: { bullet: { indent: 18 }, breakLine: i < items.length - 1 } })),
    { isTextBox: true, x, y, w, h, margin: 0, fontFace: FONT, fontSize: size, color: INK, valign: "top", paraSpaceAfter: 10 });
}

function table(s, rows, x, y, w, colW, size = 16) {
  const data = rows.map((r, ri) => r.map((c) => ({
    text: c, options: { bold: ri === 0, color: ri === 0 ? WHITE : INK, fill: { color: ri === 0 ? NAVY : (ri % 2 ? WHITE : "F6F8FB") },
      fontFace: FONT, fontSize: size, valign: "middle", margin: [4, 6, 4, 6] } })));
  s.addTable(data, { x, y, w, colW, border: { type: "solid", pt: 0.75, color: LINE }, autoPage: false });
}

// ── 1. Title ─────────────────────────────────────────────────────────────────
{
  const s = base(null, null, true);
  text(s, "RESEARCH TOPIC PRESENTATION · RESEARCH METHODOLOGY", M, 1.1, 10, 0.4, { fontSize: 14, bold: true, color: SAFFRON, charSpacing: 2 });
  text(s, "Offline Voice-Based Khata Entry in Hindi, Marathi and English for Kirana Stores", M, 1.6, 9.4, 2.0,
    { fontSize: 40, bold: true, color: WHITE, valign: "middle" });
  text(s, "Can a cheap phone record credit entries by voice, with no internet, and get the money right?", M, 3.7, 9.2, 0.9,
    { fontSize: 22, italic: true, color: SOFT });
  s.addShape(pres.shapes.OVAL, { x: 10.3, y: 2.0, w: 2.2, h: 2.2, fill: { color: SAFFRON }, line: { color: SAFFRON } });
  text(s, "₹", 10.3, 2.0, 2.2, 2.2, { fontSize: 88, bold: true, color: DARK, align: "center", valign: "middle" });
  card(s, M, 4.75, 7.6, 1.9, DARK2);
  text(s, [
    { text: "Team: ", options: { bold: true, color: SAFFRON } }, { text: "[NAME 1], [NAME 2], [NAME 3], [NAME 4]", options: { breakLine: true } },
    { text: "Guide: ", options: { bold: true, color: SAFFRON } }, { text: "[GUIDE NAME]", options: { breakLine: true } },
    { text: "B.E. Electronics and Computer Science, VESIT · 2026–27" },
  ], M + 0.3, 4.95, 7.1, 1.6, { fontSize: 20, color: WHITE, paraSpaceAfter: 8 });
  s.addNotes("Good morning. Our topic is offline voice-based khata entry for kirana stores. In one line: can a cheap Android phone let a shopkeeper record a credit entry just by speaking, without internet, and still get the money right? We built an offline-first shop app called SmartOps, so this study sits on top of something we already have. I'll go through the problem, what others have done, what's missing, and how we plan to test it.");
}

// ── 2. Agenda ────────────────────────────────────────────────────────────────
{
  const s = base("Agenda", "What we will cover");
  const items = [
    ["Introduction", "Background and the problem"],
    ["Literature", "What others have done, and the gap"],
    ["Our study", "Research question, objectives, method"],
    ["Key idea", "Rupee Error Rate"],
    ["Outcomes", "Expected results, novelty, plan, references"],
  ];
  items.forEach(([h, d], i) => {
    const y = 1.85 + i * 0.95;
    badge(s, M, y, i + 1, 0.6);
    text(s, h, M + 0.85, y - 0.02, 3.2, 0.64, { fontSize: 24, bold: true, valign: "middle" });
    text(s, d, M + 4.1, y - 0.02, 8, 0.64, { fontSize: 20, color: MUTED, valign: "middle" });
  });
  s.addNotes("This is the flow. First, why this problem matters and what exactly the problem is. Then the literature, and the gap we found. Then our research question, objectives and how we'll run the experiment. The main new idea, the Rupee Error Rate, gets its own slide. We'll finish with what we expect to find, what's new, our plan and the references.");
}

// ── 3. Background ────────────────────────────────────────────────────────────
{
  const s = base("Introduction", "Background");
  const cols = [
    ["Khata is everywhere", "Kiranas give goods on credit and note it in a paper book. Digital tools raised small-retailer revenue by 9.6% on average [1]."],
    ["Typing is slow", "At a busy counter, finding a name and typing an amount takes time. It is harder for people less comfortable with phones [3]."],
    ["Voice is natural", "Low-literacy users in India prefer voice over text [3], [4]. Whisper now works in Hindi and Marathi [5]."],
  ];
  const cw = (W - 2 * M - 0.6) / 3;
  cols.forEach(([h, d], i) => {
    const x = M + i * (cw + 0.3);
    card(s, x, 1.85, cw, 4.6);
    badge(s, x + 0.3, 2.1, i + 1);
    text(s, h, x + 0.3, 2.9, cw - 0.6, 0.6, { fontSize: 24, bold: true });
    text(s, d, x + 0.3, 3.6, cw - 0.6, 2.7, { fontSize: 20 });
  });
  s.addNotes("Most kirana shops still run credit on a paper khata. Digital tools clearly help: one study of 403 Indian retailers found a 9.6 percent revenue gain. But typing an entry while a queue is waiting is slow, and harder for people who aren't comfortable typing. Earlier studies in India showed that low-literacy users prefer voice, and models like Whisper now understand Hindi and Marathi. So voice looks like the obvious answer.");
}

// ── 4. Problem statement ─────────────────────────────────────────────────────
{
  const s = base("Introduction", "Problem statement");
  card(s, M, 1.8, W - 2 * M, 1.35);
  text(s, "We do not know if an offline speech model on a cheap Android phone can capture the name, amount and type of mixed-language khata entries accurately enough, measured in rupees, and faster than typing.",
    M + 0.35, 1.95, W - 2 * M - 0.7, 1.1, { fontSize: 22, bold: true, color: NAVY, valign: "middle" });
  const probs = [
    ["No internet", "Good speech recognition runs in the cloud. Shops lose signal."],
    ["Mixed languages", "“Ramesh ka 250 ka udhaar add karo”: Hindi, English and Marathi in one line."],
    ["Money must be exact", "“dhai sau” (250) heard as “do sau” (200) = ₹50 wrong."],
  ];
  const cw = (W - 2 * M - 0.6) / 3;
  probs.forEach(([h, d], i) => {
    const x = M + i * (cw + 0.3);
    text(s, h, x, 3.55, cw, 0.5, { fontSize: 24, bold: true });
    text(s, d, x, 4.15, cw, 2.2, { fontSize: 20, color: INK });
  });
  s.addNotes("So here's the actual problem. Three things get in the way. First, the good speech systems run in the cloud, and shops lose signal all the time. Second, people mix languages; someone will say 'Ramesh ka 250 ka udhaar add karo' in one breath. Third, and this is the big one, money has to be exact. If 'dhai sau' is heard as 'do sau', the customer's account is 50 rupees off. Nobody has checked whether an offline model on a cheap phone can handle all three.");
}

// ── 5. Literature survey ─────────────────────────────────────────────────────
{
  const s = base("Literature", "Literature survey");
  table(s, [
    ["Year", "Study", "What they did", "What it leaves open for us"],
    ["2007", "Medhi et al. [3]", "Text-free, voice-based UI for low-literacy users", "Recorded voice only, no speech recognition"],
    ["2020", "Bastianelli et al. [14]", "SLURP: judge spoken commands by extracted details", "English only, no money values"],
    ["2023", "Radford et al. [5]", "Whisper, trained on 680,000 h, many languages", "General speech, large models"],
    ["2023", "Bhogale et al. [6]", "IndicWhisper, best on 39 of 59 Indian test sets", "No shop or khata speech"],
    ["2025", "Biswas et al. [10]", "Whisper adapted to Hindi–English mixed speech", "No Marathi, not offline"],
    ["2026", "Söhler et al. [19]", "8-bit Whisper-small: 57% smaller, no accuracy loss", "English, servers, not phones"],
  ], M, 1.75, W - 2 * M, [0.9, 2.6, 4.5, 4.13], 18);
  s.addNotes("These are six of the sixteen papers in our report, in time order. In 2007, Medhi and colleagues showed low-literacy users prefer voice, but they used recorded voice, not recognition. SLURP in 2020 said: judge a spoken command by its details, like the date or name, not just words. But it's English and has no money. Whisper and IndicWhisper made Indian speech recognition possible, and in 2025–26 people adapted Whisper to Hindi–English mixing and shrank it to 8 bits. Look at the last column: each one leaves something open.");
}

// ── 6. Research gap ──────────────────────────────────────────────────────────
{
  const s = base("Literature", "Research gap");
  const eras = [
    ["2003–2010", "Voice suits low-literacy users; WER is imperfect"],
    ["2019–2021", "Mixed Indian speech is hard; judge by details"],
    ["2022–2024", "Big multilingual and Indian models"],
    ["2025–2026", "Whisper shrunk and tuned for Indian speech"],
  ];
  const cw = (W - 2 * M - 0.9) / 4;
  eras.forEach(([y, d], i) => {
    const x = M + i * (cw + 0.3);
    card(s, x, 1.85, cw, 2.2);
    text(s, y, x + 0.25, 2.0, cw - 0.5, 0.5, { fontSize: 22, bold: true, color: NAVY });
    text(s, d, x + 0.25, 2.55, cw - 0.5, 1.4, { fontSize: 18 });
    if (i < 3) s.addShape(pres.shapes.RIGHT_ARROW, { x: x + cw + 0.04, y: 2.8, w: 0.22, h: 0.3, fill: { color: NAVY }, line: { color: NAVY } });
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y: 4.45, w: W - 2 * M, h: 2.1, fill: { color: WHITE }, line: { color: SAFFRON, width: 2.5 }, rectRadius: 0.12 });
  text(s, "Still missing", M + 0.35, 4.6, 5, 0.5, { fontSize: 22, bold: true, color: NAVY });
  bullets(s, [
    "No test on short, mixed Hindi–Marathi–English khata commands",
    "No test of offline recognition on a cheap Android phone",
    "No error measure based on money; WER counts every word the same",
  ], M + 0.35, 5.15, W - 2 * M - 0.7, 1.4, 20);
  s.addNotes("If you read the literature in order, each period fixes something the last one couldn't. Early work showed voice suits users, then people tackled mixed Indian speech, then big models came, and now Whisper is being shrunk and tuned for Indian languages. What's still missing is three things. Nobody tested short khata commands in mixed Hindi, Marathi and English. Nobody tested this offline on a cheap phone. And nobody measured errors in money: word error rate treats a wrong filler word and a wrong amount exactly the same.");
}

// ── 7. Research question & objectives ────────────────────────────────────────
{
  const s = base("Our study", "Research question and objectives");
  card(s, M, 1.8, W - 2 * M, 1.15);
  text(s, "Can an offline speech model on a low-cost Android phone record mixed-language khata entries with few rupee errors, and faster than typing?",
    M + 0.35, 1.9, W - 2 * M - 0.7, 0.95, { fontSize: 22, bold: true, color: NAVY, valign: "middle" });
  const objs = [
    "Record about 360 khata commands from 12 speakers, with known correct answers",
    "Build offline voice entry in SmartOps; compare it with cloud, with and without a customer-name hint",
    "Measure errors in rupees (Rupee Error Rate) and check how well WER predicts them",
    "Compare voice with typing: time per entry and SUS usability score (10 people)",
  ];
  objs.forEach((o, i) => {
    const y = 3.3 + i * 0.88;
    badge(s, M, y, `O${i + 1}`, 0.62);
    text(s, o, M + 0.9, y, W - 2 * M - 0.9, 0.62, { fontSize: 20, valign: "middle" });
  });
  s.addNotes("Our one research question: can an offline model on a cheap phone record mixed-language khata entries with few rupee errors, and faster than typing? We break it into four objectives. One, record about 360 commands from 12 people where we already know the right answer. Two, build the offline feature and compare it with a cloud service, with and without giving the model the shop's customer names. Three, measure errors in rupees and see how badly word error rate misjudges them. Four, a small test where 10 people try voice versus typing.");
}

// ── 8. Methodology 1: pipeline ───────────────────────────────────────────────
{
  const s = base("Our study", "Proposed methodology: how voice entry works");
  const w = 9.3, h = w * (917 / 1908);
  card(s, (W - w) / 2 - 0.2, 1.5, w + 0.4, h + 0.2);
  s.addImage({ path: FIG("p2_pipeline.png"), x: (W - w) / 2, y: 1.6, w, h });
  text(s, "Example: “Sunanda tai ne saade teen hazaar jama kele” → Sunanda Patil · ₹3,500 · Repayment",
    M, 6.3, W - 2 * M, 0.45, { fontSize: 18, italic: true, color: MUTED, align: "center" });
  s.addNotes("Here's how the feature works. The shopkeeper presses a button and speaks. Whisper turns that into text on the phone itself, with no internet. Simple rules then pick out the amount and the type; 'saade teen hazaar' becomes 3,500 and 'jama' means repayment. We match the name against the shop's customer list, and the shopkeeper sees a confirm screen before anything is saved, so nothing goes into the khata blindly.");
}

// ── 9. Conceptual framework (native shapes) ──────────────────────────────────
{
  const s = base("Our study", "Conceptual framework: what we change, what we measure");
  const box = (x, y, w, h, title, items, fill) => {
    card(s, x, y, w, h, fill);
    text(s, title, x + 0.3, y + 0.18, w - 0.6, 0.45, { fontSize: 22, bold: true, color: NAVY });
    bullets(s, items, x + 0.3, y + 0.75, w - 0.6, h - 0.9, 20);
  };
  const lw = 4.9, rx = W - M - lw;
  box(M, 1.75, lw, 2.55, "Speech setup (independent)", ["Cloud service", "Offline Whisper, 8-bit", "Offline Whisper + name hint"], TINT);
  box(M, 4.5, lw, 1.45, "Input mode (independent)", ["Voice vs typing"], TINT);
  box(rx, 1.75, lw, 2.55, "Accuracy and money (dependent)", ["Whole entry correct (%)", "Rupee Error Rate", "Time on phone (s)"], SAFFRON_BG);
  box(rx, 4.5, lw, 1.45, "Usability (dependent)", ["Time per entry, SUS score"], SAFFRON_BG);
  const ax = M + lw + 0.2, aw = rx - ax - 0.2;
  s.addShape(pres.shapes.RIGHT_ARROW, { x: ax, y: 2.85, w: aw, h: 0.45, fill: { color: NAVY }, line: { color: NAVY } });
  text(s, "H1, H2, H3", ax, 2.3, aw, 0.45, { fontSize: 20, bold: true, align: "center" });
  s.addShape(pres.shapes.RIGHT_ARROW, { x: ax, y: 5.0, w: aw, h: 0.45, fill: { color: NAVY }, line: { color: NAVY } });
  text(s, "H4", ax, 4.45, aw, 0.45, { fontSize: 20, bold: true, align: "center" });
  text(s, "May change the results: language (Hindi / Marathi / English / mixed) and quiet room vs shop noise",
    M, 6.2, W - 2 * M, 0.5, { fontSize: 18, color: MUTED, align: "center" });
  s.addNotes("This is our framework in one picture. On the left is what we change: the speech setup, which is cloud, offline Whisper, or offline Whisper with the customer-name hint, and in the usability test, voice versus typing. On the right is what we measure: whether the whole entry is right, the Rupee Error Rate, time on the phone, and for users, time per entry and the SUS score. The arrows are our four hypotheses. Language and background noise might change the results, so we note them for every clip.");
}

// ── 10. Experiment design ────────────────────────────────────────────────────
{
  const s = base("Our study", "Proposed methodology: experiment design");
  const parts = [
    ["360", "voice clips", "A. Test set", "12 speakers × 30 commands: us, friends and 4 shopkeepers. Names are made up; we know every right answer."],
    ["× 3", "setups per clip", "B. Accuracy test", "Every clip through cloud, offline and offline + hint. Same speech, fair comparison."],
    ["10", "people", "C. Usability test", "5 entries by voice, 5 by typing, half start with each. Timed, then a SUS form."],
  ];
  const cw = (W - 2 * M - 0.6) / 3;
  parts.forEach(([big, unit, h, d], i) => {
    const x = M + i * (cw + 0.3);
    card(s, x, 1.75, cw, 3.3);
    text(s, big, x + 0.3, 1.9, cw - 0.6, 0.8, { fontSize: 40, bold: true, color: NAVY });
    text(s, unit, x + 0.3, 2.7, cw - 0.6, 0.4, { fontSize: 18, color: MUTED });
    text(s, h, x + 0.3, 3.15, cw - 0.6, 0.45, { fontSize: 22, bold: true });
    text(s, d, x + 0.3, 3.65, cw - 0.6, 1.35, { fontSize: 18 });
  });
  text(s, "Why these sizes are enough", M, 5.3, 8, 0.45, { fontSize: 22, bold: true, color: NAVY });
  bullets(s, [
    "360 paired clips: 80% power to catch a 5–6 point accuracy gap between setups",
    "10 people, each using both methods: 80% power to catch a large speed difference",
  ], M, 5.8, W - 2 * M, 1.1, 20);
  s.addNotes("The experiment has three parts. First, 12 people each record 30 short commands, so about 360 clips; since we wrote the cards, we already know the right answer for each. Second, every clip goes through all three setups, so any difference comes from the setup, not the speech. Third, 10 people do five entries by voice and five by typing, and we time them. And if someone asks whether this is enough: because it's paired, 360 clips gives 80 percent power to catch a 5 to 6 point gap, and 10 people is enough to catch a big speed difference.");
}

// ── 11. Rupee Error Rate ─────────────────────────────────────────────────────
{
  const s = base("Key idea", "Our key idea: the Rupee Error Rate", true);
  text(s, "Spoken: “Ramesh ko 250 udhaar”. Each output has 1 of 4 words wrong (WER 25%)", M, 1.7, 7.2, 0.8, { fontSize: 18, color: SOFT });
  s.addChart(pres.charts.BAR, [{ name: "Money error (₹)", labels: ["“Ramesh ka 250…” (filler word)", "“Ramesh ko 200…” (amount)", "“Suresh ko 250…” (customer)"], values: [0, 50, 500] }], {
    x: M, y: 2.45, w: 7.2, h: 3.9, barDir: "bar", chartColors: [SAFFRON], showValue: true, dataLabelFormatCode: "₹#,##0",
    dataLabelFontSize: 20, dataLabelFontFace: FONT, dataLabelColor: WHITE, dataLabelFontBold: true,
    catAxisLabelFontSize: 16, catAxisLabelFontFace: FONT, catAxisLabelColor: WHITE, catAxisLineShow: false,
    valAxisHidden: true, valGridLine: { style: "none" }, catGridLine: { style: "none" }, catAxisOrientation: "maxMin",
    showLegend: false, showTitle: false, barGapWidthPct: 60,
  });
  const x = M + 7.6, w = W - M - x;
  card(s, x, 1.75, w, 4.7, DARK2);
  text(s, "Same WER, different damage", x + 0.3, 1.95, w - 0.6, 0.5, { fontSize: 22, bold: true, color: SAFFRON });
  s.addText(["Wrong amount: the difference", "Wrong customer: counts twice", "Credit ↔ repayment swapped: twice the amount"]
    .map((t, k, a) => ({ text: t, options: { bullet: { indent: 18 }, breakLine: k < a.length - 1 } })),
    { isTextBox: true, x: x + 0.3, y: 2.6, w: w - 0.6, h: 1.9, margin: 0, fontFace: FONT, fontSize: 20, color: WHITE, valign: "top", paraSpaceAfter: 10 });
  text(s, "RER = ₹ wrongly recorded per 100 entries", x + 0.3, 4.65, w - 0.6, 0.9, { fontSize: 22, bold: true, color: WHITE });
  text(s, "H3: WER is only a weak guide to money error (Spearman ρ < 0.5)", x + 0.3, 5.6, w - 0.6, 0.75, { fontSize: 18, color: SOFT });
  s.addNotes("This is the part we're proudest of. Word error rate counts every wrong word the same. Take 'Ramesh ko 250 udhaar': three outputs, each with one wrong word, so all three have 25 percent word error. But the first one costs nothing, the second costs 50 rupees, and the third puts 500 rupees on the wrong customer. So we measure the Rupee Error Rate: how many rupees end up in the wrong place per 100 entries. A wrong customer counts twice, because one person is missing the entry and another wrongly has it.");
}

// ── 11. Expected results ─────────────────────────────────────────────────────
{
  const s = base("Outcomes", "Expected results (hypotheses, not results)");
  table(s, [
    ["", "What we expect", "Test", "We are wrong if…"],
    ["H1", "Cloud gets more whole entries right than offline, by a small gap", "McNemar", "no real difference"],
    ["H2", "The customer-name hint improves name accuracy", "McNemar", "the hint does not help"],
    ["H3", "WER is only a weak guide to rupee error", "Spearman", "ρ is 0.5 or more"],
    ["H4", "Voice entry is faster than typing", "Wilcoxon", "typing is as fast or faster"],
  ], M, 1.8, W - 2 * M, [0.8, 5.9, 1.9, 3.53], 18);
  text(s, "Most errors are expected in names and number words like “dhai”, “saade”, “paune”. Final output: offline voice entry in SmartOps and a rupee-based accuracy report.",
    M, 4.5, W - 2 * M, 1.2, { fontSize: 20, color: INK });
  s.addNotes("These are our four hypotheses, and each has a simple test and a clear way to prove us wrong. We expect cloud to beat offline, but hopefully by a small gap, which would make offline practical. We expect the customer-name hint to help with names, and word error rate to be a poor guide to money errors. And we expect voice to be faster than typing. We think most mistakes will be in names and number words like 'dhai' and 'saade'. These are expectations, not results; we haven't run it yet.");
}

// ── 12. Novelty / IP ─────────────────────────────────────────────────────────
{
  const s = base("Outcomes", "Novelty and IP potential");
  const items = [
    ["Rupee Error Rate", "Speech errors scored by the money they put in the wrong place, not by word count"],
    ["Offline khata test", "First test of mixed Hindi–Marathi–English khata commands on a cheap phone, fully offline"],
    ["Customer-name hint", "Using the shop's own customer list to help the model hear names correctly"],
  ];
  const cw = (W - 2 * M - 0.6) / 3;
  items.forEach(([h, d], i) => {
    const x = M + i * (cw + 0.3);
    card(s, x, 1.85, cw, 3.4);
    badge(s, x + 0.3, 2.1, i + 1);
    text(s, h, x + 0.3, 2.85, cw - 0.6, 0.6, { fontSize: 24, bold: true });
    text(s, d, x + 0.3, 3.5, cw - 0.6, 1.7, { fontSize: 19 });
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y: 5.55, w: W - 2 * M, h: 1.0, fill: { color: WHITE }, line: { color: SAFFRON, width: 2.5 }, rectRadius: 0.12 });
  text(s, "IP potential: the Rupee Error Rate and the name hint may be protectable. We will check with the VESIT IP cell before any public release.",
    M + 0.35, 5.62, W - 2 * M - 0.7, 0.86, { fontSize: 19, valign: "middle" });
  s.addNotes("So what's new? Three things. The Rupee Error Rate, which as far as we found nobody has used for speech. A proper test of offline, mixed-language khata commands on a cheap phone. And using the shop's own customer list as a hint so the model hears names correctly. On IP, we think the rupee measure and the name hint might have potential, but we'll talk to the IP cell before publishing anything.");
}

// ── 13. Work plan & budget ───────────────────────────────────────────────────
{
  const s = base("Outcomes", "Work plan and budget");
  card(s, M - 0.15, 1.7, 9.15, 8.95 * (1333 / 2684) + 0.2);
  s.addImage({ path: FIG("p2_gantt_slide.png"), x: M - 0.05, y: 1.8, w: 8.95, h: 8.95 * (1333 / 2684) });
  const x = M + 9.2, w = W - M - x;
  [["12", "weeks, from approval"], ["₹11,000", "total budget"], ["360", "voice clips"]].forEach(([big, lab], i) => {
    const y = 1.8 + i * 1.6;
    card(s, x, y, w, 1.4);
    text(s, big, x + 0.3, y + 0.1, w - 0.6, 0.75, { fontSize: 36, bold: true, color: NAVY });
    text(s, lab, x + 0.3, y + 0.85, w - 0.6, 0.45, { fontSize: 18, color: MUTED });
  });
  s.addNotes("The plan runs for 12 weeks. Recording is done by week 5, the accuracy results by week 8, and the usability test by week 9, which leaves the last three weeks for analysis and writing. The whole budget is about 11,000 rupees. Most of that is one cheap Android phone at 6,000; the rest is small thank-you payments to shopkeepers, cloud usage, printing and travel. All the software we use is free.");
}

// ── 14. References ───────────────────────────────────────────────────────────
{
  const s = base("References", "Key references (IEEE; numbers as in our report)");
  const refs = [
    "[1] A. Adhikary et al., “How does the adoption of digital payment technologies influence unorganized retailers’ performance?,” J. Acad. Marketing Sci., vol. 49, no. 5, 2021.",
    "[3] I. Medhi, A. Sagar, and K. Toyama, “Text-free user interfaces for illiterate and semiliterate users,” Inf. Technol. Int. Develop., vol. 4, no. 1, 2007.",
    "[4] N. Patel et al., “Avaaj Otalo: A field study of an interactive voice forum for small farmers in rural India,” in Proc. CHI, 2010.",
    "[5] A. Radford et al., “Robust speech recognition via large-scale weak supervision,” in Proc. ICML, PMLR 202, 2023.",
    "[6] K. Bhogale et al., “Vistaar: Diverse benchmarks and training sets for Indian language ASR,” in Proc. Interspeech, 2023.",
    "[10] A. Biswas et al., “Adapting Whisper for low-resource Hindi-English code-mix speech…,” in Proc. Interspeech, 2025.",
    "[11] Y.-Y. Wang, A. Acero, and C. Chelba, “Is word error rate a good indicator for spoken language understanding accuracy,” in Proc. IEEE ASRU, 2003.",
    "[14] E. Bastianelli et al., “SLURP: A spoken language understanding resource package,” in Proc. EMNLP, 2020.",
    "[19] A. Söhler, J. Irigoyen, and A. S. Kirkedal, “Quantizing Whisper-small: How design choices affect ASR performance,” SPEAKABLE @ LREC, 2026.",
  ];
  s.addText(refs.map((r, i) => ({ text: r, options: { breakLine: i < refs.length - 1 } })),
    { isTextBox: true, x: M, y: 1.7, w: W - 2 * M, h: 5.1, margin: 0, fontFace: FONT, fontSize: 16, color: INK, paraSpaceAfter: 8, valign: "top" });
  s.addNotes("These are the papers cited on the slides, numbered the same as in our report. The report has 21 references in total, all in IEEE style, and we checked each one against its publisher's page. The two I'd point to are Whisper, which our offline setup is built on, and Wang and colleagues from 2003, who first showed that a lower word error rate doesn't always mean better understanding, which is the idea behind our Rupee Error Rate. If anyone wants the full list, it is at the end of the report.");
}

// ── 16. Thank you ────────────────────────────────────────────────────────────
{
  const s = base(null, null, true);
  text(s, "Thank you", M, 2.0, W - 2 * M, 1.2, { fontSize: 60, bold: true, color: WHITE, align: "center", valign: "middle" });
  text(s, "Questions?", M, 3.25, W - 2 * M, 0.8, { fontSize: 32, color: SAFFRON, align: "center", valign: "middle" });
  text(s, "Offline voice khata · judged in rupees, not just words", M, 4.35, W - 2 * M, 0.6, { fontSize: 20, italic: true, color: SOFT, align: "center" });
  s.addNotes("That's our proposal. To sum it up in one line: offline voice entry for khata, judged by the rupees it gets wrong, not just the words. It builds on SmartOps, which already works offline, so the feature fits into a real app. The whole study costs about 11,000 rupees and runs in 12 weeks. Thank you, and we're happy to take questions.");
}

pres.writeFile({ fileName: OUT }).then((f) => console.log("wrote", f));
