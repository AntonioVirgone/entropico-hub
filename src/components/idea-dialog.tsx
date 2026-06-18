"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createProjectIdea, updateProjectIdea } from "@/lib/actions";
import {
  IDEA_STATUSES,
  TASK_PRIORITIES,
  type IdeaStatus,
  type ProjectIdea,
  type TaskPriority,
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

export function IdeaDialog({
  trigger,
  idea,
}: {
  trigger: React.ReactNode;
  idea?: ProjectIdea;
}) {
  const router = useRouter();
  const isEdit = !!idea;
  const [open, setOpen] = useState(false);
  const [priority, setPriority] = useState<TaskPriority>(idea?.priority ?? "medium");
  const [status, setStatus] = useState<IdeaStatus>(idea?.status ?? "idea");
  const [pending, setPending] = useState(false);

  function resetState() {
    setPriority(idea?.priority ?? "medium");
    setStatus(idea?.status ?? "idea");
  }

  async function handleAction(formData: FormData) {
    setPending(true);
    try {
      if (isEdit) {
        await updateProjectIdea(idea.id, formData);
      } else {
        await createProjectIdea(formData);
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
        if (o) resetState();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifica idea" : "Nuova idea"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Aggiorna i dettagli dell'idea di progetto."
              : "Annota un nuovo progetto da realizzare, anche in futuro."}
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
              defaultValue={idea?.title}
              placeholder="Es. App per il monitoraggio delle spese"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={idea?.description ?? ""}
              placeholder="In cosa consiste l'idea, motivazioni, dettagli…"
            />
          </div>

          <div className="space-y-2">
            <Label>Priorità / interesse</Label>
            <input type="hidden" name="priority" value={priority} />
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as TaskPriority)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Stato</Label>
            <input type="hidden" name="status" value={status} />
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as IdeaStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IDEA_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvataggio…" : isEdit ? "Salva" : "Aggiungi idea"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
