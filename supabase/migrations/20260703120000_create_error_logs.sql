-- Error-control layer: central table for edge-function error logging + auto-heal telemetry.
-- Written to by edge functions via the service-role key (RLS bypassed on insert).
-- Readable/updatable only by admin/founder, so operators can triage and mark resolved.

CREATE TABLE IF NOT EXISTS public.error_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name  TEXT NOT NULL,
  error_message  TEXT NOT NULL,
  error_stack    TEXT,
  severity       TEXT NOT NULL DEFAULT 'error'
                   CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  context        JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved       BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Query patterns: newest-first triage, per-function filtering, open-issues dashboard.
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at
  ON public.error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_function_name
  ON public.error_logs (function_name);
CREATE INDEX IF NOT EXISTS idx_error_logs_unresolved
  ON public.error_logs (created_at DESC) WHERE resolved = false;

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- No client INSERT policy on purpose: only the service role (which bypasses RLS)
-- writes logs. This prevents clients from spamming/poisoning the error table.

-- DROP-before-CREATE so the migration is idempotent (safe to re-run via `supabase db push`).
DROP POLICY IF EXISTS "Admins and founders can view error logs" ON public.error_logs;
CREATE POLICY "Admins and founders can view error logs"
  ON public.error_logs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_founder(auth.uid()));

DROP POLICY IF EXISTS "Admins and founders can update error logs" ON public.error_logs;
CREATE POLICY "Admins and founders can update error logs"
  ON public.error_logs
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_founder(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_founder(auth.uid()));
