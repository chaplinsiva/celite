-- ============================================================================
-- CREATE CART_ITEMS TABLE
-- ============================================================================
-- This script creates the cart_items table for storing user cart items
-- ============================================================================

BEGIN;

-- ============================================================================
-- CART_ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  img TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, slug) -- One item per user per slug
);

-- Indexes for cart_items
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_slug ON public.cart_items(slug);

-- Comments for cart_items table
COMMENT ON TABLE public.cart_items IS 'User shopping cart items';
COMMENT ON COLUMN public.cart_items.img IS 'Image URL for the cart item (deprecated, kept for backward compatibility)';

-- Enable RLS on cart_items
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cart_items
-- Users can only see and manage their own cart items
CREATE POLICY "Users can view their own cart items" ON public.cart_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own cart items" ON public.cart_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own cart items" ON public.cart_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own cart items" ON public.cart_items FOR DELETE USING (auth.uid() = user_id);

-- Service role can access cart_items for admin operations
CREATE POLICY "Service role can access cart_items" ON public.cart_items FOR ALL USING (
  auth.role() = 'service_role'
) WITH CHECK (
  auth.role() = 'service_role'
);

COMMIT;

