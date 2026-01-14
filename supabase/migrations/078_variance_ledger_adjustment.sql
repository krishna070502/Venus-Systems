-- =============================================================================
-- VARIANCE LEDGER AUTO-ADJUSTMENT
-- =============================================================================
-- Migration: 078_variance_ledger_adjustment.sql
-- Description: Automatically creates inventory ledger entries when variance is resolved
-- This ensures the inventory ledger accurately reflects physical stock after variance
-- =============================================================================

-- ============================================================================
-- ADD VARIANCE_LOSS AND VARIANCE_FOUND REASON CODES
-- ============================================================================
INSERT INTO public.inventory_reason_codes (code, name, description, direction, is_active)
VALUES 
    ('VARIANCE_LOSS', 'Variance Loss', 'Stock write-off from negative variance', 'OUT', TRUE),
    ('VARIANCE_FOUND', 'Variance Found', 'Found stock from positive variance', 'IN', TRUE)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- UPDATE ON_VARIANCE_RESOLVED TRIGGER TO CREATE LEDGER ENTRIES
-- ============================================================================
CREATE OR REPLACE FUNCTION public.on_variance_resolved()
RETURNS TRIGGER AS $$
DECLARE
    v_settlement RECORD;
    v_points INTEGER;
    v_reason VARCHAR(100);
    v_reason_code VARCHAR(50);
    v_submitter_id UUID;
    v_ledger_reason_code VARCHAR(50);
    v_quantity_change DECIMAL(10,3);
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

    -- ========================================================================
    -- 1. CREATE INVENTORY LEDGER ENTRY FOR STOCK ADJUSTMENT
    -- ========================================================================
    IF NEW.variance_type = 'POSITIVE' AND NEW.status = 'APPROVED' THEN
        -- Positive variance: Found extra stock - add to inventory
        v_ledger_reason_code := 'VARIANCE_FOUND';
        v_quantity_change := NEW.variance_weight;  -- Positive value
        
    ELSIF NEW.variance_type = 'NEGATIVE' AND NEW.status = 'DEDUCTED' THEN
        -- Negative variance: Lost stock - subtract from inventory
        v_ledger_reason_code := 'VARIANCE_LOSS';
        v_quantity_change := -NEW.variance_weight;  -- Negative value (loss)
    END IF;
    
    -- Insert ledger entry if we have a valid adjustment
    IF v_ledger_reason_code IS NOT NULL THEN
        -- Check if ledger entry already exists for this variance
        IF NOT EXISTS (
            SELECT 1 FROM public.inventory_ledger
            WHERE ref_id = NEW.id AND ref_type = 'VARIANCE'
        ) THEN
            INSERT INTO public.inventory_ledger (
                store_id, bird_type, inventory_type,
                quantity_change, reason_code,
                ref_id, ref_type, user_id, notes
            ) VALUES (
                v_settlement.store_id,
                NEW.bird_type,
                NEW.inventory_type,
                v_quantity_change,
                v_ledger_reason_code,
                NEW.id,
                'VARIANCE',
                COALESCE(NEW.resolved_by, v_submitter_id),
                format('Variance resolved: %s %.3fkg %s %s',
                       CASE WHEN NEW.variance_type = 'POSITIVE' THEN 'Found' ELSE 'Lost' END,
                       ABS(NEW.variance_weight),
                       NEW.bird_type,
                       NEW.inventory_type)
            );
        END IF;
    END IF;

    -- ========================================================================
    -- 2. AWARD/DEDUCT STAFF POINTS (existing logic)
    -- ========================================================================
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

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.on_variance_resolved() TO authenticated;
GRANT EXECUTE ON FUNCTION public.on_variance_resolved() TO service_role;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Now when variance is resolved:
-- 1. NEGATIVE VARIANCE (DEDUCTED): 
--    - Creates ledger entry: VARIANCE_LOSS with negative quantity
--    - Deducts staff points
-- 2. POSITIVE VARIANCE (APPROVED):
--    - Creates ledger entry: VARIANCE_FOUND with positive quantity  
--    - Awards staff points
-- ============================================================================
