-- =============================================================================
-- STAFF PERFORMANCE RPCS
-- =============================================================================
-- Migration: 072_staff_performance_rpc.sql
-- Description: RPCs for awarding points and calculating breakdowns
-- =============================================================================

-- ============================================================================
-- RPC: award_zero_variance_points
-- ============================================================================
-- Awards points if a settlement has no variance logs
CREATE OR REPLACE FUNCTION public.award_zero_variance_points(
    p_settlement_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_settlement RECORD;
    v_points INTEGER;
    v_has_variances BOOLEAN;
BEGIN
    -- Get settlement info
    SELECT * INTO v_settlement
    FROM public.daily_settlements
    WHERE id = p_settlement_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Check for any variance logs
    SELECT EXISTS (
        SELECT 1 FROM public.variance_logs 
        WHERE settlement_id = p_settlement_id
    ) INTO v_has_variances;

    -- If no variances, award ZERO_VARIANCE points
    IF NOT v_has_variances AND v_settlement.submitted_by IS NOT NULL THEN
        -- Get points value from reason codes
        SELECT points_value INTO v_points
        FROM public.staff_points_reason_codes
        WHERE code = 'ZERO_VARIANCE';

        -- Add the points
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
-- RPC: calculate_staff_points
-- ============================================================================
-- Detailed breakdown of manager points, grade, and variances
CREATE OR REPLACE FUNCTION public.calculate_staff_points(
    p_user_id UUID,
    p_store_id INTEGER DEFAULT NULL,
    p_from_date DATE DEFAULT NULL,
    p_to_date DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_total_points INTEGER;
    v_total_weight DECIMAL(12,2);
    v_normalized_score DECIMAL(10,4);
    v_grade public.staff_grade_enum;
    v_breakdown JSON;
    v_variance_summary JSON;
BEGIN
    -- 1. Get total points
    SELECT COALESCE(SUM(points_change), 0)
    INTO v_total_points
    FROM public.staff_points
    WHERE user_id = p_user_id
      AND (p_store_id IS NULL OR store_id = p_store_id)
      AND (p_from_date IS NULL OR effective_date >= p_from_date)
      AND (p_to_date IS NULL OR effective_date <= p_to_date);

    -- 2. Get total weight handled (sales)
    SELECT COALESCE(SUM(weight_handled), 0)
    INTO v_total_weight
    FROM public.staff_points
    WHERE user_id = p_user_id
      AND (p_store_id IS NULL OR store_id = p_store_id)
      AND (p_from_date IS NULL OR effective_date >= p_from_date)
      AND (p_to_date IS NULL OR effective_date <= p_to_date);

    -- 3. Calculate normalized score
    IF v_total_weight > 0 THEN
        v_normalized_score := v_total_points::DECIMAL / v_total_weight;
    ELSE
        -- Default for those without much weight yet
        v_normalized_score := 0;
    END IF;

    -- 4. Calculate grade
    v_grade := public.calculate_grade(v_normalized_score, p_store_id);

    -- 5. Get reason breakdown
    SELECT json_agg(t) INTO v_breakdown
    FROM (
        SELECT 
            reason_code,
            reason as description,
            SUM(points_change) as points,
            COUNT(*) as count
        FROM public.staff_points
        WHERE user_id = p_user_id
          AND (p_store_id IS NULL OR store_id = p_store_id)
          AND (p_from_date IS NULL OR effective_date >= p_from_date)
          AND (p_to_date IS NULL OR effective_date <= p_to_date)
        GROUP BY reason_code, reason
        ORDER BY points DESC
    ) t;

    -- 6. Get variance summary
    SELECT json_build_object(
        'positive_kg', COALESCE(SUM(CASE WHEN vl.variance_type = 'POSITIVE' THEN vl.variance_weight ELSE 0 END), 0),
        'negative_kg', COALESCE(SUM(CASE WHEN vl.variance_type = 'NEGATIVE' THEN vl.variance_weight ELSE 0 END), 0),
        'count', COUNT(vl.id)
    ) INTO v_variance_summary
    FROM public.variance_logs vl
    JOIN public.daily_settlements ds ON vl.settlement_id = ds.id
    WHERE ds.submitted_by = p_user_id
      AND (p_store_id IS NULL OR ds.store_id = p_store_id)
      AND (p_from_date IS NULL OR ds.settlement_date >= p_from_date)
      AND (p_to_date IS NULL OR ds.settlement_date <= p_to_date);

    RETURN json_build_object(
        'user_id', p_user_id,
        'total_points', v_total_points,
        'total_weight_handled', v_total_weight,
        'normalized_score', v_normalized_score,
        'grade', v_grade,
        'points_breakdown', COALESCE(v_breakdown, '[]'::json),
        'variance_summary', v_variance_summary
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.award_zero_variance_points(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_zero_variance_points(UUID) TO service_role;

GRANT EXECUTE ON FUNCTION public.calculate_staff_points(UUID, INTEGER, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_staff_points(UUID, INTEGER, DATE, DATE) TO service_role;
