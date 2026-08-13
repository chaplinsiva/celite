-- Migration: Add usd_ppp columns to subscriptions and checkout_details tables
-- Target: public.subscriptions, public.checkout_details
-- Date: 2026-08-13

ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS usd_ppp numeric;
ALTER TABLE public.checkout_details ADD COLUMN IF NOT EXISTS usd_ppp numeric;

COMMENT ON COLUMN public.subscriptions.usd_ppp IS 'USD price calculated using Purchasing Power Parity (PPP)';
COMMENT ON COLUMN public.checkout_details.usd_ppp IS 'USD price calculated using Purchasing Power Parity (PPP)';
