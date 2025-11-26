-- =============================================================================
-- ADD SHOP MANAGEMENT PERMISSIONS
-- =============================================================================
-- This migration adds all permissions for the Shop Management section

-- Add the permissions
INSERT INTO public.permissions (key, description) 
VALUES 
  -- Parent permission for Shop Management dropdown
  ('shopmanagement.view', 'View and access Shop Management section'),
  
  -- Shops permissions
  ('shops.view', 'View Shops page in sidebar'),
  ('shops.read', 'Read shop records'),
  ('shops.write', 'Create new shops'),
  ('shops.update', 'Update existing shops'),
  ('shops.delete', 'Delete shops'),
  
  -- Managers permissions
  ('managers.view', 'View Managers page in sidebar'),
  ('managers.read', 'Read manager records'),
  ('managers.write', 'Create new managers'),
  ('managers.update', 'Update existing managers'),
  ('managers.delete', 'Delete managers')
ON CONFLICT (key) DO NOTHING;

-- Assign all permissions to Admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin' AND p.key IN (
  'shopmanagement.view',
  'shops.view', 'shops.read', 'shops.write', 'shops.update', 'shops.delete',
  'managers.view', 'managers.read', 'managers.write', 'managers.update', 'managers.delete'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign all permissions to Manager role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Manager' AND p.key IN (
  'shopmanagement.view',
  'shops.view', 'shops.read', 'shops.write', 'shops.update', 'shops.delete',
  'managers.view', 'managers.read', 'managers.write', 'managers.update', 'managers.delete'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;
