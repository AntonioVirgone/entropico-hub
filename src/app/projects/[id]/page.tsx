import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";

import { getProject, getTasks } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/kanban-board";
import { TaskDialog } from "@/components/task-dialog";

export const dynamic = "force-dynamic";

export default async function ProjectBoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const tasks = await getTasks(id);

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link href="/">
            <ArrowLeft /> Tutti i progetti
          </Link>
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="h-4 w-4 shrink-0 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-2xl font-bold tracking-tight">
                  {project.name}
                </h1>
                {project.status === "archived" && (
                  <Badge variant="secondary">Archiviato</Badge>
                )}
              </div>
              {project.description && (
                <p className="text-sm text-muted-foreground">
                  {project.description}
                </p>
              )}
            </div>
          </div>
          <TaskDialog
            projectId={project.id}
            trigger={
              <Button>
                <Plus /> Aggiungi task
              </Button>
            }
          />
        </div>
      </div>

      <KanbanBoard tasks={tasks} />
    </div>
  );
}
