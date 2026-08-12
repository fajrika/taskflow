import { DateTime } from "luxon";

export type TaskDate = Date | string | null;

export function inTz(date: TaskDate, timezone: string) {
  return DateTime.fromJSDate(new Date(date as string), { zone: timezone });
}

export function startOfDayInTz(timezone: string) {
  return DateTime.now().setZone(timezone).startOf("day");
}

export function todayStrInTz(timezone: string) {
  return startOfDayInTz(timezone).toFormat("yyyy-MM-dd");
}

export function fmtDate(date: TaskDate, timezone: string) {
  if (!date) return "-";
  return inTz(date, timezone).toFormat("EEE, d MMM yyyy", { locale: "id" });
}

export function fmtDateTime(date: TaskDate, timezone: string) {
  if (!date) return "-";
  return inTz(date, timezone).toFormat("EEE, d MMM yyyy • HH:mm", { locale: "id" });
}

export function fmtTime(date: TaskDate, timezone: string) {
  if (!date) return "-";
  return inTz(date, timezone).toFormat("HH:mm");
}

export function relativeDue(date: TaskDate, timezone: string): { label: string; tone: "overdue" | "today" | "soon" | "later" } {
  if (!date) return { label: "tanpa deadline", tone: "later" };
  const today = startOfDayInTz(timezone);
  const d = inTz(date, timezone).startOf("day");
  const diff = d.diff(today, "days").days;

  if (diff < 0) return { label: `terlambat ${Math.abs(diff)} hari`, tone: "overdue" };
  if (diff === 0) return { label: "hari ini", tone: "today" };
  if (diff <= 3) return { label: `${diff} hari lagi`, tone: "soon" };
  return { label: `${diff} hari lagi`, tone: "later" };
}

export function listTimezones(): string[] {
  return Intl.supportedValuesOf?.("timeZone") ?? ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura", "UTC"];
}
