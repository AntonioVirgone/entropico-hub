import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseEnv } from "./env";

/**
 * Client Supabase per richiesta, legato alla sessione utente via cookie.
 * Le query girano come l'utente loggato → l'RLS applica l'isolamento per-utente.
 * Da usare in Server Components, Server Actions e Route Handlers.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, key } = getSupabaseEnv();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Chiamato da un Server Component: la scrittura cookie è ignorabile,
          // il refresh della sessione avviene nel proxy.
        }
      },
    },
  });
}
