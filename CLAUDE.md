# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **IMPORTANT — non-standard Next.js version:** This project uses Next.js **16.2.9** (App Router). APIs, conventions, and file structure may differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing code that relies on Next.js internals. Heed deprecation notices.

## Commands

```bash
npm run dev      # dev server at http://localhost:3000
npm run build    # production build (also catches TypeScript errors)
npm run lint     # ESLint
```

No test suite exists in this project.

## Environment

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...   # or NEXT_PUBLIC_SUPABASE_ANON_KEY
```

For Vercel: set the same variables in **Settings → Environment Variables**. `.env.local` is never deployed.

## Architecture

Single-operator personal dashboard (no authentication). All reads are Server Components; all writes go through Server Actions.

### Data flow

```
Server Component (page.tsx)
  → queries.ts (reads Supabase directly)
  → renders Client Components (KanbanBoard, dialogs, cards)
      → lib/actions.ts (Server Actions called via form action or async fn)
          → revalidatePath() + router.refresh() = UI refresh
```

### Key files

| File | Role |
|------|------|
| `src/lib/types.ts` | All TypeScript types and display constants (`TASK_STATUSES`, `TASK_PRIORITIES`, `TASK_TYPES`) |
| `src/lib/supabase.ts` | Lazy singleton Supabase client; accepts both `PUBLISHABLE_KEY` and `ANON_KEY` env var names |
| `src/lib/queries.ts` | All read queries — never called from Client Components |
| `src/lib/actions.ts` | All Server Actions (mutations); always end with `revalidatePath()` |
| `src/components/kanban-board.tsx` | Only `"use client"` boundary for the board — owns DnD state |
| `supabase/schema.sql` | Initial DB schema (run once in Supabase SQL Editor) |
| `supabase/migration_cross_functional.sql` | Adds `is_cross_functional` + `task_cross_projects` junction table |
| `supabase/migration_task_type.sql` | Adds `type` column (`feature`\|`bug`) to tasks |

### Database model

Tasks use a **junction table** (`task_cross_projects`) as the authoritative source for status — `tasks.status` is a legacy column and is no longer updated by the app.

```
projects         tasks              task_cross_projects
---------        ------             -------------------
id               id                 task_id   FK → tasks.id  (CASCADE)
name             project_id  ──►    project_id FK → projects.id
color            title              status    ← authoritative per-project status
status           is_cross_functional
                 type (feature|bug)
                 priority
```

Every task always has at least one row in `task_cross_projects` (its primary project). Cross-functional tasks have additional rows — one per linked project — each with **independent** status. Moving a task in project A never affects its status in project B.

### Cross-functional tasks

- `tasks.project_id` = the project the task was *created in* (primary)
- `task_cross_projects` has one row per (task × project) with its own `status`
- `getTasks(projectId)` reads the junction first, then fetches task data and overrides `task.status` with the project-specific status
- `moveTask(id, projectId, status)` updates only the `(task_id, project_id)` row in the junction — always pass the **current board's** `projectId`, not `task.project_id`
- `syncCrossProjects()` in `actions.ts` adds/removes junction rows without touching existing statuses

### DnD hydration fix

`DndContext` has a fixed `id="kanban"` to prevent SSR/client aria-describedby mismatch. Do not remove it.

### Dialog close prevention

`DialogContent` has `onInteractOutside={(e) => e.preventDefault()}` to prevent accidental data loss. Keep this on all dialogs.

### Auto-refresh pattern

Client components call `router.refresh()` after every mutation so the Server Component re-fetches and passes fresh props down. `KanbanBoard` syncs with `useEffect(() => setTasks(initialTasks), [initialTasks])` to apply the refreshed data.

### shadcn/ui components

Components in `src/components/ui/` are manually scaffolded (new-york style). Do not use the `shadcn` CLI to add or overwrite them — edit files directly.

### Tailwind CSS v4

Uses CSS custom properties and `@theme inline` syntax. No `tailwind.config.js` — configuration lives in `src/app/globals.css`.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
