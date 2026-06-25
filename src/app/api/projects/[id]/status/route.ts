import { type NextRequest, NextResponse } from "next/server";

import { authenticateApiRequest, projectBelongsToUser } from "@/lib/api-auth";
import type { ProjectStatus } from "@/lib/types";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
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

  const status = body.status as ProjectStatus;
  if (status !== "active" && status !== "archived") {
    return json({ error: "Il campo 'status' deve essere 'active' o 'archived'." }, 400);
  }

  const { data, error } = await supabase
    .from("projects")
    .update({ status })
    .eq("id", id)
    .select("id, status")
    .single();

  if (error) return json({ error: error.message }, 500);
  return json({ data });
}
