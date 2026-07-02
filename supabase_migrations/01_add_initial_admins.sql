-- ============================================================================
-- ADD INITIAL ADMIN USERS
-- ============================================================================
-- This script adds admin users to the admins table.
--
-- ⚠️ IMPORTANT: 
-- 1. First create users via Supabase Authentication (Dashboard → Authentication → Users)
-- 2. Copy the User ID (UUID) from the user you want to make admin
-- 3. Replace the UUIDs below with your actual user IDs
-- 4. Run this script
-- ============================================================================

BEGIN;

-- Add admin users
-- Replace 'YOUR_USER_ID_1' and 'YOUR_USER_ID_2' with actual user UUIDs from auth.users
-- Or add the user ID directly below

-- Current admin user
INSERT INTO public.admins (user_id)
VALUES 
  ('6597f7e2-63b8-4b84-aa6d-29c3050f2d48')  -- Admin user
ON CONFLICT (user_id) DO NOTHING;

-- To add more admins, uncomment and add their UUIDs:
-- INSERT INTO public.admins (user_id)
-- VALUES 
--   ('YOUR_USER_ID_1'),  -- Replace with your admin user UUID
--   ('YOUR_USER_ID_2')   -- Replace with another admin user UUID (optional)
-- ON CONFLICT (user_id) DO NOTHING;

-- Verify admins were added
SELECT 
  a.user_id,
  a.created_at,
  u.email,
  u.created_at as user_created_at
FROM public.admins a
JOIN auth.users u ON u.id = a.user_id
ORDER BY a.created_at;

COMMIT;

-- ============================================================================
-- HOW TO GET USER IDS
-- ============================================================================
-- Option 1: From Supabase Dashboard
-- 1. Go to Authentication → Users
-- 2. Click on a user
-- 3. Copy the UUID from the user details
--
-- Option 2: From SQL Query
-- Run this query to see all users and their IDs:
-- SELECT id, email, created_at FROM auth.users ORDER BY created_at;
-- ============================================================================

