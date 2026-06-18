-- ============================================================
-- Migration: Backlog idee (nuovi progetti da realizzare in futuro)
-- Esegui nel SQL Editor di Supabase dopo schema.sql
-- (idempotente: sicuro da rieseguire)
--
-- Tabella autonoma: NESSUNA foreign key verso projects/tasks.
-- Le idee hanno vita propria e non sono collegate alle todo-list.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.project_ideas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text,
  status      text NOT NULL DEFAULT 'idea'
              CHECK (status IN ('idea', 'valutazione', 'approvata', 'promossa', 'scartata')),
  priority    text NOT NULL DEFAULT 'medium'
              CHECK (priority IN ('low', 'medium', 'high')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_ideas_status_idx ON public.project_ideas (status);

-- Trigger updated_at (riusa la funzione definita in schema.sql)
DROP TRIGGER IF EXISTS set_project_ideas_updated_at ON public.project_ideas;
CREATE TRIGGER set_project_ideas_updated_at
  BEFORE UPDATE ON public.project_ideas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS permissiva (coerente con la v1 a operatore singolo, nessuna utenza)
ALTER TABLE public.project_ideas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon full access project_ideas" ON public.project_ideas;
CREATE POLICY "anon full access project_ideas"
  ON public.project_ideas FOR ALL
  USING (true) WITH CHECK (true);
