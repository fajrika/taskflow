"use client";

import { useMemo, useState } from "react";
import { CronExpressionParser } from "cron-parser";
import type { Client, Project, Recurrence, Task } from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500";

const WEEKDAYS = [
  { v: 1, label: "Sen" },
  { v: 2, label: "Sel" },
  { v: 3, label: "Rab" },
  { v: 4, label: "Kam" },
  { v: 5, label: "Jum" },
  { v: 6, label: "Sab" },
  { v: 7, label: "Min" },
];

function cronPreview(expr: string): string[] {
  if (!expr.trim()) return [];
  try {
    const parser = CronExpressionParser.parse(expr);
    const out: string[] = [];
    for (let i = 0; i < 3; i++) {
      const d = parser.next().toDate();
      const pad = (n: number) => String(n).padStart(2, "0");
      out.push(
        `${d.getDate()}/${d.getMonth() + 1} ${pad(d.getHours())}:${pad(d.getMinutes())}`,
      );
    }
    return out;
  } catch {
    return [];
  }
}

export default function TaskForm({
  clients,
  projects,
  task,
  recurrence,
  startRecurring,
  onSaved,
  onCancel,
}: {
  clients: Client[];
  projects: Project[];
  task?: Task;
  recurrence?: Recurrence;
  startRecurring?: boolean;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? recurrence?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? recurrence?.description ?? "");
  const [type, setType] = useState<"main" | "side">(task?.type ?? recurrence?.type ?? "main");
  const [clientId, setClientId] = useState(
    recurrence?.clientId ? String(recurrence.clientId) : task?.clientId ? String(task.clientId) : "",
  );
  const [projectId, setProjectId] = useState(
    recurrence?.projectId ? String(recurrence.projectId) : task?.projectId ? String(task.projectId) : "",
  );
  const [startDate, setStartDate] = useState(toLocalInput(task?.startDate));
  const [dueDate, setDueDate] = useState(toLocalInput(task?.dueDate));
  const [priority, setPriority] = useState(task?.priority ?? recurrence?.priority ?? "medium");
  const [status, setStatus] = useState(task?.status ?? "todo");
  const [tags, setTags] = useState((task?.tags ?? recurrence?.tags ?? []).join(", "));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [isRecurring, setIsRecurring] = useState(!!recurrence || !!startRecurring);
  const [freq, setFreq] = useState<"daily" | "weekly" | "cron">(recurrence?.freq ?? "daily");
  const [weekdays, setWeekdays] = useState<number[]>(recurrence?.weekdays ?? [1, 2, 3, 4, 5]);
  const [cron, setCron] = useState(recurrence?.cron ?? "0 8 * * *");
  const [recTime, setRecTime] = useState(recurrence?.time ?? "08:00");
  const [recStart, setRecStart] = useState(
    recurrence ? toLocalDateInput(recurrence.startsOn) : new Date().toISOString().slice(0, 10),
  );
  const [recEnd, setRecEnd] = useState(recurrence?.endsOn ? toLocalDateInput(recurrence.endsOn) : "");

  const preview = useMemo(() => (freq === "cron" ? cronPreview(cron) : []), [freq, cron]);

  function toLocalInput(d: string | null | undefined): string {
    if (!d) return "";
    const dt = new Date(d);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  }

  function toLocalDateInput(d: string): string {
    return new Date(d).toISOString().slice(0, 10);
  }

  function toIso(v: string): string | null {
    if (!v) return null;
    return new Date(v).toISOString();
  }

  function toggleDay(v: number) {
    setWeekdays((cur) => (cur.includes(v) ? cur.filter((d) => d !== v) : [...cur, v].sort()));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const common = {
      title: title.trim(),
      description: description.trim(),
      type,
      clientId: type === "main" && clientId ? Number(clientId) : null,
      projectId: type === "side" && projectId ? Number(projectId) : null,
      priority,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    let payload: unknown;
    let url: string;
    let method: string;

    if (isRecurring) {
      if (freq === "weekly" && weekdays.length === 0) {
        setError("Pilih minimal 1 hari pengulangan");
        setLoading(false);
        return;
      }
      if (freq === "cron" && !cron.trim()) {
        setError("Isi ekspresi cron");
        setLoading(false);
        return;
      }
      if (freq === "cron" && preview.length === 0) {
        setError("Ekspresi cron tidak valid");
        setLoading(false);
        return;
      }
      payload = {
        ...common,
        freq,
        weekdays,
        cron: freq === "cron" ? cron.trim() : null,
        time: recTime,
        startsOn: new Date(`${recStart}T${recTime}`).toISOString(),
        endsOn: recEnd ? new Date(`${recEnd}T23:59:59`).toISOString() : null,
      };
      url = recurrence ? `/api/recurrences/${recurrence.id}` : "/api/recurrences";
      method = recurrence ? "PATCH" : "POST";
    } else {
      payload = {
        ...common,
        startDate: toIso(startDate),
        dueDate: toIso(dueDate),
        status,
      };
      url = task ? `/api/tasks/${task.id}` : "/api/tasks";
      method = task ? "PATCH" : "POST";
    }

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Gagal menyimpan");
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}
      <div>
        <label className="mb-1 block text-sm text-slate-400">Judul tugas *</label>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputCls}
          placeholder="Mis. Check nightwatch"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-slate-400">Deskripsi</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={inputCls}
          placeholder="Detail pekerjaan..."
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm text-slate-400">Jenis pekerjaan</label>
          <select value={type} onChange={(e) => setType(e.target.value as "main" | "side")} className={inputCls}>
            <option value="main">🏢 Utama</option>
            <option value="side">🚀 Side / Proyekan</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">Prioritas</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputCls}>
            <option value="low">Rendah</option>
            <option value="medium">Sedang</option>
            <option value="high">Tinggi</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>
      {type === "main" ? (
        <div>
          <label className="mb-1 block text-sm text-slate-400">Sumber kerja / pemberi tugas</label>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls}>
            <option value="">— Pilih sumber —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.company ? ` (${c.company})` : ""}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div>
          <label className="mb-1 block text-sm text-slate-400">Proyek (side job)</label>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputCls}>
            <option value="">— Pilih proyek —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {!isRecurring && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm text-slate-400">Mulai</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Deadline</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
      )}

      {!isRecurring && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm text-slate-400">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
              <option value="todo">📝 To Do</option>
              <option value="in_progress">🔄 Dikerjakan</option>
              <option value="done">✅ Selesai</option>
              <option value="cancelled">🚫 Batal</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Tags</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className={inputCls}
              placeholder="mis. tagihan, revisi"
            />
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-700/60 p-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="h-4 w-4 accent-emerald-500"
          />
          🔁 Tugas berulang
        </label>

        {isRecurring && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm text-slate-400">Frekuensi</label>
                <select
                  value={freq}
                  onChange={(e) => setFreq(e.target.value as "daily" | "weekly" | "cron")}
                  className={inputCls}
                >
                  <option value="daily">📅 Harian</option>
                  <option value="weekly">🗓 Mingguan (pilih hari)</option>
                  <option value="cron">⚙️ Cron</option>
                </select>
              </div>
              {freq !== "cron" && (
                <div>
                  <label className="mb-1 block text-sm text-slate-400">Jam</label>
                  <input
                    type="time"
                    value={recTime}
                    onChange={(e) => setRecTime(e.target.value)}
                    className={inputCls}
                  />
                </div>
              )}
            </div>

            {freq === "weekly" && (
              <div>
                <label className="mb-1 block text-sm text-slate-400">Hari pengulangan</label>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map((d) => (
                    <button
                      key={d.v}
                      type="button"
                      onClick={() => toggleDay(d.v)}
                      className={`rounded-lg px-3 py-1.5 text-xs transition ${
                        weekdays.includes(d.v)
                          ? "bg-emerald-600 font-medium text-white"
                          : "border border-slate-700 text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {freq === "cron" && (
              <div>
                <label className="mb-1 block text-sm text-slate-400">Ekspresi cron</label>
                <input
                  value={cron}
                  onChange={(e) => setCron(e.target.value)}
                  className={`${inputCls} font-mono`}
                  placeholder="0 8 * * *"
                />
                {preview.length > 0 ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Berikutnya: {preview.join(" · ")}
                  </p>
                ) : cron.trim() ? (
                  <p className="mt-1 text-xs text-red-400">Ekspresi cron tidak valid</p>
                ) : null}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm text-slate-400">Mulai pengulangan</label>
                <input
                  type="date"
                  required
                  value={recStart}
                  onChange={(e) => setRecStart(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Selesai (opsional)</label>
                <input
                  type="date"
                  value={recEnd}
                  onChange={(e) => setRecEnd(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              {recEnd ? `Berulang sampai ${recEnd}` : "Berulang tanpa batas"} — tugas baru dibuat otomatis sesuai jadwal.
            </p>
          </div>
        )}
      </div>

      {isRecurring && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm text-slate-400">Tags</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className={inputCls}
              placeholder="mis. rutin, ops"
            />
          </div>
          <div className="flex items-end pb-1 text-xs text-slate-500">
            Status instance diatur otomatis saat dibuat.
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-slate-700 py-2.5 text-sm text-slate-300 hover:bg-slate-800"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading
            ? "Menyimpan..."
            : recurrence
              ? "Simpan Perubahan"
              : isRecurring
                ? "Buat Tugas Berulang"
                : task
                  ? "Simpan Perubahan"
                  : "Tambah Tugas"}
        </button>
      </div>
    </form>
  );
}
