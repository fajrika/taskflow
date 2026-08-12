"use client";

import { useCallback, useEffect, useState } from "react";
import type { Task, Client, Project } from "@/lib/types";
import TaskList from "@/components/TaskList";
import Modal from "@/components/Modal";
import TaskForm from "@/components/TaskForm";

const STATUS_OPTIONS = [
  { value: "all", label: "Semua status" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "Dikerjakan" },
  { value: "done", label: "Selesai" },
  { value: "cancelled", label: "Batal" },
];

const filterCls =
  "rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500";

export default function TasksView({
  clients,
  projects,
  timezone,
}: {
  clients: Client[];
  projects: Project[];
  timezone: string;
}) {
  const [filters, setFilters] = useState({
    status: "all",
    type: "all",
    clientId: "",
    projectId: "",
    q: "",
    sort: "due",
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v && v !== "all") qs.set(k, v);
    const res = await fetch(`/api/tasks?${qs.toString()}`);
    const data = (await res.json()) as Task[];
    setTasks(data);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const activeCount = tasks.filter((t) => t.status !== "done" && t.status !== "cancelled").length;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Tugas</h1>
          <p className="text-sm text-slate-400">
            {loading ? "Memuat..." : `${tasks.length} tugas · ${activeCount} aktif`}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          + Tambah
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-6">
        <input
          placeholder="🔍 Cari..."
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          className={filterCls}
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className={filterCls}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={filters.type}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
          className={filterCls}
        >
          <option value="all">Semua jenis</option>
          <option value="main">🏢 Utama</option>
          <option value="side">🚀 Side</option>
        </select>
        <select
          value={filters.clientId}
          onChange={(e) => setFilters((f) => ({ ...f, clientId: e.target.value }))}
          className={filterCls}
        >
          <option value="">Semua sumber</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={filters.projectId}
          onChange={(e) => setFilters((f) => ({ ...f, projectId: e.target.value }))}
          className={filterCls}
        >
          <option value="">Semua proyek</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={filters.sort}
          onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
          className={filterCls}
        >
          <option value="due">Urut: deadline</option>
          <option value="start">Urut: mulai</option>
          <option value="priority">Urut: prioritas</option>
          <option value="title">Urut: judul</option>
        </select>
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">Memuat...</div>
      ) : (
        <TaskList tasks={tasks} clients={clients} projects={projects} timezone={timezone} onChange={load} />
      )}

      {showForm && (
        <Modal title="Tambah Tugas" onClose={() => setShowForm(false)} wide>
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
    </div>
  );
}
