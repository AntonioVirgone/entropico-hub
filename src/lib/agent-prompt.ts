import type { TaskType } from "@/lib/types";

/**
 * Costruisce il prompt "pronto all'uso" da incollare in Claude Code per far
 * lavorare l'agente sul task. È pensato per la modalità assistita (Fase 1):
 * l'agente gira in locale, sotto l'abbonamento dell'utente, e segue queste
 * istruzioni operando sul branch indicato.
 */

export interface AgentPromptInput {
  task: {
    id: string;
    title: string;
    description: string | null;
    notes: string | null;
    type: TaskType;
  };
  project: {
    id: string;
    name: string;
    framework: string | null;
    language: string | null;
    technologies: string[];
    tools: string[];
  };
  repoFullName: string | null;
  repoUrl: string | null;
  branch: string | null;
  defaultBranch: string | null;
  /** URL pubblico della web app per le chiamate REST (null se non configurato). */
  appUrl: string | null;
}

function objectiveFor(type: TaskType): string {
  switch (type) {
    case "analysis":
      return [
        "Obiettivo (ANALISI):",
        "- Analizza la parte di codebase rilevante per il task.",
        "- Produci un documento Markdown chiaro e completo sotto `docs/` (crea la cartella se manca).",
        "- Il documento deve essere autosufficiente: contesto, struttura, decisioni, eventuali rischi.",
        "- NON modificare codice applicativo: questo è un task di sola documentazione.",
      ].join("\n");
    case "bug":
      return [
        "Obiettivo (BUG FIX):",
        "- Riproduci e individua la causa del bug descritto.",
        "- Applica la correzione minima e mirata, senza refactor non richiesti.",
        "- Aggiungi/aggiorna un test che copra il caso, se il progetto ha test.",
      ].join("\n");
    case "feature":
    default:
      return [
        "Obiettivo (SVILUPPO):",
        "- Implementa la feature descritta seguendo le convenzioni del progetto.",
        "- Fai la cosa più semplice che funziona; niente astrazioni premature.",
        "- Aggiorna/integra i test e la documentazione se pertinente.",
      ].join("\n");
  }
}

/**
 * Sezione che spiega all'agente come creare/aggiornare task sul progetto via
 * REST mentre lavora (es. registrare follow-up scoperti, segnare lo stato).
 * Gli endpoint sono quelli già esposti dalla web app e autenticati con il
 * token personale via header `Authorization: Bearer`.
 */
function taskApiSection(input: AgentPromptInput): string {
  const { task, project, appUrl } = input;
  const base = appUrl ?? "https://entropico-hub.vercel.app/";

  return [
    "── API GESTIONE TASK (opzionale, mentre lavori) ──",
    "Puoi creare e aggiornare i task di questo progetto via REST: utile per",
    "registrare i follow-up che scopri e per aggiornare lo stato del lavoro.",
    "",
    "Configura una volta sola nel tuo shell (il token si genera dalla pagina",
    '"Token API" della web app):',
    "```bash",
    `export ENTROPICO_API_TOKEN="<il-tuo-token>"`,
    "```",
    "Riferimenti di questo task:",
    `- Base URL:   ${base}`,
    `- project_id: ${project.id}`,
    `- task_id (task corrente): ${task.id}`,
    "Autenticazione: header `Authorization: Bearer $ENTROPICO_API_TOKEN` (Content-Type: application/json).",
    "",
    "Endpoint disponibili:",
    `- Crea task:      POST  ${base}/api/projects/${project.id}/tasks`,
    `                  body: { "title", "description"?, "notes"?, "priority"? (low|medium|high), "type"? (feature|bug|analysis) }`,
    `- Cambia stato:   PATCH ${base}/api/tasks/<task_id>/status`,
    `                  body: { "project_id": "${project.id}", "status": "todo|in_progress|test|done" }`,
    `- Modifica task:  PATCH ${base}/api/tasks/<task_id>`,
    `                  body: { "project_id": "${project.id}", "title", "description"?, "notes"?, "priority"?, "type"? }`,
    `- Elenca task:    GET   ${base}/api/projects/${project.id}/tasks`,
    "",
    "Esempio — crea un follow-up scoperto durante il lavoro:",
    "```bash",
    `curl -s -X POST "${base}/api/projects/${project.id}/tasks" \\`,
    `  -H "Authorization: Bearer $ENTROPICO_API_TOKEN" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '{"title":"Follow-up: …","type":"feature","priority":"medium"}'`,
    "```",
    "Suggerimento: porta questo task a `in_progress` quando inizi e, se appropriato, a `done` alla fine.",
  ].join("\n");
}

export function buildAgentPrompt(input: AgentPromptInput): string {
  const { task, project, repoFullName, repoUrl, branch, defaultBranch } = input;

  const stack = [
    project.framework && `Framework: ${project.framework}`,
    project.language && `Linguaggio: ${project.language}`,
    project.technologies.length > 0 && `Tecnologie: ${project.technologies.join(", ")}`,
    project.tools.length > 0 && `Strumenti: ${project.tools.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");

  const lines: string[] = [];

  lines.push(`Sei un agente di coding che lavora sul progetto "${project.name}".`);
  if (stack) lines.push("", "Stack del progetto:", stack);

  if (repoFullName) {
    lines.push("", "Repository:", `- ${repoUrl ?? repoFullName} (${repoFullName})`);
    if (branch) {
      lines.push(
        "",
        "Branch su cui lavorare (già creato sul remoto):",
        "```bash",
        "git fetch origin",
        `git checkout ${branch}`,
        "```",
        `Esegui TUTTE le modifiche su \`${branch}\`. Non committare mai su \`${defaultBranch ?? "main"}\`.`
      );
    } else {
      lines.push(
        "",
        "Nota: il branch non è stato creato automaticamente. Crea un branch dedicato prima di iniziare e non committare su main."
      );
    }
  } else {
    lines.push(
      "",
      "Nota: nessun repository collegato. Se applicabile, lavora nel repo locale del progetto su un branch dedicato."
    );
  }

  lines.push("", "── TASK ──", `Titolo: ${task.title}`);
  if (task.description) lines.push("", "Descrizione:", task.description);
  if (task.notes) lines.push("", "Note:", task.notes);

  lines.push("", objectiveFor(task.type));

  lines.push(
    "",
    "Istruzioni operative:",
    "1. Esplora il codice necessario prima di modificare.",
    "2. Lavora solo sul branch indicato.",
    "3. Fai commit piccoli e con messaggi chiari.",
    "4. Esegui lint/test del progetto se disponibili.",
    branch
      ? "5. Al termine, pusha il branch e apri una Pull Request verso il branch di default, riassumendo cosa hai fatto e come verificarlo."
      : "5. Al termine, riassumi cosa hai fatto e come verificarlo.",
    "6. Crea una documentazione tecnica relativa alle modifiche fatte e salvala nella cartella docs del progetto con il nome della feature appena svolta. Se la cartella docs non esiste creala. La documentazione deve essere sempre in formato .md"
  );

  lines.push("", taskApiSection(input));

  return lines.join("\n");
}
