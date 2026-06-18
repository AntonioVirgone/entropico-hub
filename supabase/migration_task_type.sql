-- ============================================================
-- Migration: campo type su tasks (feature | bug)
-- Esegui nel SQL Editor di Supabase
-- ============================================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'feature'
  CHECK (type IN ('feature', 'bug'));
