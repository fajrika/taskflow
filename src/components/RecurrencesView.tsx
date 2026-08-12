"use client";

import { useCallback, useEffect, useState } from "react";
import type { Client, Project, Recurrence } from "@/lib/types";
import Modal from "@/components/Modal";
import TaskForm from "@/components/TaskForm";
import { fmtShortDateTime, summarizeFreq } from "@/lib/recurrenceFmt";
export default function RecurrencesView({
  clients,
  projects,
  timezone,
  onOpenNew,
}: {
  clients: Client[];
  projects: Project[];
  timezone: string;
  onOpenNew: () => void;
}) {
  const [items, setItems] = useState<Recurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Recurrence | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/recurrences?tz=${encodeURIComponent(timezone)}`);
    const data = (await res.json()) as Recurrence[];
    setItems(data);
    setLoading(false);
  }, [timezone]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(rec: Recurrence) {
    await fetch(`/api/recurrences/${rec.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !rec.active }),
    });
    load();
  }

  async function remove(rec: Recurrence) {
    if (!confirm(`Hapus pengulangan "${rec.title}"? Tugas instance-nya ikut terhapus.`)) return;
    await fetch(`/api/recurrences/${rec.id}`, { method: "DELETE" });
    load();
  }

  function fmtNext(d: string | null): string {
    return fmtShortDateTime(d);
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">🔁 Tugas Berulang</h1>
          <p className="text-sm text-slate-400">
            {loading ? "Memuat..." : `${items.length} pengulangan · ${items.filter((r) => r.active).length} aktif`}
          </p>
        </div>
        <button
          onClick={onOpenNew}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          + Tambah
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">Memuat...</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
          Belum ada tugas berulang. Klik "+ Tambah" untuk membuat, mis. check nightwatch setiap hari.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((rec) => (
            <div
              key={rec.id}
              className={`flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3 transition hover:border-slate-700 ${
                !rec.active ? "opacity-60" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-sm ${rec.active ? "text-slate-100" : "text-slate-400"}`}>{rec.title}</span>
                  <span className="rounded bg-emerald-600/30 px-1.5 py-0.5 text-[10px] text-emerald-300">🔁</span>
                  {!rec.active && (
                    <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300">jeda</span>
                  )}
                  {rec.type === "main" ? (
                    <span className="rounded bg-indigo-600/30 px-1.5 py-0.5 text-[10px] text-indigo-300">🏢 Utama</span>
                  ) : (
                    <span className="rounded bg-emerald-600/30 px-1.5 py-0.5 text-[10px] text-emerald-300">🚀 Side</span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span>{summarizeFreq(rec)}</span>
                  <span>mulai {fmtNext(rec.startsOn)}</span>
                  {rec.endsOn && <span>sampai {fmtNext(rec.endsOn)}</span>}
                  {rec.type === "main" && rec.client && <span>🏢 {rec.client.name}</span>}
                  {rec.type === "side" && rec.project && <span>🚀 {rec.project.name}</span>}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  Berikutnya: <span className="text-slate-200">{fmtNext(rec.nextDate)}</span>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => toggleActive(rec)}
                  className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  title={rec.active ? "Jeda" : "Aktifkan"}
                >
                  {rec.active ? "⏸" : "▶️"}
                </button>
                <button
                  onClick={() => setEditing(rec)}
                  className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  onClick={() => remove(rec)}
                  className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-red-500/10 hover:text-red-300"
                  title="Hapus"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title="Tambah Tugas Berulang" onClose={() => setShowForm(false)} wide>
          <TaskForm
            clients={clients}
            projects={projects}
            onSaved={() => {
              setShowForm(false);
              load();
            }}
            onCancel={() => setShowForm(false)}
          />
        </Modal>
      )}

      {editing && (
        <Modal title="Edit Tugas Berulang" onClose={() => setEditing(null)} wide>
          <TaskForm
            clients={clients}
            projects={projects}
            recurrence={editing}
            onSaved={() => {
              setEditing(null);
              load();
            }}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  );
}
