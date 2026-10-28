"""Renders a markdown document to a print-ready HTML file (A4) for Edge to print."""
import re
import sys
from pathlib import Path

import markdown

CSS = """
@page { size: A4; margin: 16mm 16mm 18mm 16mm; }
:root { --ink:#16161a; --muted:#5a5954; --navy:#1F3A68; --line:#dfe3ea; --tint:#f3f6fb; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: "Segoe UI", Calibri, Arial, sans-serif; color: var(--ink); font-size: 10.5pt;
       line-height: 1.5; margin: 0; }
h1 { font-size: 19pt; color: var(--navy); margin: 0 0 10px; break-after: avoid; }
h1 + p { color: var(--muted); }
h2 { font-size: 14pt; color: var(--navy); margin: 18px 0 4px; break-after: avoid; }
h3 { font-size: 11.5pt; margin: 14px 0 4px; break-after: avoid; }
h2 + p em, h3 + p em { color: var(--muted); }
p { margin: 5px 0; }
ul, ol { margin: 5px 0 8px 20px; padding: 0; }
li { margin: 3px 0; }
strong { color: var(--ink); }
table { border-collapse: collapse; width: 100%; font-size: 9.6pt; margin: 8px 0 12px; break-inside: avoid; }
th, td { border: 1px solid var(--line); padding: 5px 7px; text-align: left; vertical-align: top; }
th { background: var(--tint); }
hr { border: 0; border-top: 1px solid var(--line); margin: 16px 0; }
code { font-family: Consolas, "Courier New", monospace; font-size: 9.5pt; background: var(--tint);
       padding: 0 3px; border-radius: 3px; }
h3, h2 { break-after: avoid; }
h3 + ul, h2 + p, h2 + table { break-before: avoid; }
blockquote { margin: 6px 0; padding: 6px 12px; background: var(--tint); border-radius: 6px; }
"""

src = Path(sys.argv[1])
out = Path(sys.argv[2])
text = src.read_text(encoding="utf-8")
html = markdown.markdown(text, extensions=["tables", "sane_lists"])
# keep each paper block (h2 + its bullet list) together where it fits
html = re.sub(r"<h2>", '<h2 class="keep">', html)
out.write_text(
    f"<!DOCTYPE html><html lang='en'><head><meta charset='utf-8'><title>{src.stem}</title>"
    f"<style>{CSS}</style></head><body>{html}</body></html>", encoding="utf-8")
print("wrote", out)
