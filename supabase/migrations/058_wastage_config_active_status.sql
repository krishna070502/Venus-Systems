-- =============================================================================
-- WASTAGE CONFIGURATION ENHANCEMENT
-- =============================================================================
-- Migration: 058_wastage_config_active_status.sql
-- Description: Adds is_active status to wastage_config and updates helper logic
-- Date: 2026-01-13
-- =============================================================================

-- 1. Add is_active column
ALTER TABLE public.wastage_config 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Update get_wastage_percentage to only consider ACTIVE configurations
CREATE OR REPLACE FUNCTION public.get_wastage_percentage(
    p_bird_type bird_type_enum,
    p_target_type inventory_type_enum,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    v_percentage DECIMAL(5,2);
BEGIN
    -- Target type cannot be LIVE (no wastage for live birds)
    IF p_target_type = 'LIVE' THEN
        RETURN 0;
    END IF;
    
    -- Get the most recent ACTIVE config for the given date
    SELECT percentage INTO v_percentage
    FROM public.wastage_config
    WHERE bird_type = p_bird_type
      AND target_inventory_type = p_target_type
      AND is_active = true
      AND effective_date <= p_date
    ORDER BY effective_date DESC
    LIMIT 1;
    
    -- Return 0 if no config found
    RETURN COALESCE(v_percentage, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update existing calculate_processing_output RPC to use the new logic
-- This ensuring atomicity in the backend
CREATE OR REPLACE FUNCTION public.calculate_processing_output(
    p_input_weight DECIMAL,
    p_bird_type bird_type_enum,
    p_target_type inventory_type_enum
)
RETURNS TABLE (
    wastage_percentage DECIMAL,
    wastage_weight DECIMAL,
    output_weight DECIMAL
) AS $$
DECLARE
    v_wastage_pct DECIMAL;
BEGIN
    -- Get wastage percentage from config
    v_wastage_pct := public.get_wastage_percentage(p_bird_type, p_target_type);
    
    RETURN QUERY
    SELECT 
        v_wastage_pct as wastage_percentage,
        (p_input_weight * v_wastage_pct / 100.0) as wastage_weight,
        (p_input_weight * (1.0 - v_wastage_pct / 100.0)) as output_weight;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
