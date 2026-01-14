-- =============================================================================
-- ADD SETTLEMENT APPROVE PERMISSION
-- =============================================================================
-- Migration: 071_add_settlement_approve_permission.sql
-- Description: Adds permission for approving settlements and grants to Admin and Account.
-- Date: 2026-01-14
-- =============================================================================

-- 1. Add the permission
INSERT INTO public.permissions (key, description)
VALUES ('settlements.approve', 'Allowed to approve submitted daily settlements')
ON CONFLICT (key) DO NOTHING;

-- 2. Grant to Admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin' AND p.key = 'settlements.approve'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3. Grant to Account role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Account' AND p.key = 'settlements.approve'
ON CONFLICT (role_id, permission_id) DO NOTHING;
