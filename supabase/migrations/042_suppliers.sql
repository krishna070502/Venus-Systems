-- =============================================================================
-- SUPPLIERS TABLE
-- =============================================================================
-- Migration: 042_suppliers.sql
-- Description: Creates suppliers table for live bird procurement
-- Date: 2026-01-13
-- =============================================================================

-- ============================================================================
-- CREATE SUPPLIERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    address TEXT,
    gstin VARCHAR(20),  -- Tax ID for Indian context
    status supplier_status_enum DEFAULT 'ACTIVE',
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON public.suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view active suppliers
CREATE POLICY suppliers_select_policy ON public.suppliers
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Only users with suppliers.create permission can insert
CREATE POLICY suppliers_insert_policy ON public.suppliers
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.role_permissions rp ON ur.role_id = rp.role_id
            JOIN public.permissions p ON rp.permission_id = p.id
            WHERE ur.user_id = auth.uid() AND p.key = 'suppliers.create'
        )
    );

-- Policy: Only users with suppliers.edit permission can update
CREATE POLICY suppliers_update_policy ON public.suppliers
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.role_permissions rp ON ur.role_id = rp.role_id
            JOIN public.permissions p ON rp.permission_id = p.id
            WHERE ur.user_id = auth.uid() AND p.key = 'suppliers.edit'
        )
    );

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================
CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON public.suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
