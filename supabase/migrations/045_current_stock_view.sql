-- =============================================================================
-- CURRENT STOCK MATERIALIZED VIEW
-- =============================================================================
-- Migration: 045_current_stock_view.sql
-- Description: Creates materialized view for real-time stock derived from ledger
-- Date: 2026-01-13
-- =============================================================================

-- ============================================================================
-- CREATE MATERIALIZED VIEW FOR CURRENT STOCK
-- ============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS public.current_stock AS
SELECT 
    store_id,
    bird_type,
    inventory_type,
    SUM(quantity_change)::DECIMAL(10,3) as current_qty,
    MAX(created_at) as last_updated
FROM public.inventory_ledger
GROUP BY store_id, bird_type, inventory_type;

-- ============================================================================
-- UNIQUE INDEX FOR CONCURRENT REFRESH
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_current_stock_pk 
    ON public.current_stock(store_id, bird_type, inventory_type);

-- Additional indexes for query performance
CREATE INDEX IF NOT EXISTS idx_current_stock_store 
    ON public.current_stock(store_id);

-- ============================================================================
-- FUNCTION TO REFRESH CURRENT STOCK VIEW
-- ============================================================================
CREATE OR REPLACE FUNCTION public.refresh_current_stock()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.current_stock;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER FUNCTION TO AUTO-REFRESH ON LEDGER INSERT
-- Note: For high-volume systems, consider async refresh via pg_cron
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trigger_refresh_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- For production with high volume, consider:
    -- 1. Debounced refresh (only refresh every N seconds)
    -- 2. Async refresh via pg_cron job
    -- 3. Skip refresh and query ledger directly with indexes
    
    -- For now, we use direct query approach in get_current_stock function
    -- and only refresh materialized view periodically
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PURCHASE COMMIT TRIGGER
-- When a purchase is committed, create ledger entry
-- ============================================================================
CREATE OR REPLACE FUNCTION public.on_purchase_commit()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger on status change to COMMITTED
    IF NEW.status = 'COMMITTED' AND (OLD.status IS NULL OR OLD.status != 'COMMITTED') THEN
        -- Validate store is active
        IF NOT public.check_store_active(NEW.store_id) THEN
            RAISE EXCEPTION 'Store % is in maintenance mode. Cannot commit purchase.', NEW.store_id;
        END IF;
        
        -- Create inventory ledger entry (credit LIVE inventory)
        PERFORM public.add_inventory_ledger_entry(
            p_store_id := NEW.store_id,
            p_bird_type := NEW.bird_type,
            p_inventory_type := 'LIVE'::inventory_type_enum,
            p_quantity_change := NEW.total_weight,
            p_reason_code := 'PURCHASE_RECEIVED',
            p_ref_id := NEW.id,
            p_ref_type := 'PURCHASE',
            p_user_id := COALESCE(NEW.committed_by, NEW.created_by),
            p_notes := 'Purchase from supplier: ' || NEW.supplier_id::text
        );
        
        -- Update committed tracking
        NEW.committed_by := auth.uid();
        NEW.committed_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on purchases table
DROP TRIGGER IF EXISTS trigger_purchase_commit ON public.purchases;
CREATE TRIGGER trigger_purchase_commit
    BEFORE UPDATE ON public.purchases
    FOR EACH ROW
    EXECUTE FUNCTION public.on_purchase_commit();

-- ============================================================================
-- SCHEDULE STOCK VIEW REFRESH (via pg_cron if available)
-- Run every 5 minutes to keep materialized view updated
-- ============================================================================
-- Note: Uncomment if pg_cron is installed
-- SELECT cron.schedule('refresh-stock-view', '*/5 * * * *', 'SELECT public.refresh_current_stock()');

-- ============================================================================
-- INITIAL REFRESH OF MATERIALIZED VIEW
-- ============================================================================
REFRESH MATERIALIZED VIEW public.current_stock;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
