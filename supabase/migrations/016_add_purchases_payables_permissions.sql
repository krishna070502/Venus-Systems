-- =============================================================================
-- ADD PURCHASES & PAYABLES PERMISSIONS
-- =============================================================================
-- This migration adds all permissions for the Purchases & Payables section

-- Add the permissions
INSERT INTO public.permissions (key, description) 
VALUES 
  -- Parent permission for Purchases & Payables dropdown
  ('purchase&payment.view', 'View and access Purchases & Payables section'),
  
  -- Purchases permissions
  ('purchase.view', 'View Purchases page in sidebar'),
  ('purchase.read', 'Read purchase records'),
  ('purchase.write', 'Create new purchase entries'),
  ('purchase.update', 'Update existing purchase entries'),
  ('purchase.delete', 'Delete purchase entries'),
  
  -- Suppliers permissions
  ('supplier.view', 'View Suppliers page in sidebar'),
  ('supplier.read', 'Read supplier records'),
  ('supplier.write', 'Create new supplier entries'),
  ('supplier.update', 'Update existing supplier entries'),
  ('supplier.delete', 'Delete supplier entries'),
  
  -- Payments permissions
  ('payment.view', 'View Payments page in sidebar'),
  ('payment.read', 'Read payment records'),
  ('payment.write', 'Create new payment entries'),
  ('payment.update', 'Update existing payment entries'),
  ('payment.delete', 'Delete payment entries')
ON CONFLICT (key) DO NOTHING;

-- Assign all permissions to Admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin' AND p.key IN (
  'purchase&payment.view',
  'purchase.view', 'purchase.read', 'purchase.write', 'purchase.update', 'purchase.delete',
  'supplier.view', 'supplier.read', 'supplier.write', 'supplier.update', 'supplier.delete',
  'payment.view', 'payment.read', 'payment.write', 'payment.update', 'payment.delete'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign all permissions to Manager role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Manager' AND p.key IN (
  'purchase&payment.view',
  'purchase.view', 'purchase.read', 'purchase.write', 'purchase.update', 'purchase.delete',
  'supplier.view', 'supplier.read', 'supplier.write', 'supplier.update', 'supplier.delete',
  'payment.view', 'payment.read', 'payment.write', 'payment.update', 'payment.delete'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;
