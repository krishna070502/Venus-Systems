-- Migration: Add Items-Purchase Permissions
-- Description: Adds permissions for Items-Purchase page under Inventory Management
-- Created: 2025-12-07

-- Insert permissions for Items-Purchase
INSERT INTO permissions (key, description) VALUES
  -- Sidebar visibility
  ('itemspurchase.view', 'View Items-Purchase page in sidebar under Inventory Management'),
  
  -- Page access and CRUD operations
  ('itemspurchase.read', 'View and read Items-Purchase page content'),
  ('itemspurchase.write', 'Create new purchase items (Broiler Birds, Parent(Cull) Birds, etc.)'),
  ('itemspurchase.update', 'Update existing purchase items'),
  ('itemspurchase.delete', 'Delete purchase items')
ON CONFLICT (key) DO NOTHING;

-- Assign all Items-Purchase permissions to Admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Admin'
  AND p.key LIKE 'itemspurchase.%'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Comment
COMMENT ON TABLE permissions IS 'Added Items-Purchase permissions for managing purchase items like Broiler Birds, Parent(Cull) Birds, etc.';
