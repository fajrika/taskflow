import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { userSettings } from "@/lib/schema";
import { requireUserId } from "@/lib/session";
import { sendReminderToUser, buildDailyMessage } from "@/lib/reminders";
import { sendPushToUser } from "@/lib/push";
import { sendTelegramMessage, sendDiscordWebhook } from "@/lib/channels";

export const dynamic = "force-dynamic";

const schema = z.object({
  channel: z.enum(["all", "push", "telegram", "discord", "daily"]).default("all"),
});

export async function POST(req: Request) {
  const userId = await requireUserId();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = schema.safeParse(body);
  const channel = parsed.success ? parsed.data.channel : "all";

  const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
  if (!settings) return NextResponse.json({ error: "Pengaturan tidak ditemukan" }, { status: 404 });

  const testMessage = "🔔 Tes notifikasi Taskflow — pengaturan kamu berfungsi!";

  if (channel === "daily") {
    const message = await buildDailyMessage(userId, settings.timezone);
    const result = await sendReminderToUser(userId, message);
    return NextResponse.json({ results: result.results });
  }

  const skipChannels: string[] = [];
  if (channel !== "all" && channel !== "push") skipChannels.push("push");
  if (channel !== "all" && channel !== "telegram") skipChannels.push("telegram");
  if (channel !== "all" && channel !== "discord") skipChannels.push("discord");

  const results: Record<string, unknown> = {};
  const enabledChannels: string[] = [];
  if (settings.pushEnabled && !skipChannels.includes("push")) enabledChannels.push("push");
  if (settings.telegramEnabled && settings.telegramChatId && !skipChannels.includes("telegram"))
    enabledChannels.push("telegram");
  if (settings.discordEnabled && settings.discordWebhookUrl && !skipChannels.includes("discord"))
    enabledChannels.push("discord");

  if (channel !== "all" && enabledChannels.length === 0) {
    const chosen = channel;
    if (chosen === "push") results.push = await sendPushToUser(userId, { title: "🔔 Tes Taskflow", body: testMessage });
    if (chosen === "telegram") results.telegram = await sendTelegramMessage(settings.telegramChatId!, testMessage);
    if (chosen === "discord") results.discord = await sendDiscordWebhook(settings.discordWebhookUrl!, testMessage);
  } else {
    for (const ch of enabledChannels) {
      if (ch === "push") results.push = await sendPushToUser(userId, { title: "🔔 Tes Taskflow", body: testMessage });
      if (ch === "telegram") results.telegram = await sendTelegramMessage(settings.telegramChatId!, testMessage);
      if (ch === "discord") results.discord = await sendDiscordWebhook(settings.discordWebhookUrl!, testMessage);
    }
  }

  return NextResponse.json({ results });
}
