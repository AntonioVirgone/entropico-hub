-- ============================================================
-- Migration: vincolo di unicità (project_id, slug) sui documenti
-- Esegui nel SQL Editor di Supabase DOPO migration_project_documents.sql
-- (idempotente: sicuro da rieseguire)
--
-- Permette l'upsert atomico via API (ON CONFLICT) evitando race condition
-- su upload paralleli dello stesso documento.
--
-- IMPORTANTE: serve un vincolo UNIQUE *pieno*, non un indice univoco PARZIALE
-- (es. "... where slug <> ''"). Un indice parziale NON è inferibile da
-- "ON CONFLICT (project_id, slug)" senza ripeterne il predicato, cosa che
-- PostgREST/supabase-js non fanno: il risultato sarebbe l'errore
-- "there is no unique or exclusion constraint matching the ON CONFLICT
-- specification". Per questo qui usiamo un CONSTRAINT UNIQUE su (project_id, slug).
-- ============================================================

-- 1. Backfill degli slug vuoti/nulli (la colonna ha default ''): derivali dal
--    titolo e, se restano vuoti (titolo senza caratteri alfanumerici), usa un
--    fallback basato sull'id. Così il vincolo UNIQUE può coprire tutte le righe.
update public.project_documents
set slug = trim(both '-' from regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g'))
where slug is null or slug = '';

update public.project_documents
set slug = 'doc-' || left(replace(id::text, '-', ''), 8)
where slug is null or slug = '';

-- 2. Dedup difensivo: a parità di (project_id, slug) tiene la riga più recente
--    (updated_at, poi id) ed elimina le altre, così il vincolo non fallisce.
delete from public.project_documents d
using public.project_documents keep
where d.project_id = keep.project_id
  and d.slug = keep.slug
  and (keep.updated_at, keep.id) > (d.updated_at, d.id);

-- 3. Rimuovi eventuali indici precedenti (incluso il vecchio indice PARZIALE
--    introdotto per errore) e l'indice non univoco originale.
drop index if exists public.project_documents_project_slug_key;
drop index if exists public.project_documents_slug_idx;

-- 4. Vincolo UNIQUE pieno su (project_id, slug): inferibile da ON CONFLICT.
--    drop+add rende lo script ri-eseguibile senza errori.
alter table public.project_documents
  drop constraint if exists project_documents_project_id_slug_key;
alter table public.project_documents
  add constraint project_documents_project_id_slug_key unique (project_id, slug);
