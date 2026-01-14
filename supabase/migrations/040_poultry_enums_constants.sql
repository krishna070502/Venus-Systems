-- =============================================================================
-- POULTRY RETAIL CORE - ENUMS AND CONSTANTS
-- =============================================================================
-- Migration: 040_poultry_enums_constants.sql
-- Description: Creates PostgreSQL enums for type safety across the system
-- Date: 2026-01-13
-- =============================================================================

-- ============================================================================
-- BIRD TYPE ENUM
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE bird_type_enum AS ENUM ('BROILER', 'PARENT_CULL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- INVENTORY TYPE ENUM
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE inventory_type_enum AS ENUM ('LIVE', 'SKIN', 'SKINLESS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- VARIANCE TYPE ENUM
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE variance_type_enum AS ENUM ('POSITIVE', 'NEGATIVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- SETTLEMENT STATUS ENUM
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE settlement_status_enum AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'LOCKED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- PAYMENT METHOD ENUM
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE payment_method_enum AS ENUM ('CASH', 'UPI', 'CARD', 'BANK');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- STORE STATUS ENUM
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE store_status_enum AS ENUM ('ACTIVE', 'MAINTENANCE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- PURCHASE STATUS ENUM
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE purchase_status_enum AS ENUM ('DRAFT', 'COMMITTED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- VARIANCE LOG STATUS ENUM
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE variance_log_status_enum AS ENUM ('PENDING', 'APPROVED', 'DEDUCTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- SUPPLIER STATUS ENUM
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE supplier_status_enum AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- SALE TYPE ENUM
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE sale_type_enum AS ENUM ('POS', 'BULK');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- REASON CODES TABLE (Reference table for ledger entries)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.inventory_reason_codes (
    code VARCHAR(50) PRIMARY KEY,
    description TEXT NOT NULL,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('CREDIT', 'DEBIT', 'BOTH')),
    requires_ref BOOLEAN DEFAULT false,
    is_system BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed reason codes
INSERT INTO public.inventory_reason_codes (code, description, direction, requires_ref, is_system) VALUES
    ('PURCHASE_RECEIVED', 'Live birds received from supplier', 'CREDIT', true, true),
    ('PROCESSING_DEBIT', 'Live birds consumed in processing', 'DEBIT', true, true),
    ('PROCESSING_CREDIT', 'Processed inventory created', 'CREDIT', true, true),
    ('SALE_DEBIT', 'Inventory sold to customer', 'DEBIT', true, true),
    ('VARIANCE_POSITIVE', 'Found stock (approved)', 'CREDIT', true, true),
    ('VARIANCE_NEGATIVE', 'Lost stock (deducted)', 'DEBIT', true, true),
    ('WASTAGE', 'Processing wastage (non-sellable)', 'DEBIT', true, true),
    ('ADJUSTMENT_CREDIT', 'Manual admin adjustment (increase)', 'CREDIT', false, true),
    ('ADJUSTMENT_DEBIT', 'Manual admin adjustment (decrease)', 'DEBIT', false, true),
    ('OPENING_BALANCE', 'Opening stock balance', 'CREDIT', false, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
