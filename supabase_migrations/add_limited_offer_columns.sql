-- Add limited offer columns to templates table
ALTER TABLE public.templates
ADD COLUMN IF NOT EXISTS is_limited_offer BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS limited_offer_duration_days INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS limited_offer_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Remove limited_offer_price column if it exists (always free, so not needed)
ALTER TABLE public.templates DROP COLUMN IF EXISTS limited_offer_price;

-- Add comment for documentation
COMMENT ON COLUMN public.templates.is_limited_offer IS 'Whether this product has a limited offer for subscribed users (FREE during limited time)';
COMMENT ON COLUMN public.templates.limited_offer_duration_days IS 'Duration of limited offer in days';
COMMENT ON COLUMN public.templates.limited_offer_start_date IS 'Start date of the limited offer (if null, starts immediately)';

