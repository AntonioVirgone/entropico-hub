# Scaffolding `entropico/` nei repository GitHub creati

Documentazione tecnica della feature che arricchisce la creazione automatica
del repository GitHub (in fase di creazione progetto) con credenziali
placeholder e istruzioni per le API di Entropico.

## Contesto

Prima di questa feature, `createGithubRepoForProject` (`src/lib/actions.ts`)
creava il repo con `createUserRepo(..., autoInit: true)` (`src/lib/github.ts`):
GitHub genera da solo un README minimale e nient'altro. Un agente che avesse
iniziato a lavorare sul nuovo repo non aveva alcun contesto su come registrare
epiche/task per quel progetto tramite le API di Entropico.

## Soluzione

Subito dopo la creazione del repo (`scaffoldEntropicoFiles` in
`src/lib/actions.ts`), vengono scritti 4 file via
`createRepoFile` (nuova funzione in `src/lib/github.ts`, che usa
`PUT /repos/{full_name}/contents/{path}` — un commit per file):

| File | Contenuto |
|------|-----------|
| `.gitignore` | Elenca `entropico/api-token` e `entropico/project-id` |
| `entropico/api-token` | Vuoto |
| `entropico/project-id` | Vuoto |
| `entropico/istruzioni.md` | Guida autosufficiente per l'agente (vedi sotto) |

Contenuti costruiti in `src/lib/entropico-scaffold.ts`
(`buildEntropicoGitignore`, `buildEntropicoInstructions`).

`entropico/istruzioni.md` include: cosa sono i due file, come ottenere un
token personale ("Token API" nella web app), l'id del progetto Entropico già
compilato, tabella endpoint REST (stessa di `docs/creare-task-da-ai.md`),
esempi `curl` che leggono i file (`TOKEN=$(cat entropico/api-token)`).

Lo scaffolding non è bloccante: se la scrittura dei file fallisce, il
repository e il progetto restano comunque creati/collegati — l'errore viene
riportato in coda al messaggio già esistente "Repository creato ma...".

## Nota di sicurezza: perché i file sono vuoti e il limite del `.gitignore`

I due file sono committati **vuoti** insieme al `.gitignore` che li elenca.
`.gitignore` impedisce a git di tracciare file **non ancora tracciati** — ma
questi due, essendo già stati committati (anche se vuoti), restano tracciati:
se l'agente li valorizza con credenziali reali, git li vedrebbe comunque come
"modificati". Per questo `entropico/istruzioni.md` istruisce esplicitamente a
eseguire una tantum, prima di scriverci dentro segreti reali:

```bash
git rm --cached entropico/api-token entropico/project-id
git commit -m "Smetti di tracciare i file entropico locali"
```

Da quel momento git li ignora davvero. Il documento avverte anche che, se in
futuro uno strumento di scaffolding (es. `create-next-app`) rigenera il
`.gitignore` del progetto, vanno riverificate le due voci prima di ogni commit
successivo.

## Come verificare

1. Configura `NEXT_PUBLIC_APP_URL` (opzionale: altrimenti negli esempi del
   documento compare un placeholder).
2. Crea un nuovo progetto dalla web app con "crea repository GitHub".
3. Sul repo creato su GitHub, verifica la presenza di: `.gitignore` (con le
   due voci), `entropico/api-token` (vuoto), `entropico/project-id` (vuoto),
   `entropico/istruzioni.md` con `project_id` già compilato e la Base URL
   corretta negli esempi.
4. Verifica che un errore nella scrittura dei file (es. token GitHub senza
   permessi sufficienti) non impedisca comunque la creazione/collegamento del
   repository al progetto.
