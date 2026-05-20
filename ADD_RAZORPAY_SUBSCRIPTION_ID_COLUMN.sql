-- SQL script to add razorpay_subscription_id column to subscriptions table
-- Run this in your Supabase SQL Editor

ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT;

-- Add a comment to describe the column
COMMENT ON COLUMN subscriptions.razorpay_subscription_id IS 'Stores the Razorpay subscription ID for cancelling subscriptions via API';

