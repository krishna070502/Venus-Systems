-- =============================================================================
-- POS WALK-IN ENHANCEMENTS & LEDGER VISIBILITY
-- =============================================================================
-- Migration: 066_pos_walkin_ledger_fix.sql
-- Description: Ensures POS sales explicitly record 'Walk-in Customer' name
--              and balances the ledger correctly.
-- Date: 2026-01-13
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. UPDATE AUTO-RECEIPT TRIGGER FUNCTION
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.on_sale_create_auto_receipt()
RETURNS TRIGGER AS $$
DECLARE
    v_customer_id UUID;
    v_customer_name VARCHAR(255);
    v_receipt_id UUID;
    v_receipt_number VARCHAR(50);
    v_payment_status VARCHAR(20);
BEGIN
    -- Use provided customer_id or fallback to Walk-in
    v_customer_id := COALESCE(NEW.customer_id, '00000000-0000-0000-0000-000000000000');
    
    -- Ensure customer_name is set for records
    IF NEW.customer_name IS NULL OR NEW.customer_name = '' THEN
        IF v_customer_id = '00000000-0000-0000-0000-000000000000' THEN
            v_customer_name := 'Walk-in Customer';
        ELSE
            -- Try to get name from customers table if registered customer
            SELECT name INTO v_customer_name FROM public.customers WHERE id = v_customer_id;
        END IF;
    ELSE
        v_customer_name := NEW.customer_name;
    END IF;

    -- Determine initial payment status
    IF NEW.payment_method = 'CREDIT' THEN
        v_payment_status := 'PENDING';
    ELSE
        v_payment_status := 'PAID';
    END IF;

    -- Update the sale's payment status and name
    UPDATE public.sales 
    SET payment_status = v_payment_status,
        customer_name = v_customer_name,
        customer_id = v_customer_id
    WHERE id = NEW.id;

    -- 1. Financial Ledger: ALWAYS DEBIT Customer (The Sale)
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
-- MIGRATION COMPLETE
-- -----------------------------------------------------------------------------
