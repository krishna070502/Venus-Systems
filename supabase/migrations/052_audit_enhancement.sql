-- =============================================================================
-- AUDIT LOGS ENHANCEMENT
-- =============================================================================
-- Migration: 052_audit_enhancement.sql
-- Description: Enhances audit_logs table with store context and entity tracking
-- Date: 2026-01-13
-- =============================================================================

-- ============================================================================
-- ADD NEW COLUMNS TO AUDIT_LOGS
-- ============================================================================

-- Add store context
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES public.shops(id);

-- Add entity tracking
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50);
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_id UUID;

-- Add value tracking for before/after
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS old_values JSONB;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS new_values JSONB;

-- Add IP address tracking
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);

-- Add request metadata
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS request_id UUID;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- ============================================================================
-- INDEXES FOR AUDIT QUERIES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_store ON public.audit_logs(store_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp);

-- ============================================================================
-- ROW LEVEL SECURITY ENHANCEMENT
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS audit_logs_admin ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_store_select ON public.audit_logs;

-- Admin can see all audit logs
CREATE POLICY audit_logs_admin ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
        )
    );

-- Users can see audit logs for their assigned stores
CREATE POLICY audit_logs_store_select ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        store_id IS NULL OR
        store_id IN (
            SELECT us.shop_id FROM public.user_shops us WHERE us.user_id = auth.uid()
        )
    );

-- ============================================================================
-- ENHANCED AUDIT LOG FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_audit_log(
    p_action VARCHAR(255),
    p_entity_type VARCHAR(50) DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_store_id INTEGER DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_payload JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.audit_logs (
        user_id, action, entity_type, entity_id,
        store_id, old_values, new_values, payload
    ) VALUES (
        auth.uid(), p_action, p_entity_type, p_entity_id,
        p_store_id, p_old_values, p_new_values, p_payload
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
