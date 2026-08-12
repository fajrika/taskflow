import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { clients, projects, userSettings } from "@/lib/schema";
import { requireUserId } from "@/lib/session";
import TasksView from "@/components/TasksView";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const userId = await requireUserId();

  const [userClients, userProjects, [settings]] = await Promise.all([
    db.select().from(clients).where(eq(clients.userId, userId)).orderBy(asc(clients.name)),
    db.select().from(projects).where(eq(projects.userId, userId)).orderBy(asc(projects.name)),
    db.select().from(userSettings).where(eq(userSettings.userId, userId)),
  ]);

  const userClientsMapped = userClients.map((c) => ({ ...c }));
  const userProjectsMapped = userProjects.map((p) => ({
    ...p,
    startDate: p.startDate ? p.startDate.toISOString() : null,
    dueDate: p.dueDate ? p.dueDate.toISOString() : null,
  }));

  return (
    <TasksView
      clients={userClientsMapped}
      projects={userProjectsMapped}
      timezone={settings?.timezone ?? "Asia/Jakarta"}
    />
  );
}
