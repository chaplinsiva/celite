# Database Migration: Remove Orders and Cart Tables

## SQL Command to Run

Run this SQL command in your Supabase SQL Editor to remove the orders and cart tables:

```sql
-- ============================================================================
-- REMOVE ORDERS AND CART TABLES
-- ============================================================================
-- This script removes the orders, order_items, and cart_items tables
-- as the site is now subscription-only and no longer uses individual purchases
-- ============================================================================

BEGIN;

-- Drop RLS policies first (if they exist)
DROP POLICY IF EXISTS "Users can view their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can insert their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can update their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can delete their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Service role can access cart_items" ON public.cart_items;

-- Drop indexes (they will be automatically dropped with tables, but explicit is cleaner)
DROP INDEX IF EXISTS idx_cart_items_user_id;
DROP INDEX IF EXISTS idx_cart_items_slug;
DROP INDEX IF EXISTS idx_order_items_order_id;
DROP INDEX IF EXISTS idx_order_items_slug;
DROP INDEX IF EXISTS idx_orders_user_id;
DROP INDEX IF EXISTS idx_orders_status;
DROP INDEX IF EXISTS idx_orders_created_at;

-- Drop tables in correct order (child tables first due to foreign keys)
-- CASCADE will automatically drop dependent objects like foreign keys
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.cart_items CASCADE;

COMMIT;
```

## Tables Being Removed

1. **`order_items`** - Items within each order (child table)
2. **`orders`** - User orders/purchases (parent table)
3. **`cart_items`** - User shopping cart items

## What This Does

- Drops all RLS (Row Level Security) policies associated with `cart_items`
- Drops all indexes on these tables
- Drops the tables in the correct order (child tables first)
- Uses `CASCADE` to automatically handle foreign key constraints

## Important Notes

⚠️ **WARNING**: This will permanently delete all order and cart data. Make sure you have backups if you need to preserve this data.

- The `CASCADE` option will automatically drop foreign key constraints
- All data in these tables will be permanently deleted
- This is safe to run even if the tables don't exist (uses `IF EXISTS`)

## Files

- **SQL Migration**: `supabase_migrations/remove_orders_and_cart_tables.sql`

