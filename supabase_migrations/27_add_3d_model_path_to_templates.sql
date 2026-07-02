-- Add 3D model preview path column to templates table
ALTER TABLE public.templates
ADD COLUMN IF NOT EXISTS model_3d_path TEXT;

COMMENT ON COLUMN public.templates.model_3d_path IS 'Path to the 3D model preview file (e.g., .glb, .gltf) in Cloudflare R2 storage.';

