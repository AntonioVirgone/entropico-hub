# API epiche (create/modifica/elimina)

Documentazione tecnica delle Route API pubbliche per gestire le epiche di un
progetto, usate insieme a quelle dei task (`docs/creare-task-da-ai.md`) per
permettere a un agente di coding di lavorare su un progetto Entropico senza
passare dalla web app.

## Contesto

I task vivono sempre dentro un'epica (struttura Jira-like introdotta con
"struttura epiche come raccolta di task"). Prima di queste route, le epiche
erano gestibili solo dalla web app (Server Actions `createEpic`, `updateEpic`,
`moveEpic`, `deleteEpic` in `src/lib/actions.ts`): un agente che lavorava via
API poteva solo creare task, mai le epiche che dovrebbero contenerli — il che
lo spingeva a creare task "sciolti" (vedi `docs/epica-generica.md` per come
questi vengono comunque recuperati in automatico, come rete di sicurezza).

## Autenticazione

Stessa di tutte le altre API: header `Authorization: Bearer <token>` (token
personale generato dalla pagina "Token API"), risolto via
`authenticateApiRequest` (`src/lib/api-auth.ts`). Operazioni limitate ai
progetti dell'utente proprietario del token (`projectBelongsToUser`).

## Endpoint

| Operazione | Metodo & path | Body | File |
|------------|---------------|------|------|
| Crea epica | `POST /api/projects/{projectId}/epics` | `{ title, description? }` | `src/app/api/projects/[id]/epics/route.ts` |
| Elenca epiche | `GET /api/projects/{projectId}/epics` | — | idem |
| Modifica epica | `PATCH /api/epics/{epicId}` | `{ project_id, title?, description?, status? }` | `src/app/api/epics/[epicId]/route.ts` |
| Elimina epica | `DELETE /api/epics/{epicId}` | `{ project_id }` | idem |

- `status`: `todo | in_progress | test | done` (stesso set di `TaskStatus`).
- La creazione imposta `status: "todo"` e calcola `position` in coda alle
  epiche esistenti del progetto (stessa logica di `createEpic`).
- `PATCH` aggiorna solo i campi presenti nel body (nessun campo → `400`).
- `DELETE` fallisce con `409` se l'epica contiene ancora task (stesso
  controllo di `deleteEpic`): vanno riassegnati o eliminati prima.
- Non è previsto un endpoint per eliminare/proteggere esplicitamente l'epica
  generica (`is_generic`, vedi `docs/epica-generica.md`): segue le stesse
  regole di qualunque altra epica, e viene ricreata automaticamente al bisogno
  se un task la richiede di nuovo.

## Come verificare

```bash
export BASE="http://localhost:3000"
export TOKEN="<token generato dalla pagina Token API>"
PID="<project_id>"

# Crea un'epica
EPIC_ID=$(curl -s -X POST "$BASE/api/projects/$PID/epics" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Epica di test"}' | jq -r '.data.id')

# Elenca le epiche
curl -s "$BASE/api/projects/$PID/epics" -H "Authorization: Bearer $TOKEN"

# Crea un task dentro quell'epica
curl -s -X POST "$BASE/api/projects/$PID/tasks" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"title\":\"Task di test\",\"epic_id\":\"$EPIC_ID\"}"

# Modifica l'epica
curl -s -X PATCH "$BASE/api/epics/$EPIC_ID" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"project_id\":\"$PID\",\"status\":\"in_progress\"}"

# Elimina l'epica (fallisce con 409 finché contiene il task creato sopra)
curl -s -X DELETE "$BASE/api/epics/$EPIC_ID" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"project_id\":\"$PID\"}"
```
