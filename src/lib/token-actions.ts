"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateApiToken } from "@/lib/api-token";

/**
 * Crea un token API per l'utente loggato e restituisce il valore in CHIARO,
 * mostrato una sola volta dalla UI. In DB finiscono solo prefisso e hash.
 *
 * Lo user_id viene popolato dal default `auth.uid()` (vedi migration) e l'RLS
 * garantisce che ogni utente crei e veda solo i propri token.
 */
export async function createApiToken(
  formData: FormData
): Promise<{ token: string } | { error: string }> {
  const name = String(formData.get("name") ?? "").trim().slice(0, 60) || "Token";
  const { token, prefix, hash } = generateApiToken();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("api_tokens")
    .insert({ name, token_prefix: prefix, token_hash: hash });

  if (error) return { error: error.message };

  revalidatePath("/token");
  return { token };
}

/** Revoca (elimina) un token dell'utente loggato. L'RLS impedisce di toccare altrui. */
export async function deleteApiToken(id: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("api_tokens").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/token");
}
