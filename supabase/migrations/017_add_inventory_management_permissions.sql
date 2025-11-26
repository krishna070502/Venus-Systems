-- =============================================================================
-- ADD INVENTORY MANAGEMENT PERMISSIONS
-- =============================================================================
-- This migration adds all permissions for the Inventory Management section

-- Add the permissions
INSERT INTO public.permissions (key, description) 
VALUES 
  -- Parent permission for Inventory Management dropdown
  ('inventory.view', 'View and access Inventory Management section'),
  
  -- Stock permissions
  ('stock.view', 'View Stock page in sidebar'),
  ('stock.read', 'Read stock records'),
  ('stock.write', 'Create new stock entries'),
  ('stock.update', 'Update existing stock entries'),
  ('stock.delete', 'Delete stock entries'),
  
  -- Wastage permissions
  ('wastage.view', 'View Wastage page in sidebar'),
  ('wastage.read', 'Read wastage records'),
  ('wastage.write', 'Create new wastage entries'),
  ('wastage.update', 'Update existing wastage entries'),
  ('wastage.delete', 'Delete wastage entries'),
  
  -- Adjustments permissions
  ('adjustments.view', 'View Adjustments page in sidebar'),
  ('adjustments.read', 'Read adjustment records'),
  ('adjustments.write', 'Create new adjustment entries'),
  ('adjustments.update', 'Update existing adjustment entries'),
  ('adjustments.delete', 'Delete adjustment entries')
ON CONFLICT (key) DO NOTHING;

-- Assign all permissions to Admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin' AND p.key IN (
  'inventory.view',
  'stock.view', 'stock.read', 'stock.write', 'stock.update', 'stock.delete',
  'wastage.view', 'wastage.read', 'wastage.write', 'wastage.update', 'wastage.delete',
  'adjustments.view', 'adjustments.read', 'adjustments.write', 'adjustments.update', 'adjustments.delete'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign all permissions to Manager role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Manager' AND p.key IN (
  'inventory.view',
  'stock.view', 'stock.read', 'stock.write', 'stock.update', 'stock.delete',
  'wastage.view', 'wastage.read', 'wastage.write', 'wastage.update', 'wastage.delete',
  'adjustments.view', 'adjustments.read', 'adjustments.write', 'adjustments.update', 'adjustments.delete'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;
