-- =============================================================================
-- COMPREHENSIVE POULTRY RETAIL GRANULAR PERMISSIONS
-- =============================================================================
-- Migration: 056_poultry_granular_permissions.sql
-- Description: Adds granular CRUD, sidebar, field-level, and action permissions
--              for all PoultryRetail-Core modules
-- Date: 2026-01-13
-- =============================================================================

-- ============================================================================
-- PART 1: SIDEBAR / NAVIGATION PERMISSIONS
-- ============================================================================
-- These control visibility in the admin sidebar

INSERT INTO public.permissions (key, description) VALUES
    -- Main poultry menu
    ('poultry.sidebar', 'View Poultry Retail menu in sidebar'),
    ('poultry.dashboard.view', 'View Poultry Dashboard'),
    
    -- Supplier sidebar
    ('suppliers.sidebar', 'View Suppliers menu in sidebar'),
    
    -- Purchase sidebar
    ('purchases.sidebar', 'View Purchases menu in sidebar'),
    
    -- Inventory sidebar
    ('inventory.sidebar', 'View Inventory menu in sidebar'),
    ('inventory.ledger.sidebar', 'View Ledger submenu in sidebar'),
    ('inventory.stock.sidebar', 'View Current Stock submenu in sidebar'),
    ('inventory.adjustments.sidebar', 'View Adjustments submenu in sidebar'),
    
    -- Processing sidebar
    ('processing.sidebar', 'View Processing menu in sidebar'),
    
    -- SKUs & Pricing sidebar
    ('skus.sidebar', 'View SKUs menu in sidebar'),
    ('storeprices.sidebar', 'View Store Pricing submenu in sidebar'),
    
    -- Sales sidebar
    ('sales.sidebar', 'View Sales menu in sidebar'),
    ('sales.pos.sidebar', 'View POS submenu in sidebar'),
    ('sales.history.sidebar', 'View Sales History submenu in sidebar'),
    
    -- Settlements sidebar
    ('settlements.sidebar', 'View Settlements menu in sidebar'),
    ('variance.sidebar', 'View Variance submenu in sidebar'),
    
    -- Staff Points sidebar
    ('staffpoints.sidebar', 'View Staff Points menu in sidebar'),
    ('staffgrading.sidebar', 'View Staff Grading submenu in sidebar'),
    ('staffleaderboard.sidebar', 'View Leaderboard submenu in sidebar'),
    
    -- Configuration sidebar
    ('poultryconfig.sidebar', 'View Poultry Config menu in sidebar'),
    ('wastageconfig.sidebar', 'View Wastage Config submenu in sidebar'),
    ('gradingconfig.sidebar', 'View Grading Config submenu in sidebar')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- PART 2: SUPPLIER GRANULAR PERMISSIONS
-- ============================================================================

INSERT INTO public.permissions (key, description) VALUES
    -- CRUD
    ('suppliers.read', 'Read supplier details'),
    ('suppliers.list', 'List all suppliers'),
    ('suppliers.update', 'Update supplier details'),
    ('suppliers.deactivate', 'Deactivate suppliers'),
    ('suppliers.reactivate', 'Reactivate suppliers'),
    
    -- Field permissions
    ('suppliers.field.name', 'View supplier name'),
    ('suppliers.field.phone', 'View supplier phone'),
    ('suppliers.field.email', 'View supplier email'),
    ('suppliers.field.address', 'View supplier address'),
    ('suppliers.field.gst', 'View supplier GST number'),
    ('suppliers.field.pan', 'View supplier PAN'),
    ('suppliers.field.bank', 'View supplier bank details'),
    ('suppliers.field.terms', 'View payment terms'),
    ('suppliers.field.status', 'View supplier status'),
    ('suppliers.field.rating', 'View supplier rating'),
    
    -- Action permissions
    ('suppliers.action.export', 'Export suppliers data'),
    ('suppliers.action.import', 'Import suppliers data'),
    ('suppliers.action.merge', 'Merge duplicate suppliers')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- PART 3: PURCHASE GRANULAR PERMISSIONS
