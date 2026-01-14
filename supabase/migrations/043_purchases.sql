-- =============================================================================
-- PURCHASES TABLE WITH INVENTORY TRIGGER
-- =============================================================================
-- Migration: 043_purchases.sql
-- Description: Creates purchases table for live bird procurement with auto-ledger
-- Date: 2026-01-13
-- =============================================================================

-- ============================================================================
-- CREATE PURCHASES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id INTEGER NOT NULL REFERENCES public.shops(id),
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
    
    -- Bird details
    bird_type bird_type_enum NOT NULL,
    bird_count INTEGER NOT NULL CHECK (bird_count > 0),
    total_weight DECIMAL(10,3) NOT NULL CHECK (total_weight > 0),
    
    -- Pricing
    price_per_kg DECIMAL(12,2) NOT NULL CHECK (price_per_kg > 0),
    total_amount DECIMAL(12,2) GENERATED ALWAYS AS (total_weight * price_per_kg) STORED,
    
    -- Status workflow
    status purchase_status_enum DEFAULT 'DRAFT',
    
    -- Additional info
    invoice_number VARCHAR(100),
    invoice_date DATE,
    notes TEXT,
    
    -- Audit trail
    created_by UUID NOT NULL REFERENCES auth.users(id),
    committed_by UUID REFERENCES auth.users(id),
    committed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_purchases_store ON public.purchases(store_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON public.purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON public.purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_created ON public.purchases(created_at);
CREATE INDEX IF NOT EXISTS idx_purchases_store_date ON public.purchases(store_id, created_at);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Policy: Admin can see all purchases
CREATE POLICY purchases_admin_all ON public.purchases
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
        )
    );

-- Policy: Users can only see purchases for their assigned stores
CREATE POLICY purchases_store_select ON public.purchases
    FOR SELECT
    TO authenticated
    USING (
        store_id IN (
            SELECT us.shop_id FROM public.user_shops us WHERE us.user_id = auth.uid()
        )
    );

-- Policy: Users can create purchases for their assigned stores
CREATE POLICY purchases_store_insert ON public.purchases
    FOR INSERT
    TO authenticated
    WITH CHECK (
        store_id IN (
            SELECT us.shop_id FROM public.user_shops us WHERE us.user_id = auth.uid()
        )
    );

-- Policy: Users can update DRAFT purchases for their assigned stores
CREATE POLICY purchases_store_update ON public.purchases
    FOR UPDATE
    TO authenticated
    USING (
        status = 'DRAFT' AND
        store_id IN (
            SELECT us.shop_id FROM public.user_shops us WHERE us.user_id = auth.uid()
        )
    );

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================
CREATE TRIGGER update_purchases_updated_at
    BEFORE UPDATE ON public.purchases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PURCHASE COMMIT TRIGGER (Creates inventory ledger entry)
-- This will be created AFTER the inventory_ledger table exists (migration 044)
-- ============================================================================

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
