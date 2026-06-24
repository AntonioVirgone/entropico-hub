"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";

import type { HighPriorityTask } from "@/lib/types";
import { Button } from "@/components/ui/button";

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

function isStale(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() > TWO_DAYS_MS;
}

export function StaleTasksAlert({ tasks }: { tasks: HighPriorityTask[] }) {
  const [dismissed, setDismissed] = useState(false);

  const staleTasks = tasks.filter(
    (t) => t.status === "todo" && isStale(t.created_at)
  );

  if (dismissed || staleTasks.length === 0) return null;

  return (
    <div className="animate-in fade-in slide-in-from-top-1 rounded-lg border border-amber-300 bg-amber-50 p-4 shadow-sm duration-300 dark:border-amber-800 dark:bg-amber-950/40">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {staleTasks.length === 1
                ? "1 task ad alta priorità è in sospeso da più di 2 giorni"
                : `${staleTasks.length} task ad alta priorità sono in sospeso da più di 2 giorni`}
            </p>
            <ul className="mt-2 space-y-1">
              {staleTasks.map((t) => (
                <li key={`${t.taskId}-${t.projectId}`} className="flex items-center gap-2 text-sm">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: t.projectColor }}
                  />
                  <Link
                    href={`/projects/${t.projectId}`}
                    className="font-medium text-amber-800 underline-offset-2 hover:underline dark:text-amber-300 truncate"
                  >
                    {t.title}
                  </Link>
                  <span className="shrink-0 text-amber-700/70 dark:text-amber-400/70">
                    — {t.projectName}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0 text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/50"
          onClick={() => setDismissed(true)}
          aria-label="Chiudi avviso"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
