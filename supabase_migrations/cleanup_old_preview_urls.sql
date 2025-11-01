-- Data Cleanup: Remove old storage bucket preview URLs
-- This script cleans up old storage bucket image and video URLs from the templates table
-- Run this AFTER you've migrated all templates to use YouTube links

-- Step 1: Clear all image URLs (we're no longer using image previews)
-- This sets img to NULL for all templates since YouTube videos serve as previews
UPDATE public.templates 
SET img = NULL 
WHERE img IS NOT NULL;

-- Step 2: Optional - Remove storage bucket video URLs that are not YouTube links
-- Only run this if you've already migrated all videos to YouTube and want to clean up
-- Uncomment the lines below when ready:

/*
-- Find templates with storage bucket video URLs (Supabase storage URLs)
UPDATE public.templates
SET video = NULL
WHERE video IS NOT NULL
  AND video LIKE '%/storage/v1/object/public/%'
  AND video NOT LIKE '%youtube.com%'
  AND video NOT LIKE '%youtu.be%';
*/

-- Step 3: Show summary of current state
-- Run this query to see how many templates have video links:
SELECT 
  COUNT(*) as total_templates,
  COUNT(video) as templates_with_video,
  COUNT(CASE WHEN video LIKE '%youtube.com%' OR video LIKE '%youtu.be%' THEN 1 END) as templates_with_youtube,
  COUNT(CASE WHEN video LIKE '%/storage/v1/object/public/%' THEN 1 END) as templates_with_storage_urls,
  COUNT(img) as templates_with_img
FROM public.templates;

-- Step 4: Optional - Find templates that still need YouTube links
-- This query shows templates without video URLs:
/*
SELECT slug, name, video
FROM public.templates
WHERE video IS NULL OR video = ''
ORDER BY name;
*/

