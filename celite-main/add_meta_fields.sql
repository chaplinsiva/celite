-- ============================================================================
-- SQL COMMAND TO ADD META TITLE AND META DESCRIPTION TO TEMPLATES TABLE
-- ============================================================================
-- Run this SQL command in your Supabase SQL Editor or database client
-- to add meta_title and meta_description columns to the templates table.
-- ============================================================================

-- Add meta_title column
ALTER TABLE public.templates
ADD COLUMN IF NOT EXISTS meta_title TEXT;

-- Add meta_description column
ALTER TABLE public.templates
ADD COLUMN IF NOT EXISTS meta_description TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.templates.meta_title IS 'SEO meta title for the product page (used in <title> tag and og:title)';
COMMENT ON COLUMN public.templates.meta_description IS 'SEO meta description for the product page (used in <meta name="description"> and og:description)';

