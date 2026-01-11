# Guide: Importing Templates CSV File

This guide helps you import the `templates_rows.csv` file into your new Supabase database.

## ⚠️ Common Issues with CSV Import

1. **JSONB fields**: CSV stores arrays as strings - needs conversion
2. **Storage bucket URLs**: Old video URLs won't work - need YouTube links
3. **Empty values**: Need to be set to NULL
4. **Foreign keys**: category_id/subcategory_id must exist in categories/subcategories tables

## Step-by-Step Import Process

### Step 1: Prepare Your Database

Make sure you've run the fresh setup script first:

```sql
-- Run this first if you haven't already:
-- Copy and paste: 00_complete_fresh_setup.sql
```

### Step 2: Import CSV via Supabase Dashboard

**Option A: Using Table Editor (Recommended)**

1. Go to **Supabase Dashboard** → **Table Editor**
2. Select **templates** table
3. Click **"Insert"** → **"Import data via CSV"**
4. Upload your `templates_rows.csv` file
5. Map the columns:
   - **slug** → slug
   - **name** → name
   - **subtitle** → subtitle
   - **description** → description
   - **price** → price
   - **video** → video
   - **features** → features
   - **software** → software
   - **plugins** → plugins
   - **tags** → tags
   - **is_featured** → is_featured
   - **source_path** → source_path
   - **is_limited_offer** → is_limited_offer
   - **limited_offer_duration_days** → limited_offer_duration_days
   - **limited_offer_start_date** → limited_offer_start_date
   - **category_id** → category_id
   - **subcategory_id** → subcategory_id
6. **SKIP** the `img` column (deprecated)
7. Click **Import**

**Option B: Using SQL Editor (Manual INSERT)**

If the import fails, you can use the SQL script below to insert data manually (after cleaning it).

### Step 3: Fix Import Errors

After importing, run the cleanup script:

```sql
-- Copy and paste: 03_fix_csv_import_errors.sql
-- This fixes common import issues
```

Or run individual fixes:

```sql
-- 1. Set img to NULL (deprecated)
UPDATE public.templates SET img = NULL;

-- 2. Remove old storage bucket video URLs
UPDATE public.templates 
SET video = NULL 
WHERE video LIKE '%/storage/v1/object/public/%';

-- 3. Fix empty strings
UPDATE public.templates 
SET video = NULL WHERE video = '';
UPDATE public.templates 
SET subtitle = NULL WHERE subtitle = '';
UPDATE public.templates 
SET description = NULL WHERE description = '';
UPDATE public.templates 
SET source_path = NULL WHERE source_path = '';
```

### Step 4: Convert JSONB Arrays

The CSV stores arrays as strings. Run this to convert them:

```sql
-- This is handled by 03_fix_csv_import_errors.sql
-- But if you need to do it manually, see the script
```

### Step 5: Add YouTube Video Links

Many templates have old storage bucket video URLs. You need to:

1. **Find templates without YouTube links**:
```sql
SELECT slug, name, video
FROM public.templates
WHERE video IS NULL OR video LIKE '%/storage/v1/object/public/%'
ORDER BY name;
```

2. **Manually add YouTube links** via Admin Panel or SQL:
```sql
-- Example: Add YouTube link for a template
UPDATE public.templates
SET video = 'https://www.youtube.com/watch?v=YOUR_VIDEO_ID'
WHERE slug = 'template-slug';
```

## Verification Queries

After import, run these to verify:

```sql
-- Check total templates
SELECT COUNT(*) FROM public.templates;

-- Check for invalid data
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN video IS NULL THEN 1 END) as missing_videos,
  COUNT(CASE WHEN video LIKE '%youtube.com%' OR video LIKE '%youtu.be%' THEN 1 END) as youtube_videos,
  COUNT(CASE WHEN features IS NULL THEN 1 END) as null_features
FROM public.templates;

-- Check for invalid foreign keys
SELECT slug, name, category_id, subcategory_id
FROM public.templates
WHERE (category_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM public.categories WHERE id = templates.category_id
)) OR (subcategory_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM public.subcategories WHERE id = templates.subcategory_id
));
```

## Troubleshooting

### Error: "duplicate key value violates unique constraint"
- **Solution**: Your CSV has duplicate slugs. Remove duplicates before importing.

### Error: "invalid input syntax for type jsonb"
- **Solution**: Run `03_fix_csv_import_errors.sql` to fix JSONB fields.

### Error: "violates foreign key constraint"
- **Solution**: Make sure categories/subcategories exist. The script `03_fix_csv_import_errors.sql` will set invalid foreign keys to NULL.

### Error: "null value in column 'slug' violates not-null constraint"
- **Solution**: Your CSV has rows with empty slugs. Remove them before importing or fix them:
```sql
DELETE FROM public.templates WHERE slug IS NULL OR slug = '';
```

### Templates imported but videos don't show
- **Solution**: Old storage bucket URLs were cleared. Add YouTube links manually via Admin Panel.

## Quick Fix Script

If you encounter multiple errors, run this comprehensive fix:

```sql
-- Run all fixes at once
\i supabase_migrations/02_import_templates_from_csv.sql
\i supabase_migrations/03_fix_csv_import_errors.sql
```

Or copy-paste both scripts in order in SQL Editor.

## Next Steps

After successful import:

1. ✅ Verify all templates imported correctly
2. ✅ Upload preview files (video, thumbnail, audio, 3D model) to R2 storage
3. ✅ Update source_path if needed
4. ✅ Test the application - browse templates
5. ✅ Check admin panel - templates should be visible

## Notes

- **img column**: All values will be NULL (deprecated, not used)
- **video_path column**: Upload video previews to R2 storage via admin/creator panel
- **JSONB fields**: Automatically fixed by the script
- **Foreign keys**: Invalid category/subcategory IDs are set to NULL

