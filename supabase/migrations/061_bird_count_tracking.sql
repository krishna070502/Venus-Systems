-- =============================================================================
-- BIRD COUNT TRACKING IN INVENTORY
-- =============================================================================
-- Migration: 061_bird_count_tracking.sql
-- Description: Adds bird count tracking to inventory ledger and processing
-- Date: 2026-01-13
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ADD BIRD COUNT TO INVENTORY LEDGER
-- -----------------------------------------------------------------------------
ALTER TABLE public.inventory_ledger 
ADD COLUMN IF NOT EXISTS bird_count_change INTEGER DEFAULT 0;

-- Index for bird count aggregation
CREATE INDEX IF NOT EXISTS idx_ledger_bird_count 
    ON public.inventory_ledger(store_id, bird_type, inventory_type) 
    WHERE bird_count_change != 0;

-- -----------------------------------------------------------------------------
-- 2. ADD BIRD COUNT TO PROCESSING ENTRIES
-- -----------------------------------------------------------------------------
ALTER TABLE public.processing_entries 
ADD COLUMN IF NOT EXISTS input_bird_count INTEGER CHECK (input_bird_count > 0 OR input_bird_count IS NULL);

-- -----------------------------------------------------------------------------
-- 3. UPDATE ADD_INVENTORY_LEDGER_ENTRY FUNCTION
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_inventory_ledger_entry(
    p_store_id INTEGER,
    p_bird_type bird_type_enum,
    p_inventory_type inventory_type_enum,
    p_quantity_change DECIMAL(10,3),
    p_reason_code VARCHAR(50),
    p_ref_id UUID DEFAULT NULL,
    p_ref_type VARCHAR(50) DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_bird_count_change INTEGER DEFAULT 0
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
    
    -- Insert the ledger entry with bird count
    INSERT INTO public.inventory_ledger (
        store_id, bird_type, inventory_type,
        quantity_change, bird_count_change, reason_code,
        ref_id, ref_type, user_id, notes
    ) VALUES (
        p_store_id, p_bird_type, p_inventory_type,
        p_quantity_change, COALESCE(p_bird_count_change, 0), p_reason_code,
        p_ref_id, p_ref_type, v_user, p_notes
    )
    RETURNING id INTO v_entry_id;
    
    RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 4. UPDATE GET_CURRENT_STOCK FUNCTION TO INCLUDE BIRD COUNT
-- -----------------------------------------------------------------------------
-- Must drop first because return type is changing
DROP FUNCTION IF EXISTS public.get_current_stock(INTEGER, bird_type_enum, inventory_type_enum);

CREATE OR REPLACE FUNCTION public.get_current_stock(
    p_store_id INTEGER,
    p_bird_type bird_type_enum DEFAULT NULL,
    p_inventory_type inventory_type_enum DEFAULT NULL
)
RETURNS TABLE (
    store_id INTEGER,
    bird_type bird_type_enum,
    inventory_type inventory_type_enum,
    current_qty DECIMAL(10,3),
    current_bird_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        il.store_id,
        il.bird_type,
        il.inventory_type,
        COALESCE(SUM(il.quantity_change), 0)::DECIMAL(10,3) AS current_qty,
        COALESCE(SUM(il.bird_count_change), 0)::INTEGER AS current_bird_count
    FROM public.inventory_ledger il
    WHERE il.store_id = p_store_id
      AND (p_bird_type IS NULL OR il.bird_type = p_bird_type)
      AND (p_inventory_type IS NULL OR il.inventory_type = p_inventory_type)
    GROUP BY il.store_id, il.bird_type, il.inventory_type
    HAVING COALESCE(SUM(il.quantity_change), 0) != 0 
        OR COALESCE(SUM(il.bird_count_change), 0) != 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 5. UPDATE PURCHASE COMMIT TRIGGER TO INCLUDE BIRD COUNT
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.on_purchase_commit()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process when status changes to COMMITTED
    IF NEW.status = 'COMMITTED' AND 
       (OLD.status IS NULL OR OLD.status != 'COMMITTED') THEN
        
        -- Validate store is active
        IF NOT public.check_store_active(NEW.store_id) THEN
            RAISE EXCEPTION 'Store % is in maintenance mode. Cannot commit purchase.', NEW.store_id;
        END IF;
        
        -- Add to inventory ledger with bird count
        PERFORM public.add_inventory_ledger_entry(
            p_store_id := NEW.store_id,
            p_bird_type := NEW.bird_type,
            p_inventory_type := 'LIVE'::inventory_type_enum,
            p_quantity_change := NEW.total_weight,
            p_reason_code := 'PURCHASE_RECEIVED',
            p_ref_id := NEW.id,
            p_ref_type := 'PURCHASE',
            p_user_id := NEW.committed_by,
            p_notes := 'Purchase from supplier: ' || NEW.bird_count || ' birds, ' || NEW.total_weight || ' kg',
            p_bird_count_change := NEW.bird_count
        );

        -- Add to financial ledger (Credit Supplier)
        -- Outstanding = SUM(credit) - SUM(debit)
        INSERT INTO public.financial_ledger (
            store_id,
            entity_type,
            entity_id,
            transaction_type,
            credit,
            ref_table,
            ref_id,
            notes,
            created_by
        ) VALUES (
            NEW.store_id,
            'SUPPLIER',
            NEW.supplier_id,
            'PURCHASE',
            NEW.total_amount,
            'purchases',
            NEW.id,
            'Purchase commit: ' || NEW.bird_count || ' birds, ' || NEW.total_weight || ' kg',
            NEW.committed_by
        );
        
        -- Update commit timestamp
        NEW.committed_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 6. UPDATE PROCESSING TRIGGER TO INCLUDE BIRD COUNT
-- -----------------------------------------------------------------------------
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
    
    -- DEBIT: Remove LIVE inventory (weight and bird count)
    PERFORM public.add_inventory_ledger_entry(
        p_store_id := NEW.store_id,
        p_bird_type := NEW.input_bird_type,
        p_inventory_type := 'LIVE'::inventory_type_enum,
        p_quantity_change := -NEW.input_weight,  -- Negative = debit
        p_reason_code := 'PROCESSING_DEBIT',
        p_ref_id := NEW.id,
        p_ref_type := 'PROCESSING',
        p_user_id := NEW.processed_by,
        p_notes := 'Processing input for ' || NEW.output_inventory_type::text,
        p_bird_count_change := -COALESCE(NEW.input_bird_count, 0)  -- Negative = reduction
    );
    
    -- CREDIT: Add processed inventory (SKIN or SKINLESS) - no bird count for processed
    PERFORM public.add_inventory_ledger_entry(
        p_store_id := NEW.store_id,
        p_bird_type := NEW.input_bird_type,
        p_inventory_type := NEW.output_inventory_type,
        p_quantity_change := NEW.output_weight,  -- Positive = credit
        p_reason_code := 'PROCESSING_CREDIT',
        p_ref_id := NEW.id,
        p_ref_type := 'PROCESSING',
        p_user_id := NEW.processed_by,
        p_notes := 'Processing output from LIVE',
        p_bird_count_change := 0  -- Processed inventory doesn't track bird count
    );
    
    -- Log wastage for audit
    IF NEW.wastage_weight > 0 THEN
        PERFORM public.add_inventory_ledger_entry(
            p_store_id := NEW.store_id,
            p_bird_type := NEW.input_bird_type,
            p_inventory_type := NEW.output_inventory_type,
            p_quantity_change := 0,
            p_reason_code := 'WASTAGE',
            p_ref_id := NEW.id,
            p_ref_type := 'PROCESSING',
            p_user_id := NEW.processed_by,
            p_notes := 'Wastage: ' || NEW.wastage_weight::text || ' kg (' || NEW.wastage_percentage::text || '%)',
            p_bird_count_change := 0
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 7. CREATE UNIFIED VIEW FOR STOCK LEDGER
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.inventory_ledger_view AS
SELECT 
    il.*,
    s.name as sku_name,
    s.id as sku_id,
    -- Calculate running balance per store, bird type, and inventory type
    SUM(il.quantity_change) OVER (
        PARTITION BY il.store_id, il.bird_type, il.inventory_type 
        ORDER BY il.created_at ASC, il.id ASC
    )::DECIMAL(10,3) as new_quantity
FROM public.inventory_ledger il
LEFT JOIN (
    SELECT DISTINCT ON (bird_type, inventory_type) 
        id, name, bird_type, inventory_type 
    FROM public.skus 
    ORDER BY bird_type, inventory_type, created_at ASC
) s ON il.bird_type = s.bird_type AND il.inventory_type = s.inventory_type;

-- Grant access to the view
GRANT SELECT ON public.inventory_ledger_view TO authenticated;
GRANT SELECT ON public.inventory_ledger_view TO service_role;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
