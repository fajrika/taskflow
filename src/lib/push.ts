import "server-only";
import webpush from "web-push";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/schema";

function getVapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@taskflow.local";
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

export async function sendPushToUser(
  userId: number,
  payload: { title: string; body?: string; url?: string },
) {
  const vapid = getVapid();
  if (!vapid) return { ok: false, reason: "VAPID tidak dikonfigurasi" };

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({
          title: payload.title,
          body: payload.body ?? "",
          url: payload.url ?? "/",
        }),
        { vapidDetails: { subject: vapid.subject, publicKey: vapid.publicKey, privateKey: vapid.privateKey } },
      );
      sent++;
    } catch (err: unknown) {
      const code = (err as { statusCode?: number })?.statusCode;
      if (code === 404 || code === 410) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint));
      }
      failed++;
    }
  }

  return { ok: sent > 0 || subs.length === 0, sent, failed };
}

export function publicVapidKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null;
}
