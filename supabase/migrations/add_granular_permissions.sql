-- =============================================================================
-- ADD GRANULAR PERMISSIONS FOR PERMISSIONS PAGE
-- =============================================================================
-- These permissions enable field-level and action-level control on the Permissions page

-- Insert granular permissions for Permissions page
INSERT INTO public.permissions (key, description) VALUES
  -- Permissions - Action permissions
  ('permissions.action.create', 'Create new permissions'),
  ('permissions.action.edit', 'Edit existing permissions'),
  ('permissions.action.delete', 'Delete permissions'),
  ('permissions.action.search', 'Search and filter permissions'),
  ('permissions.action.expand', 'Expand/collapse permission groups'),
  ('permissions.action.export', 'Export permissions data'),
  
  -- Permissions - Field permissions  
  ('permissions.field.key', 'View permission key column'),
  ('permissions.field.description', 'View permission description column'),
  ('permissions.field.group', 'View permission group information')
ON CONFLICT (key) DO NOTHING;

-- Assign all these new permissions to Admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin'
  AND p.key LIKE 'permissions.action.%' OR p.key LIKE 'permissions.field.%'
ON CONFLICT (role_id, permission_id) DO NOTHING;
