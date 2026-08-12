import { eq, asc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, tasks } from "@/lib/schema";
import { requireUserId } from "@/lib/session";
import ProjectsView from "@/components/ProjectsView";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const userId = await requireUserId();

  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      color: projects.color,
      status: projects.status,
      startDate: projects.startDate,
      dueDate: projects.dueDate,
      taskCount: sql<number>`count(${tasks.id})::int`,
    })
    .from(projects)
    .leftJoin(tasks, eq(tasks.projectId, projects.id))
    .where(eq(projects.userId, userId))
    .groupBy(projects.id)
    .orderBy(asc(projects.name));

  const list = rows.map((r) => ({
    ...r,
    startDate: r.startDate ? r.startDate.toISOString() : null,
    dueDate: r.dueDate ? r.dueDate.toISOString() : null,
  }));

  return <ProjectsView initial={list} />;
}
