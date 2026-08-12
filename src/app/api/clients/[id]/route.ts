import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { clients } from "@/lib/schema";
import { requireUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

const clientSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(200),
  company: z.string().max(200).optional().nullable(),
  contact: z.string().max(300).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const clientId = Number(id);
  if (!Number.isInteger(clientId)) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

  const [existing] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.userId, userId)));
  if (!existing) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const parsed = clientSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Input tidak valid" }, { status: 400 });
  }

  const [updated] = await db
    .update(clients)
    .set({ ...parsed.data })
    .where(eq(clients.id, clientId))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const clientId = Number(id);
  if (!Number.isInteger(clientId)) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

  const [existing] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.userId, userId)));
  if (!existing) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  await db.delete(clients).where(eq(clients.id, clientId));
  return NextResponse.json({ ok: true });
}
