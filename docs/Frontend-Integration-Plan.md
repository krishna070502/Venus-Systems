# Frontend Integration Plan: PoultryRetail-Core

> **Created**: 2026-01-13  
> **Status**: Planning  
> **Backend**: Complete | **Frontend**: Pending

---

## Executive Summary

This is a **poultry-only system**. The entire flow is:

```
Purchase (Live Birds) → Inventory (Live) → Processing → Inventory (Skin/Skinless) → Sales
```

Same flow applies for both bird types: **BROILER** and **PARENT_CULL**

---

## Core Business Flow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   SUPPLIER   │───►│   PURCHASE   │───►│  LIVE BIRDS  │───►│  PROCESSING  │───►│   SKIN /     │
│              │    │              │    │  (Inventory) │    │              │    │  SKINLESS    │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                                                                       │
                           ┌───────────────────────────────────────────────────────────┘
                           ▼
                    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
                    │    SALES     │───►│  SETTLEMENT  │───►│   VARIANCE   │
                    │    (POS)     │    │              │    │              │
                    └──────────────┘    └──────────────┘    └──────────────┘
```

---

## Inventory Data Model

### Three Dimensions

| Dimension | Values |
|-----------|--------|
| **Bird Type** | `BROILER`, `PARENT_CULL` |
| **Inventory Type** | `LIVE`, `SKIN`, `SKINLESS` |
| **Store** | Multiple stores |

### Stock Matrix (2 × 3 per store)

|              | LIVE | SKIN | SKINLESS |
|--------------|------|------|----------|
| **BROILER**  | ✓    | ✓    | ✓        |
| **PARENT_CULL** | ✓ | ✓    | ✓        |

---

## Proposed Sidebar Structure

```
├── System Administration
│   └── (Dashboard, Users, Roles, Permissions, etc.)
│
├── Poultry Retail                    ← MAIN SECTION
│   ├── 📊 Dashboard
│   ├── 🚚 Suppliers
│   ├── 🛒 Purchases                  ← Buy LIVE birds
│   ├── 📦 Inventory                  ← UNIFIED VIEW (All types, All birds, Store-wise)
│   │   └── (Matrix, Movement, Ledger tabs)
│   ├── ⚙️ Processing                 ← LIVE → SKIN/SKINLESS
│   ├── 🏷️ SKUs & Pricing            ← Product catalog + Store prices
│   ├── 💰 Sales
│   │   ├── POS                       ← Point of Sale
│   │   └── History                   ← Sales records
│   ├── 📋 Settlements
│   │   ├── Daily Settlement          ← Stock declaration + Cash reconciliation
│   │   └── Variance                  ← Approve/Review variances
│   └── 🏆 Staff Performance
│       ├── Points                    ← View points history
│       ├── Grading                   ← Monthly grades + Config
│       └── Leaderboard               ← Rankings
│
└── 🏪 Shops                          ← Store management
```

---

## Page Specifications

### 1. Dashboard (`/admin/poultry`)

**Widgets:**
- Today's Sales Summary (₹ total, kg sold)
- Current Stock Overview (quick matrix)
- Pending Variances Alert (badge count)
- Low Stock Warnings
- Staff Performance Overview (top performers)

---

### 2. Suppliers (`/admin/poultry/suppliers`)

**Features:**
- List with search/filter
- Create/Edit supplier modal
- Fields: Name, Phone, Address, GST, PAN, Bank Details
- Soft delete (deactivate)
- Export to CSV

---

### 3. Purchases (`/admin/poultry/purchases`)

**Features:**
- Purchase order list (DRAFT, COMMITTED, CANCELLED)
- Create purchase form:
  - Supplier selector
  - Bird type (BROILER/PARENT_CULL)
  - Weight (kg)
  - Rate per kg
  - Total amount
- **Commit action** → Triggers ledger credit (LIVE birds)
- Print purchase order

---

### 4. Inventory (`/admin/poultry/inventory`) - UNIFIED PAGE

> **CRITICAL**: Single page with multiple views via tabs

#### Header Section
```
┌─────────────────────────────────────────────────────────────────┐
│  🏪 Store: [Venus Downtown ▼]     📅 Date: [Today ▼]            │
│                                   🔄 Refresh                    │
└─────────────────────────────────────────────────────────────────┘
```

#### Tab 1: Stock Matrix (Default)
```
┌─────────────────────────────────────────────────────────────────┐
│                    CURRENT STOCK (in kg)                        │
├─────────────────┬──────────────┬──────────────┬────────────────┤
│  Bird Type      │    LIVE      │    SKIN      │   SKINLESS     │
├─────────────────┼──────────────┼──────────────┼────────────────┤
│  🐔 BROILER     │   150.500    │    75.250    │    45.000      │
├─────────────────┼──────────────┼──────────────┼────────────────┤
│  🐓 PARENT_CULL │    25.000    │    12.500    │     8.000      │
├─────────────────┴──────────────┴──────────────┴────────────────┤
│  TOTAL          │   175.500    │    87.750    │    53.000      │
└─────────────────────────────────────────────────────────────────┘
```

#### Tab 2: Daily Movement (Opening/Closing Stock)
```
┌─────────────────────────────────────────────────────────────────────┐
│  📊 Stock Movement Report - 13 Jan 2026                             │
├─────────────────────────────────────────────────────────────────────┤
│                        BROILER (kg)                                 │
├─────────────────┬──────────────┬──────────────┬────────────────────┤
│                 │    LIVE      │    SKIN      │   SKINLESS         │
├─────────────────┼──────────────┼──────────────┼────────────────────┤
│ Opening Stock   │   125.500    │    62.750    │    42.000          │
│                 │              │              │                    │
│ + Purchases     │   +50.000    │      —       │      —             │
│ + Processing In │      —       │   +15.000    │   +12.000          │
│ - Processing Out│   -25.000    │      —       │      —             │
│ - Sales         │      —       │    -2.500    │    -9.000          │
│ ± Adjustments   │      —       │      —       │      —             │
├─────────────────┼──────────────┼──────────────┼────────────────────┤
│ Closing Stock   │   150.500    │    75.250    │    45.000          │
└─────────────────┴──────────────┴──────────────┴────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       PARENT_CULL (kg)                              │
├─────────────────┬──────────────┬──────────────┬────────────────────┤
│                 │    LIVE      │    SKIN      │   SKINLESS         │
├─────────────────┼──────────────┼──────────────┼────────────────────┤
│ Opening Stock   │    30.000    │    10.000    │     5.000          │
│                 │              │              │                    │
│ + Purchases     │      —       │      —       │      —             │
│ + Processing In │      —       │    +5.000    │    +4.000          │
│ - Processing Out│   -10.000    │      —       │      —             │
│ - Sales         │      —       │    -2.500    │    -1.000          │
│ ± Adjustments   │    +5.000    │      —       │      —             │
├─────────────────┼──────────────┼──────────────┼────────────────────┤
│ Closing Stock   │    25.000    │    12.500    │     8.000          │
└─────────────────┴──────────────┴──────────────┴────────────────────┘

