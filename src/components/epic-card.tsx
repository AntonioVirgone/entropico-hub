"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Pencil,
  Trash2,
} from "lucide-react";

import { deleteEpic, moveEpic } from "@/lib/actions";
import { TASK_STATUSES, type EpicWithCounts, type TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EpicDialog } from "@/components/epic-dialog";
import { useConfirm } from "@/components/confirm-dialog";

const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "test", "done"];

export function EpicCard({
  epic,
  projectId,
  overlay = false,
}: {
  epic: EpicWithCounts;
  projectId: string;
  overlay?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const { confirm, dialog } = useConfirm();

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: epic.id, disabled: overlay });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const index = STATUS_ORDER.indexOf(epic.status);
  const prev = index > 0 ? STATUS_ORDER[index - 1] : null;
  const next = index < STATUS_ORDER.length - 1 ? STATUS_ORDER[index + 1] : null;

  const percent =
    epic.total > 0 ? Math.round((epic.done / epic.total) * 100) : 0;

  async function move(status: TaskStatus) {
    setPending(true);
    try {
      await moveEpic(epic.id, projectId, status);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: "Elimina epica",
      description: `Eliminare l'epica "${epic.title}"?`,
      confirmLabel: "Elimina",
      variant: "destructive",
    });
    if (!ok) return;
    setPending(true);
    try {
      const result = await deleteEpic(epic.id, projectId);
      if (!result.ok) {
        await confirm({
          title: "Impossibile eliminare",
          description: result.error ?? "Errore imprevisto.",
          confirmLabel: "Ok",
          showCancel: false,
        });
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        className={cn(
          "p-3 space-y-2 hover:shadow-md",
          isDragging && "opacity-40",
          overlay && "shadow-xl rotate-1 opacity-95"
        )}
      >
        {/* Header: grip + titolo */}
        <div className="flex items-start gap-1.5">
          {!overlay && (
            <button
              {...attributes}
              {...listeners}
              className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors focus-visible:outline-none"
              aria-label="Trascina epica"
              tabIndex={-1}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}

          <div className="flex flex-1 items-start justify-between gap-2 min-w-0">
            <Link
              href={`/projects/${projectId}/epics/${epic.id}`}
              className="text-sm font-semibold leading-snug hover:underline underline-offset-2"
            >
              {epic.title}
            </Link>
            <Link
              href={`/projects/${projectId}/epics/${epic.id}`}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Apri board"
            >
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {epic.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap pl-5">
            {epic.description}
          </p>
        )}

        {/* Barra di avanzamento */}
        <div className="pl-5 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {epic.done}/{epic.total} task completati
            </span>
            <span>{percent}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                percent === 100 ? "bg-emerald-500" : "bg-primary/70"
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Azioni */}
        {!overlay && (
          <div className="flex items-center justify-between pt-1 pl-5">
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                disabled={pending || !prev}
                onClick={() => prev && move(prev)}
                aria-label="Sposta indietro"
                title={prev ? `→ ${statusLabel(prev)}` : undefined}
              >
                <ChevronLeft />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                disabled={pending || !next}
                onClick={() => next && move(next)}
                aria-label="Sposta avanti"
                title={next ? `→ ${statusLabel(next)}` : undefined}
              >
                <ChevronRight />
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <EpicDialog
                projectId={projectId}
                epic={epic}
                trigger={
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label="Modifica epica"
                  >
                    <Pencil />
                  </Button>
                }
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive"
                disabled={pending}
                onClick={handleDelete}
                aria-label="Elimina epica"
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        )}
      </Card>
      {dialog}
    </>
  );
}

function statusLabel(status: TaskStatus): string {
  return TASK_STATUSES.find((s) => s.value === status)?.label ?? status;
}
