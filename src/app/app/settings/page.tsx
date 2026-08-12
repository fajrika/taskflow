import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, userSettings } from "@/lib/schema";
import { requireUserId } from "@/lib/session";
import SettingsView from "@/components/SettingsView";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const userId = await requireUserId();

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-white">Pengaturan</h1>
        <p className="text-sm text-slate-400">Profil, pengingat harian &amp; channel notifikasi</p>
      </div>
      <SettingsView
        vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null}
        initial={{
          name: user?.name ?? "",
          email: user?.email ?? "",
          timezone: settings?.timezone ?? "Asia/Jakarta",
          remindTime: settings?.remindTime ?? "07:00",
          dailyReminderEnabled: settings?.dailyReminderEnabled ?? true,
          pushEnabled: settings?.pushEnabled ?? false,
          telegramEnabled: settings?.telegramEnabled ?? false,
          telegramChatId: settings?.telegramChatId ?? "",
          discordEnabled: settings?.discordEnabled ?? false,
          discordWebhookUrl: settings?.discordWebhookUrl ?? "",
        }}
      />
    </div>
  );
}
