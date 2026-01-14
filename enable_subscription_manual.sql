-- Enable subscription for devacinemaspkt@gmail.com with autopay off
-- This script will:
-- 1. Find the user by email
-- 2. Insert or update subscription with is_active=true, autopay_enabled=false

-- ============================================================================
-- OPTION 1: MONTHLY SUBSCRIPTION (30 days validity)
-- ============================================================================
INSERT INTO public.subscriptions (
  user_id,
  is_active,
  plan,
  valid_until,
  autopay_enabled,
  razorpay_subscription_id,
  updated_at
)
SELECT 
  u.id as user_id,
  true as is_active,
  'monthly' as plan,
  (NOW() + INTERVAL '30 days') as valid_until,
  false as autopay_enabled,
  NULL as razorpay_subscription_id,
  NOW() as updated_at
FROM auth.users u
WHERE u.email = 'devacinemaspkt@gmail.com'
ON CONFLICT (user_id) 
DO UPDATE SET
  is_active = true,
  plan = 'monthly',
  valid_until = (NOW() + INTERVAL '30 days'),
  autopay_enabled = false,
  razorpay_subscription_id = NULL,
  updated_at = NOW();

-- ============================================================================
-- OPTION 2: YEARLY SUBSCRIPTION (365 days validity) - Uncomment to use this instead
-- ============================================================================
/*
INSERT INTO public.subscriptions (
  user_id,
  is_active,
  plan,
  valid_until,
  autopay_enabled,
  razorpay_subscription_id,
  updated_at
)
SELECT 
  u.id as user_id,
  true as is_active,
  'yearly' as plan,
  (NOW() + INTERVAL '365 days') as valid_until,
  false as autopay_enabled,
  NULL as razorpay_subscription_id,
  NOW() as updated_at
FROM auth.users u
WHERE u.email = 'devacinemaspkt@gmail.com'
ON CONFLICT (user_id) 
DO UPDATE SET
  is_active = true,
  plan = 'yearly',
  valid_until = (NOW() + INTERVAL '365 days'),
  autopay_enabled = false,
  razorpay_subscription_id = NULL,
  updated_at = NOW();
*/

-- ============================================================================
-- VERIFY: Check the subscription was created/updated
-- ============================================================================
SELECT 
  s.id,
  u.email,
  s.is_active,
  s.plan,
  s.valid_until,
  s.autopay_enabled,
  s.created_at,
  s.updated_at
FROM public.subscriptions s
JOIN auth.users u ON s.user_id = u.id
WHERE u.email = 'devacinemaspkt@gmail.com';

