"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ApiUploadHint({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Origine nota solo nel browser: lettura una tantum dopo il mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

  const endpoint = `${origin || "https://<tuo-dominio>"}/api/projects/${projectId}/documents`;

  const snippet = `curl -X POST "${endpoint}" \\
  -H "Authorization: Bearer $DOCS_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Titolo del documento",
    "content": "# Contenuto in markdown...",
    "format": "markdown",
    "upsert": true
  }'`;

  async function copy() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-lg border bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium"
      >
        <Terminal className="h-4 w-4 text-muted-foreground" />
        Carica documenti via API
        <span className="ml-auto text-xs text-muted-foreground">
          {open ? "Nascondi" : "Mostra"}
        </span>
      </button>

      {open && (
        <div className="space-y-3 border-t px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Passa questo comando a Claude (o a qualsiasi client) per caricare la
            documentazione già assegnata a questo progetto. La chiave
            <code className="mx-1 rounded bg-muted px-1">DOCS_API_KEY</code>
            è il segreto configurato nelle variabili d&apos;ambiente.
            Con <code className="rounded bg-muted px-1">upsert: true</code> un
            documento con lo stesso titolo viene sovrascritto.
          </p>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Project ID
            </p>
            <code className="block break-all rounded bg-muted px-2 py-1 text-xs">
              {projectId}
            </code>
          </div>
          <div className="relative">
            <pre className="overflow-x-auto rounded-md bg-muted px-3 py-2 text-xs">
              {snippet}
            </pre>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={copy}
              aria-label="Copia comando"
              className="absolute right-1.5 top-1.5 h-7 w-7"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
