-- ============================================================================
-- IMPORT TEMPLATES FROM CSV
-- ============================================================================
-- This script imports template data from CSV file.
--
-- ⚠️ IMPORTANT:
-- 1. Make sure categories/subcategories are already created (run 00_complete_fresh_setup.sql first)
-- 2. Adjust the CSV file path or use Supabase Dashboard → Table Editor → Import
-- 3. For video column: Storage bucket URLs will be set to NULL (need YouTube links)
-- 4. Empty values will be handled as NULL
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- OPTION 1: Using COPY command (if you have file access)
-- ============================================================================
-- Note: Supabase Dashboard doesn't support COPY FROM, so use Option 2 instead
-- 
-- COPY public.templates (
--   slug, name, subtitle, description, price, video, features, software, plugins, 
--   tags, is_featured, source_path, is_limited_offer, limited_offer_duration_days, 
--   limited_offer_start_date, category_id, subcategory_id
-- )
-- FROM '/path/to/templates_rows.csv'
-- WITH (FORMAT csv, HEADER true, NULL '');
-- ============================================================================

-- ============================================================================
-- OPTION 2: Manual INSERT statements (use Supabase Dashboard → Table Editor → Import)
-- ============================================================================
-- Instead, use the Supabase Dashboard:
-- 1. Go to Table Editor → templates table
-- 2. Click "Import data via CSV"
-- 3. Upload your CSV file
-- 4. Map columns correctly
-- 5. After import, run the UPDATE statements below to clean up the data
-- ============================================================================

-- ============================================================================
-- DATA CLEANUP AFTER CSV IMPORT
-- ============================================================================
-- Run these statements after importing the CSV to clean up the data

-- 1. Set img to NULL (deprecated column, not used anymore)
UPDATE public.templates SET img = NULL WHERE img IS NOT NULL;

-- 2. Remove old storage bucket video URLs (they won't work anymore)
-- Convert any storage bucket URLs to NULL (you'll need to add YouTube links manually)
UPDATE public.templates 
SET video = NULL 
WHERE video IS NOT NULL 
  AND video LIKE '%/storage/v1/object/public/%'
  AND video NOT LIKE '%youtube.com%'
  AND video NOT LIKE '%youtu.be%';

-- 3. Clean empty strings and set to NULL
UPDATE public.templates 
SET video = NULL 
WHERE video = '' OR video = ' ';

UPDATE public.templates 
SET subtitle = NULL 
WHERE subtitle = '' OR subtitle = ' ';

UPDATE public.templates 
SET description = NULL 
WHERE description = '' OR description = ' ';

UPDATE public.templates 
SET source_path = NULL 
WHERE source_path = '' OR source_path = ' ';

-- 4. Ensure JSONB fields are properly formatted
-- Fix features if it's a string instead of JSONB
UPDATE public.templates 
SET features = CASE 
  WHEN features IS NULL OR features = 'null'::jsonb THEN '[]'::jsonb
  WHEN features::text LIKE '"%' AND features::text LIKE '%"' THEN features  -- Already JSON string
  WHEN features::text LIKE '[%' THEN features  -- Already JSON array
  ELSE ('["' || REPLACE(features::text, ',', '","') || '"]')::jsonb
END
WHERE features IS NOT NULL;

-- Fix software
UPDATE public.templates 
SET software = CASE 
  WHEN software IS NULL OR software = 'null'::jsonb THEN '[]'::jsonb
  WHEN software::text LIKE '"%' AND software::text LIKE '%"' THEN software
  WHEN software::text LIKE '[%' THEN software
  ELSE ('["' || REPLACE(software::text, ',', '","') || '"]')::jsonb
END
WHERE software IS NOT NULL;

-- Fix plugins
UPDATE public.templates 
SET plugins = CASE 
  WHEN plugins IS NULL OR plugins = 'null'::jsonb THEN '[]'::jsonb
  WHEN plugins::text LIKE '"%' AND plugins::text LIKE '%"' THEN plugins
  WHEN plugins::text LIKE '[%' THEN plugins
  ELSE ('["' || REPLACE(plugins::text, ',', '","') || '"]')::jsonb
END
WHERE plugins IS NOT NULL;

-- Fix tags
UPDATE public.templates 
SET tags = CASE 
  WHEN tags IS NULL OR tags = 'null'::jsonb THEN '[]'::jsonb
  WHEN tags::text LIKE '"%' AND tags::text LIKE '%"' THEN tags
  WHEN tags::text LIKE '[%' THEN tags
  ELSE ('["' || REPLACE(tags::text, ',', '","') || '"]')::jsonb
END
WHERE tags IS NOT NULL;

-- 5. Ensure price is numeric (remove any non-numeric characters if needed)
UPDATE public.templates 
SET price = NULL 
WHERE price < 0 OR price IS NULL;

-- 6. Set boolean fields properly
UPDATE public.templates 
SET is_featured = COALESCE(is_featured, false);

UPDATE public.templates 
SET is_limited_offer = COALESCE(is_limited_offer, false);

-- 7. Validate foreign keys (remove invalid category/subcategory references)
UPDATE public.templates 
SET category_id = NULL 
WHERE category_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM public.categories WHERE id = templates.category_id);

UPDATE public.templates 
SET subcategory_id = NULL 
WHERE subcategory_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM public.subcategories WHERE id = templates.subcategory_id);

-- 8. Set updated_at timestamp
UPDATE public.templates 
SET updated_at = NOW();

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check imported templates
-- SELECT 
--   COUNT(*) as total_templates,
--   COUNT(video) as templates_with_video,
--   COUNT(CASE WHEN video LIKE '%youtube.com%' OR video LIKE '%youtu.be%' THEN 1 END) as templates_with_youtube,
--   COUNT(is_featured) FILTER (WHERE is_featured = true) as featured_templates
-- FROM public.templates;

-- Find templates needing YouTube links:
-- SELECT slug, name, video
-- FROM public.templates
-- WHERE video IS NULL
-- ORDER BY name;

-- Check for invalid JSONB:
-- SELECT slug, name, features, software, plugins, tags
-- FROM public.templates
-- WHERE features IS NULL OR software IS NULL OR plugins IS NULL OR tags IS NULL;

