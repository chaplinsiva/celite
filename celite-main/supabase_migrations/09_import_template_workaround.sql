-- ============================================================================
-- WORKAROUND: Import Templates Without Foreign Key Errors
-- ============================================================================
-- Run this BEFORE importing CSV to temporarily allow invalid foreign keys
-- Then import CSV, then run the fix script
-- ============================================================================

-- Step 1: Temporarily drop foreign key constraints (if possible)
-- Note: This requires superuser access, may not work in Supabase Dashboard

-- Drop category foreign key temporarily
ALTER TABLE public.templates 
DROP CONSTRAINT IF EXISTS fk_templates_category;

-- Drop subcategory foreign key temporarily
ALTER TABLE public.templates 
DROP CONSTRAINT IF EXISTS fk_templates_subcategory;

-- Now you can import CSV with invalid category/subcategory IDs
-- After import, run the fix script below, then re-add constraints

-- Step 2: After importing CSV, fix invalid foreign keys
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

-- Step 3: Re-add foreign key constraints
ALTER TABLE public.templates 
ADD CONSTRAINT fk_templates_category 
FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE public.templates 
ADD CONSTRAINT fk_templates_subcategory 
FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id) ON DELETE SET NULL;

