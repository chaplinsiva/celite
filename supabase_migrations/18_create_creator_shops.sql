-- ============================================================================
-- CREATOR SHOPS / VENDOR PROFILES
-- ============================================================================
-- This migration creates a simple "creator_shops" table to support the
-- Creator Hub / vendor system.
--
-- Each authenticated user can have exactly one shop, identified by a
-- human‑friendly unique slug used in public URLs, e.g.:
--   https://celite.in/dtstudios
--
-- RLS is enabled so:
--   - Everyone can read shops (public creator pages)
--   - A user can insert/update only their own shop
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.creator_shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Public identity
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,

  -- Bank / payout details (simple text fields for now)
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_ifsc TEXT,
  bank_upi_id TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Each user can own at most one shop
CREATE UNIQUE INDEX IF NOT EXISTS idx_creator_shops_user_unique
  ON public.creator_shops(user_id);

-- Simple updated_at trigger
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_on_creator_shops ON public.creator_shops;
CREATE TRIGGER set_timestamp_on_creator_shops
BEFORE UPDATE ON public.creator_shops
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Enable Row Level Security
ALTER TABLE public.creator_shops ENABLE ROW LEVEL SECURITY;

-- Public can read any creator shop (for public profile pages)
CREATE POLICY "Public read creator shops"
ON public.creator_shops
FOR SELECT
USING (true);

-- Only authenticated users can insert a shop for themselves
CREATE POLICY "Users can insert their own shop"
ON public.creator_shops
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Only shop owner can update their shop
CREATE POLICY "Users can update their own shop"
ON public.creator_shops
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

COMMIT;


