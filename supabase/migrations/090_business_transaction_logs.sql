-- =============================================================================
-- 090_BUSINESS_TRANSACTION_LOGS
-- =============================================================================
-- Comprehensive logging for all business transactions (sales, purchases,
-- expenses, transfers, settlements, processing).
-- Provides full accountability and audit trail for store operations.

CREATE TABLE IF NOT EXISTS public.business_transaction_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    store_id INTEGER REFERENCES public.shops(id) ON DELETE SET NULL,
    transaction_type TEXT NOT NULL,  -- SALE, PURCHASE, EXPENSE, TRANSFER, SETTLEMENT, PROCESSING
    action TEXT NOT NULL,            -- CREATE, COMMIT, APPROVE, REJECT, CANCEL, VOID, LOCK, SUBMIT, RECEIVE
    resource_id TEXT,                -- UUID/ID of the related record
    amount DECIMAL(15,2),            -- Monetary value (if applicable)
    quantity DECIMAL(15,3),          -- Quantity (weight in kg for poultry, count for items)
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.business_transaction_logs ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
    -- Admins can view all transaction logs
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'business_transaction_logs' AND policyname = 'Admins can view all transaction logs'
    ) THEN
        CREATE POLICY "Admins can view all transaction logs"
          ON public.business_transaction_logs FOR SELECT
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM user_roles ur
              JOIN roles r ON ur.role_id = r.id
              WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
            )
          );
    END IF;

    -- Store managers can view logs for their assigned store
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'business_transaction_logs' AND policyname = 'Users can view their store transaction logs'
    ) THEN
        CREATE POLICY "Users can view their store transaction logs"
          ON public.business_transaction_logs FOR SELECT
          TO authenticated
          USING (
            store_id IN (
              SELECT us.shop_id FROM public.user_shops us WHERE us.user_id = auth.uid()
            )
          );
    END IF;
    
    -- Service role can insert (for logging from backend)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'business_transaction_logs' AND policyname = 'Service role can insert transaction logs'
    ) THEN
        CREATE POLICY "Service role can insert transaction logs"
          ON public.business_transaction_logs FOR INSERT
          TO authenticated
          WITH CHECK (true);
    END IF;
END
$$;

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_btl_user_id ON public.business_transaction_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_btl_store_id ON public.business_transaction_logs(store_id);
CREATE INDEX IF NOT EXISTS idx_btl_transaction_type ON public.business_transaction_logs(transaction_type);
CREATE INDEX IF NOT EXISTS idx_btl_action ON public.business_transaction_logs(action);
CREATE INDEX IF NOT EXISTS idx_btl_created_at ON public.business_transaction_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_btl_resource_id ON public.business_transaction_logs(resource_id);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_btl_store_type_date ON public.business_transaction_logs(store_id, transaction_type, created_at DESC);

-- Grant permissions
GRANT ALL ON public.business_transaction_logs TO postgres;
GRANT ALL ON public.business_transaction_logs TO service_role;
GRANT SELECT ON public.business_transaction_logs TO authenticated;
GRANT INSERT ON public.business_transaction_logs TO authenticated;