-- ============================================================================

INSERT INTO public.permissions (key, description) VALUES
    -- CRUD
    ('purchases.read', 'Read purchase details'),
    ('purchases.list', 'List all purchases'),
    ('purchases.update', 'Update draft purchases'),
    ('purchases.delete', 'Delete draft purchases'),
    
    -- Workflow actions
    ('purchases.approve', 'Approve purchases'),
    ('purchases.reject', 'Reject purchases'),
    ('purchases.receive', 'Mark purchase as received'),
    
    -- Field permissions
    ('purchases.field.supplier', 'View purchase supplier'),
    ('purchases.field.birdtype', 'View bird type'),
    ('purchases.field.birdcount', 'View bird count'),
    ('purchases.field.weight', 'View total weight'),
    ('purchases.field.price', 'View price per kg'),
    ('purchases.field.total', 'View total amount'),
    ('purchases.field.vehicle', 'View vehicle number'),
    ('purchases.field.invoice', 'View invoice number'),
    ('purchases.field.notes', 'View purchase notes'),
    ('purchases.field.status', 'View purchase status'),
    
    -- Action permissions
    ('purchases.action.export', 'Export purchases data'),
    ('purchases.action.print', 'Print purchase orders'),
    ('purchases.action.copy', 'Copy purchase as new')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- PART 4: INVENTORY GRANULAR PERMISSIONS
-- ============================================================================

INSERT INTO public.permissions (key, description) VALUES
    -- CRUD
    ('inventory.read', 'Read inventory details'),
    ('inventory.list', 'List all inventory'),
    
    -- Ledger permissions
    ('inventory.ledger.read', 'Read ledger entries'),
    ('inventory.ledger.list', 'List ledger entries'),
    ('inventory.ledger.filter', 'Filter ledger by date/type'),
    
    -- Stock permissions
    ('inventory.stock.live', 'View live bird stock'),
    ('inventory.stock.processed', 'View processed stock'),
    ('inventory.stock.bystore', 'View stock by store'),
    ('inventory.stock.bybird', 'View stock by bird type'),
    
    -- Adjustment permissions
    ('inventory.adjust.positive', 'Make positive adjustments'),
    ('inventory.adjust.negative', 'Make negative adjustments'),
    ('inventory.adjust.transfer', 'Transfer between stores'),
    
    -- Field permissions
    ('inventory.field.birdtype', 'View bird type column'),
    ('inventory.field.inventorytype', 'View inventory type column'),
    ('inventory.field.quantity', 'View quantity column'),
    ('inventory.field.reason', 'View reason column'),
    ('inventory.field.reference', 'View reference column'),
    ('inventory.field.user', 'View user column'),
    ('inventory.field.timestamp', 'View timestamp column'),
    
    -- Action permissions
    ('inventory.action.export', 'Export inventory data'),
    ('inventory.action.reconcile', 'Run stock reconciliation'),
    ('inventory.action.audit', 'View audit trail')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- PART 5: PROCESSING GRANULAR PERMISSIONS
-- ============================================================================

INSERT INTO public.permissions (key, description) VALUES
    -- CRUD
    ('processing.read', 'Read processing details'),
    ('processing.list', 'List processing entries'),
    ('processing.update', 'Update processing entries'),
    ('processing.delete', 'Delete processing entries'),
    
    -- Workflow
    ('processing.calculate', 'Calculate yields'),
    ('processing.confirm', 'Confirm processing'),
    
    -- Field permissions
    ('processing.field.inputbird', 'View input bird type'),
    ('processing.field.outputtype', 'View output type'),
    ('processing.field.inputweight', 'View input weight'),
    ('processing.field.outputweight', 'View output weight'),
    ('processing.field.wastage', 'View wastage'),
    ('processing.field.yield', 'View yield percentage'),
    ('processing.field.processor', 'View processor name'),
    
    -- Action permissions
    ('processing.action.export', 'Export processing data'),
    ('processing.action.bulkprocess', 'Bulk process entries')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- PART 6: SKU GRANULAR PERMISSIONS
