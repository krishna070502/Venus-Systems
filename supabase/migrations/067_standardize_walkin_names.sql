-- =============================================================================
-- STANDARDIZE WALK-IN CUSTOMER NAMES & ATTRIBUTION
-- =============================================================================
-- Migration: 067_standardize_walkin_names.sql
-- Description: Unifies all versions of walk-in names and ensures correct
--              customer name fetching in the auto-receipt trigger.
-- Date: 2026-01-13
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. STANDARDIZE EXISTING DATA
-- -----------------------------------------------------------------------------

-- Update sales records to a unified "Walk-in Customer" name ONLY for walk-in accounts
UPDATE public.sales
SET customer_name = 'Walk-in Customer'
WHERE (customer_id = '00000000-0000-0000-0000-000000000000' OR customer_id IS NULL)
  AND (customer_name IS NULL OR customer_name = '' OR customer_name = 'Walk-in' OR customer_name = 'walk-in');

-- Ensure walk-in customer_id is backfilled if name is "Walk-in Customer"
UPDATE public.sales
SET customer_id = '00000000-0000-0000-0000-000000000000'
WHERE customer_name = 'Walk-in Customer'
  AND (customer_id IS NULL OR customer_id != '00000000-0000-0000-0000-000000000000');

-- -----------------------------------------------------------------------------
-- 2. REFINE AUTO-RECEIPT TRIGGER FUNCTION
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
    -- 1. Standardize Customer ID (Fallback to Walk-in UUID)
    v_customer_id := COALESCE(NEW.customer_id, '00000000-0000-0000-0000-000000000000');
    
    -- 2. Determine Customer Name (Priority: Provided > DB > Fallback)
    -- Start with what the frontend sent
    v_customer_name := NULLIF(NEW.customer_name, '');

    -- If the frontend didn't send a name, try to fetch it
    IF v_customer_name IS NULL OR v_customer_name = 'Walk-in' OR v_customer_name = 'walk-in' THEN
        IF v_customer_id = '00000000-0000-0000-0000-000000000000' THEN
            v_customer_name := 'Walk-in Customer';
        ELSE
            -- Registered customer: Fetch name from customers table
            SELECT name INTO v_customer_name 
            FROM public.customers 
            WHERE id = v_customer_id;
            
            -- Absolute fallback
            IF v_customer_name IS NULL THEN
                v_customer_name := 'Registered Customer';
            END IF;
        END IF;
    END IF;

    -- 3. Determine Payment Status
    IF NEW.payment_method = 'CREDIT' THEN
        v_payment_status := 'PENDING';
    ELSE
        v_payment_status := 'PAID';
    END IF;

    -- 4. Update the sale record (Atoms will update NEW if this was a BEFORE trigger, 
    -- but we are in AFTER trigger due to receipt generation needs)
    UPDATE public.sales 
    SET payment_status = v_payment_status,
        customer_name = v_customer_name,
        customer_id = v_customer_id
    WHERE id = NEW.id;

    -- 5. Financial Ledger: ALWAYS DEBIT Customer (The Sale)
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

    -- 6. Direct Receipt Generation for non-CREDIT sales
    IF NEW.payment_method != 'CREDIT' THEN
        -- Generate unique receipt number
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
