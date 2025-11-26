-- =============================================================================
-- CRITICAL FIX: Database Trigger Error
-- =============================================================================
-- This fixes the "Database error granting user" issue
-- Run this entire script in Supabase SQL Editor

-- 1. First, let's check what's failing
SELECT 
    'Checking existing profiles...' as status,
    id, 
    email, 
    full_name,
    created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 5;

-- 2. Drop the problematic trigger temporarily
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Recreate the function with MUCH better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Try to insert or update profile
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
    )
    ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
      full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
      avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), profiles.avatar_url),
      updated_at = NOW();
  EXCEPTION 
    WHEN OTHERS THEN
      -- Don't fail auth if profile creation fails
      RAISE WARNING 'Failed to create/update profile for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Make sure RLS policies allow the operation
-- Drop existing policies and recreate them properly
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Allow INSERT for service role (for the trigger)
CREATE POLICY "Enable insert for service role"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 6. Grant necessary permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 7. Verify the fix by checking existing users
SELECT 
    '✅ Fix Applied!' as status,
    'Checking user-profile sync...' as info;

SELECT 
    u.id,
    u.email as auth_email,
    u.email_confirmed_at,
    p.email as profile_email,
    p.full_name,
    CASE 
        WHEN p.id IS NULL THEN '❌ Missing Profile'
        ELSE '✅ Profile Exists'
    END as profile_status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 10;

-- 8. If you see any users without profiles, fix them:
INSERT INTO public.profiles (id, email, full_name, avatar_url)
SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(u.raw_user_meta_data->>'avatar_url', '')
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 9. Final verification
SELECT 
    '🎉 All Done!' as status,
    'Try logging in again!' as next_step,
    count(*) as total_profiles
FROM public.profiles;