Total Net Change:  LIVE: +10.0 kg  │  SKIN: +15.0 kg  │  SKINLESS: +6.0 kg
```

#### Tab 3: Ledger (Transaction History)
```
┌──────────────────────────────────────────────────────────────────┐
│ Filter: [All Types ▼] [All Birds ▼] [Today ▼]    🔍 Search      │
├──────────────────────────────────────────────────────────────────┤
│ Time       │ Bird     │ Type     │ Change   │ Reason            │
├────────────┼──────────┼──────────┼──────────┼───────────────────┤
│ 11:30 AM   │ BROILER  │ SKINLESS │ -2.500   │ SALE_DEBIT        │
│ 11:15 AM   │ BROILER  │ SKIN     │ +15.000  │ PROCESSING_CREDIT │
│ 11:15 AM   │ BROILER  │ LIVE     │ -20.000  │ PROCESSING_DEBIT  │
│ 10:00 AM   │ BROILER  │ LIVE     │ +50.000  │ PURCHASE_RECEIVED │
│ 09:30 AM   │ P_CULL   │ LIVE     │ +5.000   │ MANUAL_ADJUSTMENT │
└──────────────────────────────────────────────────────────────────┘
```

#### Tab 4: All Stores (Admin Only)
```
┌─────────────────────────────────────────────────────────────────┐
│  ALL STORES SUMMARY (Combined Bird Types)                       │
├─────────────────┬──────────────┬──────────────┬────────────────┤
│  Store          │    LIVE      │    SKIN      │   SKINLESS     │
├─────────────────┼──────────────┼──────────────┼────────────────┤
│  Venus Downtown │   175.500    │    87.750    │    53.000      │
│  Venus Mall     │    98.200    │    45.300    │    28.500      │
│  Venus Highway  │   112.000    │    62.100    │    35.200      │
├─────────────────┴──────────────┴──────────────┴────────────────┤
│  GRAND TOTAL    │   385.700    │   195.150    │   116.700      │
└─────────────────────────────────────────────────────────────────┘
```

#### Manual Adjustment (Modal/Dialog)
```
┌─────────────────────────────────────────────────────────────────┐
│  MANUAL STOCK ADJUSTMENT                                        │
├─────────────────────────────────────────────────────────────────┤
│  Bird Type:      [BROILER ▼]                                    │
│  Inventory Type: [LIVE ▼]                                       │
│  Adjustment:     [+ Add ▼]  [  15.500  ] kg                    │
│  Reason:         [Found in storage ▼]                           │
│  Notes:          [________________________________]              │
│                                                                 │
│                        [Cancel]  [Apply Adjustment]             │
└─────────────────────────────────────────────────────────────────┘
```

---

### 5. Processing (`/admin/poultry/processing`)

**Features:**
- Processing form:
  - Bird type selector
  - Input weight (LIVE)
  - Output type (SKIN or SKINLESS)
  - **Yield preview** (auto-calculated using wastage %)
- Processing history list
- Wastage config editor (admin only)

**Processing Flow:**
```
Input:  50 kg BROILER LIVE
Output: 36 kg BROILER SKINLESS (28% wastage)
        14 kg lost to wastage

