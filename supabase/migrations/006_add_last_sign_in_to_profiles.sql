-- Add last_sign_in_at column to profiles table for session tracking
-- This will be automatically updated by a trigger when users sign in

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ;

-- Create function to update last_sign_in_at on user login
CREATE OR REPLACE FUNCTION public.update_last_sign_in()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the profiles table with the last sign in time from auth.users
  UPDATE public.profiles
  SET last_sign_in_at = NEW.last_sign_in_at
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_sign_in ON auth.users;

-- Create trigger to update last_sign_in_at when user signs in
CREATE TRIGGER on_auth_user_sign_in
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.update_last_sign_in();

-- Optionally, backfill existing users' last sign in times
UPDATE public.profiles p
SET last_sign_in_at = (
  SELECT last_sign_in_at 
  FROM auth.users u 
  WHERE u.id = p.id
)
WHERE last_sign_in_at IS NULL;
