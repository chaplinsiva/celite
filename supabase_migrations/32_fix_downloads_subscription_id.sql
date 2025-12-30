-- ============================================================================
-- FIX DOWNLOADS TABLE - MAKE SUBSCRIPTION_ID NULLABLE
-- ============================================================================
-- This migration modifies the downloads table to allow NULL subscription_id
-- This is needed because subscription downloads should still be tracked
-- even when the subscription record is available
-- ============================================================================

BEGIN;

-- Make subscription_id nullable if it isn't already
DO $$
BEGIN
  -- Check if downloads table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'downloads'
  ) THEN
    -- Alter column to be nullable (this is safe even if already nullable)
    ALTER TABLE public.downloads
      ALTER COLUMN subscription_id DROP NOT NULL;
    
    RAISE NOTICE 'Made subscription_id nullable in downloads table';
  ELSE
    RAISE NOTICE 'Downloads table does not exist';
  END IF;
END $$;

-- Ensure the downloads table exists with proper structure
CREATE TABLE IF NOT EXISTS public.downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_slug TEXT REFERENCES public.templates(slug) ON DELETE SET NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for downloads
CREATE INDEX IF NOT EXISTS idx_downloads_user_id ON public.downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_template_slug ON public.downloads(template_slug);
CREATE INDEX IF NOT EXISTS idx_downloads_subscription_id ON public.downloads(subscription_id);
CREATE INDEX IF NOT EXISTS idx_downloads_downloaded_at ON public.downloads(downloaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_downloads_user_template ON public.downloads(user_id, template_slug);

-- Enable RLS on downloads table
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own downloads" ON public.downloads;
DROP POLICY IF EXISTS "Service role can manage downloads" ON public.downloads;
DROP POLICY IF EXISTS "Admins can view all downloads" ON public.downloads;

-- RLS Policies for downloads
-- Users can view their own downloads
CREATE POLICY "Users can view their own downloads" ON public.downloads 
FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all downloads
CREATE POLICY "Service role can manage downloads" ON public.downloads 
FOR ALL USING (auth.role() = 'service_role');

-- Admins can view all downloads (uses is_admin function if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'CREATE POLICY "Admins can view all downloads" ON public.downloads FOR SELECT USING (public.is_admin(auth.uid()))';
  END IF;
END $$;

-- Comments
COMMENT ON TABLE public.downloads IS 'Track template downloads by subscribed users';
COMMENT ON COLUMN public.downloads.subscription_id IS 'Optional reference to the subscription used for download (nullable for legacy records)';

COMMIT;
