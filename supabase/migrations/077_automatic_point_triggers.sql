-- =============================================================================
-- AUTOMATIC POINT TRIGGERS
-- =============================================================================
-- Migration: 077_automatic_point_triggers.sql
-- Description: Implements automatic point allocation for all configurable reason codes
-- =============================================================================

-- ============================================================================
-- 1. VARIANCE RESOLUTION TRIGGER
-- ============================================================================
-- Awards/deducts points when variance logs are resolved

CREATE OR REPLACE FUNCTION public.on_variance_resolved()
RETURNS TRIGGER AS $$
DECLARE
    v_settlement RECORD;
    v_points INTEGER;
    v_reason VARCHAR(100);
    v_reason_code VARCHAR(50);
    v_submitter_id UUID;
BEGIN
    -- Only trigger on status change to APPROVED or DEDUCTED
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    IF NEW.status NOT IN ('APPROVED', 'DEDUCTED') THEN
        RETURN NEW;
    END IF;

    -- Get settlement info
    SELECT * INTO v_settlement
    FROM public.daily_settlements
    WHERE id = NEW.settlement_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    v_submitter_id := v_settlement.submitted_by;

    -- Determine points based on variance type and resolution
    IF NEW.variance_type = 'POSITIVE' AND NEW.status = 'APPROVED' THEN
        -- Positive variance approved - award points
        SELECT points_value INTO v_points
        FROM public.staff_points_reason_codes
        WHERE code = 'POSITIVE_VARIANCE_APPROVED';
        
        v_points := COALESCE(v_points, 3);
        v_reason := 'Positive variance approved (found stock)';
        v_reason_code := 'POSITIVE_VARIANCE_APPROVED';
        
    ELSIF NEW.variance_type = 'NEGATIVE' AND NEW.status = 'DEDUCTED' THEN
        -- Negative variance deducted - deduct points per kg
        SELECT points_value INTO v_points
        FROM public.staff_points_reason_codes
        WHERE code = 'NEGATIVE_VARIANCE';
        
        -- Points are per kg, multiply by variance weight
        v_points := COALESCE(v_points, -8) * CEIL(NEW.variance_weight);
        v_reason := format('Negative variance: %.2fkg lost', NEW.variance_weight);
        v_reason_code := 'NEGATIVE_VARIANCE';
    ELSE
        RETURN NEW;
    END IF;

    -- Check if points already awarded for this variance
    IF NOT EXISTS (
        SELECT 1 FROM public.staff_points
        WHERE ref_id = NEW.id AND reason_code = v_reason_code
    ) AND v_submitter_id IS NOT NULL THEN
        -- Add points
        INSERT INTO public.staff_points (
            user_id, store_id, points_change, reason, reason_code,
            reason_details, ref_id, ref_type, effective_date, weight_handled
        ) VALUES (
            v_submitter_id,
            v_settlement.store_id,
            v_points,
            v_reason,
            v_reason_code,
            format('%s %s: %.3fkg', NEW.bird_type, NEW.inventory_type, NEW.variance_weight),
            NEW.id,
            'VARIANCE',
            v_settlement.settlement_date,
            NEW.variance_weight
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS trigger_variance_resolved ON public.variance_logs;
CREATE TRIGGER trigger_variance_resolved
    AFTER UPDATE ON public.variance_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.on_variance_resolved();

-- ============================================================================
-- 2. ON-TIME / LATE SETTLEMENT DETECTION
-- ============================================================================
-- Awards/deducts points when settlement is submitted based on timing

CREATE OR REPLACE FUNCTION public.on_settlement_submitted()
RETURNS TRIGGER AS $$
DECLARE
    v_store RECORD;
    v_submission_local TIMESTAMP;
    v_deadline TIMESTAMP;
    v_points INTEGER;
    v_reason_code VARCHAR(50);
    v_is_manager BOOLEAN;
BEGIN
    -- Only trigger on status change to SUBMITTED
    IF NEW.status != 'SUBMITTED' OR OLD.status = 'SUBMITTED' THEN
        RETURN NEW;
    END IF;

    -- Get store timezone
    SELECT * INTO v_store
    FROM public.shops
    WHERE id = NEW.store_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- Check if submitter is a store manager
    SELECT EXISTS (
        SELECT 1 FROM public.user_shops
        WHERE user_id = NEW.submitted_by
          AND shop_id = NEW.store_id
    ) INTO v_is_manager;

    -- Only award/penalize if manager submitted
    IF NOT v_is_manager THEN
        RETURN NEW;
    END IF;

    -- Convert submission time to store timezone
    v_submission_local := NEW.submitted_at AT TIME ZONE COALESCE(v_store.timezone, 'Asia/Kolkata');
    
    -- Deadline is end of settlement_date (23:59:59) in store timezone
    v_deadline := (NEW.settlement_date + INTERVAL '1 day' - INTERVAL '1 second')::TIMESTAMP;

    -- Check if on-time or late
    IF v_submission_local::DATE <= NEW.settlement_date THEN
        -- On-time submission (same day or earlier)
        SELECT points_value INTO v_points
        FROM public.staff_points_reason_codes
        WHERE code = 'ON_TIME_SETTLEMENT';
        
        v_points := COALESCE(v_points, 2);
        v_reason_code := 'ON_TIME_SETTLEMENT';
    ELSE
        -- Late submission
        SELECT points_value INTO v_points
        FROM public.staff_points_reason_codes
        WHERE code = 'LATE_SETTLEMENT';
        
        v_points := COALESCE(v_points, -3);
        v_reason_code := 'LATE_SETTLEMENT';
    END IF;

    -- Check if points already awarded for this settlement
    IF NOT EXISTS (
        SELECT 1 FROM public.staff_points
        WHERE ref_id = NEW.id 
          AND reason_code IN ('ON_TIME_SETTLEMENT', 'LATE_SETTLEMENT')
    ) THEN
        -- Add points
        INSERT INTO public.staff_points (
            user_id, store_id, points_change, reason, reason_code,
            reason_details, ref_id, ref_type, effective_date
        ) VALUES (
            NEW.submitted_by,
            NEW.store_id,
            v_points,
            CASE WHEN v_reason_code = 'ON_TIME_SETTLEMENT' 
                 THEN 'On-time settlement submission'
                 ELSE 'Late settlement submission'
            END,
            v_reason_code,
            format('Submitted at %s for date %s', 
                   to_char(v_submission_local, 'YYYY-MM-DD HH24:MI'), 
                   NEW.settlement_date),
            NEW.id,
            'SETTLEMENT',
            NEW.settlement_date
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS trigger_settlement_submitted ON public.daily_settlements;
CREATE TRIGGER trigger_settlement_submitted
    AFTER UPDATE ON public.daily_settlements
    FOR EACH ROW
    EXECUTE FUNCTION public.on_settlement_submitted();

-- ============================================================================
-- 3. REPEATED NEGATIVE VARIANCE CHECK (Scheduled Function)
-- ============================================================================
-- Checks for managers with 3+ consecutive days of negative variance

CREATE OR REPLACE FUNCTION public.check_repeated_negative_variance(
    p_check_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    user_id UUID,
    user_name VARCHAR,
    store_id INTEGER,
    consecutive_days INTEGER,
    penalty_applied BOOLEAN
) AS $$
DECLARE
    v_user RECORD;
    v_penalty_points INTEGER;
    v_consecutive INTEGER;
BEGIN
    -- Get penalty points from config
    SELECT points_value INTO v_penalty_points
    FROM public.staff_points_reason_codes
    WHERE code = 'REPEATED_NEGATIVE_3DAYS';
    
    v_penalty_points := COALESCE(v_penalty_points, -20);

    -- Find users with negative variance in the last 3 days
    FOR v_user IN
        SELECT 
            sp.user_id,
            p.full_name as user_name,
            sp.store_id,
            COUNT(DISTINCT sp.effective_date) as neg_days
        FROM public.staff_points sp
        JOIN public.profiles p ON sp.user_id = p.id
        WHERE sp.reason_code = 'NEGATIVE_VARIANCE'
          AND sp.effective_date BETWEEN p_check_date - INTERVAL '2 days' AND p_check_date
        GROUP BY sp.user_id, p.full_name, sp.store_id
        HAVING COUNT(DISTINCT sp.effective_date) >= 3
    LOOP
        -- Check if penalty already applied for this period
        IF NOT EXISTS (
            SELECT 1 FROM public.staff_points
            WHERE user_id = v_user.user_id
              AND store_id = v_user.store_id
              AND reason_code = 'REPEATED_NEGATIVE_3DAYS'
              AND effective_date = p_check_date
        ) THEN
            -- Apply penalty
            INSERT INTO public.staff_points (
                user_id, store_id, points_change, reason, reason_code,
                reason_details, effective_date
            ) VALUES (
                v_user.user_id,
                v_user.store_id,
                v_penalty_points,
                'Repeated negative variance (3+ consecutive days)',
                'REPEATED_NEGATIVE_3DAYS',
                format('Negative variance on %s consecutive days ending %s', 
                       v_user.neg_days, p_check_date),
                p_check_date
            );
            
            user_id := v_user.user_id;
            user_name := v_user.user_name;
            store_id := v_user.store_id;
            consecutive_days := v_user.neg_days;
            penalty_applied := true;
            RETURN NEXT;
        ELSE
            user_id := v_user.user_id;
            user_name := v_user.user_name;
            store_id := v_user.store_id;
            consecutive_days := v_user.neg_days;
            penalty_applied := false;
            RETURN NEXT;
        END IF;
    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.on_variance_resolved() TO authenticated;
GRANT EXECUTE ON FUNCTION public.on_variance_resolved() TO service_role;

GRANT EXECUTE ON FUNCTION public.on_settlement_submitted() TO authenticated;
GRANT EXECUTE ON FUNCTION public.on_settlement_submitted() TO service_role;

GRANT EXECUTE ON FUNCTION public.check_repeated_negative_variance(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_repeated_negative_variance(DATE) TO service_role;
