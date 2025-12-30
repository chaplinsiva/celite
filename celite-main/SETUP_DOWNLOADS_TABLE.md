# Quick Setup: Create Download Tables

**Problem Found**: The tables required for tracking downloads are missing from your database!

## Solution:

Run this SQL in your Supabase SQL Editor to create both the **paid downloads** and **free gift downloads** tables.

```sql
-- 1. Create downloads table for PAID templates (requires subscription)
CREATE TABLE IF NOT EXISTS public.downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_slug TEXT REFERENCES public.templates(slug) ON DELETE SET NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create free_downloads table for FREE gifts (no subscription needed)
CREATE TABLE IF NOT EXISTS public.free_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_slug TEXT NOT NULL REFERENCES public.templates(slug) ON DELETE CASCADE,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_downloads_user_id ON public.downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_downloaded_at ON public.downloads(downloaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_free_downloads_user_id ON public.free_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_free_downloads_downloaded_at ON public.free_downloads(downloaded_at DESC);

-- Enable RLS
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_downloads ENABLE ROW LEVEL SECURITY;

-- Policies for downloads
CREATE POLICY "Users can view their own downloads" ON public.downloads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage downloads" ON public.downloads FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Admins can view all downloads" ON public.downloads FOR SELECT USING (public.is_admin(auth.uid()));

-- Policies for free_downloads
CREATE POLICY "Users can view their own free downloads" ON public.free_downloads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage free downloads" ON public.free_downloads FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Admins can view all free downloads" ON public.free_downloads FOR SELECT USING (public.is_admin(auth.uid()));
```

## Steps:

1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Paste the above SQL
4. Click **Run**
5. Try downloading a free template again! ✅
