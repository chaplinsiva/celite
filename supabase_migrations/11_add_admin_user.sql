-- ============================================================================
-- ADD ADMIN USER
-- ============================================================================
-- This script adds a user to the admins table
-- User ID: 6597f7e2-63b8-4b84-aa6d-29c3050f2d48
-- ============================================================================

BEGIN;

-- Add admin user (will skip if already exists)
INSERT INTO public.admins (user_id)
VALUES ('6597f7e2-63b8-4b84-aa6d-29c3050f2d48')
ON CONFLICT (user_id) DO NOTHING;

-- Verify the admin was added
SELECT 
  a.user_id,
  a.created_at,
  u.email,
  u.created_at as user_created_at
FROM public.admins a
LEFT JOIN auth.users u ON u.id = a.user_id
WHERE a.user_id = '6597f7e2-63b8-4b84-aa6d-29c3050f2d48';

COMMIT;

