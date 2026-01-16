-- =============================================================================
-- EXPENSE RECEIPTS STORAGE BUCKET
-- =============================================================================
-- Migration: 080_expense_receipts_storage.sql
-- Description: Creates storage bucket for expense receipt uploads
-- Date: 2026-01-16
-- =============================================================================

-- ============================================================================
-- CREATE STORAGE BUCKET FOR EXPENSE RECEIPTS
-- ============================================================================
-- Note: This needs to be run in Supabase dashboard or via Supabase CLI
-- The bucket creation is handled by Supabase Storage API

-- Insert bucket configuration if using database-managed buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'expense-receipts',
    'expense-receipts',
    false,  -- Private bucket, requires authentication
    5242880,  -- 5MB file size limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES FOR STORAGE
-- ============================================================================

-- Policy: Allow authenticated users to upload to their store's folder
CREATE POLICY "expense_receipts_insert_policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'expense-receipts'
    AND (
        -- Admin can upload anywhere
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
        )
        OR
        -- Users can upload to stores they have access to
        -- Path format: {store_id}/{settlement_id}/{filename}
        (storage.foldername(name))[1]::INTEGER IN (
            SELECT us.shop_id FROM public.user_shops us WHERE us.user_id = auth.uid()
        )
    )
);

-- Policy: Allow users to read receipts from their stores
CREATE POLICY "expense_receipts_select_policy"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'expense-receipts'
    AND (
        -- Admin can read all
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
        )
        OR
        -- Users can read from their stores
        (storage.foldername(name))[1]::INTEGER IN (
            SELECT us.shop_id FROM public.user_shops us WHERE us.user_id = auth.uid()
        )
    )
);

-- Policy: Allow users to delete their own uploads (only from their stores)
CREATE POLICY "expense_receipts_delete_policy"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'expense-receipts'
    AND (
        -- Admin can delete all
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
        )
        OR
        -- Users can delete from their stores
        (storage.foldername(name))[1]::INTEGER IN (
            SELECT us.shop_id FROM public.user_shops us WHERE us.user_id = auth.uid()
        )
    )
);

-- ============================================================================
-- ADD EXPENSE.ALLSTORES PERMISSION FOR ADMIN ALL-STORES VIEW
-- ============================================================================
INSERT INTO public.permissions (key, description)
VALUES ('expense.allstores', 'View expenses from all stores')
ON CONFLICT (key) DO NOTHING;

-- Grant expense.allstores to Admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'Admin' AND p.key = 'expense.allstores'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
