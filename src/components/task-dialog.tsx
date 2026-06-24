"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bug, FileSearch, Share2, Sparkles } from "lucide-react";

import { createTask, createTaskFromHome, updateTask } from "@/lib/actions";
import {
  TASK_PRIORITIES,
  TASK_TYPES,
  type Project,
  type Task,
  type TaskPriority,
  type TaskType,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { resolveProjectColor } from "@/lib/tech-colors";
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

/** Modalità "home": nessun progetto primario pre-selezionato. */
type HomeMode = { mode: "home"; projectId?: never };
/** Modalità "project": si sta lavorando dentro una board specifica. */
type ProjectMode = { mode?: "project"; projectId: string };

type TaskDialogProps = (HomeMode | ProjectMode) & {
  task?: Task;
  trigger: React.ReactNode;
  allProjects?: Project[];
};

export function TaskDialog({
  task,
  trigger,
  allProjects = [],
  ...modeProps
}: TaskDialogProps) {
  const router = useRouter();
  const isHomeMode = modeProps.mode === "home";
  const projectId = isHomeMode ? undefined : modeProps.projectId;
  const isEdit = !!task;

  const [open, setOpen] = useState(false);
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [type, setType] = useState<TaskType>(task?.type ?? "feature");
  const [isCross, setIsCross] = useState(task?.is_cross_functional ?? false);
  const [selectedCrossIds, setSelectedCrossIds] = useState<string[]>(
    task?.cross_project_ids ?? []
  );
  // Modalità home: progetti selezionati per il nuovo task (almeno 1 richiesto)
  const [selectedHomeIds, setSelectedHomeIds] = useState<string[]>([]);
  const [homeError, setHomeError] = useState(false);
  const [pending, setPending] = useState(false);

  const otherProjects = allProjects.filter(
    (p) => p.id !== projectId && p.status === "active"
  );
  const activeProjects = allProjects.filter((p) => p.status === "active");

  function resetState() {
    setPriority(task?.priority ?? "medium");
    setType(task?.type ?? "feature");
    setIsCross(task?.is_cross_functional ?? false);
    setSelectedCrossIds(task?.cross_project_ids ?? []);
    setSelectedHomeIds([]);
    setHomeError(false);
  }

  function toggleCrossId(pid: string) {
    setSelectedCrossIds((prev) =>
      prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
    );
  }

  function toggleHomeId(pid: string) {
    setHomeError(false);
    setSelectedHomeIds((prev) =>
      prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
    );
  }

  async function handleAction(formData: FormData) {
    if (isHomeMode && selectedHomeIds.length === 0) {
      setHomeError(true);
      return;
    }
    setPending(true);
    try {
      if (isEdit) {
        await updateTask(task.id, projectId!, formData);
      } else if (isHomeMode) {
        await createTaskFromHome(formData);
      } else {
        await createTask(projectId!, formData);
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
          <DialogTitle>
            {isEdit ? "Modifica task" : isHomeMode ? "Nuovo task" : "Nuovo task"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Aggiorna i dettagli del task."
              : isHomeMode
              ? "Crea un task e assegnalo a uno o più progetti."
              : "Aggiungi un nuovo task al progetto."}
          </DialogDescription>
        </DialogHeader>

        <form action={handleAction} className="space-y-4">
          {/* Titolo */}
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

          {/* Tipo: Feature / Bug / Analisi */}
          <div className="space-y-2">
            <Label>Tipo</Label>
            <input type="hidden" name="type" value={type} />
            <div className="flex gap-2">
              {TASK_TYPES.map((t) => {
                const active = type === t.value;
                const activeCls =
                  t.value === "bug"
                    ? "border-red-500 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/40 dark:text-red-400"
                    : t.value === "analysis"
                    ? "border-violet-500 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-400"
                    : "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-400";
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                      active
                        ? activeCls
                        : "border-input bg-background text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    {t.value === "bug" ? (
                      <Bug className="h-3.5 w-3.5" />
                    ) : t.value === "analysis" ? (
                      <FileSearch className="h-3.5 w-3.5" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Descrizione */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={task?.description ?? ""}
              placeholder="Dettagli del task…"
            />
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="notes">Note</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={task?.notes ?? ""}
              placeholder="Appunti, link, promemoria…"
            />
          </div>

          {/* Priorità */}
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

          {/* ── Assegnazione progetti (modalità home) ── */}
          {isHomeMode && (
            <div className="space-y-2">
              <Label>
                Progetti{" "}
                <span className="text-muted-foreground font-normal">(almeno uno)</span>
              </Label>
              {activeProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nessun progetto attivo disponibile.
                </p>
              ) : (
                <div
                  className={cn(
                    "rounded-lg border p-3 space-y-2",
                    homeError && "border-destructive"
                  )}
                >
                  {activeProjects.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="project_ids"
                        value={p.id}
                        checked={selectedHomeIds.includes(p.id)}
                        onChange={() => toggleHomeId(p.id)}
                        className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                      />
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: resolveProjectColor({
                            language: p.language,
                            framework: p.framework,
                            fallback: p.color,
                          }),
                        }}
                      />
                      <span
                        className={cn(
                          "text-sm",
                          selectedHomeIds.includes(p.id)
                            ? "font-medium"
                            : "text-muted-foreground"
                        )}
                      >
                        {p.name}
                      </span>
                    </label>
                  ))}
                  {homeError && (
                    <p className="text-xs text-destructive pt-1">
                      Seleziona almeno un progetto.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Cross-funzionale (modalità project) ── */}
          {!isHomeMode && !isEdit && otherProjects.length > 0 && (
            <div className="rounded-lg border p-3 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="is_cross_functional"
                  value="true"
                  checked={isCross}
                  onChange={(e) => {
                    setIsCross(e.target.checked);
                    if (!e.target.checked) setSelectedCrossIds([]);
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
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="cross_project_ids"
                        value={p.id}
                        checked={selectedCrossIds.includes(p.id)}
                        onChange={() => toggleCrossId(p.id)}
                        className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                      />
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: resolveProjectColor({
                            language: p.language,
                            framework: p.framework,
                            fallback: p.color,
                          }),
                        }}
                      />
                      <span
                        className={cn(
                          "text-sm",
                          selectedCrossIds.includes(p.id)
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

          {/* Cross-funzionale in edit: mostra sempre se ci sono altri progetti */}
          {!isHomeMode && isEdit && otherProjects.length > 0 && (
            <div className="rounded-lg border p-3 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="is_cross_functional"
                  value="true"
                  checked={isCross}
                  onChange={(e) => {
                    setIsCross(e.target.checked);
                    if (!e.target.checked) setSelectedCrossIds([]);
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
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="cross_project_ids"
                        value={p.id}
                        checked={selectedCrossIds.includes(p.id)}
                        onChange={() => toggleCrossId(p.id)}
                        className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                      />
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: resolveProjectColor({
                            language: p.language,
                            framework: p.framework,
                            fallback: p.color,
                          }),
                        }}
                      />
                      <span
                        className={cn(
                          "text-sm",
                          selectedCrossIds.includes(p.id)
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
              {pending
                ? "Salvataggio…"
                : isEdit
                ? "Salva"
                : "Aggiungi task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
