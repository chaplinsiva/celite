# Step-by-Step: Import CSV Without Foreign Key Errors

## ⚠️ IMPORTANT: The Issue

Your CSV contains `category_id` and `subcategory_id` UUIDs from the **old database** that don't exist in your **new database**. This causes foreign key constraint violations.

## ✅ Solution: Import WITHOUT Foreign Key Columns

### Step 1: Prepare Your CSV (Optional but Recommended)

**Option A:** Edit CSV file
1. Open `templates_rows.csv` in Excel or Google Sheets
2. **Delete** the `category_id` column
3. **Delete** the `subcategory_id` column
4. Save as a new file: `templates_rows_no_fk.csv`

**Option B:** Keep original CSV and skip columns during import

### Step 2: Import via Supabase Dashboard

1. Go to **Supabase Dashboard** → **Table Editor**
2. Click on **`templates`** table
3. Click **"Insert"** dropdown → **"Import data via CSV"**
4. Upload your CSV file (`templates_rows_no_fk.csv` OR original file)
5. **IMPORTANT - Column Mapping:**
   - Map all columns EXCEPT:
     - ❌ **DO NOT MAP** `category_id`
     - ❌ **DO NOT MAP** `subcategory_id`
   - ✅ Map all other columns:
     - slug, name, subtitle, description, price, video, features, software, plugins, tags, is_featured, source_path, is_limited_offer, limited_offer_duration_days, limited_offer_start_date
6. Click **Import**

### Step 3: After Import - Fix Data

Run this SQL script in SQL Editor:
```sql
-- Copy and paste: 04_quick_fix_csv_import.sql
```

### Step 4: Assign Categories Manually (After Import)

Once templates are imported, assign categories via Admin Panel or SQL:

```sql
-- Example 1: Assign "After Effects" category to templates with "after effects" in name/tags
UPDATE public.templates 
SET category_id = (
  SELECT id FROM public.categories WHERE slug = 'after-effects' LIMIT 1
)
WHERE category_id IS NULL 
  AND (
    name ILIKE '%after effects%' 
    OR tags::text ILIKE '%after effects%'
    OR tags::text ILIKE '%after%effect%'
  );

-- Example 2: Assign category based on slug pattern
UPDATE public.templates 
SET category_id = (
  SELECT id FROM public.categories WHERE slug = 'after-effects' LIMIT 1
)
WHERE category_id IS NULL 
  AND slug LIKE '%-titles%';

-- Example 3: Assign via Admin Panel
-- Go to Admin Panel → Products → Edit Template → Select Category
```

## Alternative: If You Already Tried Importing

If import failed and some data might be stuck:

### Step 1: Clear any partial imports (if needed)

```sql
-- Check if any data exists
SELECT COUNT(*) FROM public.templates;

-- If you need to start over:
TRUNCATE TABLE public.templates CASCADE;
```

### Step 2: Fix Foreign Keys First

Run this BEFORE importing:
```sql
-- Copy and paste: 09_import_template_workaround.sql
-- This temporarily removes foreign key constraints
```

### Step 3: Import CSV

Now import with all columns including category_id/subcategory_id

### Step 4: Fix Invalid Foreign Keys

```sql
-- This is included in 09_import_template_workaround.sql
-- But you can also run manually:
UPDATE public.templates 
SET category_id = NULL 
WHERE category_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM public.categories WHERE id = templates.category_id
  );
```

### Step 5: Re-add Foreign Key Constraints

```sql
-- This is included in 09_import_template_workaround.sql
ALTER TABLE public.templates 
ADD CONSTRAINT fk_templates_category 
FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
```

## Quick Command Reference

### Import Without Foreign Keys (EASIEST)
1. Edit CSV: Delete `category_id` and `subcategory_id` columns
2. Import via Dashboard
3. Run `04_quick_fix_csv_import.sql`
4. Assign categories manually

### Import With Foreign Keys (If you need old IDs)
1. Run `09_import_template_workaround.sql` (removes constraints)
2. Import CSV with all columns
3. Fix script re-adds constraints automatically

## Verify After Import

```sql
-- Check import status
SELECT 
  COUNT(*) as total_templates,
  COUNT(category_id) as with_category,
  COUNT(subcategory_id) as with_subcategory
FROM public.templates;

-- List templates without categories
SELECT slug, name, category_id, subcategory_id
FROM public.templates
WHERE category_id IS NULL
ORDER BY name;
```