-- ============================================================================

INSERT INTO public.permissions (key, description) VALUES
    -- CRUD
    ('skus.read', 'Read SKU details'),
    ('skus.list', 'List all SKUs'),
    ('skus.create', 'Create new SKUs'),
    ('skus.update', 'Update SKU details'),
    ('skus.delete', 'Delete/deactivate SKUs'),
    
    -- Field permissions
    ('skus.field.name', 'View SKU name'),
    ('skus.field.code', 'View SKU code'),
    ('skus.field.birdtype', 'View bird type'),
    ('skus.field.inventorytype', 'View inventory type'),
    ('skus.field.unit', 'View unit'),
    ('skus.field.status', 'View SKU status'),
    
    -- Action permissions
    ('skus.action.export', 'Export SKUs data'),
    ('skus.action.import', 'Import SKUs data'),
    ('skus.action.clone', 'Clone SKU')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- PART 7: STORE PRICING GRANULAR PERMISSIONS
-- ============================================================================

INSERT INTO public.permissions (key, description) VALUES
    -- CRUD
    ('storeprices.read', 'Read store prices'),
    ('storeprices.list', 'List all store prices'),
    ('storeprices.create', 'Create new prices'),
    ('storeprices.update', 'Update prices'),
    ('storeprices.delete', 'Delete prices'),
    ('storeprices.bulk', 'Bulk update prices'),
    
    -- Field permissions
    ('storeprices.field.store', 'View store column'),
    ('storeprices.field.sku', 'View SKU column'),
    ('storeprices.field.price', 'View price column'),
    ('storeprices.field.effectivedate', 'View effective date'),
    ('storeprices.field.history', 'View price history'),
    
    -- Action permissions
    ('storeprices.action.export', 'Export pricing data'),
    ('storeprices.action.import', 'Import pricing data'),
    ('storeprices.action.copystore', 'Copy prices to another store'),
    ('storeprices.action.schedule', 'Schedule future price changes')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- PART 8: SALES GRANULAR PERMISSIONS
-- ============================================================================

INSERT INTO public.permissions (key, description) VALUES
    -- CRUD
    ('sales.read', 'Read sale details'),
    ('sales.list', 'List all sales'),
    ('sales.update', 'Update sale details'),
    ('sales.delete', 'Delete sales'),
    
    -- Type permissions
    ('sales.pos', 'Create POS sales'),
    ('sales.wholesale', 'Create wholesale sales'),
    ('sales.credit', 'Create credit sales'),
    ('sales.return', 'Process sales returns'),
    ('sales.refund', 'Process refunds'),
    
    -- Field permissions
    ('sales.field.receipt', 'View receipt number'),
    ('sales.field.customer', 'View customer details'),
    ('sales.field.items', 'View sale items'),
    ('sales.field.subtotal', 'View subtotal'),
    ('sales.field.discount', 'View discount'),
    ('sales.field.total', 'View total amount'),
    ('sales.field.payment', 'View payment method'),
    ('sales.field.cashier', 'View cashier'),
    ('sales.field.status', 'View sale status'),
    
    -- Action permissions
    ('sales.action.export', 'Export sales data'),
    ('sales.action.print', 'Print receipt'),
    ('sales.action.duplicate', 'Duplicate sale'),
    ('sales.action.email', 'Email receipt to customer'),
    ('sales.action.summary', 'View sales summary'),
    ('sales.action.reports', 'Generate sales reports')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- PART 9: SETTLEMENT GRANULAR PERMISSIONS
-- ============================================================================

