-- Simple script to delete old weekly subscriptions
-- Run this AFTER reviewing what will be deleted

-- STEP 1: First, check what will be deleted (run this query first!)
SELECT 
  id,
  user_id,
  plan,
  razorpay_subscription_id,
  is_active,
  created_at,
  valid_until
FROM subscriptions
WHERE 
  -- Method 1: Check razorpay_subscription_id for "weekly"
  (razorpay_subscription_id IS NOT NULL AND LOWER(razorpay_subscription_id) LIKE '%weekly%')
  OR
  -- Method 2: Check if duration is ~7 days (weekly subscription)
  (valid_until IS NOT NULL AND created_at IS NOT NULL 
   AND EXTRACT(EPOCH FROM (valid_until - created_at)) BETWEEN 6 AND 8);

-- STEP 2: If the results look correct, uncomment and run the DELETE below:
/*
DELETE FROM subscriptions
WHERE 
  (razorpay_subscription_id IS NOT NULL AND LOWER(razorpay_subscription_id) LIKE '%weekly%')
  OR
  (valid_until IS NOT NULL AND created_at IS NOT NULL 
   AND EXTRACT(EPOCH FROM (valid_until - created_at)) BETWEEN 6 AND 8);
*/

