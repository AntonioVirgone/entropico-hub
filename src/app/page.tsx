import { Plus } from "lucide-react";

import { getProjects, getTaskCounts } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/project-card";
import { ProjectDialog } from "@/components/project-dialog";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const projects = await getProjects();
  const counts = await Promise.all(projects.map((p) => getTaskCounts(p.id)));
  const withCounts = projects.map((project, i) => ({
    project,
    ...counts[i],
  }));

  const active = withCounts.filter((p) => p.project.status === "active");
  const archived = withCounts.filter((p) => p.project.status === "archived");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Progetti</h1>
          <p className="text-sm text-muted-foreground">
            {active.length} attivi
            {archived.length > 0 && ` · ${archived.length} archiviati`}
          </p>
        </div>
        <ProjectDialog
          trigger={
            <Button>
              <Plus /> Nuovo progetto
            </Button>
          }
        />
      </div>

      {active.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
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
