"use client";

import { useState } from "react";
import type { Client } from "@/lib/types";
import Modal from "@/components/Modal";

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500";

export default function ClientsView({ initial }: { initial: (Client & { taskCount: number })[] }) {
  const [clients, setClients] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState({ name: "", company: "", contact: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/clients");
    setClients(await res.json());
  }

  function openNew() {
    setForm({ name: "", company: "", contact: "", notes: "" });
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(c: Client) {
    setForm({ name: c.name, company: c.company ?? "", contact: c.contact ?? "", notes: c.notes ?? "" });
    setEditing(c);
    setShowForm(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(editing ? `/api/clients/${editing.id}` : "/api/clients", {
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

  async function remove(c: Client) {
    if (!confirm(`Hapus "${c.name}"? Tugas terkait akan kehilangan sumbernya.`)) return;
    await fetch(`/api/clients/${c.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Sumber Kerja</h1>
          <p className="text-sm text-slate-400">Pemberi kerja / klien untuk pekerjaan utama</p>
        </div>
        <button onClick={openNew} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500">
          + Tambah
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
          Belum ada sumber kerja. Tambahkan klien/pemberi kerja utama kamu.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {clients.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-white">{c.name}</div>
                  {c.company && <div className="text-xs text-slate-400">{c.company}</div>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-800" title="Edit">✏️</button>
                  <button onClick={() => remove(c)} className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-red-500/10 hover:text-red-300" title="Hapus">🗑</button>
                </div>
              </div>
              <div className="mt-2 space-y-1 text-xs text-slate-500">
                {c.contact && <div>📞 {c.contact}</div>}
                {c.notes && <div>📝 {c.notes}</div>}
              </div>
              <div className="mt-3">
                <span className="rounded-full bg-indigo-600/20 px-2 py-0.5 text-[11px] text-indigo-300">
                  {c.taskCount} tugas
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? "Edit Sumber Kerja" : "Tambah Sumber Kerja"} onClose={() => setShowForm(false)}>
          <form onSubmit={save} className="space-y-3">
            {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
            <div>
              <label className="mb-1 block text-sm text-slate-400">Nama *</label>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="mis. PT Maju Jaya / Pak Budi" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Perusahaan</label>
              <input value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Kontak (HP / email)</label>
              <input value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Catatan</label>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={inputCls} />
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
