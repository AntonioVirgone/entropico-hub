-- ============================================================
-- Migration: epica generica per task senza epica assegnata
-- Aggiunge epics.is_generic e assicura che ogni progetto abbia
-- al più un'epica generica, usata come contenitore automatico
-- per i task creati con epic_id = null (es. dall'API pubblica).
-- Eseguire nel SQL Editor di Supabase.
-- ============================================================

-- 1. Colonna is_generic
alter table public.epics
  add column if not exists is_generic boolean not null default false;

-- 2. Una sola epica generica per progetto
create unique index if not exists epics_one_generic_per_project
  on public.epics (project_id)
  where is_generic;

-- 3. Backfill: marca come generica l'epica "Generale" creata dalla migration
--    precedente (migration_epics.sql), una per progetto, se non è già stata
--    marcata nessun'altra epica come generica in quel progetto.
update public.epics e
set is_generic = true
where e.title = 'Generale'
  and not exists (
    select 1 from public.epics g
    where g.project_id = e.project_id and g.is_generic
  );

-- 4. Backfill: crea (se manca) l'epica generica e assegna i task orfani
--    rimasti con epic_id null.
do $$
declare
  proj      record;
  v_epic_id uuid;
  v_count   integer;
begin
  for proj in
    select distinct project_id as id from public.tasks where epic_id is null
  loop
    select id into v_epic_id
    from public.epics
    where project_id = proj.id and is_generic
    limit 1;

    if v_epic_id is null then
      select count(*) into v_count from public.epics where project_id = proj.id;

      insert into public.epics (project_id, title, status, position, is_generic)
      values (proj.id, 'Generica', 'todo', v_count, true)
      returning id into v_epic_id;
    end if;

    update public.tasks
    set epic_id = v_epic_id
    where project_id = proj.id
      and epic_id is null;
  end loop;
end;
$$;
