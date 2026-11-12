const questions = [
  "What is MetreTag and how does it work?",
  "How much is the monthly plan for MetrePoint?",
  "How do I install MetreTag?",
  "What can I do in the Metre Console?",
];
for (const message of questions) {
  const res = await fetch("https://metrecs.hheylau.workers.dev/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ message, sessionId: "final-live" }),
  });
  const data = await res.json();
  const words = (data.reply || "").match(/[a-zA-Z0-9]+|[ä¸€-é¿¿]/g)?.length || 0;
  console.log(`\n=== ${message} ===`);
  console.log(`status=${res.status} words=${words} sources=${(data.sources || []).map((s) => s.id).join(",")}`);
  console.log((data.reply || "").slice(0, 260).replace(/\n/g, " "));
}

