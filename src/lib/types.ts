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
    client: row.client,
    project: row.project,
  };
}
