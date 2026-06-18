import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { slugify } from "@/lib/utils";
import { DOCUMENT_MAX_CONTENT, type DocumentFormat } from "@/lib/types";

/**
 * API documentazione progetti.
 *
 * Pensata per agenti esterni (es. Claude) che caricano la doc generata,
 * già assegnata a un progetto. Protetta da DOCS_API_KEY (header Bearer).
 * Scrive con service role (bypassa RLS) DOPO la verifica della chiave.
 *
 *   POST /api/projects/{projectId}/documents
 *   Authorization: Bearer <DOCS_API_KEY>
 *   { "title": "...", "content": "...", "format": "markdown", "upsert": true }
 */

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Verifica la DOCS_API_KEY. Ritorna null se ok, altrimenti la response d'errore. */
function checkApiKey(request: NextRequest): NextResponse | null {
  const apiKey = process.env.DOCS_API_KEY;
  if (!apiKey) {
    return json(
      { error: "API documentazione non configurata (DOCS_API_KEY mancante)." },
      503
    );
  }
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !safeEqual(token, apiKey)) {
    return json({ error: "Non autorizzato." }, 401);
  }
  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const keyError = checkApiKey(request);
  if (keyError) return keyError;

  const { id: projectId } = await params;

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
  const slug = String(body.slug ?? "").trim() || slugify(title);
  const upsert = body.upsert === true;

  const supabase = createSupabaseServiceClient();

  // Il progetto deve esistere (e ci dà conferma a quale utente appartiene la doc)
  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();

  if (projErr) return json({ error: projErr.message }, 500);
  if (!project) return json({ error: "Progetto non trovato." }, 404);

  // Upsert manuale per (project_id, slug): aggiorna se esiste, altrimenti crea
  if (upsert) {
    const { data: existing } = await supabase
      .from("project_documents")
      .select("id")
      .eq("project_id", projectId)
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from("project_documents")
        .update({ title, content, format, source: "api" })
        .eq("id", existing.id)
        .select("id, project_id, title, slug, format, source, updated_at")
        .single();

      if (error) return json({ error: error.message }, 500);
      revalidatePath(`/projects/${projectId}`);
      return json({ document: data, updated: true }, 200);
    }
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
  const keyError = checkApiKey(request);
  if (keyError) return keyError;

  const { id: projectId } = await params;
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("project_documents")
    .select("id, title, slug, format, source, created_at, updated_at")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });

  if (error) return json({ error: error.message }, 500);
  return json({ documents: data ?? [] }, 200);
}
