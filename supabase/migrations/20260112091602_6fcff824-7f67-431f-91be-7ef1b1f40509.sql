-- Fix: permission denied for role-checking functions used in RLS policies
-- PostgREST runs as the caller role (authenticated), so these functions must be executable.

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_founder(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_founder() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_has_role(public.app_role) TO authenticated;
