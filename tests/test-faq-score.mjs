import { faqEntries } from "../src/faq-bank.js";
const t = "MetreTag å¦‚ä½•ä¾›é›»";
const lower = t.toLowerCase();
const BRAND = new Set(["metretag","metrepoint","metre app","metre console","metre","uwb","app","console"]);
for (const e of faqEntries) {
  let score = 0;
  const hits = [];
  for (const kw of e.keywords || []) {
    if (lower.includes(kw.toLowerCase())) {
      const k = kw.toLowerCase();
      const s = (BRAND.has(k) || k.includes("metre")) ? 1 : 10;
      score += s;
      hits.push(`${kw}+${s}`);
    }
  }
  if (score > 0) console.log(`${e.id}: score=${score} hits=[${hits.join(",")}]`);
}

