-- Create template_previews table to support multiple preview thumbnails/videos per template

BEGIN;

CREATE TABLE IF NOT EXISTS public.template_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_slug TEXT NOT NULL REFERENCES public.templates(slug) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'video', 'youtube')),
  title TEXT,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_template_previews_template_slug ON public.template_previews(template_slug);
CREATE INDEX IF NOT EXISTS idx_template_previews_sort_order ON public.template_previews(template_slug, sort_order);

COMMENT ON TABLE public.template_previews IS 'Additional previews (thumbnails or videos) for templates.';
COMMENT ON COLUMN public.template_previews.kind IS 'Preview type: image (thumbnail), video (file), or youtube (YouTube URL).';
COMMENT ON COLUMN public.template_previews.url IS 'Either a direct URL (http/https) or a storage path (e.g. r2:preview/..).';

-- RLS: public read, admins can modify
ALTER TABLE public.template_previews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Template previews are viewable by everyone" ON public.template_previews
  FOR SELECT USING (true);

CREATE POLICY "Only admins can modify template previews" ON public.template_previews
  FOR ALL USING (
    public.is_admin(auth.uid())
  );

COMMIT;


