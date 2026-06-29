"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Inbox } from "lucide-react";

import { cn } from "@/lib/utils";
import { TASK_STATUSES, type EpicWithCounts, type TaskStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { EpicCard } from "@/components/epic-card";

/** Epiche mostrate nella colonna "Fatto" prima del collapse. */
const DONE_VISIBLE_LIMIT = 4;

const STATUS_DOT: Record<TaskStatus, string> = {
  todo: "bg-slate-400",
  in_progress: "bg-blue-500",
  test: "bg-amber-500",
  done: "bg-emerald-500",
};

export function EpicColumn({
  status,
  epics,
  projectId,
}: {
  status: (typeof TASK_STATUSES)[number];
  epics: EpicWithCounts[];
  projectId: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status.value });
  const [expanded, setExpanded] = useState(false);

  const isDoneColumn = status.value === "done";
  const hiddenCount =
    isDoneColumn && !expanded ? Math.max(0, epics.length - DONE_VISIBLE_LIMIT) : 0;
  const visibleEpics =
    isDoneColumn && !expanded ? epics.slice(0, DONE_VISIBLE_LIMIT) : epics;

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
          {epics.length}
        </span>
      </div>

      <div ref={setNodeRef} className="flex-1 space-y-2 min-h-[80px]">
        {epics.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-1 py-6 text-center">
            <Inbox className="h-5 w-5 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">Trascina qui un'epica</p>
          </div>
        ) : (
          <>
            {visibleEpics.map((epic) => (
              <EpicCard key={epic.id} epic={epic} projectId={projectId} />
            ))}

            {hiddenCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={() => setExpanded(true)}
              >
                +{hiddenCount} completate
              </Button>
            )}

            {isDoneColumn && expanded && epics.length > DONE_VISIBLE_LIMIT && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={() => setExpanded(false)}
              >
                Comprimi
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
