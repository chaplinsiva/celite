-- Add autopay tracking to subscriptions so we can distinguish
-- between mandate/autopay-enabled users and manual renewals.
DO $$
BEGIN
  -- Create column if it does not exist yet
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'autopay_enabled'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD COLUMN autopay_enabled BOOLEAN;
  END IF;
END $$;

-- Ensure the column has a default and not-null constraint, but
-- perform the update in steps to avoid long table locks.
UPDATE public.subscriptions
SET autopay_enabled = COALESCE(autopay_enabled, true)
WHERE autopay_enabled IS DISTINCT FROM true;

ALTER TABLE public.subscriptions
  ALTER COLUMN autopay_enabled SET DEFAULT true;

ALTER TABLE public.subscriptions
  ALTER COLUMN autopay_enabled SET NOT NULL;

COMMENT ON COLUMN public.subscriptions.autopay_enabled IS
  'Indicates if Razorpay mandate/autopay is enabled for the subscription';

