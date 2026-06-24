"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** Campo URL in sola lettura con pulsante "copia". */
function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="relative">
        <code className="block break-all rounded bg-muted px-2 py-1.5 pr-9 text-xs">
          {value}
        </code>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={copy}
          aria-label={`Copia ${label}`}
          className="absolute right-1 top-1 h-6 w-6"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}

/**
 * Pannello con la guida sintetica per configurare il login GitHub.
 * Precompila i due URL chiave con i valori reali (Supabase + dominio app).
 */
export function GithubSetupDialog({ trigger }: { trigger: React.ReactNode }) {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    // Origine nota solo nel browser: lettura una tantum dopo il mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseCallback = supabaseUrl
    ? `${supabaseUrl.replace(/\/$/, "")}/auth/v1/callback`
    : "https://<project-ref>.supabase.co/auth/v1/callback";
  const appCallback = `${origin || "https://<tuo-dominio>"}/auth/callback`;

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurazione login GitHub</DialogTitle>
          <DialogDescription>
            Setup una tantum per abilitare &quot;Accedi con GitHub&quot; e la
            creazione dei repository dai progetti.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">
              I tuoi URL (già compilati con i valori del progetto):
            </p>
            <CopyField
              label="Authorization callback URL (per la OAuth App di GitHub)"
              value={supabaseCallback}
            />
            <CopyField
              label="Redirect URL (per Supabase → URL Configuration)"
              value={appCallback}
            />
          </div>

          <ol className="list-decimal space-y-3 pl-5">
            <li>
              <span className="font-medium">Crea una OAuth App su GitHub</span> —
              Settings → Developer settings → OAuth Apps → New OAuth App.
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
                <li>
                  <span className="font-medium">Homepage URL</span>:{" "}
                  <code className="rounded bg-muted px-1">
                    {origin || "https://<tuo-dominio>"}
                  </code>
                </li>
                <li>
                  <span className="font-medium">Authorization callback URL</span>:
                  il 1° URL qui sopra (quello di Supabase).
                </li>
                <li>Registra, copia il Client ID e genera un Client Secret.</li>
              </ul>
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
                ⚠️ Serve una <span className="font-medium">OAuth App</span>, non una
                GitHub App.
              </p>
            </li>
            <li>
              <span className="font-medium">Configura Supabase</span> —
              Authentication → Providers → GitHub: abilita il provider e incolla
              Client ID e Secret.
            </li>
            <li>
              <span className="font-medium">Autorizza il redirect</span> —
              Authentication → URL Configuration → Redirect URLs: aggiungi il 2°
              URL qui sopra (e la versione{" "}
              <code className="rounded bg-muted px-1">http://localhost:3000/auth/callback</code>{" "}
              per lo sviluppo).
            </li>
            <li>
              <span className="font-medium">Esegui la migration</span>{" "}
              <code className="rounded bg-muted px-1">migration_github.sql</code> nel
              SQL Editor di Supabase.
            </li>
          </ol>

          <div className="space-y-1 rounded-lg border p-3">
            <p className="text-xs font-medium">Problemi?</p>
            <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
              <li>
                <code className="rounded bg-muted px-1">redirect_uri mismatch</code>{" "}
                → il callback della OAuth App non combacia con quello di Supabase.
              </li>
              <li>
                Atterri su{" "}
                <code className="rounded bg-muted px-1">/login?error=oauth</code> → manca
                il Redirect URL nei settaggi di Supabase.
              </li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">
            Guida completa con schema del flusso: sezione 5 del README.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
