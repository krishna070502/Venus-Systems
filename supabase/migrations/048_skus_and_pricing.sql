-- =============================================================================
-- SKUs AND STORE PRICING
-- =============================================================================
-- Migration: 048_skus_and_pricing.sql
-- Description: Creates SKUs table (inventory mapping) and store-specific pricing
-- Date: 2026-01-13
-- =============================================================================

-- ============================================================================
-- CREATE SKUs TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.skus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- SKU details
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    
    -- Inventory mapping
    bird_type bird_type_enum NOT NULL,
    inventory_type inventory_type_enum NOT NULL,
    
    -- Unit of measurement
    unit VARCHAR(20) DEFAULT 'kg',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_skus_code ON public.skus(code);
CREATE INDEX IF NOT EXISTS idx_skus_active ON public.skus(is_active);
CREATE INDEX IF NOT EXISTS idx_skus_inventory ON public.skus(bird_type, inventory_type);

-- ============================================================================
-- STORE PRICES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.store_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id INTEGER NOT NULL REFERENCES public.shops(id),
    sku_id UUID NOT NULL REFERENCES public.skus(id),
    
    -- Price (DECIMAL for precision)
    price DECIMAL(12,2) NOT NULL CHECK (price > 0),
    
    -- Effective date for price versioning
    effective_date DATE NOT NULL,
    
    -- Audit
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: one price per SKU per store per date
    CONSTRAINT unique_store_sku_date UNIQUE (store_id, sku_id, effective_date)
);

-- ============================================================================
-- INDEXES FOR PRICE LOOKUP
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_store_prices_store ON public.store_prices(store_id);
CREATE INDEX IF NOT EXISTS idx_store_prices_sku ON public.store_prices(sku_id);
CREATE INDEX IF NOT EXISTS idx_store_prices_date ON public.store_prices(effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_store_prices_lookup 
    ON public.store_prices(store_id, sku_id, effective_date DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_prices ENABLE ROW LEVEL SECURITY;

-- SKUs: All authenticated users can view
CREATE POLICY skus_select ON public.skus
    FOR SELECT
    TO authenticated
    USING (true);

-- SKUs: Only Admin can manage
CREATE POLICY skus_admin_all ON public.skus
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
        )
    );

-- Store Prices: Users can view prices for their stores
CREATE POLICY store_prices_select ON public.store_prices
    FOR SELECT
    TO authenticated
    USING (
        store_id IN (
            SELECT us.shop_id FROM public.user_shops us WHERE us.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
        )
    );

-- Store Prices: Admin can manage all
CREATE POLICY store_prices_admin_all ON public.store_prices
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
        )
    );

-- Store Prices: Store managers can set prices for their stores
CREATE POLICY store_prices_manager_insert ON public.store_prices
    FOR INSERT
    TO authenticated
    WITH CHECK (
        store_id IN (
            SELECT us.shop_id FROM public.user_shops us WHERE us.user_id = auth.uid()
        )
    );

-- ============================================================================
-- HELPER FUNCTION: Get Current Price for SKU at Store
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_current_price(
    p_store_id INTEGER,
    p_sku_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL(12,2) AS $$
DECLARE
    v_price DECIMAL(12,2);
BEGIN
    SELECT price INTO v_price
    FROM public.store_prices
    WHERE store_id = p_store_id
      AND sku_id = p_sku_id
      AND effective_date <= p_date
    ORDER BY effective_date DESC
    LIMIT 1;
    
    RETURN v_price;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================
CREATE TRIGGER update_skus_updated_at
    BEFORE UPDATE ON public.skus
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DEFAULT SKUs
-- ============================================================================
INSERT INTO public.skus (name, code, bird_type, inventory_type, unit, description) VALUES
    -- Broiler SKUs
    ('Broiler Chicken - Live', 'BRO-LIVE', 'BROILER', 'LIVE', 'kg', 'Live broiler chicken'),
    ('Broiler Chicken - With Skin', 'BRO-SKIN', 'BROILER', 'SKIN', 'kg', 'Dressed broiler with skin'),
    ('Broiler Chicken - Skinless', 'BRO-SKINLESS', 'BROILER', 'SKINLESS', 'kg', 'Skinless broiler meat'),
    
    -- Parent Cull SKUs
    ('Country Chicken - Live', 'PC-LIVE', 'PARENT_CULL', 'LIVE', 'kg', 'Live parent cull / country chicken'),
    ('Country Chicken - With Skin', 'PC-SKIN', 'PARENT_CULL', 'SKIN', 'kg', 'Dressed country chicken with skin'),
    ('Country Chicken - Skinless', 'PC-SKINLESS', 'PARENT_CULL', 'SKINLESS', 'kg', 'Skinless country chicken meat')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
