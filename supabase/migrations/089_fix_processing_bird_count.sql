-- =============================================================================
-- FIX PROCESSING BIRD COUNT DEDUCTION
-- =============================================================================
-- Migration: 089_fix_processing_bird_count.sql
-- Description: Restores bird count tracking in the processing trigger.
--              A previous migration (087) accidentally overwrote this function
--              and omitted the bird_count_change parameter.
-- Date: 2026-01-23
-- =============================================================================

CREATE OR REPLACE FUNCTION public.on_processing_create()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Validate store is active
    IF NOT public.check_store_active(NEW.store_id) THEN
        RAISE EXCEPTION 'Store % is in maintenance mode. Cannot process.', NEW.store_id;
    END IF;
    
    -- 2. Validate sufficient LIVE stock
    IF NOT public.validate_stock_available(
        NEW.store_id, 
        NEW.input_bird_type, 
        'LIVE'::inventory_type_enum, 
        NEW.input_weight
    ) THEN
        RAISE EXCEPTION 'Insufficient LIVE stock for processing. Required: %, Available: less', NEW.input_weight;
    END IF;
    
    -- 3. DEBIT: Remove LIVE inventory (weight AND bird count)
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
        p_bird_count_change := -COALESCE(NEW.input_bird_count, 0)  -- Restore bird count reduction
    );
    
    -- 4. CREDIT: Add processed inventory (use ACTUAL weight from migration 087)
    PERFORM public.add_inventory_ledger_entry(
        p_store_id := NEW.store_id,
        p_bird_type := NEW.input_bird_type,
        p_inventory_type := NEW.output_inventory_type,
        p_quantity_change := NEW.actual_output_weight,  -- Positive = credit
        p_reason_code := 'PROCESSING_CREDIT',
        p_ref_id := NEW.id,
        p_ref_type := 'PROCESSING',
        p_user_id := NEW.processed_by,
        p_notes := 'Processing output from LIVE (Actual Weight)',
        p_bird_count_change := 0  -- Processed inventory doesn't track bird count
    );
    
    -- 5. Log wastage for audit
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
            p_notes := 'Allowed Wastage: ' || NEW.wastage_weight::text || ' kg (' || NEW.wastage_percentage::text || '%). Actual output: ' || NEW.actual_output_weight::text || ' kg',
            p_bird_count_change := 0
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
