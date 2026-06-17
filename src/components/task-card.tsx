"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Pencil,
  Trash2,
} from "lucide-react";

import { deleteTask, moveTask } from "@/lib/actions";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Task,
  type TaskStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TaskDialog } from "@/components/task-dialog";

const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "done"];

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  medium:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  high: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export function TaskCard({
  task,
  overlay = false,
}: {
  task: Task;
  overlay?: boolean;
}) {
  const [pending, setPending] = useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id, disabled: overlay });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const index = STATUS_ORDER.indexOf(task.status);
  const prev = index > 0 ? STATUS_ORDER[index - 1] : null;
  const next =
    index < STATUS_ORDER.length - 1 ? STATUS_ORDER[index + 1] : null;
  const priorityLabel =
    TASK_PRIORITIES.find((p) => p.value === task.priority)?.label ??
    task.priority;

  async function move(status: TaskStatus) {
    setPending(true);
    try {
      await moveTask(task.id, task.project_id, status);
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Eliminare il task "${task.title}"?`)) return;
    setPending(true);
    try {
      await deleteTask(task.id, task.project_id);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-3 space-y-2 transition-shadow",
        isDragging && "opacity-40",
        overlay && "shadow-xl rotate-1 opacity-95"
      )}
    >
      {/* header: grip + titolo + priorità */}
      <div className="flex items-start gap-1.5">
        {/* Drag handle — listeners solo qui, non sul resto della card */}
        {!overlay && (
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors focus-visible:outline-none"
            aria-label="Trascina task"
            tabIndex={-1}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}

        <div className="flex flex-1 items-start justify-between gap-2 min-w-0">
          <p
            className={cn(
              "text-sm font-medium leading-snug",
              task.status === "done" && "line-through text-muted-foreground"
            )}
          >
            {task.title}
          </p>
          <Badge
            variant="secondary"
            className={cn("shrink-0", PRIORITY_STYLES[task.priority])}
          >
            {priorityLabel}
          </Badge>
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap pl-5">
          {task.description}
        </p>
      )}

      {task.notes && (
        <p className="text-xs text-muted-foreground/80 border-l-2 pl-2 ml-5 line-clamp-2 whitespace-pre-wrap">
          {task.notes}
        </p>
      )}

      {/* azioni — visibili solo nella card reale, non nell'overlay */}
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
            <TaskDialog
              projectId={task.project_id}
              task={task}
              trigger={
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  aria-label="Modifica"
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
              aria-label="Elimina"
            >
              <Trash2 />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function statusLabel(status: TaskStatus): string {
  return TASK_STATUSES.find((s) => s.value === status)?.label ?? status;
}
