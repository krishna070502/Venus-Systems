-- =============================================================================
-- ADD BUSINESS PERMISSION
-- =============================================================================
-- This migration adds the business.view permission for controlling
-- access to the Business dropdown menu in the sidebar

-- Add the permissions
INSERT INTO public.permissions (key, description) 
VALUES 
  ('business.view', 'View and access Business section'),
  ('businessdashboard.view', 'View Business Dashboard')
ON CONFLICT (key) DO NOTHING;

-- Assign to Admin role (automatically gets all permissions)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin' AND p.key IN ('business.view', 'businessdashboard.view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign to Manager role (managers should have access to business)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Manager' AND p.key IN ('business.view', 'businessdashboard.view')
ON CONFLICT (role_id, permission_id) DO NOTHING;
