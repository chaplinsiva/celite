-- ============================================================================
-- ADD CREATOR / VENDOR FIELDS TO TEMPLATES
-- ============================================================================
-- This migration links templates to creator shops and stores a vendor name
-- for display in listings and product pages.
--
-- 1. Adds creator_shop_id (FK → creator_shops.id)
-- 2. Adds vendor_name (optional display name of creator/vendor)
-- ============================================================================

BEGIN;

-- Add creator_shop_id and vendor_name columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'templates'
      AND column_name = 'creator_shop_id'
  ) THEN
    ALTER TABLE public.templates
      ADD COLUMN creator_shop_id UUID REFERENCES public.creator_shops(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'templates'
      AND column_name = 'vendor_name'
  ) THEN
    ALTER TABLE public.templates
      ADD COLUMN vendor_name TEXT;
  END IF;
END $$;

-- Index for creator_shop_id lookups
CREATE INDEX IF NOT EXISTS idx_templates_creator_shop_id
  ON public.templates(creator_shop_id);

-- Optional comment
COMMENT ON COLUMN public.templates.creator_shop_id IS 'Links a template to a creator_shops record (vendor profile)';
COMMENT ON COLUMN public.templates.vendor_name IS 'Cached vendor/creator display name for this template (falls back to Celite Studios when NULL)';

COMMIT;