Ledger entries created:
  - DEBIT:  50 kg BROILER LIVE (PROCESSING_DEBIT)
  - CREDIT: 36 kg BROILER SKINLESS (PROCESSING_CREDIT)
  - LOG:    14 kg wastage recorded
```

---

### 6. SKUs & Pricing (`/admin/poultry/skus`)

**Two Sub-pages:**

#### SKU List
- All sellable products
- Fields: Name, Code, Bird Type, Inventory Type, Unit (kg)
- Active/Inactive toggle

#### Store Prices (`/admin/poultry/skus/prices`)
- Store selector
- Price list for all SKUs
- Inline editing
- Bulk price update
- Price effective date

---

### 7. Sales (`/admin/poultry/sales`)

#### POS Interface (`/admin/poultry/sales/pos`)
```
┌─────────────────────────────────────────────────────────────────────┐
│  POS - Venus Downtown                           User: John Doe      │
├───────────────────────────────────┬─────────────────────────────────┤
│  PRODUCTS                         │  CART                           │
│  ┌───────────┐ ┌───────────┐      │  ┌─────────────────────────────┐│
│  │ Broiler   │ │ Broiler   │      │  │ Broiler Skin     2.5kg      ││
│  │ Skin      │ │ Skinless  │      │  │ @ ₹180/kg        ₹450       ││
│  │ ₹180/kg   │ │ ₹200/kg   │      │  ├─────────────────────────────┤│
│  │ [Add]     │ │ [Add]     │      │  │ Broiler Skinless 1.0kg      ││
│  └───────────┘ └───────────┘      │  │ @ ₹200/kg        ₹200       ││
│  ┌───────────┐ ┌───────────┐      │  └─────────────────────────────┘│
│  │ P.Cull    │ │ P.Cull    │      │                                 │
│  │ Skin      │ │ Skinless  │      │  Subtotal:            ₹650.00  │
│  │ ₹160/kg   │ │ ₹180/kg   │      │  Discount:            ₹  0.00  │
│  │ [Add]     │ │ [Add]     │      │  ─────────────────────────────  │
│  └───────────┘ └───────────┘      │  TOTAL:               ₹650.00  │
│                                   │                                 │
│                                   │  Payment: [Cash ▼]              │
│                                   │                                 │
│                                   │  [Clear]  [Complete Sale →]    │
└───────────────────────────────────┴─────────────────────────────────┘
```

#### Sales History (`/admin/poultry/sales`)
- List of all sales
- Filter by date, payment method
- View receipt details
- Print receipt

---

### 8. Settlements (`/admin/poultry/settlements`)

**Daily Settlement Form:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  📋 DAILY SETTLEMENT - 13 Jan 2026                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  CASH RECONCILIATION                                                │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Expected Cash (from sales):     ₹15,000.00                  │  │
│  │  Your Cash Count:                [₹         ]                │  │
│  │  Expected UPI:                   ₹ 8,500.00                  │  │
│  │  Your UPI Received:              [₹         ]                │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  STOCK DECLARATION                                                  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                  Expected (System)    Your Count    Variance  │  │
│  │  BROILER SKIN        75.25 kg      [        ]      ______    │  │
│  │  BROILER SKINLESS    45.00 kg      [        ]      ______    │  │
│  │  PARENT_CULL SKIN    12.50 kg      [        ]      ______    │  │
│  │  PARENT_CULL SKINLESS 8.00 kg      [        ]      ______    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Note: LIVE birds not declared (processed into SKIN/SKINLESS)     │
│                                                                     │
│                              [Save Draft]  [Submit Settlement →]   │
└─────────────────────────────────────────────────────────────────────┘
```

