"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createDocument, updateDocument } from "@/lib/actions";
import {
  DOCUMENT_FORMATS,
  type DocumentFormat,
  type ProjectDocument,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function DocumentDialog({
  projectId,
  document,
  trigger,
}: {
  projectId: string;
  document?: ProjectDocument;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const isEdit = !!document;
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<DocumentFormat>(
    document?.format ?? "markdown"
  );
  const [pending, setPending] = useState(false);

  async function handleAction(formData: FormData) {
    setPending(true);
    try {
      if (isEdit) {
        await updateDocument(document.id, projectId, formData);
      } else {
        await createDocument(projectId, formData);
      }
      setOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setFormat(document?.format ?? "markdown");
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifica documento" : "Nuovo documento"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Aggiorna il contenuto della documentazione."
              : "Aggiungi un documento alla documentazione del progetto."}
          </DialogDescription>
        </DialogHeader>

        <form action={handleAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titolo</Label>
            <Input
              id="title"
              name="title"
              required
              autoFocus
              defaultValue={document?.title}
              placeholder="Es. Architettura del sistema"
            />
          </div>

          <div className="space-y-2">
            <Label>Formato</Label>
            <input type="hidden" name="format" value={format} />
            <Select
              value={format}
              onValueChange={(v) => setFormat(v as DocumentFormat)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_FORMATS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Contenuto</Label>
            <Textarea
              id="content"
              name="content"
              defaultValue={document?.content ?? ""}
              placeholder={
                format === "markdown"
                  ? "# Titolo\n\nScrivi qui in Markdown…"
                  : "Scrivi qui il testo…"
              }
              className="min-h-60 font-mono text-sm"
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvataggio…" : isEdit ? "Salva" : "Aggiungi documento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
