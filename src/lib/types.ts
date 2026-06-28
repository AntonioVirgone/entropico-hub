export type ProjectStatus = "active" | "archived";
export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type TaskType = "feature" | "bug" | "analysis";
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
  // Collegamento al repository GitHub (se creato/associato)
  github_repo_url: string | null;
  github_repo_full_name: string | null;
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

/** Criteri di ordinamento della griglia progetti nella home. */
export type ProjectSort = "created" | "alpha" | "last_task";

export const DEFAULT_PROJECT_SORT: ProjectSort = "created";

export const PROJECT_SORT_OPTIONS: { value: ProjectSort; label: string }[] = [
  { value: "created", label: "Data di creazione" },
  { value: "alpha", label: "Ordine alfabetico" },
  { value: "last_task", label: "Ultimo task creato" },
];

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
  { value: "analysis", label: "Analisi" },
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

export type DocumentFormat = "markdown" | "text";
export type DocumentSource = "manual" | "api";

/** Documento di progetto: archivio di documentazione (markdown o testo). */
export interface ProjectDocument {
  id: string;
  project_id: string;
  title: string;
  slug: string;
  content: string;
  format: DocumentFormat;
  source: DocumentSource;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export const DOCUMENT_FORMATS: { value: DocumentFormat; label: string }[] = [
  { value: "markdown", label: "Markdown" },
  { value: "text", label: "Testo semplice" },
];

/** Dimensione massima del contenuto di un documento (caratteri). */
export const DOCUMENT_MAX_CONTENT = 1_000_000;

/**
 * Token API personale (vista sicura per la UI: mai il token in chiaro né l'hash).
 * Il valore completo è mostrato una sola volta alla creazione.
 */
export interface ApiToken {
  id: string;
  name: string;
  token_prefix: string;
  last_used_at: string | null;
  created_at: string;
}

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
