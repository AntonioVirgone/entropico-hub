import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "./env";

/** Client Supabase lato browser (per il flusso di login). */
export function createSupabaseBrowserClient() {
  const { url, key } = getSupabaseEnv();
  return createBrowserClient(url, key);
}
