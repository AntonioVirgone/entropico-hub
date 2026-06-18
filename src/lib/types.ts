export type ProjectStatus = "active" | "archived";
export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type TaskType = "feature" | "bug";
export type IdeaStatus =
  | "idea"
  | "valutazione"
  | "approvata"
  | "promossa"
  | "scartata";

export interface Project {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  color: string;
  status: ProjectStatus;
  // Metadati tecnici (tutti opzionali)
  framework: string | null;
  language: string | null;
  technologies: string[];
  tools: string[];
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
  type: TaskType;
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

export const TASK_TYPES: { value: TaskType; label: string }[] = [
  { value: "feature", label: "Feature" },
  { value: "bug", label: "Bug" },
];

/**
 * Idea di progetto: memo per nuovi progetti da realizzare anche in futuro.
 * Entità autonoma, NON collegata ai projects/tasks delle todo-list.
 */
export interface ProjectIdea {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  status: IdeaStatus;
  priority: TaskPriority;
  created_at: string;
  updated_at: string;
}

export const IDEA_STATUSES: { value: IdeaStatus; label: string }[] = [
  { value: "idea", label: "Idea" },
  { value: "valutazione", label: "In valutazione" },
  { value: "approvata", label: "Approvata" },
  { value: "promossa", label: "Promossa" },
  { value: "scartata", label: "Scartata" },
];

/** Vista denormalizzata usata nella tabella alta-priorità della home */
export interface HighPriorityTask {
  taskId: string;
  title: string;
  created_at: string;
  is_cross_functional: boolean;
  status: TaskStatus;
  projectId: string;
  projectName: string;
  projectColor: string;
}

// ── Cataloghi suggeriti per i metadati tecnici dei progetti ──
// Liste di default: si possono selezionare o integrare con valori custom.

export const FRAMEWORK_OPTIONS = [
  "Next.js",
  "React",
  "Vue",
  "Svelte",
  "Angular",
  "Astro",
  "Express",
  "NestJS",
  "Django",
  "FastAPI",
  "Laravel",
  "Spring",
  "Flutter",
  "React Native",
] as const;

export const LANGUAGE_OPTIONS = [
  "TypeScript",
  "JavaScript",
  "Python",
  "Go",
  "Rust",
  "Java",
  "Kotlin",
  "Swift",
  "PHP",
  "Ruby",
  "C#",
  "Dart",
] as const;

export const TECHNOLOGY_OPTIONS = [
  "Supabase",
  "Vercel",
  "Render",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "Firebase",
  "AWS",
  "Cloudflare",
  "Stripe",
  "Tailwind CSS",
  "Prisma",
] as const;

export const TOOL_OPTIONS = [
  "GitHub",
  "GitLab",
  "Docker",
  "GitHub Actions",
  "Vite",
  "Turbopack",
  "ESLint",
  "Prettier",
  "Jest",
  "Playwright",
  "Figma",
  "Postman",
] as const;

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
