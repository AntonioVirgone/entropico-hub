import { NextResponse, type NextRequest } from "next/server";

import { authenticateApiRequest, projectBelongsToUser } from "@/lib/api-auth";

/**
 * Lettura di un singolo documento per slug (contenuto completo incluso).
 * Pensata per gli agenti che consultano la doc di un progetto.
 *
 *   GET /api/projects/{projectId}/documents/{slug}
 *   Authorization: Bearer <token personale>
 */

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; slug: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  const { id: projectId, slug } = await params;
  const { supabase, userId } = auth;

  if (!(await projectBelongsToUser(supabase, projectId, userId))) {
    return json({ error: "Progetto non trovato." }, 404);
  }

  const { data, error } = await supabase
    .from("project_documents")
    .select("id, project_id, title, slug, content, format, source, is_completed, created_at, updated_at")
    .eq("project_id", projectId)
    .eq("slug", slug)
    .maybeSingle();

  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ error: "Documento non trovato." }, 404);

  return json({ document: data }, 200);
}
