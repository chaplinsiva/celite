-- ============================================================================
-- CREATE FREE_DOWNLOADS TABLE
-- ============================================================================
-- This migration creates a separate table for tracking free template downloads
-- Free templates don't require subscriptions, so they need their own tracking
-- ============================================================================

BEGIN;

-- Create free_downloads table
CREATE TABLE IF NOT EXISTS public.free_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_slug TEXT NOT NULL REFERENCES public.templates(slug) ON DELETE CASCADE,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for free_downloads
CREATE INDEX IF NOT EXISTS idx_free_downloads_user_id ON public.free_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_free_downloads_template_slug ON public.free_downloads(template_slug);
CREATE INDEX IF NOT EXISTS idx_free_downloads_downloaded_at ON public.free_downloads(downloaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_free_downloads_user_template ON public.free_downloads(user_id, template_slug);

-- Comments for free_downloads table
COMMENT ON TABLE public.free_downloads IS 'Track downloads of free gift templates (no subscription required)';
COMMENT ON COLUMN public.free_downloads.downloaded_at IS 'Timestamp when the free template was downloaded';

-- Enable RLS on free_downloads table
ALTER TABLE public.free_downloads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for free_downloads
-- Users can view their own free downloads
CREATE POLICY "Users can view their own free downloads" ON public.free_downloads 
FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all free downloads
CREATE POLICY "Service role can manage free downloads" ON public.free_downloads 
FOR ALL USING (auth.role() = 'service_role');

-- Admins can view all free downloads
CREATE POLICY "Admins can view all free downloads" ON public.free_downloads 
FOR SELECT USING (public.is_admin(auth.uid()));

COMMIT;
