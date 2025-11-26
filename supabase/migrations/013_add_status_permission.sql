-- Add system.status permission for API status indicators
INSERT INTO permissions (key, description)
VALUES ('system.status', 'View backend and database status indicators')
ON CONFLICT (key) DO NOTHING;

-- Assign system.status permission to Admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id,
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Admin' 
  AND p.key = 'system.status'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign system.status permission to Manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id,
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Manager' 
  AND p.key = 'system.status'
ON CONFLICT (role_id, permission_id) DO NOTHING;
