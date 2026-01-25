-- =============================================================================
-- FIX PURCHASE COMMIT TRIGGER FOR FINANCIAL LEDGER
-- =============================================================================
-- Migration: 091_fix_purchase_commit_trigger.sql
-- Description: Ensures purchase commit correctly creates financial_ledger entry
-- Date: 2026-01-24
-- =============================================================================

-- Drop and recreate the trigger function to ensure latest version
DROP FUNCTION IF EXISTS public.on_purchase_commit() CASCADE;

CREATE OR REPLACE FUNCTION public.on_purchase_commit()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process when status changes to COMMITTED
    IF NEW.status = 'COMMITTED' AND 
       (OLD.status IS NULL OR OLD.status != 'COMMITTED') THEN
        
        -- Validate store is active
        IF NOT public.check_store_active(NEW.store_id) THEN
            RAISE EXCEPTION 'Store % is in maintenance mode. Cannot commit purchase.', NEW.store_id;
        END IF;
        
        -- 1. Add to INVENTORY ledger (LIVE stock) with bird count
        PERFORM public.add_inventory_ledger_entry(
            p_store_id := NEW.store_id,
            p_bird_type := NEW.bird_type,
            p_inventory_type := 'LIVE'::inventory_type_enum,
            p_quantity_change := NEW.total_weight,
            p_reason_code := 'PURCHASE_RECEIVED',
            p_ref_id := NEW.id,
            p_ref_type := 'PURCHASE',
            p_user_id := NEW.committed_by,
            p_notes := 'Purchase: ' || COALESCE(NEW.bird_count::text, '0') || ' birds, ' || NEW.total_weight || ' kg',
            p_bird_count_change := COALESCE(NEW.bird_count, 0)
        );

        -- 2. Add to FINANCIAL ledger (Credit Supplier - we owe them money)
        -- Outstanding = SUM(credit) - SUM(debit)
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
            created_by,
            created_at
        ) VALUES (
            NEW.store_id,
            'SUPPLIER',
            NEW.supplier_id,
            'PURCHASE',
            0,  -- Debit is 0 for purchases
            COALESCE(NEW.total_weight * NEW.price_per_kg, NEW.total_amount, 0),  -- Calculate credit directly
            'purchases',
            NEW.id,
            'Purchase: ' || COALESCE(NEW.bird_count::text, '0') || ' birds, ' || NEW.total_weight || ' kg @ ₹' || NEW.price_per_kg || '/kg',
            NEW.committed_by,
            NOW()
        );
        
        -- Update commit timestamp
        NEW.committed_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_purchase_commit ON public.purchases;
CREATE TRIGGER trigger_purchase_commit
    BEFORE UPDATE ON public.purchases
    FOR EACH ROW
    EXECUTE FUNCTION public.on_purchase_commit();

-- =============================================================================
-- FIX EXISTING BAD DATA
-- =============================================================================
-- Update any financial_ledger entries that have NULL or zero credit
UPDATE public.financial_ledger fl
SET 
    credit = COALESCE(
        (SELECT p.total_weight * p.price_per_kg FROM public.purchases p WHERE p.id = fl.ref_id),
        (SELECT p.total_amount FROM public.purchases p WHERE p.id = fl.ref_id),
        0
    ),
    debit = COALESCE(fl.debit, 0),
    created_at = COALESCE(
        fl.created_at,
        (SELECT p.committed_at FROM public.purchases p WHERE p.id = fl.ref_id),
        NOW()
    )
WHERE fl.transaction_type = 'PURCHASE'
  AND fl.ref_table = 'purchases'
  AND (fl.credit IS NULL OR fl.credit = 0 OR fl.created_at IS NULL);

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
