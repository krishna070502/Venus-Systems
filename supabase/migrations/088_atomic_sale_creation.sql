-- =============================================================================
-- ATOMIC SALE CREATION - RACE CONDITION FIX
-- =============================================================================
-- Migration: 088_atomic_sale_creation.sql
-- Description: Creates an atomic function for sale creation that uses row-level
--              locking to prevent race conditions where concurrent sales could
--              oversell inventory.
-- Date: 2026-01-23
-- =============================================================================

-- ============================================================================
-- FUNCTION: Create Sale Atomically with Row Locking
-- ============================================================================
-- This function performs all sale creation steps within a single transaction:
-- 1. Checks idempotency key (returns existing sale if found)
-- 2. Validates store is active
-- 3. Locks inventory rows with FOR UPDATE to prevent concurrent modification
-- 4. Validates stock availability for all items
-- 5. Generates receipt number
-- 6. Creates sale record (triggers on_sale_create_auto_receipt)
-- 7. Creates sale items (triggers on_sale_item_create for each)
-- 8. Returns the complete sale record
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_sale_atomic(
    p_store_id INTEGER,
    p_cashier_id UUID,
    p_payment_method TEXT,
    p_sale_type TEXT,
    p_items JSONB,
    p_idempotency_key UUID DEFAULT NULL,
    p_customer_id UUID DEFAULT NULL,
    p_customer_name TEXT DEFAULT NULL,
    p_customer_phone TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_sale_id UUID;
    v_receipt_number TEXT;
    v_total DECIMAL(12,2) := 0;
    v_item RECORD;
    v_sku RECORD;
    v_available DECIMAL(10,3);
    v_existing_sale JSONB;
    v_sale_record JSONB;
BEGIN
    -- =========================================================================
    -- STEP 1: Check idempotency key first (avoid duplicate processing)
    -- =========================================================================
    IF p_idempotency_key IS NOT NULL THEN
        SELECT row_to_json(s)::jsonb INTO v_existing_sale
        FROM public.sales s
        WHERE s.idempotency_key = p_idempotency_key;
        
        IF v_existing_sale IS NOT NULL THEN
            -- Return existing sale (idempotent behavior)
            RETURN v_existing_sale;
        END IF;
    END IF;

    -- =========================================================================
    -- STEP 2: Validate store is active
    -- =========================================================================
    IF NOT public.check_store_active(p_store_id) THEN
        RAISE EXCEPTION 'Store is in maintenance mode' 
            USING ERRCODE = 'P0001';
    END IF;

    -- =========================================================================
    -- STEP 3 & 4: Lock inventory rows and validate stock for all items
    -- =========================================================================
    -- We iterate through items, lock the relevant inventory rows, and validate
    -- stock in one pass. PostgreSQL doesn't allow FOR UPDATE with aggregates,
    -- so we lock first, then aggregate separately.
    -- =========================================================================
    FOR v_item IN 
        SELECT * FROM jsonb_to_recordset(p_items) 
        AS x(sku_id UUID, weight DECIMAL(10,3), price_snapshot DECIMAL(12,2))
    LOOP
        -- Get SKU details
        SELECT * INTO v_sku FROM public.skus WHERE id = v_item.sku_id;
        
        IF v_sku IS NULL THEN
            RAISE EXCEPTION 'SKU % not found', v_item.sku_id
                USING ERRCODE = 'P0002';
        END IF;
        
        -- Lock the inventory ledger rows for this store/bird_type/inventory_type
        -- This prevents concurrent transactions from modifying these rows
        -- We use a dummy SELECT to acquire the locks, then aggregate separately
        PERFORM 1 FROM public.inventory_ledger
        WHERE store_id = p_store_id
          AND bird_type = v_sku.bird_type
          AND inventory_type = v_sku.inventory_type
        FOR UPDATE;
        
        -- Now calculate available stock (rows are locked, safe to aggregate)
        SELECT COALESCE(SUM(quantity_change), 0) INTO v_available
        FROM public.inventory_ledger
        WHERE store_id = p_store_id
          AND bird_type = v_sku.bird_type
          AND inventory_type = v_sku.inventory_type;
        
        -- Validate sufficient stock
        IF v_available < v_item.weight THEN
            RAISE EXCEPTION 'Insufficient stock for %. Available: % kg, Required: % kg', 
                v_sku.name, v_available, v_item.weight
                USING ERRCODE = 'P0003';
        END IF;
        
        -- Accumulate total
        v_total := v_total + (v_item.weight * v_item.price_snapshot);
    END LOOP;

    -- =========================================================================
    -- STEP 5: Generate receipt number
    -- =========================================================================
    v_receipt_number := public.generate_receipt_number(p_store_id);

    -- =========================================================================
    -- STEP 6: Create sale record
    -- =========================================================================
    -- This INSERT triggers on_sale_create_auto_receipt which:
    -- - Creates financial ledger entries
    -- - Creates receipt record (for non-CREDIT sales)
    -- - Updates payment_status
    -- =========================================================================
    INSERT INTO public.sales (
        store_id,
        cashier_id,
        total_amount,
        payment_method,
        sale_type,
        receipt_number,
        idempotency_key,
        customer_id,
        customer_name,
        customer_phone,
        notes
    ) VALUES (
        p_store_id,
        p_cashier_id,
        v_total,
        p_payment_method::payment_method_enum,
        p_sale_type::sale_type_enum,
        v_receipt_number,
        p_idempotency_key,
        p_customer_id,
        p_customer_name,
        p_customer_phone,
        p_notes
    ) RETURNING id INTO v_sale_id;

    -- =========================================================================
    -- STEP 7: Create sale items
    -- =========================================================================
    -- Each INSERT triggers on_sale_item_create which:
    -- - Re-validates stock (will pass since we hold locks)
    -- - Deducts inventory via add_inventory_ledger_entry
    -- =========================================================================
    FOR v_item IN 
        SELECT * FROM jsonb_to_recordset(p_items) 
        AS x(sku_id UUID, weight DECIMAL(10,3), price_snapshot DECIMAL(12,2))
    LOOP
        INSERT INTO public.sale_items (
            sale_id,
            sku_id,
            weight,
            price_snapshot
        ) VALUES (
            v_sale_id,
            v_item.sku_id,
            v_item.weight,
            v_item.price_snapshot
        );
    END LOOP;

    -- =========================================================================
    -- STEP 8: Return the complete sale record
    -- =========================================================================
    SELECT row_to_json(s)::jsonb INTO v_sale_record
    FROM public.sales s
    WHERE s.id = v_sale_id;

    RETURN v_sale_record;

EXCEPTION
    WHEN OTHERS THEN
        -- Re-raise with original error message for proper handling
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT EXECUTE PERMISSION
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.create_sale_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_sale_atomic TO service_role;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- 
-- Usage from backend:
-- 
-- result = supabase.rpc("create_sale_atomic", {
--     "p_store_id": 1,
--     "p_cashier_id": "uuid-here",
--     "p_payment_method": "CASH",
--     "p_sale_type": "POS",
--     "p_items": [{"sku_id": "...", "weight": 2.5, "price_snapshot": 180.00}],
--     "p_idempotency_key": "uuid-here"
-- }).execute()
-- 
-- ============================================================================
