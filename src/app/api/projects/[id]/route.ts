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

  const { id } = await params;
  const { supabase, userId } = auth;

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("owner_id", userId)
    .maybeSingle();

  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ error: "Progetto non trovato." }, 404);

  return json({ data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { supabase, userId } = auth;

  if (!(await projectBelongsToUser(supabase, id, userId))) {
    return json({ error: "Progetto non trovato." }, 404);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Body JSON non valido." }, 400);
  }

  const allowed = ["name", "description", "color", "framework", "language", "technologies", "tools"];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key] ?? null;
  }

  if (typeof body.technologies !== "undefined" && !Array.isArray(body.technologies)) {
    return json({ error: "Il campo 'technologies' deve essere un array." }, 400);
  }
  if (typeof body.tools !== "undefined" && !Array.isArray(body.tools)) {
    return json({ error: "Il campo 'tools' deve essere un array." }, 400);
  }

  if (Object.keys(patch).length === 0) {
    return json({ error: "Nessun campo aggiornabile nel body." }, 400);
  }

  if ("name" in patch && !String(patch.name ?? "").trim()) {
    return json({ error: "Il campo 'name' non può essere vuoto." }, 400);
  }

  const { data, error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return json({ error: error.message }, 500);
  return json({ data });
}
