-- =============================================================================
-- PROCESSING ENTRIES TABLE
-- =============================================================================
-- Migration: 047_processing_entries.sql
-- Description: Creates processing entries table for live bird → processed meat
-- Date: 2026-01-13
-- =============================================================================

-- ============================================================================
-- CREATE PROCESSING ENTRIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.processing_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id INTEGER NOT NULL REFERENCES public.shops(id),
    
    -- Processing details
    processing_date DATE NOT NULL DEFAULT CURRENT_DATE,
    input_bird_type bird_type_enum NOT NULL,
    output_inventory_type inventory_type_enum NOT NULL CHECK (output_inventory_type != 'LIVE'),
    
    -- Weight tracking (DECIMAL for precision)
    input_weight DECIMAL(10,3) NOT NULL CHECK (input_weight > 0),
    wastage_percentage DECIMAL(5,2) NOT NULL,  -- Store the % used at processing time
    wastage_weight DECIMAL(10,3) NOT NULL CHECK (wastage_weight >= 0),
    output_weight DECIMAL(10,3) NOT NULL CHECK (output_weight > 0),
    
    -- Idempotency key to prevent duplicate submissions
    idempotency_key UUID UNIQUE,
    
    -- Audit trail
    processed_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Validation: output + wastage must equal input
    CONSTRAINT valid_processing_output CHECK (
        ABS(output_weight - (input_weight - wastage_weight)) < 0.001
    )
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_processing_store 
    ON public.processing_entries(store_id);
    
CREATE INDEX IF NOT EXISTS idx_processing_date 
    ON public.processing_entries(processing_date);
    
CREATE INDEX IF NOT EXISTS idx_processing_store_date 
    ON public.processing_entries(store_id, processing_date);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.processing_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Admin can see all processing entries
CREATE POLICY processing_admin_all ON public.processing_entries
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
        )
    );

-- Policy: Users can see processing entries for their assigned stores
CREATE POLICY processing_store_select ON public.processing_entries
    FOR SELECT
    TO authenticated
    USING (
        store_id IN (
            SELECT us.shop_id FROM public.user_shops us WHERE us.user_id = auth.uid()
        )
    );

-- Policy: Users can create processing entries for their assigned stores
CREATE POLICY processing_store_insert ON public.processing_entries
    FOR INSERT
    TO authenticated
    WITH CHECK (
        store_id IN (
            SELECT us.shop_id FROM public.user_shops us WHERE us.user_id = auth.uid()
        )
    );

-- ============================================================================
-- PROCESSING TRIGGER - Creates Ledger Entries
-- ============================================================================
CREATE OR REPLACE FUNCTION public.on_processing_create()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate store is active
    IF NOT public.check_store_active(NEW.store_id) THEN
        RAISE EXCEPTION 'Store % is in maintenance mode. Cannot process.', NEW.store_id;
    END IF;
    
    -- Validate sufficient LIVE stock
    IF NOT public.validate_stock_available(
        NEW.store_id, 
        NEW.input_bird_type, 
        'LIVE'::inventory_type_enum, 
        NEW.input_weight
    ) THEN
        RAISE EXCEPTION 'Insufficient LIVE stock for processing. Required: %, Available: less', NEW.input_weight;
    END IF;
    
    -- DEBIT: Remove LIVE inventory
    PERFORM public.add_inventory_ledger_entry(
        p_store_id := NEW.store_id,
        p_bird_type := NEW.input_bird_type,
        p_inventory_type := 'LIVE'::inventory_type_enum,
        p_quantity_change := -NEW.input_weight,  -- Negative = debit
        p_reason_code := 'PROCESSING_DEBIT',
        p_ref_id := NEW.id,
        p_ref_type := 'PROCESSING',
        p_user_id := NEW.processed_by,
        p_notes := 'Processing input for ' || NEW.output_inventory_type::text
    );
    
    -- CREDIT: Add processed inventory (SKIN or SKINLESS)
    PERFORM public.add_inventory_ledger_entry(
        p_store_id := NEW.store_id,
        p_bird_type := NEW.input_bird_type,
        p_inventory_type := NEW.output_inventory_type,
        p_quantity_change := NEW.output_weight,  -- Positive = credit
        p_reason_code := 'PROCESSING_CREDIT',
        p_ref_id := NEW.id,
        p_ref_type := 'PROCESSING',
        p_user_id := NEW.processed_by,
        p_notes := 'Processing output from LIVE'
    );
    
    -- DEBIT: Record wastage (optional tracking, not inventory)
    -- Wastage is already accounted for in the input-output difference
    -- We log it for audit purposes
    IF NEW.wastage_weight > 0 THEN
        PERFORM public.add_inventory_ledger_entry(
            p_store_id := NEW.store_id,
            p_bird_type := NEW.input_bird_type,
            p_inventory_type := NEW.output_inventory_type,
            p_quantity_change := 0,  -- Zero change, just for tracking
            p_reason_code := 'WASTAGE',
            p_ref_id := NEW.id,
            p_ref_type := 'PROCESSING',
            p_user_id := NEW.processed_by,
            p_notes := 'Wastage: ' || NEW.wastage_weight::text || ' kg (' || NEW.wastage_percentage::text || '%)'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_processing_ledger ON public.processing_entries;
CREATE TRIGGER trigger_processing_ledger
    AFTER INSERT ON public.processing_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.on_processing_create();

-- ============================================================================
-- HELPER FUNCTION: Calculate Processing Output
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_processing_output(
    p_input_weight DECIMAL(10,3),
    p_bird_type bird_type_enum,
    p_target_type inventory_type_enum
)
RETURNS TABLE (
    wastage_percentage DECIMAL(5,2),
    wastage_weight DECIMAL(10,3),
    output_weight DECIMAL(10,3)
) AS $$
DECLARE
    v_wastage_pct DECIMAL(5,2);
    v_wastage DECIMAL(10,3);
    v_output DECIMAL(10,3);
BEGIN
    -- Get configured wastage percentage
    v_wastage_pct := public.get_wastage_percentage(p_bird_type, p_target_type);
    
    -- Calculate weights
    v_wastage := ROUND(p_input_weight * (v_wastage_pct / 100), 3);
    v_output := p_input_weight - v_wastage;
    
    RETURN QUERY SELECT v_wastage_pct, v_wastage, v_output;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
