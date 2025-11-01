-- Migration: Migrate from storage bucket previews to YouTube video links
-- This migration updates the templates table to use YouTube video links instead of storage bucket images/videos

-- Step 1: Update column comments to reflect the new usage
COMMENT ON COLUMN public.templates.img IS 'DEPRECATED: Image previews are no longer used. This column is kept for backward compatibility but should be NULL. Use video column for YouTube links instead.';
COMMENT ON COLUMN public.templates.video IS 'YouTube video URL or embed URL for template preview. Supports various formats: https://www.youtube.com/watch?v=VIDEO_ID, https://youtu.be/VIDEO_ID, or embed URL.';

-- Step 2: Optional: Clear old storage bucket image URLs (uncomment if you want to clean up old data)
-- This sets img to NULL for all templates since we're no longer using image previews
-- UPDATE public.templates 
-- SET img = NULL 
-- WHERE img IS NOT NULL;

-- Step 3: Optional: Clean up old storage bucket video URLs and convert to YouTube if needed
-- If you have old storage bucket video URLs and want to keep them as-is, skip this step
-- Otherwise, you can manually update the video column with YouTube links

-- Step 4: Add a check constraint to help validate YouTube URLs (optional)
-- This will ensure video URLs contain 'youtube' or 'youtu.be' when provided
-- ALTER TABLE public.templates
-- ADD CONSTRAINT check_video_youtube 
-- CHECK (
--   video IS NULL 
--   OR video LIKE '%youtube.com%' 
--   OR video LIKE '%youtu.be%'
--   OR video = ''
-- );

-- Note: The check constraint above is commented out because:
-- 1. You might want to support other video platforms in the future
-- 2. The validation is handled in the application layer via getYouTubeEmbedUrl()
-- 3. It's more flexible to not enforce this at the database level

-- Step 5: Add index on video column if you frequently query by video presence (optional)
-- CREATE INDEX IF NOT EXISTS idx_templates_has_video ON public.templates(video) WHERE video IS NOT NULL;

-- Summary:
-- - img column: DEPRECATED, should be NULL for new entries
-- - video column: Now stores YouTube URLs instead of storage bucket URLs
-- - No structural changes needed to existing columns (both are already TEXT)
-- - Application layer handles YouTube URL validation and conversion to embed URLs

