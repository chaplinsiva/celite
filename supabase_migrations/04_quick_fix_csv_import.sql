-- ============================================================================
-- QUICK FIX FOR CSV IMPORT ERRORS
-- ============================================================================
-- Run this immediately after importing templates_rows.csv
-- This fixes the most common import issues
-- ============================================================================

BEGIN;

-- Fix 1: Set img to NULL (deprecated, not used)
UPDATE public.templates SET img = NULL WHERE img IS NOT NULL;

-- Fix 2: Remove old storage bucket video URLs (these won't work anymore)
-- If video is a storage bucket URL, set to NULL (will need YouTube link)
UPDATE public.templates 
SET video = NULL 
WHERE video IS NOT NULL 
  AND (video LIKE '%/storage/v1/object/public/%' 
       OR video LIKE '%supabase.co/storage%'
       OR video LIKE '%supabase.co%');

-- Optional: Set default YouTube URL for templates without videos
-- Uncomment and replace 'YOUR_DEFAULT_VIDEO_ID' with your actual YouTube video ID
-- UPDATE public.templates 
-- SET video = 'https://www.youtube.com/watch?v=YOUR_DEFAULT_VIDEO_ID' 
-- WHERE video IS NULL;

-- Fix 3: Clean empty strings (run separately for each field)
UPDATE public.templates SET video = NULL WHERE video = '' OR video = ' ' OR video IS NULL;
UPDATE public.templates SET subtitle = NULL WHERE subtitle = '' OR subtitle = ' ';
UPDATE public.templates SET description = NULL WHERE description = '' OR description = ' ';
UPDATE public.templates SET source_path = NULL WHERE source_path = '' OR source_path = ' ';

-- Fix 3a: Set default YouTube URL for templates without videos (if needed)
-- Replace 'YOUR_DEFAULT_VIDEO_ID' with an actual YouTube video ID
-- UPDATE public.templates 
-- SET video = 'https://www.youtube.com/watch?v=YOUR_DEFAULT_VIDEO_ID' 
-- WHERE video IS NULL;

-- Fix 4: Parse JSONB fields that are stored as strings
-- The CSV has JSON arrays as strings, we need to parse them properly

-- Fix features (handles both string arrays and JSON arrays)
-- Use DO block to handle casting errors gracefully
DO $$
DECLARE
  rec RECORD;
  parsed_json JSONB;
BEGIN
  FOR rec IN 
    SELECT slug, features 
    FROM public.templates 
    WHERE features IS NOT NULL
  LOOP
    BEGIN
      -- Try to parse as JSONB
      IF rec.features IS NULL OR rec.features::text = 'null' THEN
        parsed_json := '[]'::jsonb;
      ELSIF rec.features::text LIKE '[%' OR rec.features::text LIKE '{%' THEN
        -- Looks like JSON, try to cast
        parsed_json := rec.features::text::jsonb;
      ELSE
        -- Set to empty array as fallback
        parsed_json := '[]'::jsonb;
      END IF;
      
      UPDATE public.templates 
      SET features = parsed_json 
      WHERE slug = rec.slug;
    EXCEPTION WHEN OTHERS THEN
      -- If parsing fails, set to empty array
      UPDATE public.templates 
      SET features = '[]'::jsonb 
      WHERE slug = rec.slug;
    END;
  END LOOP;
END $$;


-- Fix software
DO $$
DECLARE
  rec RECORD;
  parsed_json JSONB;
BEGIN
  FOR rec IN 
    SELECT slug, software 
    FROM public.templates 
    WHERE software IS NOT NULL
  LOOP
    BEGIN
      IF rec.software IS NULL OR rec.software::text = 'null' THEN
        parsed_json := '[]'::jsonb;
      ELSIF rec.software::text LIKE '[%' OR rec.software::text LIKE '{%' THEN
        parsed_json := rec.software::text::jsonb;
      ELSE
        parsed_json := '[]'::jsonb;
      END IF;
      
      UPDATE public.templates 
      SET software = parsed_json 
      WHERE slug = rec.slug;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.templates 
      SET software = '[]'::jsonb 
      WHERE slug = rec.slug;
    END;
  END LOOP;
END $$;

-- Fix plugins
DO $$
DECLARE
  rec RECORD;
  parsed_json JSONB;
BEGIN
  FOR rec IN 
    SELECT slug, plugins 
    FROM public.templates 
    WHERE plugins IS NOT NULL
  LOOP
    BEGIN
      IF rec.plugins IS NULL OR rec.plugins::text = 'null' THEN
        parsed_json := '[]'::jsonb;
      ELSIF rec.plugins::text LIKE '[%' OR rec.plugins::text LIKE '{%' THEN
        parsed_json := rec.plugins::text::jsonb;
      ELSE
        parsed_json := '[]'::jsonb;
      END IF;
      
      UPDATE public.templates 
      SET plugins = parsed_json 
      WHERE slug = rec.slug;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.templates 
      SET plugins = '[]'::jsonb 
      WHERE slug = rec.slug;
    END;
  END LOOP;
END $$;

-- Fix tags
DO $$
DECLARE
  rec RECORD;
  parsed_json JSONB;
BEGIN
  FOR rec IN 
    SELECT slug, tags 
    FROM public.templates 
    WHERE tags IS NOT NULL
  LOOP
    BEGIN
      IF rec.tags IS NULL OR rec.tags::text = 'null' THEN
        parsed_json := '[]'::jsonb;
      ELSIF rec.tags::text LIKE '[%' OR rec.tags::text LIKE '{%' THEN
        parsed_json := rec.tags::text::jsonb;
      ELSE
        parsed_json := '[]'::jsonb;
      END IF;
      
      UPDATE public.templates 
      SET tags = parsed_json 
      WHERE slug = rec.slug;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.templates 
      SET tags = '[]'::jsonb 
      WHERE slug = rec.slug;
    END;
  END LOOP;
END $$;

-- Fix 5: Ensure default values for required fields
UPDATE public.templates 
SET 
  features = COALESCE(features, '[]'::jsonb),
  software = COALESCE(software, '[]'::jsonb),
  plugins = COALESCE(plugins, '[]'::jsonb),
  tags = COALESCE(tags, '[]'::jsonb),
  price = COALESCE(price, 0),
  is_featured = COALESCE(is_featured, false),
  is_limited_offer = COALESCE(is_limited_offer, false)
WHERE features IS NULL 
   OR software IS NULL 
   OR plugins IS NULL 
   OR tags IS NULL 
   OR price IS NULL
   OR is_featured IS NULL
   OR is_limited_offer IS NULL;

-- Fix 6: Validate and fix foreign keys
-- This MUST run to prevent foreign key constraint violations
-- It sets invalid category/subcategory IDs to NULL

-- First, check and fix categories
UPDATE public.templates 
SET category_id = NULL 
WHERE category_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM public.categories WHERE id = templates.category_id
  );

