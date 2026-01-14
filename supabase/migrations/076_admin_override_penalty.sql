-- =============================================================================
-- ADMIN OVERRIDE PENALTY SYSTEM
-- =============================================================================
-- Migration: 076_admin_override_penalty.sql
-- Description: Penalizes store managers when Admin submits settlement on their behalf
-- =============================================================================

-- ============================================================================
-- Add Reason Code for Admin Override
-- ============================================================================
INSERT INTO public.staff_points_reason_codes (code, description, points_value, is_per_kg, category, is_configurable)
VALUES ('ADMIN_OVERRIDE', 'Settlement submitted by Admin instead of Store Manager', -10, false, 'DISCIPLINE', true)
ON CONFLICT (code) DO UPDATE SET
    description = EXCLUDED.description,
    points_value = EXCLUDED.points_value;

-- ============================================================================
-- Function: check_admin_override_penalty
-- ============================================================================
-- Called after settlement approval to check if it was submitted by non-manager
-- If yes, penalizes all assigned store managers
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_admin_override_penalty(
    p_settlement_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_settlement RECORD;
    v_manager RECORD;
    v_penalty_points INTEGER;
    v_is_manager BOOLEAN;
BEGIN
    -- Get settlement info
    SELECT * INTO v_settlement
    FROM public.daily_settlements
    WHERE id = p_settlement_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Check if submitter is an assigned manager for this store
    SELECT EXISTS (
        SELECT 1 FROM public.user_shops
        WHERE user_id = v_settlement.submitted_by
          AND shop_id = v_settlement.store_id
    ) INTO v_is_manager;

    -- If submitted by someone NOT assigned to the store (Admin), penalize managers
    IF NOT v_is_manager AND v_settlement.submitted_by IS NOT NULL THEN
        -- Get penalty points from config
        SELECT points_value INTO v_penalty_points
        FROM public.staff_points_reason_codes
        WHERE code = 'ADMIN_OVERRIDE';
        
        v_penalty_points := COALESCE(v_penalty_points, -10);

        -- Penalize all assigned managers
        FOR v_manager IN
            SELECT us.user_id
            FROM public.user_shops us
            WHERE us.shop_id = v_settlement.store_id
        LOOP
            -- Check if penalty already applied for this settlement
            IF NOT EXISTS (
                SELECT 1 FROM public.staff_points sp
                WHERE sp.user_id = v_manager.user_id
                  AND sp.ref_id = p_settlement_id
                  AND sp.reason_code = 'ADMIN_OVERRIDE'
            ) THEN
                -- Apply penalty
                PERFORM public.add_staff_points(
                    p_user_id := v_manager.user_id,
                    p_store_id := v_settlement.store_id,
                    p_points := v_penalty_points,
                    p_reason := 'Settlement submitted by Admin',
                    p_reason_code := 'ADMIN_OVERRIDE',
                    p_reason_details := 'Store Manager failed to submit settlement; Admin had to intervene',
                    p_ref_id := p_settlement_id,
                    p_ref_type := 'SETTLEMENT',
                    p_effective_date := v_settlement.settlement_date
                );
            END IF;
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Update award_zero_variance_points to only award to actual submitter who is a manager
-- ============================================================================
CREATE OR REPLACE FUNCTION public.award_zero_variance_points(
    p_settlement_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_settlement RECORD;
    v_points INTEGER;
    v_has_variances BOOLEAN;
    v_is_manager BOOLEAN;
BEGIN
    -- Get settlement info
    SELECT * INTO v_settlement
    FROM public.daily_settlements
    WHERE id = p_settlement_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Check if submitter is an assigned manager for this store
    SELECT EXISTS (
        SELECT 1 FROM public.user_shops
        WHERE user_id = v_settlement.submitted_by
          AND shop_id = v_settlement.store_id
    ) INTO v_is_manager;

    -- Only award points if submitted by actual store manager
    IF NOT v_is_manager THEN
        -- Admin submitted - check and apply penalty instead
        PERFORM public.check_admin_override_penalty(p_settlement_id);
        RETURN;
    END IF;

    -- Check for any variance logs
    SELECT EXISTS (
        SELECT 1 FROM public.variance_logs 
        WHERE settlement_id = p_settlement_id
    ) INTO v_has_variances;

    -- If no variances and submitted by manager, award ZERO_VARIANCE points
    IF NOT v_has_variances AND v_settlement.submitted_by IS NOT NULL THEN
        -- Get points value from reason codes
        SELECT points_value INTO v_points
        FROM public.staff_points_reason_codes
        WHERE code = 'ZERO_VARIANCE';

        -- Add the points to the manager
        PERFORM public.add_staff_points(
            p_user_id := v_settlement.submitted_by,
            p_store_id := v_settlement.store_id,
            p_points := COALESCE(v_points, 10),
            p_reason := 'Perfect settlement (Zero Variance)',
            p_reason_code := 'ZERO_VARIANCE',
            p_ref_id := p_settlement_id,
            p_ref_type := 'SETTLEMENT',
            p_effective_date := v_settlement.settlement_date
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.check_admin_override_penalty(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_admin_override_penalty(UUID) TO service_role;
