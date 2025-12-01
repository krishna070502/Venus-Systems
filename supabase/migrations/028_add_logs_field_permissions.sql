-- =============================================================================
-- LOGS FIELD-LEVEL PERMISSIONS
-- =============================================================================
-- Migration: 028_add_logs_field_permissions.sql
-- Description: Adds field/column-level permissions for the Logs page
-- Date: 2025-11-30
-- =============================================================================

-- Insert field-level permissions for Logs
INSERT INTO public.permissions (key, description) VALUES
    -- Column visibility permissions
    ('logs.field.timestamp', 'View log timestamp column'),
    ('logs.field.action', 'View log action column'),
    ('logs.field.resource', 'View log resource column'),
    ('logs.field.changes', 'View log changes column'),
    ('logs.field.user', 'View log user column'),
    ('logs.field.metadata', 'View log metadata'),
    
    -- Action permissions
    ('logs.action.view', 'View log details'),
    ('logs.action.export', 'Export logs data'),
    ('logs.action.filter', 'Use log filters'),
    ('logs.action.search', 'Search logs')
ON CONFLICT (key) DO NOTHING;

-- Assign all field permissions to Admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p
WHERE r.name = 'Admin' 
  AND p.key LIKE 'logs.field.%'
ON CONFLICT DO NOTHING;

-- Assign all action permissions to Admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p
WHERE r.name = 'Admin' 
  AND p.key LIKE 'logs.action.%'
ON CONFLICT DO NOTHING;

-- Assign limited permissions to Manager role (can view but not export)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p
WHERE r.name = 'Manager' 
  AND p.key IN (
    'logs.field.timestamp',
    'logs.field.action',
    'logs.field.resource',
    'logs.action.view',
    'logs.action.filter',
    'logs.action.search'
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
