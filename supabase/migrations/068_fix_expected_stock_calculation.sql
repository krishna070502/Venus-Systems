-- =============================================================================
-- FIX EXPECTED CALCULATION (ROBUST & VARIANCE LOGGING RESTORED)
-- =============================================================================
-- Migration: 068_fix_expected_stock_calculation.sql
-- Description: Restores variance logs, handles LIVE_COUNT, and adds safety checks.
-- Date: 2026-01-14
-- =============================================================================

-- 1. Fix Expected Stock Calculation with Dynamic Timezone
CREATE OR REPLACE FUNCTION public.calculate_expected_stock(
    p_store_id INTEGER,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB := '{}';
    v_row RECORD;
    v_timezone TEXT;
    v_start_timestamp TIMESTAMPTZ;
    v_end_timestamp TIMESTAMPTZ;
BEGIN
    -- Initialize structure for all expected bird types
    v_result := '{
        "BROILER": {"LIVE": 0, "LIVE_COUNT": 0, "SKIN": 0, "SKINLESS": 0},
        "PARENT_CULL": {"LIVE": 0, "LIVE_COUNT": 0, "SKIN": 0, "SKINLESS": 0}
    }'::jsonb;

    -- Fetch store's timezone, default to IST if not configured
    SELECT COALESCE(timezone, 'Asia/Kolkata') INTO v_timezone 
    FROM public.shops 
    WHERE id = p_store_id;
    
    v_timezone := COALESCE(v_timezone, 'Asia/Kolkata');

    -- Define boundaries using the store's local midnight (DST-safe)
    v_start_timestamp := (p_date::text || ' 00:00:00 ' || v_timezone)::TIMESTAMPTZ;
    v_end_timestamp := ((p_date + interval '1 day')::date || ' 00:00:00 ' || v_timezone)::TIMESTAMPTZ;

    -- Aggregate ledger entries up to v_end_timestamp to get CLOSING stock
    FOR v_row IN 
        SELECT 
            bird_type::text as bt,
            inventory_type::text as it,
            SUM(quantity_change)::DECIMAL(10,3) as qty,
            SUM(bird_count_change)::INTEGER as birds
        FROM public.inventory_ledger
        WHERE store_id = p_store_id
          AND created_at < v_end_timestamp
        GROUP BY bird_type, inventory_type
    LOOP
        IF v_result ? v_row.bt THEN
            IF v_row.it = 'LIVE' THEN
                v_result := jsonb_set(v_result, ARRAY[v_row.bt, 'LIVE'], '0'::jsonb);
                v_result := jsonb_set(v_result, ARRAY[v_row.bt, 'LIVE_COUNT'], to_jsonb(COALESCE(v_row.birds, 0)));
            ELSE
                v_result := jsonb_set(v_result, ARRAY[v_row.bt, v_row.it], to_jsonb(v_row.qty));
            END IF;
        END IF;
    END LOOP;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix Expected Sales Calculation with Dynamic Timezone