INSERT INTO public.permissions (key, description) VALUES
    -- CRUD
    ('settlements.read', 'Read settlement details'),
    ('settlements.list', 'List all settlements'),
    ('settlements.update', 'Update draft settlements'),
    ('settlements.delete', 'Delete draft settlements'),
    
    -- Workflow
    ('settlements.draft', 'Create settlement drafts'),
    ('settlements.finalize', 'Finalize settlements'),
    ('settlements.reopen', 'Reopen locked settlements'),
    ('settlements.forcelock', 'Force lock settlements'),
    
    -- Field permissions
    ('settlements.field.date', 'View settlement date'),
    ('settlements.field.store', 'View store'),
    ('settlements.field.openingstock', 'View opening stock'),
    ('settlements.field.closingstock', 'View closing stock'),
    ('settlements.field.expectedstock', 'View expected stock'),
    ('settlements.field.declaredstock', 'View declared stock'),
    ('settlements.field.sales', 'View sales total'),
    ('settlements.field.cash', 'View cash declared'),
    ('settlements.field.upi', 'View UPI declared'),
    ('settlements.field.variance', 'View variance'),
    ('settlements.field.status', 'View settlement status'),
    ('settlements.field.submittedby', 'View submitted by'),
    ('settlements.field.approvedby', 'View approved by'),
    
    -- Action permissions
    ('settlements.action.export', 'Export settlements data'),
    ('settlements.action.print', 'Print settlement report'),
    ('settlements.action.compare', 'Compare with previous day'),
    ('settlements.action.audit', 'View settlement audit trail')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- PART 10: VARIANCE GRANULAR PERMISSIONS
-- ============================================================================

INSERT INTO public.permissions (key, description) VALUES
    -- CRUD
    ('variance.read', 'Read variance details'),
    ('variance.list', 'List all variances'),
    
    -- Workflow
    ('variance.investigate', 'Investigate variance'),
    ('variance.resolve', 'Resolve variance'),
    ('variance.escalate', 'Escalate variance'),
    ('variance.writeoff', 'Write off variance'),
    
    -- Field permissions
    ('variance.field.type', 'View variance type'),
    ('variance.field.birdtype', 'View bird type'),
    ('variance.field.inventorytype', 'View inventory type'),
    ('variance.field.expected', 'View expected weight'),
    ('variance.field.declared', 'View declared weight'),
    ('variance.field.difference', 'View difference'),
    ('variance.field.status', 'View variance status'),
    ('variance.field.reason', 'View reason'),
    ('variance.field.resolvedby', 'View resolved by'),
    
    -- Action permissions
    ('variance.action.export', 'Export variance data'),
    ('variance.action.report', 'Generate variance report'),
    ('variance.action.trend', 'View variance trends')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- PART 11: STAFF POINTS GRANULAR PERMISSIONS
-- ============================================================================

INSERT INTO public.permissions (key, description) VALUES
    -- CRUD
    ('staffpoints.read', 'Read staff points'),
    ('staffpoints.list', 'List all staff points'),
    ('staffpoints.create', 'Add points manually'),
    ('staffpoints.update', 'Update points entries'),
    ('staffpoints.delete', 'Delete points entries'),
    
    -- Specific actions
    ('staffpoints.award', 'Award bonus points'),
    ('staffpoints.deduct', 'Deduct penalty points'),
    ('staffpoints.transfer', 'Transfer points'),
    
    -- Field permissions
    ('staffpoints.field.user', 'View user column'),
    ('staffpoints.field.store', 'View store column'),
    ('staffpoints.field.points', 'View points column'),
    ('staffpoints.field.reason', 'View reason column'),
    ('staffpoints.field.reference', 'View reference column'),
    ('staffpoints.field.date', 'View date column'),
    ('staffpoints.field.balance', 'View balance column'),
    
    -- Action permissions
    ('staffpoints.action.export', 'Export points data'),
    ('staffpoints.action.history', 'View points history'),
    ('staffpoints.action.summary', 'View points summary'),
    ('staffpoints.action.leaderboard', 'View leaderboard')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- PART 12: STAFF GRADING GRANULAR PERMISSIONS
-- ============================================================================

