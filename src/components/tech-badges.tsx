import type { Project } from "@/lib/types";
import { getTechColor } from "@/lib/tech-colors";

/** Colore di fallback per categoria, quando la tecnologia non è in palette. */
const CATEGORY_FALLBACK = {
  framework: "#6366f1",
  language: "#8b5cf6",
  technology: "#10b981",
  tool: "#f59e0b",
} as const;

type Category = keyof typeof CATEGORY_FALLBACK;
type TechItem = { label: string; color: string };

function makeItem(label: string, category: Category): TechItem {
  return { label, color: getTechColor(label) ?? CATEGORY_FALLBACK[category] };
}

function collectItems(project: Project): TechItem[] {
  const items: TechItem[] = [];
  if (project.framework) items.push(makeItem(project.framework, "framework"));
  if (project.language) items.push(makeItem(project.language, "language"));
  for (const t of project.technologies ?? []) items.push(makeItem(t, "technology"));
  for (const t of project.tools ?? []) items.push(makeItem(t, "tool"));
  return items;
}

/**
 * Mostra i metadati tecnici di un progetto come badge con pallino del colore
 * di brand (stile GitHub). `compact` (card) limita il numero con un "+N".
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
          key={item.label}
          className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2 py-0.5 text-xs font-medium text-foreground"
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full border border-black/10 dark:border-white/20"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
      {hidden > 0 && (
        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          +{hidden}
        </span>
      )}
    </div>
  );
}
