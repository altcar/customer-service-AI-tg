# -*- coding: utf-8 -*-
"""Build the bundled RAG knowledge file for the Metre customer-service Worker."""
import json
import re
import html
import os

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sources")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rag.json")

chunks = []


def add(cid, title, text, keywords, category, lang="zh-Hant-HK"):
    text = re.sub(r"[ \t]+", " ", text).strip()
    text = re.sub(r"\n{3,}", "\n\n", text)
    if not text:
        return
    chunks.append({
        "id": cid,
        "title": title,
        "text": text,
        "keywords": keywords,
        "category": category,
        "lang": lang,
    })


def read_text(name):
    path = os.path.join(SRC, name)
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def html_to_text(path):
    with open(path, "r", encoding="utf-8") as f:
        raw = f.read()
    raw = re.sub(r"(?is)<script.*?</script>", " ", raw)
    raw = re.sub(r"(?is)<style.*?</style>", " ", raw)
    raw = re.sub(r"(?s)<[^>]+>", "\n", raw)
    raw = html.unescape(raw)
    lines = [re.sub(r"\s+", " ", ln).strip() for ln in raw.splitlines()]
    lines = [ln for ln in lines if ln]
    return "\n".join(lines)


def split_by_heading(text, pattern, max_chars=1800):
    """Split text into chunks at headings matching pattern."""
    parts = re.split(pattern, text, flags=re.MULTILINE)
    out = []
    buf = ""
    for part in parts:
        if len(buf) + len(part) > max_chars and buf:
            out.append(buf.strip())
            buf = part
        else:
            buf += "\n" + part
    if buf.strip():
        out.append(buf.strip())
    return out


# ---------------------------------------------------------------------------
# Curated overview / product / feature chunks
# ---------------------------------------------------------------------------
add(
    "overview-metre",
    "Metre (一米通) — what it is",
    (
        "Metre (一米通), operated by Metre Hong Kong Limited (一米通有限公司), is a Hong Kong "
        "parking and access-control company. It provides an Ultra-Wideband (UWB) electronic ID "
        "(e-ID) validation system. The product family is MetreTag (a small UWB device installed "
        "in the vehicle), MetrePoint (the UWB reader / barrier at the car-park entrance) and the "
        "Metre App (一手通 App). Drivers drive near a MetrePoint and the barrier rises "
        "automatically; parking fees are paid in the app with FPS (轉數快)."
    ),
    ["metre", "一米通", "uwb", "e-id", "electronic id", "泊車", "停車場", "metretag", "metrepoint",
     "metre app", "一手通", "fps", "轉數快", "access control", "門禁"],
    "overview",
)

add(
    "overview-why",
    "Why Metre exists — the problem it solves",
    (
        "Traditional licence-plate recognition (LPR / 車牌識別) can fail because of dirt, "
        "weather, lighting, angles or obstruction, which causes driver complaints and barrier "
        "delays. Metre replaces plate recognition with Ultra-Wideband (UWB) identification: the "
        "tag is recognised at centimetre-level range with tamper-resistant signalling, so the "
        "barrier rises automatically as the car approaches and no action is required from the "
        "driver. UWB also protects privacy because a vehicle can be whitelisted with a Metre ID "
        "instead of a licence plate, and the e-ID is stored in a secure element. For car-park "
        "operators the system is low-cost because the e-ID lives on the driver's phone or a small "
        "tag, and it removes the need to upgrade existing gate hardware."
    ),
    ["why", "problem", "licence plate", "license plate", "lpr", "recognition", "fail", "失敗",
     "車牌", "識別", "柵欄", "閘桿", "privacy", "私隱", "secure element", "安全元件", "cost",
     "成本", "low cost", "低成本"],
    "overview",
)

add(
    "products",
    "Metre products: MetreTag, MetrePoint, Metre App and Console",
    (
        "MetreTag is the UWB device installed inside the vehicle (usually on the windscreen). "
        "It is powered by a standard 5V supply, like a dashcam, and works independently of the "
        "phone. MetrePoint is the UWB reader installed at the car-park entrance / exit that "
        "recognises the tag and lifts the barrier automatically. The Metre App lets drivers see "
        "real-time parking status, transparent pricing, detailed records, whitelist their "
        "vehicle with a Metre ID, and pay with FPS. The Metre Console (console.metre.hk) is the "
        "online management service for car-park operators (merchants): it shows device health, "
        "car-park status, access lists, today's revenue, total traffic and transaction history, "
        "and supports settlement / CSV export."
    ),
    ["metretag", "metrepoint", "metre app", "console", "tag", "reader", "barrier", "app",
     "管理", "控制台", "dashboard", "settlements", "devices", "transaction"],
    "products",
)

