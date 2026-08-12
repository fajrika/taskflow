import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { recurrences, tasks, userSettings } from "@/lib/schema";
import { requireUserId } from "@/lib/session";
import { generateForRecurrence, isValidCron, nextOccurrence } from "@/lib/recurrences";

export const dynamic = "force-dynamic";

const recurrenceSchema = z.object({
  title: z.string().min(1, "Judul wajib diisi").max(300),
  description: z.string().max(5000).optional().nullable(),
  type: z.enum(["main", "side"]).default("main"),
  clientId: z.number().int().positive().optional().nullable(),
  projectId: z.number().int().positive().optional().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  tags: z.array(z.string()).optional().default([]),
  freq: z.enum(["daily", "weekly", "cron"]).default("daily"),
  weekdays: z.array(z.number().int().min(1).max(7)).optional().default([]),
  cron: z.string().optional().nullable(),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Format waktu HH:mm").default("08:00"),
  startsOn: z.string().min(1, "Tanggal mulai wajib diisi"),
  endsOn: z.string().optional().nullable(),
  active: z.boolean().optional().default(true),
});

export async function GET(req: Request) {
  const userId = await requireUserId();
  const url = new URL(req.url);
  const timezone =
    url.searchParams.get("tz") ??
    (await db
      .select({ timezone: userSettings.timezone })
      .from(userSettings)
      .where(eq(userSettings.userId, userId)))[0]?.timezone ??
    "Asia/Jakarta";

  const rows = await db
    .select()
    .from(recurrences)
    .where(eq(recurrences.userId, userId))
    .orderBy(desc(recurrences.createdAt));

  const now = new Date();
  const out = [];
  for (const rec of rows) {
    const next = await nextOccurrence(rec, timezone, now);
    out.push({ ...rec, weekdays: rec.weekdays ?? [], tags: rec.tags ?? [], nextDate: next?.toISOString() ?? null });
  }
  return NextResponse.json(out);
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const parsed = recurrenceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Input tidak valid" }, { status: 400 });
  }
  const data = parsed.data;

  if (data.freq === "cron" && !data.cron) {
    return NextResponse.json({ error: "Ekspresi cron wajib diisi" }, { status: 400 });
  }
  if (data.freq === "cron" && !isValidCron(data.cron!)) {
    return NextResponse.json({ error: "Ekspresi cron tidak valid" }, { status: 400 });
  }
  if (data.freq === "weekly" && (data.weekdays ?? []).length === 0) {
    return NextResponse.json({ error: "Pilih minimal 1 hari pengulangan" }, { status: 400 });
  }

  const [created] = await db
    .insert(recurrences)
    .values({
      userId,
      title: data.title,
      description: data.description ?? null,
      type: data.type,
      clientId: data.type === "main" ? data.clientId ?? null : null,
      projectId: data.type === "side" ? data.projectId ?? null : null,
      priority: data.priority,
      tags: data.tags,
      freq: data.freq,
      weekdays: data.freq === "weekly" ? data.weekdays : [],
      cron: data.freq === "cron" ? data.cron : null,
      time: data.time,
      startsOn: new Date(data.startsOn),
      endsOn: data.endsOn ? new Date(data.endsOn) : null,
      active: data.active,
    })
    .returning();

  const [settings] = await db
    .select({ timezone: userSettings.timezone })
    .from(userSettings)
    .where(eq(userSettings.userId, userId));

  await generateForRecurrence(created, settings?.timezone ?? "Asia/Jakarta");

  return NextResponse.json({ ...created, weekdays: created.weekdays ?? [] }, { status: 201 });
}
