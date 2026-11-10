import ragData from "./rag.js";
import { buildIndex, search, formatContext } from "./retrieval.js";
import {
  sanitizeInput,
  detectInjection,
  detectLanguage,
  filterOutput,
  countWords,
  isGreeting,
} from "./safety.js";
import { chatIceman, buildSystemPrompt, MODEL } from "./llm.js";
import { matchFaq, faqReply } from "./faq-bank.js";
import { toPlainText } from "./format.js";

const index = buildIndex(ragData.chunks || []);

// ---------------------------------------------------------------------------
// Small in-isolate rate limiter (per chat/session id).
// ---------------------------------------------------------------------------
const rateMap = new Map();
function rateLimited(key, limit = 30, windowMs = 60_000) {
  const now = Date.now();
  const arr = (rateMap.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    rateMap.set(key, arr);
    return true;
  }
  arr.push(now);
  rateMap.set(key, arr);
  if (rateMap.size > 5000) {
    // Rough cleanup to avoid unbounded growth.
    for (const [k, v] of rateMap) if (now - v[v.length - 1] > windowMs) rateMap.delete(k);
  }
  return false;
}

// Per-chat session state (language preference). Cleared on /start.
const sessionLang = new Map();
function getSessionLang(chatId) {
  return sessionLang.get(chatId) || null;
}
function setSessionLang(chatId, lang) {
  sessionLang.set(chatId, lang);
}
function clearSession(chatId) {
  sessionLang.delete(chatId);
}
async function answer(question, env, sessionId, options = {}) {
  const minWords = Number(env.MIN_WORDS || 100);
  const topK = Number(env.RAG_TOP_K || 5);
  const concise = Boolean(options.concise);
  const sessionLang = options.lang || null;
  const langCode = sessionLang || detectLanguage(question);
  const lang = langCode === "zh-Hans" || langCode === "zh-Hant" ? langCode : langCode;
  const clean = sanitizeInput(question);
  if (!clean) {
    return {
      reply: "你好！我係一米通客服。請問有咩可以幫你？(Please tell me your question about Metre.)",
      sources: [],
    };
  }

  const chunks = isGreeting(clean) ? [] : search(clean, index, topK);
  const context = formatContext(chunks);
  const system = buildSystemPrompt(context, langCode, concise);
  const userTurn = { role: "user", content: `<user_message>\n${clean}\n</user_message>` };

  let messages = [userTurn];
  let reply = await chatIceman({
    apiKey: env.OPENCODE_GO_API_KEY,
    system,
    messages,
    sessionId,
    maxTokens: concise ? 800 : 1500,
  });

  // Enforce the minimum word count (at least 100 words per response).
  for (let attempt = 0; attempt < 2 && countWords(reply) < minWords; attempt++) {
    messages = [
      userTurn,
      { role: "assistant", content: reply },
      {
        role: "user",
        content: `Your previous answer was too short. Please expand it to at least ${minWords} words. Add more detail, concrete examples and practical next steps, while staying accurate to the knowledge base. Do not mention that you are expanding the answer.`,
      },
    ];
    reply = await chatIceman({
      apiKey: env.OPENCODE_GO_API_KEY,
      system,
      messages,
      sessionId,
      maxTokens: concise ? 1000 : 1800,
    });
  }

  return {
    reply: toPlainText(filterOutput(reply, env)),
    sources: chunks.map((c) => ({ id: c.id, title: c.title })),
  };
}