add(
    "features",
    "Key features and benefits",
    (
        "Key features: (1) UWB contactless entry and exit — the barrier rises automatically; "
        "(2) Centimetre-level spatial algorithms prevent accidental triggers from cars passing "
        "nearby; (3) Privacy — whitelist with a Metre ID, no licence plate required, end-to-end "
        "encryption, location records used only for billing; (4) Tamper-resistant payments — "
        "IEEE 802.15.4z Scrambled Timestamp Sequence (STS) prevents signal-energy injection and "
        "spoofing; (5) Lost mode — if the phone is lost, the tag can be protected immediately "
        "from the app; (6) Low cost — the e-ID is stored on the phone's secure element, no "
        "expensive on-site hardware upgrades; (7) FPS payment in the app, with a HK$100 "
        "seamless-exit buffer; (8) Use cases: access control, self-service kiosks, school "
        "attendance and parking."
    ),
    ["feature", "功能", "uwb", "contactless", "無感", "privacy", "私隱", "sts", "ieee 802.15.4z",
     "lost mode", "遺失", "low cost", "低成本", "fps", "轉數快", "buffer", "額度", "use case",
     "應用", "access control", "門禁", "attendance", "考勤", "parking", "泊車"],
    "features",
)

# ---------------------------------------------------------------------------
# Home pages (from the live site)
# ---------------------------------------------------------------------------
home_zh = html_to_text(os.path.join(SRC, "home.html"))
home_en = html_to_text(os.path.join(SRC, "home-en.html"))
add("home-zh", "Metre 車主頁 (zh-hant-hk)", home_zh,
    ["車主", "首頁", "metretag", "metrepoint", "泊車", "fps", "轉數快", "按金", "deposit"],
    "home", "zh-Hant-HK")
add("home-en", "Metre driver home page (en)", home_en,
    ["driver", "home", "metretag", "metrepoint", "parking", "fps", "deposit"],
    "home", "en")

# ---------------------------------------------------------------------------
# Business pages (pricing) — curated from the live pages
# ---------------------------------------------------------------------------
add(
    "business-zh",
    "Metre 商戶頁 — 定價方案 (zh-hant-hk)",
    (
        "MetrePoint 全港獨家 UWB 技術，無感通行連支付整合，免升級費、免費對接現有閘機，首 3 "
        "個月免費試用。買斷方案：HK$30,000 每部，包含 UWB 門禁管理及無感支付、基本安裝服務、"
        "首年系統對接服務、首年技術支援及保修；網上管理服務需額外付費；付款手續費 2.0%。"
        "月租方案：每部 HK$38/月，每月交易額每滿 HK$50,000 豁免一部已啟用 MetrePoint 的月費；"
        "包含首 3 個月免費試用、UWB 門禁管理及無感支付、標準安裝服務、系統對接與升級服務、"
        "技術支援及維護、非人為硬件損壞免費保修更換、網上管理服務；付款手續費 1.5%，最快 T+1 "
        "到帳。申請請往 console.metre.hk 或 WhatsApp 85259117372。"
    ),
    ["商戶", "business", "定價", "ricing", "買斷", "月租", "hk$30,000", "hk$38", "手續費",
     "2.0%", "1.5%", "t+1", "metrepoint", "uwb", "閘機", "免費試用", "free trial"],
    "business", "zh-Hant-HK",
)

