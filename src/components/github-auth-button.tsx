"use client";

import { useState } from "react";
import { GitBranch } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

/**
 * Avvia il login/collegamento OAuth con GitHub. Richiede lo scope `repo` per
 * poter creare repository (anche privati) per conto dell'utente. Al ritorno
 * passa da /auth/callback, che salva il token, poi torna su `next`.
 */
export function GithubAuthButton({
  label = "Accedi con GitHub",
  next = "/",
  variant = "outline",
  className,
}: {
  label?: string;
  next?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  className?: string;
}) {
  const [pending, setPending] = useState(false);

  async function signIn() {
    setPending(true);
    const supabase = createSupabaseBrowserClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { scopes: "repo", redirectTo },
    });
    if (error) setPending(false); // in caso di successo avviene il redirect
  }

  return (
    <Button
      type="button"
      variant={variant}
      onClick={signIn}
      disabled={pending}
      className={className}
    >
      <GitBranch /> {pending ? "Reindirizzamento…" : label}
    </Button>
  );
}
