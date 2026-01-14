-- =============================================================================
-- ADD SETTLEMENT BACKDATE PERMISSION
-- =============================================================================
-- Migration: 070_add_settlement_backdate_permission.sql
-- Description: Adds permission for creating backdated settlements and grants to Admin.
-- Date: 2026-01-14
-- =============================================================================

-- 1. Add the permission
INSERT INTO public.permissions (key, description)
VALUES ('settlements.backdate', 'Allowed to create settlements for previous dates')
ON CONFLICT (key) DO NOTHING;

-- 2. Grant to Admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin' AND p.key = 'settlements.backdate'
ON CONFLICT (role_id, permission_id) DO NOTHING;
