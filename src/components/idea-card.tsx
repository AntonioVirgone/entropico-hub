"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Rocket, Trash2 } from "lucide-react";

import {
  deleteProjectIdea,
  promoteIdeaToProject,
  setIdeaStatus,
} from "@/lib/actions";
import {
  IDEA_STATUSES,
  TASK_PRIORITIES,
  type IdeaStatus,
  type ProjectIdea,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IdeaDialog } from "@/components/idea-dialog";
import { useConfirm } from "@/components/confirm-dialog";

const STATUS_STYLES: Record<IdeaStatus, string> = {
  idea: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  valutazione: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  approvata: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  promossa: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  scartata: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
};

const PRIORITY_LABELS: Record<string, string> = Object.fromEntries(
  TASK_PRIORITIES.map((p) => [p.value, p.label])
);

const STATUS_LABELS: Record<IdeaStatus, string> = Object.fromEntries(
  IDEA_STATUSES.map((s) => [s.value, s.label])
) as Record<IdeaStatus, string>;

export function IdeaCard({ idea }: { idea: ProjectIdea }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const { confirm, dialog } = useConfirm();
  const isPromoted = idea.status === "promossa";

  async function handleStatusChange(status: IdeaStatus) {
    if (status === idea.status) return;
    setPending(true);
    try {
      await setIdeaStatus(idea.id, status);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handlePromote() {
    const ok = await confirm({
      title: "Promuovi a progetto",
      description: `Promuovere l'idea "${idea.title}" a progetto? Verrà creato un nuovo progetto precompilato (nessun collegamento automatico).`,
      confirmLabel: "Promuovi",
    });
    if (!ok) return;
    setPending(true);
    try {
      await promoteIdeaToProject(idea.id);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: "Elimina idea",
      description: `Eliminare l'idea "${idea.title}"? L'azione è irreversibile.`,
      confirmLabel: "Elimina",
      variant: "destructive",
    });
    if (!ok) return;
    setPending(true);
    try {
      await deleteProjectIdea(idea.id);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
    {dialog}
    <Card className="flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="truncate">{idea.title}</CardTitle>
          <Badge variant="secondary" className={STATUS_STYLES[idea.status]}>
            {STATUS_LABELS[idea.status] ?? idea.status}
          </Badge>
        </div>
        {idea.description && (
          <CardDescription className="line-clamp-3">
            {idea.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        <p className="text-xs text-muted-foreground">
          Priorità: {PRIORITY_LABELS[idea.priority] ?? idea.priority}
        </p>
        <Select
          value={idea.status}
          onValueChange={(v) => handleStatusChange(v as IdeaStatus)}
          disabled={pending}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {IDEA_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2">
        <Button
          size="sm"
          onClick={handlePromote}
          disabled={pending || isPromoted}
        >
          <Rocket />
          {isPromoted ? "Promossa" : "Promuovi a progetto"}
        </Button>
        <div className="flex items-center gap-1">
          <IdeaDialog
            idea={idea}
            trigger={
              <Button size="icon" variant="ghost" aria-label="Modifica">
                <Pencil />
              </Button>
            }
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={handleDelete}
            disabled={pending}
            aria-label="Elimina"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 />
          </Button>
        </div>
      </CardFooter>
    </Card>
    </>
  );
}
