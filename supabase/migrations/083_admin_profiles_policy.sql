-- =============================================================================
-- 083_ADMIN_PROFILES_POLICY
-- =============================================================================
-- Allow admins to view all profiles for auditing and management.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Admins can view all profiles'
    ) THEN
        CREATE POLICY "Admins can view all profiles"
          ON public.profiles FOR SELECT
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM user_roles ur
              JOIN roles r ON ur.role_id = r.id
              WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
            )
          );
    END IF;
END
$$;
