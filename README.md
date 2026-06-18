# Entropico Hub

Dashboard personale per gestire i progetti e le relative todolist (board Kanban).
Operatore singolo, **nessuna autenticazione** in questa versione.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · Supabase (Postgres) · Vercel.

## Funzionalità

- Dashboard con elenco progetti (nome, descrizione, colore, stato attivo/archiviato, avanzamento task).
- Creazione / modifica / archiviazione / eliminazione progetti.
- Board Kanban per progetto con 3 colonne: **Da fare → In corso → Fatto**.
- Task con titolo, descrizione, note e priorità (Bassa / Media / Alta).
- Spostamento dei task tra colonne con i pulsanti freccia.
- **Backlog idee**: sezione in cima alla dashboard per annotare nuovi progetti da realizzare anche in futuro. Entità autonoma, scollegata dalle todo-list: ogni idea ha titolo, descrizione, priorità e stato (Idea → In valutazione → Approvata → Promossa / Scartata). Da un'idea si può **promuovere a progetto** (crea un progetto precompilato, senza collegamenti automatici).

---

## 1. Setup Supabase

1. Crea un progetto su [supabase.com](https://supabase.com).
2. Vai su **SQL Editor → New query**, incolla il contenuto di [`supabase/schema.sql`](supabase/schema.sql) e premi **Run**. Crea le tabelle `projects` e `tasks`, i trigger e le policy RLS. Esegui poi le migration in `supabase/` (tra cui [`migration_project_ideas.sql`](supabase/migration_project_ideas.sql) per il Backlog idee); sono idempotenti.
3. Recupera le chiavi:
   - **URL**: Project Settings → *Data API* → Project URL.
   - **publishable key**: Project Settings → *API Keys* → chiave `publishable` (formato `sb_publishable_…`). In alternativa va bene anche la legacy `anon` / `public`.

> ⚠️ **Sicurezza**: in questa v1 l'accesso è aperto — la anon key può leggere/scrivere tutti i dati e non c'è login. Tieni l'URL dell'app riservato. Quando aggiungerai le utenze, sostituisci le policy RLS in `schema.sql` con regole basate su `auth.uid()`.

## 2. Sviluppo in locale

```bash
npm install
cp .env.example .env.local   # poi inserisci URL e anon key
npm run dev
```

App su [http://localhost:3000](http://localhost:3000).

Variabili d'ambiente (`.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...   # oppure NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## 3. Deploy su Vercel

1. Importa il repository GitHub `AntonioVirgone/entropico-hub` su [vercel.com](https://vercel.com).
2. In **Settings → Environment Variables** aggiungi `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Production + Preview).
3. Deploy. Vercel rileva Next.js automaticamente (nessuna configurazione extra).

---

## Struttura

```
src/
  app/
    page.tsx                  # dashboard progetti
    projects/[id]/page.tsx    # board Kanban del progetto
    layout.tsx, globals.css
  components/
    ui/                       # primitive shadcn/ui
    project-card.tsx, project-dialog.tsx
    task-card.tsx, task-dialog.tsx, kanban-board.tsx
  lib/
    supabase.ts               # client (anon key, lazy)
    queries.ts                # letture
    actions.ts                # Server Actions (mutazioni)
    types.ts                  # tipi e costanti
supabase/
  schema.sql                  # schema DB da eseguire su Supabase
```

## Idee per le prossime versioni

- Autenticazione (Supabase Auth) e policy RLS per utente.
- Drag & drop dei task tra colonne.
- Scadenze, etichette, ricerca/filtri.
- Realtime (Supabase Realtime) per aggiornamenti live.
