"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createProject, updateProject } from "@/lib/actions";
import {
  FRAMEWORK_OPTIONS,
  LANGUAGE_OPTIONS,
  PROJECT_COLORS,
  TECHNOLOGY_OPTIONS,
  TOOL_OPTIONS,
  type Project,
} from "@/lib/types";
import { cn, slugify } from "@/lib/utils";
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
import { TechMultiSelect } from "@/components/tech-multi-select";
import { GithubAuthButton } from "@/components/github-auth-button";

export function ProjectDialog({
  trigger,
  project,
  github,
}: {
  trigger: React.ReactNode;
  project?: Project;
  /** Stato del collegamento GitHub dell'utente (solo per la creazione). */
  github?: { connected: boolean; login: string | null };
}) {
  const router = useRouter();
  const isEdit = !!project;
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState<string>(
    project?.color ?? PROJECT_COLORS[5]
  );
  const [technologies, setTechnologies] = useState<string[]>(
    project?.technologies ?? []
  );
  const [tools, setTools] = useState<string[]>(project?.tools ?? []);
  const [name, setName] = useState<string>(project?.name ?? "");
  const [githubMode, setGithubMode] = useState<"none" | "create" | "link">("none");
  const [pending, setPending] = useState(false);

  const githubConnected = github?.connected ?? false;
  const canLinkRepo = !isEdit && githubConnected;

  async function handleAction(formData: FormData) {
    setPending(true);
    try {
      if (isEdit) {
        await updateProject(project.id, formData);
      } else {
        const result = await createProject(formData);
        if (result?.githubError) {
          // Il progetto è stato creato; segnalo solo il problema sul repo.
          alert(`Progetto creato, ma il repository GitHub no.\n\n${result.githubError}`);
        }
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
        if (o) {
          setColor(project?.color ?? PROJECT_COLORS[5]);
          setTechnologies(project?.technologies ?? []);
          setTools(project?.tools ?? []);
          setName(project?.name ?? "");
          setGithubMode("none");
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
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
              value={name}
              onChange={(e) => setName(e.target.value)}
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
            <Label>
              Colore{" "}
              <span className="font-normal text-muted-foreground">
                (fallback: il pallino usa il colore del linguaggio, se impostato)
              </span>
            </Label>
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

          {/* ── Metadati tecnici ── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="framework">Framework</Label>
              <Input
                id="framework"
                name="framework"
                list="framework-options"
                defaultValue={project?.framework ?? ""}
                placeholder="Es. Next.js"
              />
              <datalist id="framework-options">
                {FRAMEWORK_OPTIONS.map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Linguaggio</Label>
              <Input
                id="language"
                name="language"
                list="language-options"
                defaultValue={project?.language ?? ""}
                placeholder="Es. TypeScript"
              />
              <datalist id="language-options">
                {LANGUAGE_OPTIONS.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </div>
          </div>

          <TechMultiSelect
            name="technologies"
            label="Tecnologie connesse"
            options={TECHNOLOGY_OPTIONS}
            value={technologies}
            onChange={setTechnologies}
            placeholder="Aggiungi una tecnologia…"
          />

          <TechMultiSelect
            name="tools"
            label="Strumenti"
            options={TOOL_OPTIONS}
            value={tools}
            onChange={setTools}
            placeholder="Aggiungi uno strumento…"
          />

          {/* ── Repository GitHub (solo in creazione) ── */}
          {!isEdit && (
            <div className="space-y-3 rounded-lg border p-3">
              {canLinkRepo ? (
                <>
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={githubMode !== "none"}
                      onChange={(e) =>
                        setGithubMode(e.target.checked ? "link" : "none")
                      }
                      className="mt-0.5 h-4 w-4"
                    />
                    <span className="text-sm">
                      <span className="font-medium">Collega repository GitHub</span>
                      <span className="block text-xs text-muted-foreground">
                        Account <span className="font-medium">@{github?.login}</span>
                      </span>
                    </span>
                  </label>

                  <input
                    type="hidden"
                    name="github_action"
                    value={githubMode !== "none" ? githubMode : ""}
                  />

                  {githubMode !== "none" && (
                    <div className="space-y-3 pl-6">
                      {/* Selezione modalità */}
                      <div className="flex gap-4">
                        <label className="flex cursor-pointer items-center gap-1.5 text-sm">
                          <input
                            type="radio"
                            checked={githubMode === "link"}
                            onChange={() => setGithubMode("link")}
                            className="h-3.5 w-3.5"
                          />
                          Associa esistente
                        </label>
                        <label className="flex cursor-pointer items-center gap-1.5 text-sm">
                          <input
                            type="radio"
                            checked={githubMode === "create"}
                            onChange={() => setGithubMode("create")}
                            className="h-3.5 w-3.5"
                          />
                          Crea nuovo
                        </label>
                      </div>

                      {githubMode === "link" && (
                        <div className="space-y-1.5">
                          <Label htmlFor="github_repo_url_input" className="text-xs">
                            URL del repository GitHub
                          </Label>
                          <Input
                            id="github_repo_url_input"
                            name="github_repo_url_input"
                            placeholder="https://github.com/owner/nome-repo"
                            type="url"
                          />
                        </div>
                      )}

                      {githubMode === "create" && (
                        <>
                          <div className="space-y-1.5">
                            <Label htmlFor="github_repo_name" className="text-xs">
                              Nome repository
                            </Label>
                            <Input
                              id="github_repo_name"
                              name="github_repo_name"
                              defaultValue=""
                              placeholder={slugify(name) || "nome-repository"}
                            />
                            <p className="text-xs text-muted-foreground">
                              Lascia vuoto per usare{" "}
                              <code className="rounded bg-muted px-1">
                                {slugify(name) || "nome-progetto"}
                              </code>
                              .
                            </p>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Visibilità</Label>
                            <Select name="github_visibility" defaultValue="private">
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="private">Privato</SelectItem>
                                <SelectItem value="public">Pubblico</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-start gap-2">
                  <p className="text-sm font-medium">Repository su GitHub</p>
                  <p className="text-xs text-muted-foreground">
                    Collega GitHub per poter creare o associare un repository al progetto.
                  </p>
                  <GithubAuthButton label="Collega GitHub" next="/" />
                </div>
              )}
            </div>
          )}

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
