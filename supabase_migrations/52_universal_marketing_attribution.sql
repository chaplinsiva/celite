-- =========================================================
-- Migration: 52_universal_marketing_attribution.sql
-- Description: Marketing content registry, visitor touchpoints stream, and schema enhancements
-- =========================================================

-- 1. Marketing Content Registry Table
CREATE TABLE IF NOT EXISTS public.marketing_sources_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL,                  -- 'Instagram', 'Facebook', 'YouTube', 'Google', 'Referral', 'Other'
    source TEXT NOT NULL,                    -- 'Instagram', 'YouTube', 'Google', 'Zorcha', etc.
    medium TEXT NOT NULL,                    -- 'Paid Social', 'Organic Video', 'Paid Search', 'Referral'
    campaign_name TEXT,
    campaign_id TEXT,
    adset_name TEXT,
    adset_id TEXT,
    ad_or_video_name TEXT,
    ad_or_video_id TEXT,
    content_name TEXT,
    content_id TEXT,
    product_slug TEXT,
    destination_url TEXT,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Visitor Touchpoints Event Stream (Append-only chronological customer journey)
CREATE TABLE IF NOT EXISTS public.visitor_touchpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anonymous_id TEXT,
    session_id TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,                -- 'landing', 'homepage', 'category_view', 'product_view', 'pricing_view', 'signup', 'login', 'checkout_started', 'payment_started', 'payment_success', 'subscription_created'
    url TEXT,
    path TEXT,
    source TEXT,
    medium TEXT,
    campaign TEXT,
    campaign_id TEXT,
    content TEXT,
    content_id TEXT,
    term TEXT,
    term_id TEXT,
    referrer_url TEXT,
    referrer_domain TEXT,
    gclid TEXT,
    fbclid TEXT,
    dclid TEXT,
    msclkid TEXT,
    ttclid TEXT,
    utm_id TEXT,
    device_type TEXT,                        -- 'Desktop', 'Mobile', 'Tablet'
    browser TEXT,
    os TEXT,
    product_id TEXT,
    product_slug TEXT,
    product_name TEXT,
    confidence_level TEXT DEFAULT 'medium',  -- 'high', 'medium', 'low'
    confidence_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enhance visitor_attributions table
ALTER TABLE public.visitor_attributions
    ADD COLUMN IF NOT EXISTS first_campaign_id TEXT,
    ADD COLUMN IF NOT EXISTS first_content_id TEXT,
    ADD COLUMN IF NOT EXISTS last_campaign_id TEXT,
    ADD COLUMN IF NOT EXISTS last_content_id TEXT,
    ADD COLUMN IF NOT EXISTS gclid TEXT,
    ADD COLUMN IF NOT EXISTS fbclid TEXT,
    ADD COLUMN IF NOT EXISTS touch_count INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS session_count INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS confidence_level TEXT DEFAULT 'medium',
    ADD COLUMN IF NOT EXISTS confidence_reason TEXT;

-- 4. Enhance subscription_attributions table
ALTER TABLE public.subscription_attributions
    ADD COLUMN IF NOT EXISTS first_youtube_video_id TEXT,
    ADD COLUMN IF NOT EXISTS first_youtube_video_name TEXT,
    ADD COLUMN IF NOT EXISTS first_meta_campaign_id TEXT,
    ADD COLUMN IF NOT EXISTS first_meta_campaign_name TEXT,
    ADD COLUMN IF NOT EXISTS first_meta_adset_id TEXT,
    ADD COLUMN IF NOT EXISTS first_meta_adset_name TEXT,
    ADD COLUMN IF NOT EXISTS first_meta_ad_id TEXT,
    ADD COLUMN IF NOT EXISTS first_meta_ad_name TEXT,
    ADD COLUMN IF NOT EXISTS last_youtube_video_id TEXT,
    ADD COLUMN IF NOT EXISTS last_meta_ad_id TEXT,
    ADD COLUMN IF NOT EXISTS journey_touch_count INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS journey_session_count INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS confidence_level TEXT DEFAULT 'medium',
    ADD COLUMN IF NOT EXISTS confidence_reason TEXT,
    ADD COLUMN IF NOT EXISTS is_manually_corrected BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS corrected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS corrected_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS correction_reason TEXT,
    ADD COLUMN IF NOT EXISTS original_attribution JSONB;

-- 5. Indexes for high performance querying
CREATE INDEX IF NOT EXISTS idx_reg_platform ON public.marketing_sources_registry(platform);
CREATE INDEX IF NOT EXISTS idx_reg_campaign_id ON public.marketing_sources_registry(campaign_id);
CREATE INDEX IF NOT EXISTS idx_reg_ad_video_id ON public.marketing_sources_registry(ad_or_video_id);
CREATE INDEX IF NOT EXISTS idx_reg_content_id ON public.marketing_sources_registry(content_id);

CREATE INDEX IF NOT EXISTS idx_touchpoints_anon ON public.visitor_touchpoints(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_touchpoints_user ON public.visitor_touchpoints(user_id);
CREATE INDEX IF NOT EXISTS idx_touchpoints_session ON public.visitor_touchpoints(session_id);
CREATE INDEX IF NOT EXISTS idx_touchpoints_created ON public.visitor_touchpoints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_touchpoints_event ON public.visitor_touchpoints(event_type);
CREATE INDEX IF NOT EXISTS idx_touchpoints_source ON public.visitor_touchpoints(source);
CREATE INDEX IF NOT EXISTS idx_touchpoints_product ON public.visitor_touchpoints(product_slug);

-- 6. Row Level Security
ALTER TABLE public.marketing_sources_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_touchpoints ENABLE ROW LEVEL SECURITY;

-- Registry: Admins have full access, public can read active mappings
CREATE POLICY "Admins can manage marketing_sources_registry"
    ON public.marketing_sources_registry
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()));

CREATE POLICY "Public can read active marketing_sources_registry"
    ON public.marketing_sources_registry
    FOR SELECT
    USING (is_active = true);

-- Touchpoints: Admins can view all, users can view own, anon insert via service role/API
CREATE POLICY "Admins can view all visitor_touchpoints"
    ON public.visitor_touchpoints
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()));

CREATE POLICY "Users can view own visitor_touchpoints"
    ON public.visitor_touchpoints
    FOR SELECT
    USING (auth.uid() = user_id);
