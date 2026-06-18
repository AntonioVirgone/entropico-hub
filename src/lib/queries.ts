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

type RawTask = Record<string, unknown> & {
  task_cross_projects: { project_id: string }[];
};

function rawToTask(r: RawTask): Task {
  const { task_cross_projects, ...rest } = r;
  return {
    ...(rest as Omit<Task, "cross_project_ids">),
    cross_project_ids: (task_cross_projects ?? []).map((cp) => cp.project_id),
  };
}

export async function getTasks(projectId: string): Promise<Task[]> {
  const supabase = getSupabase();

  // Task "posseduti" dal progetto
  const { data: owned, error: e1 } = await supabase
    .from("tasks")
    .select("*, task_cross_projects(project_id)")
    .eq("project_id", projectId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (e1) throw new Error(e1.message);

  // ID dei task cross-linked a questo progetto
  const { data: links, error: e2 } = await supabase
    .from("task_cross_projects")
    .select("task_id")
    .eq("project_id", projectId);

  if (e2) throw new Error(e2.message);

  const ownedIds = new Set((owned ?? []).map((t) => t.id as string));
  const crossIds = (links ?? [])
    .map((l) => l.task_id as string)
    .filter((id) => !ownedIds.has(id));

  let crossTasks: RawTask[] = [];
  if (crossIds.length > 0) {
    const { data, error: e3 } = await supabase
      .from("tasks")
      .select("*, task_cross_projects(project_id)")
      .in("id", crossIds);

    if (e3) throw new Error(e3.message);
    crossTasks = (data ?? []) as RawTask[];
  }

  return [...((owned ?? []) as RawTask[]), ...crossTasks].map(rawToTask);
}

export async function getTaskCounts(
  projectId: string
): Promise<{ total: number; done: number }> {
  const supabase = getSupabase();

  const { count: total } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId);

  const { count: done } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("status", "done");

  return { total: total ?? 0, done: done ?? 0 };
}
