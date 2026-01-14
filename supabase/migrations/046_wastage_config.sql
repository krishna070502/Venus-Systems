-- =============================================================================
-- WASTAGE CONFIGURATION TABLE
-- =============================================================================
-- Migration: 046_wastage_config.sql
-- Description: Creates admin-configurable wastage percentages for processing
-- Date: 2026-01-13
-- =============================================================================

-- ============================================================================
-- CREATE WASTAGE CONFIG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.wastage_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bird_type bird_type_enum NOT NULL,
    target_inventory_type inventory_type_enum NOT NULL,
    
    -- Wastage percentage (e.g., 15.00 = 15%)
    percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    
    -- Effective date for versioning
    effective_date DATE NOT NULL,
    
    -- Audit trail
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: one config per bird type, output type, and date
    CONSTRAINT unique_wastage_config UNIQUE (bird_type, target_inventory_type, effective_date)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_wastage_config_lookup 
    ON public.wastage_config(bird_type, target_inventory_type, effective_date DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.wastage_config ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view wastage config
CREATE POLICY wastage_config_select ON public.wastage_config
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Only Admin can insert/update wastage config
CREATE POLICY wastage_config_admin_insert ON public.wastage_config
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
        )
    );

CREATE POLICY wastage_config_admin_update ON public.wastage_config
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
        )
    );

-- ============================================================================
-- HELPER FUNCTION: Get Current Wastage Percentage
-- ============================================================================
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
    
    -- Get the most recent config for the given date
    SELECT percentage INTO v_percentage
    FROM public.wastage_config
    WHERE bird_type = p_bird_type
      AND target_inventory_type = p_target_type
      AND effective_date <= p_date
    ORDER BY effective_date DESC
    LIMIT 1;
    
    -- Return 0 if no config found (should not happen in production)
    RETURN COALESCE(v_percentage, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SEED DEFAULT WASTAGE CONFIGURATIONS
-- ============================================================================
INSERT INTO public.wastage_config (bird_type, target_inventory_type, percentage, effective_date) VALUES
    -- Broiler wastage rates
    ('BROILER', 'SKIN', 5.00, '2024-01-01'),        -- 5% wastage for with-skin
    ('BROILER', 'SKINLESS', 15.00, '2024-01-01'),   -- 15% wastage for skinless
    
    -- Parent Cull wastage rates (higher due to tougher birds)
    ('PARENT_CULL', 'SKIN', 7.00, '2024-01-01'),    -- 7% wastage for with-skin
    ('PARENT_CULL', 'SKINLESS', 18.00, '2024-01-01') -- 18% wastage for skinless
ON CONFLICT (bird_type, target_inventory_type, effective_date) DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
