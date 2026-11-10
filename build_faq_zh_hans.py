# -*- coding: utf-8 -*-
"""Convert Traditional Chinese FAQ answers to Simplified Chinese."""
import re
import json
import os
from opencc import OpenCC

SRC = r"C:\Users\c85-lau\OneDrive - UWE Bristol\customer-service-ai-tg\src\faq-bank.js"
OUT = r"C:\Users\c85-lau\OneDrive - UWE Bristol\customer-service-ai-tg\src\faq-zh-hans.json"

with open(SRC, "r", encoding="utf-8") as f:
    text = f.read()

cc = OpenCC("t2s")

# Match each entry: id + zh array
pattern = re.compile(r'id:\s*"([^"]+)"', re.MULTILINE)
# We'll find zh arrays by scanning
results = {}

# Find all id positions
ids = [(m.group(1), m.start()) for m in pattern.finditer(text)]

for i, (cid, pos) in enumerate(ids):
    # Find the zh: array after this id (before the next id or end)
    end_pos = ids[i + 1][1] if i + 1 < len(ids) else len(text)
    segment = text[pos:end_pos]
    m = re.search(r'zh:\s*\[(.*?)\]\.join\("\\n"\)', segment, re.DOTALL)
    if not m:
        print(f"SKIP (no zh): {cid}")
        continue
    arr_text = m.group(1)
    # Extract string literals
    strs = re.findall(r'"((?:[^"\\]|\\.)*)"', arr_text)
    # Unescape
    lines = []
    for s in strs:
        s = s.replace('\\"', '"').replace("\\n", "\n").replace("\\t", "\t").replace("\\\\", "\\")
        lines.append(s)
    zh_text = "\n".join(lines)
    zh_hans = cc.convert(zh_text)
    results[cid] = zh_hans

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"wrote {OUT}: {len(results)} entries")
for cid in results:
    print(f"  - {cid}: {len(results[cid])} chars")
