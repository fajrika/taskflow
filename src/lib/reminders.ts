import "server-only";
import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";
import { DateTime } from "luxon";
import { db } from "@/lib/db";
import {
  tasks,
  userSettings,
  reminderLogs,
  projects,
  clients,
} from "@/lib/schema";
import { sendPushToUser } from "@/lib/push";
import { sendTelegramMessage, sendDiscordWebhook } from "@/lib/channels";
import { getTelegramBotToken } from "@/lib/appSettings";
import { fmtTime } from "@/lib/dates";

const PRIORITY_LABEL: Record<string, string> = {
  low: "Rendah",
  medium: "Sedang",
  high: "Tinggi",
  urgent: "Urgent",
};

const PENDING = ["todo", "in_progress"];

export interface PendingTask {
  title: string;
  dueDate: Date | null;
  type: string;
  priority: string;
  clientName: string | null;
  projectName: string | null;
}

export async function getTasksDueBetween(
  userId: number,
  from: Date,
  toExclusive: Date,
): Promise<PendingTask[]> {
  const rows = await db
    .select({
      title: tasks.title,
      dueDate: tasks.dueDate,
      type: tasks.type,
      priority: tasks.priority,
      clientName: clients.name,
      projectName: projects.name,
    })
    .from(tasks)
    .leftJoin(clients, eq(tasks.clientId, clients.id))
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(
      and(
        eq(tasks.userId, userId),
        inArray(tasks.status, PENDING),
        gte(tasks.dueDate, from),
        lt(tasks.dueDate, toExclusive),
      ),
    )
    .orderBy(asc(tasks.dueDate));

  return rows;
}

export async function getOverdueTasks(userId: number, before: Date): Promise<PendingTask[]> {
  const rows = await db
    .select({
      title: tasks.title,
      dueDate: tasks.dueDate,
      type: tasks.type,
      priority: tasks.priority,
      clientName: clients.name,
      projectName: projects.name,
    })
    .from(tasks)
    .leftJoin(clients, eq(tasks.clientId, clients.id))
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(
      and(
        eq(tasks.userId, userId),
        inArray(tasks.status, PENDING),
        lt(tasks.dueDate, before),
      ),
    )
    .orderBy(asc(tasks.dueDate));

  return rows;
}

export async function buildDailyMessage(userId: number, timezone: string): Promise<string> {
  const now = DateTime.now().setZone(timezone).startOf("day");
  const dayStart = now.toJSDate();
  const dayEnd = now.plus({ days: 1 }).toJSDate();
  const tomorrowEnd = now.plus({ days: 2 }).toJSDate();

  const [dueToday, overdue, dueTomorrow, projectsTbl] = await Promise.all([
    getTasksDueBetween(userId, dayStart, dayEnd),
    getOverdueTasks(userId, dayStart),
    getTasksDueBetween(userId, dayEnd, tomorrowEnd),
    db.select().from(projects).where(eq(projects.userId, userId)),
  ]);

  const lines: string[] = [];
  lines.push(`📋 *Ringkasan Tugas — ${now.toFormat("EEE, d MMM yyyy", { locale: "id" })}*`);

  if (dueToday.length > 0) {
    lines.push("");
    lines.push(`📌 *Hari ini (${dueToday.length})*:`);
    for (const t of dueToday.slice(0, 15)) lines.push(bullet(t, timezone));
    if (dueToday.length > 15) lines.push(`…dan ${dueToday.length - 15} tugas lainnya`);
  }

  if (overdue.length > 0) {
    lines.push("");
    lines.push(`⏰ *Terlambat (${overdue.length})*:`);
    for (const t of overdue.slice(0, 15)) lines.push(bullet(t, timezone));
    if (overdue.length > 15) lines.push(`…dan ${overdue.length - 15} tugas lainnya`);
  }

  if (dueToday.length === 0 && overdue.length === 0) {
    if (dueTomorrow.length > 0) {
      lines.push("");
      lines.push("🎉 Semua tugas hari ini sudah beres!");
      lines.push("");
      lines.push(`🔜 *Besok (${dueTomorrow.length})*:`);
      for (const t of dueTomorrow.slice(0, 15)) lines.push(bullet(t, timezone));
      if (dueTomorrow.length > 15) lines.push(`…dan ${dueTomorrow.length - 15} tugas lainnya`);
    } else {
      lines.push("");
      lines.push("🎉 Tidak ada tugas pending hari ini maupun besok. Santai dulu!");
    }
  }

  const activeProjects = projectsTbl.filter((p) => p.status === "aktif");
  if (activeProjects.length > 0) {
    lines.push("");
    lines.push(`🗂 *Proyek aktif (${activeProjects.length})*: ${activeProjects.map((p) => p.name).join(", ")}`);
  }

  return lines.join("\n");
}

