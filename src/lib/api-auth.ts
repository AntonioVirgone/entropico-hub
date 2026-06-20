import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { extractBearerToken, hashApiToken } from "@/lib/api-token";

/**
 * Autenticazione delle Route API tramite token personale (Bearer).
 *
 * Il token è risolto via service role (bypassa l'RLS) ricalcolandone l'hash
 * SHA-256 e cercandolo in `api_tokens`. Da lì si ricava lo user_id, con cui
 * tutte le operazioni vengono limitate ai progetti di quell'utente.
 */

export type ApiAuth =
  | { ok: true; userId: string; supabase: SupabaseClient }
  | { ok: false; response: NextResponse };

function fail(message: string, status: number): { ok: false; response: NextResponse } {
  return { ok: false, response: NextResponse.json({ error: message }, { status }) };
}

export async function authenticateApiRequest(request: NextRequest): Promise<ApiAuth> {
  const token = extractBearerToken(request.headers.get("authorization"));
  if (!token) return fail("Non autorizzato.", 401);

  let supabase: SupabaseClient;
  try {
    supabase = createSupabaseServiceClient();
  } catch {
    return fail("API non configurata (service role mancante).", 503);
  }

  const { data, error } = await supabase
    .from("api_tokens")
    .select("id, user_id")
    .eq("token_hash", hashApiToken(token))
    .maybeSingle();

  if (error) return fail(error.message, 500);
  if (!data) return fail("Non autorizzato.", 401);

  // Traccia l'ultimo utilizzo (best effort: un errore non blocca la richiesta).
  await supabase
    .from("api_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return { ok: true, userId: data.user_id as string, supabase };
}

/** Verifica che il progetto esista e appartenga all'utente del token. */
export async function projectBelongsToUser(
  supabase: SupabaseClient,
  projectId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", userId)
    .maybeSingle();
  return !!data;
}