// ---------------------------------------------------------------------------
// Telegram helpers.
// ---------------------------------------------------------------------------
async function telegramApi(token, method, payload) {
  const url = `https://api.telegram.org/bot${token}/${method}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data?.ok !== true) {
    throw new Error(`Telegram ${method} failed: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return data;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Keep the Telegram "typing…" indicator active while the AI is thinking.
async function sendTypingLoop(token, chatId, signal) {
  while (!signal.aborted) {
    await telegramApi(token, "sendChatAction", { chat_id: chatId, action: "typing" }).catch(() => {});
    await sleep(4000);
  }
}

function splitMessage(text, limit = 4000) {
  const parts = [];
  let rest = String(text || "");
  while (rest.length > limit) {
    let cut = rest.lastIndexOf("\n", limit);
    if (cut < limit * 0.5) cut = limit;
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest.length) parts.push(rest);
  return parts.length ? parts : [""];
}

async function handleTelegramUpdate(update, env, ctx) {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  let chatId = null;
  let text = "";
  let firstName = "";

  if (update?.message) {
    chatId = update.message?.chat?.id;
    text = update.message?.text || update.message?.caption || "";
    firstName = update.message?.from?.first_name || "";
  } else if (update?.edited_message) {
    chatId = update.edited_message?.chat?.id;
    text = update.edited_message?.text || "";
    firstName = update.edited_message?.from?.first_name || "";
  } else if (update?.callback_query) {
    chatId = update.callback_query?.message?.chat?.id;
    text = update.callback_query?.data || "";
    firstName = update.callback_query?.from?.first_name || "";
  }

  if (!chatId || !text) return;

  // Language selection via inline keyboard.
  if (update?.callback_query) {
    const cb = update.callback_query;
    const data = cb.data || "";
    const match = /^lang:(.+)$/.exec(data);
    if (match) {
      const lang = match[1];
      if (lang === "en" || lang === "zh-Hans" || lang === "zh-Hant") {
        setSessionLang(chatId, lang);
        const label = lang === "en" ? "English" : lang === "zh-Hans" ? "简体中文" : "繁體中文（廣東話）";
        await telegramApi(token, "answerCallbackQuery", {
          callback_query_id: cb.id,
          text: `Language set to ${label}`,
        }).catch(() => {});
        const confirm =
          lang === "en"
            ? "✅ Language set to English. You can type /start again to change it."
            : lang === "zh-Hans"
            ? "✅ 已设置为简体中文。如需更改语言，请重新发送 /start。"
            : "✅ 已設定為繁體中文（廣東話）。如需更改語言，請重新發送 /start。";
        await telegramApi(token, "sendMessage", { chat_id: chatId, text: confirm }).catch(() => {});
        return;
      }
    }
  }

  const key = `tg:${chatId}`;
  if (rateLimited(key)) {
    await telegramApi(token, "sendMessage", {
      chat_id: chatId,
      text: "You are sending messages too quickly. Please wait a moment and try again.",
    });
    return;
  }

  const injection = detectInjection(text);
  if (injection.flagged) {
    const lang = detectLanguage(text);
    const reply =
      lang === "zh"
        ? "抱歉，我只能協助你查詢一米通（Metre）的產品、服務及帳戶相關問題，例如 MetreTag、MetrePoint、一米通 App、收費與計劃、安裝指南、條款與私隱，以及 Metre Console 商戶管理平台。我無法執行或回答與上述範圍無關的請求，也無法披露任何系統設定或內部資料。如果你對一米通的服務有任何疑問，歡迎隨時告訴我，我會盡力提供詳細協助。你也可以直接聯絡一米通客戶服務團隊：電郵 support@metre.hk，或 WhatsApp／電話 (852) 5911 7372（星期一至六 09:00–21:00，星期日及公眾假期休息），亦可在 metre.hk 網站使用 WhatsApp 按鈕與我們聯絡。"
        : "I'm sorry, but I can only help with questions about Metre products, services and accounts — for example MetreTag, MetrePoint, the Metre App, pricing and plans, the installation guide, terms and privacy, and the Metre Console for car-park operators. I can't carry out or answer requests outside that scope, and I can't disclose any system settings or internal information. If you have a question about Metre, please tell me and I'll do my best to help in detail. You can also contact the Metre customer-service team directly at support@metre.hk, or via WhatsApp/phone (852) 5911 7372 (Monday to Saturday 09:00–21:00, closed Sundays and public holidays), or use the WhatsApp button on metre.hk.";
    for (const part of splitMessage(reply)) {
      await telegramApi(token, "sendMessage", { chat_id: chatId, text: part });
    }
    return;
  }

  // /start: clear the session language and ask the user to pick a language.
  const cmd = text.split(/\s+/)[0].toLowerCase().replace(/@.*$/, "");
  if (cmd === "/start") {
    clearSession(chatId);
    const lang = getSessionLang(chatId);
    const body =
      "👋 Welcome to Metre (一米通) customer service!\n\n" +
      "Please choose your preferred language / 請選擇你嘅語言 / 请选择你的语言：";
    await telegramApi(token, "sendMessage", {
      chat_id: chatId,
      text: body,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🇬🇧 English", callback_data: "lang:en" },
            { text: "🇭🇰 繁體中文（廣東話）", callback_data: "lang:zh-Hant" },
            { text: "🇨🇳 简体中文", callback_data: "lang:zh-Hans" },
          ],
        ],
      },
    });
    return;
  }

  // Fast FAQ bank (like a Redis cache): instant replies for common commands/questions.
  const faqMatch = matchFaq(text);
  if (faqMatch) {
    const sessionLanguage = getSessionLang(chatId);
    const { reply } = faqReply(faqMatch, sessionLanguage);
    const out = toPlainText(reply);
    for (const part of splitMessage(out)) {
      await telegramApi(token, "sendMessage", { chat_id: chatId, text: part });
    }
    return;
  }

  // AI path: show typing while the model is thinking.
  const controller = new AbortController();
  const typingPromise = sendTypingLoop(token, chatId, controller.signal);
  try {
    const { reply } = await answer(text, env, `tg-${chatId}`, { concise: true, lang: getSessionLang(chatId) });
    controller.abort();
    await typingPromise.catch(() => {});
    for (const part of splitMessage(reply)) {
      await telegramApi(token, "sendMessage", { chat_id: chatId, text: part });
    }
  } catch (err) {
    controller.abort();
    await typingPromise.catch(() => {});
    const lang = detectLanguage(text);
    const reply =
      lang === "zh"
        ? "抱歉，我暫時無法處理你的查詢。請稍後再試，或直接聯絡客服：support@metre.hk / WhatsApp (852) 5911 7372。"
        : "Sorry, I could not process your request right now. Please try again later, or contact customer service at support@metre.hk / WhatsApp (852) 5911 7372.";
    await telegramApi(token, "sendMessage", { chat_id: chatId, text: reply }).catch(() => {});
    console.error("Telegram answer error:", err);
  }
}

