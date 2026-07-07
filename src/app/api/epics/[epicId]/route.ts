import { type NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { authenticateApiRequest, projectBelongsToUser } from "@/lib/api-auth";
import type { EpicStatus } from "@/lib/types";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

async function resolveEpic(
  supabase: SupabaseClient,
  epicId: string,
  projectId: string,
  userId: string
) {
  if (!(await projectBelongsToUser(supabase, projectId, userId))) return null;

  const { data } = await supabase
    .from("epics")
    .select("id")
    .eq("id", epicId)
    .eq("project_id", projectId)
    .maybeSingle();

  return data;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ epicId: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  const { epicId } = await params;
  const { supabase, userId } = auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Body JSON non valido." }, 400);
  }

  const projectId = String(body.project_id ?? "").trim();
  if (!projectId) return json({ error: "Il campo 'project_id' è obbligatorio." }, 400);

  const epic = await resolveEpic(supabase, epicId, projectId, userId);
  if (!epic) return json({ error: "Epica non trovata." }, 404);

  const update: Record<string, unknown> = {};

  if (body.title !== undefined) {
    const title = String(body.title ?? "").trim();
    if (!title) return json({ error: "Il campo 'title' non può essere vuoto." }, 400);
    update.title = title;
  }

  if (body.description !== undefined) {
    update.description = typeof body.description === "string" ? body.description.trim() || null : null;
  }

  if (body.status !== undefined) {
    const STATUSES = ["todo", "in_progress", "test", "done"];
    if (!STATUSES.includes(String(body.status))) {
      return json({ error: "Il campo 'status' deve essere 'todo', 'in_progress', 'test' o 'done'." }, 400);
    }
    update.status = body.status as EpicStatus;
  }

  if (Object.keys(update).length === 0) {
    return json({ error: "Nessun campo da aggiornare." }, 400);
  }

  const { data, error } = await supabase
    .from("epics")
    .update(update)
    .eq("id", epicId)
    .select("*")
    .single();

  if (error) return json({ error: error.message }, 500);

  return json({ data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ epicId: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  const { epicId } = await params;
  const { supabase, userId } = auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Body JSON non valido." }, 400);
  }

  const projectId = String(body.project_id ?? "").trim();
  if (!projectId) return json({ error: "Il campo 'project_id' è obbligatorio." }, 400);

  const epic = await resolveEpic(supabase, epicId, projectId, userId);
  if (!epic) return json({ error: "Epica non trovata." }, 404);

  const { count } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("epic_id", epicId);

  if (count && count > 0) {
    return json(
      { error: `Questa epica contiene ${count} task. Spostali in un'altra epica o eliminali prima di procedere.` },
      409
    );
  }

  const { error } = await supabase.from("epics").delete().eq("id", epicId);
  if (error) return json({ error: error.message }, 500);

  return json({ data: { deleted: true } });
}
