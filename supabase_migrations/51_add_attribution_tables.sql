-- =========================================================
-- Migration: 51_add_attribution_tables.sql
-- Description: Create visitor_attributions and subscription_attributions tables
-- =========================================================

-- 1. Visitor Attributions Table (Per-user mutable journey)
CREATE TABLE IF NOT EXISTS public.visitor_attributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    anonymous_id TEXT,
    
    -- First touch (Immutable after creation)
    first_source TEXT,
    first_medium TEXT,
    first_campaign TEXT,
    first_content TEXT,
    first_term TEXT,
    first_landing_page TEXT,
    first_referrer TEXT,
    first_product_viewed TEXT,
    first_visit_at TIMESTAMPTZ DEFAULT now(),
    
    -- Last touch (Updated on new sessions/touches)
    last_source TEXT,
    last_medium TEXT,
    last_campaign TEXT,
    last_content TEXT,
    last_term TEXT,
    last_landing_page TEXT,
    last_referrer TEXT,
    last_product_viewed TEXT,
    last_visit_at TIMESTAMPTZ DEFAULT now(),
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT uq_visitor_attributions_user_id UNIQUE (user_id)
);

-- 2. Subscription Attributions Table (Immutable purchase snapshot)
CREATE TABLE IF NOT EXISTS public.subscription_attributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checkout_detail_id UUID REFERENCES public.checkout_details(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    razorpay_subscription_id TEXT,
    subscription_plan TEXT,
    amount NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'INR',
    
    -- First touch snapshot
    first_source TEXT,
    first_medium TEXT,
    first_campaign TEXT,
    first_content TEXT,
    first_term TEXT,
    first_landing_page TEXT,
    first_referrer TEXT,
    first_product_viewed TEXT,
    first_visit_at TIMESTAMPTZ,
    
    -- Last touch snapshot
    last_source TEXT,
    last_medium TEXT,
    last_campaign TEXT,
    last_content TEXT,
    last_term TEXT,
    last_landing_page TEXT,
    last_referrer TEXT,
    last_product_viewed TEXT,
    last_visit_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for quick aggregation and join
CREATE INDEX IF NOT EXISTS idx_visitor_attributions_user ON public.visitor_attributions(user_id);
CREATE INDEX IF NOT EXISTS idx_visitor_attributions_anon ON public.visitor_attributions(anonymous_id);

CREATE INDEX IF NOT EXISTS idx_sub_attr_checkout_id ON public.subscription_attributions(checkout_detail_id);
CREATE INDEX IF NOT EXISTS idx_sub_attr_user_id ON public.subscription_attributions(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_attr_first_source ON public.subscription_attributions(first_source);
CREATE INDEX IF NOT EXISTS idx_sub_attr_last_source ON public.subscription_attributions(last_source);
CREATE INDEX IF NOT EXISTS idx_sub_attr_first_campaign ON public.subscription_attributions(first_campaign);
CREATE INDEX IF NOT EXISTS idx_sub_attr_created_at ON public.subscription_attributions(created_at);

-- 3. Enable RLS
ALTER TABLE public.visitor_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_attributions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Users can view their own visitor attribution
CREATE POLICY "Users can view own visitor_attribution"
    ON public.visitor_attributions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can view all visitor attributions
CREATE POLICY "Admins can view all visitor_attributions"
    ON public.visitor_attributions
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()));

-- Admins can view all subscription attributions
CREATE POLICY "Admins can view all subscription_attributions"
    ON public.subscription_attributions
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()));
