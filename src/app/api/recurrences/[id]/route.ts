import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { recurrences, userSettings } from "@/lib/schema";
import { requireUserId } from "@/lib/session";
import { generateForRecurrence, isValidCron } from "@/lib/recurrences";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  title: z.string().min(1, "Judul wajib diisi").max(300).optional(),
  description: z.string().max(5000).optional().nullable(),
  type: z.enum(["main", "side"]).optional(),
  clientId: z.number().int().positive().optional().nullable(),
  projectId: z.number().int().positive().optional().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  tags: z.array(z.string()).optional(),
  freq: z.enum(["daily", "weekly", "cron"]).optional(),
  weekdays: z.array(z.number().int().min(1).max(7)).optional(),
  cron: z.string().optional().nullable(),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Format waktu HH:mm").optional(),
  startsOn: z.string().optional(),
  endsOn: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

async function getOwned(userId: number, id: number) {
  const [row] = await db.select().from(recurrences).where(and(eq(recurrences.id, id), eq(recurrences.userId, userId)));
  return row;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const recId = Number(id);
  if (!Number.isInteger(recId)) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

  const existing = await getOwned(userId, recId);
  if (!existing) return NextResponse.json({ error: "Pengulangan tidak ditemukan" }, { status: 404 });

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
  if (data.tags !== undefined) values.tags = data.tags;
  if (data.time !== undefined) values.time = data.time;
  if (data.startsOn !== undefined) values.startsOn = new Date(data.startsOn);
  if (data.endsOn !== undefined) values.endsOn = data.endsOn ? new Date(data.endsOn) : null;
  if (data.active !== undefined) values.active = data.active;

  if (data.freq !== undefined) {
    values.freq = data.freq;
    if (data.freq === "weekly") {
      if (!data.weekdays || data.weekdays.length === 0) {
        return NextResponse.json({ error: "Pilih minimal 1 hari pengulangan" }, { status: 400 });
      }
      values.weekdays = data.weekdays;
      values.cron = null;
    } else if (data.freq === "cron") {
      if (!data.cron) return NextResponse.json({ error: "Ekspresi cron wajib diisi" }, { status: 400 });
      if (!isValidCron(data.cron)) {
        return NextResponse.json({ error: "Ekspresi cron tidak valid" }, { status: 400 });
      }
      values.cron = data.cron;
      values.weekdays = [];
    } else {
      values.cron = null;
      values.weekdays = [];
    }
  } else {
    if (data.weekdays !== undefined) values.weekdays = data.weekdays;
    if (data.cron !== undefined) {
      if (data.cron && !isValidCron(data.cron)) {
        return NextResponse.json({ error: "Ekspresi cron tidak valid" }, { status: 400 });
      }
      values.cron = data.cron;
    }
  }

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

  const [updated] = await db
    .update(recurrences)
    .set(values)
    .where(eq(recurrences.id, recId))
    .returning();

  if (updated.active) {
    const [settings] = await db
      .select({ timezone: userSettings.timezone })
      .from(userSettings)
      .where(eq(userSettings.userId, userId));
    await generateForRecurrence(updated, settings?.timezone ?? "Asia/Jakarta");
  }

  return NextResponse.json({ ...updated, weekdays: updated.weekdays ?? [] });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const recId = Number(id);
  if (!Number.isInteger(recId)) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

  const existing = await getOwned(userId, recId);
  if (!existing) return NextResponse.json({ error: "Pengulangan tidak ditemukan" }, { status: 404 });

  await db.delete(recurrences).where(eq(recurrences.id, recId));
  return NextResponse.json({ ok: true });
}
