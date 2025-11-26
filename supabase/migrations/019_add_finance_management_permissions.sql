-- =============================================================================
-- ADD FINANCE MANAGEMENT PERMISSIONS
-- =============================================================================
-- This migration adds all permissions for the Finance Management section

-- Add the permissions
INSERT INTO public.permissions (key, description) 
VALUES 
  -- Parent permission for Finance Management dropdown
  ('finance.view', 'View and access Finance Management section'),
  
  -- Expenses permissions
  ('expense.view', 'View Expenses page in sidebar'),
  ('expense.read', 'Read expense records'),
  ('expense.write', 'Create new expense entries'),
  ('expense.update', 'Update existing expense entries'),
  ('expense.delete', 'Delete expense entries'),
  
  -- Cashbook permissions
  ('cashbook.view', 'View Cashbook page in sidebar'),
  ('cashbook.read', 'Read cashbook records'),
  ('cashbook.write', 'Create new cashbook entries'),
  ('cashbook.update', 'Update existing cashbook entries'),
  ('cashbook.delete', 'Delete cashbook entries'),
  
  -- Ledger permissions
  ('ledger.view', 'View Ledger page in sidebar'),
  ('ledger.read', 'Read ledger records'),
  ('ledger.write', 'Create new ledger entries'),
  ('ledger.update', 'Update existing ledger entries'),
  ('ledger.delete', 'Delete ledger entries')
ON CONFLICT (key) DO NOTHING;

-- Assign all permissions to Admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin' AND p.key IN (
  'finance.view',
  'expense.view', 'expense.read', 'expense.write', 'expense.update', 'expense.delete',
  'cashbook.view', 'cashbook.read', 'cashbook.write', 'cashbook.update', 'cashbook.delete',
  'ledger.view', 'ledger.read', 'ledger.write', 'ledger.update', 'ledger.delete'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign all permissions to Manager role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Manager' AND p.key IN (
  'finance.view',
  'expense.view', 'expense.read', 'expense.write', 'expense.update', 'expense.delete',
  'cashbook.view', 'cashbook.read', 'cashbook.write', 'cashbook.update', 'cashbook.delete',
  'ledger.view', 'ledger.read', 'ledger.write', 'ledger.update', 'ledger.delete'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;
