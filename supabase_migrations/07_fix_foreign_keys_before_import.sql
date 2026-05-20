-- ============================================================================
-- FIX FOREIGN KEYS BEFORE IMPORTING CSV
-- ============================================================================
-- Run this BEFORE importing your CSV file to fix category/subcategory IDs
-- This sets invalid foreign keys to NULL so they don't cause import errors
-- ============================================================================

-- If you've already imported the CSV and got the error, run this first:
-- This will set all invalid category/subcategory IDs to NULL

BEGIN;

-- Fix 1: Set invalid category_id to NULL
UPDATE public.templates 
SET category_id = NULL 
WHERE category_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM public.categories WHERE id = templates.category_id
  );

-- Fix 2: Set invalid subcategory_id to NULL
UPDATE public.templates 
SET subcategory_id = NULL 
WHERE subcategory_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM public.subcategories WHERE id = templates.subcategory_id
  );

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check how many templates have valid/invalid foreign keys
SELECT 
  COUNT(*) as total_templates,
  COUNT(category_id) as templates_with_category,
  COUNT(subcategory_id) as templates_with_subcategory,
  COUNT(CASE WHEN category_id IS NOT NULL 
             AND NOT EXISTS (
               SELECT 1 FROM public.categories WHERE id = templates.category_id
             ) THEN 1 END) as invalid_categories,
  COUNT(CASE WHEN subcategory_id IS NOT NULL 
             AND NOT EXISTS (
               SELECT 1 FROM public.subcategories WHERE id = templates.subcategory_id
             ) THEN 1 END) as invalid_subcategories
FROM public.templates;

