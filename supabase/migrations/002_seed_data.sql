-- =============================================================================
-- SAAS STARTER KIT - SEED DATA
-- =============================================================================
-- This migration populates the database with initial roles, permissions, and mappings

-- =============================================================================
-- SEED ROLES
-- =============================================================================
INSERT INTO public.roles (name, description) VALUES
  ('Admin', 'Full system access with all permissions'),
  ('Manager', 'Can manage users and view reports'),
  ('User', 'Standard user with basic access')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- SEED PERMISSIONS
-- =============================================================================
INSERT INTO public.permissions (key, description) VALUES
  -- User permissions
  ('users.read', 'View users'),
  ('users.write', 'Create and update users'),
  ('users.delete', 'Delete users'),
  ('users.manage_roles', 'Assign roles to users'),
  
  -- Role permissions
  ('roles.read', 'View roles'),
  ('roles.write', 'Create and update roles'),
  ('roles.delete', 'Delete roles'),
  
  -- Permission permissions
  ('permissions.read', 'View permissions'),
  ('permissions.write', 'Create and update permissions'),
  ('permissions.manage', 'Assign permissions to roles'),
  
  -- System permissions
  ('system.settings', 'Access system settings'),
  ('system.logs', 'View system logs'),
  ('system.admin', 'Access admin panel'),
  
  -- Profile permissions
  ('profile.read', 'View own profile'),
  ('profile.write', 'Update own profile')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- SEED ROLE-PERMISSION MAPPINGS
-- =============================================================================

-- Admin gets all permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager gets user and report permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Manager'
  AND p.key IN (
    'users.read',
    'users.write',
    'roles.read',
    'permissions.read',
    'system.logs',
    'system.admin',
    'profile.read',
    'profile.write'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- User gets basic permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'User'
  AND p.key IN (
    'profile.read',
    'profile.write'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;
