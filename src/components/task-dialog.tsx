"use client";

import { useState } from "react";

import { createTask, updateTask } from "@/lib/actions";
import { TASK_PRIORITIES, type Task, type TaskPriority } from "@/lib/types";
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

export function TaskDialog({
  projectId,
  task,
  trigger,
}: {
  projectId: string;
  task?: Task;
  trigger: React.ReactNode;
}) {
  const isEdit = !!task;
  const [open, setOpen] = useState(false);
  const [priority, setPriority] = useState<TaskPriority>(
    task?.priority ?? "medium"
  );
  const [pending, setPending] = useState(false);

  async function handleAction(formData: FormData) {
    setPending(true);
    try {
      if (isEdit) {
        await updateTask(task.id, projectId, formData);
      } else {
        await createTask(projectId, formData);
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
        if (o) setPriority(task?.priority ?? "medium");
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifica task" : "Nuovo task"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Aggiorna i dettagli del task."
              : "Aggiungi un nuovo task al progetto."}
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
              defaultValue={task?.title}
              placeholder="Cosa c'è da fare"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={task?.description ?? ""}
              placeholder="Dettagli del task…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Note</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={task?.notes ?? ""}
              placeholder="Appunti, link, promemoria…"
            />
          </div>
          <div className="space-y-2">
            <Label>Priorità</Label>
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
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvataggio…" : isEdit ? "Salva" : "Aggiungi task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
