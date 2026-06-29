"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { moveTask } from "@/lib/actions";
import { TASK_STATUSES, type Epic, type Project, type Task, type TaskStatus } from "@/lib/types";
import { KanbanColumn } from "@/components/kanban-column";
import { TaskCard } from "@/components/task-card";

export function KanbanBoard({
  projectId,
  tasks: initialTasks,
  allProjects = [],
  epics = [],
}: {
  projectId: string;
  tasks: Task[];
  allProjects?: Project[];
  epics?: Epic[];
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveTask(tasks.find((t) => t.id === event.active.id) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;

    const newStatus = over.id as TaskStatus;
    if (task.status === newStatus) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );

    startTransition(async () => {
      try {
        // Usa projectId della board corrente, non task.project_id:
        // per task cross-funzionali i due valori divergono e aggiornerebbe
        // la riga sbagliata nella junction table.
        await moveTask(task.id, projectId, newStatus);
        router.refresh();
      } catch {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id ? { ...t, status: task.status } : t
          )
        );
      }
    });
  }

  return (
    <DndContext
      id="kanban"
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {TASK_STATUSES.map((status) => (
          <KanbanColumn
            key={status.value}
            status={status}
            tasks={tasks.filter((t) => t.status === status.value)}
            allProjects={allProjects}
            projectId={projectId}
            epics={epics}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask && (
          <TaskCard
            task={activeTask}
            overlay
            allProjects={allProjects}
            projectId={projectId}
            epics={epics}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
