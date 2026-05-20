-- ============================================================================
-- FIX: Infinite Recursion in Admins RLS Policy
-- ============================================================================
-- The admins table policy creates infinite recursion because it queries
-- the admins table itself. This script fixes that by using a better approach.
-- ============================================================================

BEGIN;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can view admin list" ON public.admins;

-- Create a SECURITY DEFINER function to check admin status without recursion
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins WHERE admins.user_id = is_admin.user_id
  );
$$;

-- Recreate the admins policy using the function (which bypasses RLS)
CREATE POLICY "Admins can view admin list" ON public.admins
FOR SELECT
USING (
  public.is_admin(auth.uid())
);

-- Also allow service role to access admins table
CREATE POLICY "Service role can access admins" ON public.admins
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test that the policy works (should not cause infinite recursion)
-- SELECT * FROM public.admins LIMIT 1;