-- Then, fix subcategories (which depend on categories)
UPDATE public.templates 
SET subcategory_id = NULL 
WHERE subcategory_id IS NOT NULL 
  AND (
    -- Subcategory doesn't exist
    NOT EXISTS (
      SELECT 1 FROM public.subcategories WHERE id = templates.subcategory_id
    )
    -- OR parent category is invalid (also set subcategory to NULL)
    OR category_id IS NULL
  );

-- Fix 7: Ensure timestamps are set
UPDATE public.templates 
SET 
  created_at = COALESCE(created_at, NOW()),
  updated_at = NOW()
WHERE created_at IS NULL;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Run these queries to verify the import:

-- 1. Check total count
-- SELECT COUNT(*) as total_templates FROM public.templates;

-- 2. Check for issues
-- SELECT 
--   COUNT(*) as total,
--   COUNT(CASE WHEN video IS NULL THEN 1 END) as missing_videos,
--   COUNT(CASE WHEN features IS NULL OR features::text = '[]' THEN 1 END) as empty_features,
--   COUNT(CASE WHEN price IS NULL OR price < 0 THEN 1 END) as invalid_prices
-- FROM public.templates;

-- 3. Find templates that need YouTube links
-- SELECT slug, name, video 
-- FROM public.templates 
-- WHERE video IS NULL 
-- ORDER BY name;

-- 4. Check JSONB fields are valid
-- SELECT slug, name, 
--   jsonb_typeof(features) as features_type,
--   jsonb_typeof(software) as software_type,
--   jsonb_typeof(plugins) as plugins_type,
--   jsonb_typeof(tags) as tags_type
-- FROM public.templates
-- LIMIT 5;

