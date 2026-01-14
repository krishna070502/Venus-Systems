-- Ensure get_user_permissions function exists
-- This function returns all permission keys for a given user based on their assigned roles

CREATE OR REPLACE FUNCTION public.get_user_permissions(user_id UUID)
RETURNS TABLE (permission_key TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.key
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON ur.role_id = rp.role_id
  JOIN public.permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = $1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_permissions(UUID) TO authenticated;

-- Comment on the function
COMMENT ON FUNCTION public.get_user_permissions(UUID) IS 'Returns all permission keys for a given user based on their assigned roles';
