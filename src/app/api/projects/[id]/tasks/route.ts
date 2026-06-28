import { type NextRequest, NextResponse } from "next/server";

import { authenticateApiRequest, projectBelongsToUser } from "@/lib/api-auth";
import type { TaskPriority, TaskStatus, TaskType } from "@/lib/types";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  const { id: projectId } = await params;
  const { supabase, userId } = auth;

  if (!(await projectBelongsToUser(supabase, projectId, userId))) {
    return json({ error: "Progetto non trovato." }, 404);
  }

  const statusFilter = request.nextUrl.searchParams.get("status") as TaskStatus | null;
  const priorityFilter = request.nextUrl.searchParams.get("priority") as TaskPriority | null;

  // 1. Leggi i link dalla junction per questo progetto
  let junctionQuery = supabase
    .from("task_cross_projects")
    .select("task_id, status")
    .eq("project_id", projectId);

  if (
    statusFilter === "todo" ||
    statusFilter === "in_progress" ||
    statusFilter === "test" ||
    statusFilter === "done"
  ) {
    junctionQuery = junctionQuery.eq("status", statusFilter);
  }

  const { data: links, error: e1 } = await junctionQuery;
  if (e1) return json({ error: e1.message }, 500);
  if (!links || links.length === 0) return json({ data: [] });

  const statusByTaskId = Object.fromEntries(
    links.map((l) => [l.task_id as string, l.status as TaskStatus])
  );
  const taskIds = Object.keys(statusByTaskId);

  // 2. Carica i task con i loro cross-project ids
  let tasksQuery = supabase
    .from("tasks")
    .select("*, task_cross_projects(project_id)")
    .in("id", taskIds)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (priorityFilter === "low" || priorityFilter === "medium" || priorityFilter === "high") {
    tasksQuery = tasksQuery.eq("priority", priorityFilter);
  }

  const { data: tasks, error: e2 } = await tasksQuery;
  if (e2) return json({ error: e2.message }, 500);

  // 3. Sostituisce lo status con quello specifico del progetto corrente
  const result = (tasks ?? []).map((t) => {
    const { task_cross_projects, ...rest } = t as Record<string, unknown> & {
      task_cross_projects: { project_id: string }[];
    };
    return {
      ...rest,
      status: statusByTaskId[rest.id as string],
      cross_project_ids: (task_cross_projects ?? []).map((cp) => cp.project_id),
    };
  });

  return json({ data: result });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  const { id: projectId } = await params;
  const { supabase, userId } = auth;

  if (!(await projectBelongsToUser(supabase, projectId, userId))) {
    return json({ error: "Progetto non trovato." }, 404);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Body JSON non valido." }, 400);
  }

  const title = String(body.title ?? "").trim();
  if (!title) return json({ error: "Il campo 'title' è obbligatorio." }, 400);

  const description = typeof body.description === "string" ? body.description.trim() || null : null;
  const notes = typeof body.notes === "string" ? body.notes.trim() || null : null;

  const PRIORITIES = ["low", "medium", "high"];
  const priority = PRIORITIES.includes(String(body.priority)) ? (body.priority as TaskPriority) : "medium";

  const TYPES = ["feature", "bug", "analysis"];
  const type = TYPES.includes(String(body.type)) ? (body.type as TaskType) : "feature";

  // 1. Crea il task
  const { data: task, error: e1 } = await supabase
    .from("tasks")
    .insert({ project_id: projectId, title, description, notes, priority, type, is_cross_functional: false })
    .select("id")
    .single();

  if (e1) return json({ error: e1.message }, 500);

  // 2. Inserisci riga nella junction con status 'todo'
  const { error: e2 } = await supabase
    .from("task_cross_projects")
    .insert({ task_id: task.id, project_id: projectId, status: "todo" });

  if (e2) return json({ error: e2.message }, 500);

  // 3. Leggi il task completo
  const { data: full, error: e3 } = await supabase
    .from("tasks")
    .select("*, task_cross_projects(project_id)")
    .eq("id", task.id)
    .single();

  if (e3) return json({ error: e3.message }, 500);

  const { task_cross_projects, ...rest } = full as Record<string, unknown> & {
    task_cross_projects: { project_id: string }[];
  };

  return json({
    data: {
      ...rest,
      status: "todo",
      cross_project_ids: (task_cross_projects ?? []).map((cp) => cp.project_id),
    },
  }, 201);
}
