import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { DateTime } from "luxon";
import { CronExpressionParser } from "cron-parser";
import { db } from "@/lib/db";
import { recurrences, tasks, userSettings } from "@/lib/schema";

export type RecurrenceRow = typeof recurrences.$inferSelect;

const GENERATION_DAYS = 30;
const GENERATION_DAYS_CRON = 7;

export function buildOccurrenceTimes(
  rec: Pick<RecurrenceRow, "freq" | "weekdays" | "cron" | "time" | "startsOn" | "endsOn">,
  from: DateTime,
  to: DateTime,
): Date[] {
  if (rec.freq === "cron" && rec.cron) {
    return cronOccurrences(rec.cron, from, to, rec.startsOn, rec.endsOn);
  }
  return timedOccurrences(rec, from, to);
}

function timedOccurrences(
  rec: Pick<RecurrenceRow, "freq" | "weekdays" | "time" | "startsOn" | "endsOn">,
  from: DateTime,
  to: DateTime,
): Date[] {
  const [h, m] = rec.time.split(":").map((n) => Number(n));
  const days = rec.freq === "weekly" ? new Set(rec.weekdays ?? []) : null;
  const out: Date[] = [];
  let day = from.startOf("day");

  while (day < to) {
    if (!days || days.has(day.weekday)) {
      out.push(day.set({ hour: h, minute: m, second: 0, millisecond: 0 }).toJSDate());
    }
    day = day.plus({ days: 1 });
  }
  return out;
}

function cronOccurrences(
  expr: string,
  from: DateTime,
  to: DateTime,
  startsOn: Date,
  endsOn: Date | null,
): Date[] {
  const out: Date[] = [];
  try {
    const parser = CronExpressionParser.parse(expr, {
      currentDate: from.toJSDate(),
      tz: from.zoneName ?? undefined,
    });
    for (let i = 0; i < 100000; i++) {
      const next = parser.next().toDate();
      const toDate = to.toJSDate();
      if (next >= toDate) break;
      if (next < startsOn) continue;
      if (endsOn && next > endsOn) break;
      out.push(next);
    }
  } catch {
    // ekspresi cron tidak valid — abaikan
  }
  return out;
}

export function isValidCron(expr: string): boolean {
  try {
    CronExpressionParser.parse(expr, { currentDate: new Date() });
    return true;
  } catch {
    return false;
  }
}

export async function generateForRecurrence(rec: RecurrenceRow, timezone: string, now = new Date()) {
  const startsOn = rec.startsOn ? new Date(rec.startsOn) : now;
  const endsOn = rec.endsOn ? new Date(rec.endsOn) : null;
  if (endsOn && now > endsOn) return 0;

  const nowTz = DateTime.fromJSDate(now, { zone: timezone });
  const from = nowTz.startOf("day");
  const horizon = rec.freq === "cron" ? GENERATION_DAYS_CRON : GENERATION_DAYS;
  const to = nowTz.plus({ days: horizon });
  const genStart = DateTime.fromJSDate(startsOn, { zone: timezone }).startOf("day");
  const fromBound = genStart > from ? genStart : from;

  const times = buildOccurrenceTimes(
    { ...rec, startsOn, endsOn },
    fromBound,
    endsOn ? DateTime.fromJSDate(endsOn).plus({ minutes: 1 }) : to,
  );
  if (times.length === 0) return 0;

  const existing = await db
    .select({ dueDate: tasks.dueDate })
    .from(tasks)
    .where(and(eq(tasks.recurrenceId, rec.id), inArray(tasks.dueDate, times)));
  const existingSet = new Set(existing.map((r) => r.dueDate?.getTime()));

  const toInsert = times
    .filter((d) => !existingSet.has(d.getTime()))
    .map((d) => ({
      userId: rec.userId,
      title: rec.title,
      description: rec.description,
      type: rec.type,
      clientId: rec.type === "main" ? rec.clientId : null,
      projectId: rec.type === "side" ? rec.projectId : null,
      dueDate: d,
      priority: rec.priority,
      status: "todo",
      tags: rec.tags ?? [],
      recurrenceId: rec.id,
    }));

  if (toInsert.length > 0) {
    await db.insert(tasks).values(toInsert);
  }
  await db
    .update(recurrences)
    .set({ lastGeneratedAt: new Date() })
    .where(eq(recurrences.id, rec.id));

  return toInsert.length;
}

export async function generateForUser(userId: number, now = new Date()) {
  const [settings] = await db
    .select({ timezone: userSettings.timezone })
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  const timezone = settings?.timezone ?? "Asia/Jakarta";

  const rows = await db
    .select()
    .from(recurrences)
    .where(and(eq(recurrences.userId, userId), eq(recurrences.active, true)));

  let created = 0;
  for (const rec of rows) {
    created += await generateForRecurrence(rec, timezone, now);
  }
  return created;
}

export async function generateAllRecurrences(now = new Date()) {
  const rows = await db
    .select()
    .from(recurrences)
    .where(eq(recurrences.active, true));

  let created = 0;
  for (const rec of rows) {
    const [settings] = await db
      .select({ timezone: userSettings.timezone })
      .from(userSettings)
      .where(eq(userSettings.userId, rec.userId));
    created += await generateForRecurrence(rec, settings?.timezone ?? "Asia/Jakarta", now);
  }
  return created;
}

export async function nextOccurrence(rec: RecurrenceRow, timezone: string, now = new Date()): Promise<Date | null> {
  const startsOn = new Date(rec.startsOn);
  const endsOn = rec.endsOn ? new Date(rec.endsOn) : null;
  if (endsOn && now > endsOn) return null;

  const nowTz = DateTime.fromJSDate(now, { zone: timezone });
  const from = nowTz.startOf("day");
  const genStart = DateTime.fromJSDate(startsOn, { zone: timezone });
  const fromBound = genStart > from ? genStart.startOf("day") : from;
  const to = from.plus({ days: 90 });

  const times = buildOccurrenceTimes(
    { ...rec, startsOn, endsOn },
    fromBound,
    endsOn ? DateTime.fromJSDate(endsOn).plus({ minutes: 1 }) : to,
  );

  const doneDates = new Set(
    (
      await db
        .select({ dueDate: tasks.dueDate })
        .from(tasks)
        .where(and(eq(tasks.recurrenceId, rec.id), inArray(tasks.status, ["done", "cancelled"])))
    )
      .map((r) => r.dueDate?.getTime()),
  );

  return times.find((d) => !doneDates.has(d.getTime())) ?? null;
}

export function summarizeFreq(rec: RecurrenceRow): string {
  if (rec.freq === "cron" && rec.cron) return `Cron: ${rec.cron}`;
  const time = rec.time ?? "08:00";
  if (rec.freq === "weekly") {
    const names = ["", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
    const days = (rec.weekdays ?? []).map((d) => names[d] ?? "?").join(", ");
    return `Mingguan ${days} • ${time}`;
  }
  return `Harian • ${time}`;
}

export function descRecentInstances(recId: number, limit = 5) {
  return db
    .select({ dueDate: tasks.dueDate, status: tasks.status, completedAt: tasks.completedAt })
    .from(tasks)
    .where(eq(tasks.recurrenceId, recId))
    .orderBy(desc(tasks.dueDate))
    .limit(limit);
}
