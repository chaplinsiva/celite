-- ============================================================================
-- ADD WEEKLY SUBSCRIPTION AMOUNT TO SETTINGS
-- ============================================================================
-- This script adds RAZORPAY_WEEKLY_AMOUNT to the settings table
-- Weekly subscription: ₹199 = 19900 paise
-- ============================================================================

BEGIN;

-- Insert or update weekly subscription amount
INSERT INTO public.settings (key, value, description) VALUES
  ('RAZORPAY_WEEKLY_AMOUNT', '19900', 'Weekly subscription amount in paise (₹199)')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description;

COMMIT;

