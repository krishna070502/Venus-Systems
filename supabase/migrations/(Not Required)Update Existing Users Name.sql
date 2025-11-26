-- =============================================================================
-- FIX EXISTING USER PROFILE
-- =============================================================================
-- Run this script in Supabase SQL Editor to fix your profile

-- 1. First, let's see your current user data
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'full_name' as metadata_name,
  p.full_name as profile_name,
  p.email as profile_email
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id;

-- 2. Update profile with full_name from user metadata (if exists)
UPDATE public.profiles p
SET 
  full_name = COALESCE(
    p.full_name,
    (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = p.id),
    'Admin User'  -- Default name if none exists
  ),
  updated_at = NOW()
WHERE p.full_name IS NULL OR p.full_name = '';

-- 3. Check your roles
SELECT 
  p.email,
  p.full_name,
  r.name as role_name,
  r.description
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
LEFT JOIN public.roles r ON ur.role_id = r.id
ORDER BY p.email, r.name;

-- 4. If you don't have admin role assigned, run this:
-- Replace 'your-email@example.com' with your actual email
-- INSERT INTO public.user_roles (user_id, role_id)
-- SELECT p.id, r.id
-- FROM public.profiles p
-- CROSS JOIN public.roles r
-- WHERE p.email = 'your-email@example.com' 
--   AND r.name = 'Admin'
-- ON CONFLICT DO NOTHING;
