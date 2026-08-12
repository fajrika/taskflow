"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Task } from "@/lib/types";

const DAY_W = 30;
const ROW_H = 44;
const LEFT_W = 200;

type Range = "week" | "2weeks" | "month" | "3months";

const RANGES: Record<Range, number> = {
  week: 7,
  "2weeks": 14,
  month: 31,
  "3months": 93,
};

const MONTHS_ID = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export default function GanttChart({ tasks, timezone }: { tasks: Task[]; timezone: string }) {
  const [range, setRange] = useState<Range>("month");
  const [todayOffset, setTodayOffset] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const dayCount = RANGES[range];

  useEffect(() => {
    setTodayOffset(0);
  }, [range]);

  useEffect(() => {
    if (scrollRef.current && todayOffset >= 0) {
      scrollRef.current.scrollLeft = todayOffset;
    }
  }, [todayOffset, range]);

  const { days, rows } = useMemo(() => {
    const start = addDays(startOfDay(new Date()), -1);
    const days = Array.from({ length: dayCount }, (_, i) => addDays(start, i));

    const withDates = tasks
      .filter((t) => t.startDate || t.dueDate)
      .map((t) => {
        const s = t.startDate ? startOfDay(new Date(t.startDate)) : t.dueDate ? startOfDay(new Date(t.dueDate)) : start;
        const e = t.dueDate ? startOfDay(new Date(t.dueDate)) : s;
        return { ...t, start: s, end: e };
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    return { days, rows: withDates };
  }, [tasks, dayCount]);

  const noDateTasks = tasks.filter((t) => !t.startDate && !t.dueDate);

  function xFor(d: Date): number {
    const ref = days[0];
    return ((d.getTime() - ref.getTime()) / 86400000) * DAY_W;
  }

  function scrollToToday() {
    const ref = days[0];
    const idx = Math.max(0, Math.floor((Date.now() - ref.getTime()) / 86400000) - 2);
    setTodayOffset(idx * DAY_W);
  }

  const todayIndex = Math.floor((startOfDay(new Date()).getTime() - days[0].getTime()) / 86400000);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          {(Object.keys(RANGES) as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-lg px-2.5 py-1.5 text-xs transition ${
                range === r
                  ? "bg-emerald-600 text-white"
                  : "border border-slate-700 text-slate-400 hover:bg-slate-800"
              }`}
            >
              {r === "week" ? "1 Minggu" : r === "2weeks" ? "2 Minggu" : r === "month" ? "1 Bulan" : "3 Bulan"}
            </button>
          ))}
        </div>
        <button
          onClick={scrollToToday}
          className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
        >
          📍 Hari ini
        </button>
      </div>

      {rows.length === 0 && noDateTasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
          Belum ada tugas dengan tanggal untuk ditampilkan di Gantt.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <div ref={scrollRef} className="overflow-x-auto">
            <div style={{ width: LEFT_W + days.length * DAY_W }}>
              {/* Header */}
              <div className="sticky top-0 z-20 flex border-b border-slate-800 bg-slate-900">
                <div
                  className="sticky left-0 z-30 shrink-0 border-r border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-400"
                  style={{ width: LEFT_W }}
                >
                  Tugas
                </div>
                <div className="relative flex" style={{ width: days.length * DAY_W }}>
                  <div className="absolute inset-0 flex">
                    {days.map((d, i) => (
                      <div
                        key={i}
                        className={`shrink-0 border-l border-slate-800 text-center text-[10px] leading-7 ${
                          i === todayIndex ? "bg-red-500/15 text-red-300" : "text-slate-500"
                        }`}
                        style={{ width: DAY_W }}
                      >
                        {d.getDate()}
                      </div>
                    ))}
                  </div>
                  <div className="absolute top-7 flex w-full">
                    {days.map((d, i) => {
                      const isFirstOfMonth = i === 0 || d.getDate() === 1;
                      if (!isFirstOfMonth) return null;
                      const label = `${MONTHS_ID[d.getMonth()]} ${d.getFullYear() === days[0].getFullYear() ? "" : "'" + String(d.getFullYear()).slice(2)}`;
                      return (
                        <div key={i} className="text-[10px] text-slate-400" style={{ marginLeft: i === 0 ? 4 : 0 }}>
                          {label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Rows */}
              {rows.map((t) => {
                const x = xFor(t.start);
                const width = Math.max(((t.end.getTime() - t.start.getTime()) / 86400000 + 1) * DAY_W - 4, 12);
                const isDone = t.status === "done";
                const color = t.type === "side" && t.project ? t.project.color : "#6366f1";
                return (
                  <div key={t.id} className="flex border-b border-slate-800/60 last:border-0" style={{ height: ROW_H }}>
                    <div
                      className="sticky left-0 z-10 flex shrink-0 items-center gap-1.5 border-r border-slate-800 bg-slate-900 px-3"
                      style={{ width: LEFT_W }}
                    >
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${t.status === "in_progress" ? "animate-pulse" : ""}`}
                        style={{ background: color }}
                      />
                      <span className={`truncate text-xs ${isDone ? "text-slate-500 line-through" : "text-slate-200"}`}>
                        {t.title}
                      </span>
                    </div>
                    <div className="relative" style={{ width: days.length * DAY_W }}>
                      <div className="absolute inset-0 flex">
                        {days.map((d, i) => (
                          <div
                            key={i}
                            className={`shrink-0 border-l border-slate-800/40 ${i === todayIndex ? "bg-red-500/10" : ""} ${i % 7 === 6 ? "bg-slate-800/30" : ""}`}
                            style={{ width: DAY_W }}
                          />
                        ))}
                      </div>
                      {/* Today line */}
                      {todayIndex >= 0 && todayIndex < days.length && (
                        <div
                          className="absolute top-0 z-10 h-full w-px bg-red-500"
                          style={{ left: todayIndex * DAY_W + DAY_W / 2 }}
                        />
                      )}
                      <div
                        title={`${t.title}\n${t.startDate ? new Date(t.startDate).toLocaleString() : "tanpa tgl mulai"} → ${t.dueDate ? new Date(t.dueDate).toLocaleString() : "tanpa deadline"}${t.client ? `\nSumber: ${t.client.name}` : ""}${t.project ? `\nProyek: ${t.project.name}` : ""}`}
                        className={`absolute top-1/2 z-10 flex h-6 -translate-y-1/2 cursor-pointer items-center overflow-hidden rounded-md px-1.5 transition hover:brightness-125 ${
                          isDone ? "opacity-40" : ""
                        }`}
                        style={{ left: x, width, background: color }}
                      >
                        {width > 60 && (
                          <span className="truncate text-[10px] font-medium text-white">{t.title}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {noDateTasks.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-xs font-medium text-slate-400">Tanpa tanggal ({noDateTasks.length})</h3>
          <div className="flex flex-wrap gap-2">
            {noDateTasks.map((t) => (
              <span key={t.id} className="rounded-full border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-slate-400">
                {t.title}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
