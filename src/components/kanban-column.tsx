"use client";

import { useDroppable } from "@dnd-kit/core";

import { cn } from "@/lib/utils";
import { TASK_STATUSES, type Task } from "@/lib/types";
import { TaskCard } from "@/components/task-card";

export function KanbanColumn({
  status,
  tasks,
}: {
  status: (typeof TASK_STATUSES)[number];
  tasks: Task[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status.value });

  return (
    <div
      className={cn(
        "rounded-xl bg-muted/40 p-3 flex flex-col transition-colors duration-150",
        isOver && "bg-primary/5 ring-2 ring-primary/30"
      )}
    >
      <div className="flex items-center justify-between px-1 pb-3">
        <h2 className="text-sm font-semibold">{status.label}</h2>
        <span className="text-xs text-muted-foreground rounded-full bg-background px-2 py-0.5">
          {tasks.length}
        </span>
      </div>

      <div ref={setNodeRef} className="flex-1 space-y-2 min-h-[80px]">
        {tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1 py-4 text-center">
            Trascina qui un task
          </p>
        ) : (
          tasks.map((task) => <TaskCard key={task.id} task={task} />)
        )}
      </div>
    </div>
  );
}
