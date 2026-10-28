"""Parses src/final_report.md into report.json for build.js.

- Numbers IEEE citations in order of first appearance (refs.py database).
- Resolves {#tab:key}/{#fig:key} labels and {@tab:key}/{@fig:key} references,
  so every "Table n" / "Fig. n" in the text matches its caption number.
- Fails loudly on unknown keys, missing figures, or unreferenced tables/figures.
"""
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(ROOT / "build"))
from refs import REFS, number_citations  # noqa: E402

src = (ROOT / "src" / "final_report.md").read_text(encoding="utf-8")
fm = re.match(r"---\n(.*?)\n---\n", src, re.S)
title = re.search(r'title:\s*"(.*)"', fm.group(1)).group(1)
body = src[fm.end():]

# 1. label numbering (tables and figures separately, in order of appearance)
labels = {}
counts = {"tab": 0, "fig": 0}
for m in re.finditer(r"\{#(tab|fig):([\w-]+)\}", body):
    kind, key = m.groups()
    counts[kind] += 1
    labels[f"{kind}:{key}"] = counts[kind]

used = set()


def ref_repl(m):
    k = f"{m.group(1)}:{m.group(2)}"
    if k not in labels:
        raise KeyError(f"Unknown cross-reference {k}")
    used.add(k)
    return str(labels[k])


body = re.sub(r"\{@(tab|fig):([\w-]+)\}", ref_repl, body)
unused = set(labels) - used
if unused:
    raise SystemExit(f"Tables/figures never referenced in text: {sorted(unused)}")

# 2. citations
body, order = number_citations(body)

# 3. blocks
blocks, abstract, keywords = [], [], ""
lines = body.split("\n")
i, section, buf = 0, None, []


def flush():
    if buf:
        text = " ".join(x.strip() for x in buf)
        (abstract if section == "abstract" else blocks).append({"t": "p", "text": text})
        buf.clear()


while i < len(lines):
    s = lines[i].strip()
    if not s:
        flush(); i += 1; continue
    if s.startswith("# "):
        flush()
        h = s[2:]
        if h == "Abstract":
            section = "abstract"
        elif h == "References":
            section = "refs"
        else:
            section = "body"
            blocks.append({"t": "h1", "text": h})
        i += 1; continue
    if s.startswith("**Keywords:**"):
        flush(); keywords = s[len("**Keywords:**"):].strip(); i += 1; continue
    if s.startswith("## "):
        flush(); blocks.append({"t": "h2", "text": s[3:]}); i += 1; continue
    if s.startswith("### "):
        flush(); blocks.append({"t": "h3", "text": s[4:]}); i += 1; continue
    if s.startswith("Table:"):
        flush()
        m = re.match(r"Table:\s*\{#tab:([\w-]+)\}\s*(.*)", s)
        num, cap = labels["tab:" + m.group(1)], m.group(2)
        i += 1
        while not lines[i].strip():
            i += 1
        rows = []
        while i < len(lines) and lines[i].strip().startswith("|"):
            cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
            if not all(re.fullmatch(r":?-{3,}:?", c) for c in cells):
                rows.append(cells)
            i += 1
        blocks.append({"t": "table", "num": num, "caption": cap, "rows": rows})
        continue
    if s.startswith("!["):
        flush()
        m = re.match(r"!\[(.*?)\]\((.*?)\)\{#fig:([\w-]+)\}", s)
        cap, path, key = m.groups()
        if not (ROOT / path).exists():
            raise FileNotFoundError(path)
        blocks.append({"t": "figure", "num": labels["fig:" + key], "caption": cap,
                       "path": str((ROOT / path).resolve())})
        i += 1; continue
    m = re.match(r"(- |\d+\. )(.*)", s)
    if m:
        flush()
        kind = "bullet" if m.group(1) == "- " else "number"
        items = []
        while i < len(lines):
            mm = re.match(r"(- |\d+\. )(.*)", lines[i].strip())
            if not mm or (mm.group(1) == "- ") != (kind == "bullet"):
                break
            items.append(mm.group(2)); i += 1
        blocks.append({"t": kind, "items": items})
        continue
    buf.append(lines[i]); i += 1
flush()

refs = [REFS[k] for k in order]
out = {"title": title, "abstract": abstract, "keywords": keywords, "blocks": blocks, "refs": refs}
(HERE / "report.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")

words = len(re.findall(r"\w+", body))
print(f"ok: {len(blocks)} blocks, {counts['tab']} tables, {counts['fig']} figures, "
      f"{len(refs)} references, ~{words} words; abstract {len(' '.join(a['text'] for a in abstract).split())} words")
