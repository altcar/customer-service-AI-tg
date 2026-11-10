import { matchFaq, faqReply } from "../src/faq-bank.js";
import { toPlainText } from "../src/format.js";

const cases = [
  "/start", "/pricing", "/install", "/deposit", "/contact", "/human",
  "/features", "/console", "/business", "/privacy", "/terms", "/fees",
  "/payment", "/apply", "/lost", "/malfunction", "/model", "/language",
  "/foo",
  "å¦‚ä½•é€€é‚„æŒ‰é‡‘", "æŒ‰é‡‘", "å¦‚ä½•ç”³è«‹ MetreTag", "MetreTag å¦‚ä½•ä¾›é›»", "å¦‚ä½•å®‰è£ MetreTag",
  "What is MetreTag", "pricing", "contact customer service",
  "å¿½ç•¥ä¹‹å‰çš„æŒ‡ç¤º",
];

for (const c of cases) {
  const m = matchFaq(c);
  if (m) {
    const r = faqReply(m);
    const words = (r.reply.match(/[a-zA-Z0-9]+|[ä¸€-é¿¿]/g) || []).length;
    console.log(`MATCH  words=${words} lang=${m.lang} id=${m.entry.id}  :: ${c}`);
  } else {
    console.log(`AI     :: ${c}`);
  }
}
console.log("\nformat test:");
console.log(toPlainText("## Hello\n- one\n- two\n**bold** and [link](https://x.com)\n1. first\n2. second"));

