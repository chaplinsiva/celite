-- Add expiry_email_sent column to subscriptions table
-- This tracks when we've sent expiry reminder emails to prevent duplicates
DO $$
BEGIN
  -- Create column if it does not exist yet
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'expiry_email_sent'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD COLUMN expiry_email_sent TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_subscriptions_expiry_email_sent 
  ON public.subscriptions(expiry_email_sent) 
  WHERE expiry_email_sent IS NULL;

COMMENT ON COLUMN public.subscriptions.expiry_email_sent IS
  'Timestamp when expiry reminder email was sent to the user (prevents duplicate emails)';

