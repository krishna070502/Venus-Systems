-- =============================================================================
-- Stock Transfers System
-- =============================================================================
-- Enables inter-store inventory transfers with controlled workflow:
-- SENT → RECEIVED → APPROVED → inventory updated
-- Inventory changes ONLY occur after approval
-- =============================================================================

-- Create transfer status enum type if not exists
DO $$ BEGIN
    CREATE TYPE transfer_status AS ENUM ('SENT', 'RECEIVED', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- STOCK TRANSFERS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Store references
    from_store_id INT NOT NULL REFERENCES public.shops(id),
    to_store_id INT NOT NULL REFERENCES public.shops(id),
    
    -- Transfer details
    bird_type TEXT NOT NULL CHECK (bird_type IN ('BROILER', 'PARENT_CULL')),
    inventory_type TEXT NOT NULL CHECK (inventory_type IN ('LIVE', 'SKIN', 'SKINLESS')),
    weight_kg NUMERIC(10,3) NOT NULL CHECK (weight_kg > 0),
    bird_count INT DEFAULT 0,
    
    -- Dates and status
    transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT', 'RECEIVED', 'APPROVED', 'REJECTED')),
    
    -- User tracking
    initiated_by UUID REFERENCES auth.users(id),
    received_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    
    -- Timestamps
    received_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    
    -- Additional info
    notes TEXT,
    rejection_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT different_stores CHECK (from_store_id != to_store_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transfers_from_store ON public.stock_transfers(from_store_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_store ON public.stock_transfers(to_store_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON public.stock_transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_date ON public.stock_transfers(transfer_date);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all transfers (backend handles filtering)
CREATE POLICY "Authenticated users can view transfers" ON public.stock_transfers
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert transfers
CREATE POLICY "Authenticated users can create transfers" ON public.stock_transfers
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow updates (for status changes)
CREATE POLICY "Authenticated users can update transfers" ON public.stock_transfers
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);


-- =============================================================================
-- PERMISSIONS
-- =============================================================================
INSERT INTO public.permissions (key, description) VALUES
    ('inventory.transfer.view', 'View stock transfers'),
    ('inventory.transfer.create', 'Create new stock transfers'),
    ('inventory.transfer.backdate', 'Create backdated transfers'),
    ('inventory.transfer.cross_store', 'Transfer from any store'),
    ('inventory.transfer.receive', 'Accept incoming transfers'),
    ('inventory.transfer.approve', 'Approve transfers (updates inventory)')
ON CONFLICT (key) DO NOTHING;

-- Grant to Admin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin'
AND p.key IN (
    'inventory.transfer.view',
    'inventory.transfer.create',
    'inventory.transfer.backdate',
    'inventory.transfer.cross_store',
    'inventory.transfer.receive',
    'inventory.transfer.approve'
)
ON CONFLICT DO NOTHING;

-- Grant to Manager
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Manager'
AND p.key IN (
    'inventory.transfer.view',
    'inventory.transfer.create',
    'inventory.transfer.receive'
)
ON CONFLICT DO NOTHING;

-- Grant to Staff (view only)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Staff'
AND p.key IN (
    'inventory.transfer.view'
)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- =============================================================================
-- FUNCTION: Process stock transfer approval (Atomic)
-- =============================================================================
CREATE OR REPLACE FUNCTION process_stock_transfer_approval(
    p_transfer_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transfer RECORD;
    v_debit_id UUID;
    v_credit_id UUID;
BEGIN
    -- 1. Get and lock the transfer record
    SELECT * INTO v_transfer 
    FROM public.stock_transfers 
    WHERE id = p_transfer_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transfer not found';
    END IF;
    
    -- 2. Idempotency: If already approved, just return success
    IF v_transfer.status = 'APPROVED' THEN
        RETURN TRUE;
    END IF;
    
    -- 3. Validate status
    IF v_transfer.status NOT IN ('SENT', 'RECEIVED') THEN
        RAISE EXCEPTION 'Transfer must be in SENT or RECEIVED status to be approved';
    END IF;
    
    -- 4. Update transfer status
    UPDATE public.stock_transfers
    SET 
        status = 'APPROVED',
        approved_by = p_user_id,
        approved_at = NOW(),
        updated_at = NOW()
    WHERE id = p_transfer_id;
    
    -- 5. Create ledger entries
    -- Deduct from sender store
    INSERT INTO public.inventory_ledger (
        store_id, bird_type, inventory_type,
        quantity_change, bird_count_change, reason_code,
        ref_id, ref_type, user_id, notes
    ) VALUES (
        v_transfer.from_store_id,
        v_transfer.bird_type::bird_type_enum,
        v_transfer.inventory_type::inventory_type_enum,
        -v_transfer.weight_kg,
        -COALESCE(v_transfer.bird_count, 0),
        'STOCK_TRANSFER_OUT',
        v_transfer.id,
        'STOCK_TRANSFER',
        p_user_id,
        'Transfer to store ' || v_transfer.to_store_id
    ) RETURNING id INTO v_debit_id;
    
    -- Add to receiver store
    INSERT INTO public.inventory_ledger (
        store_id, bird_type, inventory_type,
        quantity_change, bird_count_change, reason_code,
        ref_id, ref_type, user_id, notes
    ) VALUES (
        v_transfer.to_store_id,
        v_transfer.bird_type::bird_type_enum,
        v_transfer.inventory_type::inventory_type_enum,
        v_transfer.weight_kg,
        COALESCE(v_transfer.bird_count, 0),
        'STOCK_TRANSFER_IN',
        v_transfer.id,
        'STOCK_TRANSFER',
        p_user_id,
        'Transfer from store ' || v_transfer.from_store_id
    ) RETURNING id INTO v_credit_id;
    
    RETURN TRUE;
END;
$$;

-- Add reason codes for transfers
INSERT INTO public.inventory_reason_codes (code, description, direction)
VALUES 
    ('STOCK_TRANSFER_OUT', 'Stock transferred out to another store', 'DEBIT'),
    ('STOCK_TRANSFER_IN', 'Stock transferred in from another store', 'CREDIT')
ON CONFLICT (code) DO NOTHING;


-- =============================================================================
-- Updated timestamp trigger
-- =============================================================================
CREATE OR REPLACE FUNCTION update_stock_transfers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_stock_transfers_updated_at ON public.stock_transfers;
CREATE TRIGGER trigger_stock_transfers_updated_at
    BEFORE UPDATE ON public.stock_transfers
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_transfers_updated_at();
