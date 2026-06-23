-- ============================================================
-- Migration: integrazione GitHub (login + creazione repository)
-- Esegui nel SQL Editor di Supabase DOPO migration_auth.sql
-- (idempotente: sicuro da rieseguire)
--
-- Due cose:
--  1. Colonne sul progetto per collegare il repository creato.
--  2. Tabella con il token OAuth GitHub dell'utente, necessario per creare
--     repo per suo conto. Supabase restituisce il provider_token solo al
--     momento del login e non lo conserva: lo catturiamo nella callback e lo
--     salviamo qui. Il token NON viene mai esposto al browser (letto solo
--     lato server) ed è isolato per-utente via RLS.
-- ============================================================

-- ── 1. Collegamento repo sul progetto ───────────────────────
alter table public.projects
  add column if not exists github_repo_url       text,
  add column if not exists github_repo_full_name text;

-- ── 2. Credenziali GitHub per-utente ────────────────────────
create table if not exists public.github_credentials (
  user_id      uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  github_login text,
  access_token text not null,
  scopes       text,
  updated_at   timestamptz not null default now()
);

alter table public.github_credentials enable row level security;

-- RLS: ognuno accede SOLO alla propria riga. In pratica il token è letto solo
-- lato server (Server Action / route di callback); il client non lo seleziona mai.
drop policy if exists "github_credentials owner access" on public.github_credentials;
create policy "github_credentials owner access" on public.github_credentials for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
