"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Share2 } from "lucide-react";

import type { HighPriorityTask } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Quanti task mostrare in linea nella home prima di nascondere il resto. */
const VISIBLE_LIMIT = 5;

const STATUS_LABELS: Record<string, string> = {
  todo: "Da fare",
  in_progress: "In corso",
  test: "Test",
};

const STATUS_STYLES: Record<string, string> = {
  todo: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  test: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Tabella presentazionale: rende l'elenco di task ricevuto, senza limiti. */
function HighPriorityTable({ tasks }: { tasks: HighPriorityTask[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Task
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Progetto
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Stato
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Creato il
            </th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {tasks.map((t) => (
            <tr
              key={`${t.taskId}-${t.projectId}`}
              className="bg-background hover:bg-muted/30 transition-colors"
            >
              <td className="px-4 py-3">
                <span className="flex items-center gap-1.5 font-medium">
                  {t.title}
                  {t.is_cross_functional && (
                    <Share2
                      className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                      aria-label="Cross-funzionale"
                    />
                  )}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: t.projectColor }}
                  />
                  {t.projectName}
                </span>
              </td>
              <td className="px-4 py-3">
                <Badge variant="secondary" className={STATUS_STYLES[t.status]}>
                  {STATUS_LABELS[t.status] ?? t.status}
                </Badge>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDate(t.created_at)}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/projects/${t.projectId}`}
                  className="inline-flex items-center gap-1 text-sm font-medium underline-offset-2 hover:underline"
                >
                  Apri board <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function HighPriorityTasks({ tasks }: { tasks: HighPriorityTask[] }) {
  const [open, setOpen] = useState(false);

  if (tasks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nessun task ad alta priorità in sospeso.
      </p>
    );
  }

  const visible = tasks.slice(0, VISIBLE_LIMIT);
  const hiddenCount = tasks.length - visible.length;

  return (
    <div className="space-y-3">
      <HighPriorityTable tasks={visible} />

      {hiddenCount > 0 && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            Mostra altro ({hiddenCount})
          </Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-4xl flex-col">
          <DialogHeader>
            <DialogTitle>Task ad alta priorità</DialogTitle>
            <DialogDescription>
              Tutti i {tasks.length} task con priorità alta non ancora
              completati.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto pr-1">
            <HighPriorityTable tasks={tasks} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
