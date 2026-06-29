-- ============================================================
-- Migration: epiche (epics)
-- Aggiunge la tabella epics e collega i task tramite epic_id.
-- Eseguire nel SQL Editor di Supabase.
-- ============================================================

-- 1. Tabella epics
create table if not exists public.epics (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  title       text not null,
  description text,
  status      text not null default 'todo'
              check (status in ('todo', 'in_progress', 'test', 'done')),
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists epics_project_id_idx on public.epics (project_id);

drop trigger if exists set_epics_updated_at on public.epics;
create trigger set_epics_updated_at
  before update on public.epics
  for each row execute function public.set_updated_at();

alter table public.epics enable row level security;

drop policy if exists "epics via project owner" on public.epics;
create policy "epics via project owner" on public.epics for all
  to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = epics.project_id and p.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.projects p
    where p.id = epics.project_id and p.owner_id = auth.uid()
  ));

-- 2. Aggiungi epic_id ai task
--    ON DELETE RESTRICT: non si può eliminare un'epica che ha task.
alter table public.tasks
  add column if not exists epic_id uuid references public.epics(id) on delete restrict;

-- 3. Migrazione dati: crea epica "Generale" per ogni progetto e assegna i task.
do $$
declare
  proj     record;
  v_epic_id uuid;
begin
  for proj in select id from public.projects loop
    -- Se esiste già un'epica per questo progetto, usa la prima
    select id into v_epic_id
    from public.epics
    where project_id = proj.id
    order by created_at asc
    limit 1;

    -- Altrimenti crea l'epica "Generale" con status in_progress
    if v_epic_id is null then
      insert into public.epics (project_id, title, status, position)
      values (proj.id, 'Generale', 'in_progress', 0)
      returning id into v_epic_id;
    end if;

    -- Assegna tutti i task senza epica del progetto primario a questa epica
    update public.tasks
    set epic_id = v_epic_id
    where project_id = proj.id
      and epic_id is null;
  end loop;
end;
$$;
