import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users, userSettings } from "@/lib/schema";
import { requireUserId } from "@/lib/session";
import { getAppSetting, setAppSetting } from "@/lib/appSettings";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  timezone: z.string().min(1).max(100).optional(),
  remindTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format jam HH:mm").optional(),
  dailyReminderEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  telegramEnabled: z.boolean().optional(),
  telegramChatId: z.string().max(100).optional().nullable(),
  telegramBotToken: z.string().max(200).optional().nullable(),
  discordEnabled: z.boolean().optional(),
  discordWebhookUrl: z.string().max(500).optional().nullable(),
});

export async function GET() {
  const userId = await requireUserId();

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
  const botToken = await getAppSetting("telegram_bot_token");

  return NextResponse.json({
    name: user?.name ?? "",
    email: user?.email ?? "",
    timezone: settings?.timezone ?? "Asia/Jakarta",
    remindTime: settings?.remindTime ?? "07:00",
    dailyReminderEnabled: settings?.dailyReminderEnabled ?? true,
    pushEnabled: settings?.pushEnabled ?? false,
    telegramEnabled: settings?.telegramEnabled ?? false,
    telegramChatId: settings?.telegramChatId ?? "",
    telegramBotToken: botToken ?? "",
    discordEnabled: settings?.discordEnabled ?? false,
    discordWebhookUrl: settings?.discordWebhookUrl ?? "",
  });
}

export async function PATCH(req: Request) {
  const userId = await requireUserId();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Input tidak valid" }, { status: 400 });
  }

  const data = parsed.data;

  if (data.telegramBotToken !== undefined) {
    await setAppSetting("telegram_bot_token", data.telegramBotToken?.trim() || null);
  }

  const settingsValues: Record<string, unknown> = {};
  for (const key of [
    "timezone",
    "remindTime",
    "dailyReminderEnabled",
    "pushEnabled",
    "telegramEnabled",
    "telegramChatId",
    "discordEnabled",
    "discordWebhookUrl",
  ] as const) {
    if (data[key] !== undefined) settingsValues[key] = data[key];
  }

  const [existing] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));

  if (Object.keys(settingsValues).length > 0) {
    if (existing) {
      await db.update(userSettings).set(settingsValues).where(eq(userSettings.userId, userId));
    } else {
      await db.insert(userSettings).values({ userId, ...settingsValues });
    }
  }

  if (data.name !== undefined) {
    await db.update(users).set({ name: data.name.trim() }).where(eq(users.id, userId));
  }

  return NextResponse.json({ ok: true });
}
