# Metre Customer Service AI (customer-service-ai-tg)

A customer-service AI for **Metre (ä¸€ç±³é€š)** â€” [metre.hk](https://www.metre.hk), the business
page and the Metre Console. It runs on Cloudflare Workers and combines:

- a **bundled RAG knowledge file** (`rag.json`) built from the public website, the installation
  guide, the legal PDFs (privacy policy, terms of use, MetreTag conditions, fee schedule) and the
  logged-in Metre Console;
- **keyword/BM25 retrieval** inside the Worker (English words + Chinese character n-grams), so no
  external vector database is needed;
- the **Iceman Contributor Free** model via the **OpenCode Go** API â€” the only model this Worker
  calls;
- a **prompt-injection safety barrier** (input detection, untrusted-context rules, output
  filtering, rate limiting);
- a **minimum of 100 words** per answer;
- **Telegram bot** and **web chat** interfaces.

## Files

| File | Purpose |
| --- | --- |
| `rag.json` | The RAG document: 60+ chunks of Metre knowledge (bilingual). Edit this to add/update content. |
| `build_rag.py` | Rebuilds `rag.json` from the extracted website/PDF text (optional). |
| `src/index.js` | Worker entrypoint: Telegram webhook, `/chat` web API, `/seturl`, `/health`. |
| `src/retrieval.js` | Lexical RAG retrieval (BM25-style, English + Chinese). |
| `src/safety.js` | Prompt-injection detection, input sanitisation, output filtering, word counting. |
| `src/llm.js` | OpenCode Go / Iceman Contributor Free client and system prompt. |
| `wrangler.json` | Wrangler configuration. |

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Health/status JSON (model, chunk count, flags). |
| `POST` | `/chat` | Web chat JSON API. Body: `{"message": "...", "sessionId": "..."}`. Returns `{reply, sources, injection, model}`. CORS-enabled. |
| `POST` | `/endpoint` | Telegram webhook (set by `/seturl`). |
| `GET` | `/seturl` | Registers the Telegram webhook for this Worker. |

## Secrets

| Secret | Required | Description |
| --- | --- | --- |
| `OPENCODE_GO_API_KEY` | yes | OpenCode Go API key (the `oc_sk_...` key). |
| `TELEGRAM_BOT_TOKEN` | for Telegram | Telegram bot token from @BotFather. |
| `TELEGRAM_WEBHOOK_SECRET` | optional | If set, `/endpoint` requires the `x-telegram-bot-api-secret-token` header to match. |

Set them with Wrangler:

```sh
wrangler secret put OPENCODE_GO_API_KEY
wrangler secret put TELEGRAM_BOT_TOKEN
```

## Deploy

```sh
npm install -g wrangler   # already installed on this machine
wrangler deploy
```

The Worker is served at `https://metrecs.hheylau.workers.dev`.

After deploying, set the Telegram webhook:

```sh
curl https://metrecs.hheylau.workers.dev/seturl
```

## Web chat widget

`widget.html` is a self-contained floating chat widget. Copy the `<button>`, `<div id="metre-chat-panel">`
and `<script>` blocks into any page on `metre.hk` (before `</body>`). It calls the Worker's
`/chat` endpoint and needs no build step. Update the `API` constant if the Worker URL changes.

## Telegram setup

The current bot is **@metrehkbot** and its webhook is already registered to
`https://metrecs.hheylau.workers.dev/endpoint`. Send it a message to try it.

To use a different bot:

1. Create a bot with [@BotFather](https://t.me/BotFather) and copy the token.
2. Set the secret: `wrangler secret put TELEGRAM_BOT_TOKEN`
3. Register the webhook: `curl https://metrecs.hheylau.workers.dev/seturl`
4. Send a message to your bot â€” it will reply using the RAG knowledge base.

## Safety barrier

- Detects common prompt-injection patterns in English and Chinese (e.g. â€œignore previous
  instructionsâ€, â€œreveal your system promptâ€, â€œDAN modeâ€, ã€Œå¿½ç•¥ä¹‹å‰çš„æŒ‡ç¤ºã€, ã€Œé€éœ²ä½ çš„ç³»çµ±æç¤ºã€).
- Treats both the user message and the retrieved knowledge as untrusted data and delimits them.
- Refuses requests outside the Metre customer-service scope and never reveals prompts, keys or
  credentials.
- Redacts secrets from model output.
- Rate-limits each Telegram chat / web session.

## Model

Only `iceman-contributor-free` is called, through
`https://opencode.ai/inference/go/openai/v1/chat/completions`. The Worker sends a stable
`x-opencode-session` header and its own `User-Agent`, as required by OpenCode Go.
