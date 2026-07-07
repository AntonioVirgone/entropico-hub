# Epica generica per task senza epica assegnata

Documentazione tecnica della feature che evita i task "orfani" (`epic_id = null`):
ora finiscono sempre in un'epica automatica del progetto, da cui l'operatore
può riassegnarli manualmente a quella corretta.

## Contesto

`tasks.epic_id` è nullable da `supabase/migration_epics.sql`. Diversi punti del
codice possono produrre `epic_id = null`:

- `POST /api/projects/{id}/tasks` (`src/app/api/projects/[id]/tasks/route.ts`):
  l'endpoint pubblico usato dall'agente AI (vedi `docs/creare-task-da-ai.md`)
  non gestiva affatto `epic_id`.
- `createTaskFromHome` (`src/lib/actions.ts`): se il progetto primario non ha
  ancora nessuna epica, il fallback era `null`.

I task con `epic_id = null` sono invisibili ai conteggi per-epica
(`getEpics` in `src/lib/queries.ts` li salta) e non compaiono in nessuna board
per-epica.

## Soluzione

Nuova colonna `epics.is_generic` (`supabase/migration_generic_epic.sql`), con
un indice unico parziale che garantisce **al più un'epica generica per
progetto**. La lookup usa il flag, non il titolo, così l'utente può rinominare
l'epica senza rompere il meccanismo.

Helper `ensureGenericEpic(supabase, projectId)` (`src/lib/actions.ts`): trova
l'epica generica del progetto o la crea (titolo "Generica") se manca. Usata:

- in `createTask` quando il form non specifica un'epica;
- in `createTaskFromHome` come fallback quando il progetto non ha epiche;
- in `POST /api/projects/{id}/tasks` per ogni task creato via API pubblica.

`updateTask` non è toccato: non azzera mai `epic_id` (e le epiche non si
possono eliminare finché hanno task, `ON DELETE RESTRICT`), quindi non è un
vettore per nuovi orfani.

## Migration da applicare

Eseguire `supabase/migration_generic_epic.sql` nel SQL Editor di Supabase.
Oltre alla colonna e all'indice, la migration:

1. marca come generica l'epica `"Generale"` già creata da
   `migration_epics.sql`, se presente;
2. crea (se manca) l'epica generica e riassegna i task già orfani rimasti nel
   database, per ogni progetto.

## Come verificare

1. Applica la migration.
2. Crea un task via API pubblica con un token personale:
   ```bash
   curl -s -X POST "$BASE/api/projects/$PID/tasks" \
     -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
     -d '{"title":"Task senza epica"}'
   ```
   Verifica che il task risulti nell'epica "Generica" del progetto (UI o
   query diretta) invece di avere `epic_id` null.
3. Ripeti la creazione: deve riusare la stessa epica generica, non crearne
   una seconda (verificabile anche via l'indice unico su `is_generic`).
4. Da un progetto senza epiche, crea un task dalla home (`createTaskFromHome`):
   deve finire nell'epica generica anziché con `epic_id` null.
