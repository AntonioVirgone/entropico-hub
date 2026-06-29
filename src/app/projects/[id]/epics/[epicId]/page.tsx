import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, Plus } from "lucide-react";

import {
  getEpic,
  getEpics,
  getGithubConnection,
  getProject,
  getProjects,
  getTasks,
} from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/kanban-board";
import { TaskDialog } from "@/components/task-dialog";
import { resolveProjectColor } from "@/lib/tech-colors";

export const dynamic = "force-dynamic";

export default async function EpicTaskBoardPage({
  params,
}: {
  params: Promise<{ id: string; epicId: string }>;
}) {
  const { id: projectId, epicId } = await params;

  const [project, epic, tasks, allProjects, epics, github] = await Promise.all([
    getProject(projectId),
    getEpic(epicId),
    getTasks(projectId, epicId),
    getProjects(),
    getEpics(projectId),
    getGithubConnection(),
  ]);

  void github; // non usato qui ma caricato per coerenza (futura sidebar)

  if (!project || !epic) notFound();
  if (epic.project_id !== projectId) notFound();

  const projectColor = resolveProjectColor({
    language: project.language,
    framework: project.framework,
    fallback: project.color,
  });

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
          <Link
            href="/"
            className="hover:text-foreground transition-colors"
          >
            Progetti
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <Link
            href={`/projects/${projectId}`}
            className="hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: projectColor }}
            />
            {project.name}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="font-medium text-foreground truncate max-w-[200px]">
            {epic.title}
          </span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-4 mt-3">
          <div>
            <Button asChild variant="ghost" size="sm" className="-ml-2">
              <Link href={`/projects/${projectId}`}>
                <ArrowLeft /> Epiche
              </Link>
            </Button>
            <div className="mt-1">
              <h1 className="text-2xl font-bold tracking-tight">{epic.title}</h1>
              {epic.description && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {epic.description}
                </p>
              )}
            </div>
          </div>

          <TaskDialog
            projectId={projectId}
            epicId={epicId}
            epics={epics}
            allProjects={allProjects}
            trigger={
              <Button>
                <Plus /> Aggiungi task
              </Button>
            }
          />
        </div>
      </div>

      <KanbanBoard
        projectId={projectId}
        tasks={tasks}
        allProjects={allProjects}
        epics={epics}
      />
    </div>
  );
}