CREATE OR REPLACE FUNCTION public.calculate_expected_sales(
    p_store_id INTEGER,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB := '{"CASH": 0, "UPI": 0, "CARD": 0, "BANK": 0}';
    v_timezone TEXT;
    v_start_timestamp TIMESTAMPTZ;
    v_end_timestamp TIMESTAMPTZ;
BEGIN
    SELECT COALESCE(timezone, 'Asia/Kolkata') INTO v_timezone 
    FROM public.shops 
    WHERE id = p_store_id;
    
    v_timezone := COALESCE(v_timezone, 'Asia/Kolkata');

    v_start_timestamp := (p_date::text || ' 00:00:00 ' || v_timezone)::TIMESTAMPTZ;
    v_end_timestamp := ((p_date + interval '1 day')::date || ' 00:00:00 ' || v_timezone)::TIMESTAMPTZ;

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
      AND created_at >= v_start_timestamp
      AND created_at < v_end_timestamp;
    
    RETURN COALESCE(v_result, '{"CASH": 0, "UPI": 0, "CARD": 0, "BANK": 0}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update Variance Calculation (RESTORED VARIANCE LOGS)
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
    -- 1. Get and Lock settlement record to prevent race conditions
    SELECT * INTO v_settlement FROM public.daily_settlements WHERE id = p_settlement_id FOR UPDATE;
    
    IF v_settlement IS NULL THEN
        RAISE EXCEPTION 'Settlement not found';
    END IF;
    
    -- 2. Clean existing variance logs for this settlement to prevent duplicates
    DELETE FROM public.variance_logs WHERE settlement_id = p_settlement_id;

    -- 3. Fetch fresh expected data
    v_expected_stock := public.calculate_expected_stock(v_settlement.store_id, v_settlement.settlement_date);
    v_declared_stock := v_settlement.declared_stock;
    
    -- 4. Update settlement with latest expected data
    UPDATE public.daily_settlements 
    SET expected_stock = v_expected_stock,
        expected_sales = public.calculate_expected_sales(v_settlement.store_id, v_settlement.settlement_date)
    WHERE id = p_settlement_id;
    
    -- 5. Calculate variance and create logs
    FOR v_bird_type IN SELECT unnest(ARRAY['BROILER', 'PARENT_CULL'])
    LOOP
        v_variance_result := v_variance_result || jsonb_build_object(v_bird_type, '{}'::jsonb);
        
        -- VARIANCE TYPE 1: STOCK WEIGHT (SKIN/SKINLESS)
        FOR v_inv_type IN SELECT unnest(ARRAY['SKIN', 'SKINLESS'])
        LOOP
            v_expected := COALESCE((v_expected_stock -> v_bird_type ->> v_inv_type)::DECIMAL(10,3), 0);
            v_declared := COALESCE((v_declared_stock -> v_bird_type ->> v_inv_type)::DECIMAL(10,3), 0);
            v_variance := v_declared - v_expected;
            
            IF v_variance > 0.001 THEN v_variance_type := 'POSITIVE';
            ELSIF v_variance < -0.001 THEN v_variance_type := 'NEGATIVE';
            ELSE v_variance_type := NULL; END IF;
            
            v_variance_result := jsonb_set(v_variance_result, ARRAY[v_bird_type, v_inv_type],
                jsonb_build_object('expected', v_expected, 'declared', v_declared, 'variance', v_variance, 'type', COALESCE(v_variance_type::text, 'ZERO'))
            );

            IF v_variance_type IS NOT NULL THEN
                INSERT INTO public.variance_logs (
                    settlement_id, bird_type, inventory_type,
                    variance_type, expected_weight, declared_weight,
                    variance_weight, status
                ) VALUES (
                    p_settlement_id, v_bird_type::bird_type_enum, v_inv_type::inventory_type_enum,
                    v_variance_type, v_expected, v_declared, ABS(v_variance), 'PENDING'
                );
            END IF;
        END LOOP;

        -- VARIANCE TYPE 2: BIRD COUNT (LIVE)
        v_inv_type := 'LIVE';
        v_expected := COALESCE((v_expected_stock -> v_bird_type ->> 'LIVE_COUNT')::DECIMAL(10,3), 0);
        v_declared := COALESCE((v_declared_stock -> v_bird_type ->> 'LIVE_COUNT')::DECIMAL(10,3), 0);
        v_variance := v_declared - v_expected;

        IF v_variance > 0.1 THEN v_variance_type := 'POSITIVE';
        ELSIF v_variance < -0.1 THEN v_variance_type := 'NEGATIVE';
        ELSE v_variance_type := NULL; END IF;

        v_variance_result := jsonb_set(v_variance_result, ARRAY[v_bird_type, 'LIVE'],
            jsonb_build_object('expected_count', v_expected, 'declared_count', v_declared, 'variance', v_variance, 'type', COALESCE(v_variance_type::text, 'ZERO'))
        );

        IF v_variance_type IS NOT NULL THEN
            INSERT INTO public.variance_logs (
                settlement_id, bird_type, inventory_type,
                variance_type, expected_weight, declared_weight,
                variance_weight, status, notes
            ) VALUES (
                p_settlement_id, v_bird_type::bird_type_enum, 'LIVE'::inventory_type_enum,
                v_variance_type, v_expected, v_declared, ABS(v_variance), 'PENDING',
                'Variance in bird count (birds)'
            );
        END IF;
    END LOOP;
    
    UPDATE public.daily_settlements SET calculated_variance = v_variance_result WHERE id = p_settlement_id;
    RETURN v_variance_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
