export type ProjectStatus = "active" | "archived";
export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  notes: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  position: number;
  is_cross_functional: boolean;
  created_at: string;
  updated_at: string;
  // Popolato dalla query (non è una colonna DB): project_id di tutti i progetti collegati
  cross_project_ids: string[];
}

export const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "Da fare" },
  { value: "in_progress", label: "In corso" },
  { value: "done", label: "Fatto" },
];

export const TASK_PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Bassa" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
];

export const PROJECT_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
] as const;
