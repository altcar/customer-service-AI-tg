const realFetch = globalThis.fetch;
const telegramCalls = [];

globalThis.fetch = async (url, opts) => {
  const u = String(url);
  if (u.includes("api.telegram.org")) {
    telegramCalls.push({ url: u, body: JSON.parse(opts.body || "{}") });
    return new Response(JSON.stringify({ ok: true, result: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  return realFetch(url, opts);
};

const worker = (await import("../src/index.js")).default;
const env = {
  OPENCODE_GO_API_KEY: "oc_sk_e5ded320ae13_0jIzzR_778kThk-F3ePjlqaUR1SoAQW6",
  TELEGRAM_BOT_TOKEN: "7614032298:AAGrvDDvTLUI_OgSm3IPvwBGflHVlxDVNqc",
  MIN_WORDS: "100",
  RAG_TOP_K: "5",
};
const pending = [];
const ctx = { waitUntil(p) { pending.push(p); } };

const update = {
  message: {
    chat: { id: 123456789 },
    from: { first_name: "Test" },
    text: "å¦‚ä½•é€€é‚„æŒ‰é‡‘ï¼Ÿ",
  },
};
const req = new Request("https://x.com/endpoint", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(update),
});
const resp = await worker.fetch(req, env, ctx);
console.log("webhook status:", resp.status, await resp.text());
await Promise.all(pending);

console.log("telegram calls:", telegramCalls.length);
for (const c of telegramCalls) {
  const text = c.body.text || "";
  const words = (text.match(/[a-zA-Z0-9]+|[ä¸€-é¿¿]/g) || []).length;
  console.log("  url:", c.url, "| chat:", c.body.chat_id, "| words:", words);
  console.log("  text:", text.slice(0, 160).replace(/\n/g, " "));
}

