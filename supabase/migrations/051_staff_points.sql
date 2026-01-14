-- =============================================================================
-- STAFF POINTS SYSTEM
-- =============================================================================
-- Migration: 051_staff_points.sql
-- Description: Creates staff points table for performance tracking
-- Date: 2026-01-13
-- =============================================================================

-- ============================================================================
-- CREATE STAFF POINTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.staff_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    store_id INTEGER NOT NULL REFERENCES public.shops(id),
    
    -- Points change (positive = reward, negative = penalty)
    points_change INTEGER NOT NULL,
    
    -- Reason for the change
    reason VARCHAR(100) NOT NULL,
    reason_details TEXT,
    
    -- Reference to source document
    ref_id UUID,
    ref_type VARCHAR(50),  -- SETTLEMENT, VARIANCE, MANUAL, etc.
    
    -- Effective date
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Audit
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_staff_points_user ON public.staff_points(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_points_store ON public.staff_points(store_id);
CREATE INDEX IF NOT EXISTS idx_staff_points_date ON public.staff_points(effective_date);
CREATE INDEX IF NOT EXISTS idx_staff_points_user_date ON public.staff_points(user_id, effective_date);
CREATE INDEX IF NOT EXISTS idx_staff_points_store_date ON public.staff_points(store_id, effective_date);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.staff_points ENABLE ROW LEVEL SECURITY;

-- Admin can see all
CREATE POLICY staff_points_admin_all ON public.staff_points
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
        )
    );

-- Users can see their own points
CREATE POLICY staff_points_self_select ON public.staff_points
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Store managers can see points for their assigned stores
CREATE POLICY staff_points_store_select ON public.staff_points
    FOR SELECT
    TO authenticated
    USING (
        store_id IN (
            SELECT us.shop_id FROM public.user_shops us WHERE us.user_id = auth.uid()
        )
    );

-- ============================================================================
-- STAFF POINTS CONFIGURATION
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.staff_points_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default point values
INSERT INTO public.staff_points_config (config_key, config_value, description) VALUES
    ('ZERO_VARIANCE_BONUS', 10, 'Points awarded for perfect zero variance settlement'),
    ('POSITIVE_VARIANCE_BONUS', 5, 'Points awarded for verified positive variance (found stock)'),
    ('NEGATIVE_VARIANCE_PENALTY_PER_KG', -2, 'Points deducted per kg of negative variance'),
    ('NEGATIVE_VARIANCE_PENALTY_BASE', -5, 'Base penalty for any negative variance'),
    ('CONSECUTIVE_ZERO_BONUS', 15, 'Bonus for 5+ consecutive zero variance days'),
    ('MONTHLY_BONUS_THRESHOLD', 100, 'Points needed for monthly bonus eligibility')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================================
