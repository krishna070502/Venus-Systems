-- =============================================================================
-- AUTOMATIC YIELD ENFORCEMENT
-- =============================================================================
-- Migration: 062_processing_auto_calculation.sql
-- Description: Adds a BEFORE INSERT trigger to automatically calculate processing 
--              yield fields, making them "read-only" from the API.
-- Date: 2026-01-13
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ALTER TABLE TO ALLOW NULLS (Trigger will fill them)
-- -----------------------------------------------------------------------------
ALTER TABLE public.processing_entries 
ALTER COLUMN wastage_percentage DROP NOT NULL,
ALTER COLUMN wastage_weight DROP NOT NULL,
ALTER COLUMN output_weight DROP NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. CREATE AUTO-CALCULATION TRIGGER FUNCTION
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_processing_yield()
RETURNS TRIGGER AS $$
DECLARE
    v_yield_data RECORD;
BEGIN
    -- Call the helper function to calculate yield
    -- This ensures the same logic is used as the frontend's preview
    SELECT * INTO v_yield_data FROM public.calculate_processing_output(
        p_input_weight := NEW.input_weight,
        p_bird_type := NEW.input_bird_type,
        p_target_type := NEW.output_inventory_type
    );

    -- Enforce the calculated values
    -- Even if provided by the client, they are overridden here
    NEW.wastage_percentage := v_yield_data.wastage_percentage;
    NEW.wastage_weight := v_yield_data.wastage_weight;
    NEW.output_weight := v_yield_data.output_weight;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 3. CREATE TRIGGER
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_enforce_yield ON public.processing_entries;
CREATE TRIGGER trigger_enforce_yield
    BEFORE INSERT ON public.processing_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_processing_yield();

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
