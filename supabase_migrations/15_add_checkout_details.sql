-- ============================================================================
-- ADD CHECKOUT DETAILS SUPPORT
-- ============================================================================
-- This migration:
-- 1. Creates orders and order_items tables if they don't exist (may have been removed previously)
-- 2. Adds billing_mobile field to orders table
-- 3. Creates checkout_details table to track all checkout attempts
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CREATE ORDERS TABLE IF IT DOESN'T EXIST
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'failed'
  billing_name TEXT,
  billing_email TEXT,
  billing_company TEXT,
  billing_mobile TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for orders if they don't exist
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- Add billing_mobile column if it doesn't exist (for existing orders tables)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'billing_mobile'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN billing_mobile TEXT;
  END IF;
END $$;

-- Comment for the orders table and column
COMMENT ON TABLE public.orders IS 'User orders/purchases';
COMMENT ON COLUMN public.orders.billing_mobile IS 'Billing mobile number from checkout';

-- ============================================================================
-- 2. CREATE ORDER_ITEMS TABLE IF IT DOESN'T EXIST
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  img TEXT, -- DEPRECATED: No longer used, kept for backward compatibility
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for order_items if they don't exist
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_slug ON public.order_items(slug);

-- Comment for order_items table
COMMENT ON TABLE public.order_items IS 'Items within each order';

-- ============================================================================
-- 3. CREATE CHECKOUT_DETAILS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.checkout_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkout_type TEXT NOT NULL DEFAULT 'product', -- 'product' or 'subscription'
  billing_name TEXT NOT NULL,
  billing_email TEXT NOT NULL,
  billing_mobile TEXT NOT NULL,
  billing_company TEXT,
  subscription_plan TEXT, -- 'monthly' or 'yearly' (only for subscription checkouts)
  cart_items JSONB DEFAULT '[]'::JSONB, -- Array of cart items for product checkouts
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'initiated', -- 'initiated', 'payment_pending', 'completed', 'failed', 'cancelled'
  razorpay_order_id TEXT, -- Razorpay order ID if payment was initiated
  razorpay_payment_id TEXT, -- Razorpay payment ID if payment was completed
  razorpay_subscription_id TEXT, -- Razorpay subscription ID for subscription checkouts
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL, -- Link to order if checkout was completed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for checkout_details
CREATE INDEX IF NOT EXISTS idx_checkout_details_user_id ON public.checkout_details(user_id);
CREATE INDEX IF NOT EXISTS idx_checkout_details_status ON public.checkout_details(status);
CREATE INDEX IF NOT EXISTS idx_checkout_details_created_at ON public.checkout_details(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkout_details_checkout_type ON public.checkout_details(checkout_type);
CREATE INDEX IF NOT EXISTS idx_checkout_details_order_id ON public.checkout_details(order_id);

-- Comments for checkout_details table
COMMENT ON TABLE public.checkout_details IS 'Tracks all checkout attempts including initiated, completed, and failed checkouts';
COMMENT ON COLUMN public.checkout_details.checkout_type IS 'Type of checkout: product or subscription';
COMMENT ON COLUMN public.checkout_details.status IS 'Status: initiated, payment_pending, completed, failed, cancelled';
COMMENT ON COLUMN public.checkout_details.cart_items IS 'JSON array of cart items for product checkouts';

-- ============================================================================
-- 4. ENABLE RLS ON CHECKOUT_DETAILS TABLE
-- ============================================================================
-- Ensure RLS is enabled (will not error if already enabled)
ALTER TABLE public.checkout_details ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own checkout details" ON public.checkout_details;
DROP POLICY IF EXISTS "Users can insert their own checkout details" ON public.checkout_details;
DROP POLICY IF EXISTS "Users can update their own checkout details" ON public.checkout_details;
DROP POLICY IF EXISTS "Service role can access checkout_details" ON public.checkout_details;

-- Policy: Users can view their own checkout details
CREATE POLICY "Users can view their own checkout details"
  ON public.checkout_details
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own checkout details
CREATE POLICY "Users can insert their own checkout details"
  ON public.checkout_details
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own checkout details
CREATE POLICY "Users can update their own checkout details"
  ON public.checkout_details
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Service role can access all checkout details (for admin operations)
CREATE POLICY "Service role can access checkout_details"
  ON public.checkout_details
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

COMMIT;