-- HELPER FUNCTION: Add Staff Points (SECURITY DEFINER)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.add_staff_points(
    p_user_id UUID,
    p_store_id INTEGER,
    p_points INTEGER,
    p_reason VARCHAR(100),
    p_reason_details TEXT DEFAULT NULL,
    p_ref_id UUID DEFAULT NULL,
    p_ref_type VARCHAR(50) DEFAULT NULL,
    p_effective_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID AS $$
DECLARE
    v_entry_id UUID;
BEGIN
    INSERT INTO public.staff_points (
        user_id, store_id, points_change, reason, reason_details,
        ref_id, ref_type, effective_date, created_by
    ) VALUES (
        p_user_id, p_store_id, p_points, p_reason, p_reason_details,
        p_ref_id, p_ref_type, p_effective_date, auth.uid()
    )
    RETURNING id INTO v_entry_id;
    
    RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Get Staff Points Balance
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_staff_points_balance(
    p_user_id UUID,
    p_store_id INTEGER DEFAULT NULL,
    p_from_date DATE DEFAULT NULL,
    p_to_date DATE DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_balance INTEGER;
BEGIN
    SELECT COALESCE(SUM(points_change), 0)
    INTO v_balance
    FROM public.staff_points
    WHERE user_id = p_user_id
      AND (p_store_id IS NULL OR store_id = p_store_id)
      AND (p_from_date IS NULL OR effective_date >= p_from_date)
      AND (p_to_date IS NULL OR effective_date <= p_to_date);
    
    RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Get Point Config Value
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_points_config(p_key VARCHAR(100))
RETURNS INTEGER AS $$
DECLARE
    v_value INTEGER;
BEGIN
    SELECT config_value INTO v_value
    FROM public.staff_points_config
    WHERE config_key = p_key;
    
    RETURN COALESCE(v_value, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER: Award/Deduct Points on Variance Resolution
-- ============================================================================
CREATE OR REPLACE FUNCTION public.on_variance_resolved()
RETURNS TRIGGER AS $$
DECLARE
    v_settlement RECORD;
    v_points INTEGER;
    v_reason VARCHAR(100);
BEGIN
    -- Only trigger on status change
    IF NEW.status = OLD.status THEN
        RETURN NEW;
    END IF;
    
    -- Get settlement info
    SELECT ds.*, s.id as shop_id
    INTO v_settlement
    FROM public.daily_settlements ds
    JOIN public.shops s ON ds.store_id = s.id
    WHERE ds.id = NEW.settlement_id;
    
    IF NEW.status = 'APPROVED' AND NEW.variance_type = 'POSITIVE' THEN
        -- Award points for verified found stock
        v_points := public.get_points_config('POSITIVE_VARIANCE_BONUS');
        v_reason := 'Positive variance approved';
        
        -- Create inventory ledger entry
        NEW.ledger_entry_id := public.add_inventory_ledger_entry(
            p_store_id := v_settlement.store_id,
            p_bird_type := NEW.bird_type,
            p_inventory_type := NEW.inventory_type,
            p_quantity_change := NEW.variance_weight,
            p_reason_code := 'VARIANCE_POSITIVE',
            p_ref_id := NEW.id,
            p_ref_type := 'VARIANCE',
            p_user_id := NEW.resolved_by,
            p_notes := 'Approved positive variance from settlement'
        );
        
    ELSIF NEW.status = 'DEDUCTED' AND NEW.variance_type = 'NEGATIVE' THEN
        -- Deduct points for lost stock
        v_points := public.get_points_config('NEGATIVE_VARIANCE_PENALTY_BASE') +
                   (public.get_points_config('NEGATIVE_VARIANCE_PENALTY_PER_KG') * CEIL(NEW.variance_weight));
        v_reason := 'Negative variance deducted';
        
        -- Create inventory ledger entry (debit to correct stock)
        NEW.ledger_entry_id := public.add_inventory_ledger_entry(
            p_store_id := v_settlement.store_id,
            p_bird_type := NEW.bird_type,
            p_inventory_type := NEW.inventory_type,
            p_quantity_change := -NEW.variance_weight,
            p_reason_code := 'VARIANCE_NEGATIVE',
            p_ref_id := NEW.id,
            p_ref_type := 'VARIANCE',
            p_user_id := NEW.resolved_by,
            p_notes := 'Deducted negative variance from settlement'
        );
    ELSE
        RETURN NEW;
    END IF;
    
    -- Add staff points
    IF v_settlement.submitted_by IS NOT NULL THEN
        PERFORM public.add_staff_points(
            p_user_id := v_settlement.submitted_by,
            p_store_id := v_settlement.store_id,
            p_points := v_points,
            p_reason := v_reason,
            p_reason_details := NEW.bird_type::text || ' ' || NEW.inventory_type::text || ': ' || NEW.variance_weight::text || ' kg',
            p_ref_id := NEW.id,
            p_ref_type := 'VARIANCE',
            p_effective_date := v_settlement.settlement_date
        );
    END IF;
    
    -- Update resolution timestamp
    NEW.resolved_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_variance_resolved ON public.variance_logs;
CREATE TRIGGER trigger_variance_resolved
    BEFORE UPDATE ON public.variance_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.on_variance_resolved();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
