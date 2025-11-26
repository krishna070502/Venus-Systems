-- =============================================================================
-- ADD SALES & INCOME PERMISSIONS
-- =============================================================================
-- This migration adds all permissions for the Sales & Income section

-- Add the permissions
INSERT INTO public.permissions (key, description) 
VALUES 
  -- Parent permission for Sales & Income dropdown
  ('salesincome.view', 'View and access Sales & Income section'),
  
  -- Sales permissions
  ('sales.view', 'View Sales page in sidebar'),
  ('sales.read', 'Read sales records'),
  ('sales.write', 'Create new sales entries'),
  ('sales.update', 'Update existing sales entries'),
  ('sales.delete', 'Delete sales entries'),
  
  -- Customers permissions
  ('customer.view', 'View Customers page in sidebar'),
  ('customer.read', 'Read customer records'),
  ('customer.write', 'Create new customer entries'),
  ('customer.update', 'Update existing customer entries'),
  ('customer.delete', 'Delete customer entries'),
  
  -- Receipts permissions
  ('receipt.view', 'View Receipts page in sidebar'),
  ('receipt.read', 'Read receipt records'),
  ('receipt.write', 'Create new receipt entries'),
  ('receipt.update', 'Update existing receipt entries'),
  ('receipt.delete', 'Delete receipt entries')
ON CONFLICT (key) DO NOTHING;

-- Assign all permissions to Admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin' AND p.key IN (
  'salesincome.view',
  'sales.view', 'sales.read', 'sales.write', 'sales.update', 'sales.delete',
  'customer.view', 'customer.read', 'customer.write', 'customer.update', 'customer.delete',
  'receipt.view', 'receipt.read', 'receipt.write', 'receipt.update', 'receipt.delete'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign all permissions to Manager role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Manager' AND p.key IN (
  'salesincome.view',
  'sales.view', 'sales.read', 'sales.write', 'sales.update', 'sales.delete',
  'customer.view', 'customer.read', 'customer.write', 'customer.update', 'customer.delete',
  'receipt.view', 'receipt.read', 'receipt.write', 'receipt.update', 'receipt.delete'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;
