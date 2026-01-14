-- =============================================================================
-- ENHANCE SHOPS TABLE FOR POULTRY RETAIL
-- =============================================================================
-- Migration: 041_enhance_shops_table.sql
-- Description: Adds timezone, status, code, and opening_date to shops table
-- Date: 2026-01-13
-- =============================================================================

-- ============================================================================
-- ADD NEW COLUMNS TO SHOPS TABLE
-- ============================================================================

-- Add unique store code
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS code VARCHAR(20);

-- Add timezone for settlement calculations
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Kolkata';

-- Add store status (ACTIVE / MAINTENANCE)
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS status store_status_enum DEFAULT 'ACTIVE';

-- Add opening date
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS opening_date DATE;

-- ============================================================================
-- GENERATE CODES FOR EXISTING SHOPS
-- ============================================================================
UPDATE public.shops 
SET code = 'STORE-' || LPAD(id::text, 3, '0')
WHERE code IS NULL;

-- Now make code NOT NULL and UNIQUE
ALTER TABLE public.shops ALTER COLUMN code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_shops_code ON public.shops(code);

-- ============================================================================
-- CREATE INDEX FOR STATUS QUERIES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_shops_status ON public.shops(status);

-- ============================================================================
-- FUNCTION TO CHECK STORE IS ACTIVE
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_store_active(p_store_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_status store_status_enum;
BEGIN
    SELECT status INTO v_status FROM public.shops WHERE id = p_store_id;
    
    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Store with ID % not found', p_store_id;
    END IF;
    
    RETURN v_status = 'ACTIVE';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
