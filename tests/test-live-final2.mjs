for (const message of ["/start", "What is the warranty policy for a damaged MetreTag?"]) {
  const t0 = Date.now();
  const res = await fetch("https://metrecs.hheylau.workers.dev/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ message, sessionId: "final-test" }),
  });
  const data = await res.json();
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  const words = (data.reply || "").match(/[a-zA-Z0-9]+|[ä¸€-é¿¿]/g)?.length || 0;
  console.log(`\n=== ${message} === (${dt}s)`);
  console.log(`status=${res.status} words=${words} fast=${data.fast} injection=${data.injection}`);
  console.log((data.reply || "").slice(0, 300).replace(/\n/g, " "));
}

