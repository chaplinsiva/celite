-- ============================================================================
-- CREATE SOUND EFFECTS CATEGORY
-- ============================================================================
-- This migration creates the Sound Effects category and Whoosh subcategory
-- ============================================================================

BEGIN;

-- Create Sound Effects category if it doesn't exist
INSERT INTO public.categories (name, slug, description, icon)
VALUES (
  'Sound Effects',
  'sound-effects',
  'Professional sound effects for videos, games, and multimedia projects',
  'Volume2'
)
ON CONFLICT (slug) DO UPDATE
SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  updated_at = NOW();

-- Create Whoosh subcategory under Sound Effects
INSERT INTO public.subcategories (category_id, name, slug, description)
SELECT 
  c.id,
  'Whoosh',
  'whoosh',
  'Whoosh sound effects for transitions, movements, and action sequences'
FROM public.categories c
WHERE c.slug = 'sound-effects'
ON CONFLICT (category_id, slug) DO UPDATE
SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

COMMIT;
