-- =============================================================================
-- ADD INVENTORY ITEMS PERMISSIONS
-- =============================================================================
-- Migration: 024_add_inventory_items_permissions.sql
-- Description: Adds CRUD permissions for the Items page under Inventory Management
-- Date: 2024-11-30
-- =============================================================================

-- Add the permissions for inventory items
INSERT INTO public.permissions (key, description) 
VALUES 
  -- View permission (to see Items in sidebar)
  ('inventoryitems.view', 'View Items page in sidebar under Inventory Management'),
  
  -- CRUD permissions
  ('inventoryitems.read', 'Read inventory items records'),
  ('inventoryitems.write', 'Create new inventory items'),
  ('inventoryitems.update', 'Update existing inventory items'),
  ('inventoryitems.delete', 'Delete inventory items')
ON CONFLICT (key) DO NOTHING;

-- Assign all permissions to Admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin' AND p.key IN (
  'inventoryitems.view',
  'inventoryitems.read',
  'inventoryitems.write',
  'inventoryitems.update',
  'inventoryitems.delete'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign all permissions to Manager role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Manager' AND p.key IN (
  'inventoryitems.view',
  'inventoryitems.read',
  'inventoryitems.write',
  'inventoryitems.update',
  'inventoryitems.delete'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign view and read permissions to Store Manager role (limited access)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Store Manager' AND p.key IN (
  'inventoryitems.view',
  'inventoryitems.read'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
