-- =============================================================================
-- STAFF GRADING & PERFORMANCE SYSTEM
-- =============================================================================
-- Migration: 055_staff_grading_system.sql
-- Description: Comprehensive staff grading with normalized scores, grades,
--              bonus/penalty policies, and monthly performance snapshots
-- Date: 2026-01-13
-- =============================================================================

-- ============================================================================
-- STEP 1: CREATE GRADE ENUM
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE staff_grade_enum AS ENUM ('A_PLUS', 'A', 'B', 'C', 'D', 'E');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- STEP 2: CREATE REASON CODES FOR POINTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.staff_points_reason_codes (
    code VARCHAR(50) PRIMARY KEY,
    description TEXT NOT NULL,
    points_value INTEGER NOT NULL,
    is_per_kg BOOLEAN DEFAULT false,
    category VARCHAR(50) NOT NULL CHECK (category IN ('SETTLEMENT', 'DISCIPLINE', 'FRAUD', 'MANUAL')),
    is_configurable BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed reason codes
INSERT INTO public.staff_points_reason_codes (code, description, points_value, is_per_kg, category, is_configurable) VALUES
    -- Settlement outcomes
    ('ZERO_VARIANCE', 'Perfect settlement with zero variance', 10, false, 'SETTLEMENT', true),
    ('POSITIVE_VARIANCE_APPROVED', 'Approved positive variance (found stock)', 3, true, 'SETTLEMENT', true),
    ('NEGATIVE_VARIANCE', 'Negative variance (lost stock)', -8, true, 'SETTLEMENT', true),
    
    -- Behavioral discipline
    ('ON_TIME_SETTLEMENT', 'On-time settlement submission', 2, false, 'DISCIPLINE', true),
    ('LATE_SETTLEMENT', 'Late settlement submission (<24h)', -3, false, 'DISCIPLINE', true),
    ('MANUAL_CORRECTION', 'Manual correction by Admin', -5, false, 'DISCIPLINE', true),
    ('REPEATED_NEGATIVE_3DAYS', 'Repeated negative variance (3 consecutive days)', -20, false, 'DISCIPLINE', true),
    ('SETTLEMENT_LOCKED_NO_SUBMIT', 'Settlement locked without submission', -30, false, 'DISCIPLINE', true),
    
    -- Fraud indicators
    ('SELLING_BLOCKED_STOCK', 'Attempted sale of blocked stock', -50, false, 'FRAUD', true),
    ('INVENTORY_TAMPERING', 'Inventory tampering attempt detected', -100, false, 'FRAUD', true),
    ('BYPASSING_POS', 'Bypassing POS flow', -100, false, 'FRAUD', true),
    ('REPEATED_FRAUD_FLAG', 'Repeated fraud flag - AUTO SUSPEND', -500, false, 'FRAUD', false),
    
    -- Manual adjustments
    ('ADMIN_BONUS', 'Manual bonus by Admin', 0, false, 'MANUAL', false),
    ('ADMIN_PENALTY', 'Manual penalty by Admin', 0, false, 'MANUAL', false)
ON CONFLICT (code) DO UPDATE SET
    points_value = EXCLUDED.points_value,
    description = EXCLUDED.description;

-- ============================================================================
-- STEP 3: CREATE GRADING CONFIG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.staff_grading_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value DECIMAL(10,4) NOT NULL,
    config_type VARCHAR(20) NOT NULL CHECK (config_type IN ('GRADE_THRESHOLD', 'BONUS_RATE', 'PENALTY_RATE', 'SYSTEM')),
    description TEXT,
    store_id INTEGER REFERENCES public.shops(id),  -- NULL = global default
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed grading thresholds (normalized score boundaries)
INSERT INTO public.staff_grading_config (config_key, config_value, config_type, description) VALUES
    -- Grade thresholds (normalized score)
    ('GRADE_A_PLUS_MIN', 0.50, 'GRADE_THRESHOLD', 'Minimum normalized score for A+ grade'),
    ('GRADE_A_MIN', 0.30, 'GRADE_THRESHOLD', 'Minimum normalized score for A grade'),
    ('GRADE_B_MIN', 0.10, 'GRADE_THRESHOLD', 'Minimum normalized score for B grade'),
    ('GRADE_C_MIN', -0.10, 'GRADE_THRESHOLD', 'Minimum normalized score for C grade'),
    ('GRADE_D_MIN', -0.30, 'GRADE_THRESHOLD', 'Minimum normalized score for D grade'),
    -- E grade is anything below GRADE_D_MIN
    
    -- Bonus rates (per kg handled)
    ('BONUS_RATE_A_PLUS', 10.00, 'BONUS_RATE', 'Bonus per kg for A+ grade'),
    ('BONUS_RATE_A', 6.00, 'BONUS_RATE', 'Bonus per kg for A grade'),
    ('BONUS_RATE_B', 3.00, 'BONUS_RATE', 'Bonus per kg for B grade'),
    ('BONUS_RATE_C', 0.00, 'BONUS_RATE', 'Bonus per kg for C grade'),
    ('BONUS_RATE_D', 0.00, 'BONUS_RATE', 'Bonus per kg for D grade'),
    ('BONUS_RATE_E', 0.00, 'BONUS_RATE', 'Bonus per kg for E grade'),
    
    -- Penalty rates (per kg negative variance)
    ('PENALTY_RATE_C', 0.00, 'PENALTY_RATE', 'Penalty per kg loss for C grade'),
    ('PENALTY_RATE_D', 5.00, 'PENALTY_RATE', 'Penalty per kg loss for D grade'),
    ('PENALTY_RATE_E', 10.00, 'PENALTY_RATE', 'Penalty per kg loss for E grade (2x)'),
    
    -- System config
    ('BONUS_CAP_MONTHLY', 5000.00, 'SYSTEM', 'Maximum bonus per month per user'),
    ('PENALTY_CAP_MONTHLY', 10000.00, 'SYSTEM', 'Maximum penalty per month per user'),
    ('FRAUD_AUTO_SUSPEND_THRESHOLD', -200, 'SYSTEM', 'Points threshold for auto-suspension')
ON CONFLICT (config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value;

-- ============================================================================
-- STEP 4: UPDATE STAFF_POINTS TABLE WITH REASON_CODE
-- ============================================================================
ALTER TABLE public.staff_points ADD COLUMN IF NOT EXISTS reason_code VARCHAR(50);
ALTER TABLE public.staff_points ADD COLUMN IF NOT EXISTS weight_handled DECIMAL(10,3) DEFAULT 0;

-- Add foreign key (if reason_codes table exists)
DO $$
BEGIN
    ALTER TABLE public.staff_points 
    ADD CONSTRAINT fk_staff_points_reason_code 
    FOREIGN KEY (reason_code) REFERENCES public.staff_points_reason_codes(code);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- STEP 5: CREATE MONTHLY PERFORMANCE SNAPSHOT TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.staff_monthly_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    store_id INTEGER NOT NULL REFERENCES public.shops(id),
    
    -- Period
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    
    -- Metrics
    total_points INTEGER NOT NULL DEFAULT 0,
    total_weight_handled DECIMAL(10,3) NOT NULL DEFAULT 0,
    normalized_score DECIMAL(10,4) NOT NULL DEFAULT 0,
    
    -- Variance breakdown
    positive_variance_kg DECIMAL(10,3) DEFAULT 0,
    negative_variance_kg DECIMAL(10,3) DEFAULT 0,
    zero_variance_days INTEGER DEFAULT 0,
    
    -- Grade
    grade staff_grade_enum NOT NULL,
    
    -- Financial
    bonus_amount DECIMAL(12,2) DEFAULT 0,
    penalty_amount DECIMAL(12,2) DEFAULT 0,
    net_incentive DECIMAL(12,2) GENERATED ALWAYS AS (bonus_amount - penalty_amount) STORED,
    
    -- Status
    is_locked BOOLEAN DEFAULT false,
    locked_at TIMESTAMPTZ,
    locked_by UUID REFERENCES auth.users(id),
    
    -- Flags
    has_fraud_flag BOOLEAN DEFAULT false,
    is_suspended BOOLEAN DEFAULT false,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique: one record per user per store per month
    CONSTRAINT unique_user_store_month UNIQUE (user_id, store_id, year, month)
);

-- ============================================================================
-- STEP 6: CREATE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_monthly_perf_user ON public.staff_monthly_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_perf_store ON public.staff_monthly_performance(store_id);
CREATE INDEX IF NOT EXISTS idx_monthly_perf_period ON public.staff_monthly_performance(year, month);
CREATE INDEX IF NOT EXISTS idx_monthly_perf_grade ON public.staff_monthly_performance(grade);
CREATE INDEX IF NOT EXISTS idx_monthly_perf_locked ON public.staff_monthly_performance(is_locked);

CREATE INDEX IF NOT EXISTS idx_grading_config_store ON public.staff_grading_config(store_id);
CREATE INDEX IF NOT EXISTS idx_grading_config_type ON public.staff_grading_config(config_type);

-- ============================================================================
-- STEP 7: ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.staff_monthly_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_grading_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_points_reason_codes ENABLE ROW LEVEL SECURITY;

-- Admin can see all
CREATE POLICY monthly_perf_admin_all ON public.staff_monthly_performance
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
    ));

