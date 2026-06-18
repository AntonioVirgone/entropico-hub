-- ============================================================
-- Migration: task cross-funzionali
-- Esegui nel SQL Editor di Supabase dopo schema.sql
-- ============================================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS is_cross_functional boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.task_cross_projects (
  task_id    uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, project_id)
);

CREATE INDEX IF NOT EXISTS tcp_project_id_idx ON public.task_cross_projects (project_id);

-- RLS permissiva (stessa policy di tasks/projects)
ALTER TABLE public.task_cross_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon full access task_cross_projects" ON public.task_cross_projects;
CREATE POLICY "anon full access task_cross_projects"
  ON public.task_cross_projects FOR ALL
  USING (true) WITH CHECK (true);
