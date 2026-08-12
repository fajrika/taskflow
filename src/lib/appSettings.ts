import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/schema";

export async function getAppSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key));
  return row?.value ?? null;
}

export async function setAppSetting(key: string, value: string | null) {
  const [existing] = await db.select().from(appSettings).where(eq(appSettings.key, key));
  if (existing) {
    await db
      .update(appSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(appSettings.key, key));
  } else {
    await db.insert(appSettings).values({ key, value });
  }
}

export async function getTelegramBotToken(): Promise<string | null> {
  const fromDb = await getAppSetting("telegram_bot_token");
  return fromDb || process.env.TELEGRAM_BOT_TOKEN || null;
}
