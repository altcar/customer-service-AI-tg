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
  OPENCODE_GO_API_KEY: "process.env.OPENCODE_GO_API_KEY",
  TELEGRAM_BOT_TOKEN: "7614032298:AAGrvDDvTLUI_OgSm3IPvwBGflHVlxDVNqc",
  MIN_WORDS: "100", RAG_TOP_K: "5",
};

// Set language to English
let pending = [];
let ctx = { waitUntil(p) { pending.push(p); } };
let upd = { callback_query: { id: "c", data: "lang:en", from: { first_name: "T" }, message: { chat: { id: 777 } } } };
await worker.fetch(new Request("https://x.com/endpoint", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(upd) }), env, ctx);
await Promise.all(pending);

// Now ask a question (should use English FAQ answer)
telegramCalls.length = 0;
pending = [];
ctx = { waitUntil(p) { pending.push(p); } };
upd = { message: { chat: { id: 777 }, from: { first_name: "T" }, text: "å¦‚ä½•é€€é‚„æŒ‰é‡‘" } };
await worker.fetch(new Request("https://x.com/endpoint", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(upd) }), env, ctx);
await Promise.all(pending);
const reply = telegramCalls[telegramCalls.length - 1].body.text;
console.log("=== FAQ reply (English session) ===");
console.log(reply.slice(0, 400));

// Now test Simplified Chinese
telegramCalls.length = 0;
pending = [];
ctx = { waitUntil(p) { pending.push(p); } };
upd = { callback_query: { id: "c2", data: "lang:zh-Hans", from: { first_name: "T" }, message: { chat: { id: 777 } } } };
await worker.fetch(new Request("https://x.com/endpoint", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(upd) }), env, ctx);
await Promise.all(pending);

telegramCalls.length = 0;
pending = [];
ctx = { waitUntil(p) { pending.push(p); } };
upd = { message: { chat: { id: 777 }, from: { first_name: "T" }, text: "/deposit" } };
await worker.fetch(new Request("https://x.com/endpoint", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(upd) }), env, ctx);
await Promise.all(pending);
const reply2 = telegramCalls[telegramCalls.length - 1].body.text;
console.log("\n=== FAQ reply (Simplified session) ===");
console.log(reply2.slice(0, 400));

