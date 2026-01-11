-- ============================================================================
-- COMPLETE FRESH DATABASE SETUP
-- ============================================================================
-- This script creates the entire database schema from scratch for a new
-- Supabase project/organization. Run this on a fresh project.
--
-- Tables created:
-- 1. templates - Product templates
-- 2. categories - Template categories
-- 3. subcategories - Subcategories within categories
-- 4. orders - User orders
-- 5. order_items - Items within orders
-- 6. subscriptions - User subscriptions
-- 7. admins - Admin users
-- 8. settings - Application settings
--
-- ⚠️ IMPORTANT: This is for a FRESH database setup only!
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. TEMPLATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.templates (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  img TEXT, -- DEPRECATED: No longer used, kept for backward compatibility
  video TEXT, -- YouTube video URL for preview
  source_path TEXT, -- Path to source file in storage (private bucket)
  features JSONB DEFAULT '[]'::JSONB,
  software JSONB DEFAULT '[]'::JSONB,
  plugins JSONB DEFAULT '[]'::JSONB,
  tags JSONB DEFAULT '[]'::JSONB,
  is_featured BOOLEAN DEFAULT false,
  is_limited_offer BOOLEAN DEFAULT false,
  limited_offer_duration_days INTEGER,
  limited_offer_start_date TIMESTAMP WITH TIME ZONE,
  category_id UUID,
  subcategory_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for templates
CREATE INDEX IF NOT EXISTS idx_templates_is_featured ON public.templates(is_featured);
CREATE INDEX IF NOT EXISTS idx_templates_category_id ON public.templates(category_id);
CREATE INDEX IF NOT EXISTS idx_templates_subcategory_id ON public.templates(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_templates_has_video ON public.templates(video) WHERE video IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON public.templates(created_at DESC);

-- Comments for templates table
COMMENT ON TABLE public.templates IS 'Product templates catalog';
COMMENT ON COLUMN public.templates.img IS 'DEPRECATED: Image previews are no longer used. This column is kept for backward compatibility but should be NULL. Use video column for YouTube links instead.';
COMMENT ON COLUMN public.templates.video IS 'YouTube video URL or embed URL for template preview. Supports various formats: https://www.youtube.com/watch?v=VIDEO_ID, https://youtu.be/VIDEO_ID, or embed URL.';
COMMENT ON COLUMN public.templates.source_path IS 'Path to source file in private storage bucket (templatesource)';
COMMENT ON COLUMN public.templates.is_limited_offer IS 'Whether this product has a limited offer for subscribed users (FREE during limited time)';
COMMENT ON COLUMN public.templates.limited_offer_duration_days IS 'Duration of limited offer in days';
COMMENT ON COLUMN public.templates.limited_offer_start_date IS 'Start date of the limited offer (if null, starts immediately)';

-- ============================================================================
-- 2. CATEGORIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for categories
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);

-- Comments for categories table
COMMENT ON TABLE public.categories IS 'Template categories (e.g., After Effects, Website Templates, PSD Templates)';

-- ============================================================================
-- 3. SUBCATEGORIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category_id, slug)
);

-- Indexes for subcategories
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON public.subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_slug ON public.subcategories(slug);

-- Comments for subcategories table
COMMENT ON TABLE public.subcategories IS 'Subcategories within each category';

-- Add foreign key constraints for templates
-- Note: These are created as NOT DEFERRABLE initially, but can be temporarily disabled if needed
ALTER TABLE public.templates
ADD CONSTRAINT fk_templates_category FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_templates_subcategory FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id) ON DELETE SET NULL;

-- ============================================================================
-- 4. ORDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'failed'
  billing_name TEXT,
  billing_email TEXT,
  billing_company TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- Comments for orders table
COMMENT ON TABLE public.orders IS 'User orders/purchases';

-- ============================================================================
-- 5. ORDER_ITEMS TABLE
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

-- Indexes for order_items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_slug ON public.order_items(slug);

-- Comments for order_items table
COMMENT ON TABLE public.order_items IS 'Items within each order';

-- ============================================================================
-- 6. SUBSCRIPTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  plan TEXT, -- 'monthly' or 'yearly'
  valid_until TIMESTAMP WITH TIME ZONE,
  razorpay_subscription_id TEXT,
  autopay_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_is_active ON public.subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_subscriptions_razorpay_subscription_id ON public.subscriptions(razorpay_subscription_id);

-- Comments for subscriptions table
COMMENT ON TABLE public.subscriptions IS 'User subscriptions';
COMMENT ON COLUMN public.subscriptions.razorpay_subscription_id IS 'Stores the Razorpay subscription ID for cancelling subscriptions via API';
COMMENT ON COLUMN public.subscriptions.autopay_enabled IS 'Indicates if Razorpay mandate/autopay is enabled for the subscription';

-- ============================================================================
-- 7. ADMINS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for admins
CREATE INDEX IF NOT EXISTS idx_admins_user_id ON public.admins(user_id);

-- Comments for admins table
COMMENT ON TABLE public.admins IS 'Admin users who can access admin panel';

-- ============================================================================
-- 8. SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for settings
CREATE INDEX IF NOT EXISTS idx_settings_key ON public.settings(key);

-- Comments for settings table
COMMENT ON TABLE public.settings IS 'Application settings (Razorpay amounts, etc.)';

-- ============================================================================
-- DEFAULT DATA
-- ============================================================================

-- Insert default categories
INSERT INTO public.categories (name, slug, description) VALUES
  ('After Effects', 'after-effects', 'After Effects motion graphics templates'),
  ('Website Templates', 'website-templates', 'HTML, CSS, JavaScript website templates'),
  ('PSD Templates', 'psd-templates', 'Photoshop design templates')
