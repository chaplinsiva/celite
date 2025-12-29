# Quick Setup: Create Downloads Table

**Problem Found**: The `downloads` table doesn't exist in your database!

## Solution:

Run this SQL in your Supabase SQL Editor:

```sql
-- Create downloads table
CREATE TABLE IF NOT EXISTS public.downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_slug TEXT REFERENCES public.templates(slug) ON DELETE SET NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_downloads_user_id ON public.downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_template_slug ON public.downloads(template_slug);
CREATE INDEX IF NOT EXISTS idx_downloads_downloaded_at ON public.downloads(downloaded_at DESC);

-- Enable RLS
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own downloads" ON public.downloads 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage downloads" ON public.downloads 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Admins can view all downloads" ON public.downloads 
FOR SELECT USING (public.is_admin(auth.uid()));
```

## Steps:

1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Paste the above SQL
4. Click **Run**
5. Try downloading the free template again
6. Check the Free Gift Analytics panel

The downloads will now be tracked! ✅
