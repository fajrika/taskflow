import Link from "next/link";
import { eq, and, lt, gte, inArray, desc, asc, sql } from "drizzle-orm";
import { DateTime } from "luxon";
import { db } from "@/lib/db";
import { tasks, clients, projects, userSettings } from "@/lib/schema";
import { requireUserId } from "@/lib/session";
import { fmtDate, fmtTime, relativeDue } from "@/lib/dates";

export const dynamic = "force-dynamic";

const PENDING = ["todo", "in_progress"];

export default async function DashboardPage() {
  const userId = await requireUserId();

  const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
  const timezone = settings?.timezone ?? "Asia/Jakarta";

  const now = DateTime.now().setZone(timezone);
  const dayStart = now.startOf("day").toJSDate();
  const dayEnd = now.plus({ days: 1 }).startOf("day").toJSDate();
  const weekEnd = now.plus({ days: 7 }).startOf("day").toJSDate();

  const [allTasks, activeProjects] = await Promise.all([
    db
      .select({
        task: tasks,
        client: { id: clients.id, name: clients.name, company: clients.company },
        project: { id: projects.id, name: projects.name, color: projects.color },
      })
      .from(tasks)
      .leftJoin(clients, eq(tasks.clientId, clients.id))
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(tasks.userId, userId))
      .orderBy(asc(tasks.dueDate)),
    db.select().from(projects).where(and(eq(projects.userId, userId), eq(projects.status, "aktif"))),
  ]);

  const rows = allTasks.map((r) => ({ ...r.task, client: r.client, project: r.project, tags: r.task.tags ?? [] }));
  const withDue = rows.filter((t) => t.dueDate);
  const overdue = withDue.filter((t) => PENDING.includes(t.status) && new Date(t.dueDate!) < dayStart);
  const today = withDue.filter((t) => PENDING.includes(t.status) && new Date(t.dueDate!) >= dayStart && new Date(t.dueDate!) < dayEnd);
  const upcoming = withDue.filter((t) => PENDING.includes(t.status) && new Date(t.dueDate!) >= dayEnd && new Date(t.dueDate!) < weekEnd);
  const doneToday = rows.filter((t) => t.completedAt && new Date(t.completedAt) >= dayStart && new Date(t.completedAt) < dayEnd);
  const active = rows.filter((t) => PENDING.includes(t.status));

  const hour = now.hour;
  const greeting = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 19 ? "Selamat sore" : "Selamat malam";

  function TaskRow({ t }: { t: (typeof rows)[number] }) {
    const due = relativeDue(t.dueDate, timezone);
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-slate-100">{t.title}</div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
            {t.type === "main" && t.client && <span>🏢 {t.client.name}</span>}
            {t.type === "side" && t.project && <span>🚀 {t.project.name}</span>}
            {t.dueDate && (
              <span>
                {fmtDate(t.dueDate, timezone)}
                {t.dueDate && ` • ${fmtTime(t.dueDate, timezone)}`}
              </span>
            )}
          </div>
        </div>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
            due.tone === "overdue" ? "bg-red-500/15 text-red-300" : due.tone === "today" ? "bg-red-500/10 text-red-300" : due.tone === "soon" ? "bg-amber-500/15 text-amber-300" : "bg-slate-700/50 text-slate-400"
          }`}
        >
          {due.label}
        </span>
      </div>
    );
  }

  function Section({ title, items, empty }: { title: string; items: (typeof rows)[number][]; empty: string }) {
    return (
      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-300">{title}</h2>
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-800 p-3 text-center text-xs text-slate-600">{empty}</div>
        ) : (
          <div className="space-y-1.5">
            {items.map((t) => <TaskRow key={t.id} t={t} />)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{greeting} 👋</h1>
          <p className="text-sm text-slate-400">{now.toFormat("EEEE, d MMMM yyyy", { locale: "id" })}</p>
        </div>
        <Link href="/app/tasks" className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500">
          + Tambah Tugas
        </Link>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          { label: "Hari ini", value: today.length, cls: "text-red-300", icon: "🔴" },
          { label: "Terlambat", value: overdue.length, cls: "text-red-400", icon: "⏰" },
          { label: "Aktif", value: active.length, cls: "text-sky-300", icon: "✅" },
          { label: "Selesai hari ini", value: doneToday.length, cls: "text-emerald-300", icon: "🎉" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
            <div className="text-2xl font-bold text-white">
              <span className={s.cls}>{s.value}</span>
            </div>
            <div className="text-[11px] text-slate-500">
              {s.icon} {s.label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="⏰ Terlambat" items={overdue} empty="Tidak ada yang terlambat 🎉" />
        <Section title="🔴 Jatuh tempo hari ini" items={today} empty="Tidak ada deadline hari ini" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Section title="🟡 7 hari ke depan" items={upcoming} empty="Tidak ada deadline minggu ini" />
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-300">🚀 Proyek aktif ({activeProjects.length})</h2>
          {activeProjects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-800 p-3 text-center text-xs text-slate-600">
              Belum ada proyek aktif
            </div>
          ) : (
            <div className="space-y-1.5">
              {activeProjects.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-slate-100">{p.name}</div>
                    {p.dueDate && <div className="text-[11px] text-slate-500">Deadline: {fmtDate(p.dueDate, timezone)}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex gap-2 text-xs">
            <Link href="/app/gantt" className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-800">📊 Lihat Gantt</Link>
            <Link href="/app/clients" className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-800">🏢 Sumber Kerja</Link>
            <Link href="/app/projects" className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-800">🚀 Proyek</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
