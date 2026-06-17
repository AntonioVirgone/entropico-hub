"use client";

import { useState, useTransition } from "react";
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
import { TASK_STATUSES, type Task, type TaskStatus } from "@/lib/types";
import { KanbanColumn } from "@/components/kanban-column";
import { TaskCard } from "@/components/task-card";

export function KanbanBoard({ tasks: initialTasks }: { tasks: Task[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [, startTransition] = useTransition();

  // Richiede uno spostamento di 8px prima di avviare il drag,
  // così i click su pulsanti e link non vengono intercettati.
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

    // Optimistic update immediato
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );

    // Persiste su Supabase; in caso di errore rollback
    startTransition(async () => {
      try {
        await moveTask(task.id, task.project_id, newStatus);
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
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {TASK_STATUSES.map((status) => (
          <KanbanColumn
            key={status.value}
            status={status}
            tasks={tasks.filter((t) => t.status === status.value)}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask && <TaskCard task={activeTask} overlay />}
      </DragOverlay>
    </DndContext>
  );
}
