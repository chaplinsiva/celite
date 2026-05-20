-- ============================================================================
-- ADD SUB-SUBCATEGORIES SUPPORT
-- ============================================================================
-- This migration adds support for sub-subcategories (third level of categorization)
-- Structure: Category -> Subcategory -> Sub-Subcategory
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CREATE SUB_SUBCATEGORIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sub_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcategory_id UUID NOT NULL REFERENCES public.subcategories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(subcategory_id, slug)
);

-- Indexes for sub_subcategories
CREATE INDEX IF NOT EXISTS idx_sub_subcategories_subcategory_id ON public.sub_subcategories(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_sub_subcategories_slug ON public.sub_subcategories(slug);

-- Comments for sub_subcategories table
COMMENT ON TABLE public.sub_subcategories IS 'Sub-subcategories within each subcategory (third level of categorization)';
COMMENT ON COLUMN public.sub_subcategories.subcategory_id IS 'Reference to the parent subcategory';

-- ============================================================================
-- 2. ADD SUB_SUBCATEGORY_ID TO TEMPLATES TABLE
-- ============================================================================
ALTER TABLE public.templates
ADD COLUMN IF NOT EXISTS sub_subcategory_id UUID REFERENCES public.sub_subcategories(id) ON DELETE SET NULL;

-- Index for templates sub_subcategory_id
CREATE INDEX IF NOT EXISTS idx_templates_sub_subcategory_id ON public.templates(sub_subcategory_id);

-- Comment for templates sub_subcategory_id
COMMENT ON COLUMN public.templates.sub_subcategory_id IS 'Reference to the sub-subcategory within the subcategory';

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on sub_subcategories table
ALTER TABLE public.sub_subcategories ENABLE ROW LEVEL SECURITY;

-- Sub-subcategories: Public read access, admin write access
CREATE POLICY "Sub-subcategories are viewable by everyone" ON public.sub_subcategories FOR SELECT USING (true);
CREATE POLICY "Only admins can modify sub-subcategories" ON public.sub_subcategories FOR ALL USING (
  public.is_admin(auth.uid())
);

COMMIT;

