-- Remove Weekly Subscription Functionality
-- This migration removes weekly subscription support and converts existing weekly subscriptions to monthly

-- Step 1: Convert all existing weekly subscriptions to monthly
UPDATE subscriptions
SET plan = 'monthly'
WHERE plan = 'weekly';

-- Step 2: Remove weekly subscription amount from settings table
DELETE FROM settings
WHERE key = 'RAZORPAY_WEEKLY_AMOUNT';

-- Step 3: Add a comment for documentation
COMMENT ON COLUMN subscriptions.plan IS 'Subscription plan: monthly or yearly. Legacy weekly subscriptions have been converted to monthly.';

