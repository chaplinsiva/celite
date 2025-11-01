-- ============================================================================
-- SET DEFAULT YOUTUBE VIDEO FOR TEMPLATES WITHOUT VIDEOS
-- ============================================================================
-- Use this script to set a default YouTube video URL for all templates
-- that don't have a video link
-- 
-- ⚠️ IMPORTANT: Replace 'YOUR_DEFAULT_VIDEO_ID' with an actual YouTube video ID
-- ============================================================================

-- Replace 'YOUR_DEFAULT_VIDEO_ID' with your YouTube video ID
-- Example: If your video is https://www.youtube.com/watch?v=dQw4w9WgXcQ
-- Then use: 'dQw4w9WgXcQ'
UPDATE public.templates 
SET video = 'https://www.youtube.com/watch?v=YOUR_DEFAULT_VIDEO_ID' 
WHERE video IS NULL;

-- Or if you want to use the embed URL format:
-- UPDATE public.templates 
-- SET video = 'https://www.youtube.com/embed/YOUR_DEFAULT_VIDEO_ID' 
-- WHERE video IS NULL;

-- Verify the update
SELECT 
  COUNT(*) as total_templates,
  COUNT(video) as templates_with_video,
  COUNT(CASE WHEN video IS NULL THEN 1 END) as templates_without_video
FROM public.templates;

