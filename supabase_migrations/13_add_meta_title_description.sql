-- ============================================================================
-- ADD META TITLE AND META DESCRIPTION COLUMNS TO TEMPLATES TABLE
-- ============================================================================
-- This migration adds meta_title and meta_description columns to the templates
-- table for SEO purposes.
-- ============================================================================

BEGIN;

-- Add meta_title column
ALTER TABLE public.templates
ADD COLUMN IF NOT EXISTS meta_title TEXT;

-- Add meta_description column
ALTER TABLE public.templates
ADD COLUMN IF NOT EXISTS meta_description TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.templates.meta_title IS 'SEO meta title for the product page (used in <title> tag and og:title)';
COMMENT ON COLUMN public.templates.meta_description IS 'SEO meta description for the product page (used in <meta name="description"> and og:description)';

COMMIT;

