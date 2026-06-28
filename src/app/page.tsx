import { FolderPlus, Plus } from "lucide-react";

import {
  getGithubConnection,
  getHighPriorityActiveTasks,
  getLastTaskCreatedAt,
  getProjects,
  getTaskCounts,
} from "@/lib/queries";
import {
  DEFAULT_PROJECT_SORT,
  PROJECT_SORT_OPTIONS,
  type ProjectSort as ProjectSortValue,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { HighPriorityTasks } from "@/components/high-priority-tasks";
import { ProjectCard } from "@/components/project-card";
import { ProjectDialog } from "@/components/project-dialog";
import { ProjectSort } from "@/components/project-sort";
import { StaleTasksAlert } from "@/components/stale-tasks-alert";
import { TaskDialog } from "@/components/task-dialog";

export const dynamic = "force-dynamic";

type ProjectWithCounts = {
  project: Awaited<ReturnType<typeof getProjects>>[number];
  total: number;
  done: number;
};

/** Riordina i progetti secondo il criterio scelto, senza mutare l'input. */
function sortProjects(
  items: ProjectWithCounts[],
  sort: ProjectSortValue,
  lastTaskAt: Record<string, string>
): ProjectWithCounts[] {
  const sorted = [...items];
  if (sort === "alpha") {
    sorted.sort((a, b) =>
      a.project.name.localeCompare(b.project.name, "it", { sensitivity: "base" })
    );
  } else if (sort === "last_task") {
    sorted.sort((a, b) => {
      const ta = lastTaskAt[a.project.id];
      const tb = lastTaskAt[b.project.id];
      // I progetti senza task finiscono in fondo; gli altri dal più recente.
      if (!ta && !tb) return 0;
      if (!ta) return 1;
      if (!tb) return -1;
      return tb < ta ? -1 : tb > ta ? 1 : 0;
    });
  }
  // "created": già ordinati per data di creazione (più recenti prima) dalla query.
  return sorted;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort: sortParam } = await searchParams;
  const sort: ProjectSortValue = PROJECT_SORT_OPTIONS.some(
    (o) => o.value === sortParam
  )
    ? (sortParam as ProjectSortValue)
    : DEFAULT_PROJECT_SORT;

  const [projects, highPriorityTasks, github, lastTaskAt] = await Promise.all([
    getProjects(),
    getHighPriorityActiveTasks(),
    getGithubConnection(),
    getLastTaskCreatedAt(),
  ]);

  const counts = await Promise.all(projects.map((p) => getTaskCounts(p.id)));
  const withCounts = projects.map((project, i) => ({
    project,
    ...counts[i],
  }));

  const active = sortProjects(
    withCounts.filter((p) => p.project.status === "active"),
    sort,
    lastTaskAt
  );
  const archived = sortProjects(
    withCounts.filter((p) => p.project.status === "archived"),
    sort,
    lastTaskAt
  );

  return (
    <div className="space-y-8">
      <StaleTasksAlert tasks={highPriorityTasks} />

      {/* Tabella task alta priorità */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Alta priorità</h2>
          <p className="text-sm text-muted-foreground">
            Task con priorità alta non ancora completati in tutti i progetti.
          </p>
        </div>
        <HighPriorityTasks tasks={highPriorityTasks} />
      </section>

      {/* Header progetti */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Progetti</h1>
          <p className="text-sm text-muted-foreground">
            {active.length} attivi
            {archived.length > 0 && ` · ${archived.length} archiviati`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ProjectSort value={sort} />
          <TaskDialog
            mode="home"
            allProjects={projects}
            trigger={
              <Button variant="outline">
                <Plus /> Nuovo task
              </Button>
            }
          />
          <ProjectDialog
            github={github}
            trigger={
              <Button>
                <Plus /> Nuovo progetto
              </Button>
            }
          />
        </div>
      </div>

      {/* Griglia progetti attivi */}
      {active.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <FolderPlus className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            Nessun progetto attivo. Creane uno per iniziare.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map(({ project, total, done }) => (
            <ProjectCard
              key={project.id}
              project={project}
              total={total}
              done={done}
            />
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Archiviati
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {archived.map(({ project, total, done }) => (
              <ProjectCard
                key={project.id}
                project={project}
                total={total}
                done={done}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
