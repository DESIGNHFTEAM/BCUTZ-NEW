-- Allow founders/admins to view all profiles + roles (needed for Founder Access page)

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Founders can view all profiles" ON public.profiles;
CREATE POLICY "Founders can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.is_founder(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- USER_ROLES
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Founders can view all user roles" ON public.user_roles;
CREATE POLICY "Founders can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  public.is_founder(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);