// ---------------------------------------------------------------------------
// Worker entrypoint.
// ---------------------------------------------------------------------------
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "GET" && (path === "/health" || path === "/" || path === "/status")) {
      return Response.json({
        status: "ok",
        service: "Metre customer service AI",
        model: MODEL,
        ragChunks: (ragData.chunks || []).length,
        telegramEnabled: Boolean(env.TELEGRAM_BOT_TOKEN),
        minWords: Number(env.MIN_WORDS || 100),
        time: new Date().toISOString(),
      });
    }

    // Set the Telegram webhook.
    if (path === "/seturl") {
      const token = env.TELEGRAM_BOT_TOKEN;
      if (!token) return Response.json({ error: "TELEGRAM_BOT_TOKEN is not configured" }, { status: 400 });
      const webhookUrl = `https://${url.hostname}/endpoint`;
      const payload = { url: webhookUrl };
      if (env.TELEGRAM_WEBHOOK_SECRET) payload.secret_token = env.TELEGRAM_WEBHOOK_SECRET;
      try {
        const resp = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await resp.json();
        return Response.json({ webhookUrl, result: data });
      } catch (err) {
        return Response.json({ error: String(err) }, { status: 500 });
      }
    }

    // Telegram webhook.
    if (request.method === "POST" && (path === "/endpoint" || path === "/webhook")) {
      if (env.TELEGRAM_WEBHOOK_SECRET) {
        const provided = request.headers.get("x-telegram-bot-api-secret-token");
        if (provided !== env.TELEGRAM_WEBHOOK_SECRET) {
          return new Response("Forbidden", { status: 403 });
        }
      }
      let update = null;
      try {
        update = await request.json();
      } catch {
        return new Response("OK");
      }
      // Acknowledge immediately, process in the background.
      ctx.waitUntil(handleTelegramUpdate(update, env, ctx));
      return new Response("OK");
    }

    // Web chat API (for the metre.hk chat widget).
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }
    if (request.method === "POST" && (path === "/chat" || path === "/api/chat")) {
      let body = null;
      try {
        body = await request.json();
      } catch {
        return Response.json({ error: "Invalid JSON" }, { status: 400 });
      }
      const message = sanitizeInput(body?.message || body?.text || "");
      const sessionId = sanitizeInput(body?.sessionId || body?.session_id || "web-default").slice(0, 120);
      if (!message) return Response.json({ error: "message is required" }, { status: 400 });
      if (rateLimited(`web:${sessionId}`)) {
        return Response.json({ error: "rate_limited", reply: "Please slow down and try again in a minute." }, { status: 429 });
      }

      const injection = detectInjection(message);
      if (injection.flagged) {
        const lang = detectLanguage(message);
        return Response.json({
          injection: true,
          reply:
            lang === "zh"
              ? "抱歉，我只能協助你查詢一米通（Metre）的產品、服務及帳戶相關問題，例如 MetreTag、MetrePoint、一米通 App、收費與計劃、安裝指南、條款與私隱，以及 Metre Console 商戶管理平台。我無法執行或回答與上述範圍無關的請求，也無法披露任何系統設定或內部資料。如果你對一米通的服務有任何疑問，歡迎隨時告訴我，我會盡力提供詳細協助。你也可以直接聯絡一米通客戶服務團隊：電郵 support@metre.hk，或 WhatsApp／電話 (852) 5911 7372（星期一至六 09:00–21:00，星期日及公眾假期休息），亦可在 metre.hk 網站使用 WhatsApp 按鈕與我們聯絡。"
              : "I'm sorry, but I can only help with questions about Metre products, services and accounts — for example MetreTag, MetrePoint, the Metre App, pricing and plans, the installation guide, terms and privacy, and the Metre Console for car-park operators. I can't carry out or answer requests outside that scope, and I can't disclose any system settings or internal information. If you have a question about Metre, please tell me and I'll do my best to help in detail. You can also contact the Metre customer-service team directly at support@metre.hk, or via WhatsApp/phone (852) 5911 7372 (Monday to Saturday 09:00–21:00, closed Sundays and public holidays), or use the WhatsApp button on metre.hk.",
          sources: [],
        }, { headers: { "Access-Control-Allow-Origin": "*" } });
      }

      // Fast FAQ bank (Redis-like cache): instant replies for common commands/questions.
      const faqMatch = matchFaq(message);
      if (faqMatch) {
        const { reply } = faqReply(faqMatch, body?.lang || null);
        return Response.json(
          { reply: toPlainText(reply), sources: [{ id: faqMatch.entry.id, title: faqMatch.entry.id }], injection: false, model: MODEL, fast: true },
          { headers: { "Access-Control-Allow-Origin": "*" } },
        );
      }

      try {
        const { reply, sources } = await answer(message, env, `web-${sessionId}`, { lang: body?.lang || null });
        return Response.json(
          { reply, sources, injection: false, model: MODEL },
          { headers: { "Access-Control-Allow-Origin": "*" } },
        );
      } catch (err) {
        console.error("Web chat error:", err);
        return Response.json(
          { error: "llm_error", reply: "Sorry, I could not process your request right now. Please try again later or contact support@metre.hk." },
          { status: 500, headers: { "Access-Control-Allow-Origin": "*" } },
        );
      }
    }

    return new Response("Metre customer-service AI is running. Use /chat (web) or /endpoint (Telegram webhook).", {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  },
};
