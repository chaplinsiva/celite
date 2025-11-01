-- ============================================================================
-- STEP-BY-STEP CSV IMPORT FIX
-- ============================================================================
-- Use this if the import fails. Run each section separately and check results.
-- ============================================================================

-- STEP 1: After importing CSV, clean up img column (deprecated)
UPDATE public.templates SET img = NULL WHERE img IS NOT NULL;

-- STEP 2: Remove old storage bucket video URLs
-- These URLs from old Supabase project won't work in new project
UPDATE public.templates 
SET video = NULL 
WHERE video LIKE '%/storage/v1/object/public/%'
   OR video LIKE '%supabase.co/storage%';

-- STEP 3: Keep only YouTube links (one row already has it: vettaiyan-4k-title-card-template)
-- The rest will be NULL and need to be added manually

-- STEP 4: Fix empty strings to NULL
UPDATE public.templates 
SET video = NULL WHERE video = '' OR video = ' ' OR video = 'null';
UPDATE public.templates 
SET subtitle = NULL WHERE subtitle = '' OR subtitle = ' ';
UPDATE public.templates 
SET description = NULL WHERE description = '' OR description = ' ';
UPDATE public.templates 
SET source_path = NULL WHERE source_path = '' OR source_path = ' ';

-- STEP 5: Fix JSONB fields that are stored as JSON strings
-- The CSV stores arrays as JSON strings, convert them properly

-- Features: Convert string JSON arrays to JSONB
UPDATE public.templates 
SET features = (
  CASE 
    WHEN features IS NULL THEN '[]'::jsonb
    WHEN features::text = '[]' THEN '[]'::jsonb
    WHEN features::text LIKE '[%' THEN features::text::jsonb
    ELSE '[]'::jsonb
  END
);

-- Software: Same fix
UPDATE public.templates 
SET software = (
  CASE 
    WHEN software IS NULL THEN '[]'::jsonb
    WHEN software::text = '[]' THEN '[]'::jsonb
    WHEN software::text LIKE '[%' THEN software::text::jsonb
    ELSE '[]'::jsonb
  END
);

-- Plugins: Same fix
UPDATE public.templates 
SET plugins = (
  CASE 
    WHEN plugins IS NULL THEN '[]'::jsonb
    WHEN plugins::text = '[]' THEN '[]'::jsonb
    WHEN plugins::text LIKE '[%' THEN plugins::text::jsonb
    ELSE '[]'::jsonb
  END
);

-- Tags: Same fix
UPDATE public.templates 
SET tags = (
  CASE 
    WHEN tags IS NULL THEN '[]'::jsonb
    WHEN tags::text = '[]' THEN '[]'::jsonb
    WHEN tags::text LIKE '[%' THEN tags::text::jsonb
    ELSE '[]'::jsonb
  END
);

-- STEP 6: Fix boolean fields
UPDATE public.templates 
SET is_featured = COALESCE(is_featured, false);
UPDATE public.templates 
SET is_limited_offer = COALESCE(is_limited_offer, false);

-- STEP 7: Ensure price is valid
UPDATE public.templates 
SET price = COALESCE(price, 0) 
WHERE price IS NULL OR price < 0;

-- STEP 8: Fix timestamps
UPDATE public.templates 
SET created_at = COALESCE(created_at, NOW()),
    updated_at = NOW()
WHERE created_at IS NULL;

-- STEP 9: Validate foreign keys
-- Remove invalid category/subcategory references
UPDATE public.templates 
SET category_id = NULL 
WHERE category_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM public.categories WHERE id = templates.category_id
  );

UPDATE public.templates 
SET subcategory_id = NULL 
WHERE subcategory_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM public.subcategories WHERE id = templates.subcategory_id
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check import status
SELECT 
  COUNT(*) as total_templates,
  COUNT(video) as templates_with_video,
  COUNT(CASE WHEN video LIKE '%youtube.com%' OR video LIKE '%youtu.be%' THEN 1 END) as youtube_links,
  COUNT(CASE WHEN video IS NULL THEN 1 END) as missing_video_links
FROM public.templates;

-- Find templates needing YouTube links
SELECT slug, name 
FROM public.templates 
WHERE video IS NULL 
ORDER BY name;

