# Entropico Hub

Dashboard personale per gestire i progetti e le relative todolist (board Kanban).
**Multi-utente con dati isolati per utente** (Supabase Auth, registrazione a invito).

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · Supabase (Postgres + Auth) · Vercel.

## Funzionalità

- **Autenticazione** email+password **o GitHub (OAuth)** (Supabase Auth). Accesso a invito (account creati dall'amministratore, niente self-signup). Ogni utente vede e gestisce solo i propri dati (RLS per-utente).
- **Creazione repository GitHub dal progetto**: chi accede con GitHub può, alla creazione di un progetto, generare anche il repository remoto sul proprio account (visibilità privata/pubblica a scelta, inizializzato con README e descrizione). Il link al repo è mostrato su card e header del progetto.
- Dashboard con elenco progetti (nome, descrizione, colore, stato attivo/archiviato, avanzamento task).
- Creazione / modifica / archiviazione / eliminazione progetti.
- **Metadati tecnici** per progetto: framework, linguaggio, tecnologie connesse (Supabase, Vercel, Render…) e strumenti (Docker, GitHub…). Catalogo predefinito con possibilità di aggiungere valori custom; visualizzati come badge su card e header del progetto.
- **Colori in base allo stack (stile GitHub)**: i badge dello stack mostrano il colore di brand della tecnologia (palette *linguist*), e il pallino identificativo del progetto deriva dal **linguaggio principale** (fallback: framework → colore scelto a mano).
- Board Kanban per progetto con 3 colonne: **Da fare → In corso → Fatto**.
- Task con titolo, descrizione, note e priorità (Bassa / Media / Alta).
- Spostamento dei task tra colonne con i pulsanti freccia.
- **Backlog idee** (pagina dedicata `/idee`): memo per annotare nuovi progetti da realizzare anche in futuro. Entità autonoma, scollegata dalle todo-list: ogni idea ha titolo, descrizione, priorità e stato (Idea → In valutazione → Approvata → Promossa / Scartata). Da un'idea si può **promuovere a progetto** (crea un progetto precompilato, senza collegamenti automatici).
- **Layout a web app** con menu di navigazione: sidebar su desktop, barra di navigazione su mobile. Sezioni: **Dashboard** (`/`) e **Backlog idee** (`/idee`).
- **Documentazione progetti**: ogni progetto ha un archivio di documenti (Markdown o testo) con anteprima renderizzata. Creazione/modifica/eliminazione dalla UI, **import di un file `.md`/`.txt`** dal dialog, **e** upload/consultazione via **API a token personali** (pensata per far caricare e leggere a Claude la doc del progetto).
- **Token API personali** (pagina `/token`): ogni utente genera i propri token Bearer (mostrati una sola volta, in DB solo l'hash) e li revoca quando vuole. L'API documentazione è autenticata con questi token e limitata ai progetti dell'utente.

---

## 1. Setup Supabase

1. Crea un progetto su [supabase.com](https://supabase.com).
2. Vai su **SQL Editor → New query**, incolla il contenuto di [`supabase/schema.sql`](supabase/schema.sql) e premi **Run**. Esegui poi, in ordine, le migration in `supabase/` (tutte idempotenti):
   - `migration_task_type.sql`, `migration_cross_functional.sql`
   - `migration_project_ideas.sql` (Backlog idee)
   - `migration_project_tech.sql` (metadati tecnici)
   - `migration_auth.sql` (autenticazione + RLS per-utente — vedi sotto)
   - `migration_project_documents.sql` (documentazione progetti)
   - `migration_documents_unique_slug.sql` (unicità slug per progetto → upsert atomico)
   - `migration_api_tokens.sql` (token API personali)
   - `migration_github.sql` (login GitHub + creazione repository — vedi §5)
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
```

> L'autenticazione dell'API non usa più `DOCS_API_KEY`: ogni utente genera i
> propri **token personali** dalla pagina **Token API** (`/token`) della web app.

## 3. Deploy su Vercel

1. Importa il repository GitHub `AntonioVirgone/entropico-hub` su [vercel.com](https://vercel.com).
2. In **Settings → Environment Variables** aggiungi `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Production + Preview). Per l'API documentazione aggiungi anche `SUPABASE_SERVICE_ROLE_KEY`.
3. Deploy. Vercel rileva Next.js automaticamente (nessuna configurazione extra).

## 4. API documentazione (token personali)

L'API è autenticata con un **token personale**: generalo dalla pagina **Token API**
(`/token`) della web app — viene mostrato una sola volta — ed esportalo:

```bash
export EH_TOKEN=eh_xxxxxxxxxxxxxxxxxxxx
```

**Caricare un documento** (assegnato a un tuo progetto):

```bash
curl -X POST "https://<dominio>/api/projects/<PROJECT_ID>/documents" \
  -H "Authorization: Bearer $EH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "title": "Architettura", "content": "# ...", "format": "markdown", "upsert": true }'
```

**Consultare i documenti**:

```bash
# Elenco (aggiungi ?include=content per il contenuto completo)
curl -s "https://<dominio>/api/projects/<PROJECT_ID>/documents" -H "Authorization: Bearer $EH_TOKEN"

# Singolo documento per slug
curl -s "https://<dominio>/api/projects/<PROJECT_ID>/documents/<slug>" -H "Authorization: Bearer $EH_TOKEN"
```

- **Auth**: header `Authorization: Bearer <token personale>`. Il token identifica l'utente; ogni operazione è limitata ai **suoi** progetti (progetti altrui → `404`).
- **`upsert: true`**: sovrascrive (in modo atomico) il documento con lo stesso slug (derivato dal titolo); altrimenti ne crea uno nuovo.
- La lettura/scrittura usa la *service role key* (bypassa l'RLS) **solo dopo** aver risolto il token e verificato l'ownership del progetto. Il `PROJECT_ID` e snippet pronti (incluso un loop per caricare tutti i `.md`) sono nel pannello "Carica e consulta i documenti via API" della pagina del progetto.

> 🔒 I token sono salvati solo come **hash SHA-256**; il valore in chiaro è mostrato una sola volta. Revoca un token in qualsiasi momento dalla pagina Token API.

## 5. Login e repository GitHub

Permette di **accedere con GitHub** e, alla creazione di un progetto, di
**generare il repository remoto** sull'account dell'utente.

**Configurazione (una tantum):**

1. **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**:
   - *Homepage URL*: il dominio dell'app (es. `https://<dominio>`).
   - *Authorization callback URL*: l'URL di callback **di Supabase**
     `https://<project-ref>.supabase.co/auth/v1/callback`.
   - Copia **Client ID** e genera un **Client Secret**.
2. **Supabase → Authentication → Providers → GitHub**: abilita il provider e
   incolla Client ID/Secret. In **Authentication → URL Configuration** aggiungi
   il dominio dell'app (e `http://localhost:3000` per lo sviluppo) tra i
   *Redirect URLs*.
3. Esegui la migration [`migration_github.sql`](supabase/migration_github.sql).

**Come funziona:**

- Il pulsante **"Accedi con GitHub"** avvia l'OAuth con scope `repo` (serve per
  creare repo, anche privati). Al ritorno, la route `/auth/callback` scambia il
  codice per la sessione e **cattura il token GitHub** — Supabase lo espone solo
  in quel momento — salvandolo in `github_credentials` (per-utente, RLS).
- Nel dialog **Nuovo progetto**, se sei collegato a GitHub, spunti *"Crea anche
  il repository su GitHub"*, scegli nome e visibilità: l'app crea il repo via API
  GitHub (`POST /user/repos`, `auto_init`) e ne salva l'URL sul progetto.

> 🔒 Il token GitHub è letto **solo lato server** e non è mai inviato al browser.
> È memorizzato in chiaro nella tabella `github_credentials` (isolata via RLS):
> per un irrobustimento futuro si può cifrarlo con Supabase Vault. Revoca
> l'accesso da **GitHub → Settings → Applications** quando vuoi.

---

## Struttura

```
src/
  proxy.ts                    # protezione route + refresh sessione (ex-middleware)
  app/
    page.tsx                  # dashboard progetti
    login/page.tsx            # accesso (email+password o GitHub)
    auth/callback/route.ts    # callback OAuth (cattura il token GitHub)
    idee/page.tsx             # Backlog idee (nuovi progetti)
    token/page.tsx            # Token API personali
    projects/[id]/page.tsx    # board Kanban del progetto
    api/projects/[id]/documents/  # API doc (route + [slug]) a token personali
    layout.tsx, globals.css   # shell con sidebar/menu (auth-aware)
  components/
    ui/                       # primitive shadcn/ui
    app-sidebar.tsx, mobile-nav.tsx   # navigazione + logout
    project-card.tsx, project-dialog.tsx
    github-auth-button.tsx    # login/collegamento GitHub (OAuth)
    task-card.tsx, task-dialog.tsx, kanban-board.tsx
    idea-card.tsx, idea-dialog.tsx
  lib/
    supabase/                 # client server/browser/service + env + proxy (helper)
    queries.ts                # letture
    actions.ts                # Server Actions (mutazioni)
    auth-actions.ts           # logout
    token-actions.ts          # crea/revoca token API
    api-token.ts              # generazione/hash token (server)
    api-auth.ts               # auth Route API via token personale
    github.ts                 # client API GitHub (creazione repo)
    types.ts                  # tipi e costanti
    nav.ts                    # voci del menu principale
supabase/
  schema.sql                  # schema DB da eseguire su Supabase
  migration_*.sql             # migration incrementali (idempotenti)
```

## Idee per le prossime versioni

- Drag & drop dei task tra colonne.
- Scadenze, etichette, ricerca/filtri.
- Realtime (Supabase Realtime) per aggiornamenti live.
