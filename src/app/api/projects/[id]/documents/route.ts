import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { authenticateApiRequest, projectBelongsToUser } from "@/lib/api-auth";
import { slugify } from "@/lib/utils";
import { DOCUMENT_MAX_CONTENT, type DocumentFormat } from "@/lib/types";

/**
 * API documentazione progetti.
 *
 * Pensata per agenti esterni (es. Claude) che caricano o consultano la doc di
 * un progetto. Autenticata con un TOKEN PERSONALE (header Bearer) generato
 * dall'utente in /token: ogni operazione è limitata ai progetti di quell'utente.
 * Scrive/legge con service role (bypassa l'RLS) DOPO aver verificato il token
 * e l'ownership del progetto.
 *
 *   POST /api/projects/{projectId}/documents
 *   Authorization: Bearer <token personale>
 *   { "title": "...", "content": "...", "format": "markdown", "upsert": true }
 *
 *   GET  /api/projects/{projectId}/documents            → elenco (senza contenuto)
 *   GET  /api/projects/{projectId}/documents?include=content  → elenco con contenuto
 */

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  const { id: projectId } = await params;
  const { supabase, userId } = auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Body JSON non valido." }, 400);
  }

  const title = String(body.title ?? "").trim();
  if (!title) return json({ error: "Campo 'title' obbligatorio." }, 400);

  const content = typeof body.content === "string" ? body.content : "";
  if (content.length > DOCUMENT_MAX_CONTENT) {
    return json(
      { error: `Contenuto troppo grande (max ${DOCUMENT_MAX_CONTENT} caratteri).` },
      400
    );
  }

  const format: DocumentFormat = body.format === "text" ? "text" : "markdown";
  const slug = slugify(String(body.slug ?? "").trim() || title);
  if (!slug) return json({ error: "Slug/titolo non valido." }, 400);
  const upsert = body.upsert === true;

  // Il progetto deve esistere ED essere dell'utente del token.
  if (!(await projectBelongsToUser(supabase, projectId, userId))) {
    return json({ error: "Progetto non trovato." }, 404);
  }

  // Upsert atomico su (project_id, slug) grazie all'indice univoco.
  if (upsert) {
    const { data, error } = await supabase
      .from("project_documents")
      .upsert(
        { project_id: projectId, title, slug, content, format, source: "api" },
        { onConflict: "project_id,slug" }
      )
      .select("id, project_id, title, slug, format, source, updated_at")
      .single();

    if (error) return json({ error: error.message }, 500);
    revalidatePath(`/projects/${projectId}`);
    return json({ document: data }, 200);
  }

  const { data, error } = await supabase
    .from("project_documents")
    .insert({ project_id: projectId, title, slug, content, format, source: "api" })
    .select("id, project_id, title, slug, format, source, updated_at")
    .single();

  if (error) return json({ error: error.message }, 500);
  revalidatePath(`/projects/${projectId}`);
  return json({ document: data, created: true }, 201);
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

  const withContent = request.nextUrl.searchParams.get("include") === "content";
  const columns = withContent
    ? "id, title, slug, content, format, source, created_at, updated_at"
    : "id, title, slug, format, source, created_at, updated_at";

  const { data, error } = await supabase
    .from("project_documents")
    .select(columns)
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });

  if (error) return json({ error: error.message }, 500);
  return json({ documents: data ?? [] }, 200);
}