add(
    "business-en",
    "Metre business page — pricing (en)",
    (
        "MetrePoint: exclusive UWB technology in Hong Kong, seamless access control with payment "
        "integration, no upgrade fee and free integration with existing gates, first 3 months "
        "free trial. One-time buyout: HK$30,000 each, including UWB access control and payment, "
        "basic installation, first-year system integration, first-year tech support and warranty; "
        "online management service is charged separately; payment handling fee 2.0%. Monthly "
        "subscription: HK$38 per unit per month; for every HK$50,000 of monthly transaction volume, "
        "the monthly fee for one deployed MetrePoint is waived. It includes a 3-month free trial, "
        "UWB access control and payment, standard installation, system integration and upgrades, "
        "technical support and maintenance, free warranty replacement for non-human hardware "
        "damage, and online management service; payment handling fee 1.5%, settlement as fast as "
        "T+1. Apply at console.metre.hk or WhatsApp 85259117372."
    ),
    ["business", "pricing", "buyout", "monthly", "hk$30,000", "hk$38", "handling fee", "2.0%",
     "1.5%", "t+1", "metrepoint", "uwb", "free trial"],
    "business", "en",
)

# ---------------------------------------------------------------------------
# FAQ (zh + en)
# ---------------------------------------------------------------------------
faq_zh = [
    ("如何退還按金？",
     "當你退還 MetreTag 時，工程師會檢查是否存在惡意破壞情況。如無，按金將沿原路退回。"),
    ("MetreTag 如何避免盜刷？",
     "MetreTag 使用超寬頻作為付款依據，其所採用的 IEEE 802.15.4z 標準中引入的一個關鍵特性為加擾時間戳序列（STS）。透過 STS 安全機制，可以防止惡意裝置透過注入訊號能量進行不同形式的攻擊，從而確保付款真實性。"),
    ("MetreTag 是否準確？",
     "超寬頻帶來的厘米級空間算法，避免了在附近駛過誤觸的尷尬情況。"),
    ("MetreTag 如何供電？",
     "與一般車 cam 一樣，以 5 伏供電即可。"),
    ("如果我的手機沒電了，還能自動扣款嗎？",
     "可以。MetreTag 是獨立運作的硬件裝置，只要裝置安裝在車內，即使手機無電或不在身邊，MetrePoint 仍能識別 MetreTag 並自動完成扣款。"),
    ("我的行蹤數據會被外洩嗎？",
     "絕對不會。我們採用最高規格的端到端加密技術，你的進出紀錄僅用於計費用途。我們不會收集、追蹤或向任何第三方出售你的位置數據。"),
    ("支援哪些付款方式？",
     "目前只支援 FPS 付款方式。期後將會支援其他自動扣款方式，敬請期待。"),
]
faq_en = [
    ("How do I get my deposit refunded?",
     "When you return your MetreTag, an engineer checks it for deliberate damage. If there is none, the deposit is refunded to your original payment method."),
    ("How does MetreTag prevent unauthorised scanning?",
     "MetreTag settles payments over Ultra-Wideband. The IEEE 802.15.4z standard it uses introduces the Scrambled Timestamp Sequence (STS), a security mechanism that stops malicious devices from injecting signal energy to spoof distance, so every payment stays authentic."),
    ("Is MetreTag accurate?",
     "Centimetre-level spatial algorithms from UWB prevent accidental triggers when you simply drive past."),
    ("How is MetreTag powered?",
     "It runs on a standard 5V supply, just like a typical dashcam."),
    ("If my phone battery dies, will automatic payment still work?",
     "Yes. MetreTag is an independent hardware device. As long as it is installed in your car, MetrePoint recognises it and completes payment automatically, even if your phone is dead or not with you."),
    ("Will my location data be leaked?",
     "No. We use end-to-end encryption, and your entry and exit records are used strictly for billing. We never collect, track, or sell your location data to third parties."),
    ("What payment methods are supported?",
     "FPS only for now. More automatic payment methods are on the way."),
]
for i, (q, a) in enumerate(faq_zh, 1):
    add(f"faq-zh-{i}", q, f"問：{q}\n答：{a}",
        ["常見問題", "faq", "按金", "deposit", "盜刷", "sts", "準確", "供電", "手機", "行蹤",
         "私隱", "付款", "fps"], "faq", "zh-Hant-HK")
for i, (q, a) in enumerate(faq_en, 1):
    add(f"faq-en-{i}", q, f"Q: {q}\nA: {a}",
        ["faq", "deposit", "refund", "unauthorised", "sts", "accurate", "powered", "phone",
         "battery", "location", "privacy", "payment", "fps"], "faq", "en")

