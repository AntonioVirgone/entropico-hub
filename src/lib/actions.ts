"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createUserRepo, createRepoFile, getRepo, parseGithubRepoInput, GithubError } from "@/lib/github";
import { buildEntropicoGitignore, buildEntropicoInstructions } from "@/lib/entropico-scaffold";
import { slugify } from "@/lib/utils";
import type {
  DocumentFormat,
  EpicStatus,
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

  // Difesa anti-duplicazione: se in locale arrivano più submit ravvicinati
  // (doppio click prima che la UI si disabiliti), un progetto con lo stesso
  // nome appena creato viene considerato lo stesso. Evitiamo sia il record
  // duplicato sia un secondo tentativo di creazione del repo GitHub.
  const since = new Date(Date.now() - 10_000).toISOString();
  const { data: recent } = await supabase
    .from("projects")
    .select("id")
    .eq("name", name)
    .gte("created_at", since)
    .limit(1)
    .maybeSingle();

  if (recent) {
    return { githubError: null };
  }

  const { data: project, error } = await supabase
    .from("projects")
    .insert({ name, description, color, framework, language, technologies, tools })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/");

  const githubAction = String(formData.get("github_action") ?? "");

  if (githubAction === "create") {
    const githubError = await createGithubRepoForProject(supabase, project.id, {
      name,
      description,
      repoName: String(formData.get("github_repo_name") ?? "").trim(),
      isPrivate: formData.get("github_visibility") !== "public",
    });
    return { githubError };
  }

  if (githubAction === "link") {
    const repoInput = String(formData.get("github_repo_url_input") ?? "").trim();
    const githubError = await saveRepoLink(supabase, project.id, repoInput);
    return { githubError };
  }

  return { githubError: null };
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

    const scaffoldError = await scaffoldEntropicoFiles(
      cred.access_token,
      repo.full_name,
      { projectId, projectName: opts.name }
    );

    revalidatePath("/");
    revalidatePath(`/projects/${projectId}`);

    if (scaffoldError) {
      return `Repository creato (${repo.html_url}) ma la cartella entropico/ non è stata scritta correttamente: ${scaffoldError}`;
    }
    return null;
  } catch (e) {
    if (e instanceof GithubError) return `GitHub: ${e.message}`;
    return "Errore imprevisto nella creazione del repository GitHub.";
  }
}

/**
 * Scrive nel repo appena creato la cartella `entropico/` (token e project id
 * vuoti + istruzioni) e un `.gitignore` che li esclude, così l'agente che
 * lavorerà sul progetto ha subito tutto il necessario per usare le API di
 * Entropico. Non bloccante: un errore qui non invalida il repo già creato.
 */
async function scaffoldEntropicoFiles(
  accessToken: string,
  repoFullName: string,
  project: { projectId: string; projectName: string }
): Promise<string | null> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? null;
    const instructions = buildEntropicoInstructions({
      projectId: project.projectId,
      projectName: project.projectName,
      appUrl,
    });

    await createRepoFile(
      accessToken,
      repoFullName,
      ".gitignore",
      buildEntropicoGitignore(),
      "chore: aggiungi .gitignore per i file entropico"
    );
    await createRepoFile(
      accessToken,
      repoFullName,
      "entropico/api-token",
      "",
      "chore: aggiungi entropico/api-token (vuoto)"
    );
    await createRepoFile(
      accessToken,
      repoFullName,
      "entropico/project-id",
      "",
      "chore: aggiungi entropico/project-id (vuoto)"
    );
    await createRepoFile(
      accessToken,
      repoFullName,
      "entropico/istruzioni.md",
      instructions,
      "docs: istruzioni per le API Entropico"
    );
    return null;
  } catch (e) {
    if (e instanceof GithubError) return e.message;
    return "errore imprevisto nella scrittura dei file.";
  }
}

/**
 * Valida un URL/nome repository GitHub e salva il collegamento al progetto.
 * Ritorna un messaggio d'errore (stringa) o null.
 */
async function saveRepoLink(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  projectId: string,
  repoInput: string
): Promise<string | null> {
  const fullName = parseGithubRepoInput(repoInput);
  if (!fullName)
    return "URL non valido. Usa il formato https://github.com/owner/repo.";

  const { data: cred } = await supabase
    .from("github_credentials")
    .select("access_token")
    .maybeSingle();
  if (!cred?.access_token) return "GitHub non collegato.";

  try {
    const repo = await getRepo(cred.access_token, fullName);
    const { error: updErr } = await supabase
      .from("projects")
      .update({ github_repo_url: repo.html_url, github_repo_full_name: repo.full_name })
      .eq("id", projectId);
    if (updErr) return updErr.message;
    revalidatePath("/");
    revalidatePath(`/projects/${projectId}`);
    return null;
  } catch (e) {
    if (e instanceof GithubError) return `GitHub: ${e.message}`;
    return "Errore imprevisto durante il collegamento.";
  }
}

