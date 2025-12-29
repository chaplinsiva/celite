-- ============================================================================
-- CREATE DOWNLOADS TABLE
-- ============================================================================
-- This migration creates the downloads table to track template downloads
-- ============================================================================

BEGIN;

-- Create downloads table if it doesn't exist
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
CREATE INDEX IF NOT EXISTS idx_downloads_downloaded_at ON public.downloads(downloaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_downloads_subscription_id ON public.downloads(subscription_id);

-- Comments for downloads table
COMMENT ON TABLE public.downloads IS 'Track all template downloads by users';
COMMENT ON COLUMN public.downloads.downloaded_at IS 'Timestamp when the template was downloaded';

-- Enable RLS on downloads table
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for downloads
-- Users can view their own downloads
CREATE POLICY "Users can view their own downloads" ON public.downloads 
FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all downloads
CREATE POLICY "Service role can manage downloads" ON public.downloads 
FOR ALL USING (auth.role() = 'service_role');

-- Admins can view all downloads
CREATE POLICY "Admins can view all downloads" ON public.downloads 
FOR SELECT USING (public.is_admin(auth.uid()));

COMMIT;
