export interface Client {
  id: number;
  name: string;
  company: string | null;
  contact: string | null;
  notes: string | null;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  color: string;
  status: string;
  startDate: string | null;
  dueDate: string | null;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  type: "main" | "side";
  clientId: number | null;
  projectId: number | null;
  startDate: string | null;
  dueDate: string | null;
  priority: string;
  status: string;
  tags: string[];
  completedAt: string | null;
  recurrenceId: number | null;
  client?: { id: number; name: string; company: string | null } | null;
  project?: { id: number; name: string; color: string } | null;
}

export interface Recurrence {
  id: number;
  title: string;
  description: string | null;
  type: "main" | "side";
  clientId: number | null;
  projectId: number | null;
  priority: string;
  tags: string[];
  freq: "daily" | "weekly" | "cron";
  weekdays: number[];
  cron: string | null;
  time: string;
  startsOn: string;
  endsOn: string | null;
  active: boolean;
  nextDate: string | null;
  client?: { id: number; name: string; company: string | null } | null;
  project?: { id: number; name: string; color: string } | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toTaskDto(row: any): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type as "main" | "side",
    clientId: row.clientId,
    projectId: row.projectId,
    startDate: row.startDate ? new Date(row.startDate).toISOString() : null,
    dueDate: row.dueDate ? new Date(row.dueDate).toISOString() : null,
    priority: row.priority,
    status: row.status,
    tags: row.tags ?? [],
    completedAt: row.completedAt ? new Date(row.completedAt).toISOString() : null,
    recurrenceId: row.recurrenceId ?? null,
    client: row.client,
    project: row.project,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toRecurrenceDto(row: any): Recurrence {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type as "main" | "side",
    clientId: row.clientId,
    projectId: row.projectId,
    priority: row.priority,
    tags: row.tags ?? [],
    freq: row.freq,
    weekdays: row.weekdays ?? [],
    cron: row.cron,
    time: row.time,
    startsOn: row.startsOn ? new Date(row.startsOn).toISOString() : new Date().toISOString(),
    endsOn: row.endsOn ? new Date(row.endsOn).toISOString() : null,
    active: row.active,
    nextDate: row.nextDate ?? null,
    client: row.client,
    project: row.project,
  };
}
