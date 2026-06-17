import { getSupabase } from "@/lib/supabase";
import type { Project, Task } from "@/lib/types";

export async function getProjects(): Promise<Project[]> {
  const { data, error } = await getSupabase()
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Project[];
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await getSupabase()
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Project) ?? null;
}

export async function getTasks(projectId: string): Promise<Task[]> {
  const { data, error } = await getSupabase()
    .from("tasks")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Task[];
}

export async function getTaskCounts(
  projectId: string
): Promise<{ total: number; done: number }> {
  const { count: total } = await getSupabase()
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId);

  const { count: done } = await getSupabase()
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("status", "done");

  return { total: total ?? 0, done: done ?? 0 };
}
