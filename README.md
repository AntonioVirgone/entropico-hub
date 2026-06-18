# Entropico Hub

Dashboard personale per gestire i progetti e le relative todolist (board Kanban).
**Multi-utente con dati isolati per utente** (Supabase Auth, registrazione a invito).

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · Supabase (Postgres + Auth) · Vercel.

## Funzionalità

- **Autenticazione** email+password (Supabase Auth). Accesso a invito (account creati dall'amministratore, niente self-signup). Ogni utente vede e gestisce solo i propri dati (RLS per-utente).
- Dashboard con elenco progetti (nome, descrizione, colore, stato attivo/archiviato, avanzamento task).
- Creazione / modifica / archiviazione / eliminazione progetti.
- **Metadati tecnici** per progetto: framework, linguaggio, tecnologie connesse (Supabase, Vercel, Render…) e strumenti (Docker, GitHub…). Catalogo predefinito con possibilità di aggiungere valori custom; visualizzati come badge su card e header del progetto.
- Board Kanban per progetto con 3 colonne: **Da fare → In corso → Fatto**.
- Task con titolo, descrizione, note e priorità (Bassa / Media / Alta).
- Spostamento dei task tra colonne con i pulsanti freccia.
- **Backlog idee** (pagina dedicata `/idee`): memo per annotare nuovi progetti da realizzare anche in futuro. Entità autonoma, scollegata dalle todo-list: ogni idea ha titolo, descrizione, priorità e stato (Idea → In valutazione → Approvata → Promossa / Scartata). Da un'idea si può **promuovere a progetto** (crea un progetto precompilato, senza collegamenti automatici).
- **Layout a web app** con menu di navigazione: sidebar su desktop, barra di navigazione su mobile. Sezioni: **Dashboard** (`/`) e **Backlog idee** (`/idee`).
- **Documentazione progetti**: ogni progetto ha un archivio di documenti (Markdown o testo) con anteprima renderizzata. Creazione/modifica/eliminazione dalla UI **e** upload via **API protetta** (pensata per far caricare a Claude la doc generata, già assegnata al progetto).

---

## 1. Setup Supabase

1. Crea un progetto su [supabase.com](https://supabase.com).
2. Vai su **SQL Editor → New query**, incolla il contenuto di [`supabase/schema.sql`](supabase/schema.sql) e premi **Run**. Esegui poi, in ordine, le migration in `supabase/` (tutte idempotenti):
   - `migration_task_type.sql`, `migration_cross_functional.sql`
   - `migration_project_ideas.sql` (Backlog idee)
   - `migration_project_tech.sql` (metadati tecnici)
   - `migration_auth.sql` (autenticazione + RLS per-utente — vedi sotto)
   - `migration_project_documents.sql` (documentazione progetti)
3. Recupera le chiavi:
   - **URL**: Project Settings → *Data API* → Project URL.
   - **publishable key**: Project Settings → *API Keys* → chiave `publishable` (formato `sb_publishable_…`). In alternativa va bene anche la legacy `anon` / `public`.
4. **Crea il tuo utente** (registrazione a invito): **Authentication → Users → Add user** (email + password). Ripeti per ogni persona fidata.
5. **Attiva la sicurezza per-utente** seguendo [`migration_auth.sql`](supabase/migration_auth.sql):
   - *Fase A* (passi 1-6): colonne `owner_id`, default `auth.uid()`, policy RLS per-utente.
   - *Fase B* (passi 7-8): copia il tuo **UID** (Authentication → Users), incollalo nelle `UPDATE` di backfill per assegnarti i dati esistenti, poi rendi `owner_id` obbligatorio.

> 🔒 **Sicurezza**: dopo `migration_auth.sql` l'accesso anon è chiuso e ogni utente vede solo i propri dati (RLS basata su `auth.uid()`). La sessione vive in cookie HttpOnly gestiti da `@supabase/ssr`; le route sono protette dal proxy (`src/proxy.ts`).

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

# Solo per l'API documentazione (lato server, NON esporre):
SUPABASE_SERVICE_ROLE_KEY=...   # Project Settings > API Keys > service_role
DOCS_API_KEY=...                # segreto a tua scelta per autenticare l'API
```

## 3. Deploy su Vercel

1. Importa il repository GitHub `AntonioVirgone/entropico-hub` su [vercel.com](https://vercel.com).
2. In **Settings → Environment Variables** aggiungi `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Production + Preview). Per l'API documentazione aggiungi anche `SUPABASE_SERVICE_ROLE_KEY` e `DOCS_API_KEY`.
3. Deploy. Vercel rileva Next.js automaticamente (nessuna configurazione extra).

## 4. API documentazione

Carica un documento già assegnato a un progetto (utile per farlo fare a Claude):

```bash
curl -X POST "https://<dominio>/api/projects/<PROJECT_ID>/documents" \
  -H "Authorization: Bearer $DOCS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "title": "Architettura", "content": "# ...", "format": "markdown", "upsert": true }'
```

- **Auth**: header `Authorization: Bearer <DOCS_API_KEY>`. Senza `DOCS_API_KEY` configurata l'endpoint è disabilitato (503).
- **`upsert: true`**: sovrascrive il documento con lo stesso slug (derivato dal titolo); altrimenti ne crea uno nuovo.
- **`GET`** sullo stesso path elenca i documenti del progetto.
- La scrittura usa la *service role key* (bypassa l'RLS) **solo dopo** la verifica della chiave. Il `PROJECT_ID` è visibile nella pagina del progetto (pannello "Carica documenti via API").

> ⚠️ `DOCS_API_KEY` è una chiave a livello operatore: chi la possiede può scrivere su qualsiasi progetto. Per ambienti con più utenti, l'evoluzione naturale sono token API per-utente (v2).

---

## Struttura

```
src/
  proxy.ts                    # protezione route + refresh sessione (ex-middleware)
  app/
    page.tsx                  # dashboard progetti
    login/page.tsx            # accesso (email+password)
    idee/page.tsx             # Backlog idee (nuovi progetti)
    projects/[id]/page.tsx    # board Kanban del progetto
    layout.tsx, globals.css   # shell con sidebar/menu (auth-aware)
  components/
    ui/                       # primitive shadcn/ui
    app-sidebar.tsx, mobile-nav.tsx   # navigazione + logout
    project-card.tsx, project-dialog.tsx
    task-card.tsx, task-dialog.tsx, kanban-board.tsx
    idea-card.tsx, idea-dialog.tsx
  lib/
    supabase/                 # client server/browser + env + proxy (helper)
    queries.ts                # letture
    actions.ts                # Server Actions (mutazioni)
    auth-actions.ts           # logout
    types.ts                  # tipi e costanti
    nav.ts                    # voci del menu principale
supabase/
  schema.sql                  # schema DB da eseguire su Supabase
  migration_*.sql             # migration incrementali (idempotenti)
```

## Idee per le prossime versioni

- Storage documentazione per progetto + API di upload protetta.
- Drag & drop dei task tra colonne.
- Scadenze, etichette, ricerca/filtri.
- Realtime (Supabase Realtime) per aggiornamenti live.
