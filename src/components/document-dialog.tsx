"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";

import { createDocument, updateDocument } from "@/lib/actions";
import {
  DOCUMENT_FORMATS,
  DOCUMENT_MAX_CONTENT,
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

/** Ricava un titolo dal contenuto (primo heading H1) o dal nome del file. */
function deriveTitle(content: string, fileName: string): string {
  const heading = content.match(/^\s*#\s+(.+?)\s*$/m);
  if (heading) return heading[1].trim();
  return fileName.replace(/\.[^.]+$/, "").trim();
}

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(document?.title ?? "");
  const [content, setContent] = useState(document?.content ?? "");
  const [format, setFormat] = useState<DocumentFormat>(
    document?.format ?? "markdown"
  );
  const [pending, setPending] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  function resetForm() {
    setTitle(document?.title ?? "");
    setContent(document?.content ?? "");
    setFormat(document?.format ?? "markdown");
    setImportError(null);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permette di re-importare lo stesso file
    if (!file) return;
    setImportError(null);

    const text = await file.text();
    if (text.length > DOCUMENT_MAX_CONTENT) {
      setImportError(
        `File troppo grande (max ${DOCUMENT_MAX_CONTENT.toLocaleString("it-IT")} caratteri).`
      );
      return;
    }

    const isText = /\.txt$/i.test(file.name);
    setContent(text);
    setFormat(isText ? "text" : "markdown");
    // Compila il titolo se vuoto, così non sovrascrive quello già digitato.
    setTitle((prev) => prev.trim() || deriveTitle(text, file.name));
  }

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
        if (o) resetForm();
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
              : "Aggiungi un documento alla documentazione del progetto, anche importando un file .md o .txt."}
          </DialogDescription>
        </DialogHeader>

        <form action={handleAction} className="space-y-4">
          {!isEdit && (
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.markdown,.txt,text/markdown,text/plain"
                onChange={handleImport}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Upload /> Importa da file (.md, .txt)
              </Button>
              {importError && (
                <p className="text-sm text-destructive">{importError}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Titolo</Label>
            <Input
              id="title"
              name="title"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
              value={content}
              onChange={(e) => setContent(e.target.value)}
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
