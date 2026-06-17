import { TASK_STATUSES, type Task } from "@/lib/types";
import { TaskCard } from "@/components/task-card";

export function KanbanBoard({ tasks }: { tasks: Task[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {TASK_STATUSES.map((status) => {
        const columnTasks = tasks.filter((t) => t.status === status.value);
        return (
          <div
            key={status.value}
            className="rounded-xl bg-muted/40 p-3 flex flex-col"
          >
            <div className="flex items-center justify-between px-1 pb-3">
              <h2 className="text-sm font-semibold">{status.label}</h2>
              <span className="text-xs text-muted-foreground rounded-full bg-background px-2 py-0.5">
                {columnTasks.length}
              </span>
            </div>
            <div className="space-y-2 min-h-[60px]">
              {columnTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground px-1 py-4 text-center">
                  Nessun task
                </p>
              ) : (
                columnTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
