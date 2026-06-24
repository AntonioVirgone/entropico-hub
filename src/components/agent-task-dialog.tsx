"use client";

import { useState } from "react";
import { Check, Copy, GitBranch, TriangleAlert } from "lucide-react";

import { prepareAgentTask, type AgentTaskPlan } from "@/lib/agent-actions";
import type { TaskType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function CopyBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="relative">
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-muted px-3 py-2 pr-10 text-xs">
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

const INTRO: Record<TaskType, string> = {
  analysis:
    "Creo un branch docs/… sul repo e genero un prompt che fa produrre la documentazione all'agente.",
  feature:
    "Creo un branch feature/… sul repo e genero un prompt per implementare la feature.",
  bug: "Creo un branch fix/… sul repo e genero un prompt per correggere il bug.",
};

export function AgentTaskDialog({
  taskId,
  projectId,
  taskType,
  trigger,
}: {
  taskId: string;
  projectId: string;
  taskType: TaskType;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<AgentTaskPlan | null>(null);

  function reset() {
    setPlan(null);
    setError(null);
    setPending(false);
  }

  async function prepare() {
    setPending(true);
    setError(null);
    try {
      const result = await prepareAgentTask(taskId, projectId);
      setPlan(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore imprevisto.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agente AI — modalità assistita</DialogTitle>
          <DialogDescription>
            Preparo branch e prompt. Poi incolli il prompt in Claude Code (in
            locale, sotto il tuo abbonamento): nessun costo a consumo.
          </DialogDescription>
        </DialogHeader>

        {!plan ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{INTRO[taskType]}</p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="button" onClick={prepare} disabled={pending}>
              {pending ? "Preparazione…" : "Prepara branch e prompt"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {plan.warning && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{plan.warning}</span>
              </div>
            )}

            {plan.branch && (
              <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <GitBranch className="h-4 w-4 text-muted-foreground" />
                  Branch{" "}
                  <code className="rounded bg-muted px-1">{plan.branch}</code>
                  <span className="text-xs font-normal text-muted-foreground">
                    {plan.branchCreated ? "(creato)" : "(già esistente)"}
                  </span>
                </p>
                <CopyBlock code={`git fetch origin\ngit checkout ${plan.branch}`} />
              </div>
            )}

            <div className="space-y-1.5">
              <p className="text-sm font-medium">Prompt per Claude Code</p>
              <CopyBlock code={plan.prompt} />
            </div>

            {plan.repoUrl && (
              <a
                href={plan.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs text-muted-foreground underline"
              >
                Apri il repository
              </a>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
