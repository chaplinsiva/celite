# Fix: Foreign Key Constraint Violation During CSV Import

## Error
```
insert or update on table "templates" violates foreign key constraint "fk_templates_category"
```

## Problem
The CSV file contains `category_id` and `subcategory_id` UUIDs from the old database that don't exist in your new database.

## Solutions

### Solution 1: Import Without Foreign Keys (RECOMMENDED)

**Step 1:** Import CSV via Supabase Dashboard
1. Go to **Table Editor** → **templates** table
2. Click **"Import data via CSV"**
3. **IMPORTANT:** When mapping columns, **DO NOT map**:
   - `category_id`
   - `subcategory_id`
4. Map all other columns normally
5. Click **Import**

**Step 2:** After successful import, run the fix script:
```sql
-- Copy and paste: 07_fix_foreign_keys_before_import.sql
-- Or manually run:
UPDATE public.templates 
SET category_id = NULL, subcategory_id = NULL;
```

**Step 3:** Manually assign categories via Admin Panel or SQL:
```sql
-- Example: Assign "After Effects" category to templates
UPDATE public.templates 
SET category_id = (
  SELECT id FROM public.categories WHERE slug = 'after-effects' LIMIT 1
)
WHERE category_id IS NULL 
  AND (name ILIKE '%after effects%' 
       OR tags::text ILIKE '%after effects%'
       OR tags::text ILIKE '%after%effect%');
```

### Solution 2: Fix Before Re-importing

If you already tried to import and got the error:

**Step 1:** Delete any partially imported data:
```sql
DELETE FROM public.templates WHERE slug IN (
  -- List of slugs that failed to import
  'template-slug-1',
  'template-slug-2'
);
```

Or clear all:
```sql
TRUNCATE TABLE public.templates CASCADE;
```

**Step 2:** Modify your CSV (remove foreign key columns):
1. Open CSV in Excel/Google Sheets
2. Delete `category_id` and `subcategory_id` columns
3. Save as new CSV
4. Import the modified CSV

**Step 3:** Assign categories manually after import

### Solution 3: Map Old IDs to New IDs

If you know which categories correspond to which:

**Step 1:** Check what categories exist in new database:
```sql
SELECT id, name, slug FROM public.categories;
SELECT id, name, slug, category_id FROM public.subcategories;
```

**Step 2:** Create a mapping script:
```sql
-- Example mapping (adjust IDs to match your new database)
UPDATE public.templates 
SET category_id = 'NEW_CATEGORY_ID_HERE'
WHERE category_id = 'OLD_CATEGORY_ID_FROM_CSV';

UPDATE public.templates 
SET subcategory_id = 'NEW_SUBCATEGORY_ID_HERE'
WHERE subcategory_id = 'OLD_SUBCATEGORY_ID_FROM_CSV';
```

## Quick Fix for Already Imported Data

If you've already imported and just need to fix the foreign keys:

```sql
-- Run this immediately:
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
```

This will set invalid foreign keys to NULL, allowing the import to succeed. You can then manually assign categories later.

## Recommended Workflow

1. ✅ **Import CSV without category_id/subcategory_id columns**
2. ✅ **Run `07_fix_foreign_keys_before_import.sql`** (just to be safe)
3. ✅ **Run `04_quick_fix_csv_import.sql`** (fixes other issues)
4. ✅ **Manually assign categories** via Admin Panel or SQL queries

## Verify Import

After fixing, verify everything is correct:

```sql
-- Check templates imported correctly
SELECT COUNT(*) FROM public.templates;

-- Check foreign keys
SELECT 
  COUNT(*) as total,
  COUNT(category_id) as with_category,
  COUNT(subcategory_id) as with_subcategory
FROM public.templates;
```

