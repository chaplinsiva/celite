-- Migration: Add weekly payment tracking for Pongal subscriptions
-- Date: 2026-01-14
-- Description: Enables weekly payment verification for Pongal offer (each week requires payment)

-- 1. Add weekly payment tracking columns to pongal_weekly_subscriptions
ALTER TABLE pongal_weekly_subscriptions 
ADD COLUMN IF NOT EXISTS week1_paid BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS week2_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS week3_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS week1_paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS week2_paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS week3_paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_week_paid BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'week1_active';

-- 2. Add payment tracking columns to pongal_tracking
ALTER TABLE pongal_tracking
ADD COLUMN IF NOT EXISTS week1_paid BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS week2_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS week3_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS current_week_paid BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'week1_active',
ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_failure_reason TEXT;

-- 3. Initialize existing subscriptions with week1 paid
UPDATE pongal_weekly_subscriptions 
SET week1_paid = true, 
    week1_paid_at = created_at, 
    current_week_paid = true
WHERE week1_paid IS NULL;

UPDATE pongal_tracking 
SET week1_paid = true, 
    current_week_paid = true, 
    last_payment_at = created_at
WHERE week1_paid IS NULL;

-- NOTES:
-- - Week 1: Initial payment (always paid when subscription starts)
-- - Week 2: Requires autopay payment at start of week 2
-- - Week 3: Requires autopay payment at start of week 3
-- - If payment not received or autopay disabled, downloads are blocked
-- - After week 3 ends, subscription automatically expires
