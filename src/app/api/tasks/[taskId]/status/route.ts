import { type NextRequest, NextResponse } from "next/server";

import { authenticateApiRequest, projectBelongsToUser } from "@/lib/api-auth";
import type { TaskStatus } from "@/lib/types";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
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

  const STATUSES = ["todo", "in_progress", "done"];
  const taskStatus = body.status as TaskStatus;
  if (!STATUSES.includes(taskStatus)) {
    return json({ error: "Il campo 'status' deve essere 'todo', 'in_progress' o 'done'." }, 400);
  }

  if (!(await projectBelongsToUser(supabase, projectId, userId))) {
    return json({ error: "Progetto non trovato." }, 404);
  }

  // Verifica che il task esista nel progetto (via junction)
  const { data: link } = await supabase
    .from("task_cross_projects")
    .select("task_id")
    .eq("task_id", taskId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!link) return json({ error: "Task non trovato." }, 404);

  const { error } = await supabase
    .from("task_cross_projects")
    .update({ status: taskStatus })
    .eq("task_id", taskId)
    .eq("project_id", projectId);

  if (error) return json({ error: error.message }, 500);

  return json({ data: { id: taskId, project_id: projectId, status: taskStatus } });
}
