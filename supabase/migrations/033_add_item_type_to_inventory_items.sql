-- Migration: Add item_type to inventory_items table
-- Description: Adds item_type column to differentiate between purchase and sales items
-- This is needed for stock calculations and proper inventory management
-- Created: 2025-12-07

-- Step 1: Add item_type column without NOT NULL constraint first
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS item_type VARCHAR(20)
CHECK (item_type IN ('purchase', 'sale'));

-- Step 2: Update all existing items to be 'sale' type (default for backward compatibility)
UPDATE public.inventory_items 
SET item_type = 'sale' 
WHERE item_type IS NULL;

-- Step 3: Now make the column NOT NULL with default value
ALTER TABLE public.inventory_items 
ALTER COLUMN item_type SET NOT NULL,
ALTER COLUMN item_type SET DEFAULT 'sale';

-- Step 4: Create index for efficient filtering by item_type
CREATE INDEX IF NOT EXISTS idx_inventory_items_item_type ON public.inventory_items(item_type);

-- Add comment
COMMENT ON COLUMN public.inventory_items.item_type IS 'Type of inventory item: purchase (raw materials like Broiler Birds, Feed) or sale (finished products)';

-- Examples of usage:
-- Purchase items: SELECT * FROM inventory_items WHERE item_type = 'purchase';
-- Sales items: SELECT * FROM inventory_items WHERE item_type = 'sale';
-- Stock calculations will use: WHERE item_type = 'purchase'
