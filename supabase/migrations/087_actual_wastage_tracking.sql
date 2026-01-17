-- =============================================================================
-- ACTUAL WASTAGE TRACKING
-- =============================================================================
-- Migration: 087_actual_wastage_tracking.sql
-- Description: Adds actual_output_weight to processing_entries to track variance
-- Date: 2026-01-16
-- =============================================================================

-- 1. Add actual_output_weight column
ALTER TABLE public.processing_entries 
ADD COLUMN IF NOT EXISTS actual_output_weight DECIMAL(10,3);

-- 2. Update the trigger to handle actual_output_weight
-- We want to maintain backward compatibility: if actual is not provided, 
-- we default it to the planned output_weight.
CREATE OR REPLACE FUNCTION public.enforce_processing_yield()
RETURNS TRIGGER AS $$
DECLARE
    v_yield_data RECORD;
BEGIN
    -- Call the helper function to calculate PLANNED yield
    SELECT * INTO v_yield_data FROM public.calculate_processing_output(
        p_input_weight := NEW.input_weight,
        p_bird_type := NEW.input_bird_type,
        p_target_type := NEW.output_inventory_type
    );

    -- Enforce the PLANNED values (these are the 'allowed' values)
    NEW.wastage_percentage := v_yield_data.wastage_percentage;
    NEW.wastage_weight := v_yield_data.wastage_weight;
    NEW.output_weight := v_yield_data.output_weight;

    -- Handle ACTUAL output weight
    -- If not provided, default to the planned output_weight
    IF NEW.actual_output_weight IS NULL THEN
        NEW.actual_output_weight := v_yield_data.output_weight;
    END IF;

    -- Audit: wastage ledger already uses NEW.wastage_weight (planned)
    -- If we want to track ACTUAL wastage in ledger too, we could update on_processing_create
    -- But for now, wastage_weight in DB remains the "allowed" one for policy compliance.

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update existing records (optional, but good for consistency)
UPDATE public.processing_entries 
SET actual_output_weight = output_weight 
WHERE actual_output_weight IS NULL;

-- 4. Update the ledger creation function to use actual weight for inventory credit
-- Currently on_processing_create uses NEW.output_weight.
-- We should update it to use NEW.actual_output_weight for real inventory tracking.

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
        p_quantity_change := -NEW.input_weight,
        p_reason_code := 'PROCESSING_DEBIT',
        p_ref_id := NEW.id,
        p_ref_type := 'PROCESSING',
        p_user_id := NEW.processed_by,
        p_notes := 'Processing input for ' || NEW.output_inventory_type::text
    );
    
    -- CREDIT: Add processed inventory (using ACTUAL weight for accurate stock)
    PERFORM public.add_inventory_ledger_entry(
        p_store_id := NEW.store_id,
        p_bird_type := NEW.input_bird_type,
        p_inventory_type := NEW.output_inventory_type,
        p_quantity_change := NEW.actual_output_weight,  -- Use ACTUAL WEIGHT
        p_reason_code := 'PROCESSING_CREDIT',
        p_ref_id := NEW.id,
        p_ref_type := 'PROCESSING',
        p_user_id := NEW.processed_by,
        p_notes := 'Processing output from LIVE (Actual Weight)'
    );
    
    -- DEBIT: Record wastage (Planned vs Actual can be seen in processing_entries)
    -- We'll record both the planned wastage as the primary wastage entry
    -- And if there's a negative variance (extra wastage), it's already reflected in lower credit.
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
            p_notes := 'Allowed Wastage: ' || NEW.wastage_weight::text || ' kg (' || NEW.wastage_percentage::text || '%). Actual output: ' || NEW.actual_output_weight::text || ' kg'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
