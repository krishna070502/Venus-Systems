-- =============================================================================
-- CUSTOMERS, RECEIPTS, PAYMENTS & FINANCIAL LEDGER
-- =============================================================================
-- Migration: 060_customers_receipts_payments_ledger.sql
-- Description: Creates tables for customer management, receipts (customer payments),
--              supplier payments, and financial ledger for double-entry accounting
-- Date: 2026-01-13
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CUSTOMERS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    gstin VARCHAR(20),
    credit_limit DECIMAL(12,2) DEFAULT 0,
    -- NOTE: No outstanding_balance stored - computed from financial_ledger
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'BLOCKED')),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_status ON public.customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);

-- -----------------------------------------------------------------------------
-- 2. ALTER SALES TABLE - Add direct sale support
-- -----------------------------------------------------------------------------
-- Add sale_type column
ALTER TABLE public.sales 
    ADD COLUMN IF NOT EXISTS sale_type VARCHAR(20) DEFAULT 'POS' 
    CHECK (sale_type IN ('POS', 'DIRECT'));

-- Add customer reference for direct sales
ALTER TABLE public.sales 
    ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id);

-- Add invoice number for direct sales
ALTER TABLE public.sales 
    ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50);

-- Add payment status
ALTER TABLE public.sales 
    ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'PAID'
    CHECK (payment_status IN ('PENDING', 'PARTIAL', 'PAID'));