function bullet(t: PendingTask, timezone: string): string {
  const parts = [`• ${t.title}`];
  if (t.dueDate) parts.push(`(${fmtTime(t.dueDate, timezone)})`);
  if (t.priority !== "medium") parts.push(`[${PRIORITY_LABEL[t.priority] ?? t.priority}]`);
  if (t.type === "main" && t.clientName) parts.push(`— ${t.clientName}`);
  if (t.type === "side" && t.projectName) parts.push(`— ${t.projectName}`);
  return parts.join(" ");
}

export async function sendReminderToUser(
  userId: number,
  message: string,
  opts?: { skipChannels?: string[] },
) {
  const [settingsRow] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId));

  if (!settingsRow) return { ok: false, reason: "settings tidak ada" };

  const results: Record<string, unknown> = {};
  const skip = opts?.skipChannels ?? [];

  if (!skip.includes("push") && settingsRow.pushEnabled) {
    results.push = await sendPushToUser(userId, {
      title: "📋 Ringkasan Tugas Harian",
      body: message.split("\n").slice(0, 3).join("\n"),
      url: "/",
    });
  }

  if (!skip.includes("telegram") && settingsRow.telegramEnabled && settingsRow.telegramChatId) {
    const botToken = await getTelegramBotToken();
    results.telegram = await sendTelegramMessage(botToken ?? "", settingsRow.telegramChatId, message);
  }

  if (!skip.includes("discord") && settingsRow.discordEnabled && settingsRow.discordWebhookUrl) {
    results.discord = await sendDiscordWebhook(settingsRow.discordWebhookUrl, message);
  }

  return { ok: true, results };
}

export async function checkDailyReminders(now = new Date()) {
  const enabledUsers = await db
    .select({
      userId: userSettings.userId,
      timezone: userSettings.timezone,
      remindTime: userSettings.remindTime,
    })
    .from(userSettings)
    .where(eq(userSettings.dailyReminderEnabled, true));

  let sent = 0;

  for (const u of enabledUsers) {
    const nowTz = DateTime.fromJSDate(now).setZone(u.timezone);
    if (nowTz.toFormat("HH:mm") !== u.remindTime) continue;

    const dateStr = nowTz.toFormat("yyyy-MM-dd");
    const [existing] = await db
      .select({ id: reminderLogs.id })
      .from(reminderLogs)
      .where(and(eq(reminderLogs.userId, u.userId), eq(reminderLogs.date, dateStr)));

    if (existing) continue;

    const message = await buildDailyMessage(u.userId, u.timezone);
    const result = await sendReminderToUser(u.userId, message);

    await db.insert(reminderLogs).values({ userId: u.userId, date: dateStr });

    const results = result.results ?? {};
    const anyOk = Object.values(results).some(
      (r: unknown) => r && (r as { ok?: boolean }).ok === true,
    );
    if (anyOk || Object.keys(results).length === 0) sent++;
  }

  return { checked: enabledUsers.length, sent };
}
