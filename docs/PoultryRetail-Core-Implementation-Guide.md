# PoultryRetail-Core - Complete Implementation Guide

> **Session Date**: 2026-01-13  
> **Module**: PoultryRetail-Core  
> **Status**: Backend Complete | Frontend Pending

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Database Schema](#2-database-schema)
3. [Backend API Endpoints](#3-backend-api-endpoints)
4. [Business Logic & Workflows](#4-business-logic--workflows)
5. [Permission System](#5-permission-system)
6. [Frontend Development Guide](#6-frontend-development-guide)
7. [API Integration Examples](#7-api-integration-examples)
8. [Testing Checklist](#8-testing-checklist)

---

## 1. System Overview

### What Was Built

A **fraud-resistant, ledger-based poultry retail management system** with:

- ✅ Double-entry inventory tracking (append-only ledger)
- ✅ Live bird procurement and processing
- ✅ SKU-based product management with store-specific pricing
- ✅ POS and wholesale sales with stock validation
- ✅ Daily settlement with automatic variance detection
- ✅ Staff performance tracking with grading system
- ✅ Comprehensive RBAC with granular permissions

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │Dashboard│ │Inventory│ │  Sales  │ │Settle-  │ │ Staff   │       │
│  │         │ │ & Stock │ │  & POS  │ │ ments   │ │ Points  │       │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘       │
└───────┼──────────┼──────────┼──────────┼──────────┼────────────────┘
        │          │          │          │          │
        ▼          ▼          ▼          ▼          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND API (FastAPI)                          │
│  /api/v1/poultry/*                                                  │
│  ┌──────────────────────────────────────────────────────┐           │
│  │ Routers: suppliers, purchases, inventory, processing,│           │
│  │ skus, sales, settlements, variance, staff_points,    │           │
│  │ grading, inventory_unified                           │           │
│  └──────────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    DATABASE (PostgreSQL/Supabase)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │ inventory_  │  │   sales     │  │  daily_     │                  │
│  │   ledger    │◄─┤  sale_items │◄─┤settlements  │                  │
│  │(append-only)│  │             │  │             │                  │
│  └─────────────┘  └─────────────┘  └─────────────┘                  │
│         ▲                                  │                        │
│         │              ┌───────────────────┘                        │
│         │              ▼                                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │ purchases   │  │ variance_   │  │  staff_     │                  │
│  │ processing  │  │   logs      │  │  points     │                  │
│  └─────────────┘  └─────────────┘  └─────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema

### Migrations to Run (In Order)

| # | File | Purpose |
|---|------|---------|
| 040 | `040_poultry_enums_constants.sql` | PostgreSQL enums, reason codes |
| 041 | `041_enhance_shops_table.sql` | Store code, timezone, status |
| 042 | `042_suppliers.sql` | Supplier management |
| 043 | `043_purchases.sql` | Purchase orders |
| 044 | `044_inventory_ledger.sql` | **Core append-only ledger** |
| 045 | `045_current_stock_view.sql` | Materialized view + triggers |
| 046 | `046_wastage_config.sql` | Processing yield config |
| 047 | `047_processing_entries.sql` | Processing with auto-ledger |
| 048 | `048_skus_and_pricing.sql` | SKUs + store prices |
| 049 | `049_sales.sql` | Sales + inventory debit trigger |
| 050 | `050_settlements.sql` | Settlements + variance calculation |
| 051 | `051_staff_points.sql` | Staff performance points |
| 052 | `052_audit_enhancement.sql` | Enhanced audit logs |
| 053 | `053_permissions_poultry.sql` | Basic permissions |
| 054 | `054_migrate_inventory_to_skus.sql` | Migrate legacy inventory_items |
| 055 | `055_staff_grading_system.sql` | Grading, bonus, penalties |
| 056 | `056_poultry_granular_permissions.sql` | Granular permissions |

### Key Tables

#### `inventory_ledger` (CRITICAL - Append Only)
```sql
CREATE TABLE public.inventory_ledger (
    id UUID PRIMARY KEY,
    store_id INTEGER NOT NULL,
    bird_type bird_type_enum NOT NULL,      -- 'BROILER', 'PARENT_CULL'
    inventory_type inventory_type_enum NOT NULL, -- 'LIVE', 'SKIN', 'SKINLESS'
    quantity_change DECIMAL(10,3) NOT NULL,  -- Positive=credit, Negative=debit
    reason_code VARCHAR(50) NOT NULL,        -- Links to reason_codes table
    ref_id UUID,                             -- Reference to source record
    ref_type VARCHAR(50),                    -- 'PURCHASE', 'SALE', 'PROCESSING', etc.
    user_id UUID NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRITICAL: No updates or deletes allowed
REVOKE UPDATE, DELETE ON public.inventory_ledger FROM PUBLIC;
REVOKE UPDATE, DELETE ON public.inventory_ledger FROM authenticated;
```

#### `skus` (Product Catalog)
```sql
CREATE TABLE public.skus (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    bird_type bird_type_enum NOT NULL,
    inventory_type inventory_type_enum NOT NULL,
    unit VARCHAR(20) DEFAULT 'kg',
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0
);
```

#### `store_prices` (Per-Store Pricing)
```sql
CREATE TABLE public.store_prices (
    id UUID PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES shops(id),
    sku_id UUID NOT NULL REFERENCES skus(id),
    price DECIMAL(12,2) NOT NULL,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    UNIQUE (store_id, sku_id, effective_date)
);
```

#### `daily_settlements` (End-of-Day Reconciliation)
```sql
CREATE TABLE public.daily_settlements (
    id UUID PRIMARY KEY,
    store_id INTEGER NOT NULL,
    settlement_date DATE NOT NULL,
    
    -- Declared values
    declared_cash DECIMAL(12,2),
    declared_upi DECIMAL(12,2),
    declared_stock JSONB,  -- {BROILER: {LIVE: 10.5, SKIN: 20.0, SKINLESS: 15.0}}
    
    -- Calculated values (auto-populated)
    expected_cash DECIMAL(12,2),
    expected_stock JSONB,
    
    -- Status
    status settlement_status_enum NOT NULL DEFAULT 'DRAFT',
    
    -- Workflow
    submitted_by UUID,
    submitted_at TIMESTAMPTZ,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    locked_by UUID,
    locked_at TIMESTAMPTZ
);
```

#### `variance_logs` (Fraud Detection)
```sql
CREATE TABLE public.variance_logs (
    id UUID PRIMARY KEY,
    settlement_id UUID NOT NULL REFERENCES daily_settlements(id),
    bird_type bird_type_enum NOT NULL,
    inventory_type inventory_type_enum NOT NULL,
    expected_weight DECIMAL(10,3) NOT NULL,
    declared_weight DECIMAL(10,3) NOT NULL,
    variance_weight DECIMAL(10,3) NOT NULL,  -- declared - expected
    variance_type variance_type_enum NOT NULL,  -- 'POSITIVE', 'NEGATIVE', 'ZERO'
    status variance_log_status_enum NOT NULL DEFAULT 'PENDING'
);
```

#### `staff_monthly_performance` (Grading)
```sql
CREATE TABLE public.staff_monthly_performance (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    store_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    
    -- Metrics
    total_points INTEGER NOT NULL,
    total_weight_handled DECIMAL(10,3) NOT NULL,
    normalized_score DECIMAL(10,4) NOT NULL,  -- points / weight
    
    -- Grade
    grade staff_grade_enum NOT NULL,  -- 'A_PLUS', 'A', 'B', 'C', 'D', 'E'
    
    -- Incentives
    bonus_amount DECIMAL(12,2),
    penalty_amount DECIMAL(12,2),
    
    -- Lock status
    is_locked BOOLEAN DEFAULT false,
    
    UNIQUE (user_id, store_id, year, month)
);
```

### Enums

```sql
-- Bird types
CREATE TYPE bird_type_enum AS ENUM ('BROILER', 'PARENT_CULL');

-- Inventory types (processing stages)
CREATE TYPE inventory_type_enum AS ENUM ('LIVE', 'SKIN', 'SKINLESS');

-- Settlement statuses
CREATE TYPE settlement_status_enum AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'LOCKED');

-- Variance types
CREATE TYPE variance_type_enum AS ENUM ('POSITIVE', 'NEGATIVE', 'ZERO');

-- Staff grades
CREATE TYPE staff_grade_enum AS ENUM ('A_PLUS', 'A', 'B', 'C', 'D', 'E');
```

---

## 3. Backend API Endpoints

### Base URL: `/api/v1/poultry`

### 3.1 Suppliers (`/suppliers`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/suppliers` | `suppliers.view` | List all suppliers |
| GET | `/suppliers/{id}` | `suppliers.view` | Get supplier details |
| POST | `/suppliers` | `suppliers.create` | Create new supplier |
| PATCH | `/suppliers/{id}` | `suppliers.edit` | Update supplier |
| DELETE | `/suppliers/{id}` | `suppliers.delete` | Deactivate supplier |

**Request Headers Required:**
- `Authorization: Bearer {token}`

### 3.2 Purchases (`/purchases`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/purchases` | `purchases.view` | List purchases |
| GET | `/purchases/{id}` | `purchases.view` | Get purchase details |
| POST | `/purchases` | `purchases.create` | Create draft purchase |
| POST | `/purchases/{id}/commit` | `purchases.commit` | **Commit to inventory** |
| POST | `/purchases/{id}/cancel` | `purchases.cancel` | Cancel purchase |

**Request Headers Required:**
- `Authorization: Bearer {token}`
- `X-Store-ID: {store_id}` (for store-scoped operations)

**Commit Purchase Flow:**
```
POST /purchases                    → Creates DRAFT
POST /purchases/{id}/commit        → Changes to COMMITTED
                                   → Triggers inventory_ledger CREDIT
                                   → Updates current_stock view
```

### 3.3 Inventory (`/inventory`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/inventory/stock` | `inventory.view` | Current stock by store |
| GET | `/inventory/stock/{bird_type}` | `inventory.view` | Stock for specific bird type |
| GET | `/inventory/ledger` | `inventory.ledger` | View ledger entries |
| POST | `/inventory/adjust` | `inventory.adjust` | Manual adjustment (admin) |
| GET | `/inventory/reason-codes` | `inventory.view` | List valid reason codes |

**Stock Response Format:**
```json
{
  "store_id": 1,
  "as_of": "2026-01-13T12:00:00Z",
  "stock": {
    "BROILER": {
      "LIVE": 150.500,
      "SKIN": 75.250,
      "SKINLESS": 45.000
    },
    "PARENT_CULL": {
      "LIVE": 25.000,
      "SKIN": 12.500,
      "SKINLESS": 8.000
    }
  }
}
```

### 3.4 Processing (`/processing`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/processing` | `processing.view` | List processing entries |
| POST | `/processing` | `processing.create` | Create processing entry |
| POST | `/processing/calculate-yield` | `processing.view` | Preview yield calculation |
| GET | `/processing/wastage-config` | `wastageconfig.view` | View wastage percentages |
| POST | `/processing/wastage-config` | `wastageconfig.edit` | Set wastage percentage |

**Processing Request:**
```json
{
  "store_id": 1,
  "input_bird_type": "BROILER",
  "output_inventory_type": "SKINLESS",
  "input_weight": 50.000,
  "idempotency_key": "proc-20260113-001"
}
```

**What Happens:**
1. Looks up wastage config (e.g., BROILER → SKINLESS = 28%)
2. Calculates output weight: 50 × (1 - 0.28) = 36.0 kg
3. Creates ledger entries:
   - DEBIT: 50.0 kg BROILER LIVE
   - CREDIT: 36.0 kg BROILER SKINLESS
   - LOG: 14.0 kg wastage

### 3.5 SKUs & Pricing (`/skus`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/skus` | `skus.view` | List all SKUs |
| GET | `/skus/{id}` | `skus.view` | Get SKU details |
| POST | `/skus` | `skus.manage` | Create new SKU |
| PATCH | `/skus/{id}` | `skus.manage` | Update SKU |
| GET | `/skus/prices/store` | `storeprices.view` | Get store prices |
| POST | `/skus/prices/store` | `storeprices.edit` | Set store price |
| POST | `/skus/prices/bulk` | `storeprices.edit` | Bulk price update |

**SKUs With Prices Response:**
```json
[
  {
    "id": "uuid",
    "name": "Broiler - With Skin",
    "code": "BRO-SKIN",
    "bird_type": "BROILER",
    "inventory_type": "SKIN",
    "unit": "kg",
    "current_price": 180.00,
    "effective_date": "2026-01-13"
  }
]
```

### 3.6 Sales (`/sales`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/sales` | `sales.view` | List sales |
| GET | `/sales/{id}` | `sales.view` | Get sale with items |
| POST | `/sales` | `sales.create` | Create POS sale |
| POST | `/sales/bulk` | `sales.bulk` | Create wholesale sale |
| GET | `/sales/summary` | `sales.view` | Daily sales summary |

**Create Sale Request:**
```json
{
  "store_id": 1,
  "sale_type": "POS",
  "payment_method": "CASH",
  "customer_name": "Walk-in",
  "customer_phone": null,
  "items": [
    {
      "sku_id": "uuid",
      "quantity": 1,
      "weight": 2.500,
      "unit_price": 180.00
    }
  ],
  "discount_amount": 0,
  "idempotency_key": "sale-20260113-001"
}
```

**What Happens:**
1. Validates stock availability
2. Creates sale + sale_items
3. **Trigger automatically debits inventory_ledger**
4. Generates receipt number (sequence)
5. Returns complete sale with receipt

### 3.7 Settlements (`/settlements`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/settlements` | `settlements.view` | List settlements |
| GET | `/settlements/{id}` | `settlements.view` | Get settlement with variance |
| POST | `/settlements` | `settlements.create` | Create draft |
| POST | `/settlements/{id}/submit` | `settlements.submit` | Submit with declarations |
| POST | `/settlements/{id}/approve` | `settlements.approve` | Approve settlement |
| POST | `/settlements/{id}/lock` | `settlements.lock` | Lock (immutable) |

**Submit Settlement Request:**
```json
{
  "declared_cash": 15000.00,
  "declared_upi": 8500.00,
  "declared_stock": {
    "BROILER": {
      "LIVE": 45.500,
      "SKIN": 30.250,
      "SKINLESS": 20.000
    },
    "PARENT_CULL": {
      "LIVE": 10.000,
      "SKIN": 5.000,
      "SKINLESS": 3.500
    }
  }
}
```

**What Happens:**
1. Calculates expected stock from ledger
2. Compares with declared stock
3. Creates variance_logs for each discrepancy
4. If negative variance → staff points deducted immediately
5. If positive variance → blocked until approved

### 3.8 Variance (`/variance`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/variance` | `variance.view` | List variances |
| GET | `/variance/{id}` | `variance.view` | Get variance details |
| POST | `/variance/{id}/approve` | `variance.approve` | Approve positive variance |
| POST | `/variance/{id}/deduct` | `variance.deduct` | Confirm negative deduction |
| GET | `/variance/pending` | `variance.view` | Count pending variances |

**Approve Positive Variance:**
```json
{
  "reason": "Found in storage room",
  "approved_by": "manager-uuid"
}
```

**What Happens:**
1. Credits inventory_ledger with the found stock
2. Awards staff points (+3 per kg approved)
3. Updates variance_log status to APPROVED

### 3.9 Staff Points (`/staff-points`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/staff-points/me` | `staffpoints.view` | My points summary |
| GET | `/staff-points/history` | `staffpoints.view` | My points history |
| GET | `/staff-points/store` | `staffpoints.viewall` | Store staff points |
| POST | `/staff-points` | `staffpoints.manage` | Manual adjustment |
| GET | `/staff-points/leaderboard` | `staffpoints.view` | Leaderboard |
| GET | `/staff-points/config` | `staffpoints.view` | Points config |
| PATCH | `/staff-points/config/{key}` | `staffpoints.manage` | Update config |

### 3.10 Grading (`/grading`)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/grading/config` | `staffgrading.view` | Get all config |
| PATCH | `/grading/config/{key}` | `staffgrading.config` | Update config value |
| GET | `/grading/reason-codes` | `staffgrading.view` | List reason codes |
| PATCH | `/grading/reason-codes/{code}` | `staffgrading.config` | Update points value |
| POST | `/grading/performance/generate` | `staffgrading.generate` | Generate monthly grades |
| GET | `/grading/performance` | `staffgrading.view` | View store performance |
| GET | `/grading/performance/me` | `staffpoints.view` | My grades |
| POST | `/grading/performance/lock` | `staffgrading.lock` | Lock month |
| GET | `/grading/fraud-flags` | `staffgrading.view` | At-risk users |

---

## 4. Business Logic & Workflows

### 4.1 Inventory Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Purchase   │────►│  Processing │────►│    Sale     │
│   (LIVE)    │     │(LIVE→SKIN/  │     │ (SKIN or   │
│             │     │  SKINLESS)  │     │  SKINLESS) │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      ▼                   ▼                   ▼
┌───────────────────────────────────────────────────┐
│               INVENTORY LEDGER                    │
│  +100kg LIVE  │ -50kg LIVE    │ -2.5kg SKINLESS  │
│  (PURCHASE)   │ +36kg SKINLESS│ (SALE)           │
│               │ (PROCESSING)  │                   │
└───────────────────────────────────────────────────┘
```

### 4.2 Settlement Workflow

```
DRAFT ──────────► SUBMITTED ──────────► APPROVED ──────────► LOCKED
  │                   │                     │                   │
  │                   │                     │                   │
  └─ Staff fills      └─ System calculates  └─ Manager          └─ Immutable
     declarations        variance &            approves            for audit
                         deducts points
```

### 4.3 Variance Resolution

```
                    ┌─────────────────┐
                    │  Variance Type  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
         ┌────────┐    ┌──────────┐   ┌──────────┐
         │  ZERO  │    │ POSITIVE │   │ NEGATIVE │
         │  (+10) │    │ (blocked)│   │ (penalty)│
         └────────┘    └────┬─────┘   └────┬─────┘
                            │              │
                            ▼              ▼
                    ┌──────────────┐   ┌──────────────┐
                    │ Manager      │   │ Auto-deduct  │
                    │ Approval     │   │ from ledger  │
                    └──────┬───────┘   │ -8 pts/kg    │
                           │           └──────────────┘
                           ▼
                    ┌──────────────┐
                    │ Credit       │
                    │ to ledger    │
                    │ +3 pts/kg    │
                    └──────────────┘
```

### 4.4 Grading Formula

```
Normalized Score = Total Points / Total Weight Handled

Grade Thresholds:
  A+ : score >= 0.50
  A  : score >= 0.30
  B  : score >= 0.10
  C  : score >= -0.10
  D  : score >= -0.30
  E  : score < -0.30

Bonus = Weight Handled × Bonus Rate (per grade)
Penalty = Negative Variance × Penalty Rate (per grade)
```

---

## 5. Permission System

### 5.1 Permission Format

```
{module}.{action}              → suppliers.create
{module}.field.{column}        → purchases.field.price
{module}.action.{action}       → sales.action.export
{module}.sidebar               → settlements.sidebar
{module}.{submodule}.sidebar   → sales.pos.sidebar
```

### 5.2 Role Hierarchy

| Role | Access Level | Key Capabilities |
|------|--------------|------------------|
| **Admin** | Full | All permissions, grading config, force lock |
| **Store Manager** | Store-level | Sales, settlements, variance approval, view staff |
| **Account** | Finance | Suppliers, purchases, payouts, reports |
| **Cashier** | POS only | Sales creation, view stock, print receipts |

### 5.3 Using Permissions in Frontend

```tsx
// Check single permission
const canCreateSales = usePermission('sales.create');

// Check field visibility
const showPriceColumn = usePermission('purchases.field.price');

// Check sidebar visibility
const showSettlementsMenu = usePermission('settlements.sidebar');

// Conditional rendering
{canCreateSales && <Button>New Sale</Button>}

// Hide columns
const columns = [
  { key: 'receipt', visible: usePermission('sales.field.receipt') },
  { key: 'total', visible: usePermission('sales.field.total') },
  { key: 'cashier', visible: usePermission('sales.field.cashier') },
].filter(col => col.visible);
```

---

## 6. Frontend Development Guide

### 6.1 Required Pages

#### Dashboard (`/admin/poultry/dashboard`)
- **Permission**: `poultry.dashboard.view`
- **Widgets** (each has its own permission):
  - Today's Sales Summary
  - Current Stock Overview
  - Pending Variances Alert
  - Low Stock Warnings
  - Staff Performance Overview

#### Suppliers (`/admin/poultry/suppliers`)
- **Permission**: `suppliers.sidebar`
- **Features**:
  - List with search/filter
  - Create/Edit modal
  - Deactivate (soft delete)
  - Export to CSV

#### Purchases (`/admin/poultry/purchases`)
- **Permission**: `purchases.sidebar`
- **Features**:
  - List with status filter (DRAFT, COMMITTED, CANCELLED)
  - Create purchase form
  - **Commit action** (triggers ledger)
  - Print purchase order

#### Inventory (`/admin/poultry/inventory`)
- **Permission**: `inventory.sidebar`
- **Sub-pages**:
  - `/stock` - Current stock grid (Bird Type × Inventory Type)
  - `/ledger` - Ledger view with filters
  - `/adjustments` - Manual adjustment form (admin only)

#### Processing (`/admin/poultry/processing`)
- **Permission**: `processing.sidebar`
- **Features**:
  - Processing form with yield preview
  - Wastage config editor
  - Processing history

#### SKUs & Pricing (`/admin/poultry/skus`)
- **Permission**: `skus.sidebar`
- **Features**:
  - SKU list with inline price editing
  - Store selector for pricing
  - Bulk price update modal
  - Price history

#### Sales (`/admin/poultry/sales`)
- **Permission**: `sales.sidebar`
- **Sub-pages**:
  - `/pos` - POS interface
  - `/history` - Sales history
  - `/returns` - Returns processing

#### POS Interface (`/admin/poultry/sales/pos`)
- **Permission**: `sales.pos.sidebar`
- **Features**:
  - Product grid (SKUs with prices)
  - Cart with weight input
  - Payment method selection
  - Receipt printing
  - Real-time stock validation

#### Settlements (`/admin/poultry/settlements`)
- **Permission**: `settlements.sidebar`
- **Features**:
  - Settlement list with status badges
  - Settlement form (stock declaration)
  - Variance review panel
  - Approval/Lock actions

#### Variance (`/admin/poultry/variance`)
- **Permission**: `variance.sidebar`
- **Features**:
  - Pending variances list
  - Approval modal for positive
  - Trend charts

#### Staff Points (`/admin/poultry/staff-points`)
- **Permission**: `staffpoints.sidebar`
- **Sub-pages**:
  - `/my-points` - Personal dashboard
  - `/store` - Store leaderboard
  - `/manage` - Admin point adjustments

#### Grading (`/admin/poultry/grading`)
- **Permission**: `staffgrading.sidebar`
- **Features**:
  - Monthly performance table
  - Grade distribution chart
  - Generate/Lock actions
  - Config editor (thresholds, rates)

### 6.2 Common Components to Create

```
components/poultry/
├── InventoryGrid.tsx        # Bird × Type stock grid
├── StockBadge.tsx           # Color-coded stock level
├── BirdTypeSelector.tsx     # Dropdown for bird types
├── InventoryTypeSelector.tsx # Dropdown for inv types
├── SKUSelector.tsx          # Searchable SKU picker
├── PriceInput.tsx           # Currency input with validation
├── WeightInput.tsx          # Weight input (kg, 3 decimals)
├── SettlementForm.tsx       # Stock declaration form
├── VarianceCard.tsx         # Variance display card
├── PointsBadge.tsx          # Points with +/- coloring
├── GradeBadge.tsx           # Grade with color (A+ green, E red)
├── StoreSelector.tsx        # Store dropdown
└── ReasonCodeSelector.tsx   # Reason code picker
```

### 6.3 State Management Considerations

```tsx
// Store-scoped data pattern
const { storeId } = useStore(); // From context or URL

// Fetch stock for current store
const { data: stock } = useQuery(
  ['stock', storeId],
  () => api.get(`/inventory/stock`, { headers: { 'X-Store-ID': storeId }})
);

// Refetch after mutations
const createSale = useMutation(
  (data) => api.post('/sales', data),
  {
    onSuccess: () => {
      queryClient.invalidateQueries(['stock', storeId]);
      queryClient.invalidateQueries(['sales', storeId]);
    }
  }
);
```

### 6.4 Form Validation Rules

| Field | Validation |
|-------|------------|
| Weight | Positive, max 3 decimals, max 9999.999 |
| Price | Positive, max 2 decimals, max 99999.99 |
| Quantity | Positive integer |
| Phone | 10 digits |
| GST | 15 chars, pattern match |
| PAN | 10 chars, pattern match |

### 6.5 Key UX Considerations

1. **Stock Validation on Sale**
   - Show available stock before adding to cart
   - Block sale if insufficient stock
   - Real-time update after each sale

2. **Settlement UX**
   - Pre-fill expected values (read-only)
   - Highlight variances immediately
   - Confirm before submit

3. **Variance Alerts**
   - Badge count on sidebar
   - Color coding (red = negative, yellow = pending positive)
   - Quick approve button for manager

4. **POS Performance**
   - Offline-first for slow connections
   - Keyboard shortcuts for speed
   - Immediate receipt printing

5. **Grading Month Lock**
   - Show preview before lock
   - Confirm dialog with total bonus/penalty
   - Cannot unlock without admin

---

## 7. API Integration Examples

### 7.1 Fetch Current Stock

```tsx
// Frontend service
async function getStoreStock(storeId: number): Promise<StockData> {
  const response = await api.get('/poultry/inventory/stock', {
    headers: { 'X-Store-ID': storeId.toString() }
  });
  return response.data;
}

// Component usage
const { data: stock, isLoading } = useQuery(
  ['stock', storeId],
  () => getStoreStock(storeId),
  { refetchInterval: 30000 } // Refresh every 30s
);
```

### 7.2 Create Sale with Idempotency

```tsx
async function createSale(sale: SaleCreate): Promise<Sale> {
  const idempotencyKey = `sale-${Date.now()}-${Math.random().toString(36)}`;
  
  const response = await api.post('/poultry/sales', {
    ...sale,
    idempotency_key: idempotencyKey
  });
  
  return response.data;
}
```

### 7.3 Submit Settlement

```tsx
async function submitSettlement(
  settlementId: string, 
  declarations: SettlementDeclarations
): Promise<SettlementWithVariance> {
  const response = await api.post(
    `/poultry/settlements/${settlementId}/submit`,
    declarations
  );
  return response.data;
}

// Response includes variance analysis
interface SettlementWithVariance {
  id: string;
  status: 'SUBMITTED';
  variance_summary: {
    total_positive_kg: number;
    total_negative_kg: number;
    requires_action: boolean;
  };
  variance_logs: VarianceLog[];
}
```

### 7.4 Generate Monthly Grades

```tsx
async function generateGrades(
  storeId: number, 
  year: number, 
  month: number
): Promise<{ records_processed: number }> {
  const response = await api.post('/poultry/grading/performance/generate', {
    store_id: storeId,
    year,
    month
  });
  return response.data;
}
```

---

## 8. Testing Checklist

### 8.1 Happy Path Tests

- [ ] Purchase → Commit → Stock increases
- [ ] Processing → LIVE decreases, SKIN/SKINLESS increases
- [ ] Sale → Stock decreases
- [ ] Settlement with zero variance → +10 points
- [ ] Positive variance approval → Ledger credited
- [ ] Negative variance → Auto-deducted, points penalty
- [ ] Monthly grade generation → Correct grades assigned
- [ ] Grade lock → Records become immutable

### 8.2 Edge Cases

- [ ] Sale with insufficient stock → Rejected
- [ ] Duplicate idempotency key → Returns existing sale
- [ ] Settlement for locked day → Rejected
- [ ] Deactivated supplier → Cannot create purchase
- [ ] Zero weight processing → Rejected
- [ ] Negative price → Rejected

### 8.3 Security Tests

- [ ] Cashier cannot approve variance → 403
- [ ] Cross-store access blocked → 403
- [ ] Locked settlement cannot be modified → 400
- [ ] Ledger entries cannot be deleted → Database constraint
- [ ] Grading config requires admin → 403

### 8.4 Performance Tests

- [ ] Stock query < 100ms
- [ ] Sale creation < 500ms
- [ ] Settlement calculation < 2s
- [ ] Grade generation < 5s for 50 users

---

## Appendix A: Reason Codes

| Code | Description | Direction | Points |
|------|-------------|-----------|--------|
| `PURCHASE_RECEIVED` | Live birds from supplier | CREDIT | - |
| `PROCESSING_DEBIT` | Live consumed in processing | DEBIT | - |
| `PROCESSING_CREDIT` | Processed output | CREDIT | - |
| `WASTAGE` | Processing wastage | DEBIT | - |
| `SALE_DEBIT` | Sold to customer | DEBIT | - |
| `VARIANCE_POSITIVE` | Found stock (approved) | CREDIT | +3/kg |
| `VARIANCE_NEGATIVE` | Lost stock | DEBIT | -8/kg |
| `MANUAL_ADJUSTMENT` | Admin adjustment | BOTH | - |
| `TRANSFER_OUT` | Transfer to another store | DEBIT | - |
| `TRANSFER_IN` | Transfer from another store | CREDIT | - |

---

## Appendix B: Grade Bonus/Penalty Rates

| Grade | Normalized Score | Bonus (₹/kg) | Penalty Rate |
|-------|------------------|--------------|--------------|
| A+ | ≥ +0.50 | ₹10 | - |
| A | +0.30 to 0.49 | ₹6 | - |
| B | +0.10 to 0.29 | ₹3 | - |
| C | -0.10 to +0.09 | ₹0 | Warning |
| D | -0.30 to -0.11 | ₹0 | ₹5/kg loss |
| E | < -0.30 | ₹0 | ₹10/kg loss |

---

## Appendix C: File Locations

### Backend Files

```
backend/app/
├── models/poultry_retail/
│   ├── __init__.py
│   ├── enums.py
│   ├── suppliers.py
│   ├── purchases.py
│   ├── inventory.py
│   ├── skus.py
│   ├── sales.py
│   ├── settlements.py
│   ├── variance.py
│   └── staff_points.py
│
├── routers/poultry_retail/
│   ├── __init__.py
│   ├── suppliers.py
│   ├── purchases.py
│   ├── inventory.py
│   ├── processing.py
│   ├── skus.py
│   ├── sales.py
│   ├── settlements.py
│   ├── variance.py
│   ├── staff_points.py
│   ├── grading.py
│   └── inventory_unified.py
```

### Database Migrations

```
supabase/migrations/
├── 040_poultry_enums_constants.sql
├── 041_enhance_shops_table.sql
├── 042_suppliers.sql
├── 043_purchases.sql
├── 044_inventory_ledger.sql
├── 045_current_stock_view.sql
├── 046_wastage_config.sql
├── 047_processing_entries.sql
├── 048_skus_and_pricing.sql
├── 049_sales.sql
├── 050_settlements.sql
├── 051_staff_points.sql
├── 052_audit_enhancement.sql
├── 053_permissions_poultry.sql
├── 054_migrate_inventory_to_skus.sql
├── 055_staff_grading_system.sql
└── 056_poultry_granular_permissions.sql
```

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-13  
**Author**: AI Assistant
