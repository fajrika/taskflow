"use client";

import { useEffect, useState } from "react";

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export default function PushSetup({
  vapidKey,
  enabled,
  onChange,
}: {
  vapidKey: string | null;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const [status, setStatus] = useState<"idle" | "supported" | "unsupported" | "subscribed">("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription()).then((sub) => {
      setStatus(sub ? "subscribed" : "supported");
    });
  }, []);

  async function subscribe() {
    setBusy(true);
    setError(null);
    try {
      if (!vapidKey) throw new Error("VAPID key belum dikonfigurasi di server");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error("Gagal menyimpan langganan");
      setStatus("subscribed");
      onChange(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengaktifkan push");
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint, action: "unsubscribe" }),
      });
    }
    setStatus("supported");
    onChange(false);
    setBusy(false);
  }

  if (status === "unsupported") {
    return <div className="text-xs text-slate-500">Browser ini tidak mendukung Web Push.</div>;
  }

  if (status === "subscribed") {
    return (
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-emerald-600/20 px-2 py-0.5 text-[11px] text-emerald-300">Aktif ✓</span>
        <button onClick={unsubscribe} disabled={busy} className="text-xs text-slate-500 underline hover:text-red-300 disabled:opacity-50">
          Nonaktifkan
        </button>
      </div>
    );
  }

  return (
    <div>
      {error && <div className="mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}
      <button
        onClick={subscribe}
        disabled={busy || !enabled}
        className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-600 disabled:opacity-50"
      >
        {busy ? "Memproses..." : "🔔 Aktifkan notifikasi browser"}
      </button>
      <p className="mt-1.5 text-[11px] text-slate-500">
        Aktifkan dulu toggle di atas, lalu izinkan notifikasi dari browser.
      </p>
    </div>
  );
}
