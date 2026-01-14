-- =============================================================================
-- BULK SALES & CREDIT SUPPORT
-- =============================================================================
-- Migration: 065_bulk_sales_and_credit_support.sql
-- Description: Adds CREDIT payment method, updates auto-receipt logic to
--              track debt for credit sales, and manages payment status.
-- Date: 2026-01-13
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ADD CREDIT TO PAYMENT METHOD ENUM
-- -----------------------------------------------------------------------------
ALTER TYPE public.payment_method_enum ADD VALUE IF NOT EXISTS 'CREDIT';

-- -----------------------------------------------------------------------------
-- 2. REFINED AUTO-RECEIPT & DEBT TRACKING TRIGGER
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.on_sale_create_auto_receipt()
RETURNS TRIGGER AS $$
DECLARE
    v_customer_id UUID;
    v_receipt_id UUID;
    v_receipt_number VARCHAR(50);
    v_payment_status VARCHAR(20);
BEGIN
    -- Use provided customer_id or fallback to Walk-in
    -- Note: UI should enforce registered customers for BULK/CREDIT sales
    v_customer_id := COALESCE(NEW.customer_id, '00000000-0000-0000-0000-000000000000');

    -- Determine initial payment status
    IF NEW.payment_method = 'CREDIT' THEN
        v_payment_status := 'PENDING';
    ELSE
        v_payment_status := 'PAID';
    END IF;

    -- Update the sale's payment status (we use an update here because it's an AFTER trigger)
    -- This ensures the record identifies correctly in the UI
    UPDATE public.sales SET payment_status = v_payment_status WHERE id = NEW.id;

    -- 1. Financial Ledger: ALWAYS DEBIT Customer (The Sale)
    -- This records the obligation/revenue
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

    -- 2. Handle Payment/Receipt for non-CREDIT sales
    IF NEW.payment_method != 'CREDIT' THEN
        -- Generate receipt number
        v_receipt_number := public.generate_receipt_number();

        -- Create Receipt record
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
            NEW.payment_method::text,
            NEW.created_at,
            NEW.store_id,
            NEW.cashier_id
        ) RETURNING id INTO v_receipt_id;

        -- Financial Ledger: CREDIT Customer (The Payment/Receipt)
        -- This offsets the DEBIT recorded above
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
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 3. RE-CREATE TRIGGER
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_sale_auto_receipt ON public.sales;
CREATE TRIGGER trigger_sale_auto_receipt
    AFTER INSERT ON public.sales
    FOR EACH ROW
    EXECUTE FUNCTION public.on_sale_create_auto_receipt();

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
