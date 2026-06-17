"use client";

import Link from "next/link";
import { useState } from "react";
import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";

import { deleteProject, setProjectStatus } from "@/lib/actions";
import type { Project } from "@/lib/types";
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

export function ProjectCard({
  project,
  total,
  done,
}: {
  project: Project;
  total: number;
  done: number;
}) {
  const [pending, setPending] = useState(false);
  const isArchived = project.status === "archived";

  async function toggleArchive() {
    setPending(true);
    try {
      await setProjectStatus(project.id, isArchived ? "active" : "archived");
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
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: project.color }}
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
      <CardContent className="flex-1">
        <p className="text-sm text-muted-foreground">
          {total === 0
            ? "Nessun task"
            : `${done}/${total} task completati`}
        </p>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2">
        <Button asChild size="sm">
          <Link href={`/projects/${project.id}`}>Apri board</Link>
        </Button>
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
