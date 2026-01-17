-- =============================================================================
-- DASHBOARD WIDGET PERMISSIONS
-- =============================================================================
-- Migration: 085_dashboard_widget_permissions.sql
-- Description: Granular permissions for specific dashboard widgets
-- Date: 2026-01-16
-- =============================================================================

-- 1. Add new permissions
INSERT INTO public.permissions (key, description) VALUES
    ('dashboard.widget.shortcuts', 'Access to Quick Links widget on personal home'),
    ('dashboard.widget.recent-activity', 'Access to Recent Activity widget on personal home'),
    ('dashboard.widget.clock', 'Access to Clock & Date widget on personal home'),
    ('dashboard.widget.store-summary', 'Access to Store Summary widget on personal home'),
    ('dashboard.widget.sales-summary', 'Access to Sales Summary widget on personal home'),
    ('dashboard.widget.staff-points', 'Access to My Points widget on personal home')
ON CONFLICT (key) DO NOTHING;

-- 2. Grant these permissions to Admin and Manager roles by default
-- Admin gets everything
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin' 
AND p.key LIKE 'dashboard.widget.%'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager gets most
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Manager' 
AND p.key IN (
    'dashboard.widget.shortcuts',
    'dashboard.widget.recent-activity',
    'dashboard.widget.clock',
    'dashboard.widget.store-summary',
    'dashboard.widget.sales-summary'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Staff gets basics
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Staff' 
AND p.key IN (
    'dashboard.widget.shortcuts',
    'dashboard.widget.clock',
    'dashboard.widget.staff-points'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;