ON CONFLICT (slug) DO NOTHING;

-- Insert default subcategories for After Effects
INSERT INTO public.subcategories (category_id, name, slug, description)
SELECT 
  c.id,
  sub.name,
  sub.slug,
  sub.description
FROM public.categories c
CROSS JOIN (VALUES
  ('Logo Reveal', 'logo-reveal', 'Logo animation templates'),
  ('Motion Graphics', 'motion-graphics', 'Motion graphics templates'),
  ('Transitions', 'transitions', 'Video transition templates'),
  ('Lower Thirds', 'lower-thirds', 'Lower third graphics templates'),
  ('Titles', 'titles', 'Title animation templates')
) AS sub(name, slug, description)
WHERE c.slug = 'after-effects'
ON CONFLICT (category_id, slug) DO NOTHING;

-- Insert default subcategories for Website Templates
INSERT INTO public.subcategories (category_id, name, slug, description)
SELECT 
  c.id,
  sub.name,
  sub.slug,
  sub.description
FROM public.categories c
CROSS JOIN (VALUES
  ('Landing Page', 'landing-page', 'Single page landing page templates'),
  ('Portfolio', 'portfolio', 'Portfolio website templates'),
  ('E-commerce', 'e-commerce', 'Online store templates'),
  ('Blog', 'blog', 'Blog website templates'),
  ('Corporate', 'corporate', 'Business website templates')
) AS sub(name, slug, description)
WHERE c.slug = 'website-templates'
ON CONFLICT (category_id, slug) DO NOTHING;

-- Insert default subcategories for PSD Templates
INSERT INTO public.subcategories (category_id, name, slug, description)
SELECT 
  c.id,
  sub.name,
  sub.slug,
  sub.description
FROM public.categories c
CROSS JOIN (VALUES
  ('Business Cards', 'business-cards', 'Business card design templates'),
  ('Flyers', 'flyers', 'Flyer design templates'),
  ('Posters', 'posters', 'Poster design templates'),
  ('Banners', 'banners', 'Banner design templates'),
  ('Social Media', 'social-media', 'Social media graphics templates')
) AS sub(name, slug, description)
WHERE c.slug = 'psd-templates'
ON CONFLICT (category_id, slug) DO NOTHING;

-- Insert default Razorpay settings
INSERT INTO public.settings (key, value, description) VALUES
  ('RAZORPAY_WEEKLY_AMOUNT', '19900', 'Weekly subscription amount in paise (₹199)'),
  ('RAZORPAY_MONTHLY_AMOUNT', '79900', 'Monthly subscription amount in paise (₹799)'),
  ('RAZORPAY_YEARLY_AMOUNT', '549900', 'Yearly subscription amount in paise (₹5,499)')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create helper function for admin checks (avoids recursion)
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins WHERE admins.user_id = is_admin.user_id
  );
$$;

-- Templates: Public read access, admin write access
CREATE POLICY "Templates are viewable by everyone" ON public.templates FOR SELECT USING (true);
CREATE POLICY "Only admins can insert templates" ON public.templates FOR INSERT WITH CHECK (
  public.is_admin(auth.uid())
);
CREATE POLICY "Only admins can update templates" ON public.templates FOR UPDATE USING (
  public.is_admin(auth.uid())
);
CREATE POLICY "Only admins can delete templates" ON public.templates FOR DELETE USING (
  public.is_admin(auth.uid())
);

-- Categories: Public read access, admin write access
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Only admins can modify categories" ON public.categories FOR ALL USING (
  public.is_admin(auth.uid())
);

-- Subcategories: Public read access, admin write access
CREATE POLICY "Subcategories are viewable by everyone" ON public.subcategories FOR SELECT USING (true);
CREATE POLICY "Only admins can modify subcategories" ON public.subcategories FOR ALL USING (
  public.is_admin(auth.uid())
);

-- Orders: Users can only see their own orders
CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Only admins can update orders" ON public.orders FOR UPDATE USING (
  public.is_admin(auth.uid())
);

-- Order items: Users can see items from their orders
CREATE POLICY "Users can view items from their orders" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_items.order_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create items for their orders" ON public.order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_items.order_id AND user_id = auth.uid())
);

-- Subscriptions: Users can only see their own subscription
CREATE POLICY "Users can view their own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own subscription" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions FOR ALL USING (auth.role() = 'service_role');

-- Admins: Use SECURITY DEFINER function to avoid infinite recursion
-- Create a helper function first (this bypasses RLS when checking admin status)
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins WHERE admins.user_id = is_admin.user_id
  );
$$;

-- Admins: Only admins can view admin list (using function to avoid recursion)
CREATE POLICY "Admins can view admin list" ON public.admins FOR SELECT USING (
  public.is_admin(auth.uid())
);

-- Service role can access admins table
CREATE POLICY "Service role can access admins" ON public.admins FOR ALL USING (
  auth.role() = 'service_role'
) WITH CHECK (
  auth.role() = 'service_role'
);

-- Settings: Public read access, admin write access
CREATE POLICY "Settings are viewable by everyone" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Only admins can modify settings" ON public.settings FOR ALL USING (
  public.is_admin(auth.uid())
);

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify setup)
-- ============================================================================

-- Check all tables were created:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
-- ORDER BY table_name;

-- Check categories and subcategories:
-- SELECT c.name as category, COUNT(s.id) as subcategory_count
-- FROM public.categories c
-- LEFT JOIN public.subcategories s ON s.category_id = c.id
-- GROUP BY c.id, c.name
-- ORDER BY c.name;

-- Check settings:
-- SELECT key, value, description FROM public.settings ORDER BY key;

