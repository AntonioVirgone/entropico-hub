"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, GitBranch, Pencil, Trash2 } from "lucide-react";

import { deleteProject, setProjectStatus } from "@/lib/actions";
import type { Project } from "@/lib/types";
import { resolveProjectColor } from "@/lib/tech-colors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProjectDialog } from "@/components/project-dialog";
import { TechBadges } from "@/components/tech-badges";

export function ProjectCard({
  project,
  total,
  done,
}: {
  project: Project;
  total: number;
  done: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const isArchived = project.status === "archived";
  const dotColor = resolveProjectColor({
    language: project.language,
    framework: project.framework,
    fallback: project.color,
  });

  async function toggleArchive() {
    setPending(true);
    try {
      await setProjectStatus(project.id, isArchived ? "active" : "archived");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (
      !confirm(
        `Eliminare il progetto "${project.name}" e tutti i suoi task? L'azione è irreversibile.`
      )
    )
      return;
    setPending(true);
    try {
      await deleteProject(project.id);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="h-3 w-3 shrink-0 rounded-full border border-black/10 dark:border-white/20"
              style={{ backgroundColor: dotColor }}
            />
            <CardTitle className="truncate">{project.name}</CardTitle>
          </div>
          {isArchived && <Badge variant="secondary">Archiviato</Badge>}
        </div>
        {project.description && (
          <CardDescription className="line-clamp-2">
            {project.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        <p className="text-sm text-muted-foreground">
          {total === 0
            ? "Nessun task"
            : `${done}/${total} task completati`}
        </p>
        <TechBadges project={project} compact />
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button asChild size="sm">
            <Link href={`/projects/${project.id}`}>Apri board</Link>
          </Button>
          {project.github_repo_url && (
            <Button asChild size="icon" variant="ghost" aria-label="Apri repository GitHub">
              <a
                href={project.github_repo_url}
                target="_blank"
                rel="noopener noreferrer"
                title={project.github_repo_full_name ?? "Repository GitHub"}
              >
                <GitBranch />
              </a>
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <ProjectDialog
            project={project}
            trigger={
              <Button size="icon" variant="ghost" aria-label="Modifica">
                <Pencil />
              </Button>
            }
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleArchive}
            disabled={pending}
            aria-label={isArchived ? "Ripristina" : "Archivia"}
          >
            {isArchived ? <ArchiveRestore /> : <Archive />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleDelete}
            disabled={pending}
            aria-label="Elimina"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
