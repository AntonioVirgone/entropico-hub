# Creare task da AI

Documentazione tecnica della feature **Creare task da AI**: permette all'agente
di coding (modalità assistita) di **creare, aggiornare di stato e modificare i
task** di un progetto via REST mentre lavora.

---

## Contesto

Le Route API per gestire i task erano già esposte (introdotte per l'app mobile)
e autenticate con i **token personali** (`Authorization: Bearer`). Quello che
mancava era renderle **note all'agente**: il prompt generato in modalità
assistita non spiegava che il modello può registrare follow-up o aggiornare lo
stato dei task durante il lavoro.

Questa feature **non duplica** gli endpoint: riusa quelli esistenti e li
documenta dentro il prompt dell'agente, iniettando `project_id`, `task_id`
corrente e Base URL della web app.

## API disponibili (riepilogo)

Tutte richiedono l'header `Authorization: Bearer <token>` (token generato dalla
pagina **Token API**) e `Content-Type: application/json`. Le operazioni sono
limitate ai progetti dell'utente proprietario del token.

| Operazione | Metodo & path | Body |
|------------|---------------|------|
| **Crea task** | `POST /api/projects/{projectId}/tasks` | `{ title, description?, notes?, priority?, type? }` |
| **Elenca task** | `GET /api/projects/{projectId}/tasks?status=&priority=` | — |
| **Cambia stato** | `PATCH /api/tasks/{taskId}/status` | `{ project_id, status }` |
| **Modifica task** | `PATCH /api/tasks/{taskId}` | `{ project_id, title, description?, notes?, priority?, type? }` |
| **Elimina task** | `DELETE /api/tasks/{taskId}` | `{ project_id }` |

- `priority`: `low | medium | high` (default `medium`)
- `type`: `feature | bug | analysis` (default `feature`)
- `status`: `todo | in_progress | done`
- Valori non validi di `priority`/`type` ricadono sul default; uno `status` non
  valido restituisce `400`.

Lo **stato** è gestito per progetto tramite la junction `task_cross_projects`
(vedi `CLAUDE.md`): per questo gli endpoint di stato/modifica richiedono sempre
il `project_id` di riferimento.

### Codici di risposta

- `200/201` — esito ok, con `{ "data": ... }`
- `400` — body JSON non valido o campi obbligatori mancanti
- `401` — token assente o non valido
- `404` — progetto o task non appartenenti all'utente / non collegati al progetto
- `500/503` — errore DB o service role non configurato

## Integrazione nel prompt dell'agente

Il prompt generato da `buildAgentPrompt` (`src/lib/agent-prompt.ts`) include ora
una sezione **"API GESTIONE TASK"** con:

- Base URL della web app (da `NEXT_PUBLIC_APP_URL`, altrimenti un placeholder),
- `project_id` del progetto e `task_id` del task corrente,
- l'elenco degli endpoint con i body attesi,
- un esempio `curl` per creare un follow-up,
- il suggerimento di portare il task a `in_progress`/`done`.

Per sicurezza il **token non viene incorporato** nel prompt copiato: l'agente lo
legge dalla variabile d'ambiente `ENTROPICO_API_TOKEN` che l'utente imposta nel
proprio shell. La Base URL invece è pubblica e viene scritta direttamente negli
esempi quando `NEXT_PUBLIC_APP_URL` è configurata.

### Configurazione

| Variabile | Dove | Scopo |
|-----------|------|-------|
| `NEXT_PUBLIC_APP_URL` | `.env.local` / Vercel | URL pubblico della web app usato negli esempi del prompt. Opzionale: senza, compare un placeholder. |
| `ENTROPICO_API_TOKEN` | shell locale dell'agente | Token personale per autenticare le chiamate REST. |

## Modifiche al codice

| File | Modifica |
|------|----------|
| `src/lib/agent-prompt.ts` | `AgentPromptInput` ora include `task.id`, `project.id` e `appUrl`; nuova `taskApiSection()` aggiunta in fondo al prompt. |
| `src/lib/agent-actions.ts` | `prepareAgentTask` seleziona anche `tasks.id`, legge `NEXT_PUBLIC_APP_URL` e passa `task.id`, `project.id`, `appUrl` al builder. |
| `.env.example` | Documentata la nuova variabile opzionale `NEXT_PUBLIC_APP_URL`. |

> Gli endpoint REST (`/api/projects/[id]/tasks`, `/api/tasks/[taskId]`,
> `/api/tasks/[taskId]/status`) erano già presenti e non sono stati modificati.

## Come verificare

### Prompt
1. Imposta `NEXT_PUBLIC_APP_URL` in `.env.local` (es. `http://localhost:3000`).
2. Avvia l'app, apri un task e premi **Agente AI → Prepara branch e prompt**.
3. Nel prompt generato deve comparire la sezione **"API GESTIONE TASK"** con
   `project_id`, `task_id` e gli endpoint compilati con la Base URL.

### Endpoint (con un token personale)
```bash
export BASE="http://localhost:3000"
export TOKEN="<token generato dalla pagina Token API>"
PID="<project_id>"

# Crea
curl -s -X POST "$BASE/api/projects/$PID/tasks" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Follow-up dall’agente","type":"feature","priority":"medium"}'

# Cambia stato (usa l’id restituito dalla create)
curl -s -X PATCH "$BASE/api/tasks/<taskId>/status" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"project_id\":\"$PID\",\"status\":\"in_progress\"}"

# Modifica
curl -s -X PATCH "$BASE/api/tasks/<taskId>" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"project_id\":\"$PID\",\"title\":\"Titolo aggiornato\",\"priority\":\"high\"}"
```

### Verifica tecnica eseguita
- `npx tsc --noEmit` ed `eslint` puliti sui file modificati.
- Rendering del prompt verificato: la sezione API compare con i valori iniettati.
- Flusso end-to-end provato contro il server locale con un token reale:
  **create → status (in_progress) → modify (stato preservato)** ok, e `401`
  senza token. I dati di test sono stati rimossi.
