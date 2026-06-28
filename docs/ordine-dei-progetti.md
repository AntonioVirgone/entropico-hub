# Ordine dei progetti

Documentazione tecnica della feature **Ordine dei progetti**: aggiunge alla home
un selettore per ordinare la griglia dei progetti per **data di creazione**,
**ordine alfabetico** o **ultimo task creato**.

---

## Obiettivo

In precedenza i progetti erano mostrati sempre in ordine di creazione (più
recenti prima), senza possibilità di cambiarlo. Ora l'utente può scegliere il
criterio di ordinamento tramite un controllo "Ordina" nell'intestazione della
sezione Progetti.

## Criteri di ordinamento

| Valore (`?sort=`) | Etichetta UI         | Comportamento                                                        |
|-------------------|----------------------|---------------------------------------------------------------------|
| `created` (default) | Data di creazione  | Progetti dal più recente al più vecchio (ordine della query).       |
| `alpha`           | Ordine alfabetico    | Per nome, A→Z, case-insensitive e locale `it`.                      |
| `last_task`       | Ultimo task creato   | Per data del task più recente del progetto, dal più recente. I progetti senza task finiscono in fondo. |

L'ordinamento è applicato **sia ai progetti attivi sia a quelli archiviati**,
in modo indipendente per le due sezioni.

## Scelte di design

- **Stato nella query string (`?sort=`)** invece che in uno stato client o nel
  database. Vantaggi: il riordino resta lato server (coerente con la convenzione
  del progetto "tutti i read sono Server Components"), l'URL è condivisibile e
  segnalibile, e non serve persistenza aggiuntiva.
- **Default implicito**: quando il criterio è `created` il parametro viene
  rimosso dall'URL, così la home resta pulita (`/`).
- **Nessuna astrazione prematura**: la logica di ordinamento è una semplice
  funzione pura `sortProjects()` nella pagina; l'ordine `created` sfrutta quello
  già restituito da `getProjects()` senza ri-ordinare.

## Modifiche al codice

| File | Modifica |
|------|----------|
| `src/lib/types.ts` | Nuovi `ProjectSort`, `PROJECT_SORT_OPTIONS`, `DEFAULT_PROJECT_SORT`. |
| `src/lib/queries.ts` | Nuova `getLastTaskCreatedAt()`: mappa `projectId → data del task più recente`. |
| `src/components/project-sort.tsx` | Nuovo controllo client (shadcn `Select`) che aggiorna `?sort=` via `router.push`. |
| `src/app/page.tsx` | Legge `searchParams.sort`, carica le date ultimo-task e ordina attivi/archiviati con `sortProjects()`. |

### `getLastTaskCreatedAt()`

Legge dalla junction `task_cross_projects` con select annidata `tasks(created_at)`
e riduce in memoria al massimo `created_at` per `project_id`. Usa la junction
(come i conteggi task) così include anche i **task cross-funzionali**. I progetti
senza task non compaiono nella mappa e vengono ordinati per ultimi.

> Nota: la relazione `task_id → tasks` è uno-a-uno ma il client Supabase la
> tipizza come array; il codice gestisce entrambe le forme per robustezza.

### `sortProjects(items, sort, lastTaskAt)`

Funzione pura che non muta l'input:

- `alpha` → `localeCompare(name, "it", { sensitivity: "base" })`.
- `last_task` → confronto discendente sulle date ISO; progetti senza task in coda.
- `created` → nessun riordino (già ordinati dalla query).

## Come verificare

1. Avvia l'app (`npm run dev`) ed effettua il login.
2. Nella home, sezione **Progetti**, usa il menu **Ordina** in alto a destra.
3. Controlla che:
   - **Data di creazione**: progetti dal più recente; l'URL torna `/`.
   - **Ordine alfabetico**: progetti A→Z; URL `/?sort=alpha`.
   - **Ultimo task creato**: in cima il progetto col task più recente, in fondo
     quelli senza task; URL `/?sort=last_task`.
4. L'ordinamento si applica anche alla sezione **Archiviati**.

### Verifica tecnica eseguita

- `npx tsc --noEmit` e `eslint` puliti sui file modificati.
- La query annidata `task_cross_projects?select=project_id,tasks(created_at)` è
  stata validata contro il database reale, confermando la forma del dato e un
  ordinamento `last_task` coerente.
