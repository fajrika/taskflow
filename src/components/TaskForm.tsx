"use client";

import { useState } from "react";
import type { Client, Project, Task } from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500";

export default function TaskForm({
  clients,
  projects,
  task,
  onSaved,
  onCancel,
}: {
  clients: Client[];
  projects: Project[];
  task?: Task;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [type, setType] = useState<"main" | "side">(task?.type ?? "main");
  const [clientId, setClientId] = useState(task?.clientId ? String(task.clientId) : "");
  const [projectId, setProjectId] = useState(task?.projectId ? String(task.projectId) : "");
  const [startDate, setStartDate] = useState(toLocalInput(task?.startDate));
  const [dueDate, setDueDate] = useState(toLocalInput(task?.dueDate));
  const [priority, setPriority] = useState(task?.priority ?? "medium");
  const [status, setStatus] = useState(task?.status ?? "todo");
  const [tags, setTags] = useState(task?.tags?.join(", ") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toLocalInput(d: string | null | undefined): string {
    if (!d) return "";
    const dt = new Date(d);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(
      dt.getHours(),
    )}:${pad(dt.getMinutes())}`;
  }

  function toIso(v: string): string | null {
    if (!v) return null;
    return new Date(v).toISOString();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      title: title.trim(),
      description: description.trim(),
      type,
      clientId: type === "main" && clientId ? Number(clientId) : null,
      projectId: type === "side" && projectId ? Number(projectId) : null,
      startDate: toIso(startDate),
      dueDate: toIso(dueDate),
      priority,
      status,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    const res = await fetch(task ? `/api/tasks/${task.id}` : "/api/tasks", {
      method: task ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Gagal menyimpan tugas");
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
          placeholder="Mis. Revisi laporan keuangan"
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
          {loading ? "Menyimpan..." : task ? "Simpan Perubahan" : "Tambah Tugas"}
        </button>
      </div>
    </form>
  );
}
