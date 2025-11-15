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

