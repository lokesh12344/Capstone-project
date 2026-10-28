// Builds final/Voice_Khata_Proposal.docx from report.json (made by prep.py).
// Formatting follows docs/research/proposal_guidelines.md:
//   Times New Roman, A4, 1" margins; chapter titles 16 pt bold, major headings
//   14 pt bold, sub-sub-headings 12 pt bold italic; body 12 pt justified, 1.5
//   spacing, 0 pt before / 6 pt after; headings left, 12 pt before / 6 pt after;
//   tables 10 pt with caption above; figure captions below; references 12 pt
//   single-spaced, 6 pt after; page numbers bottom centre.
// Structure: title page | front matter (roman numerals): abstract, index (TOC),
// list of figures, list of tables | chapters 1-5 + references (arabic from 1).
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow,
  TableCell, WidthType, ShadingType, BorderStyle, ImageRun, TableOfContents, Footer,
  PageNumber, NumberFormat, SequentialIdentifier, LevelFormat, TabStopType, SectionType,
  VerticalAlign, HighlightColor, Bookmark, PageReference, TabStopPosition, LeaderType,
} = require("docx");

const data = JSON.parse(fs.readFileSync(path.join(__dirname, "report.json"), "utf8"));
const OUT = path.join(__dirname, "..", "final", "Voice_Khata_Proposal.docx");

const FONT = "Times New Roman";
const TEXT_W = 9026; // A4 width 11906 - 2 x 1440 margins (DXA)
const pt = (n) => n * 2; // docx sizes are half-points
const BODY = { line: 360, before: 0, after: 120 }; // 1.5 lines, 0/6 pt

// ── inline markup: **bold**, *italic*, `code` ─────────────────────────────────
function runs(text, opts = {}) {
  const size = opts.size || pt(12);
  const out = [];
  const re = /(\*\*[^*]+?\*\*|\*[^*\s][^*]*?\*|`[^`]+`)/g;
  let last = 0, m;
  const push = (t, extra = {}) => {
    if (t) out.push(new TextRun({ text: t, font: FONT, size, bold: opts.bold, italics: opts.italics, ...extra }));
  };
  while ((m = re.exec(text)) !== null) {
    push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) out.push(...runs(tok.slice(2, -2), { ...opts, bold: true }));
    else if (tok.startsWith("`")) push(tok.slice(1, -1), { font: "Courier New" });
    else out.push(...runs(tok.slice(1, -1), { ...opts, italics: true }));
    last = m.index + tok.length;
  }
  push(text.slice(last));
  return out;
}

const bodyPara = (text, extra = {}) =>
  new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: BODY, children: runs(text), ...extra });

// ── headings ─────────────────────────────────────────────────────────────────
const h1 = (text, pageBreak = true) =>
  new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: pageBreak, children: [new TextRun({ text, font: FONT })] });
const h2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, font: FONT })] });
const h3 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text, font: FONT })] });
// Front-matter headings look like chapter titles but stay out of the Index.
const frontHeading = (text) =>
  new Paragraph({ style: "FrontHeading", children: [new TextRun({ text, font: FONT })] });

// ── tables ───────────────────────────────────────────────────────────────────
const border = { style: BorderStyle.SINGLE, size: 4, color: "808080" };
const borders = { top: border, bottom: border, left: border, right: border };

