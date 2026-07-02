-- Promote users as admins
-- This migration adds two users to the admins table

-- Insert admin users (use ON CONFLICT to avoid errors if they already exist)
INSERT INTO public.admins (user_id)
VALUES 
  ('1cb41722-039e-43c3-82c1-6e019fad2315'),
  ('0ab9ca5a-19b6-41de-ab8a-50603a337812')
ON CONFLICT (user_id) DO NOTHING;

-- Verify the admins were added
SELECT user_id, created_at 
FROM public.admins 
WHERE user_id IN (
  '1cb41722-039e-43c3-82c1-6e019fad2315',
  '0ab9ca5a-19b6-41de-ab8a-50603a337812'
);

