-- =============================================================================
-- USERS FIELD-LEVEL PERMISSIONS
-- =============================================================================
-- Migration: 029_add_users_field_permissions.sql
-- Description: Adds field/column-level permissions for the Users page
-- Date: 2025-11-30
-- =============================================================================

-- Insert field-level permissions for Users
INSERT INTO public.permissions (key, description) VALUES
    -- Column visibility permissions
    ('users.field.email', 'View user email column'),
    ('users.field.name', 'View user name column'),
    ('users.field.roles', 'View user roles column'),
    ('users.field.created', 'View user created date column'),
    ('users.field.lastlogin', 'View user last login column'),
    ('users.field.status', 'View user status column'),
    
    -- Action permissions
    ('users.action.edit', 'Edit user details'),
    ('users.action.delete', 'Delete users'),
    ('users.action.manageroles', 'Manage user roles'),
    ('users.action.viewroles', 'View user roles (read-only)'),
    ('users.action.export', 'Export users data'),
    ('users.action.invite', 'Invite new users')
ON CONFLICT (key) DO NOTHING;

-- Assign all field permissions to Admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p
WHERE r.name = 'Admin' 
  AND p.key LIKE 'users.field.%'
ON CONFLICT DO NOTHING;

-- Assign all action permissions to Admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p
WHERE r.name = 'Admin' 
  AND p.key LIKE 'users.action.%'
ON CONFLICT DO NOTHING;

-- Assign limited permissions to Manager role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p
WHERE r.name = 'Manager' 
  AND p.key IN (
    'users.field.email',
    'users.field.name',
    'users.field.roles',
    'users.field.created',
    'users.action.viewroles'
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
