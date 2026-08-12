import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { clients, tasks } from "@/lib/schema";
import { requireUserId } from "@/lib/session";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const clientSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(200),
  company: z.string().max(200).optional().nullable(),
  contact: z.string().max(300).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function GET() {
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

  const parsed = clientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Input tidak valid" }, { status: 400 });
  }

  const [created] = await db
    .insert(clients)
    .values({
      userId,
      name: parsed.data.name.trim(),
      company: parsed.data.company ?? null,
      contact: parsed.data.contact ?? null,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
