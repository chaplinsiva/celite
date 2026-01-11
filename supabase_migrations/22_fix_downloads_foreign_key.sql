-- ============================================================================
-- FIX DOWNLOADS FOREIGN KEY CONSTRAINT
-- ============================================================================
-- This migration fixes the foreign key constraint on downloads.template_slug
-- to allow template deletion and slug changes by using ON DELETE SET NULL
-- ============================================================================

BEGIN;

-- First, check if downloads table exists and has the constraint
DO $$
BEGIN
  -- Drop the existing foreign key constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'downloads'
      AND constraint_name = 'downloads_template_slug_fkey'
  ) THEN
    ALTER TABLE public.downloads
      DROP CONSTRAINT downloads_template_slug_fkey;
  END IF;

  -- Re-add the constraint with ON DELETE SET NULL
  -- This allows templates to be deleted while preserving download history
  -- Note: ON UPDATE CASCADE is not supported in PostgreSQL, so we handle slug updates manually in code
  ALTER TABLE public.downloads
    ADD CONSTRAINT downloads_template_slug_fkey
    FOREIGN KEY (template_slug)
    REFERENCES public.templates(slug)
    ON DELETE SET NULL;
END $$;

COMMIT;

