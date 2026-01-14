-- =============================================================================
-- SALES AND SALE ITEMS TABLES
-- =============================================================================
-- Migration: 049_sales.sql
-- Description: Creates sales and sale_items tables with inventory deduction
-- Date: 2026-01-13
-- =============================================================================

-- ============================================================================
-- CREATE RECEIPT NUMBER SEQUENCE
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS public.receipt_number_seq START 1;

-- ============================================================================
-- CREATE SALES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id INTEGER NOT NULL REFERENCES public.shops(id),
    
    -- Cashier info
    cashier_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Sale totals
    total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount >= 0),
    
    -- Payment
    payment_method payment_method_enum NOT NULL,
    
    -- Sale type (POS for retail, BULK for wholesale)
    sale_type sale_type_enum DEFAULT 'POS',
    
    -- Receipt tracking
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Idempotency key to prevent duplicate submissions
    idempotency_key UUID UNIQUE,
    
    -- Customer info (optional for bulk sales)
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CREATE SALE ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    sku_id UUID NOT NULL REFERENCES public.skus(id),
    
    -- Quantity sold
    weight DECIMAL(10,3) NOT NULL CHECK (weight > 0),
    
    -- Price at time of sale (snapshot for audit trail)
    price_snapshot DECIMAL(12,2) NOT NULL CHECK (price_snapshot > 0),
    
    -- Computed total
    total DECIMAL(12,2) GENERATED ALWAYS AS (weight * price_snapshot) STORED
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_sales_store ON public.sales(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_cashier ON public.sales(cashier_id);
CREATE INDEX IF NOT EXISTS idx_sales_created ON public.sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_store_date ON public.sales(store_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sales_payment ON public.sales(payment_method);
CREATE INDEX IF NOT EXISTS idx_sales_receipt ON public.sales(receipt_number);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sku ON public.sale_items(sku_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Sales: Admin can see all
CREATE POLICY sales_admin_all ON public.sales
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
        )
    );

-- Sales: Users can see/create for their assigned stores
CREATE POLICY sales_store_select ON public.sales
    FOR SELECT
    TO authenticated
    USING (
        store_id IN (
            SELECT us.shop_id FROM public.user_shops us WHERE us.user_id = auth.uid()
        )
    );

CREATE POLICY sales_store_insert ON public.sales
    FOR INSERT
    TO authenticated
    WITH CHECK (
        store_id IN (
            SELECT us.shop_id FROM public.user_shops us WHERE us.user_id = auth.uid()
        )
    );

-- Sale Items: Follow parent sale's access
CREATE POLICY sale_items_admin_all ON public.sale_items
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
        )
    );

CREATE POLICY sale_items_store_select ON public.sale_items
    FOR SELECT
    TO authenticated
    USING (
        sale_id IN (
            SELECT s.id FROM public.sales s 
            WHERE s.store_id IN (
                SELECT us.shop_id FROM public.user_shops us WHERE us.user_id = auth.uid()
            )
        )
    );

CREATE POLICY sale_items_store_insert ON public.sale_items
    FOR INSERT
    TO authenticated
    WITH CHECK (
        sale_id IN (
            SELECT s.id FROM public.sales s 
            WHERE s.store_id IN (
                SELECT us.shop_id FROM public.user_shops us WHERE us.user_id = auth.uid()
            )
        )
    );

-- ============================================================================
-- FUNCTION: Generate Receipt Number
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_receipt_number(p_store_id INTEGER)
RETURNS VARCHAR(50) AS $$
DECLARE
    v_store_code VARCHAR(20);
    v_date_part VARCHAR(8);
    v_seq_part VARCHAR(6);
BEGIN
    -- Get store code
    SELECT code INTO v_store_code FROM public.shops WHERE id = p_store_id;
    
    -- Date part: YYYYMMDD
    v_date_part := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    
    -- Sequence part
    v_seq_part := LPAD(nextval('receipt_number_seq')::text, 6, '0');
    
    RETURN v_store_code || '-' || v_date_part || '-' || v_seq_part;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Deduct Inventory on Sale Item Insert
-- ============================================================================
CREATE OR REPLACE FUNCTION public.on_sale_item_create()
RETURNS TRIGGER AS $$
DECLARE
    v_sale RECORD;
    v_sku RECORD;
BEGIN
    -- Get sale info
    SELECT * INTO v_sale FROM public.sales WHERE id = NEW.sale_id;
    
    -- Validate store is active
    IF NOT public.check_store_active(v_sale.store_id) THEN
        RAISE EXCEPTION 'Store % is in maintenance mode. Cannot create sale.', v_sale.store_id;
    END IF;
    
    -- Get SKU info for inventory mapping
    SELECT * INTO v_sku FROM public.skus WHERE id = NEW.sku_id;
    
    -- Validate sufficient stock
    IF NOT public.validate_stock_available(
        v_sale.store_id, 
        v_sku.bird_type, 
        v_sku.inventory_type, 
        NEW.weight
    ) THEN
        RAISE EXCEPTION 'Insufficient stock for SKU %. Required: % kg', v_sku.code, NEW.weight;
    END IF;
    
    -- DEBIT: Remove inventory
    PERFORM public.add_inventory_ledger_entry(
        p_store_id := v_sale.store_id,
        p_bird_type := v_sku.bird_type,
        p_inventory_type := v_sku.inventory_type,
        p_quantity_change := -NEW.weight,  -- Negative = debit
        p_reason_code := 'SALE_DEBIT',
        p_ref_id := v_sale.id,
        p_ref_type := 'SALE',
        p_user_id := v_sale.cashier_id,
        p_notes := 'Sale receipt: ' || v_sale.receipt_number
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_sale_item_ledger ON public.sale_items;
CREATE TRIGGER trigger_sale_item_ledger
    AFTER INSERT ON public.sale_items
    FOR EACH ROW
    EXECUTE FUNCTION public.on_sale_item_create();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
