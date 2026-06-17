"use client";

import { useState } from "react";

import { createProject, updateProject } from "@/lib/actions";
import { PROJECT_COLORS, type Project } from "@/lib/types";
import { cn } from "@/lib/utils";
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

export function ProjectDialog({
  trigger,
  project,
}: {
  trigger: React.ReactNode;
  project?: Project;
}) {
  const isEdit = !!project;
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState<string>(
    project?.color ?? PROJECT_COLORS[5]
  );
  const [pending, setPending] = useState(false);

  async function handleAction(formData: FormData) {
    setPending(true);
    try {
      if (isEdit) {
        await updateProject(project.id, formData);
      } else {
        await createProject(formData);
      }
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setColor(project?.color ?? PROJECT_COLORS[5]);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifica progetto" : "Nuovo progetto"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Aggiorna i dettagli del progetto."
              : "Crea un nuovo progetto da gestire."}
          </DialogDescription>
        </DialogHeader>
        <form action={handleAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              name="name"
              required
              autoFocus
              defaultValue={project?.name}
              placeholder="Es. Sito aziendale"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={project?.description ?? ""}
              placeholder="A cosa serve questo progetto…"
            />
          </div>
          <div className="space-y-2">
            <Label>Colore</Label>
            <input type="hidden" name="color" value={color} />
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Colore ${c}`}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform cursor-pointer",
                    color === c
                      ? "border-foreground scale-110"
                      : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvataggio…" : isEdit ? "Salva" : "Crea progetto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
