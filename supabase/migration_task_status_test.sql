-- ============================================================
-- Migration: aggiunge lo stato 'test' ai task
-- Esegui nel SQL Editor di Supabase DOPO migration_cross_functional.sql
-- (idempotente: sicuro da rieseguire)
--
-- Nuovo flusso: todo → in_progress → test → done.
-- Un task concluso passa prima in "test" per essere validato e solo dopo
-- viene marcato come "done".
--
-- Lo status autoritativo vive in task_cross_projects (uno per progetto);
-- tasks.status è legacy ma ha comunque un CHECK da allineare.
-- ============================================================

-- Stato autoritativo per progetto (junction)
alter table public.task_cross_projects
  drop constraint if exists task_cross_projects_status_check;
alter table public.task_cross_projects
  add constraint task_cross_projects_status_check
  check (status in ('todo', 'in_progress', 'test', 'done'));

-- Colonna legacy su tasks
alter table public.tasks
  drop constraint if exists tasks_status_check;
alter table public.tasks
  add constraint tasks_status_check
  check (status in ('todo', 'in_progress', 'test', 'done'));
