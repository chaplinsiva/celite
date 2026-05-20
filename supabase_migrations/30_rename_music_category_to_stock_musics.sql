-- ============================================================================
-- RENAME MUSIC CATEGORY TO STOCK MUSICS
-- ============================================================================
-- This migration renames the 'musics-and-sfx' category to 'stock-musics'
-- and updates the route mappings in the header
-- ============================================================================

BEGIN;

-- Update the category name and slug from 'musics-and-sfx' to 'stock-musics'
UPDATE public.categories 
SET 
  name = 'Stock Musics',
  slug = 'stock-musics',
  description = 'Royalty-free stock music for videos, games, and multimedia projects',
  icon = 'Music',
  updated_at = NOW()
WHERE slug = 'musics-and-sfx';

-- If the category doesn't exist yet, create it
INSERT INTO public.categories (name, slug, description, icon)
SELECT 
  'Stock Musics',
  'stock-musics',
  'Royalty-free stock music for videos, games, and multimedia projects',
  'Music'
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories WHERE slug = 'stock-musics'
);

COMMIT;