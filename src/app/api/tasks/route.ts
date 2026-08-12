import { NextResponse } from "next/server";
import { and, asc, desc, eq, like } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { tasks, clients, projects } from "@/lib/schema";
import { requireUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

const taskSchema = z.object({
  title: z.string().min(1, "Judul wajib diisi").max(300),
  description: z.string().max(5000).optional().nullable(),
  type: z.enum(["main", "side"]).default("main"),
  clientId: z.number().int().positive().optional().nullable(),
  projectId: z.number().int().positive().optional().nullable(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  status: z.enum(["todo", "in_progress", "done", "cancelled"]).default("todo"),
  tags: z.array(z.string()).optional().default([]),
});

export async function GET(req: Request) {
  const userId = await requireUserId();
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const status = url.searchParams.get("status") ?? "";
  const type = url.searchParams.get("type") ?? "";
  const clientId = url.searchParams.get("clientId") ?? "";
  const projectId = url.searchParams.get("projectId") ?? "";
  const sort = url.searchParams.get("sort") ?? "due";

  const conds = [eq(tasks.userId, userId)];
  if (status && status !== "all") conds.push(eq(tasks.status, status));
  if (type && type !== "all") conds.push(eq(tasks.type, type as "main" | "side"));
  if (clientId) conds.push(eq(tasks.clientId, Number(clientId)));
  if (projectId) conds.push(eq(tasks.projectId, Number(projectId)));
  if (q) conds.push(like(tasks.title, `%${q}%`));

  const order =
    sort === "title"
      ? asc(tasks.title)
      : sort === "priority"
        ? asc(tasks.priority)
        : sort === "start"
          ? asc(tasks.startDate)
          : desc(tasks.dueDate);

  const rows = await db
    .select({
      task: tasks,
      client: { id: clients.id, name: clients.name, company: clients.company },
      project: { id: projects.id, name: projects.name, color: projects.color },
    })
    .from(tasks)
    .leftJoin(clients, eq(tasks.clientId, clients.id))
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(and(...conds))
    .orderBy(order, desc(tasks.createdAt))
    .limit(500);

  return NextResponse.json(rows.map((r) => ({ ...r.task, client: r.client, project: r.project, tags: r.task.tags ?? [] })));
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const parsed = taskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Input tidak valid" }, { status: 400 });
  }

  const data = parsed.data;

  if (data.clientId) {
    const [client] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.id, data.clientId), eq(clients.userId, userId)));
    if (!client) return NextResponse.json({ error: "Sumber kerja tidak ditemukan" }, { status: 400 });
  }
  if (data.projectId) {
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, data.projectId), eq(projects.userId, userId)));
    if (!project) return NextResponse.json({ error: "Proyek tidak ditemukan" }, { status: 400 });
  }

  const [created] = await db
    .insert(tasks)
    .values({
      userId,
      title: data.title,
      description: data.description ?? null,
      type: data.type,
      clientId: data.type === "main" ? data.clientId ?? null : null,
      projectId: data.type === "side" ? data.projectId ?? null : null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      priority: data.priority,
      status: data.status,
      tags: data.tags,
      completedAt: data.status === "done" ? new Date() : null,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
