-- Migration: 53_end_anniversary_offer_return_to_799.sql
-- Description: Conclude the 3rd Anniversary promo (499) and update monthly subscription pricing to 79900 paise (799 INR)
-- Existing autopay users on 499 remain on their recurring Razorpay mandate. 
-- Any new purchases or re-purchases after cancellation will charge 799 INR.

INSERT INTO public.settings (key, value)
VALUES 
  ('RAZORPAY_MONTHLY_AMOUNT', '79900'),
  ('RAZORPAY_YEARLY_AMOUNT', '549900')
ON CONFLICT (key) 
DO UPDATE SET value = EXCLUDED.value;

-- Ensure clear documentation comment
COMMENT ON TABLE public.settings IS 'Global system settings including active Razorpay subscription prices in smallest units (paise).';
