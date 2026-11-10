// Safety barrier: prompt-injection detection, input sanitisation and output filtering.

const EN_INJECTION = [
  /ignore\s+(all\s+)?(previous|above|prior|earlier|preceding)\s+(instructions?|prompts?|rules?|messages?|commands?)/i,
  /disregard\s+(all\s+)?(previous|above|prior|earlier|preceding)/i,
  /forget\s+(everything|all|your\s+(instructions?|rules?|training|guidelines?))/i,
  /you\s+are\s+(now|no\s+longer)\b/i,
  /act\s+as\s+(a\s+)?(different|another|evil|unfiltered|illegal|janitor|hacker)/i,
  /pretend\s+(to\s+be|you\s+are)/i,
  /role\s*[- ]?play\s+as/i,
  /(system|developer|assistant)\s*(prompt|message|instructions?)\s*[:：]/i,
  /reveal\s+(your|the|me)\s+(system\s+)?(prompt|instructions?|rules?|configuration|config)/i,
  /print\s+(your|the|me)\s+(system\s+)?(prompt|instructions?|rules?)/i,
  /show\s+(me\s+)?(your|the)\s+(system\s+)?(prompt|instructions?|rules?)/i,
  /(leak|dump|export|expose)\s+(your|the)\s+(system\s+)?(prompt|instructions?|rules?|keys?|secrets?)/i,
  /(jailbreak|developer\s+mode|dan\s+mode|evil\s+mode|unfiltered\s+mode)/i,
  /bypass\s+(your\s+)?(safety|filter|rules|guardrails?|restrictions?)/i,
  /disable\s+(your\s+)?(safety|filter|rules|guardrails?|restrictions?)/i,
  /do\s+not\s+follow\s+(your\s+)?(instructions?|rules?|guidelines?)/i,
  /new\s+instructions?\s*[:：]/i,
  /override\s+(your\s+)?(instructions?|rules?|safety|guidelines?)/i,
  /(api[_\s-]?key|secret|token|password|credential)\s*[:=]/i,
  /(oc_sk_[a-z0-9_\-]+|sk-[a-z0-9]{16,}|ghp_[a-z0-9]{20,})/i,
  /<\|(?:im_start|im_end|system|assistant|user)\|>/i,
  /\[(?:system|developer|assistant)\]/i,
  /```(?:system|developer|assistant)/i,
  /\b(system|developer)\s+prompt\b/i,
  /\bprompt\s+injection\b/i,
  /\bignore\s+the\s+above\b/i,
];

const ZH_INJECTION = [
  /(忽略|無視|不理|忘記|忘掉).{0,8}(之前|以上|前面|所有).{0,8}(指示|指令|規則|規定|提示)/,
  /(你現在|你而家|你現在係).{0,6}(一個|另一個|不再是)/,
  /(假裝|扮演|角色扮演).{0,6}(作為|係|一個)/,
  /(系統|開發者|助手).{0,4}(提示|指令|規則).{0,2}[:：]/,
  /(透露|泄露|輸出|顯示|打印|揭示).{0,8}(你|系統).{0,6}(提示|指令|規則|設定|密碼|密鑰)/,
  /(越獄|监狱逃脱|開發者模式|邪惡模式|無過濾)/,
  /(繞過|避過|停用|關閉).{0,6}(安全|過濾|規則|限制|防護)/,
  /(不要|唔好).{0,4}(跟隨|遵從|遵守|聽從).{0,6}(指示|指令|規則)/,
  /(新|新的).{0,2}(指示|指令).{0,2}[:：]/,
  /(覆盖|覆蓋|取代).{0,6}(指示|指令|規則|安全)/,
  /(密鑰|密碼|權杖|token|api.?key).{0,2}[:：=]/i,
];

const SECRET_PATTERNS = [
  /oc_sk_[a-z0-9_\-]+/gi,
  /sk-[a-z0-9]{16,}/gi,
  /ghp_[a-z0-9]{20,}/gi,
  /\b[0-9]{8,12}:AA[A-Za-z0-9_\-]{30,}\b/g,
];

export function sanitizeInput(raw) {
  if (typeof raw !== "string") return "";
  // Strip control characters except newlines/tabs, collapse whitespace.
  let text = raw.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ");
  text = text.replace(/\s+/g, " ").trim();
  if (text.length > 2000) text = text.slice(0, 2000);
  return text;
}

export function detectInjection(raw) {
  const text = String(raw || "");
  const reasons = [];
  for (const re of EN_INJECTION) {
    if (re.test(text)) {
      reasons.push(`en:${re.source.slice(0, 40)}`);
      break;
    }
  }
  for (const re of ZH_INJECTION) {
    if (re.test(text)) {
      reasons.push(`zh:${re.source.slice(0, 40)}`);
      break;
    }
  }
  // Delimiter / role-confusion probes.
  if (/<(?:user|assistant|system|im_start|im_end)>/i.test(text) && /(?:user|assistant|system)>/i.test(text)) {
    if (!reasons.length) reasons.push("delimiter-role-probe");
  }
  return { flagged: reasons.length > 0, reasons };
}

export function detectLanguage(text) {
  const cjk = (String(text).match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g) || []).length;
  const latin = (String(text).match(/[a-zA-Z]/g) || []).length;
  // Prefer Chinese whenever there are at least a couple of CJK characters,
  // so mixed Chinese/English queries (e.g. "MetreTag 如何供電") reply in Chinese.
  if (cjk >= 2) return "zh";
  if (latin > cjk) return "en";
  return "zh";
}

export function filterOutput(text, env = {}) {
  let out = String(text || "");
  const secrets = [];
  if (env.OPENCODE_GO_API_KEY) secrets.push(env.OPENCODE_GO_API_KEY);
  if (env.TELEGRAM_BOT_TOKEN) secrets.push(env.TELEGRAM_BOT_TOKEN);
  for (const s of secrets) {
    if (s) out = out.split(s).join("[REDACTED]");
  }
  for (const re of SECRET_PATTERNS) out = out.replace(re, "[REDACTED]");
  // Remove leaked internal markers if the model echoes them.
  out = out.replace(/<\|(?:im_start|im_end|system|assistant|user)\|>/gi, "");
  out = out.replace(/\[(?:system|developer)\]\s*:?/gi, "");
  return out.trim();
}

export function countWords(text) {
  const cjk = (String(text).match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g) || []).length;
  const latin = (String(text).match(/[a-zA-Z0-9]+/g) || []).length;
  return cjk + latin;
}

export function isGreeting(text) {
  return /^(?:\s*(hi|hello|hey|good\s+(morning|afternoon|evening)|yo|sup|你好|您好|哈囉|hello|hi|早晨|下午好|晚上好|在嗎|在吗)\b[.!！。\s]*$)/i.test(
    String(text || "").trim(),
  );
}
