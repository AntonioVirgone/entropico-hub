"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

import { createTask, updateTask } from "@/lib/actions";
import { TASK_PRIORITIES, type Project, type Task, type TaskPriority } from "@/lib/types";
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
  allProjects = [],
}: {
  projectId: string;
  task?: Task;
  trigger: React.ReactNode;
  allProjects?: Project[];
}) {
  const isEdit = !!task;
  const [open, setOpen] = useState(false);
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [isCross, setIsCross] = useState(task?.is_cross_functional ?? false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>(
    task?.cross_project_ids ?? []
  );
  const [pending, setPending] = useState(false);

  const otherProjects = allProjects.filter((p) => p.id !== projectId && p.status === "active");

  function resetState() {
    setPriority(task?.priority ?? "medium");
    setIsCross(task?.is_cross_functional ?? false);
    setSelectedProjects(task?.cross_project_ids ?? []);
  }

  function toggleProject(pid: string) {
    setSelectedProjects((prev) =>
      prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
    );
  }

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
        if (o) resetState();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
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

          {/* ── Cross-funzionale ─────────────────────────────────── */}
          {otherProjects.length > 0 && (
            <div className="rounded-lg border p-3 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="is_cross_functional"
                  value="true"
                  checked={isCross}
                  onChange={(e) => {
                    setIsCross(e.target.checked);
                    if (!e.target.checked) setSelectedProjects([]);
                  }}
                  className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                />
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Task cross-funzionale
                </div>
              </label>

              {isCross && (
                <div className="space-y-1.5 pl-6">
                  <p className="text-xs text-muted-foreground">
                    Seleziona i progetti in cui comparirà questo task:
                  </p>
                  {otherProjects.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        name="cross_project_ids"
                        value={p.id}
                        checked={selectedProjects.includes(p.id)}
                        onChange={() => toggleProject(p.id)}
                        className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                      />
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      <span
                        className={cn(
                          "text-sm",
                          selectedProjects.includes(p.id)
                            ? "font-medium"
                            : "text-muted-foreground"
                        )}
                      >
                        {p.name}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

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
