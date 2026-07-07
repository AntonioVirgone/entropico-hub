import { type NextRequest, NextResponse } from "next/server";

import { authenticateApiRequest, projectBelongsToUser } from "@/lib/api-auth";

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

  const { data, error } = await supabase
    .from("epics")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return json({ error: error.message }, 500);

  return json({ data: data ?? [] });
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

  const { count } = await supabase
    .from("epics")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId);

  const { data, error } = await supabase
    .from("epics")
    .insert({
      project_id: projectId,
      title,
      description,
      status: "todo",
      position: count ?? 0,
    })
    .select("*")
    .single();

  if (error) return json({ error: error.message }, 500);

  return json({ data }, 201);
}
