"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/** Blocco di codice con pulsante "copia". */
function CopyBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-md bg-muted px-3 py-2 pr-10 text-xs">
        {code}
      </pre>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={copy}
        aria-label="Copia"
        className="absolute right-1.5 top-1.5 h-7 w-7"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

export function ApiUploadHint({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    // Origine nota solo nel browser: lettura una tantum dopo il mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

  const base = `${origin || "https://<tuo-dominio>"}/api/projects/${projectId}/documents`;

  const uploadSnippet = `curl -X POST "${base}" \\
  -H "Authorization: Bearer $EH_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Titolo del documento",
    "content": "# Contenuto in markdown...",
    "format": "markdown",
    "upsert": true
  }'`;

  const bulkSnippet = `# Carica tutti i .md della cartella corrente (titolo = primo # H1 o nome file)
for f in *.md; do
  title=$(grep -m1 '^# ' "$f" | sed 's/^# //')
  [ -z "$title" ] && title="\${f%.md}"
  jq -n --arg t "$title" --arg c "$(cat "$f")" \\
    '{title:$t, content:$c, format:"markdown", upsert:true}' \\
  | curl -sS -X POST "${base}" \\
      -H "Authorization: Bearer $EH_TOKEN" \\
      -H "Content-Type: application/json" -d @-
  echo " -> $f"
done`;

  const readSnippet = `# Elenco documenti del progetto
curl -s "${base}" -H "Authorization: Bearer $EH_TOKEN"

# Contenuto completo di un documento (per slug)
curl -s "${base}/<slug>" -H "Authorization: Bearer $EH_TOKEN"`;

  return (
    <div className="rounded-lg border bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium"
      >
        <Terminal className="h-4 w-4 text-muted-foreground" />
        Carica e consulta i documenti via API
        <span className="ml-auto text-xs text-muted-foreground">
          {open ? "Nascondi" : "Mostra"}
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Genera un token personale in{" "}
            <Link href="/token" className="font-medium underline">
              Token API
            </Link>{" "}
            ed esportalo come <code className="rounded bg-muted px-1">EH_TOKEN</code>{" "}
            (<code className="rounded bg-muted px-1">export EH_TOKEN=eh_…</code>). Vale
            solo per i tuoi progetti. Con{" "}
            <code className="rounded bg-muted px-1">upsert: true</code> un documento con
            lo stesso slug/titolo viene sovrascritto.
          </p>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Project ID</p>
            <code className="block break-all rounded bg-muted px-2 py-1 text-xs">
              {projectId}
            </code>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Carica un documento
            </p>
            <CopyBlock code={uploadSnippet} />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Carica tutti i .md (richiede jq)
            </p>
            <CopyBlock code={bulkSnippet} />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Consulta i documenti
            </p>
            <CopyBlock code={readSnippet} />
          </div>
        </div>
      )}
    </div>
  );
}
