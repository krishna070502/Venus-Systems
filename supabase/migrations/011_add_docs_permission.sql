-- Add system.docs permission for documentation access
INSERT INTO permissions (key, description)
VALUES ('system.docs', 'Access to documentation and API docs')
ON CONFLICT (key) DO NOTHING;

-- Assign system.docs permission to Admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id,
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Admin' 
  AND p.key = 'system.docs'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Optionally assign to Manager role as well
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id,
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Manager' 
  AND p.key = 'system.docs'
ON CONFLICT (role_id, permission_id) DO NOTHING;
