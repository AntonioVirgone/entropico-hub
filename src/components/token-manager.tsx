"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound, Plus, Trash2, TriangleAlert } from "lucide-react";

import { createApiToken, deleteApiToken } from "@/lib/token-actions";
import type { ApiToken } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Riquadro che mostra il token in chiaro una sola volta, con copia. */
function NewTokenReveal({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Copia subito il token: per sicurezza non sarà più mostrato. Se lo perdi,
          revocalo e generane uno nuovo.
        </span>
      </div>
      <div className="relative">
        <pre className="overflow-x-auto rounded-md bg-muted px-3 py-2 pr-10 text-xs">
          {token}
        </pre>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={copy}
          aria-label="Copia token"
          className="absolute right-1.5 top-1.5 h-7 w-7"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}

function CreateTokenDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);

  function reset() {
    setNewToken(null);
    setError(null);
    setPending(false);
  }

  async function handleAction(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await createApiToken(formData);
    setPending(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setNewToken(result.token);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus /> Genera token
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {newToken ? "Token generato" : "Nuovo token API"}
          </DialogTitle>
          <DialogDescription>
            {newToken
              ? "Usa questo token come Bearer nelle chiamate API."
              : "Dai un nome al token per riconoscerlo (es. il dispositivo o l'agente che lo userà)."}
          </DialogDescription>
        </DialogHeader>

        {newToken ? (
          <div className="space-y-4">
            <NewTokenReveal token={newToken} />
            <DialogFooter>
              <Button type="button" onClick={() => setOpen(false)}>
                Ho copiato il token
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form action={handleAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                name="name"
                autoFocus
                maxLength={60}
                placeholder="Es. Claude — laptop"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Generazione…" : "Genera token"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TokenRow({ token }: { token: ApiToken }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        `Revocare il token "${token.name}"? Le chiamate che lo usano smetteranno di funzionare.`
      )
    )
      return;
    setPending(true);
    try {
      await deleteApiToken(token.id);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3">
      <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{token.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          <code>{token.token_prefix}…</code> · creato {formatDate(token.created_at)}
          {" · "}
          {token.last_used_at
            ? `ultimo uso ${formatDate(token.last_used_at)}`
            : "mai usato"}
        </p>
      </div>
      <Button
        size="icon"
        variant="ghost"
        onClick={handleDelete}
        disabled={pending}
        aria-label="Revoca token"
        className="shrink-0 text-destructive hover:text-destructive"
      >
        <Trash2 />
      </Button>
    </div>
  );
}

export function TokenManager({ tokens }: { tokens: ApiToken[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <CreateTokenDialog />
      </div>

      {tokens.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Nessun token. Generane uno per caricare e consultare la
            documentazione via API.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tokens.map((token) => (
            <TokenRow key={token.id} token={token} />
          ))}
        </div>
      )}
    </div>
  );
}
