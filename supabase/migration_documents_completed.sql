-- ============================================================
-- Migration: aggiunge flag is_completed ai documenti di progetto
-- Esegui nel SQL Editor di Supabase
-- ============================================================

alter table public.project_documents
  add column if not exists is_completed boolean not null default false;