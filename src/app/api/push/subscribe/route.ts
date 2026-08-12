import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/schema";
import { requireUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

const schema = z.object({
  endpoint: z.string().min(1),
  p256dh: z.string().min(1).optional(),
  auth: z.string().min(1).optional(),
  action: z.enum(["subscribe", "unsubscribe"]).default("subscribe"),
});

export async function POST(req: Request) {
  const userId = await requireUserId();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });
  }

  const { endpoint, p256dh, auth, action } = parsed.data;

  if (action === "unsubscribe") {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
    return NextResponse.json({ ok: true });
  }

  if (!p256dh || !auth) {
    return NextResponse.json({ error: "Kunci push tidak lengkap" }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(pushSubscriptions)
    .where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, userId)));

  if (existing) {
    await db
      .update(pushSubscriptions)
      .set({ p256dh, auth })
      .where(eq(pushSubscriptions.endpoint, endpoint));
  } else {
    await db.insert(pushSubscriptions).values({ userId, endpoint, p256dh, auth });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
