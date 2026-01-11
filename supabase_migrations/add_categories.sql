-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subcategories table
CREATE TABLE IF NOT EXISTS public.subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category_id, slug)
);

-- Add category_id and subcategory_id to templates table
ALTER TABLE public.templates
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES public.subcategories(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_templates_category_id ON public.templates(category_id);
CREATE INDEX IF NOT EXISTS idx_templates_subcategory_id ON public.templates(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON public.subcategories(category_id);

-- Add comments for documentation
COMMENT ON TABLE public.categories IS 'Template categories (e.g., After Effects, Website Templates, PSD Templates)';
COMMENT ON TABLE public.subcategories IS 'Subcategories within each category';
COMMENT ON COLUMN public.templates.category_id IS 'Reference to the main category';
COMMENT ON COLUMN public.templates.subcategory_id IS 'Reference to the subcategory within the category';

-- Insert default categories
INSERT INTO public.categories (name, slug, description) VALUES
  ('After Effects', 'after-effects', 'After Effects motion graphics templates'),
  ('Website Templates', 'website-templates', 'HTML, CSS, JavaScript website templates'),
  ('PSD Templates', 'psd-templates', 'Photoshop design templates')
ON CONFLICT (slug) DO NOTHING;

-- Insert default subcategories for After Effects
INSERT INTO public.subcategories (category_id, name, slug, description)
SELECT 
  c.id,
  sub.name,
  sub.slug,
  sub.description
FROM public.categories c
CROSS JOIN (VALUES
  ('Logo Reveal', 'logo-reveal', 'Logo animation templates'),
  ('Motion Graphics', 'motion-graphics', 'Motion graphics templates'),
  ('Transitions', 'transitions', 'Video transition templates'),
  ('Lower Thirds', 'lower-thirds', 'Lower third graphics templates'),
  ('Titles', 'titles', 'Title animation templates')
) AS sub(name, slug, description)
WHERE c.slug = 'after-effects'
ON CONFLICT (category_id, slug) DO NOTHING;

-- Insert default subcategories for Website Templates
INSERT INTO public.subcategories (category_id, name, slug, description)
SELECT 
  c.id,
  sub.name,
  sub.slug,
  sub.description
FROM public.categories c
CROSS JOIN (VALUES
  ('Landing Page', 'landing-page', 'Single page landing page templates'),
  ('Portfolio', 'portfolio', 'Portfolio website templates'),
  ('E-commerce', 'e-commerce', 'Online store templates'),
  ('Blog', 'blog', 'Blog website templates'),
  ('Corporate', 'corporate', 'Business website templates')
) AS sub(name, slug, description)
WHERE c.slug = 'website-templates'
ON CONFLICT (category_id, slug) DO NOTHING;

-- Insert default subcategories for PSD Templates
INSERT INTO public.subcategories (category_id, name, slug, description)
SELECT 
  c.id,
  sub.name,
  sub.slug,
  sub.description
FROM public.categories c
CROSS JOIN (VALUES
  ('Business Cards', 'business-cards', 'Business card design templates'),
  ('Flyers', 'flyers', 'Flyer design templates'),
  ('Posters', 'posters', 'Poster design templates'),
  ('Banners', 'banners', 'Banner design templates'),
  ('Social Media', 'social-media', 'Social media graphics templates')
) AS sub(name, slug, description)
WHERE c.slug = 'psd-templates'
ON CONFLICT (category_id, slug) DO NOTHING;