**Settlement List:**
- Date, store, status (DRAFT, SUBMITTED, APPROVED, LOCKED)
- Variance summary
- Approve/Lock actions (manager/admin)

---

### 9. Variance (`/admin/poultry/variance`)

**Pending Variances:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  ⚠️ PENDING VARIANCES                                               │
├─────────────────────────────────────────────────────────────────────┤
│  Date       │ Store     │ Item           │ Variance │ Status       │
├─────────────┼───────────┼────────────────┼──────────┼──────────────┤
│  13 Jan     │ Downtown  │ BROILER SKIN   │ +0.50 kg │ ⏳ Pending   │
│  13 Jan     │ Downtown  │ P.CULL SKINLESS│ -0.25 kg │ 🔴 Deducted  │
│  12 Jan     │ Mall      │ BROILER SKINLESS│ +1.20 kg│ ✅ Approved  │
└─────────────┴───────────┴────────────────┴──────────┴──────────────┘
```

**Variance Types:**
| Type | Color | Action | Points Impact |
|------|-------|--------|---------------|
| ZERO | Green | None | +10 bonus |
| POSITIVE | Yellow | Needs Approval | +3/kg when approved |
| NEGATIVE | Red | Auto-deducted | -8/kg penalty |

---

### 10. Staff Points (`/admin/poultry/staff-points`)

**My Points View:**
- Current balance
- Points history (with reasons)
- Monthly trend chart

**Store View (Manager):**
- All staff points in store
- Award/Deduct points manually

**Leaderboard:**
- Ranking by points
- Filter by period (week, month, all-time)

---

### 11. Grading (`/admin/poultry/grading`)

**Monthly Performance:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  📊 STAFF GRADING - January 2026                                    │
├─────────────────────────────────────────────────────────────────────┤
│  Staff       │ Points │ Weight │ Score  │ Grade │ Bonus │ Penalty  │
├──────────────┼────────┼────────┼────────┼───────┼───────┼──────────┤
│  John Doe    │  +150  │ 500kg  │ +0.30  │  A    │ ₹3000 │    —     │
│  Jane Smith  │   +80  │ 400kg  │ +0.20  │  B    │ ₹1200 │    —     │
│  Bob Wilson  │  -120  │ 300kg  │ -0.40  │  E    │    —  │ ₹3000    │
├──────────────┴────────┴────────┴────────┴───────┴───────┴──────────┤
│  [Generate Month]  [Lock Month →]                                  │
└─────────────────────────────────────────────────────────────────────┘
```

**Config Editor (Admin):**
- Grade thresholds
- Bonus rates per grade
- Penalty rates per grade
- Monthly caps

---

## Opening/Closing Stock Calculation

### Automatic from Ledger

```sql
-- Opening Stock = All transactions BEFORE midnight of date
Opening Stock = SUM(quantity_change) WHERE created_at < '2026-01-13 00:00:00'

-- Closing Stock = All transactions UP TO end of date (or current time)
Closing Stock = SUM(quantity_change) WHERE created_at <= '2026-01-13 23:59:59'

-- Daily Movement
Movement = Closing Stock - Opening Stock
```

### API Endpoints for Stock Views

| Endpoint | Returns |
|----------|---------|
| `GET /inventory/stock` | Current stock (real-time) |
| `GET /inventory/stock?date=2026-01-13` | Stock as of end of date |
| `GET /inventory/movement?date=2026-01-13` | Opening, Closing, Transactions |
| `GET /inventory/ledger` | Transaction history |

---

## Files to Create

### Pages (18 files)

