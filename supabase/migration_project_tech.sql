-- ============================================================
-- Migration: metadati tecnici sui progetti (stack & strumenti)
-- Esegui nel SQL Editor di Supabase dopo schema.sql
-- (idempotente: sicuro da rieseguire)
-- ============================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS framework    text,
  ADD COLUMN IF NOT EXISTS language     text,
  ADD COLUMN IF NOT EXISTS technologies text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tools        text[] NOT NULL DEFAULT '{}';
