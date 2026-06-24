"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createUserRepo, GithubError } from "@/lib/github";
import { slugify } from "@/lib/utils";
import type {
  DocumentFormat,
  IdeaStatus,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
  TaskType,
} from "@/lib/types";

// ----------------------------------------------------------------
// Projects
// ----------------------------------------------------------------

/** Legge un campo lista da FormData normalizzando: trim, scarto vuoti, dedup. */
function parseList(formData: FormData, name: string): string[] {
  return [
    ...new Set(
      formData
        .getAll(name)
        .map((v) => String(v).trim())
        .filter(Boolean)
    ),
  ];
}

/**
 * Crea un progetto e, se richiesto, il relativo repository su GitHub per conto
 * dell'utente loggato. Il progetto è il record primario: se la creazione del
 * repo fallisce, il progetto resta e l'errore viene restituito (non lanciato),
 * così la UI può segnalarlo senza perdere il progetto.
 */
export async function createProject(
  formData: FormData
): Promise<{ githubError: string | null }> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { githubError: null };

  const description = String(formData.get("description") ?? "").trim() || null;
  const color = String(formData.get("color") ?? "#3b82f6");
  const framework = String(formData.get("framework") ?? "").trim() || null;
  const language = String(formData.get("language") ?? "").trim() || null;
  const technologies = parseList(formData, "technologies");
  const tools = parseList(formData, "tools");

  const supabase = await createSupabaseServerClient();
  const { data: project, error } = await supabase
    .from("projects")
    .insert({ name, description, color, framework, language, technologies, tools })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/");

  if (formData.get("create_github_repo") !== "true") {
    return { githubError: null };
  }

  const githubError = await createGithubRepoForProject(supabase, project.id, {
    name,
    description,
    repoName: String(formData.get("github_repo_name") ?? "").trim(),
    isPrivate: formData.get("github_visibility") !== "public",
  });
  return { githubError };
}

/**
 * Crea il repository GitHub e lo collega al progetto. Ritorna un messaggio
 * d'errore (stringa) se qualcosa va storto, altrimenti null.
 */
async function createGithubRepoForProject(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  projectId: string,
  opts: {
    name: string;
    description: string | null;
    repoName: string;
    isPrivate: boolean;
  }
): Promise<string | null> {
  // Token GitHub dell'utente (letto solo lato server via RLS).
  const { data: cred } = await supabase
    .from("github_credentials")
    .select("access_token")
    .maybeSingle();

  if (!cred?.access_token) {
    return "GitHub non collegato: accedi/collegati con GitHub per creare il repository.";
  }

  const repoName = slugify(opts.repoName || opts.name);
  if (!repoName) return "Nome repository non valido.";

  try {
    const repo = await createUserRepo(cred.access_token, {
      name: repoName,
      description: opts.description,
      isPrivate: opts.isPrivate,
      autoInit: true,
    });

    const { error: updErr } = await supabase
      .from("projects")
      .update({
        github_repo_url: repo.html_url,
        github_repo_full_name: repo.full_name,
      })
      .eq("id", projectId);

    if (updErr) {
      return `Repository creato (${repo.html_url}) ma collegamento non salvato: ${updErr.message}`;
    }

    revalidatePath("/");
    revalidatePath(`/projects/${projectId}`);
    return null;
  } catch (e) {
    if (e instanceof GithubError) return `GitHub: ${e.message}`;
    return "Errore imprevisto nella creazione del repository GitHub.";
  }
}

export async function updateProject(id: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const description = String(formData.get("description") ?? "").trim() || null;
  const color = String(formData.get("color") ?? "#3b82f6");
  const framework = String(formData.get("framework") ?? "").trim() || null;
  const language = String(formData.get("language") ?? "").trim() || null;
  const technologies = parseList(formData, "technologies");
  const tools = parseList(formData, "tools");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("projects")
    .update({ name, description, color, framework, language, technologies, tools })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath(`/projects/${id}`);
}

export async function setProjectStatus(id: string, status: ProjectStatus) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("projects")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath(`/projects/${id}`);
}

export async function deleteProject(id: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  redirect("/");
}

// ----------------------------------------------------------------
// Tasks
// ----------------------------------------------------------------

function parseCrossProjectIds(formData: FormData, primaryProjectId: string): string[] {
  const isCross = formData.get("is_cross_functional") === "true";
  if (!isCross) return [];
  return formData
    .getAll("cross_project_ids")
    .map(String)
    .filter((id) => id !== primaryProjectId);
}

