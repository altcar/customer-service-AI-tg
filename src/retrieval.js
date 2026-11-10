// Lightweight lexical RAG retrieval over the bundled knowledge document.
// Works for both English (word tokens) and Chinese (character bigrams/trigrams).

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from", "has", "have",
  "he", "her", "his", "i", "in", "is", "it", "its", "me", "my", "of", "on", "or", "our",
  "she", "so", "that", "the", "their", "them", "they", "this", "to", "was", "we", "were",
  "what", "when", "where", "which", "who", "will", "with", "you", "your", "do", "does",
  "did", "how", "why", "if", "can", "could", "should", "would", "there", "here", "then",
  "than", "into", "about", "over", "after", "before", "more", "any", "all", "not", "no",
  "yes", "ok", "please", "tell", "want", "need", "know", "get", "got", "am", "been",
]);

const CJK_RE = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+/g;

export function tokenize(text) {
  const tokens = [];
  const lower = String(text || "").toLowerCase();
  for (const m of lower.matchAll(/[a-z0-9]+/g)) {
    const w = m[0];
    if (w.length > 1 && !STOPWORDS.has(w)) tokens.push(w);
  }
  for (const run of lower.matchAll(CJK_RE)) {
    const s = run[0];
    for (let i = 0; i < s.length; i++) {
      if (i + 1 < s.length) tokens.push(s.slice(i, i + 2));
      if (i + 2 < s.length) tokens.push(s.slice(i, i + 3));
    }
  }
  return tokens;
}

export function buildIndex(chunks) {
  const docs = chunks.map((chunk) => {
    const haystack = `${chunk.title}\n${(chunk.keywords || []).join(" ")}\n${chunk.text}`;
    const tokens = tokenize(haystack);
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    return { chunk, tf, len: tokens.length };
  });
  const df = new Map();
  for (const d of docs) {
    for (const t of d.tf.keys()) df.set(t, (df.get(t) || 0) + 1);
  }
  const avgLen = docs.length ? docs.reduce((a, d) => a + d.len, 0) / docs.length : 1;
  return { docs, df, avgLen };
}

export function search(query, index, topK = 5) {
  const qTokens = new Set(tokenize(query));
  if (!qTokens.size || !index.docs.length) return [];
  const N = index.docs.length;
  const k1 = 1.2;
  const b = 0.75;
  const scored = [];
  for (const d of index.docs) {
    let score = 0;
    for (const t of qTokens) {
      const tf = d.tf.get(t);
      if (!tf) continue;
      const freq = index.df.get(t) || 1;
      const idf = Math.log(1 + (N - freq + 0.5) / (freq + 0.5));
      const norm = tf / (tf + k1 * (1 - b + (b * d.len) / index.avgLen));
      const kwBoost = (d.chunk.keywords || []).some((k) => k.toLowerCase() === t) ? 2.5 : 1;
      score += idf * norm * kwBoost;
    }
    if (score > 0) scored.push({ chunk: d.chunk, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map((s) => s.chunk);
}

export function formatContext(chunks) {
  if (!chunks.length) return "";
  return chunks
    .map((c, i) => `[${i + 1}] ${c.title}\n${c.text}`)
    .join("\n\n");
}
