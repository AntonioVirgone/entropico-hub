"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createEpic, updateEpic } from "@/lib/actions";
import type { Epic } from "@/lib/types";
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
import { Textarea } from "@/components/ui/textarea";

type EpicDialogProps = {
  projectId: string;
  epic?: Epic;
  trigger: React.ReactNode;
};

export function EpicDialog({ projectId, epic, trigger }: EpicDialogProps) {
  const router = useRouter();
  const isEdit = !!epic;
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      const result = isEdit
        ? await updateEpic(epic.id, projectId, formData)
        : await createEpic(projectId, formData);

      if (result && !result.ok) {
        setError(result.error ?? "Errore imprevisto.");
        return;
      }

      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore imprevisto durante il salvataggio.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setError(null);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifica epica" : "Nuova epica"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Aggiorna il titolo o la descrizione dell'epica."
              : "Crea una nuova epica per raggruppare i task correlati."}
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
              defaultValue={epic?.title}
              placeholder="Nome dell'epica"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={epic?.description ?? ""}
              placeholder="Obiettivo e contesto dell'epica…"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvataggio…" : isEdit ? "Salva" : "Crea epica"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
