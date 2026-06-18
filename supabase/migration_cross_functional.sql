-- ============================================================
-- Migration: task cross-funzionali con status indipendente per progetto
-- Esegui nel SQL Editor di Supabase dopo schema.sql
-- (idempotente: sicuro da rieseguire)
-- ============================================================

-- Colonna is_cross_functional su tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS is_cross_functional boolean NOT NULL DEFAULT false;

-- Junction table: ogni coppia (task, progetto) ha il proprio status
-- Questo è il modello autoritativo per lo status — tasks.status diventa legacy
CREATE TABLE IF NOT EXISTS public.task_cross_projects (
  task_id    uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  status     text NOT NULL DEFAULT 'todo'
             CHECK (status IN ('todo', 'in_progress', 'done')),
  PRIMARY KEY (task_id, project_id)
);

CREATE INDEX IF NOT EXISTS tcp_project_id_idx ON public.task_cross_projects (project_id);

-- Per ogni task esistente, crea la riga "progetto principale" nella junction
-- usando lo status corrente del task (backfill idempotente)
INSERT INTO public.task_cross_projects (task_id, project_id, status)
SELECT t.id, t.project_id, t.status
FROM public.tasks t
ON CONFLICT (task_id, project_id) DO UPDATE SET status = EXCLUDED.status;

-- RLS permissiva
ALTER TABLE public.task_cross_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon full access task_cross_projects" ON public.task_cross_projects;
CREATE POLICY "anon full access task_cross_projects"
  ON public.task_cross_projects FOR ALL
  USING (true) WITH CHECK (true);
