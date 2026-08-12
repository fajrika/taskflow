import "server-only";
import cron from "node-cron";
import { checkDailyReminders } from "@/lib/reminders";

let running = false;

export function startScheduler() {
  if (running) return;
  running = true;

  cron.schedule("* * * * *", async () => {
    try {
      const result = await checkDailyReminders();
      if (result.sent > 0) {
        console.log(`[scheduler] pengingat harian terkirim untuk ${result.sent} user`);
      }
    } catch (err) {
      console.error("[scheduler] error:", err);
    }
  });

  console.log("[scheduler] pengingat harian aktif (cek tiap menit)");
}
