// Convert any Markdown-ish model output into plain text with emoji bullets,
// so it renders correctly in Telegram and in the simple web widget.

export function toPlainText(text) {
  let out = String(text || "");
  // Code fences and inline code.
  out = out.replace(/```[a-zA-Z]*/g, "").replace(/`/g, "");
  // Headers.
  out = out.replace(/^#{1,6}\s*(.+)$/gm, "📌 $1");
  // Bold / italic.
  out = out.replace(/\*\*([^*]+)\*\*/g, "$1");
  out = out.replace(/__([^_]+)__/g, "$1");
  out = out.replace(/\*([^*]+)\*/g, "$1");
  out = out.replace(/_([^_]+)_/g, "$1");
  // Links [text](url) -> text: url
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1: $2");
  // Bullets.
  out = out.replace(/^\s*[-*+]\s+/gm, "🔹 ");
  // Numbered steps (1-9) -> keycap emoji.
  out = out.replace(/^\s*([1-9])[.)]\s+/gm, (_, d) => `${d}️⃣ `);
  // Collapse excessive blank lines.
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
}
