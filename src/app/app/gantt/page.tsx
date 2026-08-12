import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks, clients, projects, userSettings } from "@/lib/schema";
import { requireUserId } from "@/lib/session";
import GanttChart from "@/components/GanttChart";
import { toTaskDto } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function GanttPage() {
  const userId = await requireUserId();

  const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));

  const rows = await db
    .select({
      task: tasks,
      client: { id: clients.id, name: clients.name, company: clients.company },
      project: { id: projects.id, name: projects.name, color: projects.color },
    })
    .from(tasks)
    .leftJoin(clients, eq(tasks.clientId, clients.id))
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(eq(tasks.userId, userId))
    .orderBy(asc(tasks.startDate), asc(tasks.dueDate));

  const taskList = rows.map((r) => toTaskDto({ ...r.task, client: r.client, project: r.project }));

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-white">Gantt Chart</h1>
        <p className="text-sm text-slate-400">Visual timeline pekerjaan berdasarkan tanggal mulai &amp; deadline</p>
      </div>
      <div className="mb-3 flex flex-wrap gap-3 text-xs text-slate-400">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" /> Pekerjaan utama</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Side job (warna proyek)</span>
        <span className="flex items-center gap-1"><span className="h-3 w-px bg-red-500" /> Hari ini</span>
      </div>
      <GanttChart tasks={taskList} timezone={settings?.timezone ?? "Asia/Jakarta"} />
    </div>
  );
}
