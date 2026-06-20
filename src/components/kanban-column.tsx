"use client";

import { useDroppable } from "@dnd-kit/core";
import { Inbox } from "lucide-react";

import { cn } from "@/lib/utils";
import { TASK_STATUSES, type Project, type Task, type TaskStatus } from "@/lib/types";
import { TaskCard } from "@/components/task-card";

const STATUS_DOT: Record<TaskStatus, string> = {
  todo: "bg-slate-400",
  in_progress: "bg-blue-500",
  done: "bg-emerald-500",
};

export function KanbanColumn({
  status,
  tasks,
  allProjects = [],
  projectId,
}: {
  status: (typeof TASK_STATUSES)[number];
  tasks: Task[];
  allProjects?: Project[];
  projectId: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status.value });

  return (
    <div
      className={cn(
        "rounded-xl bg-muted/40 p-3 flex flex-col transition-all duration-150",
        isOver && "bg-primary/[0.06] ring-2 ring-primary/30 ring-inset"
      )}
    >
      <div className="flex items-center justify-between px-1 pb-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <span
            className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_DOT[status.value])}
          />
          {status.label}
        </h2>
        <span className="text-xs text-muted-foreground rounded-full bg-background px-2 py-0.5 shadow-sm">
          {tasks.length}
        </span>
      </div>

      <div ref={setNodeRef} className="flex-1 space-y-2 min-h-[80px]">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-1 py-6 text-center">
            <Inbox className="h-5 w-5 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">
              Trascina qui un task
            </p>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              allProjects={allProjects}
              projectId={projectId}
            />
          ))
        )}
      </div>
    </div>
  );
}
