-- ============================================================================
-- Migration: Complete Migration to YouTube Video Previews
-- ============================================================================
-- This script migrates from storage bucket previews to YouTube video links
-- 
-- CHANGES:
-- 1. Updates column comments/documentation
-- 2. Clears old image URLs (img column deprecated)
-- 3. Keeps video column for YouTube links
--
-- ⚠️ IMPORTANT: Backup your database before running this migration!
-- ============================================================================

BEGIN;

-- Step 1: Update column comments to reflect new usage
COMMENT ON COLUMN public.templates.img IS 'DEPRECATED: Image previews are no longer used. This column is kept for backward compatibility but should be NULL. Use video column for YouTube links instead.';
COMMENT ON COLUMN public.templates.video IS 'YouTube video URL or embed URL for template preview. Supports various formats: https://www.youtube.com/watch?v=VIDEO_ID, https://youtu.be/VIDEO_ID, or embed URL.';

-- Step 2: Clear all image URLs (we're no longer using image previews)
-- YouTube videos will serve as the preview, so img column should be NULL
UPDATE public.templates 
SET img = NULL 
WHERE img IS NOT NULL;

-- Step 3: Show migration summary
-- Note: This runs after the update, so results may show 0 for templates_with_img
DO $$
DECLARE
  total_count INTEGER;
  video_count INTEGER;
  youtube_count INTEGER;
  storage_url_count INTEGER;
  img_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM public.templates;
  SELECT COUNT(video) INTO video_count FROM public.templates WHERE video IS NOT NULL;
  SELECT COUNT(*) INTO youtube_count FROM public.templates WHERE video LIKE '%youtube.com%' OR video LIKE '%youtu.be%';
  SELECT COUNT(*) INTO storage_url_count FROM public.templates WHERE video LIKE '%/storage/v1/object/public/%';
  SELECT COUNT(img) INTO img_count FROM public.templates WHERE img IS NOT NULL;
  
  RAISE NOTICE 'Migration Summary:';
  RAISE NOTICE '  Total templates: %', total_count;
  RAISE NOTICE '  Templates with video: %', video_count;
  RAISE NOTICE '  Templates with YouTube links: %', youtube_count;
  RAISE NOTICE '  Templates with storage bucket URLs: %', storage_url_count;
  RAISE NOTICE '  Templates with img values (should be 0): %', img_count;
END $$;

-- Step 4: Optional - Remove old storage bucket video URLs
-- UNCOMMENT THE BLOCK BELOW ONLY IF:
-- 1. You've already migrated all videos to YouTube links
-- 2. You want to remove old storage bucket video URLs
-- 3. You've backed up your database

/*
UPDATE public.templates
SET video = NULL
WHERE video IS NOT NULL
  AND video LIKE '%/storage/v1/object/public/%'
  AND video NOT LIKE '%youtube.com%'
  AND video NOT LIKE '%youtu.be%';

RAISE NOTICE 'Removed old storage bucket video URLs';
*/

-- Step 5: Create index for better performance (optional)
-- This index helps when querying templates with videos
CREATE INDEX IF NOT EXISTS idx_templates_has_video 
ON public.templates(video) 
WHERE video IS NOT NULL;

COMMIT;

-- ============================================================================
-- Verification Queries (Run these separately to verify migration)
-- ============================================================================

-- Check migration status:
-- SELECT 
--   COUNT(*) as total_templates,
--   COUNT(video) as templates_with_video,
--   COUNT(CASE WHEN video LIKE '%youtube.com%' OR video LIKE '%youtu.be%' THEN 1 END) as templates_with_youtube,
--   COUNT(CASE WHEN video LIKE '%/storage/v1/object/public/%' THEN 1 END) as templates_with_storage_urls,
--   COUNT(img) as templates_with_img
-- FROM public.templates;

-- Find templates without YouTube links (that may need updating):
-- SELECT slug, name, video
-- FROM public.templates
-- WHERE (video IS NULL OR video = '') OR (video NOT LIKE '%youtube.com%' AND video NOT LIKE '%youtu.be%')
-- ORDER BY name;

-- Find templates with old storage bucket URLs:
-- SELECT slug, name, video
-- FROM public.templates
-- WHERE video LIKE '%/storage/v1/object/public/%'
-- ORDER BY name;

