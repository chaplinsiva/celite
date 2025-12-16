-- ============================================================================
-- ADD DIRECT UPLOAD ENABLED TO CREATOR SHOPS
-- ============================================================================
-- This migration adds a direct_upload_enabled field to creator_shops table
-- When enabled, creators can upload files directly to R2 using presigned URLs
-- ============================================================================

BEGIN;

-- Add direct_upload_enabled column
ALTER TABLE public.creator_shops
ADD COLUMN IF NOT EXISTS direct_upload_enabled BOOLEAN NOT NULL DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.creator_shops.direct_upload_enabled IS 'When true, creator can use direct upload (presigned URLs) to R2. When false, files are uploaded through the server.';

COMMIT;

