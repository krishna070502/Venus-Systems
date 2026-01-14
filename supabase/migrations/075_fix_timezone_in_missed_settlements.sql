-- =============================================================================
-- FIX TIMEZONE HANDLING IN CHECK_MISSED_SETTLEMENTS
-- =============================================================================
-- Migration: 075_fix_timezone_in_missed_settlements.sql
-- Description: Updates check_missed_settlements to use store timezone
-- =============================================================================

-- ============================================================================
-- Function: check_missed_settlements (Updated with Timezone Support)
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

    -- Loop through all stores that had sales on the check date (using store timezone)
    FOR v_store IN
        SELECT 
            sh.id as store_id,
            sh.name as store_name,
            sh.timezone as store_timezone,
            COUNT(*) as sale_count
        FROM public.sales s
        JOIN public.shops sh ON s.store_id = sh.id
        WHERE (s.created_at AT TIME ZONE COALESCE(sh.timezone, 'Asia/Kolkata'))::DATE = p_check_date
        GROUP BY sh.id, sh.name, sh.timezone
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