INSERT INTO public.permissions (key, description) VALUES
    -- CRUD
    ('staffgrading.read', 'Read grading data'),
    ('staffgrading.list', 'List all grades'),
    ('staffgrading.create', 'Generate grade snapshots'),
    ('staffgrading.update', 'Update grades (before lock)'),
    ('staffgrading.delete', 'Delete grade records'),
    
    -- Workflow
    ('staffgrading.calculate', 'Calculate monthly grades'),
    ('staffgrading.preview', 'Preview grades before lock'),
    ('staffgrading.approve', 'Approve grade calculations'),
    ('staffgrading.payout', 'Process grade payouts'),
    
    -- Config permissions
    ('staffgrading.config.read', 'Read grading config'),
    ('staffgrading.config.thresholds', 'Edit grade thresholds'),
    ('staffgrading.config.bonus', 'Edit bonus rates'),
    ('staffgrading.config.penalty', 'Edit penalty rates'),
    ('staffgrading.config.caps', 'Edit monthly caps'),
    ('staffgrading.config.reasoncodes', 'Edit reason codes'),
    
    -- Field permissions
    ('staffgrading.field.user', 'View user column'),
    ('staffgrading.field.store', 'View store column'),
    ('staffgrading.field.period', 'View period column'),
    ('staffgrading.field.points', 'View points column'),
    ('staffgrading.field.weight', 'View weight handled column'),
    ('staffgrading.field.score', 'View normalized score column'),
    ('staffgrading.field.grade', 'View grade column'),
    ('staffgrading.field.bonus', 'View bonus column'),
    ('staffgrading.field.penalty', 'View penalty column'),
    ('staffgrading.field.net', 'View net incentive column'),
    ('staffgrading.field.locked', 'View locked status column'),
    
    -- Action permissions
    ('staffgrading.action.export', 'Export grading data'),
    ('staffgrading.action.compare', 'Compare months'),
    ('staffgrading.action.trends', 'View grade trends'),
    ('staffgrading.action.distribution', 'View grade distribution')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- PART 13: WASTAGE CONFIG GRANULAR PERMISSIONS
-- ============================================================================

INSERT INTO public.permissions (key, description) VALUES
    -- CRUD
    ('wastageconfig.read', 'Read wastage config'),
    ('wastageconfig.list', 'List all wastage configs'),
    ('wastageconfig.create', 'Create wastage config'),
    ('wastageconfig.update', 'Update wastage config'),
    ('wastageconfig.delete', 'Delete wastage config'),
    
    -- Field permissions
    ('wastageconfig.field.birdtype', 'View bird type column'),
    ('wastageconfig.field.targettype', 'View target type column'),
    ('wastageconfig.field.percentage', 'View percentage column'),
    ('wastageconfig.field.effectivedate', 'View effective date column'),
    ('wastageconfig.field.history', 'View config history'),
    
    -- Action permissions
    ('wastageconfig.action.export', 'Export wastage config'),
    ('wastageconfig.action.simulate', 'Simulate yield with config'),
    ('wastageconfig.action.audit', 'View config audit trail')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- PART 14: POULTRY DASHBOARD PERMISSIONS
-- ============================================================================

INSERT INTO public.permissions (key, description) VALUES
    -- Dashboard widgets
    ('poultry.dashboard.salestoday', 'View today sales widget'),
    ('poultry.dashboard.stocksummary', 'View stock summary widget'),
    ('poultry.dashboard.variance', 'View variance widget'),
    ('poultry.dashboard.topproducts', 'View top products widget'),
    ('poultry.dashboard.lowstock', 'View low stock alerts widget'),
    ('poultry.dashboard.pendingactions', 'View pending actions widget'),
    ('poultry.dashboard.recenttransactions', 'View recent transactions widget'),
    ('poultry.dashboard.staffperformance', 'View staff performance widget')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- PART 15: CREATE CASHIER ROLE
