-- Remove price, featured, and limited offer columns from templates table
-- This migration removes these columns as the site is now subscription-only

BEGIN;

-- Drop indexes that reference these columns
DROP INDEX IF EXISTS idx_templates_is_featured;

-- Remove columns
ALTER TABLE public.templates
  DROP COLUMN IF EXISTS price,
  DROP COLUMN IF EXISTS is_featured,
  DROP COLUMN IF EXISTS is_limited_offer,
  DROP COLUMN IF EXISTS limited_offer_duration_days,
  DROP COLUMN IF EXISTS limited_offer_start_date;

COMMIT;

