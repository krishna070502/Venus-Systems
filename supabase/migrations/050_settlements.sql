-- =============================================================================
-- DAILY SETTLEMENTS AND VARIANCE LOGS
-- =============================================================================
-- Migration: 050_settlements.sql
-- Description: Creates settlement tables for day-end reconciliation
-- Date: 2026-01-13
-- =============================================================================

-- ============================================================================
-- CREATE DAILY SETTLEMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.daily_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id INTEGER NOT NULL REFERENCES public.shops(id),
    settlement_date DATE NOT NULL,
    
    -- Declared cash amounts by payment method
    declared_cash DECIMAL(12,2) DEFAULT 0 CHECK (declared_cash >= 0),
    declared_upi DECIMAL(12,2) DEFAULT 0 CHECK (declared_upi >= 0),
    declared_card DECIMAL(12,2) DEFAULT 0 CHECK (declared_card >= 0),
    declared_bank DECIMAL(12,2) DEFAULT 0 CHECK (declared_bank >= 0),
    
    -- Physical stock counts (JSON format for flexibility)
    -- Format: { "BROILER": { "LIVE": 50.5, "SKIN": 30.2, "SKINLESS": 20.1 }, "PARENT_CULL": {...} }
    declared_stock JSONB NOT NULL DEFAULT '{}',
    
    -- System-calculated expected values
    expected_sales JSONB DEFAULT '{}',  -- Expected sales by payment method
    expected_stock JSONB DEFAULT '{}',  -- Expected stock from ledger
    
    -- Variance calculation result
    -- Format: { "BROILER": { "LIVE": {"expected": 50, "declared": 48, "variance": -2, "type": "NEGATIVE"} } }
    calculated_variance JSONB DEFAULT '{}',
    
    -- Expenses
    expense_amount DECIMAL(12,2) DEFAULT 0 CHECK (expense_amount >= 0),
    expense_notes TEXT,
    expense_receipts JSONB DEFAULT '[]',  -- Array of receipt references
    
    -- Status workflow
    status settlement_status_enum DEFAULT 'DRAFT',
    
    -- Audit trail
    submitted_by UUID REFERENCES auth.users(id),
    submitted_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    locked_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One settlement per store per day
    CONSTRAINT unique_store_date UNIQUE (store_id, settlement_date)
);

-- ============================================================================
-- CREATE VARIANCE LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.variance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_id UUID NOT NULL REFERENCES public.daily_settlements(id) ON DELETE CASCADE,
    
    -- Variance details
    bird_type bird_type_enum NOT NULL,
    inventory_type inventory_type_enum NOT NULL,
    variance_type variance_type_enum NOT NULL,
    
    -- Quantities
    expected_weight DECIMAL(10,3) NOT NULL,
    declared_weight DECIMAL(10,3) NOT NULL,
    variance_weight DECIMAL(10,3) NOT NULL,  -- Absolute value
    
    -- Status
    status variance_log_status_enum DEFAULT 'PENDING',
    
    -- Resolution
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    notes TEXT,
    
    -- Link to ledger entry (created on approval/deduction)
    ledger_entry_id UUID REFERENCES public.inventory_ledger(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_settlements_store ON public.daily_settlements(store_id);
CREATE INDEX IF NOT EXISTS idx_settlements_date ON public.daily_settlements(settlement_date);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON public.daily_settlements(status);
CREATE INDEX IF NOT EXISTS idx_settlements_store_date ON public.daily_settlements(store_id, settlement_date);

CREATE INDEX IF NOT EXISTS idx_variance_settlement ON public.variance_logs(settlement_id);
CREATE INDEX IF NOT EXISTS idx_variance_status ON public.variance_logs(status);
CREATE INDEX IF NOT EXISTS idx_variance_type ON public.variance_logs(variance_type);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.daily_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variance_logs ENABLE ROW LEVEL SECURITY;

-- Settlements: Admin can see all
CREATE POLICY settlements_admin_all ON public.daily_settlements
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
        )
    );

-- Settlements: Users can see/manage for their assigned stores
CREATE POLICY settlements_store_select ON public.daily_settlements
    FOR SELECT
    TO authenticated
    USING (
        store_id IN (
            SELECT us.shop_id FROM public.user_shops us WHERE us.user_id = auth.uid()
        )
    );

CREATE POLICY settlements_store_insert ON public.daily_settlements
    FOR INSERT
    TO authenticated
    WITH CHECK (
        store_id IN (
            SELECT us.shop_id FROM public.user_shops us WHERE us.user_id = auth.uid()
        )
    );

CREATE POLICY settlements_store_update ON public.daily_settlements
    FOR UPDATE
    TO authenticated
    USING (
        status IN ('DRAFT', 'SUBMITTED') AND
        store_id IN (
            SELECT us.shop_id FROM public.user_shops us WHERE us.user_id = auth.uid()
        )
    );

-- Variance Logs: Follow settlement access
CREATE POLICY variance_admin_all ON public.variance_logs
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
        )
    );

