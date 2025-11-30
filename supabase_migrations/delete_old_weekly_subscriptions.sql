-- Delete Old Weekly Subscriptions
-- This migration identifies and removes subscriptions that were originally weekly
-- Since weekly subscriptions have been converted to monthly, we identify them by:
-- 1. Checking if razorpay_subscription_id contains "weekly" (Razorpay plan IDs often include plan type)
-- 2. Checking if the subscription was created with a 7-day validity period

-- ⚠️ IMPORTANT: Run the SELECT query below FIRST to preview what will be deleted!

-- Step 1: PREVIEW - See what will be deleted (RUN THIS FIRST!)
-- Copy and run this query in Supabase SQL Editor to see what will be deleted:
/*
SELECT 
  id,
  user_id,
  plan,
  razorpay_subscription_id,
  is_active,
  created_at,
  valid_until,
  CASE 
    WHEN valid_until IS NOT NULL AND created_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (valid_until - created_at)) / 86400 
    ELSE NULL 
  END as duration_days
FROM subscriptions
WHERE 
  -- Check if razorpay_subscription_id contains "weekly"
  (razorpay_subscription_id IS NOT NULL AND LOWER(razorpay_subscription_id) LIKE '%weekly%')
  OR
  -- Check if subscription duration is approximately 7 days (weekly subscription)
  (valid_until IS NOT NULL AND created_at IS NOT NULL 
   AND EXTRACT(EPOCH FROM (valid_until - created_at)) BETWEEN 6 AND 8);
*/

-- Step 2: Delete subscriptions that were originally weekly
-- This identifies weekly subscriptions by:
-- - razorpay_subscription_id containing "weekly" (most reliable indicator)
-- - OR subscription duration of approximately 7 days (indicating it was a weekly plan)

-- Uncomment the DELETE statement below after reviewing the SELECT results above:
/*
DELETE FROM subscriptions
WHERE 
  -- Check if razorpay_subscription_id contains "weekly" (most reliable indicator)
  (razorpay_subscription_id IS NOT NULL AND LOWER(razorpay_subscription_id) LIKE '%weekly%')
  OR
  -- Check if subscription duration is approximately 7 days (weekly subscription indicator)
  (valid_until IS NOT NULL AND created_at IS NOT NULL 
   AND EXTRACT(EPOCH FROM (valid_until - created_at)) BETWEEN 6 AND 8);
*/

-- Alternative: If you want to delete ALL subscriptions that were converted from weekly,
-- you can use this more aggressive approach (use with caution):
-- This deletes subscriptions where the original validity period was 7 days
/*
DELETE FROM subscriptions
WHERE 
  valid_until IS NOT NULL 
  AND created_at IS NOT NULL 
  AND EXTRACT(EPOCH FROM (valid_until - created_at)) BETWEEN 6 AND 8
  AND plan = 'monthly';  -- Only delete monthly plans that were originally weekly
*/