```
frontend/app/admin/poultry/
├── page.tsx                              # Dashboard
├── layout.tsx                            # Store context provider
├── suppliers/page.tsx                    # Supplier CRUD
├── purchases/page.tsx                    # Purchase orders
├── inventory/page.tsx                    # Unified inventory view
├── processing/page.tsx                   # Processing form
├── processing/wastage-config/page.tsx    # Wastage config
├── skus/page.tsx                         # SKU CRUD
├── skus/prices/page.tsx                  # Store prices
├── sales/page.tsx                        # Sales history
├── sales/pos/page.tsx                    # POS interface
├── settlements/page.tsx                  # Daily settlement
├── variance/page.tsx                     # Variance management
├── staff-points/page.tsx                 # Points history
├── staff-points/leaderboard/page.tsx     # Leaderboard
└── grading/page.tsx                      # Monthly grading
```

### Components (15 files)

```
frontend/components/poultry/
├── StoreSelector.tsx           # Store dropdown with context
├── StoreHeader.tsx             # Header with store + date
├── BirdTypeSelector.tsx        # BROILER/PARENT_CULL dropdown
├── InventoryTypeSelector.tsx   # LIVE/SKIN/SKINLESS dropdown
├── StockMatrix.tsx             # 2D stock grid
├── StockMovementTable.tsx      # Opening/Closing with changes
├── LedgerTable.tsx             # Transaction history
├── WeightInput.tsx             # Weight input (3 decimals, kg)
├── PriceInput.tsx              # Price input (₹, 2 decimals)
├── GradeBadge.tsx              # Grade with color
├── PointsBadge.tsx             # Points with +/- color
├── VarianceIndicator.tsx       # Variance display
├── POSProductGrid.tsx          # Product cards for POS
├── POSCart.tsx                 # Cart component
└── SettlementForm.tsx          # Stock declaration form
```

### Files to Modify

| File | Changes |
|------|---------|
| `components/admin/Sidebar.tsx` | Add Poultry Retail navigation group |
| `lib/api/client.ts` | Add all poultry API methods |

### Files to Delete/Deprecate

| File | Reason |
|------|--------|
| `app/admin/business/inventory/items-purchase/*` | Not needed (all purchases are birds) |
| `app/admin/business/sales-items/*` | Replaced by SKUs |
| `app/admin/business-management/price-config/*` | Replaced by Store Prices |
| All placeholder pages in `/admin/business/*` | Replaced by Poultry pages |

---

## Implementation Priority

### Week 1: Foundation
- [ ] Sidebar restructuring
- [ ] Store context provider (layout.tsx)
- [ ] API client extensions
- [ ] Shared components (StoreSelector, inputs)

### Week 2: Core Data
- [ ] Inventory page (Matrix, Movement, Ledger tabs)
- [ ] Suppliers page
- [ ] SKUs page
- [ ] Store Prices page

### Week 3: Operations
- [ ] Purchases page
- [ ] Processing page (with wastage config)
- [ ] Dashboard page

### Week 4: Sales
- [ ] POS interface
- [ ] Sales History page

### Week 5: Reconciliation
- [ ] Settlements page
- [ ] Variance page

### Week 6: Performance
- [ ] Staff Points pages
- [ ] Grading page
- [ ] Leaderboard

### Week 7: Polish
- [ ] Testing all flows
- [ ] Mobile responsiveness
- [ ] Dark mode
- [ ] Documentation

---

## API Quick Reference

All endpoints under `/api/v1/poultry/`

| Module | Endpoints |
|--------|-----------|
| Suppliers | GET, POST, PATCH, DELETE `/suppliers` |
| Purchases | GET, POST `/purchases`, POST `/purchases/{id}/commit` |
| Inventory | GET `/inventory/stock`, `/inventory/ledger`, `/inventory/movement` |
| Processing | POST `/processing`, GET `/processing/wastage-config` |
| SKUs | GET, POST, PATCH `/skus`, GET/POST `/skus/prices/store` |
| Sales | GET, POST `/sales`, GET `/sales/summary` |
| Settlements | GET, POST `/settlements`, POST `/{id}/submit`, `/{id}/approve` |
| Variance | GET `/variance`, POST `/{id}/approve` |
| Staff Points | GET `/staff-points/me`, `/staff-points/store`, `/staff-points/leaderboard` |
| Grading | GET/PATCH `/grading/config`, POST `/grading/performance/generate` |

---

**Document Version**: 2.0  
**Last Updated**: 2026-01-13
