-- ============================================================================
-- FIX COMMON CSV IMPORT ERRORS
-- ============================================================================
-- Run this script if you encounter errors during CSV import
-- This fixes common issues with CSV imports
-- ============================================================================

BEGIN;

-- Fix 1: Remove any templates with invalid slugs (empty or null)
DELETE FROM public.templates WHERE slug IS NULL OR slug = '';

-- Fix 2: Ensure slug is unique (remove duplicates, keeping the first one)
DELETE FROM public.templates t1
WHERE EXISTS (
  SELECT 1 FROM public.templates t2
  WHERE t2.slug = t1.slug
  AND t2.created_at > t1.created_at
);

-- Fix 3: Fix price field - ensure it's numeric
UPDATE public.templates 
SET price = 0 
WHERE price IS NULL OR price < 0;

-- Fix 4: Fix JSONB arrays that might be stored as strings
-- Handle features
DO $$
DECLARE
  rec RECORD;
  fixed_json JSONB;
BEGIN
  FOR rec IN SELECT slug, features FROM public.templates WHERE features IS NOT NULL LOOP
    BEGIN
      -- Try to parse as JSON
      fixed_json := rec.features::jsonb;
      
      -- If it's a string, try to convert
      IF jsonb_typeof(fixed_json) = 'string' THEN
        fixed_json := fixed_json::text::jsonb;
      END IF;
      
      -- Update if valid JSON
      IF fixed_json IS NOT NULL THEN
        UPDATE public.templates 
        SET features = fixed_json 
        WHERE slug = rec.slug;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- If parsing fails, set to empty array
      UPDATE public.templates 
      SET features = '[]'::jsonb 
      WHERE slug = rec.slug;
    END;
  END LOOP;
END $$;

-- Handle software
DO $$
DECLARE
  rec RECORD;
  fixed_json JSONB;
BEGIN
  FOR rec IN SELECT slug, software FROM public.templates WHERE software IS NOT NULL LOOP
    BEGIN
      fixed_json := rec.software::jsonb;
      IF jsonb_typeof(fixed_json) = 'string' THEN
        fixed_json := fixed_json::text::jsonb;
      END IF;
      IF fixed_json IS NOT NULL THEN
        UPDATE public.templates 
        SET software = fixed_json 
        WHERE slug = rec.slug;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.templates 
      SET software = '[]'::jsonb 
      WHERE slug = rec.slug;
    END;
  END LOOP;
END $$;

-- Handle plugins
DO $$
DECLARE
  rec RECORD;
  fixed_json JSONB;
BEGIN
  FOR rec IN SELECT slug, plugins FROM public.templates WHERE plugins IS NOT NULL LOOP
    BEGIN
      fixed_json := rec.plugins::jsonb;
      IF jsonb_typeof(fixed_json) = 'string' THEN
        fixed_json := fixed_json::text::jsonb;
      END IF;
      IF fixed_json IS NOT NULL THEN
        UPDATE public.templates 
        SET plugins = fixed_json 
        WHERE slug = rec.slug;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.templates 
      SET plugins = '[]'::jsonb 
      WHERE slug = rec.slug;
    END;
  END LOOP;
END $$;

-- Handle tags
DO $$
DECLARE
  rec RECORD;
  fixed_json JSONB;
BEGIN
  FOR rec IN SELECT slug, tags FROM public.templates WHERE tags IS NOT NULL LOOP
    BEGIN
      fixed_json := rec.tags::jsonb;
      IF jsonb_typeof(fixed_json) = 'string' THEN
        fixed_json := fixed_json::text::jsonb;
      END IF;
      IF fixed_json IS NOT NULL THEN
        UPDATE public.templates 
        SET tags = fixed_json 
        WHERE slug = rec.slug;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.templates 
      SET tags = '[]'::jsonb 
      WHERE slug = rec.slug;
    END;
  END LOOP;
END $$;

-- Fix 5: Ensure all required fields have default values
UPDATE public.templates 
SET 
  features = COALESCE(features, '[]'::jsonb),
  software = COALESCE(software, '[]'::jsonb),
  plugins = COALESCE(plugins, '[]'::jsonb),
  tags = COALESCE(tags, '[]'::jsonb),
  is_featured = COALESCE(is_featured, false),
  is_limited_offer = COALESCE(is_limited_offer, false),
  price = COALESCE(price, 0)
WHERE features IS NULL 
   OR software IS NULL 
   OR plugins IS NULL 
   OR tags IS NULL 
   OR is_featured IS NULL
   OR is_limited_offer IS NULL
   OR price IS NULL;

-- Fix 6: Clean up category/subcategory foreign keys
UPDATE public.templates 
SET category_id = NULL 
WHERE category_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM public.categories WHERE id = templates.category_id);

UPDATE public.templates 
SET subcategory_id = NULL 
WHERE subcategory_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM public.subcategories WHERE id = templates.subcategory_id);

-- Fix 7: Set timestamps
UPDATE public.templates 
SET 
  created_at = COALESCE(created_at, NOW()),
  updated_at = NOW();

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check for any remaining issues
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN slug IS NULL OR slug = '' THEN 1 END) as invalid_slugs,
  COUNT(CASE WHEN price IS NULL OR price < 0 THEN 1 END) as invalid_prices,
  COUNT(CASE WHEN features IS NULL THEN 1 END) as null_features,
  COUNT(CASE WHEN software IS NULL THEN 1 END) as null_software,
  COUNT(CASE WHEN plugins IS NULL THEN 1 END) as null_plugins,
  COUNT(CASE WHEN tags IS NULL THEN 1 END) as null_tags,
  COUNT(CASE WHEN category_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.categories WHERE id = templates.category_id
  ) THEN 1 END) as invalid_categories,
  COUNT(CASE WHEN subcategory_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.subcategories WHERE id = templates.subcategory_id
  ) THEN 1 END) as invalid_subcategories
FROM public.templates;

