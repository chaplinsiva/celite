-- ============================================================================
-- IMPORT CSV WITHOUT FOREIGN KEY VALIDATION
-- ============================================================================
-- Use this approach if you want to import CSV without foreign key constraints
-- This temporarily disables foreign key checks, imports data, fixes FKs, then re-enables
-- ============================================================================

-- Option 1: Import via Supabase Dashboard with FK columns excluded
-- When importing CSV:
-- 1. Go to Table Editor → templates
-- 2. Click "Import data via CSV"
-- 3. IMPORTANT: DO NOT map category_id and subcategory_id columns
-- 4. After import, run 07_fix_foreign_keys_before_import.sql to set them properly

-- Option 2: Temporarily disable foreign key constraint (if you need category/subcategory data)
-- Note: This requires superuser access, may not work in Supabase
/*
BEGIN;

-- Disable foreign key check temporarily
ALTER TABLE public.templates 
DISABLE TRIGGER ALL;

-- Import your data here (manually or via COPY)

-- Re-enable foreign key check
ALTER TABLE public.templates 
ENABLE TRIGGER ALL;

-- Fix invalid foreign keys
UPDATE public.templates 
SET category_id = NULL 
WHERE category_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM public.categories WHERE id = templates.category_id
  );

UPDATE public.templates 
SET subcategory_id = NULL 
WHERE subcategory_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM public.subcategories WHERE id = templates.subcategory_id
  );

COMMIT;
*/

-- Option 3: Import without category/subcategory, then add them later
-- This is the RECOMMENDED approach:

-- Step 1: Import CSV but SKIP category_id and subcategory_id columns
-- Step 2: After import, run this to manually set categories based on template names/tags
-- You can manually assign categories via Admin Panel later

-- Step 3: Or map old category IDs to new ones:
-- Find matching categories by name and update:

/*
-- Example: Map templates to correct categories by matching names/patterns
-- Replace 'category-slug' with actual category slugs from your new database

-- First, check what categories exist:
SELECT id, name, slug FROM public.categories;

-- Then update templates to match categories:
UPDATE public.templates 
SET category_id = (
  SELECT id FROM public.categories 
  WHERE slug = 'after-effects' 
  LIMIT 1
)
WHERE category_id IS NULL 
  AND (name ILIKE '%after effects%' OR tags::text ILIKE '%after effects%');
*/

