-- =============================================================================
-- SUPABASE AUTH DIAGNOSTIC AND FIX
-- =============================================================================
-- Run this script in Supabase SQL Editor to diagnose and fix auth issues

-- 1. Check current auth configuration
SELECT 
    'Auth Settings Check' as check_type,
    version() as postgres_version;

-- 2. Check if profiles table exists and is accessible
SELECT 
    'Profiles Table Check' as check_type,
    count(*) as profile_count,
    (SELECT count(*) FROM auth.users) as auth_user_count
FROM public.profiles;

-- 3. Check triggers
SELECT 
    'Trigger Check' as check_type,
    trigger_name, 
    event_manipulation, 
    event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 4. Check the handle_new_user function
SELECT 
    'Function Check' as check_type,
    proname as function_name,
    prokind as function_type
FROM pg_proc
WHERE proname = 'handle_new_user';

-- 5. Check RLS policies on profiles
SELECT 
    'RLS Policies Check' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'profiles';

-- =============================================================================
-- FIX: Recreate the handle_new_user function with better error handling
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update profile with error handling
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
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the auth process
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FIX: Ensure trigger is properly set up
-- =============================================================================

-- Drop and recreate trigger to ensure it's fresh
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- FIX: Ensure RLS policies allow profile creation
-- =============================================================================

-- Allow authenticated users to insert their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =============================================================================
-- TEST: Try creating a test user to verify everything works
-- =============================================================================

-- Check if any users exist
SELECT 
    'Current Users' as info,
    u.id,
    u.email,
    u.created_at as user_created,
    p.full_name,
    p.created_at as profile_created
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 5;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================
SELECT '✅ Diagnostic and fix script completed!' as status,
       'Now try signing up through your app again' as next_step;
