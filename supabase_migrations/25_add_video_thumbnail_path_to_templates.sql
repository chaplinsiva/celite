-- ============================================================================
-- ADD VIDEO_PATH AND THUMBNAIL_PATH TO TEMPLATES
-- ============================================================================
-- This migration adds video_path and thumbnail_path columns to the templates
-- table for storing video and thumbnail file URLs from Cloudflare R2 storage.
-- Old templates will continue to use the 'video' column for YouTube URLs.
-- ============================================================================

BEGIN;

DO $$
BEGIN
  -- Add video_path column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'templates'
      AND column_name = 'video_path'
  ) THEN
    ALTER TABLE public.templates
      ADD COLUMN video_path TEXT;
  END IF;

  -- Add thumbnail_path column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'templates'
      AND column_name = 'thumbnail_path'
  ) THEN
    ALTER TABLE public.templates
      ADD COLUMN thumbnail_path TEXT;
  END IF;
END $$;

COMMENT ON COLUMN public.templates.video_path IS 'URL to video file stored in Cloudflare R2. Stored at: category/subcategory/video/{filename}. New templates use this instead of YouTube URLs.';
COMMENT ON COLUMN public.templates.thumbnail_path IS 'URL to thumbnail image stored in Cloudflare R2. Stored at: category/subcategory/thumbnail/{filename}';

COMMIT;

