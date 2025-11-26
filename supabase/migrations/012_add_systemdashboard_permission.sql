-- Add systemdashboard.view permission for dashboard access control
INSERT INTO permissions (key, description)
VALUES ('systemdashboard.view', 'Access to view the system dashboard')
ON CONFLICT (key) DO NOTHING;

-- Assign systemdashboard.view permission to Admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id,
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Admin' 
  AND p.key = 'systemdashboard.view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign systemdashboard.view permission to Manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id,
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Manager' 
  AND p.key = 'systemdashboard.view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Optionally assign to User role as well (comment out if you want to restrict)
-- INSERT INTO role_permissions (role_id, permission_id)
-- SELECT 
--     r.id,
--     p.id
-- FROM roles r
-- CROSS JOIN permissions p
-- WHERE r.name = 'User' 
--   AND p.key = 'systemdashboard.view'
-- ON CONFLICT (role_id, permission_id) DO NOTHING;
