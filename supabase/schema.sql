-- ============================================================
-- entropico-hub — schema database
-- Esegui questo script nel SQL Editor di Supabase
-- (Dashboard > SQL Editor > New query > Run)
-- ============================================================

-- Estensione per UUID
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Tabella: projects
-- ------------------------------------------------------------
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  color       text not null default '#3b82f6',
  status      text not null default 'active'
              check (status in ('active', 'archived')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Tabella: tasks
-- ------------------------------------------------------------
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  title       text not null,
  description text,
  notes       text,
  priority    text not null default 'medium'
              check (priority in ('low', 'medium', 'high')),
  status      text not null default 'todo'
              check (status in ('todo', 'in_progress', 'test', 'done')),
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists tasks_project_id_idx on public.tasks (project_id);
create index if not exists tasks_status_idx on public.tasks (status);

-- ------------------------------------------------------------
-- Trigger: aggiorna updated_at automaticamente
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Row Level Security
-- ATTENZIONE: in questa v1 (operatore singolo, nessuna utenza)
-- l'accesso è APERTO: la anon key può leggere/scrivere tutto.
-- Tieni l'URL dell'app riservato. Quando introdurrai le utenze,
-- sostituisci queste policy con regole basate su auth.uid().
-- ------------------------------------------------------------
alter table public.projects enable row level security;
alter table public.tasks enable row level security;

drop policy if exists "anon full access projects" on public.projects;
create policy "anon full access projects"
  on public.projects for all
  using (true) with check (true);

drop policy if exists "anon full access tasks" on public.tasks;
create policy "anon full access tasks"
  on public.tasks for all
  using (true) with check (true);
