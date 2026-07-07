import { type NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { authenticateApiRequest, projectBelongsToUser } from "@/lib/api-auth";
import type { TaskPriority, TaskType } from "@/lib/types";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

async function resolveTask(supabase: SupabaseClient, taskId: string, projectId: string, userId: string) {
  if (!(await projectBelongsToUser(supabase, projectId, userId))) return null;

  const { data } = await supabase
    .from("tasks")
    .select("id, project_id")
    .eq("id", taskId)
    .maybeSingle();

  if (!data) return null;

  // Verifica che il task sia visibile nel progetto richiesto (via junction)
  const { data: link } = await supabase
    .from("task_cross_projects")
    .select("task_id")
    .eq("task_id", taskId)
    .eq("project_id", projectId)
    .maybeSingle();

  return link ? data : null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  const { taskId } = await params;
  const { supabase, userId } = auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Body JSON non valido." }, 400);
  }

  const projectId = String(body.project_id ?? "").trim();
  if (!projectId) return json({ error: "Il campo 'project_id' è obbligatorio." }, 400);

  const task = await resolveTask(supabase, taskId, projectId, userId);
  if (!task) return json({ error: "Task non trovato." }, 404);

  const title = String(body.title ?? "").trim();
  if (!title) return json({ error: "Il campo 'title' è obbligatorio." }, 400);

  const description = typeof body.description === "string" ? body.description.trim() || null : null;
  const notes = typeof body.notes === "string" ? body.notes.trim() || null : null;

  const PRIORITIES = ["low", "medium", "high"];
  const priority = PRIORITIES.includes(String(body.priority)) ? (body.priority as TaskPriority) : "medium";

  const TYPES = ["feature", "bug", "analysis"];
  const type = TYPES.includes(String(body.type)) ? (body.type as TaskType) : "feature";

  const update: Record<string, unknown> = { title, description, notes, priority, type };

  // epic_id è opzionale: se presente, deve appartenere allo stesso progetto.
  if (typeof body.epic_id === "string" && body.epic_id.trim()) {
    const rawEpicId = body.epic_id.trim();
    const { data: epic } = await supabase
      .from("epics")
      .select("id")
      .eq("id", rawEpicId)
      .eq("project_id", projectId)
      .maybeSingle();
    if (!epic) return json({ error: "'epic_id' non valido per questo progetto." }, 400);
    update.epic_id = rawEpicId;
  }

  const { error } = await supabase
    .from("tasks")
    .update(update)
    .eq("id", taskId);

  if (error) return json({ error: error.message }, 500);

  // Leggi il task aggiornato con status del progetto corrente
  const { data: updated } = await supabase
    .from("tasks")
    .select("*, task_cross_projects(project_id)")
    .eq("id", taskId)
    .single();

  const { data: link } = await supabase
    .from("task_cross_projects")
    .select("status")
    .eq("task_id", taskId)
    .eq("project_id", projectId)
    .single();

  const { task_cross_projects, ...rest } = updated as Record<string, unknown> & {
    task_cross_projects: { project_id: string }[];
  };

  return json({
    data: {
      ...rest,
      status: link?.status ?? "todo",
      cross_project_ids: (task_cross_projects ?? []).map((cp) => cp.project_id),
    },
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  const { taskId } = await params;
  const { supabase, userId } = auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Body JSON non valido." }, 400);
  }

  const projectId = String(body.project_id ?? "").trim();
  if (!projectId) return json({ error: "Il campo 'project_id' è obbligatorio." }, 400);

  const task = await resolveTask(supabase, taskId, projectId, userId);
  if (!task) return json({ error: "Task non trovato." }, 404);

  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) return json({ error: error.message }, 500);

  return json({ data: { deleted: true } });
}
