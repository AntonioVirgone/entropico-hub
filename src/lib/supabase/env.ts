/**
 * Variabili d'ambiente Supabase, condivise tra client browser e server.
 * Accetta sia la nuova "publishable key" (sb_publishable_…) sia la legacy "anon key".
 */
export function getSupabaseEnv(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Variabili d'ambiente Supabase mancanti. Imposta NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (o NEXT_PUBLIC_SUPABASE_ANON_KEY) in .env.local (o nelle Environment Variables di Vercel)."
    );
  }

  return { url, key };
}
