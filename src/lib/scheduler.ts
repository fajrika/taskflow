import "server-only";
import cron from "node-cron";
import { checkDailyReminders } from "@/lib/reminders";
import { generateAllRecurrences } from "@/lib/recurrences";

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

  cron.schedule("*/15 * * * *", async () => {
    try {
      const created = await generateAllRecurrences();
      if (created > 0) {
        console.log(`[scheduler] tugas berulang: ${created} instance baru dibuat`);
      }
    } catch (err) {
      console.error("[scheduler] error generate berulang:", err);
    }
  });

  console.log("[scheduler] pengingat harian + tugas berulang aktif");
}
