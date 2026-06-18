-- ============================================================
-- Migration: storage documentazione progetti
-- Esegui nel SQL Editor di Supabase DOPO migration_auth.sql
-- (idempotente: sicuro da rieseguire)
--
-- I documenti appartengono a un progetto; l'ownership (e quindi l'RLS)
-- è derivata dal proprietario del progetto, come per i task.
-- L'upload via API usa la service role key e bypassa l'RLS.
-- ============================================================

create table if not exists public.project_documents (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  title       text not null,
  slug        text not null default '',
  content     text not null default '',
  format      text not null default 'markdown' check (format in ('markdown', 'text')),
  source      text not null default 'manual'  check (source in ('manual', 'api')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists project_documents_project_id_idx on public.project_documents (project_id);
create index if not exists project_documents_slug_idx on public.project_documents (project_id, slug);

-- Trigger updated_at (riusa la funzione definita in schema.sql)
drop trigger if exists set_project_documents_updated_at on public.project_documents;
create trigger set_project_documents_updated_at
  before update on public.project_documents
  for each row execute function public.set_updated_at();

-- RLS: accesso solo al proprietario del progetto collegato
alter table public.project_documents enable row level security;

drop policy if exists "documents via project owner" on public.project_documents;
create policy "documents via project owner" on public.project_documents for all
  to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = project_documents.project_id and p.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.projects p
    where p.id = project_documents.project_id and p.owner_id = auth.uid()
  ));
