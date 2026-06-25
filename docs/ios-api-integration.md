# Entropico Hub — Guida integrazione API per app iOS

Documento tecnico per lo sviluppatore iOS. Descrive tutti gli endpoint REST esposti dal backend Next.js, il modello dati, le convenzioni e i casi limite da gestire lato client.

---

## Indice

1. [Architettura generale](#architettura-generale)
2. [Autenticazione](#autenticazione)
3. [Convenzioni comuni](#convenzioni-comuni)
4. [Modello dati](#modello-dati)
5. [Endpoint — Progetti](#endpoint--progetti)
6. [Endpoint — Task](#endpoint--task)
7. [Casi limite e comportamenti critici](#casi-limite-e-comportamenti-critici)
8. [Flussi d'uso consigliati](#flussi-duso-consigliati)

---

## Architettura generale

Il backend è un'applicazione **Next.js** (App Router) deployata su Vercel, con database **Supabase** (PostgreSQL). L'app è mono-operatore: un singolo utente autenticato possiede tutti i dati.

```
App iOS
  → REST API (/api/*)          ← qui si integra l'app iOS
      → Supabase (PostgreSQL)
```

Base URL di produzione: da richiedere all'operatore (es. `https://entropico-hub.vercel.app`).

---

## Autenticazione

Tutte le API richiedono un **token personale** generato dall'utente nella pagina `/token` dell'app web.

### Header richiesto

```
Authorization: Bearer <token>
```

Il token viene mostrato **una sola volta** alla creazione. Se perso va rigenerato. Conservarlo in modo sicuro (iOS Keychain).

### Risposta in caso di errore auth

```json
// 401 Unauthorized
{ "error": "Non autorizzato." }
```

### Come salvare il token nell'app

Usare sempre **iOS Keychain** (`kSecClassGenericPassword`), mai `UserDefaults`. Il token è una credenziale sensibile.

---

## Convenzioni comuni

### Formato richieste

- Content-Type: `application/json`
- Body: JSON per POST e PATCH
- Path params: UUID v4

### Formato risposte

Tutte le risposte sono JSON. In caso di successo:

```json
{ "data": ... }          // risorsa singola
{ "data": [ ... ] }      // lista
```

In caso di errore:

```json
{ "error": "Messaggio leggibile." }
```

### Codici HTTP

| Codice | Significato |
|--------|-------------|
| `200` | OK — operazione riuscita |
| `201` | Created — risorsa creata |
| `400` | Bad Request — parametri mancanti o non validi |
| `401` | Unauthorized — token assente o non valido |
| `404` | Not Found — risorsa non esiste o non appartiene all'utente |
| `500` | Internal Server Error — errore lato server |

### Campi date

Tutte le date sono stringhe **ISO 8601** in UTC: `"2026-06-25T10:30:00.000Z"`.

### UUID

Tutti gli `id` sono UUID v4: `"550e8400-e29b-41d4-a716-446655440000"`.

---

## Modello dati

### Project

```typescript
{
  id: string                    // UUID
  name: string
  description: string | null
  color: string                 // hex, es. "#3b82f6"
  status: "active" | "archived"
  framework: string | null      // es. "Next.js", "Flutter"
  language: string | null       // es. "TypeScript", "Swift"
  technologies: string[]        // es. ["Supabase", "Vercel"]
  tools: string[]               // es. ["GitHub", "Docker"]
  github_repo_url: string | null
  github_repo_full_name: string | null
  created_at: string            // ISO 8601
  updated_at: string            // ISO 8601
}
```

### Task

```typescript
{
  id: string                      // UUID
  project_id: string              // UUID — progetto in cui il task è stato CREATO
  title: string
  description: string | null
  notes: string | null
  priority: "low" | "medium" | "high"
  type: "feature" | "bug" | "analysis"
  status: "todo" | "in_progress" | "done"  // ⚠️ contestuale al progetto richiesto
  position: number
  is_cross_functional: boolean
  cross_project_ids: string[]     // UUID dei progetti collegati (incluso quello primario)
  created_at: string
  updated_at: string
}
```

> **⚠️ Nota critica su `status`:** il campo `status` di un task NON è globale. È specifico per il progetto con cui lo hai richiesto. Lo stesso task in due progetti diversi può avere stati diversi. Vedi [sezione task cross-funzionali](#task-cross-funzionali).

---

## Endpoint — Progetti

### GET /api/projects

Lista tutti i progetti dell'utente.

**Query params opzionali:**

| Param | Valori | Default |
|-------|--------|---------|
| `status` | `active` \| `archived` | tutti |

**Risposta 200:**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Entropico Hub",
      "description": "Dashboard personale",
      "color": "#3b82f6",
      "status": "active",
      "framework": "Next.js",
      "language": "TypeScript",
      "technologies": ["Supabase", "Vercel"],
      "tools": ["GitHub"],
      "github_repo_url": "https://github.com/user/repo",
      "github_repo_full_name": "user/repo",
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-06-25T10:00:00.000Z"
    }
  ]
}
```

---

### GET /api/projects/:id

Singolo progetto.

**Risposta 200:** stessa struttura del singolo elemento dell'array sopra.

**Risposta 404:** progetto non esiste o non appartiene all'utente.

---

### PATCH /api/projects/:id

Aggiorna i metadati di un progetto. Tutti i campi sono opzionali — invia solo quelli da modificare.

**Body:**

```json
{
  "name": "Nuovo nome",
  "description": "Descrizione aggiornata",
  "color": "#22c55e",
  "framework": "Next.js",
  "language": "TypeScript",
  "technologies": ["Supabase", "Vercel", "Redis"],
  "tools": ["GitHub", "Docker"]
}
```

**Risposta 200:**

```json
{ "data": { /* progetto aggiornato */ } }
```

---

### PATCH /api/projects/:id/status

Cambia lo stato del progetto tra `active` e `archived`.

**Body:**

```json
{ "status": "archived" }
```

**Risposta 200:**

```json
{ "data": { "id": "uuid", "status": "archived" } }
```

---

## Endpoint — Task

### GET /api/projects/:projectId/tasks

Lista tutti i task visibili in un progetto (inclusi i task cross-funzionali collegati). Il campo `status` di ogni task è lo status **specifico per questo progetto**.

**Query params opzionali:**

| Param | Valori | Default |
|-------|--------|---------|
| `status` | `todo` \| `in_progress` \| `done` | tutti |
| `priority` | `low` \| `medium` \| `high` | tutti |

**Risposta 200:**

```json
{
  "data": [
    {
      "id": "uuid",
      "project_id": "uuid-progetto-primario",
      "title": "Implementa login",
      "description": "Con Supabase Auth",
      "notes": null,
      "priority": "high",
      "type": "feature",
      "status": "in_progress",
      "position": 0,
      "is_cross_functional": false,
      "cross_project_ids": ["uuid-progetto-primario"],
      "created_at": "2026-06-01T00:00:00.000Z",
      "updated_at": "2026-06-25T10:00:00.000Z"
    }
  ]
}
```

---

### POST /api/projects/:projectId/tasks

Crea un nuovo task nel progetto. Il task viene creato con status `todo`.

**Body:**

```json
{
  "title": "Titolo del task",
  "description": "Descrizione opzionale",
  "notes": "Note opzionali",
  "priority": "medium",
  "type": "feature"
}
```

| Campo | Tipo | Obbligatorio | Default |
|-------|------|--------------|---------|
| `title` | string | ✅ | — |
| `description` | string \| null | ❌ | null |
| `notes` | string \| null | ❌ | null |
| `priority` | `"low"` \| `"medium"` \| `"high"` | ❌ | `"medium"` |
| `type` | `"feature"` \| `"bug"` \| `"analysis"` | ❌ | `"feature"` |

**Risposta 201:**

```json
{ "data": { /* task creato con status "todo" */ } }
```

---

### PATCH /api/tasks/:taskId

Aggiorna i campi di un task (titolo, descrizione, note, priorità, tipo). **Non aggiorna lo status** — usa l'endpoint dedicato sotto.

**Body:**

```json
{
  "project_id": "uuid-del-progetto-corrente",
  "title": "Titolo aggiornato",
  "description": "Nuova descrizione",
  "notes": null,
  "priority": "high",
  "type": "bug"
}
```

> **`project_id` è obbligatorio** — indica il contesto progetto in cui si sta lavorando. Deve essere l'UUID del progetto visualizzato nell'app, non necessariamente `task.project_id`.

**Risposta 200:**

```json
{ "data": { /* task aggiornato */ } }
```

---

### PATCH /api/tasks/:taskId/status

Cambia lo status di un task nel contesto di un progetto specifico. Questa è l'operazione che corrisponde al drag-and-drop tra colonne del kanban.

**Body:**

```json
{
  "project_id": "uuid-del-progetto-corrente",
  "status": "in_progress"
}
```

> **⚠️ `project_id` è obbligatorio e critico.** Aggiorna lo status del task SOLO per quel progetto. Se il task è cross-funzionale, gli altri progetti mantengono il loro status invariato. Passa sempre il `project_id` del board/progetto che l'utente sta guardando, non `task.project_id`.

**Risposta 200:**

```json
{ "data": { "id": "uuid", "project_id": "uuid", "status": "in_progress" } }
```

---

### DELETE /api/tasks/:taskId

Elimina un task. Se il task è cross-funzionale, viene rimosso da tutti i progetti collegati.

**Body:**

```json
{ "project_id": "uuid-del-progetto-corrente" }
```

**Risposta 200:**

```json
{ "data": { "deleted": true } }
```

---

## Casi limite e comportamenti critici

### Task cross-funzionali

Un task con `is_cross_functional: true` appare in più progetti contemporaneamente, ognuno con il proprio `status` indipendente.

- `task.project_id` = il progetto in cui il task è stato **creato** (non necessariamente quello visualizzato)
- `task.cross_project_ids` = array di tutti i `project_id` in cui il task è visibile
- `task.status` nella risposta = lo status nel **progetto richiesto** nella query (`GET /api/projects/:projectId/tasks`)

**Regola pratica per l'app iOS:** usa sempre il `projectId` dal contesto di navigazione corrente (il progetto che l'utente sta guardando) quando chiami `PATCH /status` o `DELETE`, indipendentemente da `task.project_id`.

### Status validi

```
todo  →  in_progress  →  done
```

Non ci sono vincoli sulle transizioni: si può passare da qualsiasi stato a qualsiasi altro.

### Eliminazione task

L'eliminazione è **permanente e irreversibile**. Non esiste soft-delete. Mostrare una conferma all'utente prima di chiamare `DELETE`.

### Colori progetto

Il campo `color` è un hex RGB (`#rrggbb`). Alcuni colori standard usati nell'app:

```
#ef4444  #f97316  #eab308  #22c55e
#06b6d4  #3b82f6  #8b5cf6  #ec4899
```

Il client iOS può usarli come palette di scelta o accettare qualsiasi hex valido.

---

## Flussi d'uso consigliati

### Avvio app

```
1. GET /api/projects?status=active     → carica lista progetti attivi
2. (utente seleziona un progetto)
3. GET /api/projects/:id/tasks         → carica i task del progetto selezionato
```

### Cambio status task (es. swipe o tap su chip stato)

```
1. PATCH /api/tasks/:taskId/status
   Body: { "project_id": "<progetto corrente>", "status": "done" }
2. Aggiorna localmente il task nella lista (no reload necessario)
```

### Crea task

```
1. POST /api/projects/:projectId/tasks
   Body: { "title": "...", "priority": "high", "type": "feature" }
2. Inserisci il task restituito in cima alla colonna "todo"
```

### Modifica task

```
1. PATCH /api/tasks/:taskId
   Body: { "project_id": "<progetto corrente>", "title": "...", ... }
2. Aggiorna localmente il task
```

### Elimina task

```
1. Mostra alert di conferma
2. DELETE /api/tasks/:taskId
   Body: { "project_id": "<progetto corrente>" }
3. Rimuovi il task dalla lista locale
```

### Archivia progetto

```
1. PATCH /api/projects/:id/status
   Body: { "status": "archived" }
2. Rimuovi il progetto dalla lista dei progetti attivi
```

---

## Note per lo sviluppo

- **Timeout consigliato:** 15 secondi per tutte le chiamate API.
- **Retry:** in caso di errore `500` o timeout di rete, un retry singolo con backoff di 2 secondi è appropriato. Non ritentare mai operazioni `DELETE`.
- **Ottimistic update:** per `PATCH /status` si consiglia l'aggiornamento ottimistico della UI: mostra subito il nuovo stato e rollback in caso di errore.
- **Ordinamento task:** i task vengono restituiti ordinati per `position` ascendente, poi per `created_at` ascendente. Rispetta quest'ordine nella UI per consistenza con la web app.
- **Paginazione:** non implementata nella v1 — tutti i task di un progetto vengono restituiti in una singola chiamata.