CREATE POLICY variance_store_select ON public.variance_logs
    FOR SELECT
    TO authenticated
    USING (
        settlement_id IN (
            SELECT ds.id FROM public.daily_settlements ds
            WHERE ds.store_id IN (
                SELECT us.shop_id FROM public.user_shops us WHERE us.user_id = auth.uid()
            )
        )
    );

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================
CREATE TRIGGER update_settlements_updated_at
    BEFORE UPDATE ON public.daily_settlements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTION: Calculate Expected Stock at Settlement Time
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_expected_stock(
    p_store_id INTEGER,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB := '{}';
    v_row RECORD;
BEGIN
    -- Get current stock for each bird_type and inventory_type
    FOR v_row IN 
        SELECT 
            bird_type::text as bt,
            inventory_type::text as it,
            current_qty
        FROM public.get_current_stock(p_store_id)
    LOOP
        -- Build nested JSON structure
        IF NOT v_result ? v_row.bt THEN
            v_result := v_result || jsonb_build_object(v_row.bt, '{}'::jsonb);
        END IF;
        
        v_result := jsonb_set(
            v_result,
            ARRAY[v_row.bt, v_row.it],
            to_jsonb(v_row.current_qty)
        );
    END LOOP;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Calculate Expected Sales by Payment Method
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_expected_sales(
    p_store_id INTEGER,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB := '{"CASH": 0, "UPI": 0, "CARD": 0, "BANK": 0}';
BEGIN
    SELECT 
        jsonb_build_object(
            'CASH', COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN total_amount END), 0),
            'UPI', COALESCE(SUM(CASE WHEN payment_method = 'UPI' THEN total_amount END), 0),
            'CARD', COALESCE(SUM(CASE WHEN payment_method = 'CARD' THEN total_amount END), 0),
            'BANK', COALESCE(SUM(CASE WHEN payment_method = 'BANK' THEN total_amount END), 0)
        )
    INTO v_result
    FROM public.sales
    WHERE store_id = p_store_id
      AND DATE(created_at) = p_date;
    
    RETURN COALESCE(v_result, '{"CASH": 0, "UPI": 0, "CARD": 0, "BANK": 0}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Calculate Variance and Create Logs
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_settlement_variance(p_settlement_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_settlement RECORD;
    v_expected_stock JSONB;
    v_declared_stock JSONB;
    v_variance_result JSONB := '{}';
    v_bird_type TEXT;
    v_inv_type TEXT;
    v_expected DECIMAL(10,3);
    v_declared DECIMAL(10,3);
    v_variance DECIMAL(10,3);
    v_variance_type variance_type_enum;
BEGIN
    -- Get settlement record
    SELECT * INTO v_settlement FROM public.daily_settlements WHERE id = p_settlement_id;
    
    IF v_settlement IS NULL THEN
        RAISE EXCEPTION 'Settlement not found: %', p_settlement_id;
    END IF;
    
    -- Get expected stock
    v_expected_stock := public.calculate_expected_stock(v_settlement.store_id, v_settlement.settlement_date);
    v_declared_stock := v_settlement.declared_stock;
    
    -- Store expected stock in settlement
    UPDATE public.daily_settlements 
    SET expected_stock = v_expected_stock,
        expected_sales = public.calculate_expected_sales(v_settlement.store_id, v_settlement.settlement_date)
    WHERE id = p_settlement_id;
    
    -- Calculate variance for each bird_type and inventory_type
    FOR v_bird_type IN SELECT unnest(ARRAY['BROILER', 'PARENT_CULL'])
    LOOP
        v_variance_result := v_variance_result || jsonb_build_object(v_bird_type, '{}'::jsonb);
        
        FOR v_inv_type IN SELECT unnest(ARRAY['LIVE', 'SKIN', 'SKINLESS'])
        LOOP
            v_expected := COALESCE((v_expected_stock -> v_bird_type ->> v_inv_type)::DECIMAL(10,3), 0);
            v_declared := COALESCE((v_declared_stock -> v_bird_type ->> v_inv_type)::DECIMAL(10,3), 0);
            v_variance := v_declared - v_expected;
            
            -- Determine variance type
            IF v_variance > 0.001 THEN
                v_variance_type := 'POSITIVE';
            ELSIF v_variance < -0.001 THEN
                v_variance_type := 'NEGATIVE';
            ELSE
                v_variance_type := NULL;  -- No variance
            END IF;
            
            -- Store variance in result
            v_variance_result := jsonb_set(
                v_variance_result,
                ARRAY[v_bird_type, v_inv_type],
                jsonb_build_object(
                    'expected', v_expected,
                    'declared', v_declared,
                    'variance', v_variance,
                    'type', COALESCE(v_variance_type::text, 'ZERO')
                )
            );
            
            -- Create variance log if there is variance
            IF v_variance_type IS NOT NULL THEN
                INSERT INTO public.variance_logs (
                    settlement_id, bird_type, inventory_type,
                    variance_type, expected_weight, declared_weight,
                    variance_weight, status
                ) VALUES (
                    p_settlement_id,
                    v_bird_type::bird_type_enum,
                    v_inv_type::inventory_type_enum,
                    v_variance_type,
                    v_expected,
                    v_declared,
                    ABS(v_variance),
                    CASE 
                        WHEN v_variance_type = 'NEGATIVE' THEN 'PENDING'::variance_log_status_enum
                        ELSE 'PENDING'::variance_log_status_enum
                    END
                );
            END IF;
        END LOOP;
    END LOOP;
    
    -- Update settlement with calculated variance
    UPDATE public.daily_settlements 
    SET calculated_variance = v_variance_result
    WHERE id = p_settlement_id;
    
    RETURN v_variance_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
