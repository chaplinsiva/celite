-- ============================================================================
-- UPDATE TEMPLATES TO CREATOR SHOP
-- ============================================================================
-- This script updates all templates that currently have "Celite Studios" 
-- as the vendor (or NULL vendor_name) to be connected to the specified creator shop.
-- Excludes templates that already have a creator_shop_id (vendor-owned templates).
-- ============================================================================

BEGIN;

-- Update templates that:
-- 1. Don't have a creator_shop_id (excludes already vendor-owned templates)
-- 2. Have NULL vendor_name OR vendor_name = 'Celite Studios' (mock data)
UPDATE public.templates
SET 
  creator_shop_id = '54297974-d7e7-4b59-9f91-89800be0b3f5',
  vendor_name = 'ChaplinStudios',
  updated_at = NOW()
WHERE 
  creator_shop_id IS NULL
  AND (vendor_name IS NULL OR vendor_name = 'Celite Studios');

-- Show how many templates were updated
SELECT 
  COUNT(*) as updated_count,
  'Templates updated to ChaplinStudios' as message
FROM public.templates
WHERE 
  creator_shop_id = '54297974-d7e7-4b59-9f91-89800be0b3f5'
  AND vendor_name = 'ChaplinStudios';

COMMIT;

