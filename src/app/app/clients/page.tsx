import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { clients, tasks } from "@/lib/schema";
import { requireUserId } from "@/lib/session";
import ClientsView from "@/components/ClientsView";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const userId = await requireUserId();

  const rows = await db
    .select({
      id: clients.id,
      name: clients.name,
      company: clients.company,
      contact: clients.contact,
      notes: clients.notes,
      taskCount: sql<number>`count(${tasks.id})::int`,
    })
    .from(clients)
    .leftJoin(tasks, eq(tasks.clientId, clients.id))
    .where(eq(clients.userId, userId))
    .groupBy(clients.id)
    .orderBy(asc(clients.name));

  return <ClientsView initial={rows} />;
}
