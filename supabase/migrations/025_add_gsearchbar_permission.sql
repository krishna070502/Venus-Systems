-- =============================================================================
-- ADD GLOBAL SEARCH BAR PERMISSION
-- =============================================================================
-- Migration: 025_add_gsearchbar_permission.sql
-- Description: Adds permission to view/use the global search bar in the header
-- Date: 2024-11-30
-- =============================================================================

-- Add the permission for global search bar
INSERT INTO public.permissions (key, description) 
VALUES 
  ('gsearchbar.view', 'View and use the global search bar in the header')
ON CONFLICT (key) DO NOTHING;

-- Assign permission to Admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin' AND p.key = 'gsearchbar.view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permission to Manager role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Manager' AND p.key = 'gsearchbar.view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permission to Store Manager role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Store Manager' AND p.key = 'gsearchbar.view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
