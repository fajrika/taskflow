"use client";

import { useState } from "react";
import { listTimezones } from "@/lib/dates";
import PushSetup from "@/components/PushSetup";

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500";

export interface SettingsData {
  name: string;
  email: string;
  timezone: string;
  remindTime: string;
  dailyReminderEnabled: boolean;
  pushEnabled: boolean;
  telegramEnabled: boolean;
  telegramChatId: string;
  discordEnabled: boolean;
  discordWebhookUrl: string;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-emerald-600" : "bg-slate-700"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${checked ? "left-[22px]" : "left-0.5"}`}
      />
    </button>
  );
}

export default function SettingsView({
  initial,
}: {
  initial: SettingsData;

}) {
  const [form, setForm] = useState<SettingsData>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<{ msg: string; ok: boolean } | null>(null);
  const [testing, setTesting] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        timezone: form.timezone,
        remindTime: form.remindTime,
        dailyReminderEnabled: form.dailyReminderEnabled,
        pushEnabled: form.pushEnabled,
        telegramEnabled: form.telegramEnabled,
        telegramChatId: form.telegramChatId,
        discordEnabled: form.discordEnabled,
        discordWebhookUrl: form.discordWebhookUrl,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  async function test(channel: string) {
    setTesting(true);
    setTestResult(null);
    const res = await fetch("/api/notify/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; results?: Record<string, { ok?: boolean; reason?: string }> };
    setTesting(false);

    if (!res.ok || data.error) {
      setTestResult({ msg: data.error ?? "Gagal", ok: false });
      return;
    }
    const lines = Object.entries(data.results ?? {}).map(
      ([k, v]) => `${k}: ${v?.ok ? "OK ✓" : `gagal — ${v?.reason ?? "?"}`}`,
    );
    setTestResult({ msg: lines.join("\n") || "Terproses", ok: lines.every((l) => l.includes("OK")) });
  }

  return (
    <form onSubmit={save} className="max-w-2xl space-y-5">
      {saved && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          Tersimpan ✓
        </div>
      )}

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-white">Profil</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-400">Nama</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Email</label>
            <input value={form.email} disabled className={`${inputCls} opacity-50`} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-white">🌅 Pengingat Harian</h2>
        <p className="mb-3 text-xs text-slate-500">
          Setiap hari pukul yang dipilih: kamu diingatkan tugas hari ini + yang belum selesai kemarin. Kalau semua beres, kamu diingatkan tugas besok.
        </p>
        <div className="flex items-center gap-3">
          <Toggle checked={form.dailyReminderEnabled} onChange={(v) => setForm((f) => ({ ...f, dailyReminderEnabled: v }))} />
          <span className="text-sm text-slate-300">{form.dailyReminderEnabled ? "Aktif" : "Nonaktif"}</span>
        </div>
        {form.dailyReminderEnabled && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-400">Jam pengingat</label>
              <input
                type="time"
                value={form.remindTime}
                onChange={(e) => setForm((f) => ({ ...f, remindTime: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Zona waktu</label>
              <select value={form.timezone} onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))} className={inputCls}>
                {listTimezones().map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-white">🔔 Channel Notifikasi</h2>

        <div className="mb-4 flex items-center gap-3">
          <Toggle checked={form.pushEnabled} onChange={(v) => setForm((f) => ({ ...f, pushEnabled: v }))} />
          <div>
            <div className="text-sm text-slate-300">Web Push (PWA)</div>
            <div className="text-[11px] text-slate-500">Notifikasi ke browser / HP yang terpasang</div>
          </div>
        </div>
        <div className="mb-4 pl-14">
          <PushSetup enabled={form.pushEnabled} onChange={(v) => setForm((f) => ({ ...f, pushEnabled: f.pushEnabled || v }))} />
        </div>

        <div className="mb-4 flex items-center gap-3">
          <Toggle checked={form.telegramEnabled} onChange={(v) => setForm((f) => ({ ...f, telegramEnabled: v }))} />
          <div>
            <div className="text-sm text-slate-300">Telegram</div>
            <div className="text-[11px] text-slate-500">Kirim pesan via bot Telegram</div>
          </div>
        </div>
        <div className="mb-4 pl-14 space-y-1.5">
          <input
            value={form.telegramChatId}
            onChange={(e) => setForm((f) => ({ ...f, telegramChatId: e.target.value }))}
            className={inputCls}
            placeholder="Chat ID (mis. 123456789)"
          />
          <p className="text-[11px] text-slate-500">
            Cara dapat Chat ID: mulai chat ke bot kamu, lalu buka{" "}
            <code className="rounded bg-slate-800 px-1">https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code> dan cari
            <code className="rounded bg-slate-800 px-1">chat.id</code>. Butuh token bot dari @BotFather (diatur admin di env TELEGRAM_BOT_TOKEN).
          </p>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <Toggle checked={form.discordEnabled} onChange={(v) => setForm((f) => ({ ...f, discordEnabled: v }))} />
          <div>
            <div className="text-sm text-slate-300">Discord</div>
            <div className="text-[11px] text-slate-500">Kirim ke channel via webhook</div>
          </div>
        </div>
        <div className="pl-14">
          <input
            value={form.discordWebhookUrl}
            onChange={(e) => setForm((f) => ({ ...f, discordWebhookUrl: e.target.value }))}
            className={inputCls}
            placeholder="https://discord.com/api/webhooks/..."
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Cara buat: Pengaturan Server → Integrasi → Webhooks → New Webhook → salin URL-nya.
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-white">🧪 Uji Notifikasi</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => test("all")} disabled={testing} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50">
            Kirim tes ke semua channel aktif
          </button>
          <button type="button" onClick={() => test("push")} disabled={testing} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50">
            Tes Push
          </button>
          <button type="button" onClick={() => test("telegram")} disabled={testing} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50">
            Tes Telegram
          </button>
          <button type="button" onClick={() => test("discord")} disabled={testing} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50">
            Tes Discord
          </button>
          <button type="button" onClick={() => test("daily")} disabled={testing} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50">
            Pratinjau ringkasan harian
          </button>
        </div>
        {testResult && (
          <pre className={`mt-3 whitespace-pre-wrap rounded-lg border px-3 py-2 text-xs ${testResult.ok ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300" : "border-red-500/30 bg-red-500/5 text-red-300"}`}>
            {testResult.msg}
          </pre>
        )}
      </section>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-emerald-600 py-3 font-medium text-white hover:bg-emerald-500 disabled:opacity-50 sm:w-auto sm:px-8"
      >
        {saving ? "Menyimpan..." : "💾 Simpan Pengaturan"}
      </button>
    </form>
  );
}
