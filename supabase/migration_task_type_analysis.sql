-- ============================================================
-- Migration: aggiunge il tipo 'analysis' ai task
-- Esegui nel SQL Editor di Supabase DOPO migration_task_type.sql
-- (idempotente: sicuro da rieseguire)
--
-- I task di analisi guidano l'agente a produrre documentazione,
-- distinti da feature (sviluppo) e bug (correzione).
-- ============================================================

alter table public.tasks drop constraint if exists tasks_type_check;
alter table public.tasks
  add constraint tasks_type_check check (type in ('feature', 'bug', 'analysis'));
