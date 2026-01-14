-- =============================================================================
-- INVENTORY LEDGER - APPEND-ONLY DOUBLE-ENTRY SYSTEM
-- =============================================================================
-- Migration: 044_inventory_ledger.sql
-- Description: Creates the core append-only inventory ledger table
-- Date: 2026-01-13
-- CRITICAL: This table is APPEND-ONLY. No updates or deletes allowed.
-- =============================================================================

-- ============================================================================
-- CREATE INVENTORY LEDGER TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.inventory_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id INTEGER NOT NULL REFERENCES public.shops(id),
    
    -- Inventory classification
    bird_type bird_type_enum NOT NULL,
    inventory_type inventory_type_enum NOT NULL,
    
    -- Quantity change (positive = credit, negative = debit)
    quantity_change DECIMAL(10,3) NOT NULL,
    
    -- Reason and reference tracking
    reason_code VARCHAR(50) NOT NULL REFERENCES public.inventory_reason_codes(code),
    ref_id UUID,  -- Reference to source document (purchase_id, sale_id, etc.)
    ref_type VARCHAR(50),  -- Type of reference (PURCHASE, SALE, PROCESSING, etc.)
    
    -- Audit trail
    user_id UUID NOT NULL REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- CRITICAL: REVOKE UPDATE AND DELETE PERMISSIONS
-- This ensures the ledger is truly append-only
-- ============================================================================
REVOKE UPDATE, DELETE ON public.inventory_ledger FROM PUBLIC;
REVOKE UPDATE, DELETE ON public.inventory_ledger FROM authenticated;
REVOKE UPDATE, DELETE ON public.inventory_ledger FROM anon;
REVOKE UPDATE, DELETE ON public.inventory_ledger FROM service_role;

-- Note: Even service_role cannot update/delete. Only postgres superuser can.

-- ============================================================================
-- INDEXES FOR AGGREGATION PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_ledger_store_type 
    ON public.inventory_ledger(store_id, bird_type, inventory_type);
    
CREATE INDEX IF NOT EXISTS idx_ledger_created 
    ON public.inventory_ledger(created_at);
    
CREATE INDEX IF NOT EXISTS idx_ledger_store_date 
    ON public.inventory_ledger(store_id, created_at);
    
CREATE INDEX IF NOT EXISTS idx_ledger_ref 
    ON public.inventory_ledger(ref_type, ref_id);
    
CREATE INDEX IF NOT EXISTS idx_ledger_reason 
    ON public.inventory_ledger(reason_code);

-- Composite index for stock calculation queries
CREATE INDEX IF NOT EXISTS idx_ledger_stock_calc 
    ON public.inventory_ledger(store_id, bird_type, inventory_type, quantity_change);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.inventory_ledger ENABLE ROW LEVEL SECURITY;

-- Policy: Admin can see all ledger entries
CREATE POLICY ledger_admin_select ON public.inventory_ledger
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
        )
    );

-- Policy: Users can see ledger entries for their assigned stores
CREATE POLICY ledger_store_select ON public.inventory_ledger
    FOR SELECT
    TO authenticated
    USING (
        store_id IN (
            SELECT us.shop_id FROM public.user_shops us WHERE us.user_id = auth.uid()
        )
    );

-- Policy: Admin can insert ledger entries (for adjustments)
CREATE POLICY ledger_admin_insert ON public.inventory_ledger
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
        )
    );

-- Policy: Service functions can insert (for automated triggers)
-- This is handled via SECURITY DEFINER functions below

-- ============================================================================
-- HELPER FUNCTION: Add Ledger Entry (SECURITY DEFINER)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.add_inventory_ledger_entry(
    p_store_id INTEGER,
    p_bird_type bird_type_enum,
    p_inventory_type inventory_type_enum,
    p_quantity_change DECIMAL(10,3),
    p_reason_code VARCHAR(50),
    p_ref_id UUID DEFAULT NULL,
    p_ref_type VARCHAR(50) DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_entry_id UUID;
    v_user UUID;
BEGIN
    -- Use provided user_id or current auth user
    v_user := COALESCE(p_user_id, auth.uid());
    
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'User ID is required for ledger entries';
    END IF;
    
    -- Validate reason code exists
    IF NOT EXISTS (SELECT 1 FROM public.inventory_reason_codes WHERE code = p_reason_code) THEN
        RAISE EXCEPTION 'Invalid reason code: %', p_reason_code;
    END IF;
    
    -- Insert the ledger entry
    INSERT INTO public.inventory_ledger (
        store_id, bird_type, inventory_type,
        quantity_change, reason_code,
        ref_id, ref_type, user_id, notes
    ) VALUES (
        p_store_id, p_bird_type, p_inventory_type,
        p_quantity_change, p_reason_code,
        p_ref_id, p_ref_type, v_user, p_notes
    )
    RETURNING id INTO v_entry_id;
    
    RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Get Current Stock for Store
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_current_stock(
    p_store_id INTEGER,
    p_bird_type bird_type_enum DEFAULT NULL,
    p_inventory_type inventory_type_enum DEFAULT NULL
)
RETURNS TABLE (
    store_id INTEGER,
    bird_type bird_type_enum,
    inventory_type inventory_type_enum,
    current_qty DECIMAL(10,3)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        il.store_id,
        il.bird_type,
        il.inventory_type,
        SUM(il.quantity_change)::DECIMAL(10,3) as current_qty
    FROM public.inventory_ledger il
    WHERE il.store_id = p_store_id
      AND (p_bird_type IS NULL OR il.bird_type = p_bird_type)
      AND (p_inventory_type IS NULL OR il.inventory_type = p_inventory_type)
    GROUP BY il.store_id, il.bird_type, il.inventory_type
    HAVING SUM(il.quantity_change) >= 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Validate Stock Available
-- ============================================================================
CREATE OR REPLACE FUNCTION public.validate_stock_available(
    p_store_id INTEGER,
    p_bird_type bird_type_enum,
    p_inventory_type inventory_type_enum,
    p_required_qty DECIMAL(10,3)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_available DECIMAL(10,3);
BEGIN
    SELECT COALESCE(SUM(quantity_change), 0)
    INTO v_available
    FROM public.inventory_ledger
    WHERE store_id = p_store_id
      AND bird_type = p_bird_type
      AND inventory_type = p_inventory_type;
    
    RETURN v_available >= p_required_qty;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
