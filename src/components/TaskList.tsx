"use client";

import { useState } from "react";
import type { Task } from "@/lib/types";
import Modal from "@/components/Modal";
import TaskForm from "@/components/TaskForm";
import type { Client, Project } from "@/lib/types";

const statusLabel: Record<string, string> = {
  todo: "To Do",
  in_progress: "Dikerjakan",
  done: "Selesai",
  cancelled: "Batal",
};

const priorityBadge: Record<string, string> = {
  low: "bg-slate-600/40 text-slate-300",
  medium: "bg-sky-600/30 text-sky-300",
  high: "bg-amber-600/30 text-amber-300",
  urgent: "bg-red-600/30 text-red-300",
};

export default function TaskList({
  tasks,
  clients,
  projects,
  timezone,
  onChange,
}: {
  tasks: Task[];
  clients: Client[];
  projects: Project[];
  timezone: string;
  onChange: () => void;
}) {
  const [editing, setEditing] = useState<Task | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function toggleStatus(task: Task) {
    setBusyId(task.id);
    const next = task.status === "done" ? "todo" : "done";
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusyId(null);
    onChange();
  }

  async function removeTask(task: Task) {
    if (!confirm(`Hapus tugas "${task.title}"?`)) return;
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    onChange();
  }

  function fmtDue(d: string | null): { text: string; cls: string } {
    if (!d) return { text: "tanpa deadline", cls: "text-slate-500" };
    const due = new Date(d);
    const now = new Date();
    const dayDiff = Math.floor((due.getTime() - now.getTime()) / 86400000);
    const pad = (n: number) => String(n).padStart(2, "0");
    const dateStr = `${due.getDate()}/${due.getMonth() + 1}`;
    if (dayDiff < 0) return { text: `⏰ telat ${dateStr}`, cls: "text-red-400 font-medium" };
    if (dayDiff === 0) return { text: `🔴 hari ini ${pad(due.getHours())}:${pad(due.getMinutes())}`, cls: "text-red-300 font-medium" };
    if (dayDiff === 1) return { text: `🟡 besok ${pad(due.getHours())}:${pad(due.getMinutes())}`, cls: "text-amber-300" };
    return { text: `🟢 ${dateStr} ${pad(due.getHours())}:${pad(due.getMinutes())}`, cls: "text-slate-300" };
  }

  return (
    <>
      <div className="space-y-2">
        {tasks.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
            Belum ada tugas. Klik "Tambah Tugas" untuk mulai.
          </div>
        )}
        {tasks.map((task) => {
          const due = fmtDue(task.dueDate);
          return (
            <div
              key={task.id}
              className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3 transition hover:border-slate-700"
            >
              <button
                onClick={() => toggleStatus(task)}
                disabled={busyId === task.id}
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs transition ${
                  task.status === "done"
                    ? "border-emerald-500 bg-emerald-600 text-white"
                    : "border-slate-600 hover:border-emerald-500"
                }`}
                title={task.status === "done" ? "Tandai belum selesai" : "Tandai selesai"}
              >
                {task.status === "done" ? "✓" : ""}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-sm ${task.status === "done" ? "text-slate-500 line-through" : "text-slate-100"}`}
                  >
                    {task.title}
                  </span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] ${priorityBadge[task.priority] ?? priorityBadge.medium}`}>
                    {task.priority === "urgent" ? "Urgent" : task.priority === "high" ? "Tinggi" : task.priority === "low" ? "Rendah" : "Sedang"}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] ${
                      task.type === "main" ? "bg-indigo-600/30 text-indigo-300" : "bg-emerald-600/30 text-emerald-300"
                    }`}
                  >
                    {task.type === "main" ? "🏢 Utama" : "🚀 Side"}
                  </span>
                  {task.recurrenceId && (
                    <span className="rounded bg-emerald-600/30 px-1.5 py-0.5 text-[10px] text-emerald-300" title="Tugas berulang">
                      🔁
                    </span>
                  )}
                  {task.status !== "done" && task.status !== "cancelled" && (
                    <span className={`text-[11px] ${due.cls}`}>{due.text}</span>
                  )}
                  {task.status === "done" && (
                    <span className="text-[11px] text-emerald-400">✅ selesai</span>
                  )}
                </div>

                {(task.description || task.client || task.project || (task.tags?.length ?? 0) > 0) && (
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    {task.description && <span className="truncate max-w-[300px]">{task.description}</span>}
                    {task.type === "main" && task.client && (
                      <span title="Sumber kerja">🏢 {task.client.name}</span>
                    )}
                    {task.type === "side" && task.project && (
                      <span title="Proyek">🚀 {task.project.name}</span>
                    )}
                    {task.tags?.map((t) => (
                      <span key={t} className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => setEditing(task)}
                  className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  onClick={() => removeTask(task)}
                  className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-red-500/10 hover:text-red-300"
                  title="Hapus"
                >
                  🗑
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <Modal title="Tambah Tugas" onClose={() => setShowForm(false)} wide>
          <TaskForm
            clients={clients}
            projects={projects}
            onSaved={() => {
              setShowForm(false);
              onChange();
            }}
            onCancel={() => setShowForm(false)}
          />
        </Modal>
      )}

      {editing && (
        <Modal title="Edit Tugas" onClose={() => setEditing(null)} wide>
          <TaskForm
            clients={clients}
            projects={projects}
            task={editing}
            onSaved={() => {
              setEditing(null);
              onChange();
            }}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </>
  );
}