function columnWidths(rows) {
  const n = rows[0].length;
  const weights = [];
  for (let c = 0; c < n; c++) {
    const lens = rows.map((r) => (r[c] || "").replace(/\*|`/g, "").length);
    const longestWord = Math.max(...rows.map((r) => Math.max(0, ...(r[c] || "").split(/\s+/).map((w) => w.length))));
    const avg = lens.reduce((a, b) => a + b, 0) / lens.length;
    weights.push(Math.max(Math.sqrt(avg) * 3, longestWord * 0.9, 5));
  }
  const total = weights.reduce((a, b) => a + b, 0);
  const w = weights.map((x) => Math.floor((x / total) * TEXT_W));
  w[w.length - 1] += TEXT_W - w.reduce((a, b) => a + b, 0);
  return w;
}

function table(block) {
  const caption = new Paragraph({
    style: "Caption", alignment: AlignmentType.CENTER, keepNext: true, keepLines: true,
    spacing: { before: 120, after: 80, line: 240 },
    children: [
      new Bookmark({ id: `tab${block.num}`, children: [new TextRun({ text: `Table ${block.num}. `, bold: true, font: FONT, size: pt(11) })] }),
      ...runs(block.caption, { size: pt(11) }),
    ],
  });
  const widths = columnWidths(block.rows);
  const rows = block.rows.map((r, ri) => {
    const isHead = ri === 0;
    const isTotal = /^\*\*Total/.test(r[0] || "");
    return new TableRow({
      tableHeader: isHead, cantSplit: true,
      children: r.map((cell, ci) => new TableCell({
        width: { size: widths[ci], type: WidthType.DXA },
        borders,
        margins: { top: 40, bottom: 40, left: 80, right: 80 },
        verticalAlign: VerticalAlign.TOP,
        shading: isHead ? { fill: "E7E6E1", type: ShadingType.CLEAR, color: "auto" }
          : isTotal ? { fill: "F3F2EE", type: ShadingType.CLEAR, color: "auto" } : undefined,
        children: [new Paragraph({
          spacing: { before: 0, after: 0, line: 240 }, keepNext: isHead,
          children: runs(cell, { size: pt(10), bold: isHead || undefined }),
        })],
      })),
    });
  });
  const t = new Table({ width: { size: TEXT_W, type: WidthType.DXA }, columnWidths: widths, rows });
  const after = new Paragraph({ spacing: { before: 0, after: 120, line: 240 }, children: [] });
  return [caption, t, after];
}

// ── figures ──────────────────────────────────────────────────────────────────
function pngSize(buf) { return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }; }

function figure(block) {
  const buf = fs.readFileSync(block.path);
  const { w, h } = pngSize(buf);
  // drawn at 300 dpi; place at native size (text prints at ~10 pt), capped to text width
  let wIn = w / 300, hIn = h / 300;
  const maxW = 6.27;
  if (wIn > maxW) { hIn *= maxW / wIn; wIn = maxW; }
  const img = new Paragraph({
    alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 60, line: 240 },
    children: [new ImageRun({ type: "png", data: buf, transformation: { width: Math.round(wIn * 96), height: Math.round(hIn * 96) } })],
  });
  const cap = new Paragraph({
    style: "Caption", alignment: AlignmentType.CENTER, spacing: { before: 60, after: 200, line: 240 },
    children: [
      new Bookmark({ id: `fig${block.num}`, children: [new TextRun({ text: `Fig. ${block.num}. `, bold: true, font: FONT, size: pt(11) })] }),
      ...runs(block.caption, { size: pt(11) }),
    ],
  });
  return [img, cap];
}

// ── lists ────────────────────────────────────────────────────────────────────
let numberedInstance = 0;
function list(block) {
  const numbered = block.t === "number";
  if (numbered) numberedInstance += 1;
  return block.items.map((item) => new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 360, before: 0, after: 80 },
    numbering: numbered ? { reference: "numbers", level: 0, instance: numberedInstance } : { reference: "bullets", level: 0 },
    children: runs(item),
  }));
}

// ── title page ───────────────────────────────────────────────────────────────
const center = (text, size, opts = {}) => new Paragraph({
  alignment: AlignmentType.CENTER, spacing: { before: opts.before || 0, after: opts.after ?? 120, line: 276 },
  children: [new TextRun({ text, font: FONT, size: pt(size), bold: opts.bold, italics: opts.italics,
    highlight: opts.placeholder ? HighlightColor.YELLOW : undefined })],
});

const titlePage = [
  center("RESEARCH PROJECT PROPOSAL", 14, { bold: true, before: 600, after: 360 }),
  center(data.title, 18, { bold: true, after: 480 }),
  center("Submitted for the course", 12, { italics: true, after: 60 }),
  center("Research Methodology", 14, { bold: true, after: 360 }),
  center("Bachelor of Engineering (B.E.)", 12, { after: 60 }),
  center("Electronics and Computer Science", 12, { bold: true, after: 480 }),
  center("Submitted by", 12, { italics: true, after: 120 }),
  center("[TEAM MEMBER 1 NAME]  ·  Roll No. [ROLL NO.]", 12, { placeholder: true, after: 60 }),
  center("[TEAM MEMBER 2 NAME]  ·  Roll No. [ROLL NO.]", 12, { placeholder: true, after: 60 }),
  center("[TEAM MEMBER 3 NAME]  ·  Roll No. [ROLL NO.]", 12, { placeholder: true, after: 60 }),
  center("[TEAM MEMBER 4 NAME]  ·  Roll No. [ROLL NO.]", 12, { placeholder: true, after: 480 }),
  center("Under the guidance of", 12, { italics: true, after: 120 }),
  center("[GUIDE NAME]", 12, { bold: true, placeholder: true, after: 60 }),
  center("[DESIGNATION], Department of Electronics and Computer Science", 12, { placeholder: true, after: 600 }),
  center("Department of Electronics and Computer Science", 12, { bold: true, after: 60 }),
  center("Vivekanand Education Society's Institute of Technology (VESIT), Mumbai", 12, { after: 60 }),
  center("Academic Year 2026–27", 12, { after: 0 }),
];

// ── lists of figures / tables: fixed numbers, live page numbers (PAGEREF) ────
const plain = (t) => t.replace(/\*\*|\*|`/g, "");
function captionList(type, label, prefix) {
  return data.blocks.filter((b) => b.t === type).map((b) => new Paragraph({
    style: "TableofFigures",
    tabStops: [{ type: TabStopType.RIGHT, position: TEXT_W, leader: LeaderType.DOT }],
    indent: { left: 900, hanging: 900 },
    children: [
      new TextRun({ text: `${label} ${b.num}.	`.replace("	", " "), bold: true, font: FONT, size: pt(12) }),
      new TextRun({ text: plain(b.caption.split(":")[0]), font: FONT, size: pt(12) }),
      new TextRun({ text: "	", font: FONT, size: pt(12) }),
      new PageReference(`${prefix}${b.num}`),
    ],
  }));
}

// ── front matter ─────────────────────────────────────────────────────────────
const pageBreakPara = () => new Paragraph({ pageBreakBefore: true, children: [] });
const front = [
  frontHeading("Abstract"),
  ...data.abstract.map((p) => bodyPara(p.text)),
  new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { before: 240, after: 120, line: 360 },
    children: [new TextRun({ text: "Keywords: ", bold: true, font: FONT, size: pt(12) }), ...runs(data.keywords)] }),
  new Paragraph({ style: "FrontHeading", pageBreakBefore: true, children: [new TextRun({ text: "Index", font: FONT })] }),
  new TableOfContents("Index", { hyperlink: true, headingStyleRange: "1-2" }),
  new Paragraph({ style: "FrontHeading", pageBreakBefore: true, children: [new TextRun({ text: "List of Figures", font: FONT })] }),
  ...captionList("figure", "Fig.", "fig"),
  new Paragraph({ style: "FrontHeading", pageBreakBefore: true, children: [new TextRun({ text: "List of Tables", font: FONT })] }),
  ...captionList("table", "Table", "tab"),
];

// ── main matter ──────────────────────────────────────────────────────────────
const main = [];
let firstH1 = true;
for (const b of data.blocks) {
  if (b.t === "h1") { main.push(h1(b.text, !firstH1)); firstH1 = false; }
  else if (b.t === "h2") main.push(h2(b.text));
  else if (b.t === "h3") main.push(h3(b.text));
  else if (b.t === "p") main.push(bodyPara(b.text));
  else if (b.t === "table") main.push(...table(b));
  else if (b.t === "figure") main.push(...figure(b));
  else if (b.t === "bullet" || b.t === "number") main.push(...list(b));
}
main.push(h1("References", true));
data.refs.forEach((r, i) => main.push(new Paragraph({
  alignment: AlignmentType.JUSTIFIED,
  spacing: { before: 0, after: 120, line: 240 },
  indent: { left: 648, hanging: 648 },
  tabStops: [{ type: TabStopType.LEFT, position: 648 }],
  children: [new TextRun({ text: `[${i + 1}]\t`, font: FONT, size: pt(12) }), ...runs(r)],
})));

// ── document ─────────────────────────────────────────────────────────────────
const pageNumberFooter = () => new Footer({
  children: [new Paragraph({ alignment: AlignmentType.CENTER,
    children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: pt(11) })] })],
});
const page = { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440, footer: 720 } };

