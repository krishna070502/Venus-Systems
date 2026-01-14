-- =============================================================================
-- MIGRATE INVENTORY_ITEMS TO SKUS - UNIFY UNDER LEDGER SYSTEM
-- =============================================================================
-- Migration: 054_migrate_inventory_to_skus.sql
-- Description: Migrates existing inventory_items to skus and deprecates old tables
-- Date: 2026-01-13
-- =============================================================================

-- ============================================================================
-- STEP 1: ADD LEGACY_ID TO SKUS FOR TRACEABILITY
-- ============================================================================
ALTER TABLE public.skus ADD COLUMN IF NOT EXISTS legacy_inventory_item_id INTEGER;

-- ============================================================================
-- STEP 2: MAP EXISTING INVENTORY_ITEMS TO SKUS
-- ============================================================================
-- Create mapping table for reference during migration
CREATE TABLE IF NOT EXISTS public.inventory_items_sku_mapping (
    inventory_item_id INTEGER PRIMARY KEY REFERENCES public.inventory_items(id),
    sku_id UUID REFERENCES public.skus(id),
    bird_type bird_type_enum,
    inventory_type inventory_type_enum,
    migration_notes TEXT,
    migrated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 3: INSERT MAPPINGS AND CREATE SKUS FOR EXISTING ITEMS
-- ============================================================================
-- This migration creates SKUs from inventory_items with intelligent mapping

-- First, let's handle the poultry items that can be mapped to our system
DO $$
DECLARE
    item RECORD;
    v_sku_id UUID;
    v_bird_type bird_type_enum;
    v_inv_type inventory_type_enum;
BEGIN
    FOR item IN 
        SELECT * FROM public.inventory_items 
        WHERE category IN ('Poultry', 'Processed', 'Marinated', 'Ready-to-Cook', 'Offal')
        AND item_type = 'sale'
    LOOP
        -- Determine bird_type (default to BROILER for now)
        v_bird_type := 'BROILER';
        
        -- Check if it's a country/desi chicken item
        IF item.name ILIKE '%country%' OR item.name ILIKE '%desi%' OR item.name ILIKE '%parent%' THEN
            v_bird_type := 'PARENT_CULL';
        END IF;
        
        -- Determine inventory_type based on item characteristics
        IF item.name ILIKE '%whole%' OR item.name ILIKE '%live%' THEN
            v_inv_type := 'LIVE';
        ELSIF item.name ILIKE '%skinless%' OR item.name ILIKE '%breast%' OR 
              item.name ILIKE '%boneless%' OR item.name ILIKE '%minced%' OR
              item.name ILIKE '%fillet%' THEN
            v_inv_type := 'SKINLESS';
        ELSE
            -- Default: dressed with skin
            v_inv_type := 'SKIN';
        END IF;
        
        -- Check if SKU already exists with same code
        SELECT id INTO v_sku_id FROM public.skus WHERE code = item.sku;
        
        IF v_sku_id IS NULL THEN
            -- Create new SKU
            INSERT INTO public.skus (
                name, code, description, bird_type, inventory_type, 
                unit, is_active, legacy_inventory_item_id
            ) VALUES (
                item.name,
                item.sku,
                'Migrated from inventory_items (ID: ' || item.id || ')',
                v_bird_type,
                v_inv_type,
                item.unit,
                item.is_active,
                item.id
            )
            RETURNING id INTO v_sku_id;
        END IF;
        
        -- Record the mapping
        INSERT INTO public.inventory_items_sku_mapping (
            inventory_item_id, sku_id, bird_type, inventory_type, migration_notes
        ) VALUES (
            item.id, v_sku_id, v_bird_type, v_inv_type,
            'Auto-mapped from category: ' || COALESCE(item.category, 'Unknown')
        )
        ON CONFLICT (inventory_item_id) DO UPDATE SET
            sku_id = EXCLUDED.sku_id,
            migrated_at = NOW();
    END LOOP;
END $$;

-- ============================================================================
-- STEP 4: MIGRATE DAILY_SHOP_PRICES TO STORE_PRICES
-- ============================================================================
INSERT INTO public.store_prices (store_id, sku_id, price, effective_date, created_at)
SELECT 
    dsp.shop_id,
    m.sku_id,
    dsp.price,
    dsp.valid_date,
    dsp.created_at
FROM public.daily_shop_prices dsp
JOIN public.inventory_items_sku_mapping m ON dsp.item_id = m.inventory_item_id
WHERE m.sku_id IS NOT NULL
ON CONFLICT (store_id, sku_id, effective_date) DO UPDATE SET
    price = EXCLUDED.price;

-- ============================================================================
-- STEP 5: CREATE VIEW FOR BACKWARD COMPATIBILITY
-- ============================================================================
-- This view allows old code to continue working during transition
CREATE OR REPLACE VIEW public.inventory_items_v2 AS
SELECT 
    ii.id,
    ii.name,
    ii.sku,
    ii.category,
    ii.base_price,
    ii.unit,
    ii.is_active,
    ii.item_type,
    ii.created_at,
    ii.updated_at,
    m.sku_id AS new_sku_id,
    s.bird_type,
    s.inventory_type
FROM public.inventory_items ii
LEFT JOIN public.inventory_items_sku_mapping m ON ii.id = m.inventory_item_id
LEFT JOIN public.skus s ON m.sku_id = s.id;

-- ============================================================================
-- STEP 6: CREATE VIEW FOR DAILY_SHOP_PRICES BACKWARD COMPATIBILITY
-- ============================================================================
CREATE OR REPLACE VIEW public.daily_shop_prices_v2 AS
SELECT 
    dsp.id,
    dsp.shop_id,
    dsp.item_id,
    dsp.valid_date,
    dsp.price,
    dsp.created_at,
    dsp.updated_at,
    m.sku_id AS new_sku_id,
    s.bird_type,
    s.inventory_type
FROM public.daily_shop_prices dsp
LEFT JOIN public.inventory_items_sku_mapping m ON dsp.item_id = m.inventory_item_id
LEFT JOIN public.skus s ON m.sku_id = s.id;

-- ============================================================================
-- STEP 7: ADD DEPRECATION COMMENTS
-- ============================================================================
COMMENT ON TABLE public.inventory_items IS 
    'DEPRECATED: Use public.skus instead. This table is maintained for backward compatibility only. See migration 054.';

COMMENT ON TABLE public.daily_shop_prices IS 
    'DEPRECATED: Use public.store_prices instead. This table is maintained for backward compatibility only. See migration 054.';

-- ============================================================================
-- STEP 8: CREATE FUNCTION TO GET UNIFIED PRICE
-- ============================================================================
-- This function works with both old and new systems
CREATE OR REPLACE FUNCTION public.get_item_price(
    p_store_id INTEGER,
    p_identifier TEXT,  -- Can be SKU code, sku_id (UUID), or inventory_item_id (INTEGER)
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL(12,2) AS $$
DECLARE
    v_price DECIMAL(12,2);
    v_sku_id UUID;
BEGIN
    -- Try to parse as UUID first (new SKU system)
    BEGIN
        v_sku_id := p_identifier::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_sku_id := NULL;
    END;
    
    IF v_sku_id IS NOT NULL THEN
        -- Direct SKU lookup
        SELECT price INTO v_price
        FROM public.store_prices
        WHERE store_id = p_store_id
          AND sku_id = v_sku_id
          AND effective_date <= p_date
        ORDER BY effective_date DESC
        LIMIT 1;
        
        RETURN v_price;
    END IF;
    
    -- Try as SKU code
    SELECT sp.price INTO v_price
    FROM public.store_prices sp
    JOIN public.skus s ON sp.sku_id = s.id
    WHERE sp.store_id = p_store_id
      AND s.code = p_identifier
      AND sp.effective_date <= p_date
    ORDER BY sp.effective_date DESC
    LIMIT 1;
    
    IF v_price IS NOT NULL THEN
        RETURN v_price;
    END IF;
    
    -- Try as old inventory_item_id (legacy support)
    BEGIN
        SELECT sp.price INTO v_price
        FROM public.store_prices sp
        JOIN public.inventory_items_sku_mapping m ON sp.sku_id = m.sku_id
        WHERE sp.store_id = p_store_id
          AND m.inventory_item_id = p_identifier::INTEGER
          AND sp.effective_date <= p_date
        ORDER BY sp.effective_date DESC
        LIMIT 1;
        
        RETURN v_price;
    EXCEPTION WHEN OTHERS THEN
        RETURN NULL;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 9: UPDATE SALE_ITEMS TO SUPPORT LEGACY LOOKUPS
-- ============================================================================
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS legacy_item_id INTEGER;

-- ============================================================================
-- STEP 10: LOG MIGRATION SUMMARY
-- ============================================================================
DO $$
DECLARE
    v_items_migrated INTEGER;
    v_prices_migrated INTEGER;
    v_unmapped_items INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_items_migrated FROM public.inventory_items_sku_mapping WHERE sku_id IS NOT NULL;
    SELECT COUNT(*) INTO v_prices_migrated FROM public.store_prices WHERE created_at > NOW() - INTERVAL '1 minute';
    SELECT COUNT(*) INTO v_unmapped_items FROM public.inventory_items ii 
        WHERE NOT EXISTS (SELECT 1 FROM public.inventory_items_sku_mapping m WHERE m.inventory_item_id = ii.id);
    
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE '  - Items migrated to SKUs: %', v_items_migrated;
    RAISE NOTICE '  - Prices migrated to store_prices: %', v_prices_migrated;
    RAISE NOTICE '  - Unmapped items (non-poultry): %', v_unmapped_items;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
