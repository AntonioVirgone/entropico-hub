import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, GitBranch, Plus } from "lucide-react";

import {
  getEpics,
  getGithubConnection,
  getProject,
  getProjectDocuments,
} from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EpicBoard } from "@/components/epic-board";
import { EpicDialog } from "@/components/epic-dialog";
import { TechBadges } from "@/components/tech-badges";
import { DocumentsModal } from "@/components/documents-modal";
import { GitHubRepoButton } from "@/components/github-repo-button";
import { resolveProjectColor } from "@/lib/tech-colors";

export const dynamic = "force-dynamic";

export default async function ProjectBoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, epics, documents, github] = await Promise.all([
    getProject(id),
    getEpics(id),
    getProjectDocuments(id),
    getGithubConnection(),
  ]);

  if (!project) notFound();

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
              className="h-4 w-4 shrink-0 rounded-full border border-black/10 dark:border-white/20"
              style={{
                backgroundColor: resolveProjectColor({
                  language: project.language,
                  framework: project.framework,
                  fallback: project.color,
                }),
              }}
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
              <div className="mt-2">
                <TechBadges project={project} />
              </div>
              {project.github_repo_url && (
                <a
                  href={project.github_repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  <GitBranch className="h-4 w-4" />
                  {project.github_repo_full_name ?? "Repository GitHub"}
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!project.github_repo_url && (
              <GitHubRepoButton
                projectId={project.id}
                project={{ name: project.name, description: project.description }}
                github={github}
              />
            )}
            <DocumentsModal projectId={project.id} documents={documents} />
            <EpicDialog
              projectId={project.id}
              trigger={
                <Button>
                  <Plus /> Nuova epica
                </Button>
              }
            />
          </div>
        </div>
      </div>

      <EpicBoard projectId={project.id} epics={epics} />
    </div>
  );
}
