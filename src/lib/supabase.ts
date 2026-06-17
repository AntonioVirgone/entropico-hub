import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Client Supabase condiviso (anon key), creato in modo lazy.
 * In questa v1 senza autenticazione viene usato lato server
 * (Server Components / Server Actions). Le policy RLS sono permissive:
 * vedi supabase/schema.sql.
 *
 * La creazione è lazy così la build non fallisce se le variabili
 * d'ambiente non sono ancora impostate: l'errore compare solo a runtime,
 * quando si esegue davvero una query.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Variabili d'ambiente Supabase mancanti. Imposta NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (o nelle Environment Variables di Vercel)."
    );
  }

  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
  return client;
}
