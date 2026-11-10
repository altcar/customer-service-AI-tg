import ragData from "../src/rag.js";
import { buildIndex, search, formatContext } from "../src/retrieval.js";

const index = buildIndex(ragData.chunks || []);
const queries = [
  "如何退還按金？",
  "How do I get my deposit refunded?",
  "MetreTag 如何供電？",
  "MetreTag 如何避免盜刷？",
  "如果我的手機沒電了，還能自動扣款嗎？",
  "pricing for business",
  "MetrePoint 月租方案",
  "如何安裝 MetreTag？",
  "服務收費及指引",
  "Metre Console 有什麼功能？",
  "merchant application steps",
  "privacy policy personal data",
  "What is Metre and why UWB?",
  "contact customer service",
  "hello",
];

for (const q of queries) {
  const hits = search(q, index, 3);
  console.log(`\nQ: ${q}`);
  if (!hits.length) console.log("  (no hits)");
  for (const h of hits) console.log(`  - [${h.id}] ${h.title} (${h.lang})`);
}