# ---------------------------------------------------------------------------
# Installation guide (from PDF)
# ---------------------------------------------------------------------------
guide = read_text("guide.txt").replace("--- page", "\n--- page")
add("installation-guide", "MetreTag 安裝指南 (Installation Guide)", guide,
    ["安裝", "install", "guide", "指引", "metretag", "擋風玻璃", "windscreen", "電源線",
     "type-c", "micro usb", "車 cam", "一分二", "延長線", "support", "聯絡"],
    "installation", "zh-Hant-HK")

# ---------------------------------------------------------------------------
# Fees schedule
# ---------------------------------------------------------------------------
fees = read_text("terms_Schedule-of-Fees-and-Guidelines.txt")
add("fees-schedule", "Schedule of Fees and Guidelines (服務收費及指引)", fees,
    ["fee", "收費", "deposit", "按金", "hk$100", "delivery", "運費", "hk$20", "damage",
     "損壞", "hk$50", "reactivation", "重新啟動", "hk$10", "late payment", "逾期", "buffer",
     "行政費", "support", "whatsapp", "5911 7372"],
    "fees", "en")

# ---------------------------------------------------------------------------
# Terms of Use (Metre App)
# ---------------------------------------------------------------------------
tou = read_text("terms_Metre-App-Terms-of-Use.txt")
for i, part in enumerate(split_by_heading(tou, r"(?m)^--- page \d+ ---"), 1):
    add(f"terms-of-use-{i}", f"Metre App Terms of Use (條款及細則) part {i}", part,
        ["terms", "條款", "使用條款", "account", "帳戶", "proprietary", " intellectual",
         "warranty", "擔保", "liability", "責任", "device data", "資料", "governing law",
         "香港", "jurisdiction"], "legal", "en")

# ---------------------------------------------------------------------------
# Conditions of Issue of MetreTag
# ---------------------------------------------------------------------------
coi = read_text("terms_Conditions-of-Issue-of-MetreTag.txt")
coi = re.sub(r"(?m)^--- page \d+ ---\s*$", "", coi)
coi_parts = re.split(r"(?m)^(?=\d+\.\s)", coi)
buf_title = "Conditions of Issue of MetreTag (MetreTag 發行及使用條件)"
buf = ""
idx = 0
for part in coi_parts:
    part = part.strip()
    if not part:
        continue
    if len(buf) + len(part) > 2200 and buf:
        idx += 1
        add(f"conditions-{idx}", f"{buf_title} — section {idx}", buf,
            ["conditions", "發行", "使用條件", "metretag", "deposit", "按金", "parking", "泊車",
             "fee", "費用", "buffer", "額度", "malfunction", "故障", "return", "退回",
             "cancellation", "取消", "loss", "遺失", "tamper", "篡改", "liability", "責任"],
            "legal", "en")
        buf = part
    else:
        buf = (buf + "\n" + part).strip()
if buf:
    idx += 1
    add(f"conditions-{idx}", f"{buf_title} — section {idx}", buf,
        ["conditions", "發行", "使用條件", "metretag", "deposit", "按金", "parking", "泊車",
         "fee", "費用", "buffer", "額度", "malfunction", "故障", "return", "退回",
         "cancellation", "取消", "loss", "遺失", "tamper", "篡改", "liability", "責任"],
        "legal", "en")

# ---------------------------------------------------------------------------
# Privacy policy
# ---------------------------------------------------------------------------
privacy = read_text("privacy-policy.txt")
privacy = re.sub(r"(?m)^--- page \d+ ---\s*$", "", privacy)
privacy_parts = re.split(r"(?m)^(?=\d+\.\s)", privacy)
buf = ""
idx = 0
for part in privacy_parts:
    part = part.strip()
    if not part:
        continue
    if len(buf) + len(part) > 2200 and buf:
        idx += 1
        add(f"privacy-{idx}", f"Privacy Policy Statement (私隱政策聲明) — section {idx}", buf,
            ["privacy", "私隱", "policy", "政策", "personal data", "個人資料", "collection",
             "收集", "use", "使用", "retention", "保留", "dar", "查閱", "correction", "更正",
             "pcs", "pics"], "legal", "en")
        buf = part
    else:
        buf = (buf + "\n" + part).strip()
if buf:
    idx += 1
    add(f"privacy-{idx}", f"Privacy Policy Statement (私隱政策聲明) — section {idx}", buf,
        ["privacy", "私隱", "policy", "政策", "personal data", "個人資料", "collection",
         "收集", "use", "使用", "retention", "保留", "dar", "查閱", "correction", "更正",
         "pcs", "pics"], "legal", "en")

