import { FolderPlus, Plus } from "lucide-react";

import {
  getGithubConnection,
  getHighPriorityActiveTasks,
  getProjects,
  getTaskCounts,
} from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { HighPriorityTasks } from "@/components/high-priority-tasks";
import { ProjectCard } from "@/components/project-card";
import { ProjectDialog } from "@/components/project-dialog";
import { StaleTasksAlert } from "@/components/stale-tasks-alert";
import { TaskDialog } from "@/components/task-dialog";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [projects, highPriorityTasks, github] = await Promise.all([
    getProjects(),
    getHighPriorityActiveTasks(),
    getGithubConnection(),
  ]);

  const counts = await Promise.all(projects.map((p) => getTaskCounts(p.id)));
  const withCounts = projects.map((project, i) => ({
    project,
    ...counts[i],
  }));

  const active = withCounts.filter((p) => p.project.status === "active");
  const archived = withCounts.filter((p) => p.project.status === "archived");

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
