import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";

const CATEGORY_STYLES = {
  framework: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  language: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  technology: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  tool: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
} as const;

type Category = keyof typeof CATEGORY_STYLES;
type TechItem = { label: string; category: Category };

function collectItems(project: Project): TechItem[] {
  const items: TechItem[] = [];
  if (project.framework) items.push({ label: project.framework, category: "framework" });
  if (project.language) items.push({ label: project.language, category: "language" });
  for (const t of project.technologies ?? []) items.push({ label: t, category: "technology" });
  for (const t of project.tools ?? []) items.push({ label: t, category: "tool" });
  return items;
}

/**
 * Mostra i metadati tecnici di un progetto come badge colorati per categoria.
 * `compact` (card) limita il numero di badge mostrando un "+N" finale.
 */
export function TechBadges({
  project,
  compact = false,
  max = 5,
}: {
  project: Project;
  compact?: boolean;
  max?: number;
}) {
  const items = collectItems(project);
  if (items.length === 0) return null;

  const visible = compact ? items.slice(0, max) : items;
  const hidden = compact ? items.length - visible.length : 0;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((item) => (
        <span
          key={`${item.category}-${item.label}`}
          className={cn(
            "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
            CATEGORY_STYLES[item.category]
          )}
        >
          {item.label}
        </span>
      ))}
      {hidden > 0 && (
        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          +{hidden}
        </span>
      )}
    </div>
  );
}
