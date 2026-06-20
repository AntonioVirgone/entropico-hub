-- ============================================================
-- Migration: token API personali (per-utente)
-- Esegui nel SQL Editor di Supabase DOPO migration_auth.sql
-- (idempotente: sicuro da rieseguire)
--
-- Ogni utente genera i propri token Bearer per l'API documentazione.
-- In tabella NON viene mai salvato il token in chiaro: solo l'hash SHA-256
-- (token_hash) e un prefisso non sensibile (token_prefix) per riconoscerlo.
-- L'API verifica il Bearer ricalcolando l'hash e ricava così lo user_id,
-- limitando le operazioni ai progetti di quell'utente.
-- ============================================================

create table if not exists public.api_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name         text not null default '',
  token_prefix text not null,
  token_hash   text not null unique,
  last_used_at timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists api_tokens_user_id_idx on public.api_tokens (user_id);

-- RLS: ognuno gestisce SOLO i propri token.
-- L'API di upload/lettura usa la service role key e bypassa l'RLS per
-- risolvere il token (lookup per hash) prima di autorizzare l'operazione.
alter table public.api_tokens enable row level security;

drop policy if exists "api_tokens owner access" on public.api_tokens;
create policy "api_tokens owner access" on public.api_tokens for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
