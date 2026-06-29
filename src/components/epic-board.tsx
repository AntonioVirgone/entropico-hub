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

import { moveEpic } from "@/lib/actions";
import { TASK_STATUSES, type EpicWithCounts, type TaskStatus } from "@/lib/types";
import { EpicCard } from "@/components/epic-card";
import { EpicColumn } from "@/components/epic-column";

export function EpicBoard({
  projectId,
  epics: initialEpics,
}: {
  projectId: string;
  epics: EpicWithCounts[];
}) {
  const router = useRouter();
  const [epics, setEpics] = useState(initialEpics);
  const [activeEpic, setActiveEpic] = useState<EpicWithCounts | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setEpics(initialEpics);
  }, [initialEpics]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveEpic(epics.find((e) => e.id === event.active.id) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveEpic(null);
    if (!over) return;

    const epic = epics.find((e) => e.id === active.id);
    if (!epic) return;

    const newStatus = over.id as TaskStatus;
    if (epic.status === newStatus) return;

    setEpics((prev) =>
      prev.map((e) => (e.id === epic.id ? { ...e, status: newStatus } : e))
    );

    startTransition(async () => {
      try {
        await moveEpic(epic.id, projectId, newStatus);
        router.refresh();
      } catch {
        setEpics((prev) =>
          prev.map((e) => (e.id === epic.id ? { ...e, status: epic.status } : e))
        );
      }
    });
  }

  return (
    <DndContext
      id="epic-board"
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {TASK_STATUSES.map((status) => (
          <EpicColumn
            key={status.value}
            status={status}
            epics={epics.filter((e) => e.status === status.value)}
            projectId={projectId}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeEpic && (
          <EpicCard epic={activeEpic} projectId={projectId} overlay />
        )}
      </DragOverlay>
    </DndContext>
  );
}
