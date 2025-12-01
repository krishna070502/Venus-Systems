-- =============================================================================
-- BUSINESS MANAGEMENT MODULE - TABLES, RLS & PERMISSIONS
-- =============================================================================
-- Migration: 023_business_management_tables_and_rls.sql
-- Description: Creates shops, manager_details, user_shops, inventory_items, 
--              and daily_shop_prices tables with Row Level Security for 
--              multi-tenant shop isolation.
-- Date: 2024-11-30
-- =============================================================================

-- ============================================================================
-- PART 1: NEW PERMISSIONS FOR MANAGER ONBOARDING
-- ============================================================================

-- Add managers.onboard permission for Admin to onboard managers
INSERT INTO public.permissions (key, description) 
VALUES 
  ('managers.onboard', 'Onboard new managers to shops (Admin Only)')
ON CONFLICT (key) DO NOTHING;

-- Assign managers.onboard only to Admin role (not Manager)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin' AND p.key = 'managers.onboard'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- PART 2: CREATE SHOPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.shops (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for active shops
CREATE INDEX IF NOT EXISTS idx_shops_is_active ON public.shops(is_active);

-- ============================================================================
-- PART 3: CREATE MANAGER_DETAILS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.manager_details (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    qualifications TEXT,
    contact_number VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 4: CREATE USER_SHOPS TABLE (Manager-Shop Assignment)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_shops (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_id INTEGER NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, shop_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_shops_user_id ON public.user_shops(user_id);
CREATE INDEX IF NOT EXISTS idx_user_shops_shop_id ON public.user_shops(shop_id);

-- ============================================================================
-- PART 5: CREATE INVENTORY_ITEMS TABLE (For Price Configuration)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.inventory_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE,
    category VARCHAR(100),
    base_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    unit VARCHAR(50) DEFAULT 'piece',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON public.inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_is_active ON public.inventory_items(is_active);

-- ============================================================================
-- PART 6: CREATE DAILY_SHOP_PRICES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.daily_shop_prices (
    id SERIAL PRIMARY KEY,
    shop_id INTEGER NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    valid_date DATE NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Unique constraint: One price per item per shop per day
    CONSTRAINT unique_shop_item_date UNIQUE (shop_id, item_id, valid_date)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_daily_shop_prices_shop_id ON public.daily_shop_prices(shop_id);
CREATE INDEX IF NOT EXISTS idx_daily_shop_prices_item_id ON public.daily_shop_prices(item_id);
CREATE INDEX IF NOT EXISTS idx_daily_shop_prices_valid_date ON public.daily_shop_prices(valid_date);
CREATE INDEX IF NOT EXISTS idx_daily_shop_prices_shop_date ON public.daily_shop_prices(shop_id, valid_date);

-- ============================================================================
-- PART 7: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on user_shops
ALTER TABLE public.user_shops ENABLE ROW LEVEL SECURITY;

-- Enable RLS on daily_shop_prices
ALTER TABLE public.daily_shop_prices ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can see all user_shops records
CREATE POLICY admin_all_user_shops ON public.user_shops
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
        )
    );

-- Policy: Users can only see their own shop assignments
CREATE POLICY user_own_shops ON public.user_shops
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Policy: Admins can see all daily_shop_prices
CREATE POLICY admin_all_daily_prices ON public.daily_shop_prices
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
        )
    );

-- Policy: Managers can only see prices for their assigned shops
CREATE POLICY manager_shop_prices ON public.daily_shop_prices
    FOR SELECT
    TO authenticated
    USING (
        shop_id IN (
            SELECT us.shop_id 
            FROM public.user_shops us 
            WHERE us.user_id = auth.uid()
        )
    );

-- ============================================================================
-- PART 8: SEED DATA - Sample Shops
-- ============================================================================

INSERT INTO public.shops (name, location, is_active) VALUES
    ('Venus Chicken - Downtown', '123 Main Street, Downtown City', true),
    ('Venus Chicken - Uptown', '456 Oak Avenue, Uptown District', true),
    ('Venus Chicken - Mall Branch', 'City Mall, Ground Floor, Shop 12', true),
    ('Venus Chicken - Airport', 'International Airport, Terminal 2', true),
    ('Venus Chicken - University', 'University Campus, Food Court', true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 9: SEED DATA - Sample Inventory Items
-- ============================================================================

INSERT INTO public.inventory_items (name, sku, category, base_price, unit) VALUES
    ('Whole Chicken', 'WC-001', 'Poultry', 12.99, 'piece'),
    ('Chicken Breast', 'CB-001', 'Poultry', 8.99, 'kg'),
    ('Chicken Thighs', 'CT-001', 'Poultry', 7.49, 'kg'),
    ('Chicken Wings', 'CW-001', 'Poultry', 6.99, 'kg'),
    ('Chicken Drumsticks', 'CD-001', 'Poultry', 5.99, 'kg'),
    ('Minced Chicken', 'MC-001', 'Poultry', 9.49, 'kg'),
    ('Chicken Sausages', 'CS-001', 'Processed', 4.99, 'pack'),
    ('Chicken Nuggets', 'CN-001', 'Processed', 5.49, 'pack'),
    ('Marinated Chicken', 'MAC-001', 'Marinated', 10.99, 'kg'),
    ('BBQ Chicken', 'BBC-001', 'Ready-to-Cook', 11.99, 'kg'),
    ('Tandoori Chicken', 'TC-001', 'Marinated', 12.49, 'kg'),
    ('Chicken Liver', 'CL-001', 'Offal', 3.99, 'kg'),
    ('Chicken Gizzard', 'CG-001', 'Offal', 4.49, 'kg'),
    ('Chicken Stock', 'CST-001', 'Broth', 2.99, 'litre'),
    ('Chicken Patties', 'CP-001', 'Processed', 6.99, 'pack')
ON CONFLICT (sku) DO NOTHING;

-- ============================================================================
-- PART 10: CREATE STORE MANAGER ROLE (If not exists)
-- ============================================================================

-- Insert Store Manager role if it doesn't exist
INSERT INTO public.roles (name, description)
VALUES ('Store Manager', 'Manager assigned to specific store locations with limited access')
ON CONFLICT (name) DO NOTHING;

-- Assign basic permissions to Store Manager role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Store Manager' AND p.key IN (
    'shopmanagement.view',
    'shops.view', 'shops.read',
    'managers.view', 'managers.read',
    'priceconfig.view', 'priceconfig.read'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- PART 11: UPDATE TRIGGERS FOR updated_at
-- ============================================================================

-- Create or replace function for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for shops
DROP TRIGGER IF EXISTS update_shops_updated_at ON public.shops;
CREATE TRIGGER update_shops_updated_at
    BEFORE UPDATE ON public.shops
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for manager_details
DROP TRIGGER IF EXISTS update_manager_details_updated_at ON public.manager_details;
CREATE TRIGGER update_manager_details_updated_at
    BEFORE UPDATE ON public.manager_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for inventory_items
DROP TRIGGER IF EXISTS update_inventory_items_updated_at ON public.inventory_items;
CREATE TRIGGER update_inventory_items_updated_at
    BEFORE UPDATE ON public.inventory_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for daily_shop_prices
DROP TRIGGER IF EXISTS update_daily_shop_prices_updated_at ON public.daily_shop_prices;
CREATE TRIGGER update_daily_shop_prices_updated_at
    BEFORE UPDATE ON public.daily_shop_prices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
