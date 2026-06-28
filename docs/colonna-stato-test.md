# Colonna stato Test

Documentazione tecnica della feature **Colonna stato Test**: aggiunge uno stato
intermedio **Test** al flusso dei task, così un task concluso passa prima in
validazione e solo dopo viene marcato come completato.

---

## Obiettivo

Nuovo flusso degli stati:

```
todo  →  in_progress  →  test  →  done
```

Quando il lavoro su un task è concluso, il task va in **Test** per essere
validato; superata la validazione viene spostato in **Fatto (done)**.

## Semantica

- Un task in **test** è considerato **non completato**: non rientra nel conteggio
  "task completati" della card progetto e, se ad alta priorità, continua a
  comparire nella tabella "Alta priorità" finché non è `done`.
- Lo stato è gestito **per progetto** tramite la junction `task_cross_projects`
  (modello autoritativo, vedi `CLAUDE.md`): per i task cross-funzionali lo stato
  `test` è indipendente in ogni progetto.

## Modifiche al codice

| File | Modifica |
|------|----------|
| `src/lib/types.ts` | `TaskStatus` include `"test"`; `TASK_STATUSES` ha la voce `{ value: "test", label: "Test" }` tra `in_progress` e `done`. |
| `src/components/kanban-board.tsx` | Griglia delle colonne da 3 a 4 (`md:grid-cols-2 lg:grid-cols-4`). Le colonne sono generate da `TASK_STATUSES`, quindi la nuova compare in automatico. |
| `src/components/kanban-column.tsx` | `STATUS_DOT` con il colore della colonna Test (`bg-amber-500`). |
| `src/components/task-card.tsx` | `STATUS_ORDER` aggiornato: le frecce avanti/indietro seguono il nuovo flusso. |
| `src/components/high-priority-tasks.tsx` | Etichetta e stile del badge per lo stato `test` (un task in test può comparire nella tabella). |
| `src/app/api/tasks/[taskId]/status/route.ts` | Validazione: `test` è ora uno status accettato (`400` aggiornato). |
| `src/app/api/projects/[id]/tasks/route.ts` | Il filtro `?status=` accetta anche `test`. |
| `src/lib/agent-prompt.ts` | Riferimento API: gli status validi includono `test`. |
| `supabase/schema.sql` | CHECK su `tasks.status` aggiornato (nuove installazioni). |
| `supabase/migration_task_status_test.sql` | **Nuova migration** per i DB esistenti. |

I colori usati: la colonna/badge **Test** è ambra (`amber`), distinta da
`in_progress` (blu) e `done` (verde).

## Database — migration obbligatoria

Lo stato `test` è bloccato da due vincoli `CHECK` finché la migration non viene
applicata. Esegui nel **SQL Editor di Supabase** (idempotente):

```sql
-- supabase/migration_task_status_test.sql
alter table public.task_cross_projects
  drop constraint if exists task_cross_projects_status_check;
alter table public.task_cross_projects
  add constraint task_cross_projects_status_check
  check (status in ('todo', 'in_progress', 'test', 'done'));

alter table public.tasks
  drop constraint if exists tasks_status_check;
alter table public.tasks
  add constraint tasks_status_check
  check (status in ('todo', 'in_progress', 'test', 'done'));
```

> `task_cross_projects.status` è lo stato autoritativo (quello che cambia
> trascinando il task); `tasks.status` è la colonna legacy ma ha comunque un
> CHECK da allineare. **Senza questa migration**, spostare un task nella colonna
> Test fallisce e la board annulla lo spostamento.

## Come verificare

1. Applica la migration `migration_task_status_test.sql` su Supabase.
2. `npm run dev`, login, apri un progetto.
3. La board mostra **4 colonne**: Da fare · In corso · Test · Fatto.
4. Trascina un task da **In corso** a **Test**: lo spostamento persiste (refresh).
5. Sulla card, le frecce avanti/indietro seguono il flusso
   `todo → in_progress → test → done`.
6. Un task in **Test** non incrementa la percentuale "task completati" della card
   progetto finché non passa in **Fatto**.

### API
```bash
# cambia stato in 'test'
curl -s -X PATCH "$BASE/api/tasks/<taskId>/status" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"project_id\":\"<projectId>\",\"status\":\"test\"}"
```

### Verifica tecnica eseguita
- `npm run build` (TypeScript) e `eslint` puliti sui file modificati (l'unico
  warning di lint preesistente in `kanban-board.tsx` non è introdotto da questa
  feature).
- Confermato sul DB reale che senza migration i vincoli
  `tasks_status_check` e `task_cross_projects_status_check` rifiutano `test`
  (errore `23514`); la migration allinea entrambi.
