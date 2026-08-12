import "server-only";

export async function sendTelegramMessage(token: string, chatId: string, text: string) {
  if (!token) return { ok: false, reason: "Token bot Telegram belum diatur" };
  if (!chatId) return { ok: false, reason: "Chat ID Telegram kosong" };

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
  if (!res.ok || !data.ok) {
    return { ok: false, reason: `Telegram API error (${res.status})` };
  }
  return { ok: true };
}

export async function sendDiscordWebhook(webhookUrl: string, text: string) {
  if (!webhookUrl) return { ok: false, reason: "Webhook URL Discord kosong" };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: text }),
  });

  if (!res.ok) {
    return { ok: false, reason: `Discord webhook error (${res.status})` };
  }
  return { ok: true };
}
