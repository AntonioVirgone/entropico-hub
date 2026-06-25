"use client";

import { useState } from "react";
import { FileText } from "lucide-react";

import type { ProjectDocument } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { DocumentsSection } from "@/components/documents-section";

export function DocumentsModal({
  projectId,
  documents,
}: {
  projectId: string;
  documents: ProjectDocument[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileText /> Documenti
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-2xl max-h-[85vh] flex flex-col"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">Documenti del progetto</DialogTitle>
          <div className="overflow-y-auto pr-1">
            <DocumentsSection projectId={projectId} documents={documents} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
