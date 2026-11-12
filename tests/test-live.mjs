const res = await fetch("https://metrecs.hheylau.workers.dev/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ message: "å¦‚ä½•é€€é‚„æŒ‰é‡‘ï¼Ÿ", sessionId: "node-live-test" }),
});
const data = await res.json();
const words = (data.reply || "").match(/[a-zA-Z0-9]+|[ä¸€-é¿¿]/g)?.length || 0;
console.log("status:", res.status);
console.log("model:", data.model);
console.log("sources:", (data.sources || []).map((s) => s.id).join(","));
console.log("words:", words);
console.log("reply:\n" + data.reply);

