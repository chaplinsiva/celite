-- ============================================================================
-- FIX: ENABLE RLS ON CHECKOUT_DETAILS TABLE
-- ============================================================================
-- This migration ensures RLS is properly enabled on checkout_details table
-- and that all policies are correctly configured
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ENABLE RLS ON CHECKOUT_DETAILS TABLE
-- ============================================================================
ALTER TABLE public.checkout_details ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. DROP EXISTING POLICIES (IF ANY) TO AVOID CONFLICTS
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own checkout details" ON public.checkout_details;
DROP POLICY IF EXISTS "Users can insert their own checkout details" ON public.checkout_details;
DROP POLICY IF EXISTS "Users can update their own checkout details" ON public.checkout_details;
DROP POLICY IF EXISTS "Service role can access checkout_details" ON public.checkout_details;

-- ============================================================================
-- 3. CREATE RLS POLICIES
-- ============================================================================

-- Policy: Users can view their own checkout details
CREATE POLICY "Users can view their own checkout details"
  ON public.checkout_details
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own checkout details
CREATE POLICY "Users can insert their own checkout details"
  ON public.checkout_details
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own checkout details
CREATE POLICY "Users can update their own checkout details"
  ON public.checkout_details
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Service role can access all checkout details (for admin operations)
CREATE POLICY "Service role can access checkout_details"
  ON public.checkout_details
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this query to verify RLS is enabled:
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' AND tablename = 'checkout_details';
--
-- Should return: rowsecurity = true
--
-- To verify policies exist:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'checkout_details';