# ---------------------------------------------------------------------------
# Contact
# ---------------------------------------------------------------------------
add(
    "contact",
    "Contact us (聯絡我們)",
    (
        "Metre customer service: support@metre.hk; phone / WhatsApp (852) 5911 7372; website "
        "www.metre.hk; office hours Monday to Saturday 09:00–21:00, closed on Sundays and public "
        "holidays. The Metre customer-service team is available 24/7 via the WhatsApp button on "
        "the website. For installation problems, contact support@metre.hk or call 5911 7372. "
        "Facebook: facebook.com/metrehk; Instagram: instagram.com/metrehk."
    ),
    ["contact", "聯絡", "support", "支援", "whatsapp", "5911 7372", "85259117372", "email",
     "電郵", "電話", "office hours", "辦公時間", "24/7", "facebook", "instagram"],
    "contact", "zh-Hant-HK",
)

# ---------------------------------------------------------------------------
# Console dashboard (captured from the logged-in session)
# ---------------------------------------------------------------------------
add(
    "console-dashboard",
    "Metre Console — merchant dashboard (logged-in)",
    (
        "The Metre Console (console.metre.hk) is the online management service for car-park "
        "operators. After signing in (for example the test merchant account test@shalev.eu.org), "
        "the dashboard shows: a header with the signed-in account and a Sign out button; a notice "
        "'Need to update your car park pricing or install MetrePoint? Please use the WhatsApp "
        "button in the bottom right to contact our team.'; navigation items Dashboard, Settlements "
        "and Devices; Device Health; a CAR PARK / STATUS / ACCESS LIST panel; Today's Revenue; "
        "Total Traffic; and a Transaction History table with columns DATE & TIME, SESSION REF, "
        "TAG ID, LOCATION, AMOUNT (HKD), STATUS and DETAILS, plus Export CSV and date/status/"
        "keyword filters. The minimum payout is HK$800.00."
    ),
    ["console", "控制台", "dashboard", "儀表板", "settlements", "結算", "devices", "裝置",
     "device health", "裝置健康", "revenue", "收入", "traffic", "流量", "transaction",
     "交易", "access list", "通行列表", "payout", "出糧", "export csv", "sign out", "登出"],
    "console", "en",
)

add(
    "merchant-application",
    "Metre Console — Merchant Application steps",
    (
        "New merchant accounts must complete a Merchant Application in the console before they "
        "are activated. The form has five steps: 1 General Info, 2 Bank Account, 3 Technical "
        "Contact, 4 Documents, 5 Review & Submit. Step 1 (General Information) asks for company "
        "details — Company Name (English), Company Name (Chinese), Business Registration No., "
        "Business Type, Registered Address, District and Website — and primary contact details "
        "(Full Name, Job Title, Email, Phone). The console banner says to complete all steps to "
        "activate the account."
    ),
    ["merchant", "商戶", "application", "申請", "activate", "啟用", "general info", "公司",
     "business registration", "商業登記", "bank account", "銀行", "technical contact", "技術聯絡",
     "documents", "文件", "review", "提交", "account", "帳戶"],
    "console", "en",
)

# ---------------------------------------------------------------------------
# Write
# ---------------------------------------------------------------------------
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    json.dump({"name": "metre-customer-service-rag", "version": 1, "chunks": chunks}, f,
              ensure_ascii=False, indent=2)
print(f"wrote {OUT}: {len(chunks)} chunks, {os.path.getsize(OUT)} bytes")

# Also regenerate src/rag.js so the Worker can import it without JSON import attributes.
import os as _os
_rag_js = _os.path.join(_os.path.dirname(os.path.abspath(__file__)), "src", "rag.js")
with open(_rag_js, "w", encoding="utf-8") as f:
    f.write("// Auto-generated from rag.json by build_rag.py. Do not edit by hand.\n")
    f.write("// Regenerate with: python build_rag.py\n")
    f.write("export default ")
    json.dump({"name": "metre-customer-service-rag", "version": 1, "chunks": chunks}, f, ensure_ascii=False, separators=(",", ":"))
    f.write(";\n")
print(f"wrote {_rag_js} ({_os.path.getsize(_rag_js)} bytes)")