const headingStyle = (id, name, size, level, opts = {}) => ({
  id, name, basedOn: "Normal", next: "Normal", quickFormat: true,
  run: { font: FONT, size: pt(size), bold: true, italics: !!opts.italics, color: "000000" },
  paragraph: { spacing: { before: 240, after: 120, line: 240 }, keepNext: true, keepLines: true, outlineLevel: level },
});

const doc = new Document({
  creator: "SmartOps team",
  title: data.title,
  styles: {
    default: { document: { run: { font: FONT, size: pt(12) } } },
    paragraphStyles: [
      headingStyle("Heading1", "Heading 1", 16, 0),
      headingStyle("Heading2", "Heading 2", 14, 1),
      headingStyle("Heading3", "Heading 3", 12, 2, { italics: true }),
      { id: "FrontHeading", name: "Front Heading", basedOn: "Normal", next: "Normal",
        run: { font: FONT, size: pt(16), bold: true, color: "000000" },
        paragraph: { spacing: { before: 0, after: 240 }, keepNext: true } },
      { id: "Caption", name: "caption", basedOn: "Normal", next: "Normal",
        run: { font: FONT, size: pt(11), color: "000000" } },
      ...["TOC1", "TOC2", "TableofFigures"].map((id, k) => ({
        id, name: id === "TableofFigures" ? "table of figures" : `toc ${k + 1}`, basedOn: "Normal", next: "Normal",
        run: { font: FONT, size: pt(12) },
        paragraph: { spacing: { before: 0, after: 80, line: 276 }, indent: { left: id === "TOC2" ? 360 : 0 } },
      })),
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 540, hanging: 300 } }, run: { font: FONT } } }] },
      { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] },
    ],
  },
  sections: [
    { properties: { page }, children: titlePage },
    { properties: { page: { ...page, pageNumbers: { start: 1, formatType: NumberFormat.LOWER_ROMAN } }, type: SectionType.NEXT_PAGE },
      footers: { default: pageNumberFooter() }, children: front },
    { properties: { page: { ...page, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } }, type: SectionType.NEXT_PAGE },
      footers: { default: pageNumberFooter() }, children: main },
  ],
});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(OUT, b); console.log("wrote", OUT); });
