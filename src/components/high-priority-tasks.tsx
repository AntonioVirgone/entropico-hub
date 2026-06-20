import Link from "next/link";
import { ArrowRight, Share2 } from "lucide-react";

import type { HighPriorityTask } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const STATUS_LABELS: Record<string, string> = {
  todo: "Da fare",
  in_progress: "In corso",
};

const STATUS_STYLES: Record<string, string> = {
  todo: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function HighPriorityTasks({ tasks }: { tasks: HighPriorityTask[] }) {
  if (tasks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nessun task ad alta priorità in sospeso.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Task
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Progetto
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Stato
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Creato il
            </th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {tasks.map((t) => (
            <tr
              key={`${t.taskId}-${t.projectId}`}
              className="bg-background hover:bg-muted/30 transition-colors"
            >
              <td className="px-4 py-3">
                <span className="flex items-center gap-1.5 font-medium">
                  {t.title}
                  {t.is_cross_functional && (
                    <Share2
                      className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                      aria-label="Cross-funzionale"
                    />
                  )}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: t.projectColor }}
                  />
                  {t.projectName}
                </span>
              </td>
              <td className="px-4 py-3">
                <Badge
                  variant="secondary"
                  className={STATUS_STYLES[t.status]}
                >
                  {STATUS_LABELS[t.status] ?? t.status}
                </Badge>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDate(t.created_at)}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/projects/${t.projectId}`}
                  className="inline-flex items-center gap-1 text-sm font-medium underline-offset-2 hover:underline"
                >
                  Apri board <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
