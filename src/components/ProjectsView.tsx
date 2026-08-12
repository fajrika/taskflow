"use client";

import { useState } from "react";
import type { Project } from "@/lib/types";
import Modal from "@/components/Modal";

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500";

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6", "#64748b"];

export default function ProjectsView({ initial }: { initial: (Project & { taskCount: number })[] }) {
  const [projects, setProjects] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState({ name: "", description: "", color: COLORS[0], status: "aktif" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/projects");
    setProjects(await res.json());
  }

  function openNew() {
    setForm({ name: "", description: "", color: COLORS[0], status: "aktif" });
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(p: Project) {
    setForm({ name: p.name, description: p.description ?? "", color: p.color, status: p.status });
    setEditing(p);
    setShowForm(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(editing ? `/api/projects/${editing.id}` : "/api/projects", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Gagal menyimpan");
      return;
    }
    setShowForm(false);
    load();
  }

  async function remove(p: Project) {
    if (!confirm(`Hapus proyek "${p.name}"? Tugas terkait akan kehilangan proyeknya.`)) return;
    await fetch(`/api/projects/${p.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Proyek (Side Job)</h1>
          <p className="text-sm text-slate-400">Proyekan / kerjaan sampingan kamu</p>
        </div>
        <button onClick={openNew} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500">
          + Tambah
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
          Belum ada proyek. Tambahkan proyekan/side job kamu.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {projects.map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: p.color }} />
                  <div>
                    <div className="font-medium text-white">{p.name}</div>
                    <div className="text-xs text-slate-400">
                      {p.status === "aktif" ? "🟢 Aktif" : p.status === "selesai" ? "✅ Selesai" : "🚫 Dihentikan"}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(p)} className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-800" title="Edit">✏️</button>
                  <button onClick={() => remove(p)} className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-red-500/10 hover:text-red-300" title="Hapus">🗑</button>
                </div>
              </div>
              {p.description && <div className="mt-2 text-xs text-slate-500">📝 {p.description}</div>}
              <div className="mt-3 flex gap-2">
                <span className="rounded-full bg-emerald-600/20 px-2 py-0.5 text-[11px] text-emerald-300">{p.taskCount} tugas</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? "Edit Proyek" : "Tambah Proyek"} onClose={() => setShowForm(false)}>
          <form onSubmit={save} className="space-y-3">
            {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
            <div>
              <label className="mb-1 block text-sm text-slate-400">Nama proyek *</label>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="mis. Jualan online / Aplikasi X" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Deskripsi</label>
              <textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Warna</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className={`h-7 w-7 rounded-full ${form.color === c ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900" : ""}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Status</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={inputCls}>
                <option value="aktif">Aktif</option>
                <option value="selesai">Selesai</option>
                <option value="dihentikan">Dihentikan</option>
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-lg border border-slate-700 py-2.5 text-sm text-slate-300 hover:bg-slate-800">Batal</button>
              <button type="submit" disabled={loading} className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50">
                {loading ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
