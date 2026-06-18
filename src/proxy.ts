import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16: "Proxy" sostituisce "Middleware" (stessa funzionalità).
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Esegui su tutte le rotte tranne:
     * - api (protette dalla loro chiave)
     * - asset statici di Next
     * - file immagine
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
