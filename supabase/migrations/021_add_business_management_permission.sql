-- =============================================================================
-- ADD BUSINESS MANAGEMENT PERMISSION
-- =============================================================================
-- This migration adds the permission for the Business Management dropdown

-- Add the permission
INSERT INTO public.permissions (key, description) 
VALUES 
  ('businessmanagement.view', 'View and access Business Management section')
ON CONFLICT (key) DO NOTHING;

-- Assign permission to Admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin' AND p.key = 'businessmanagement.view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permission to Manager role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Manager' AND p.key = 'businessmanagement.view'
ON CONFLICT (role_id, permission_id) DO NOTHING;