/**
 * Aggiorna i link cross-project di un task senza toccare lo status
 * delle righe già esistenti — ogni progetto mantiene il proprio avanzamento.
 */
async function syncCrossProjects(
  taskId: string,
  primaryProjectId: string,
  newCrossProjectIds: string[]
) {
  const supabase = await createSupabaseServerClient();

  // Link attuali (escluso il progetto principale che non va mai rimosso)
  const { data: current } = await supabase
    .from("task_cross_projects")
    .select("project_id")
    .eq("task_id", taskId)
    .neq("project_id", primaryProjectId);

  const currentIds = new Set((current ?? []).map((r) => r.project_id as string));
  const newIds = new Set(newCrossProjectIds);

  // Rimuovi i link deselezionati
  const toRemove = [...currentIds].filter((id) => !newIds.has(id));
  if (toRemove.length > 0) {
    await supabase
      .from("task_cross_projects")
      .delete()
      .eq("task_id", taskId)
      .in("project_id", toRemove);
  }

  // Aggiungi i nuovi link con status 'todo' iniziale
  const toAdd = [...newIds].filter((id) => !currentIds.has(id));
  if (toAdd.length > 0) {
    const { error } = await supabase.from("task_cross_projects").insert(
      toAdd.map((pid) => ({ task_id: taskId, project_id: pid, status: "todo" }))
    );
    if (error) throw new Error(error.message);
  }

  return { added: toAdd, removed: toRemove };
}

