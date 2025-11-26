-- RESTORE WORKING TRIGGERS
-- This adds back the essential triggers without breaking login

-- =============================================================================
-- 1. NEW USER TRIGGER - Only runs on signup, not login
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert profile for new user
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role_id)
  SELECT NEW.id, r.id 
  FROM public.roles r 
  WHERE r.name = 'user' 
  LIMIT 1
  ON CONFLICT (user_id, role_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail auth if trigger has issues
  RAISE WARNING 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Create trigger ONLY for INSERT (new signups)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 2. AUDIT LOGGING TRIGGER - Fixed to handle all table types
-- =============================================================================

CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  old_id TEXT;
  new_id TEXT;
BEGIN
  -- Safely get IDs from OLD and NEW records
  BEGIN
    old_id := (to_jsonb(OLD)->>'id')::TEXT;
  EXCEPTION WHEN OTHERS THEN
    old_id := NULL;
  END;
  
  BEGIN
    new_id := (to_jsonb(NEW)->>'id')::TEXT;
  EXCEPTION WHEN OTHERS THEN
    new_id := NULL;
  END;

  -- Insert audit log
  INSERT INTO audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    changes,
    timestamp
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(new_id, old_id, 'unknown'),
    CASE 
      WHEN TG_OP = 'UPDATE' THEN 
        jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW))
      WHEN TG_OP = 'INSERT' THEN 
        jsonb_build_object('data', to_jsonb(NEW))
      WHEN TG_OP = 'DELETE' THEN 
        jsonb_build_object('data', to_jsonb(OLD))
    END,
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the operation if audit logging fails
  RAISE WARNING 'Audit log error: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply audit logging to key tables (only those that exist)
CREATE TRIGGER audit_log_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_log_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_log_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_log_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();

-- =============================================================================
-- 3. LAST SIGN-IN TRACKER - Updates profiles with login time
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_last_sign_in()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update profile's last_sign_in_at when user logs in
  UPDATE public.profiles
  SET last_sign_in_at = NEW.last_sign_in_at
  WHERE id = NEW.id;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'update_last_sign_in error: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Trigger only fires when last_sign_in_at changes
CREATE TRIGGER on_user_sign_in
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.update_last_sign_in();

-- =============================================================================
-- VERIFY ALL TRIGGERS
-- =============================================================================

SELECT 
  trigger_name,
  event_object_table,
  event_manipulation,
  action_timing
FROM information_schema.triggers 
WHERE trigger_schema IN ('public', 'auth')
AND (trigger_name LIKE '%audit%' 
  OR trigger_name LIKE '%auth_user%' 
  OR trigger_name LIKE '%sign_in%')
ORDER BY event_object_table, trigger_name;