-- ============================================================================
INSERT INTO public.roles (name, description)
VALUES ('Cashier', 'POS cashier with limited access to sales and inventory view')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- PART 16: ASSIGN PERMISSIONS TO ADMIN ROLE (ALL PERMISSIONS)
-- ============================================================================
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin' AND (
    p.key LIKE 'poultry.%' OR
    p.key LIKE 'suppliers.%' OR
    p.key LIKE 'purchases.%' OR
    p.key LIKE 'inventory.%' OR
    p.key LIKE 'processing.%' OR
    p.key LIKE 'skus.%' OR
    p.key LIKE 'storeprices.%' OR
    p.key LIKE 'sales.%' OR
    p.key LIKE 'settlements.%' OR
    p.key LIKE 'variance.%' OR
    p.key LIKE 'staffpoints.%' OR
    p.key LIKE 'staffgrading.%' OR
    p.key LIKE 'wastageconfig.%' OR
    p.key LIKE 'poultryconfig.%' OR
    p.key LIKE 'gradingconfig.%'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- PART 17: ASSIGN PERMISSIONS TO STORE MANAGER ROLE
-- ============================================================================
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Store Manager' AND p.key IN (
    -- Sidebar access
    'poultry.sidebar', 'poultry.dashboard.view',
    'suppliers.sidebar', 'purchases.sidebar', 'inventory.sidebar',
    'inventory.stock.sidebar', 'processing.sidebar', 'skus.sidebar',
    'storeprices.sidebar', 'sales.sidebar', 'sales.pos.sidebar', 'sales.history.sidebar',
    'settlements.sidebar', 'variance.sidebar', 'staffpoints.sidebar',
    'staffleaderboard.sidebar', 'wastageconfig.sidebar',
    
    -- Supplier permissions
    'suppliers.read', 'suppliers.list',
    'suppliers.field.name', 'suppliers.field.phone', 'suppliers.field.status',
    
    -- Purchase permissions (view only)
    'purchases.read', 'purchases.list',
    'purchases.field.supplier', 'purchases.field.birdtype', 'purchases.field.weight',
    'purchases.field.status',
    
    -- Inventory permissions
    'inventory.read', 'inventory.list', 'inventory.ledger.read', 'inventory.ledger.list',
    'inventory.stock.live', 'inventory.stock.processed', 'inventory.stock.bystore',
    'inventory.field.birdtype', 'inventory.field.inventorytype', 'inventory.field.quantity',
    'inventory.action.audit',
    
    -- Processing permissions
    'processing.read', 'processing.list', 'processing.create', 'processing.calculate',
    'processing.field.inputbird', 'processing.field.outputtype', 'processing.field.inputweight',
    'processing.field.outputweight', 'processing.field.wastage', 'processing.field.yield',
    
    -- SKU permissions
    'skus.read', 'skus.list',
    'skus.field.name', 'skus.field.code', 'skus.field.birdtype', 'skus.field.inventorytype',
    
    -- Store prices
    'storeprices.read', 'storeprices.list', 'storeprices.create', 'storeprices.update',
    'storeprices.field.store', 'storeprices.field.sku', 'storeprices.field.price',
    
    -- Sales permissions
    'sales.read', 'sales.list', 'sales.create', 'sales.pos', 'sales.bulk', 'sales.wholesale',
    'sales.field.receipt', 'sales.field.items', 'sales.field.total', 'sales.field.payment',
    'sales.action.print', 'sales.action.summary',
    
    -- Settlement permissions
    'settlements.read', 'settlements.list', 'settlements.create', 'settlements.submit',
    'settlements.approve', 'settlements.draft',
    'settlements.field.date', 'settlements.field.store', 'settlements.field.sales',
    'settlements.field.cash', 'settlements.field.variance', 'settlements.field.status',
    
    -- Variance permissions
    'variance.read', 'variance.list', 'variance.approve', 'variance.deduct',
    'variance.field.type', 'variance.field.difference', 'variance.field.status',
    
    -- Staff points (view store)
    'staffpoints.read', 'staffpoints.list', 'staffpoints.viewall',
    'staffpoints.field.user', 'staffpoints.field.points', 'staffpoints.field.reason',
    'staffpoints.action.summary', 'staffpoints.action.leaderboard',
    
    -- Grading (view only)
    'staffgrading.read', 'staffgrading.list', 'staffgrading.preview',
    'staffgrading.field.user', 'staffgrading.field.grade', 'staffgrading.field.points',
    
    -- Wastage config (view only)
    'wastageconfig.read', 'wastageconfig.list',
    
    -- Dashboard
    'poultry.dashboard.salestoday', 'poultry.dashboard.stocksummary',
    'poultry.dashboard.variance', 'poultry.dashboard.pendingactions',
    'poultry.dashboard.staffperformance'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- PART 18: ASSIGN PERMISSIONS TO ACCOUNT ROLE
