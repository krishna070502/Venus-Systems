-- =============================================================================
-- SUPPLIERS TABLE FIELD ALIGNMENT
-- =============================================================================
-- Migration: 059_suppliers_field_alignment.sql
-- Description: Aligns suppliers table columns with frontend form fields
-- Date: 2026-01-13
-- =============================================================================

-- Rename existing columns to match frontend
ALTER TABLE public.suppliers 
  RENAME COLUMN contact_phone TO phone;

ALTER TABLE public.suppliers 
  RENAME COLUMN contact_email TO email;

ALTER TABLE public.suppliers 
  RENAME COLUMN gstin TO gst_number;

-- Drop contact_name if exists (not used in frontend)
ALTER TABLE public.suppliers 
  DROP COLUMN IF EXISTS contact_name;

-- Add new columns for bank details and PAN
ALTER TABLE public.suppliers 
  ADD COLUMN IF NOT EXISTS pan_number VARCHAR(20);

ALTER TABLE public.suppliers 
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255);

ALTER TABLE public.suppliers 
  ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50);

ALTER TABLE public.suppliers 
  ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(20);

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
