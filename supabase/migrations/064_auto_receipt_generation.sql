-- =============================================================================
-- AUTOMATIC RECEIPT GENERATION & WALK-IN CUSTOMER
-- =============================================================================
-- Migration: 064_auto_receipt_generation.sql
-- Description: Seeds a default walk-in customer and adds a trigger to 
--              automatically generate receipts for POS sales.
-- Date: 2026-01-13
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. SEED DEFAULT WALK-IN CUSTOMER
-- -----------------------------------------------------------------------------
INSERT INTO public.customers (id, name, status, notes)
VALUES ('00000000-0000-0000-0000-000000000000', 'Walk-in Customer', 'ACTIVE', 'Default customer for POS sales')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. CREATE AUTO-RECEIPT TRIGGER FUNCTION
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.on_sale_create_auto_receipt()
RETURNS TRIGGER AS $$
DECLARE
    v_customer_id UUID;
    v_receipt_id UUID;
    v_receipt_number VARCHAR(50);
BEGIN
    -- Only auto-generate receipt for non-CREDIT sales (CASH, UPI, CARD, BANK)
    -- CREDIT sales (DIRECT sale type) require manual settlement or the invoice stays pending
    IF NEW.payment_method = 'CREDIT' THEN
        RETURN NEW;
    END IF;

    -- Use provided customer_id or fallback to Walk-in
    v_customer_id := COALESCE(NEW.customer_id, '00000000-0000-0000-0000-000000000000');

    -- Generate receipt number
    v_receipt_number := public.generate_receipt_number();

    -- 1. Create Receipt record
    INSERT INTO public.receipts (
        receipt_number,
        sale_id,
        customer_id,
        amount,
        payment_method,
        receipt_date,
        store_id,
        created_by
    ) VALUES (
        v_receipt_number,
        NEW.id,
        v_customer_id,
        NEW.total_amount,
        NEW.payment_method::text, -- Cast to varchar for receipts table
        NEW.created_at,
        NEW.store_id,
        NEW.cashier_id
    ) RETURNING id INTO v_receipt_id;

    -- 2. Financial Ledger: DEBIT Customer (The Sale)
    INSERT INTO public.financial_ledger (
        store_id,
        entity_type,
        entity_id,
        transaction_type,
        debit,
        credit,
        ref_table,
        ref_id,
        notes,
        created_by
    ) VALUES (
        NEW.store_id,
        'CUSTOMER',
        v_customer_id,
        'SALE',
        NEW.total_amount,
        0,
        'sales',
        NEW.id,
        'Sale receipt: ' || NEW.receipt_number,
        NEW.cashier_id
    );

    -- 3. Financial Ledger: CREDIT Customer (The Payment/Receipt)
    INSERT INTO public.financial_ledger (
        store_id,
        entity_type,
        entity_id,
        transaction_type,
        debit,
        credit,
        ref_table,
        ref_id,
        notes,
        created_by
    ) VALUES (
        NEW.store_id,
        'CUSTOMER',
        v_customer_id,
        'RECEIPT',
        0,
        NEW.total_amount,
        'receipts',
        v_receipt_id,
        'Payment for sale: ' || NEW.receipt_number,
        NEW.cashier_id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 3. CREATE TRIGGER
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_sale_auto_receipt ON public.sales;
CREATE TRIGGER trigger_sale_auto_receipt
    AFTER INSERT ON public.sales
    FOR EACH ROW
    EXECUTE FUNCTION public.on_sale_create_auto_receipt();

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
