"use client";

import { useCallback, useEffect, useState } from "react";
import type { Task, Client, Project } from "@/lib/types";
import TaskList from "@/components/TaskList";
import Modal from "@/components/Modal";
import TaskForm from "@/components/TaskForm";
import RecurrencesView from "@/components/RecurrencesView";

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
  const [tab, setTab] = useState<"tasks" | "recurring">("tasks");
  const [newAsRecurring, setNewAsRecurring] = useState(false);

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
          <div className="mb-2 flex gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1">
            <button
              onClick={() => setTab("tasks")}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                tab === "tasks" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Tugas
            </button>
            <button
              onClick={() => setTab("recurring")}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                tab === "recurring" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              🔁 Berulang
            </button>
          </div>
          {tab === "tasks" ? (
            <p className="text-sm text-slate-400">
              {loading ? "Memuat..." : `${tasks.length} tugas · ${activeCount} aktif`}
            </p>
          ) : (
            <p className="text-sm text-slate-400">Kelola tugas yang berulang otomatis</p>
          )}
        </div>
        <button
          onClick={() => {
            setNewAsRecurring(tab === "recurring");
            setShowForm(true);
          }}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          + Tambah
        </button>
      </div>

      {tab === "recurring" ? (
        <RecurrencesView
          clients={clients}
          projects={projects}
          timezone={timezone}
          onOpenNew={() => {
            setNewAsRecurring(true);
            setShowForm(true);
          }}
        />
      ) : (
        <>
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
        </>
      )}

      {showForm && (
        <Modal title={newAsRecurring ? "Tambah Tugas Berulang" : "Tambah Tugas"} onClose={() => setShowForm(false)} wide>
          <TaskForm
            clients={clients}
            projects={projects}
            startRecurring={newAsRecurring}
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
