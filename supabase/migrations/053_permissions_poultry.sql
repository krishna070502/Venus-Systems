-- =============================================================================
-- POULTRY RETAIL PERMISSIONS
-- =============================================================================
-- Migration: 053_permissions_poultry.sql
-- Description: Adds permissions for PoultryRetail-Core module
-- Date: 2026-01-13
-- =============================================================================

-- ============================================================================
-- INSERT NEW PERMISSIONS
-- ============================================================================
INSERT INTO public.permissions (key, description) VALUES
    -- Supplier permissions
    ('suppliers.view', 'View suppliers list'),
    ('suppliers.create', 'Create new suppliers'),
    ('suppliers.edit', 'Edit supplier details'),
    ('suppliers.delete', 'Deactivate suppliers'),
    
    -- Purchase permissions
    ('purchases.view', 'View purchase orders'),
    ('purchases.create', 'Create purchase orders'),
    ('purchases.commit', 'Commit purchases to inventory'),
    ('purchases.cancel', 'Cancel purchase orders'),
    
    -- Inventory permissions
    ('inventory.view', 'View current stock levels'),
    ('inventory.ledger', 'View inventory ledger history'),
    ('inventory.adjust', 'Make manual inventory adjustments'),
    
    -- Processing permissions
    ('processing.view', 'View processing entries'),
    ('processing.create', 'Create processing entries'),
    
    -- Sales permissions
    ('sales.create', 'Create POS sales'),
    ('sales.view', 'View sales history'),
    ('sales.bulk', 'Create bulk/wholesale sales'),
    ('sales.void', 'Void sales (admin only)'),
    
    -- Settlement permissions
    ('settlements.view', 'View daily settlements'),
    ('settlements.create', 'Create settlement drafts'),
    ('settlements.submit', 'Submit settlements for approval'),
    ('settlements.approve', 'Approve settlements (manager/admin)'),
    ('settlements.lock', 'Lock settlements (admin only)'),
    
    -- Variance permissions
    ('variance.view', 'View variance logs'),
    ('variance.approve', 'Approve positive variance'),
    ('variance.deduct', 'Deduct negative variance'),
    
    -- Staff points permissions
    ('staffpoints.view', 'View own staff points'),
    ('staffpoints.viewall', 'View all staff points'),
    ('staffpoints.manage', 'Manage staff points (add/deduct)'),
    
    -- Wastage config permissions
    ('wastageconfig.view', 'View wastage configuration'),
    ('wastageconfig.edit', 'Edit wastage configuration'),
    
    -- SKU permissions
    ('skus.view', 'View SKUs'),
    ('skus.manage', 'Create and edit SKUs'),
    
    -- Store pricing permissions
    ('storeprices.view', 'View store prices'),
    ('storeprices.edit', 'Edit store prices')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- ASSIGN PERMISSIONS TO ADMIN ROLE
-- ============================================================================
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin' AND p.key IN (
    'suppliers.view', 'suppliers.create', 'suppliers.edit', 'suppliers.delete',
    'purchases.view', 'purchases.create', 'purchases.commit', 'purchases.cancel',
    'inventory.view', 'inventory.ledger', 'inventory.adjust',
    'processing.view', 'processing.create',
    'sales.create', 'sales.view', 'sales.bulk', 'sales.void',
    'settlements.view', 'settlements.create', 'settlements.submit', 'settlements.approve', 'settlements.lock',
    'variance.view', 'variance.approve', 'variance.deduct',
    'staffpoints.view', 'staffpoints.viewall', 'staffpoints.manage',
    'wastageconfig.view', 'wastageconfig.edit',
    'skus.view', 'skus.manage',
    'storeprices.view', 'storeprices.edit'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- CREATE "ACCOUNT" ROLE (if not exists)
-- ============================================================================
INSERT INTO public.roles (name, description)
VALUES ('Account', 'Account role for managing purchases and payables')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to Account role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Account' AND p.key IN (
    'suppliers.view', 'suppliers.create', 'suppliers.edit',
    'purchases.view', 'purchases.create', 'purchases.commit',
    'inventory.view',
    'sales.view',
    'settlements.view', 'settlements.submit',
    'variance.view',
    'staffpoints.view',
    'storeprices.view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- ASSIGN PERMISSIONS TO STORE MANAGER ROLE
-- ============================================================================
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Store Manager' AND p.key IN (
    'suppliers.view',
    'purchases.view',
    'inventory.view', 'inventory.ledger',
    'processing.view', 'processing.create',
    'sales.create', 'sales.view', 'sales.bulk',
    'settlements.view', 'settlements.create', 'settlements.submit', 'settlements.approve',
    'variance.view', 'variance.approve', 'variance.deduct',
    'staffpoints.view', 'staffpoints.viewall',
    'wastageconfig.view',
    'skus.view',
    'storeprices.view', 'storeprices.edit'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
