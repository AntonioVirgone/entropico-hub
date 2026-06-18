-- ============================================================
-- Migration: autenticazione multi-utente + RLS per-utente
-- Esegui nel SQL Editor di Supabase DOPO le migration precedenti.
--
-- Prerequisito: crea almeno un utente in
--   Supabase Dashboard > Authentication > Users > Add user
-- (registrazione a invito: niente self-signup pubblico).
--
-- IMPORTANTE: questo script va eseguito in due fasi.
--  Fase A: passi 1-6 (colonne, default, RLS).
--  Fase B: passi 7-8 (backfill + NOT NULL) DOPO aver inserito il tuo user id.
-- ============================================================

-- ── 1. Colonna owner_id ──────────────────────────────────────
alter table public.projects
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.project_ideas
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

-- ── 2. Default = utente corrente ─────────────────────────────
-- Popola owner_id automaticamente sugli insert autenticati.
alter table public.projects     alter column owner_id set default auth.uid();
alter table public.project_ideas alter column owner_id set default auth.uid();

-- ── 3. Indici ────────────────────────────────────────────────
create index if not exists projects_owner_id_idx on public.projects (owner_id);
create index if not exists project_ideas_owner_id_idx on public.project_ideas (owner_id);

-- ── 4. RLS: projects ─────────────────────────────────────────
drop policy if exists "anon full access projects" on public.projects;
drop policy if exists "projects owner access" on public.projects;
create policy "projects owner access" on public.projects for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ── 5. RLS: project_ideas ────────────────────────────────────
drop policy if exists "anon full access project_ideas" on public.project_ideas;
drop policy if exists "project_ideas owner access" on public.project_ideas;
create policy "project_ideas owner access" on public.project_ideas for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ── 6. RLS: tasks e task_cross_projects (ownership via progetto) ──
drop policy if exists "anon full access tasks" on public.tasks;
drop policy if exists "tasks via project owner" on public.tasks;
create policy "tasks via project owner" on public.tasks for all
  to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = tasks.project_id and p.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.projects p
    where p.id = tasks.project_id and p.owner_id = auth.uid()
  ));

drop policy if exists "anon full access task_cross_projects" on public.task_cross_projects;
drop policy if exists "tcp via project owner" on public.task_cross_projects;
create policy "tcp via project owner" on public.task_cross_projects for all
  to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = task_cross_projects.project_id and p.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.projects p
    where p.id = task_cross_projects.project_id and p.owner_id = auth.uid()
  ));

-- ============================================================
-- FASE B — esegui DOPO aver recato il tuo user id
-- (Authentication > Users > copia l'UID) e sostituito sotto.
-- ============================================================

-- ── 7. Backfill dei dati esistenti all'utente operatore ──────
-- update public.projects      set owner_id = '<YOUR_USER_ID>' where owner_id is null;
-- update public.project_ideas set owner_id = '<YOUR_USER_ID>' where owner_id is null;

-- ── 8. Rendi owner_id obbligatorio (dopo il backfill) ────────
-- alter table public.projects      alter column owner_id set not null;
-- alter table public.project_ideas alter column owner_id set not null;
