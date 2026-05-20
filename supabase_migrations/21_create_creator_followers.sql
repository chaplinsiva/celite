-- ============================================================================
-- CREATOR FOLLOWERS TABLE
-- ============================================================================
-- Tracks which users follow which creator shops.
--
-- 1. creator_followers: (creator_shop_id, user_id) unique
-- 2. Public can read follower counts
-- 3. Authenticated users can follow/unfollow themselves
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.creator_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_shop_id UUID NOT NULL REFERENCES public.creator_shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (creator_shop_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_creator_followers_shop
  ON public.creator_followers(creator_shop_id);

CREATE INDEX IF NOT EXISTS idx_creator_followers_user
  ON public.creator_followers(user_id);

COMMENT ON TABLE public.creator_followers IS 'Users following creator shops';

-- Enable Row Level Security
ALTER TABLE public.creator_followers ENABLE ROW LEVEL SECURITY;

-- Anyone can read follower counts / followers
CREATE POLICY "Public read creator followers"
ON public.creator_followers
FOR SELECT
USING (true);

-- Users can insert their own follow records
CREATE POLICY "Users can follow creators"
ON public.creator_followers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own follow records
CREATE POLICY "Users can unfollow creators"
ON public.creator_followers
FOR DELETE
USING (auth.uid() = user_id);

COMMIT;


