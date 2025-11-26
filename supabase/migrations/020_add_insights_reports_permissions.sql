-- =============================================================================
-- ADD INSIGHTS & REPORTS PERMISSIONS
-- =============================================================================
-- This migration adds all permissions for the Insights & Reports section

-- Add the permissions
INSERT INTO public.permissions (key, description) 
VALUES 
  -- Parent permission for Insights & Reports dropdown
  ('analytics.view', 'View and access Insights & Reports section'),
  
  -- Sales Reports permissions
  ('salesreport.view', 'View Sales Reports page in sidebar'),
  ('salesreport.read', 'Read sales report records'),
  ('salesreport.write', 'Create new sales report entries'),
  ('salesreport.update', 'Update existing sales report entries'),
  ('salesreport.delete', 'Delete sales report entries'),
  
  -- Purchase Reports permissions
  ('purchasereport.view', 'View Purchase Reports page in sidebar'),
  ('purchasereport.read', 'Read purchase report records'),
  ('purchasereport.write', 'Create new purchase report entries'),
  ('purchasereport.update', 'Update existing purchase report entries'),
  ('purchasereport.delete', 'Delete purchase report entries'),
  
  -- Expense Reports permissions
  ('expensereport.view', 'View Expense Reports page in sidebar'),
  ('expensereport.read', 'Read expense report records'),
  ('expensereport.write', 'Create new expense report entries'),
  ('expensereport.update', 'Update existing expense report entries'),
  ('expensereport.delete', 'Delete expense report entries')
ON CONFLICT (key) DO NOTHING;

-- Assign all permissions to Admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin' AND p.key IN (
  'analytics.view',
  'salesreport.view', 'salesreport.read', 'salesreport.write', 'salesreport.update', 'salesreport.delete',
  'purchasereport.view', 'purchasereport.read', 'purchasereport.write', 'purchasereport.update', 'purchasereport.delete',
  'expensereport.view', 'expensereport.read', 'expensereport.write', 'expensereport.update', 'expensereport.delete'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign all permissions to Manager role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Manager' AND p.key IN (
  'analytics.view',
  'salesreport.view', 'salesreport.read', 'salesreport.write', 'salesreport.update', 'salesreport.delete',
  'purchasereport.view', 'purchasereport.read', 'purchasereport.write', 'purchasereport.update', 'purchasereport.delete',
  'expensereport.view', 'expensereport.read', 'expensereport.write', 'expensereport.update', 'expensereport.delete'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;
