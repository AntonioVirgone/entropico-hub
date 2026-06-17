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
export async function createTask(projectId: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const description = String(formData.get("description") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const priority = (String(formData.get("priority") ?? "medium") ||
    "medium") as TaskPriority;

  const { error } = await getSupabase().from("tasks").insert({
    project_id: projectId,
    title,
    description,
    notes,
    priority,
    status: "todo",
  });

  if (error) throw new Error(error.message);
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
  const priority = (String(formData.get("priority") ?? "medium") ||
    "medium") as TaskPriority;

  const { error } = await getSupabase()
    .from("tasks")
    .update({ title, description, notes, priority })
    .eq("id", id);

  if (error) throw new Error(error.message);
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
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteTask(id: string, projectId: string) {
  const { error } = await getSupabase().from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}
