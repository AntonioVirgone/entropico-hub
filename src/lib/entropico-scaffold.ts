/**
 * Contenuti scaffoldati nella cartella `entropico/` dei repository GitHub
 * creati dalla web app, così l'agente che lavorerà sul nuovo progetto ha
 * subito credenziali (vuote, da valorizzare) e istruzioni per usare le API
 * di Entropico (creare epiche/task, aggiornarne lo stato) senza dover
 * chiedere contesto.
 */

/** Percorsi dei file che non devono mai finire tracciati con contenuto reale. */
export const ENTROPICO_GITIGNORE_ENTRIES = [
  "entropico/api-token",
  "entropico/project-id",
];

export function buildEntropicoGitignore(): string {
  return ENTROPICO_GITIGNORE_ENTRIES.join("\n") + "\n";
}

export function buildEntropicoInstructions(input: {
  projectId: string;
  projectName: string;
  appUrl: string | null;
}): string {
  const base = input.appUrl ?? "https://LA-TUA-APP";

  return [
    "# Entropico — API per epiche e task",
    "",
    `Questo repository è collegato al progetto **${input.projectName}** su Entropico Hub.`,
    "Questa cartella contiene tutto il necessario perché un agente di coding possa",
    "creare epiche e task per questo progetto tramite le API REST di Entropico,",
    "senza bisogno di ulteriore contesto.",
    "",
    "## File di questa cartella",
    "",
    "- `api-token` — vuoto. Va valorizzato con un token personale generato dalla",
    "  pagina **Token API** della web app Entropico (contenuto in chiaro: è un",
    "  segreto, non va mai loggato né incollato altrove).",
    "- `project-id` — vuoto. Va valorizzato con l'id di questo progetto Entropico:",
    `  \`${input.projectId}\``,
    "- `istruzioni.md` — questo documento.",
    "",
    "## Sicurezza: perché questi file sono vuoti e cosa fare prima di popolarli",
    "",
    "I due file sono stati committati **vuoti** al momento della creazione del",
    "repository, insieme a un `.gitignore` che li elenca:",
    "",
    "```",
    ...ENTROPICO_GITIGNORE_ENTRIES,
    "```",
    "",
    "Attenzione: `.gitignore` impedisce a git di tracciare file **non ancora",
    "tracciati** — ma questi due file sono già stati committati (vuoti), quindi",
    "git continuerebbe comunque a vederli come modificati se li valorizzi.",
    "Prima di scriverci dentro credenziali reali, esegui una tantum:",
    "",
    "```bash",
    "git rm --cached entropico/api-token entropico/project-id",
    'git commit -m "Smetti di tracciare i file entropico locali"',
    "```",
    "",
    "Da quel momento in poi git li ignora davvero e non finiranno in nessun",
    "commit futuro né su GitHub.",
    "",
    "Se in futuro uno strumento di scaffolding (es. `create-next-app` o simili)",
    "rigenera il `.gitignore` del progetto, **verifica che le due voci sopra",
    "siano ancora presenti** prima di fare qualunque commit successivo.",
    "",
    "## Autenticazione",
    "",
    "Tutte le chiamate richiedono l'header:",
    "",
    "```",
    "Authorization: Bearer <contenuto di entropico/api-token>",
    "Content-Type: application/json",
    "```",
    "",
    "Le operazioni sono limitate ai progetti di proprietà dell'utente a cui",
    "appartiene il token.",
    "",
    "## Endpoint disponibili",
    "",
    "| Operazione | Metodo & path | Body |",
    "|------------|---------------|------|",
    `| Crea task | \`POST ${base}/api/projects/{project_id}/tasks\` | \`{ title, description?, notes?, priority?, type? }\` |`,
    `| Elenca task | \`GET ${base}/api/projects/{project_id}/tasks?status=&priority=\` | — |`,
    `| Cambia stato task | \`PATCH ${base}/api/tasks/{task_id}/status\` | \`{ project_id, status }\` |`,
    `| Modifica task | \`PATCH ${base}/api/tasks/{task_id}\` | \`{ project_id, title, description?, notes?, priority?, type? }\` |`,
    `| Elimina task | \`DELETE ${base}/api/tasks/{task_id}\` | \`{ project_id }\` |`,
    "",
    "- `priority`: `low \\| medium \\| high` (default `medium`)",
    "- `type`: `feature \\| bug \\| analysis` (default `feature`)",
    "- `status`: `todo \\| in_progress \\| test \\| done`",
    "- Un task creato senza indicare un'epica finisce automaticamente in",
    "  un'epica generica del progetto (creata al bisogno): riassegnalo",
    "  all'epica corretta dalla web app quando serve.",
    "",
    "## Esempio — crea un task",
    "",
    "```bash",
    `PROJECT_ID="${input.projectId}"`,
    "TOKEN=$(cat entropico/api-token)",
    "",
    `curl -s -X POST "${base}/api/projects/$PROJECT_ID/tasks" \\`,
    '  -H "Authorization: Bearer $TOKEN" \\',
    '  -H "Content-Type: application/json" \\',
    "  -d '{\"title\":\"Nuovo task\",\"type\":\"feature\",\"priority\":\"medium\"}'",
    "```",
    "",
    "## Esempio — cambia stato",
    "",
    "```bash",
    `curl -s -X PATCH "${base}/api/tasks/<task_id>/status" \\`,
    '  -H "Authorization: Bearer $TOKEN" \\',
    '  -H "Content-Type: application/json" \\',
    `  -d "{\\"project_id\\":\\"$PROJECT_ID\\",\\"status\\":\\"in_progress\\"}"`,
    "```",
  ].join("\n");
}