/** Collega un repository GitHub esistente a un progetto già creato. */
export async function linkExistingRepo(
  projectId: string,
  repoInput: string
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const error = await saveRepoLink(supabase, projectId, repoInput);
  return { error };
}

/** Crea un repository GitHub per un progetto già esistente. */
export async function createGithubRepo(
  projectId: string,
  opts: { name: string; description: string | null; repoName: string; isPrivate: boolean }
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const error = await createGithubRepoForProject(supabase, projectId, opts);
  return { error };
}

/** Rimuove il collegamento GitHub da un progetto. */
export async function unlinkRepo(projectId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("projects")
    .update({ github_repo_url: null, github_repo_full_name: null })
    .eq("id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
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
// Epiche
// ----------------------------------------------------------------

export async function createEpic(
  projectId: string,
  formData: FormData
): Promise<TaskActionResult> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: true };

  const description = String(formData.get("description") ?? "").trim() || null;

  const supabase = await createSupabaseServerClient();

  const { count } = await supabase
    .from("epics")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId);

  const { error } = await supabase.from("epics").insert({
    project_id: projectId,
    title,
    description,
    status: "todo",
    position: count ?? 0,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function updateEpic(
  id: string,
  projectId: string,
  formData: FormData
): Promise<TaskActionResult> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: true };

  const description = String(formData.get("description") ?? "").trim() || null;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("epics")
    .update({ title, description })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/epics/${id}`);
  return { ok: true };
}

export async function moveEpic(
  id: string,
  projectId: string,
  status: EpicStatus
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("epics")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteEpic(
  id: string,
  projectId: string
): Promise<TaskActionResult> {
  const supabase = await createSupabaseServerClient();

  const { count } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("epic_id", id);

  if (count && count > 0) {
    return {
      ok: false,
      error: `Questa epica contiene ${count} task. Spostali in un'altra epica o eliminali prima di procedere.`,
    };
  }

  const { error } = await supabase.from("epics").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

/**
 * Trova l'epica generica del progetto (marcata `is_generic`) o la crea se
 * manca. Usata come destinazione automatica per i task creati senza epica
 * assegnata (es. dall'API pubblica), così non restano orfani con `epic_id`
 * null e invisibili ai conteggi delle epiche.
 */
