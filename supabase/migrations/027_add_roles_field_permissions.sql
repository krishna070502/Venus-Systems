-- =============================================================================
-- ROLES FIELD-LEVEL PERMISSIONS
-- =============================================================================
-- Migration: 027_add_roles_field_permissions.sql
-- Description: Adds field/column-level permissions for the Roles page
-- Date: 2025-11-30
-- =============================================================================

-- Insert field-level permissions for Roles
INSERT INTO public.permissions (key, description) VALUES
    -- Column visibility permissions
    ('roles.field.name', 'View role name column'),
    ('roles.field.description', 'View role description column'),
    ('roles.field.permissions', 'View role permissions column'),
    ('roles.field.usercount', 'View role user count column'),
    ('roles.field.createdat', 'View role created date column'),
    
    -- Action permissions (more granular than existing)
    ('roles.action.edit', 'Edit role details (name, description)'),
    ('roles.action.delete', 'Delete roles'),
    ('roles.action.managepermissions', 'Manage role permissions'),
    ('roles.action.viewpermissions', 'View role permissions (read-only)'),
    ('roles.action.duplicate', 'Duplicate/clone a role'),
    ('roles.action.export', 'Export roles data')
ON CONFLICT (key) DO NOTHING;

-- Assign all field permissions to Admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p
WHERE r.name = 'Admin' 
  AND p.key LIKE 'roles.field.%'
ON CONFLICT DO NOTHING;

-- Assign all action permissions to Admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p
WHERE r.name = 'Admin' 
  AND p.key LIKE 'roles.action.%'
ON CONFLICT DO NOTHING;

-- Assign view-only field permissions to Manager role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p
WHERE r.name = 'Manager' 
  AND p.key IN (
    'roles.field.name',
    'roles.field.description',
    'roles.field.permissions',
    'roles.field.usercount',
    'roles.action.viewpermissions'
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
