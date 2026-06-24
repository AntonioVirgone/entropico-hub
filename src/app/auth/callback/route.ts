import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Callback OAuth (es. GitHub): scambia il `code` per una sessione e, se
 * presente, cattura il provider_token GitHub salvandolo per l'utente — è
 * l'unico momento in cui Supabase lo espone. Serve poi per creare repo.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  // Cattura e salva il token GitHub (se questo login è passato da GitHub).
  const session = data.session;
  const providerToken = session?.provider_token;
  if (providerToken && session?.user) {
    const githubLogin =
      (session.user.user_metadata?.user_name as string | undefined) ??
      (session.user.user_metadata?.preferred_username as string | undefined) ??
      null;

    // Upsert sulla PK user_id (default auth.uid()); RLS limita alla propria riga.
    await supabase.from("github_credentials").upsert(
      {
        user_id: session.user.id,
        github_login: githubLogin,
        access_token: providerToken,
        scopes: "repo",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
