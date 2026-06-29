"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Bot,
  Bug,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  GripVertical,
  Pencil,
  Share2,
  Sparkles,
  Trash2,
} from "lucide-react";

import { deleteTask, moveTask } from "@/lib/actions";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Epic,
  type Project,
  type Task,
  type TaskStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TaskDialog } from "@/components/task-dialog";
import { AgentTaskDialog } from "@/components/agent-task-dialog";
import { useConfirm } from "@/components/confirm-dialog";

const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "test", "done"];

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  medium:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  high: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export function TaskCard({
  task,
  overlay = false,
  allProjects = [],
  projectId,
  epics = [],
}: {
  task: Task;
  overlay?: boolean;
  allProjects?: Project[];
  projectId?: string;
  epics?: Epic[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const { confirm, dialog } = useConfirm();
  // Per task cross-funzionali task.project_id è il progetto primario,
  // che può differire dalla board corrente. Usiamo sempre il projectId
  // della board, cadendo su task.project_id solo nell'overlay DnD.
  const currentProjectId = projectId ?? task.project_id;

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
      await moveTask(task.id, currentProjectId, status);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: "Elimina task",
      description: `Eliminare il task "${task.title}"?`,
      confirmLabel: "Elimina",
      variant: "destructive",
    });
    if (!ok) return;
    setPending(true);
    try {
      await deleteTask(task.id, currentProjectId);
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

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm font-medium leading-snug",
              task.status === "done" && "line-through text-muted-foreground"
            )}
          >
            {task.title}
          </p>
          <div className="flex flex-wrap items-center gap-1 mt-1.5">
            {/* Badge tipo del task */}
            {task.type === "bug" ? (
              <Badge
                variant="secondary"
                className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 gap-1"
              >
                <Bug className="h-3 w-3" /> Bug
              </Badge>
            ) : task.type === "analysis" ? (
              <Badge
                variant="secondary"
                className="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 gap-1"
              >
                <FileSearch className="h-3 w-3" /> Analisi
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 gap-1"
              >
                <Sparkles className="h-3 w-3" /> Feature
              </Badge>
            )}
            <Badge
              variant="secondary"
              className={cn(PRIORITY_STYLES[task.priority])}
            >
              {priorityLabel}
            </Badge>
          </div>
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

      {/* badge cross-funzionale con elenco progetti collegati */}
      {task.is_cross_functional && task.cross_project_ids.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 pl-5">
          <Share2 className="h-3 w-3 text-muted-foreground shrink-0" />
          {task.cross_project_ids.map((pid) => {
            const p = allProjects.find((x) => x.id === pid);
            if (!p) return null;
            return (
              <span
                key={pid}
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                {p.name}
              </span>
            );
          })}
        </div>
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
            <AgentTaskDialog
              taskId={task.id}
              projectId={currentProjectId}
              taskType={task.type}
              trigger={
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  aria-label="Agente AI"
                  title="Agente AI"
                >
                  <Bot />
                </Button>
              }
            />
            <TaskDialog
              projectId={currentProjectId}
              task={task}
              allProjects={allProjects}
              epics={epics}
              epicId={task.epic_id ?? undefined}
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
    {dialog}
  </>
  );
}

function statusLabel(status: TaskStatus): string {
  return TASK_STATUSES.find((s) => s.value === status)?.label ?? status;
}
