export interface FreqInfo {
  freq: "daily" | "weekly" | "cron";
  weekdays: number[];
  cron: string | null;
  time: string;
}

const DAY_NAMES = ["", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export function summarizeFreq(rec: FreqInfo): string {
  if (rec.freq === "cron" && rec.cron) return `⚙️ Cron: ${rec.cron}`;
  const time = rec.time ?? "08:00";
  if (rec.freq === "weekly") {
    const days = (rec.weekdays ?? []).map((d) => DAY_NAMES[d] ?? "?").join(", ");
    return `🗓 ${days} • ${time}`;
  }
  return `📅 Harian • ${time}`;
}

export function fmtShortDateTime(d: string | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getDate()}/${dt.getMonth() + 1} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}
