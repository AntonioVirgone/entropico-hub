"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, FileText, Pencil, Plus, Trash2 } from "lucide-react";

import { deleteDocument, toggleDocumentCompleted } from "@/lib/actions";
import type { ProjectDocument } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DocumentDialog } from "@/components/document-dialog";
import { DocumentView } from "@/components/document-view";
import { ApiUploadHint } from "@/components/api-upload-hint";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function DocumentRow({
  document,
  projectId,
}: {
  document: ProjectDocument;
  projectId: string;
}) {
  const router = useRouter();
  const [completed, setCompleted] = useState(document.is_completed);
  const [pending, setPending] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function handleToggleCompleted() {
    setToggling(true);
    const next = !completed;
    setCompleted(next);
    try {
      await toggleDocumentCompleted(document.id, projectId, next);
      router.refresh();
    } catch {
      setCompleted(!next);
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Eliminare il documento "${document.title}"?`)) return;
    setPending(true);
    try {
      await deleteDocument(document.id, projectId);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={`flex items-center gap-3 rounded-lg border bg-background px-4 py-3 ${completed ? "opacity-60" : ""}`}>
      <button
        type="button"
        onClick={handleToggleCompleted}
        disabled={toggling}
        aria-label={completed ? "Segna come non completato" : "Segna come completato"}
        className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
      >
        {completed ? (
          <CheckCircle2 className="h-4 w-4 text-primary" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
      </button>
      <DocumentView
        document={document}
        trigger={
          <button
            type="button"
            className={`min-w-0 flex-1 text-left text-sm font-medium hover:underline ${completed ? "line-through" : ""}`}
          >
            <span className="truncate">{document.title}</span>
          </button>
        }
      />
      {document.source === "api" && (
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          API
        </Badge>
      )}
      {completed && (
        <Badge variant="outline" className="shrink-0 text-[10px]">
          Completato
        </Badge>
      )}
      <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
        {formatDate(document.updated_at)}
      </span>
      <div className="flex shrink-0 items-center gap-1">
        <DocumentDialog
          projectId={projectId}
          document={document}
          trigger={
            <Button size="icon" variant="ghost" aria-label="Modifica">
              <Pencil />
            </Button>
          }
        />
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
    </div>
  );
}

export function DocumentsSection({
  projectId,
  documents,
}: {
  projectId: string;
  documents: ProjectDocument[];
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Documentazione</h2>
          <p className="text-sm text-muted-foreground">
            Documenti del progetto. Possono essere caricati anche via API.
          </p>
        </div>
        <DocumentDialog
          projectId={projectId}
          trigger={
            <Button variant="outline">
              <Plus /> Nuovo documento
            </Button>
          }
        />
      </div>

      {documents.length === 0 ? (
        <div className="rounded-xl border border-dashed py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nessun documento. Creane uno o caricalo via API.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <DocumentRow key={doc.id} document={doc} projectId={projectId} />
          ))}
        </div>
      )}

      <ApiUploadHint projectId={projectId} />
    </section>
  );
}
