-- ============================================================================
-- ADD PREVIEW_PATH TO TEMPLATES
-- ============================================================================
-- This migration adds preview_path column to the templates table for storing
-- preview file URLs from Cloudflare R2 storage.
-- ============================================================================

BEGIN;

DO $$
BEGIN
  -- Add preview_path column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'templates'
      AND column_name = 'preview_path'
  ) THEN
    ALTER TABLE public.templates
      ADD COLUMN preview_path TEXT;
  END IF;
END $$;

COMMENT ON COLUMN public.templates.preview_path IS 'URL to preview file (image/video) stored in Cloudflare R2. Stored at: category/subcategory/preview/{filename}';

COMMIT;

