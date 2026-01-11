-- ============================================================================
-- ADD STATUS / REVIEW FIELDS TO TEMPLATES
-- ============================================================================
-- This migration:
-- 1. Adds a status field to templates: 'approved' | 'pending' | 'rejected'
-- 2. Adds optional review_note and reviewed_at fields for moderation
--
-- Existing templates default to 'approved' so current catalog keeps working.
-- ============================================================================

BEGIN;

DO $$
BEGIN
  -- Add status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'templates'
      AND column_name = 'status'
  ) THEN
    ALTER TABLE public.templates
      ADD COLUMN status TEXT NOT NULL DEFAULT 'approved';
  END IF;

  -- Add review_note column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'templates'
      AND column_name = 'review_note'
  ) THEN
    ALTER TABLE public.templates
      ADD COLUMN review_note TEXT;
  END IF;

  -- Add reviewed_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'templates'
      AND column_name = 'reviewed_at'
  ) THEN
    ALTER TABLE public.templates
      ADD COLUMN reviewed_at TIMESTAMPTZ;
  END IF;
END $$;

COMMENT ON COLUMN public.templates.status IS 'Moderation status: approved, pending, or rejected';
COMMENT ON COLUMN public.templates.review_note IS 'Optional admin review note for this template';
COMMENT ON COLUMN public.templates.reviewed_at IS 'Timestamp when template was last reviewed by an admin';

-- Index to quickly find pending templates
CREATE INDEX IF NOT EXISTS idx_templates_status
  ON public.templates(status);

COMMIT;


