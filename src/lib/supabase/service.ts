import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase con service role key: BYPASSA l'RLS.
 * Usare ESCLUSIVAMENTE in contesti server fidati e già autorizzati
 * (es. l'API di upload documentazione dopo la verifica della DOCS_API_KEY).
 * Non importare mai in codice che gira nel browser.
 */
export function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Service role non configurato. Imposta NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nelle variabili d'ambiente (solo lato server)."
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