-- Users can see their own
CREATE POLICY monthly_perf_self ON public.staff_monthly_performance
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Store managers see their stores
CREATE POLICY monthly_perf_store ON public.staff_monthly_performance
    FOR SELECT TO authenticated
    USING (store_id IN (
        SELECT us.shop_id FROM public.user_shops us WHERE us.user_id = auth.uid()
    ));

-- Grading config: all can read
CREATE POLICY grading_config_read ON public.staff_grading_config
    FOR SELECT TO authenticated USING (true);

-- Grading config: admin can modify
CREATE POLICY grading_config_admin ON public.staff_grading_config
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
    ));

-- Reason codes: all can read
CREATE POLICY reason_codes_read ON public.staff_points_reason_codes
    FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- STEP 8: HELPER FUNCTION - GET CONFIG VALUE
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_grading_config(
    p_key VARCHAR(100),
    p_store_id INTEGER DEFAULT NULL
)
RETURNS DECIMAL(10,4) AS $$
DECLARE
    v_value DECIMAL(10,4);
BEGIN
    -- Try store-specific config first
    IF p_store_id IS NOT NULL THEN
        SELECT config_value INTO v_value
        FROM public.staff_grading_config
        WHERE config_key = p_key AND store_id = p_store_id;
        
        IF v_value IS NOT NULL THEN
            RETURN v_value;
        END IF;
    END IF;
    
    -- Fall back to global config
    SELECT config_value INTO v_value
    FROM public.staff_grading_config
    WHERE config_key = p_key AND store_id IS NULL;
    
    RETURN COALESCE(v_value, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 9: HELPER FUNCTION - CALCULATE GRADE FROM NORMALIZED SCORE
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_grade(
    p_normalized_score DECIMAL(10,4),
    p_store_id INTEGER DEFAULT NULL
)
RETURNS staff_grade_enum AS $$
DECLARE
    v_a_plus_min DECIMAL(10,4);
    v_a_min DECIMAL(10,4);
    v_b_min DECIMAL(10,4);
    v_c_min DECIMAL(10,4);
    v_d_min DECIMAL(10,4);
BEGIN
    v_a_plus_min := public.get_grading_config('GRADE_A_PLUS_MIN', p_store_id);
    v_a_min := public.get_grading_config('GRADE_A_MIN', p_store_id);
    v_b_min := public.get_grading_config('GRADE_B_MIN', p_store_id);
    v_c_min := public.get_grading_config('GRADE_C_MIN', p_store_id);
    v_d_min := public.get_grading_config('GRADE_D_MIN', p_store_id);
    
    IF p_normalized_score >= v_a_plus_min THEN
        RETURN 'A_PLUS';
    ELSIF p_normalized_score >= v_a_min THEN
        RETURN 'A';
    ELSIF p_normalized_score >= v_b_min THEN
        RETURN 'B';
    ELSIF p_normalized_score >= v_c_min THEN
        RETURN 'C';
    ELSIF p_normalized_score >= v_d_min THEN
        RETURN 'D';
    ELSE
        RETURN 'E';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 10: FUNCTION - CALCULATE BONUS/PENALTY FOR GRADE
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_incentive(
    p_grade staff_grade_enum,
    p_weight_handled DECIMAL(10,3),
    p_negative_variance_kg DECIMAL(10,3),
    p_store_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
    bonus_amount DECIMAL(12,2),
    penalty_amount DECIMAL(12,2)
) AS $$
DECLARE
    v_bonus_rate DECIMAL(10,4);
    v_penalty_rate DECIMAL(10,4);
    v_bonus DECIMAL(12,2);
    v_penalty DECIMAL(12,2);
    v_bonus_cap DECIMAL(12,2);
    v_penalty_cap DECIMAL(12,2);
BEGIN
    -- Get bonus rate for grade
    v_bonus_rate := public.get_grading_config('BONUS_RATE_' || p_grade::text, p_store_id);
    
    -- Get penalty rate for grade
    v_penalty_rate := public.get_grading_config('PENALTY_RATE_' || 
        CASE WHEN p_grade IN ('C', 'D', 'E') THEN p_grade::text ELSE 'C' END, 
        p_store_id);
    
    -- Get caps
    v_bonus_cap := public.get_grading_config('BONUS_CAP_MONTHLY', p_store_id);
    v_penalty_cap := public.get_grading_config('PENALTY_CAP_MONTHLY', p_store_id);
    
    -- Calculate bonus
    v_bonus := LEAST(p_weight_handled * v_bonus_rate, v_bonus_cap);
    
    -- Calculate penalty
    v_penalty := LEAST(p_negative_variance_kg * v_penalty_rate, v_penalty_cap);
    
    RETURN QUERY SELECT ROUND(v_bonus, 2), ROUND(v_penalty, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 11: FUNCTION - GENERATE MONTHLY PERFORMANCE SNAPSHOT
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_monthly_performance(
    p_store_id INTEGER,
    p_year INTEGER,
    p_month INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    v_user RECORD;
    v_total_points INTEGER;
    v_total_weight DECIMAL(10,3);
    v_normalized DECIMAL(10,4);
    v_grade staff_grade_enum;
    v_positive_kg DECIMAL(10,3);
    v_negative_kg DECIMAL(10,3);
    v_zero_days INTEGER;
    v_bonus DECIMAL(12,2);
    v_penalty DECIMAL(12,2);
    v_count INTEGER := 0;
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    v_start_date := make_date(p_year, p_month, 1);
    v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    
    -- Loop through all users who have activity in this store/month
    FOR v_user IN 
        SELECT DISTINCT sp.user_id
        FROM public.staff_points sp
        WHERE sp.store_id = p_store_id
          AND sp.effective_date >= v_start_date
          AND sp.effective_date <= v_end_date
    LOOP
        -- Calculate total points
        SELECT COALESCE(SUM(points_change), 0)
        INTO v_total_points
        FROM public.staff_points
        WHERE user_id = v_user.user_id
          AND store_id = p_store_id
          AND effective_date >= v_start_date
          AND effective_date <= v_end_date;
        
        -- Calculate total weight handled (from sales, processing)
        SELECT COALESCE(SUM(weight_handled), 0)
        INTO v_total_weight
        FROM public.staff_points
        WHERE user_id = v_user.user_id
          AND store_id = p_store_id
          AND effective_date >= v_start_date
          AND effective_date <= v_end_date;
        
        -- If no weight, estimate from variance logs
        IF v_total_weight = 0 THEN
            SELECT COALESCE(SUM(ABS(vl.expected_weight)), 1) INTO v_total_weight
            FROM public.variance_logs vl
            JOIN public.daily_settlements ds ON vl.settlement_id = ds.id
            WHERE ds.store_id = p_store_id
              AND ds.settlement_date >= v_start_date
              AND ds.settlement_date <= v_end_date
              AND ds.submitted_by = v_user.user_id;
        END IF;
        
        -- Ensure minimum weight to avoid division by zero
        v_total_weight := GREATEST(v_total_weight, 1);
        
        -- Calculate normalized score
        v_normalized := v_total_points::DECIMAL / v_total_weight;
        
        -- Calculate grade
        v_grade := public.calculate_grade(v_normalized, p_store_id);
        
        -- Get variance breakdown
        SELECT 
            COALESCE(SUM(CASE WHEN vl.variance_type = 'POSITIVE' THEN vl.variance_weight END), 0),
            COALESCE(SUM(CASE WHEN vl.variance_type = 'NEGATIVE' THEN vl.variance_weight END), 0)
        INTO v_positive_kg, v_negative_kg
        FROM public.variance_logs vl
        JOIN public.daily_settlements ds ON vl.settlement_id = ds.id
        WHERE ds.store_id = p_store_id
          AND ds.settlement_date >= v_start_date
          AND ds.settlement_date <= v_end_date
          AND ds.submitted_by = v_user.user_id;
        
        -- Count zero variance days
        SELECT COUNT(*)
        INTO v_zero_days
        FROM public.daily_settlements ds
        WHERE ds.store_id = p_store_id
          AND ds.settlement_date >= v_start_date
          AND ds.settlement_date <= v_end_date
          AND ds.submitted_by = v_user.user_id
          AND NOT EXISTS (
              SELECT 1 FROM public.variance_logs vl WHERE vl.settlement_id = ds.id
          );
        
        -- Calculate bonus/penalty
        SELECT * INTO v_bonus, v_penalty
        FROM public.calculate_incentive(v_grade, v_total_weight, v_negative_kg, p_store_id);
        
        -- Upsert monthly performance
        INSERT INTO public.staff_monthly_performance (
            user_id, store_id, year, month,
            total_points, total_weight_handled, normalized_score,
            positive_variance_kg, negative_variance_kg, zero_variance_days,
            grade, bonus_amount, penalty_amount
        ) VALUES (
            v_user.user_id, p_store_id, p_year, p_month,
            v_total_points, v_total_weight, v_normalized,
            v_positive_kg, v_negative_kg, v_zero_days,
            v_grade, v_bonus, v_penalty
        )
        ON CONFLICT (user_id, store_id, year, month) 
        DO UPDATE SET
            total_points = EXCLUDED.total_points,
            total_weight_handled = EXCLUDED.total_weight_handled,
            normalized_score = EXCLUDED.normalized_score,
            positive_variance_kg = EXCLUDED.positive_variance_kg,
            negative_variance_kg = EXCLUDED.negative_variance_kg,
            zero_variance_days = EXCLUDED.zero_variance_days,
            grade = EXCLUDED.grade,
            bonus_amount = EXCLUDED.bonus_amount,
            penalty_amount = EXCLUDED.penalty_amount,
            updated_at = NOW()
        WHERE NOT public.staff_monthly_performance.is_locked;
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 12: FUNCTION - LOCK MONTHLY PERFORMANCE
-- ============================================================================
CREATE OR REPLACE FUNCTION public.lock_monthly_performance(
    p_store_id INTEGER,
    p_year INTEGER,
    p_month INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.staff_monthly_performance
    SET is_locked = true,
        locked_at = NOW(),
        locked_by = auth.uid()
    WHERE store_id = p_store_id
      AND year = p_year
      AND month = p_month
      AND NOT is_locked;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 13: ADD PERMISSIONS
-- ============================================================================
INSERT INTO public.permissions (key, description) VALUES
    ('staffgrading.view', 'View staff grading and monthly performance'),
    ('staffgrading.generate', 'Generate monthly performance snapshots'),
    ('staffgrading.lock', 'Lock monthly performance records'),
    ('staffgrading.config', 'Configure grading thresholds and rates')
ON CONFLICT (key) DO NOTHING;

-- Assign to Admin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin' AND p.key IN (
    'staffgrading.view', 'staffgrading.generate', 
    'staffgrading.lock', 'staffgrading.config'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- STEP 14: UPDATED_AT TRIGGER
-- ============================================================================
CREATE TRIGGER update_monthly_perf_updated_at
    BEFORE UPDATE ON public.staff_monthly_performance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grading_config_updated_at
    BEFORE UPDATE ON public.staff_grading_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