export async function createTask(projectId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const description = String(formData.get("description") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const priority = (String(formData.get("priority") ?? "medium") || "medium") as TaskPriority;
  const type = (String(formData.get("type") ?? "feature") || "feature") as TaskType;
  const isCross = formData.get("is_cross_functional") === "true";
  const crossProjectIds = parseCrossProjectIds(formData, projectId);

  const supabase = await createSupabaseServerClient();

  // 1. Crea il task (senza status — lo status vive nella junction)
  const { data, error } = await supabase
    .from("tasks")
    .insert({ project_id: projectId, title, description, notes, priority, type, is_cross_functional: isCross })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  // 2. Inserisci la riga principale nella junction (progetto corrente, status 'todo')
  const { error: jErr } = await supabase
    .from("task_cross_projects")
    .insert({ task_id: data.id, project_id: projectId, status: "todo" });

  if (jErr) throw new Error(jErr.message);

  // 3. Aggiungi i link cross-project selezionati
  if (crossProjectIds.length > 0) {
    const { error: cErr } = await supabase.from("task_cross_projects").insert(
      crossProjectIds.map((pid) => ({ task_id: data.id, project_id: pid, status: "todo" }))
    );
    if (cErr) throw new Error(cErr.message);
    for (const pid of crossProjectIds) revalidatePath(`/projects/${pid}`);
  }

  revalidatePath(`/projects/${projectId}`);
}

export async function updateTask(
  id: string,
  projectId: string,
  formData: FormData
) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const description = String(formData.get("description") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const priority = (String(formData.get("priority") ?? "medium") || "medium") as TaskPriority;
  const type = (String(formData.get("type") ?? "feature") || "feature") as TaskType;
  const isCross = formData.get("is_cross_functional") === "true";
  const crossProjectIds = parseCrossProjectIds(formData, projectId);

  // Aggiorna i campi del task (NON lo status — quello è nella junction)
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tasks")
    .update({ title, description, notes, priority, type, is_cross_functional: isCross })
    .eq("id", id);

  if (error) throw new Error(error.message);

  // Sincronizza i link cross-project preservando gli status esistenti
  const { added, removed } = await syncCrossProjects(id, projectId, crossProjectIds);

  const allAffected = new Set([...added, ...removed]);
  for (const pid of allAffected) revalidatePath(`/projects/${pid}`);

  revalidatePath(`/projects/${projectId}`);
}

export async function moveTask(
  id: string,
  projectId: string,
  status: TaskStatus
) {
  // Aggiorna lo status SOLO per questo progetto — gli altri restano invariati
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("task_cross_projects")
    .update({ status })
    .eq("task_id", id)
    .eq("project_id", projectId);

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteTask(id: string, projectId: string) {
  const supabase = await createSupabaseServerClient();

  // Recupera cross-links prima di eliminare per invalidare le cache
  const { data: links } = await supabase
    .from("task_cross_projects")
    .select("project_id")
    .eq("task_id", id);

  // ON DELETE CASCADE rimuove automaticamente le righe in task_cross_projects
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);

  for (const l of links ?? []) revalidatePath(`/projects/${l.project_id}`);
  revalidatePath(`/projects/${projectId}`);
}

/**
 * Crea un task dalla home senza un progetto primario pre-impostato.
 * I project_ids vengono letti dal form: il primo diventa project_id (primario),
 * gli altri diventano link cross-funzionali.
 */
export async function createTaskFromHome(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const projectIds = formData.getAll("project_ids").map(String).filter(Boolean);
  if (projectIds.length === 0) return;

  const description = String(formData.get("description") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const priority = (String(formData.get("priority") ?? "medium") || "medium") as TaskPriority;
  const type = (String(formData.get("type") ?? "feature") || "feature") as TaskType;

  const [primaryProjectId, ...crossProjectIds] = projectIds;
  const isCross = crossProjectIds.length > 0;

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("tasks")
    .insert({ project_id: primaryProjectId, title, description, notes, priority, type, is_cross_functional: isCross })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  // Riga primaria nella junction
  const { error: jErr } = await supabase
    .from("task_cross_projects")
    .insert({ task_id: data.id, project_id: primaryProjectId, status: "todo" });
  if (jErr) throw new Error(jErr.message);

  // Righe cross-project
  if (crossProjectIds.length > 0) {
    const { error: cErr } = await supabase
      .from("task_cross_projects")
      .insert(crossProjectIds.map((pid) => ({ task_id: data.id, project_id: pid, status: "todo" })));
    if (cErr) throw new Error(cErr.message);
  }

  for (const pid of projectIds) revalidatePath(`/projects/${pid}`);
  revalidatePath("/");
}

// ----------------------------------------------------------------
// Backlog idee (nuovi progetti) — entità autonoma, scollegata dai task
// ----------------------------------------------------------------
export async function createProjectIdea(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const description = String(formData.get("description") ?? "").trim() || null;
  const priority = (String(formData.get("priority") ?? "medium") || "medium") as TaskPriority;
  const status = (String(formData.get("status") ?? "idea") || "idea") as IdeaStatus;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("project_ideas")
    .insert({ title, description, priority, status });

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function updateProjectIdea(id: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const description = String(formData.get("description") ?? "").trim() || null;
  const priority = (String(formData.get("priority") ?? "medium") || "medium") as TaskPriority;
  const status = (String(formData.get("status") ?? "idea") || "idea") as IdeaStatus;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("project_ideas")
    .update({ title, description, priority, status })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function setIdeaStatus(id: string, status: IdeaStatus) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("project_ideas")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function deleteProjectIdea(id: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("project_ideas").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

/**
 * Promuove un'idea a progetto reale: crea un nuovo project precompilato
 * (azione manuale ed esplicita, nessun legame automatico) e marca l'idea
 * come "promossa". L'idea resta nel backlog come memo storico.
 */
export async function promoteIdeaToProject(id: string) {
  const supabase = await createSupabaseServerClient();

  const { data: idea, error: readErr } = await supabase
    .from("project_ideas")
    .select("title, description")
    .eq("id", id)
    .maybeSingle();

  if (readErr) throw new Error(readErr.message);
  if (!idea) return;

  const { error: insErr } = await supabase
    .from("projects")
    .insert({ name: idea.title as string, description: (idea.description as string | null) ?? null });

  if (insErr) throw new Error(insErr.message);

  const { error: updErr } = await supabase
    .from("project_ideas")
    .update({ status: "promossa" })
    .eq("id", id);

  if (updErr) throw new Error(updErr.message);
  revalidatePath("/");
}

// ----------------------------------------------------------------
// Documentazione progetti (creazione/modifica manuale dalla UI)
// ----------------------------------------------------------------
export async function createDocument(projectId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const content = String(formData.get("content") ?? "");
  const format = (String(formData.get("format") ?? "markdown") ||
    "markdown") as DocumentFormat;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("project_documents").insert({
    project_id: projectId,
    title,
    slug: slugify(title),
    content,
    format,
    source: "manual",
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}

export async function updateDocument(
  id: string,
  projectId: string,
  formData: FormData
) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const content = String(formData.get("content") ?? "");
  const format = (String(formData.get("format") ?? "markdown") ||
    "markdown") as DocumentFormat;
  const is_completed = formData.get("is_completed") === "true";

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("project_documents")
    .update({ title, slug: slugify(title), content, format, is_completed })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}

export async function toggleDocumentCompleted(
  id: string,
  projectId: string,
  is_completed: boolean
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("project_documents")
    .update({ is_completed })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteDocument(id: string, projectId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("project_documents")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}
