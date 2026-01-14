-- =============================================================================
-- FIX AMBIGUOUS LEDGER FUNCTION
-- =============================================================================
-- Migration: 063_fix_ambiguous_ledger_function.sql
-- Description: Removes the old 9-parameter version of add_inventory_ledger_entry
--              to resolve ambiguity with the new 10-parameter version.
-- Date: 2026-01-13
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. DROP THE OLD 9-PARAMETER SIGNATURE
-- -----------------------------------------------------------------------------
-- This signature was defined in 044_inventory_ledger.sql
DROP FUNCTION IF EXISTS public.add_inventory_ledger_entry(
    INTEGER,
    bird_type_enum,
    inventory_type_enum,
    DECIMAL(10,3),
    VARCHAR(50),
    UUID,
    VARCHAR(50),
    UUID,
    TEXT
);

-- -----------------------------------------------------------------------------
-- 2. RE-ASSERT THE NEW 10-PARAMETER SIGNATURE (Safe Re-run)
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
    -- (We use code instead of id for readability in code/triggers)
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

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
