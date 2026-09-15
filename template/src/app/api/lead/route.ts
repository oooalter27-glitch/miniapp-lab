import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

export const runtime = "nodejs";

/**
 * Приём заявки из мини-аппа → сообщение владельцу в Telegram.
 *
 * Две переменные в .env.local и заявки начинают ходить:
 *   MINIAPP_BOT_TOKEN=123456:AA...   (бот, от чьего имени придёт сообщение)
 *   MINIAPP_OWNER_CHAT_ID=122346359  (кому)
 *
 * Если они не заданы — заявка не теряется молча: ручка честно отвечает
 * ошибкой, и форма покажет это человеку. Молчаливая «отправка в никуда»
 * хуже явного отказа: владелец узнает о поломке через месяц по пустой воронке.
 */

/** Подпись initData Telegram — чтобы за клиента нельзя было прислать чужие данные. */
function checkInitData(initData: string, botToken: string): boolean {
  if (!initData) return false;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return false;
  params.delete("hash");
  const dataCheck = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const calc = createHmac("sha256", secret).update(dataCheck).digest("hex");
  return calc === hash;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function POST(req: NextRequest) {
  const token = process.env.MINIAPP_BOT_TOKEN;
  const chatId = process.env.MINIAPP_OWNER_CHAT_ID;
  if (!token || !chatId) {
    return NextResponse.json(
      { ok: false, error: "не настроены MINIAPP_BOT_TOKEN и MINIAPP_OWNER_CHAT_ID" },
      { status: 500 },
    );
  }

  let body: { service?: string; fields?: Record<string, string>; initData?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }

  const fields = body.fields ?? {};
  if (!Object.values(fields).some((v) => (v || "").trim())) {
    return NextResponse.json({ ok: false, error: "пустая заявка" }, { status: 400 });
  }

  // Из браузера подписи нет — это нормально, мини-апп работает и как лендинг.
  // Но пометку в сообщении ставим: владельцу важно, откуда пришло.
  const verified = body.initData ? checkInitData(body.initData, token) : false;
  const source = body.initData ? (verified ? "Telegram ✓" : "Telegram, подпись не сошлась") : "браузер";

  const lines = [
    `<b>Заявка: ${escapeHtml(body.service || "без темы")}</b>`,
    ...Object.entries(fields)
      .filter(([, v]) => (v || "").trim())
      .map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(v)}`),
    `<i>источник: ${source}</i>`,
  ];

  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: lines.join("\n"), parse_mode: "HTML" }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);

  if (!r || !r.ok) {
    return NextResponse.json({ ok: false, error: "телеграм не принял сообщение" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
