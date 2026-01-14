-- =============================================================================
-- ADD SHOP TIMEZONE MANAGEMENT PERMISSION
-- =============================================================================
-- Migration: 069_shop_timezone_permission.sql
-- Description: Adds permission for managing shop timezones and grants to Admin.
-- Date: 2026-01-14
-- =============================================================================

-- 1. Add the permission
INSERT INTO public.permissions (key, description)
VALUES ('shops.manage_timezone', 'Allowed to change shop timezones')
ON CONFLICT (key) DO NOTHING;

-- 2. Grant to Admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin' AND p.key = 'shops.manage_timezone'
ON CONFLICT (role_id, permission_id) DO NOTHING;