-- ============================================================================
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Account' AND p.key IN (
    -- Sidebar access
    'poultry.sidebar', 'poultry.dashboard.view',
    'suppliers.sidebar', 'purchases.sidebar', 'inventory.sidebar',
    'sales.sidebar', 'sales.history.sidebar', 'settlements.sidebar',
    
    -- Supplier permissions (full access)
    'suppliers.read', 'suppliers.list', 'suppliers.create', 'suppliers.edit',
    'suppliers.field.name', 'suppliers.field.phone', 'suppliers.field.email',
    'suppliers.field.gst', 'suppliers.field.pan', 'suppliers.field.bank',
    'suppliers.field.terms', 'suppliers.field.status',
    'suppliers.action.export',
    
    -- Purchase permissions (full access)
    'purchases.read', 'purchases.list', 'purchases.create', 'purchases.update',
    'purchases.commit', 'purchases.approve',
    'purchases.field.supplier', 'purchases.field.birdtype', 'purchases.field.weight',
    'purchases.field.price', 'purchases.field.total', 'purchases.field.invoice',
    'purchases.field.status',
    'purchases.action.export', 'purchases.action.print',
    
    -- Inventory (view only)
    'inventory.read', 'inventory.list', 'inventory.ledger.read',
    'inventory.field.birdtype', 'inventory.field.quantity',
    
    -- Sales (view only for reports)
    'sales.read', 'sales.list',
    'sales.field.receipt', 'sales.field.total', 'sales.field.payment',
    'sales.action.export', 'sales.action.reports',
    
    -- Settlements (view + submit)
    'settlements.read', 'settlements.list', 'settlements.submit',
    'settlements.field.date', 'settlements.field.sales', 'settlements.field.cash',
    'settlements.field.status',
    'settlements.action.export',
    
    -- Staff grading (payouts)
    'staffgrading.read', 'staffgrading.list', 'staffgrading.payout',
    'staffgrading.field.user', 'staffgrading.field.grade', 'staffgrading.field.bonus',
    'staffgrading.field.penalty', 'staffgrading.field.net',
    
    -- Dashboard
    'poultry.dashboard.salestoday', 'poultry.dashboard.stocksummary'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- PART 19: ASSIGN PERMISSIONS TO CASHIER ROLE
-- ============================================================================
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Cashier' AND p.key IN (
    -- Sidebar access
    'poultry.sidebar', 'sales.sidebar', 'sales.pos.sidebar',
    'inventory.sidebar', 'inventory.stock.sidebar',
    'staffpoints.sidebar',
    
    -- Inventory (view stock only)
    'inventory.read', 'inventory.stock.processed',
    'inventory.field.birdtype', 'inventory.field.inventorytype', 'inventory.field.quantity',
    
    -- SKU (view only for POS)
    'skus.read', 'skus.list',
    'skus.field.name', 'skus.field.code', 'skus.field.unit',
    
    -- Store prices (view for POS)
    'storeprices.read',
    'storeprices.field.price',
    
    -- Sales (POS only)
    'sales.create', 'sales.pos',
    'sales.field.receipt', 'sales.field.items', 'sales.field.total', 'sales.field.payment',
    'sales.action.print',
    
    -- Staff points (view own only)
    'staffpoints.view',
    'staffpoints.field.points', 'staffpoints.field.reason', 'staffpoints.field.balance'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
