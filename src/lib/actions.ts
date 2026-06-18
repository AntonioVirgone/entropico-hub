"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSupabase } from "@/lib/supabase";
import type { ProjectStatus, TaskPriority, TaskStatus } from "@/lib/types";

// ----------------------------------------------------------------
// Projects
// ----------------------------------------------------------------
export async function createProject(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const description = String(formData.get("description") ?? "").trim() || null;
  const color = String(formData.get("color") ?? "#3b82f6");

  const { error } = await getSupabase()
    .from("projects")
    .insert({ name, description, color });

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function updateProject(id: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const description = String(formData.get("description") ?? "").trim() || null;
  const color = String(formData.get("color") ?? "#3b82f6");

  const { error } = await getSupabase()
    .from("projects")
    .update({ name, description, color })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath(`/projects/${id}`);
}

export async function setProjectStatus(id: string, status: ProjectStatus) {
  const { error } = await getSupabase()
    .from("projects")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath(`/projects/${id}`);
}

export async function deleteProject(id: string) {
  const { error } = await getSupabase().from("projects").delete().eq("id", id);
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
  const supabase = getSupabase();

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
  const isCross = formData.get("is_cross_functional") === "true";
  const crossProjectIds = parseCrossProjectIds(formData, projectId);

  // 1. Crea il task (senza status — lo status vive nella junction)
  const { data, error } = await getSupabase()
    .from("tasks")
    .insert({ project_id: projectId, title, description, notes, priority, is_cross_functional: isCross })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  // 2. Inserisci la riga principale nella junction (progetto corrente, status 'todo')
  const { error: jErr } = await getSupabase()
    .from("task_cross_projects")
    .insert({ task_id: data.id, project_id: projectId, status: "todo" });

  if (jErr) throw new Error(jErr.message);

  // 3. Aggiungi i link cross-project selezionati
  if (crossProjectIds.length > 0) {
    const { error: cErr } = await getSupabase().from("task_cross_projects").insert(
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
  const isCross = formData.get("is_cross_functional") === "true";
  const crossProjectIds = parseCrossProjectIds(formData, projectId);

  // Aggiorna i campi del task (NON lo status — quello è nella junction)
  const { error } = await getSupabase()
    .from("tasks")
    .update({ title, description, notes, priority, is_cross_functional: isCross })
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
  const { error } = await getSupabase()
    .from("task_cross_projects")
    .update({ status })
    .eq("task_id", id)
    .eq("project_id", projectId);

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteTask(id: string, projectId: string) {
  // Recupera cross-links prima di eliminare per invalidare le cache
  const { data: links } = await getSupabase()
    .from("task_cross_projects")
    .select("project_id")
    .eq("task_id", id);

  // ON DELETE CASCADE rimuove automaticamente le righe in task_cross_projects
  const { error } = await getSupabase().from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);

  for (const l of links ?? []) revalidatePath(`/projects/${l.project_id}`);
  revalidatePath(`/projects/${projectId}`);
}
