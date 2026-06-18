import { getSupabase } from "@/lib/supabase";
import type { HighPriorityTask, Project, Task, TaskStatus } from "@/lib/types";

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
  const supabase = getSupabase();

  // 1. Leggi tutti i link (task_id, status) per questo progetto dalla junction
  const { data: links, error: e1 } = await supabase
    .from("task_cross_projects")
    .select("task_id, status")
    .eq("project_id", projectId);

  if (e1) throw new Error(e1.message);
  if (!links || links.length === 0) return [];

  const statusByTaskId = Object.fromEntries(
    links.map((l) => [l.task_id as string, l.status as TaskStatus])
  );
  const taskIds = Object.keys(statusByTaskId);

  // 2. Carica i dati completi dei task + tutti i loro link cross-project
  const { data: tasks, error: e2 } = await supabase
    .from("tasks")
    .select("*, task_cross_projects(project_id)")
    .in("id", taskIds)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (e2) throw new Error(e2.message);

  // 3. Sovrascrive tasks.status con lo status specifico di questo progetto
  return (tasks ?? []).map((t) => {
    const { task_cross_projects, ...rest } = t as Record<string, unknown> & {
      task_cross_projects: { project_id: string }[];
    };
    return {
      ...(rest as Omit<Task, "status" | "cross_project_ids">),
      status: statusByTaskId[rest.id as string],
      cross_project_ids: (task_cross_projects ?? []).map((cp) => cp.project_id),
    } as Task;
  });
}

export async function getTaskCounts(
  projectId: string
): Promise<{ total: number; done: number }> {
  const supabase = getSupabase();

  // Conta dalla junction: include i task cross-linked
  const { count: total } = await supabase
    .from("task_cross_projects")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId);

  const { count: done } = await supabase
    .from("task_cross_projects")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("status", "done");

  return { total: total ?? 0, done: done ?? 0 };
}

/**
 * Restituisce tutte le coppie (task, progetto) con priorità alta
 * il cui status non è "done", ordinate per data di creazione (più vecchi prima).
 * Per task cross-funzionali può restituire più righe (una per progetto).
 */
export async function getHighPriorityActiveTasks(): Promise<HighPriorityTask[]> {
  const supabase = getSupabase();

  // 1. Task ad alta priorità
  const { data: tasks, error: e1 } = await supabase
    .from("tasks")
    .select("id, title, created_at, is_cross_functional")
    .eq("priority", "high");

  if (e1) throw new Error(e1.message);
  if (!tasks || tasks.length === 0) return [];

  const taskIds = tasks.map((t) => t.id as string);

  // 2. Link nella junction con status non "done"
  const { data: links, error: e2 } = await supabase
    .from("task_cross_projects")
    .select("task_id, project_id, status")
    .in("task_id", taskIds)
    .neq("status", "done");

  if (e2) throw new Error(e2.message);
  if (!links || links.length === 0) return [];

  // 3. Progetti coinvolti (solo attivi)
  const projectIds = [...new Set(links.map((l) => l.project_id as string))];
  const { data: projects, error: e3 } = await supabase
    .from("projects")
    .select("id, name, color, status")
    .in("id", projectIds)
    .eq("status", "active");

  if (e3) throw new Error(e3.message);

  const projectById = Object.fromEntries(
    (projects ?? []).map((p) => [p.id as string, p])
  );
  const taskById = Object.fromEntries(
    tasks.map((t) => [t.id as string, t])
  );

  return links
    .map((link) => {
      const task = taskById[link.task_id as string];
      const project = projectById[link.project_id as string];
      if (!task || !project) return null;
      return {
        taskId: link.task_id as string,
        title: task.title as string,
        created_at: task.created_at as string,
        is_cross_functional: task.is_cross_functional as boolean,
        status: link.status as TaskStatus,
        projectId: link.project_id as string,
        projectName: project.name as string,
        projectColor: project.color as string,
      };
    })
    .filter((item): item is HighPriorityTask => item !== null)
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
}
