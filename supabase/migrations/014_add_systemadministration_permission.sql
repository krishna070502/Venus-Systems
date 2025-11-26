-- =============================================================================
-- ADD SYSTEM ADMINISTRATION PERMISSION
-- =============================================================================
-- This migration adds the systemadministration.view permission for controlling
-- access to the System Administration dropdown menu in the sidebar

-- Add the permission
INSERT INTO public.permissions (key, description) 
VALUES ('systemadministration.view', 'View and access System Administration section')
ON CONFLICT (key) DO NOTHING;

-- Assign to Admin role (automatically gets all permissions)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin' AND p.key = 'systemadministration.view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign to Manager role (managers should have access to system administration)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Manager' AND p.key = 'systemadministration.view'
ON CONFLICT (role_id, permission_id) DO NOTHING;
