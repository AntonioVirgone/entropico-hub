"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GitBranch } from "lucide-react";

import { createGithubRepo, linkExistingRepo } from "@/lib/actions";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { GithubAuthButton } from "@/components/github-auth-button";

export function GitHubRepoButton({
  projectId,
  project,
  github,
}: {
  projectId: string;
  project: { name: string; description: string | null };
  github: { connected: boolean; login: string | null };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"link" | "create">("link");
  const [repoUrl, setRepoUrl] = useState("");
  const [repoName, setRepoName] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpen(val: boolean) {
    setOpen(val);
    if (val) {
      setMode("link");
      setRepoUrl("");
      setRepoName("");
      setVisibility("private");
      setError(null);
    }
  }

  async function handleLink() {
    if (!repoUrl.trim()) {
      setError("Inserisci l'URL del repository.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await linkExistingRepo(projectId, repoUrl.trim());
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  async function handleCreate() {
    setPending(true);
    setError(null);
    try {
      const result = await createGithubRepo(projectId, {
        name: project.name,
        description: project.description,
        repoName: repoName.trim(),
        isPrivate: visibility !== "public",
      });
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => handleOpen(true)}>
        <GitBranch /> Collega repo
      </Button>

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent
          className="max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Collega repository GitHub</DialogTitle>
          </DialogHeader>

          {!github.connected ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Connetti il tuo account GitHub per creare o associare un repository.
              </p>
              <GithubAuthButton label="Collega GitHub" next={`/projects/${projectId}`} />
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Account <span className="font-medium">@{github.login}</span>
              </p>

              {/* Selezione modalità */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setMode("link"); setError(null); }}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    mode === "link"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-foreground/50"
                  }`}
                >
                  Associa esistente
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("create"); setError(null); }}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    mode === "create"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-foreground/50"
                  }`}
                >
                  Crea nuovo
                </button>
              </div>

              {mode === "link" && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="repo-url">URL del repository GitHub</Label>
                    <Input
                      id="repo-url"
                      placeholder="https://github.com/owner/nome-repo"
                      type="url"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                    />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button onClick={handleLink} disabled={pending} className="w-full">
                    {pending ? "Collegamento…" : "Collega repository"}
                  </Button>
                </div>
              )}

              {mode === "create" && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-repo-name">Nome repository</Label>
                    <Input
                      id="new-repo-name"
                      placeholder={slugify(project.name) || "nome-repository"}
                      value={repoName}
                      onChange={(e) => setRepoName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Lascia vuoto per usare{" "}
                      <code className="rounded bg-muted px-1">
                        {slugify(project.name) || "nome-progetto"}
                      </code>
                      .
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Visibilità</Label>
                    <Select value={visibility} onValueChange={setVisibility}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">Privato</SelectItem>
                        <SelectItem value="public">Pubblico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button onClick={handleCreate} disabled={pending} className="w-full">
                    {pending ? "Creazione…" : "Crea repository"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
