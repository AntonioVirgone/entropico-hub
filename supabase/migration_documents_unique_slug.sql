-- ============================================================
-- Migration: vincolo di unicità (project_id, slug) sui documenti
-- Esegui nel SQL Editor di Supabase DOPO migration_project_documents.sql
-- (idempotente: sicuro da rieseguire)
--
-- Permette l'upsert atomico via API (ON CONFLICT) evitando race condition
-- su upload paralleli dello stesso documento.
-- ============================================================

-- 1. Dedup difensivo: se esistono già righe con lo stesso (project_id, slug),
--    tiene la più recente (updated_at) ed elimina le altre, così la creazione
--    dell'indice univoco non fallisce.
delete from public.project_documents d
using public.project_documents keep
where d.project_id = keep.project_id
  and d.slug = keep.slug
  and d.slug <> ''
  and (keep.updated_at, keep.id) > (d.updated_at, d.id);

-- 2. Indice univoco (solo per slug non vuoti).
drop index if exists project_documents_slug_idx;
create unique index if not exists project_documents_project_slug_key
  on public.project_documents (project_id, slug)
  where slug <> '';
