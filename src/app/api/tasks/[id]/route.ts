import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { tasks } from "@/lib/schema";
import { requireUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  title: z.string().min(1, "Judul wajib diisi").max(300).optional(),
  description: z.string().max(5000).optional().nullable(),
  type: z.enum(["main", "side"]).optional(),
  clientId: z.number().int().positive().optional().nullable(),
  projectId: z.number().int().positive().optional().nullable(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  status: z.enum(["todo", "in_progress", "done", "cancelled"]).optional(),
  tags: z.array(z.string()).optional(),
});

async function getOwnedTask(userId: number, id: number) {
  const [row] = await db.select().from(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
  return row;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const taskId = Number(id);
  if (!Number.isInteger(taskId)) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

  const existing = await getOwnedTask(userId, taskId);
  if (!existing) return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Input tidak valid" }, { status: 400 });
  }

  const data = parsed.data;

  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (data.title !== undefined) values.title = data.title;
  if (data.description !== undefined) values.description = data.description;
  if (data.priority !== undefined) values.priority = data.priority;
  if (data.startDate !== undefined) values.startDate = data.startDate;
  if (data.dueDate !== undefined) values.dueDate = data.dueDate;
  if (data.tags !== undefined) values.tags = data.tags;

  if (data.type !== undefined) {
    values.type = data.type;
    if (data.type === "main") {
      values.projectId = null;
      if (data.clientId !== undefined) values.clientId = data.clientId;
    } else {
      values.clientId = null;
      if (data.projectId !== undefined) values.projectId = data.projectId;
    }
  } else {
    if (data.clientId !== undefined) values.clientId = data.clientId;
    if (data.projectId !== undefined) values.projectId = data.projectId;
  }

  if (data.status !== undefined) {
    values.status = data.status;
    values.completedAt = data.status === "done" ? new Date() : null;
  }

  const [updated] = await db.update(tasks).set(values).where(eq(tasks.id, taskId)).returning();
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const taskId = Number(id);
  if (!Number.isInteger(taskId)) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

  const existing = await getOwnedTask(userId, taskId);
  if (!existing) return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 });

  await db.delete(tasks).where(eq(tasks.id, taskId));
  return NextResponse.json({ ok: true });
}
