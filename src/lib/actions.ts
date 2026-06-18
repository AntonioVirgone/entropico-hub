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

async function syncCrossProjects(
  taskId: string,
  primaryProjectId: string,
  crossProjectIds: string[]
) {
  const supabase = getSupabase();

  // Rimuove tutti i link esistenti e li ricrea
  await supabase.from("task_cross_projects").delete().eq("task_id", taskId);

  if (crossProjectIds.length === 0) return;

  const rows = crossProjectIds.map((pid) => ({
    task_id: taskId,
    project_id: pid,
  }));

  const { error } = await supabase.from("task_cross_projects").insert(rows);
  if (error) throw new Error(error.message);
}

export async function createTask(projectId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const description = String(formData.get("description") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const priority = (String(formData.get("priority") ?? "medium") || "medium") as TaskPriority;
  const isCross = formData.get("is_cross_functional") === "true";
  const crossProjectIds = parseCrossProjectIds(formData, projectId);

  const { data, error } = await getSupabase()
    .from("tasks")
    .insert({ project_id: projectId, title, description, notes, priority, status: "todo", is_cross_functional: isCross })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  if (crossProjectIds.length > 0) {
    await syncCrossProjects(data.id, projectId, crossProjectIds);
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

  const { error } = await getSupabase()
    .from("tasks")
    .update({ title, description, notes, priority, is_cross_functional: isCross })
    .eq("id", id);

  if (error) throw new Error(error.message);

  // Recupera i vecchi cross-links per invalidare le cache dei progetti rimossi
  const { data: oldLinks } = await getSupabase()
    .from("task_cross_projects")
    .select("project_id")
    .eq("task_id", id);

  const oldIds = (oldLinks ?? []).map((l) => l.project_id as string);

  await syncCrossProjects(id, projectId, crossProjectIds);

  const allAffected = new Set([...oldIds, ...crossProjectIds]);
  for (const pid of allAffected) revalidatePath(`/projects/${pid}`);

  revalidatePath(`/projects/${projectId}`);
}

export async function moveTask(
  id: string,
  projectId: string,
  status: TaskStatus
) {
  const { error } = await getSupabase()
    .from("tasks")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(error.message);

  // Invalida anche i progetti cross-linked
  const { data: links } = await getSupabase()
    .from("task_cross_projects")
    .select("project_id")
    .eq("task_id", id);

  for (const l of links ?? []) revalidatePath(`/projects/${l.project_id}`);
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteTask(id: string, projectId: string) {
  // Recupera cross-links prima di eliminare (ON DELETE CASCADE rimuoverà le righe)
  const { data: links } = await getSupabase()
    .from("task_cross_projects")
    .select("project_id")
    .eq("task_id", id);

  const { error } = await getSupabase().from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);

  for (const l of links ?? []) revalidatePath(`/projects/${l.project_id}`);
  revalidatePath(`/projects/${projectId}`);
}
