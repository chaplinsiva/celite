-- Migration: Fix Pongal Weekly Download Tracking
-- Date: 2026-01-14
-- Description: Fixes for download limit tracking and preventing duplicate records

-- 1. Add subscription_id column to downloads table for proper tracking
ALTER TABLE downloads ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id);

-- 2. Add created_at column to downloads table
ALTER TABLE downloads ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_downloads_subscription_id ON downloads(subscription_id);
CREATE INDEX IF NOT EXISTS idx_downloads_user_id ON downloads(user_id);

-- 4. Add unique constraints to prevent duplicate Pongal subscription records
ALTER TABLE pongal_weekly_subscriptions 
ADD CONSTRAINT IF NOT EXISTS unique_pongal_weekly_user_subscription 
UNIQUE (user_id, subscription_id);

ALTER TABLE pongal_tracking 
ADD CONSTRAINT IF NOT EXISTS unique_pongal_tracking_user_subscription 
UNIQUE (user_id, subscription_id);

-- Note: The activation API was also updated to use UPSERT instead of INSERT
-- for pongal_weekly_subscriptions and pongal_tracking tables to handle
-- re-activation scenarios without creating duplicate records.
