# Migration: Storage Bucket Previews to YouTube Links

This migration updates your database to use YouTube video links instead of storage bucket previews (images/videos).

## Overview

- **img column**: Deprecated. No longer used for previews. Set to NULL for new entries.
- **video column**: Now stores YouTube URLs instead of storage bucket URLs.
- **No schema changes required**: Both columns are already TEXT type, so no structural changes needed.

## Migration Steps

### Step 1: Run the Main Migration

Run `migrate_to_youtube_previews.sql` first. This updates column comments and documentation:

```bash
# If using Supabase CLI:
supabase db push

# Or run the SQL directly in your Supabase dashboard SQL editor:
# Copy and paste the contents of migrate_to_youtube_previews.sql
```

### Step 2: (Optional) Clean Up Old Data

After you've migrated all templates to use YouTube links, you can run `cleanup_old_preview_urls.sql` to:
- Clear all `img` values (set to NULL)
- Optionally remove old storage bucket video URLs

**⚠️ Warning**: Only run the cleanup script AFTER you've verified all templates have YouTube links. Make a backup first!

```sql
-- Run this query first to see what will be affected:
SELECT 
  COUNT(*) as total_templates,
  COUNT(video) as templates_with_video,
  COUNT(CASE WHEN video LIKE '%youtube.com%' OR video LIKE '%youtu.be%' THEN 1 END) as templates_with_youtube,
  COUNT(CASE WHEN video LIKE '%/storage/v1/object/public/%' THEN 1 END) as templates_with_storage_urls,
  COUNT(img) as templates_with_img
FROM public.templates;
```

### Step 3: Update Existing Templates

You'll need to manually update existing templates with YouTube links:

1. **Via Admin Panel**: 
   - Go to Admin → Products
   - Edit each template
   - Enter YouTube video URL in the "YouTube Video Link" field
   - Save

2. **Via SQL** (bulk update example):
   ```sql
   -- Example: Update a template with YouTube link
   UPDATE public.templates
   SET video = 'https://www.youtube.com/watch?v=YOUR_VIDEO_ID'
   WHERE slug = 'your-template-slug';
   ```

## YouTube URL Formats Supported

The application accepts various YouTube URL formats:

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`
- Direct video ID (11 characters)

All formats are automatically converted to embed URLs by the `getYouTubeEmbedUrl()` function.

## Database Schema

### Templates Table Columns

- **img** (TEXT, nullable): ⚠️ DEPRECATED - Should be NULL for new entries
- **video** (TEXT, nullable): YouTube URL for template preview

No structural changes are needed - both columns are already TEXT type.

## Rollback

If you need to rollback:

1. Restore from backup
2. Or manually restore `img` and `video` values from your backup

## Notes

- The `img` column is kept for backward compatibility but should always be NULL for new entries
- YouTube links are validated and converted to embed format in the application layer
- Old storage bucket URLs will not work after this migration - make sure all templates have YouTube links

## Verification

After migration, verify that:

1. All templates have YouTube video links (if they need previews)
2. `img` column is NULL for all templates
3. Application displays YouTube iframes correctly
4. Admin panel accepts YouTube links

```sql
-- Check for any remaining storage bucket URLs:
SELECT slug, name, video
FROM public.templates
WHERE video LIKE '%/storage/v1/object/public/%';

-- Check for any templates with img values:
SELECT slug, name, img
FROM public.templates
WHERE img IS NOT NULL;
```

