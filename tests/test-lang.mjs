const realFetch = globalThis.fetch;
const telegramCalls = [];
globalThis.fetch = async (url, opts) => {
  const u = String(url);
  if (u.includes("api.telegram.org")) {
    telegramCalls.push({ url: u, body: JSON.parse(opts.body || "{}") });
    return new Response(JSON.stringify({ ok: true, result: true }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }
  return realFetch(url, opts);
};
const worker = (await import("../src/index.js")).default;
const env = {
  OPENCODE_GO_API_KEY: "oc_sk_e5ded320ae13_0jIzzR_778kThk-F3ePjlqaUR1SoAQW6",
  TELEGRAM_BOT_TOKEN: "7614032298:AAGrvDDvTLUI_OgSm3IPvwBGflHVlxDVNqc",
  MIN_WORDS: "100", RAG_TOP_K: "5",
};
const pending = [];
const ctx = { waitUntil(p) { pending.push(p); } };

// 1. /start
const upd1 = { message: { chat: { id: 999 }, from: { first_name: "T" }, text: "/start" } };
let r = await worker.fetch(new Request("https://x.com/endpoint", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(upd1) }), env, ctx);
console.log("start status:", r.status, await r.text());
await Promise.all(pending);
const startMsg = telegramCalls[telegramCalls.length - 1];
console.log("start reply_markup:", JSON.stringify(startMsg.body.reply_markup));
console.log("start text:", startMsg.body.text);

// 2. callback: pick English
telegramCalls.length = 0;
const pending2 = [];
const ctx2 = { waitUntil(p) { pending2.push(p); } };
const upd2 = { callback_query: { id: "cb1", data: "lang:en", from: { first_name: "T" }, message: { chat: { id: 999 } } } };
r = await worker.fetch(new Request("https://x.com/endpoint", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(upd2) }), env, ctx2);
console.log("\ncallback status:", r.status, await r.text());
await Promise.all(pending2);
console.log("callback calls:", telegramCalls.map((c) => c.url.split("/").pop()));
for (const c of telegramCalls) console.log("  ", c.body.text || JSON.stringify(c.body).slice(0, 120));

// 3. /start again should reset
telegramCalls.length = 0;
const pending3 = [];
const ctx3 = { waitUntil(p) { pending3.push(p); } };
const upd3 = { message: { chat: { id: 999 }, from: { first_name: "T" }, text: "/start" } };
r = await worker.fetch(new Request("https://x.com/endpoint", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(upd3) }), env, ctx3);
await Promise.all(pending3);
console.log("\nsecond /start text:", telegramCalls[telegramCalls.length - 1].body.text.split("\n")[0]);

