-- =============================================================================
-- MISSED SETTLEMENT PENALTY SYSTEM
-- =============================================================================
-- Migration: 074_missed_settlement_penalty.sql
-- Description: Adds automated penalty for stores with sales but no settlement
-- =============================================================================

-- ============================================================================
-- Add Reason Code for Missed Settlement
-- ============================================================================
INSERT INTO public.staff_points_reason_codes (code, description, points_value, is_per_kg, category, is_configurable)
VALUES ('MISSED_SETTLEMENT', 'Failed to submit settlement on day with sales', -15, false, 'DISCIPLINE', true)
ON CONFLICT (code) DO UPDATE SET
    description = EXCLUDED.description,
    points_value = EXCLUDED.points_value;

-- ============================================================================
-- Function: check_missed_settlements
-- ============================================================================
-- Checks for stores that had sales on a given date but no submitted settlement.
-- Deducts points from all managers assigned to those stores.
--
-- Usage: SELECT check_missed_settlements('2026-01-13');
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_missed_settlements(
    p_check_date DATE DEFAULT (CURRENT_DATE - INTERVAL '1 day')::DATE
)
RETURNS TABLE (
    store_id INTEGER,
    store_name VARCHAR,
    sales_count BIGINT,
    penalty_points INTEGER,
    managers_penalized INTEGER
) AS $$
DECLARE
    v_store RECORD;
    v_manager RECORD;
    v_penalty_points INTEGER;
    v_penalized_count INTEGER;
BEGIN
    -- Get penalty points from config
    SELECT points_value INTO v_penalty_points
    FROM public.staff_points_reason_codes
    WHERE code = 'MISSED_SETTLEMENT';
    
    v_penalty_points := COALESCE(v_penalty_points, -15);

    -- Loop through all stores that had sales on the check date
    FOR v_store IN
        SELECT 
            s.store_id,
            sh.name as store_name,
            COUNT(*) as sale_count
        FROM public.sales s
        JOIN public.shops sh ON s.store_id = sh.id
        WHERE s.created_at::DATE = p_check_date
        GROUP BY s.store_id, sh.name
        HAVING COUNT(*) > 0
    LOOP
        -- Check if a settlement exists for this store and date (not in DRAFT)
        IF NOT EXISTS (
            SELECT 1 FROM public.daily_settlements ds
            WHERE ds.store_id = v_store.store_id
              AND ds.settlement_date = p_check_date
              AND ds.status != 'DRAFT'
        ) THEN
            -- No valid settlement found - penalize managers
            v_penalized_count := 0;
            
            FOR v_manager IN
                SELECT us.user_id
                FROM public.user_shops us
                WHERE us.shop_id = v_store.store_id
            LOOP
                -- Check if penalty already applied for this store/date
                IF NOT EXISTS (
                    SELECT 1 FROM public.staff_points sp
                    WHERE sp.user_id = v_manager.user_id
                      AND sp.store_id = v_store.store_id
                      AND sp.effective_date = p_check_date
                      AND sp.reason_code = 'MISSED_SETTLEMENT'
                ) THEN
                    -- Apply penalty
                    INSERT INTO public.staff_points (
                        user_id, store_id, points_change, reason, reason_code,
                        reason_details, effective_date
                    ) VALUES (
                        v_manager.user_id,
                        v_store.store_id,
                        v_penalty_points,
                        'Missed settlement submission',
                        'MISSED_SETTLEMENT',
                        format('Store had %s sales on %s but no settlement was submitted', 
                               v_store.sale_count, p_check_date),
                        p_check_date
                    );
                    
                    v_penalized_count := v_penalized_count + 1;
                END IF;
            END LOOP;
            
            -- Return result row
            store_id := v_store.store_id;
            store_name := v_store.store_name;
            sales_count := v_store.sale_count;
            penalty_points := v_penalty_points;
            managers_penalized := v_penalized_count;
            RETURN NEXT;
        END IF;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.check_missed_settlements(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_missed_settlements(DATE) TO service_role;

-- ============================================================================
-- NOTES
-- ============================================================================
-- To run this daily, you can:
-- 1. Use pg_cron (if enabled in Supabase):
--    SELECT cron.schedule('check-missed-settlements', '0 6 * * *', 
--           'SELECT check_missed_settlements()');
--
-- 2. Use a Supabase Edge Function with a cron trigger
-- 3. Call from an external scheduler (e.g., GitHub Actions, Vercel Cron)
-- ============================================================================
