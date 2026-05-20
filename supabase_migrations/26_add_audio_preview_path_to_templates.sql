-- ============================================================================
-- ADD AUDIO_PREVIEW_PATH TO TEMPLATES
-- ============================================================================
-- This migration adds audio_preview_path column to the templates table for storing
-- audio preview file URLs from Cloudflare R2 storage.
-- ============================================================================

BEGIN;

DO $$
BEGIN
  -- Add audio_preview_path column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'templates'
      AND column_name = 'audio_preview_path'
  ) THEN
    ALTER TABLE public.templates
      ADD COLUMN audio_preview_path TEXT;
  END IF;
END $$;

COMMENT ON COLUMN public.templates.audio_preview_path IS 'URL to audio preview file stored in Cloudflare R2. Stored at: category/subcategory/audio/{filename}';

COMMIT;

