-- Migration: Add field and action level permissions for Permissions page
-- This allows granular control over what fields and actions users can see/perform on the Permissions page

-- Field visibility permissions
INSERT INTO permissions (key, description) VALUES
  ('permissions.field.key', 'Can view permission key column'),
  ('permissions.field.description', 'Can view permission description column'),
  ('permissions.field.group', 'Can view permission group/category info')
ON CONFLICT (key) DO NOTHING;

-- Action permissions
INSERT INTO permissions (key, description) VALUES
  ('permissions.action.create', 'Can create new permissions'),
  ('permissions.action.edit', 'Can edit existing permissions'),
  ('permissions.action.delete', 'Can delete permissions'),
  ('permissions.action.search', 'Can search/filter permissions'),
  ('permissions.action.expand', 'Can expand/collapse permission groups'),
  ('permissions.action.export', 'Can export permissions data')
ON CONFLICT (key) DO NOTHING;

-- Assign all permissions field/action permissions to Admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Admin'
  AND p.key LIKE 'permissions.field.%'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Admin'
  AND p.key LIKE 'permissions.action.%'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign view-only permissions to Manager role (can see all fields but limited actions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Manager'
  AND p.key IN (
    'permissions.field.key',
    'permissions.field.description',
    'permissions.field.group',
    'permissions.action.search',
    'permissions.action.expand'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;