export async function ensureGenericEpic(
  supabase: SupabaseClient,
  projectId: string
): Promise<string> {
  const { data: existing } = await supabase
    .from("epics")
    .select("id")
    .eq("project_id", projectId)
    .eq("is_generic", true)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { count } = await supabase
    .from("epics")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId);

  const { data: created, error } = await supabase
    .from("epics")
    .insert({
      project_id: projectId,
      title: "Generica",
      status: "todo",
      position: count ?? 0,
      is_generic: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return created.id as string;
}

/**
 * Sposta in blocco tutti i task del progetto rimasti senza epica (epic_id
 * null) nell'epica generica, creandola al bisogno. Azione richiamata dal
 * bottone "Sistema task senza epica" vicino a "Nuova epica".
 */
export async function migrateOrphanTasksToGenericEpic(
  projectId: string
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();

  const genericEpicId = await ensureGenericEpic(supabase, projectId);

  const { data, error } = await supabase
    .from("tasks")
    .update({ epic_id: genericEpicId })
    .eq("project_id", projectId)
    .is("epic_id", null)
    .select("id");

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/projects/${projectId}`);
  return { ok: true, count: data?.length ?? 0 };
}

// ----------------------------------------------------------------
// Tasks
// ----------------------------------------------------------------

/** Esito di una mutazione di task: evita di lasciar propagare l'errore al client (crash). */
export type TaskActionResult = { ok: true } | { ok: false; error: string };

/**
 * Traduce gli errori del DB in messaggi azionabili per l'operatore.
 * In particolare la violazione del CHECK sul tipo task indica che la migration
 * che abilita il tipo "analysis" non è ancora stata applicata al database.
 */
function friendlyTaskError(message: string): string {
  if (message.includes("tasks_type_check")) {
    return "Questo tipo di task non è abilitato nel database. Applica la migration supabase/migration_task_type_analysis.sql nel SQL Editor di Supabase.";
  }
  return message;
}

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

export async function createTask(
  projectId: string,
  formData: FormData
): Promise<TaskActionResult> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: true };

  const description = String(formData.get("description") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const priority = (String(formData.get("priority") ?? "medium") || "medium") as TaskPriority;
  const type = (String(formData.get("type") ?? "feature") || "feature") as TaskType;
  const isCross = formData.get("is_cross_functional") === "true";
  const crossProjectIds = parseCrossProjectIds(formData, projectId);
  const rawEpicId = String(formData.get("epic_id") ?? "").trim() || null;

  const supabase = await createSupabaseServerClient();

  // Nessuna epica scelta: finisce nell'epica generica invece di restare orfano.
  const epicId = rawEpicId ?? (await ensureGenericEpic(supabase, projectId));

  // 1. Crea il task (senza status — lo status vive nella junction)
  const { data, error } = await supabase
    .from("tasks")
    .insert({ project_id: projectId, title, description, notes, priority, type, is_cross_functional: isCross, epic_id: epicId })
    .select("id")
    .single();

  if (error) return { ok: false, error: friendlyTaskError(error.message) };

  // 2. Inserisci la riga principale nella junction (progetto corrente, status 'todo')
  const { error: jErr } = await supabase
    .from("task_cross_projects")
    .insert({ task_id: data.id, project_id: projectId, status: "todo" });

  if (jErr) return { ok: false, error: friendlyTaskError(jErr.message) };

  // 3. Aggiungi i link cross-project selezionati
  if (crossProjectIds.length > 0) {
    const { error: cErr } = await supabase.from("task_cross_projects").insert(
      crossProjectIds.map((pid) => ({ task_id: data.id, project_id: pid, status: "todo" }))
    );
    if (cErr) return { ok: false, error: friendlyTaskError(cErr.message) };
    for (const pid of crossProjectIds) revalidatePath(`/projects/${pid}`);
  }

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function updateTask(
  id: string,
  projectId: string,
  formData: FormData
): Promise<TaskActionResult> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: true };

  const description = String(formData.get("description") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const priority = (String(formData.get("priority") ?? "medium") || "medium") as TaskPriority;
  const type = (String(formData.get("type") ?? "feature") || "feature") as TaskType;
  const isCross = formData.get("is_cross_functional") === "true";
  const crossProjectIds = parseCrossProjectIds(formData, projectId);
  const rawEpicId = String(formData.get("epic_id") ?? "").trim();
  const epicUpdate = rawEpicId ? { epic_id: rawEpicId } : {};

  // Aggiorna i campi del task (NON lo status — quello è nella junction)
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tasks")
    .update({ title, description, notes, priority, type, is_cross_functional: isCross, ...epicUpdate })
    .eq("id", id);

  if (error) return { ok: false, error: friendlyTaskError(error.message) };

  // Sincronizza i link cross-project preservando gli status esistenti
  const { added, removed } = await syncCrossProjects(id, projectId, crossProjectIds);

  const allAffected = new Set([...added, ...removed]);
  for (const pid of allAffected) revalidatePath(`/projects/${pid}`);

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
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
export async function createTaskFromHome(
  formData: FormData
): Promise<TaskActionResult> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: true };

  const projectIds = formData.getAll("project_ids").map(String).filter(Boolean);
  if (projectIds.length === 0) return { ok: true };

  const description = String(formData.get("description") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const priority = (String(formData.get("priority") ?? "medium") || "medium") as TaskPriority;
  const type = (String(formData.get("type") ?? "feature") || "feature") as TaskType;

  const [primaryProjectId, ...crossProjectIds] = projectIds;
  const isCross = crossProjectIds.length > 0;

  const supabase = await createSupabaseServerClient();

  // Auto-assegna alla prima epica del progetto primario (se esiste)
  const { data: firstEpic } = await supabase
    .from("epics")
    .select("id")
    .eq("project_id", primaryProjectId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const epicId = firstEpic?.id ?? (await ensureGenericEpic(supabase, primaryProjectId));

  const { data, error } = await supabase
    .from("tasks")
    .insert({ project_id: primaryProjectId, title, description, notes, priority, type, is_cross_functional: isCross, epic_id: epicId })
    .select("id")
    .single();

  if (error) return { ok: false, error: friendlyTaskError(error.message) };

  // Riga primaria nella junction
  const { error: jErr } = await supabase
    .from("task_cross_projects")
    .insert({ task_id: data.id, project_id: primaryProjectId, status: "todo" });
  if (jErr) return { ok: false, error: friendlyTaskError(jErr.message) };

  // Righe cross-project
  if (crossProjectIds.length > 0) {
    const { error: cErr } = await supabase
      .from("task_cross_projects")
      .insert(crossProjectIds.map((pid) => ({ task_id: data.id, project_id: pid, status: "todo" })));
    if (cErr) return { ok: false, error: friendlyTaskError(cErr.message) };
  }

  for (const pid of projectIds) revalidatePath(`/projects/${pid}`);
  revalidatePath("/");
  return { ok: true };
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