-- Create unique index for invoice numbers
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_invoice_number 
    ON public.sales(invoice_number) 
    WHERE invoice_number IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. RECEIPTS TABLE (Customer Payments for Sales)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    sale_id UUID REFERENCES public.sales(id),
    customer_id UUID REFERENCES public.customers(id) NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) CHECK (payment_method IN ('CASH', 'BANK', 'UPI', 'CHEQUE', 'OTHER')),
    reference_number VARCHAR(100), -- Transaction/cheque reference
    receipt_date TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    store_id INTEGER REFERENCES public.shops(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_receipts_customer_id ON public.receipts(customer_id);
CREATE INDEX IF NOT EXISTS idx_receipts_sale_id ON public.receipts(sale_id);
CREATE INDEX IF NOT EXISTS idx_receipts_store_id ON public.receipts(store_id);
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_date ON public.receipts(receipt_date);

-- -----------------------------------------------------------------------------
-- 4. SUPPLIER PAYMENTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supplier_payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id) NOT NULL,
    purchase_id UUID REFERENCES public.purchases(id), -- Optional link to specific purchase
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) CHECK (payment_method IN ('CASH', 'BANK', 'UPI', 'CHEQUE', 'OTHER')),
    reference_number VARCHAR(100),
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    store_id INTEGER REFERENCES public.shops(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier_id ON public.supplier_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_purchase_id ON public.supplier_payments(purchase_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_store_id ON public.supplier_payments(store_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_payment_date ON public.supplier_payments(payment_date);

-- -----------------------------------------------------------------------------
-- 5. FINANCIAL LEDGER (Double-Entry Accounting)
-- -----------------------------------------------------------------------------
-- This is the source of truth for all financial calculations
-- Outstanding = SUM(debit) - SUM(credit)
--
-- Entry Rules:
-- | Event             | entity_type | Debit         | Credit        |
-- |-------------------|-------------|---------------|---------------|
-- | Direct Sale       | CUSTOMER    | sale_amount   | 0             |
-- | Receipt           | CUSTOMER    | 0             | receipt_amount|
-- | Purchase          | SUPPLIER    | 0             | purchase_amt  |
-- | Supplier Payment  | SUPPLIER    | payment_amt   | 0             |
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.financial_ledger (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id INTEGER REFERENCES public.shops(id),
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('CUSTOMER', 'SUPPLIER')),
    entity_id UUID NOT NULL,
    transaction_type VARCHAR(30) NOT NULL 
        CHECK (transaction_type IN ('SALE', 'RECEIPT', 'PURCHASE', 'SUPPLIER_PAYMENT')),
    debit DECIMAL(12,2) DEFAULT 0 CHECK (debit >= 0),
    credit DECIMAL(12,2) DEFAULT 0 CHECK (credit >= 0),
    ref_table VARCHAR(50), -- 'sales', 'receipts', 'purchases', 'supplier_payments'
    ref_id UUID,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast aggregation queries
CREATE INDEX IF NOT EXISTS idx_financial_ledger_entity 
    ON public.financial_ledger(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_store_id 
    ON public.financial_ledger(store_id);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_ref 
    ON public.financial_ledger(ref_table, ref_id);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_created_at 
    ON public.financial_ledger(created_at);

-- -----------------------------------------------------------------------------
-- 6. HELPER FUNCTIONS
-- -----------------------------------------------------------------------------

-- Function to get customer outstanding balance
CREATE OR REPLACE FUNCTION get_customer_outstanding(p_customer_id UUID)
RETURNS DECIMAL(12,2) AS $$
BEGIN
    RETURN COALESCE(
        (SELECT SUM(debit) - SUM(credit) 
         FROM public.financial_ledger 
         WHERE entity_type = 'CUSTOMER' AND entity_id = p_customer_id),
        0
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get supplier outstanding balance
CREATE OR REPLACE FUNCTION get_supplier_outstanding(p_supplier_id UUID)
RETURNS DECIMAL(12,2) AS $$
BEGIN
    RETURN COALESCE(
        (SELECT SUM(credit) - SUM(debit) 
         FROM public.financial_ledger 
         WHERE entity_type = 'SUPPLIER' AND entity_id = p_supplier_id),
        0
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get sale outstanding balance
CREATE OR REPLACE FUNCTION get_sale_outstanding(p_sale_id UUID)
RETURNS DECIMAL(12,2) AS $$
DECLARE
    v_sale_amount DECIMAL(12,2);
    v_receipts_total DECIMAL(12,2);
BEGIN
    SELECT total_amount INTO v_sale_amount FROM public.sales WHERE id = p_sale_id;
    SELECT COALESCE(SUM(amount), 0) INTO v_receipts_total FROM public.receipts WHERE sale_id = p_sale_id;
    RETURN COALESCE(v_sale_amount, 0) - v_receipts_total;
END;
$$ LANGUAGE plpgsql;

-- Function to generate receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS VARCHAR(50) AS $$
BEGIN
    RETURN 'RCP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
           LPAD(NEXTVAL('receipt_number_seq')::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate payment number
CREATE OR REPLACE FUNCTION generate_payment_number()
RETURNS VARCHAR(50) AS $$
BEGIN
    RETURN 'PAY-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
           LPAD(NEXTVAL('payment_number_seq')::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Sequences for number generation
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS payment_number_seq START 1;

-- -----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_ledger ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "Allow authenticated read customers" ON public.customers
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read receipts" ON public.receipts
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read supplier_payments" ON public.supplier_payments
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read financial_ledger" ON public.financial_ledger
    FOR SELECT TO authenticated USING (true);

-- Allow all operations for service role
CREATE POLICY "Allow service insert customers" ON public.customers
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow service update customers" ON public.customers
    FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow service insert receipts" ON public.receipts
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow service insert supplier_payments" ON public.supplier_payments
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow service insert financial_ledger" ON public.financial_ledger
    FOR INSERT TO authenticated WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 8. PERMISSIONS
-- -----------------------------------------------------------------------------

-- Customer permissions
INSERT INTO public.permissions (key, description) VALUES
    ('customer.view', 'View customers'),
    ('customer.read', 'Read customer details'),
    ('customer.write', 'Create customers'),
    ('customer.update', 'Update customers'),
    ('customer.delete', 'Delete/deactivate customers')
ON CONFLICT (key) DO NOTHING;

-- Receipt permissions
INSERT INTO public.permissions (key, description) VALUES
    ('receipt.view', 'View receipts'),
    ('receipt.read', 'Read receipt details'),
    ('receipt.write', 'Create receipts'),
    ('receipt.update', 'Update receipts'),
    ('receipt.delete', 'Delete receipts')
ON CONFLICT (key) DO NOTHING;

-- Payment permissions (supplier payments)
INSERT INTO public.permissions (key, description) VALUES
    ('payment.view', 'View supplier payments'),
    ('payment.read', 'Read payment details'),
    ('payment.write', 'Create payments'),
    ('payment.update', 'Update payments'),
    ('payment.delete', 'Delete payments')
ON CONFLICT (key) DO NOTHING;

-- Ledger permissions
INSERT INTO public.permissions (key, description) VALUES
    ('ledger.view', 'View financial ledger'),
    ('ledger.read', 'Read ledger details'),
    ('ledger.write', 'Create ledger entries'),
    ('ledger.update', 'Update ledger entries'),
    ('ledger.delete', 'Delete ledger entries')
ON CONFLICT (key) DO NOTHING;

-- Assign all new permissions to Admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin'
  AND p.key IN (
    'customer.view', 'customer.read', 'customer.write', 'customer.update', 'customer.delete',
    'receipt.view', 'receipt.read', 'receipt.write', 'receipt.update', 'receipt.delete',
    'payment.view', 'payment.read', 'payment.write', 'payment.update', 'payment.delete',
    'ledger.view', 'ledger.read', 'ledger.write', 'ledger.update', 'ledger.delete'
  )
ON CONFLICT DO NOTHING;

-- Assign view/read/write permissions to Manager role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Manager'
  AND p.key IN (
    'customer.view', 'customer.read', 'customer.write', 'customer.update',
    'receipt.view', 'receipt.read', 'receipt.write',
    'payment.view', 'payment.read', 'payment.write',
    'ledger.view', 'ledger.read'
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

