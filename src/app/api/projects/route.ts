import { NextResponse } from "next/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { projects, tasks } from "@/lib/schema";
import { requireUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

const projectSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(200),
  description: z.string().max(2000).optional().nullable(),
  color: z.string().max(20).default("#10b981"),
  status: z.enum(["aktif", "selesai", "dihentikan"]).default("aktif"),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

export async function GET() {
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

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Input tidak valid" }, { status: 400 });
  }

  const [created] = await db
    .insert(projects)
    .values({
      userId,
      name: parsed.data.name.trim(),
      description: parsed.data.description ?? null,
      color: parsed.data.color,
      status: parsed.data.status,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
