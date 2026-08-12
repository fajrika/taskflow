import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { projects } from "@/lib/schema";
import { requireUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

const projectSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(200),
  description: z.string().max(2000).optional().nullable(),
  color: z.string().max(20),
  status: z.enum(["aktif", "selesai", "dihentikan"]),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isInteger(projectId)) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

  const [existing] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  if (!existing) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const parsed = projectSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Input tidak valid" }, { status: 400 });
  }

  const values: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.startDate) values.startDate = new Date(parsed.data.startDate);
  if (parsed.data.dueDate) values.dueDate = new Date(parsed.data.dueDate);

  const [updated] = await db
    .update(projects)
    .set(values)
    .where(eq(projects.id, projectId))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isInteger(projectId)) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

  const [existing] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  if (!existing) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  await db.delete(projects).where(eq(projects.id, projectId));
  return NextResponse.json({ ok: true });
}
