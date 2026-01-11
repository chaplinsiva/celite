# Database Migration: Remove Price, Featured, and Limited Offer Fields

## SQL Command to Run

Run this SQL command in your Supabase SQL Editor to remove the columns from the database:

```sql
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
```

## Files Updated

1. **SQL Migration**: `supabase_migrations/remove_price_featured_limited_offer.sql`
2. **Admin Panel**: `app/admin/components/ProductsPanel.tsx` - Removed form fields for price, featured, and limited offer
3. **API Route**: `app/api/admin/seed-templates/route.ts` - Removed these fields from payload
4. **Templates Page**: `app/templates/page.tsx` - Removed from queries
5. **Product Page**: `app/product/[slug]/page.tsx` - Removed from queries
6. **Template Carousel**: `components/TemplateCarousel.tsx` - Removed from queries and types
7. **Templates Client**: `app/templates/TemplatesClient.tsx` - Removed from types

## What Was Removed

- **Price field**: No longer needed as site is subscription-only
- **Featured field**: Removed featured template functionality
- **Limited Offer fields**: Removed all limited offer functionality (is_limited_offer, limited_offer_duration_days, limited_offer_start_date)

## Next Steps

1. Run the SQL command above in your Supabase SQL Editor
2. The admin panel will no longer show these fields when creating/editing products
3. All existing templates will continue to work, but these fields will be ignored

