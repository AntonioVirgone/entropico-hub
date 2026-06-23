"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createBranch, getRepoDefaultBranch, GithubError } from "@/lib/github";
import { buildAgentPrompt } from "@/lib/agent-prompt";
import { slugify } from "@/lib/utils";
import type { TaskType } from "@/lib/types";

/**
 * Modalità assistita (Fase 1): non chiama nessun modello a pagamento.
 * Prepara il branch giusto sul repo del progetto (se collegato) e costruisce
 * un prompt pronto da incollare in Claude Code, che l'utente lancia in locale.
 */

export interface AgentTaskPlan {
  taskTitle: string;
  taskType: TaskType;
  repoFullName: string | null;
  repoUrl: string | null;
  branch: string | null;
  branchCreated: boolean;
  defaultBranch: string | null;
  prompt: string;
  warning: string | null;
}

/** Prefisso del branch in base al tipo di task. */
function branchPrefix(type: TaskType): string {
  if (type === "bug") return "fix";
  if (type === "analysis") return "docs";
  return "feature";
}

export async function prepareAgentTask(
  taskId: string,
  projectId: string
): Promise<AgentTaskPlan> {
  const supabase = await createSupabaseServerClient();

  const { data: task, error: taskErr } = await supabase
    .from("tasks")
    .select("title, description, notes, type")
    .eq("id", taskId)
    .maybeSingle();
  if (taskErr) throw new Error(taskErr.message);
  if (!task) throw new Error("Task non trovato.");

  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select(
      "name, framework, language, technologies, tools, github_repo_full_name, github_repo_url"
    )
    .eq("id", projectId)
    .maybeSingle();
  if (projErr) throw new Error(projErr.message);
  if (!project) throw new Error("Progetto non trovato.");

  const type = task.type as TaskType;
  const slug = slugify(task.title) || "task";
  const branchName = `${branchPrefix(type)}/${slug}`;

  const repoFullName = (project.github_repo_full_name as string | null) ?? null;
  const repoUrl = (project.github_repo_url as string | null) ?? null;

  let branch: string | null = null;
  let branchCreated = false;
  let defaultBranch: string | null = null;
  let warning: string | null = null;

  if (repoFullName) {
    const { data: cred } = await supabase
      .from("github_credentials")
      .select("access_token")
      .maybeSingle();

    if (cred?.access_token) {
      try {
        defaultBranch = await getRepoDefaultBranch(cred.access_token, repoFullName);
        const res = await createBranch(
          cred.access_token,
          repoFullName,
          branchName,
          defaultBranch
        );
        branch = branchName;
        branchCreated = res.created;
      } catch (e) {
        warning =
          e instanceof GithubError
            ? `Branch non creato (${e.message}). Crealo a mano.`
            : "Branch non creato per un errore imprevisto.";
      }
    } else {
      warning =
        "GitHub non collegato: branch non creato. Collega GitHub dal menu o crea il branch a mano.";
    }
  } else {
    warning =
      "Nessun repository collegato a questo progetto: niente branch automatico.";
  }

  const prompt = buildAgentPrompt({
    task: {
      title: task.title as string,
      description: (task.description as string | null) ?? null,
      notes: (task.notes as string | null) ?? null,
      type,
    },
    project: {
      name: project.name as string,
      framework: (project.framework as string | null) ?? null,
      language: (project.language as string | null) ?? null,
      technologies: (project.technologies as string[] | null) ?? [],
      tools: (project.tools as string[] | null) ?? [],
    },
    repoFullName,
    repoUrl,
    branch,
    defaultBranch,
  });

  return {
    taskTitle: task.title as string,
    taskType: type,
    repoFullName,
    repoUrl,
    branch,
    branchCreated,
    defaultBranch,
    prompt,
    warning,
  };
}
