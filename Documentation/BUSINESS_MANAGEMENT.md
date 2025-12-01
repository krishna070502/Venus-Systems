# Business Management Module

Complete documentation for the Venus Chicken Business Management module, including Manager Onboarding, Shop Management, and Day-wise Price Configuration.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Row Level Security (RLS)](#row-level-security-rls)
5. [Permissions](#permissions)
6. [Backend API](#backend-api)
7. [Frontend Pages](#frontend-pages)
8. [Business Rules](#business-rules)
9. [Usage Guide](#usage-guide)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Business Management module provides multi-tenant shop isolation for Venus Chicken retail operations. Key features include:

- **Multi-Tenancy:** Each shop operates as an isolated tenant
- **Manager Onboarding:** Admins assign managers to specific shops
- **Shop Isolation:** Managers can ONLY see data from their assigned shops
- **Day-wise Pricing:** Admins configure prices per shop, per day

### Key Principles

| Principle | Description |
|-----------|-------------|
| **Strict Isolation** | Managers never see data from other shops |
| **Admin Control** | Only Admins can onboard managers and set prices |
| **RLS Enforcement** | Row Level Security at database level prevents data leakage |
| **Audit Trail** | All actions are logged for compliance |

---

## Architecture

### System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Admin Dashboard                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Shops     │  │  Managers   │  │    Price Config          │  │
│  │   CRUD      │  │  Onboarding │  │    (Per Shop/Day)        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                             │
│  /api/v1/business-management/*                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Permission Checks → Shop Access Validation → Response    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase PostgreSQL                           │
│  ┌────────────┐  ┌────────────────┐  ┌──────────────────────┐   │
│  │   shops    │  │ manager_details│  │  daily_shop_prices   │   │
│  │            │  │   user_shops   │  │  (with RLS)          │   │
│  └────────────┘  └────────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Component Relationships

```
┌─────────────────┐
│     Admin       │ ──────► Can access ALL shops
└─────────────────┘         Can onboard managers
        │                   Can set prices
        │
        ▼
┌─────────────────┐         ┌─────────────────┐
│  Store Manager  │ ◄─────► │     Shop A      │
│   (User 1)      │         └─────────────────┘
└─────────────────┘                 │
        │                          │
        ▼                          ▼
   Can ONLY see:             user_shops table
   - Shop A data             (user_id, shop_id)
   - Shop A prices
```

---

## Database Schema

### Tables Overview

| Table | Purpose | Primary Key |
|-------|---------|-------------|
| `shops` | Store locations | `id` (SERIAL) |
| `manager_details` | Manager qualifications & contact | `user_id` (UUID) |
| `user_shops` | Manager-Shop assignments | `(user_id, shop_id)` |
| `inventory_items` | Product catalog with base prices | `id` (SERIAL) |
| `daily_shop_prices` | Day-wise pricing per shop | `id` (SERIAL) |

### Table: `shops`

```sql
CREATE TABLE public.shops (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Auto-incrementing primary key |
| `name` | VARCHAR(255) | Shop name (e.g., "Venus Chicken - Downtown") |
| `location` | TEXT | Address or location description |
| `is_active` | BOOLEAN | Whether shop is operational |

### Table: `manager_details`

```sql
CREATE TABLE public.manager_details (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    qualifications TEXT,
    contact_number VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | UUID | References auth.users (1:1 relationship) |
| `qualifications` | TEXT | Manager's certifications, education |
| `contact_number` | VARCHAR(20) | Phone number |

### Table: `user_shops`

```sql
CREATE TABLE public.user_shops (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_id INTEGER NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, shop_id)
);
```

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | UUID | Manager's user ID |
| `shop_id` | INTEGER | Assigned shop ID |

**Note:** Composite primary key allows one manager per shop assignment.

### Table: `inventory_items`

```sql
CREATE TABLE public.inventory_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE,
    category VARCHAR(100),
    base_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    unit VARCHAR(50) DEFAULT 'piece',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Product ID |
| `name` | VARCHAR(255) | Product name |
| `sku` | VARCHAR(100) | Stock Keeping Unit (unique) |
| `category` | VARCHAR(100) | Product category |
| `base_price` | DECIMAL(10,2) | Default price when no daily price set |
| `unit` | VARCHAR(50) | Unit of measurement (kg, piece, pack, etc.) |

### Table: `daily_shop_prices`

```sql
CREATE TABLE public.daily_shop_prices (
    id SERIAL PRIMARY KEY,
    shop_id INTEGER NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    valid_date DATE NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_shop_item_date UNIQUE (shop_id, item_id, valid_date)
);
```

| Column | Type | Description |
|--------|------|-------------|
| `shop_id` | INTEGER | Which shop |
| `item_id` | INTEGER | Which product |
| `valid_date` | DATE | Date for this price |
| `price` | DECIMAL(10,2) | Daily price override |

**Constraint:** `unique_shop_item_date` ensures only ONE price per item per shop per day.

### Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│  auth.users  │       │  manager_details │       │    shops     │
│──────────────│       │──────────────────│       │──────────────│
│ id (PK)      │◄──────│ user_id (PK,FK)  │       │ id (PK)      │
│ email        │  1:1  │ qualifications   │       │ name         │
│ ...          │       │ contact_number   │       │ location     │
└──────────────┘       └──────────────────┘       │ is_active    │
       │                                          └──────────────┘
       │                                                 │
       │ M:N (through user_shops)                       │
       │                                                 │
       ▼                                                 ▼
┌──────────────────────────────────────────────────────────────┐
│                        user_shops                             │
│ user_id (PK,FK) ──────────────────────────── shop_id (PK,FK) │
└──────────────────────────────────────────────────────────────┘

┌──────────────────┐                     ┌────────────────────────┐
│ inventory_items  │                     │   daily_shop_prices    │
│──────────────────│                     │────────────────────────│
│ id (PK)          │◄────────────────────│ item_id (FK)           │
│ name             │  1:M                │ shop_id (FK)  ─────────┼──► shops
│ sku (UNIQUE)     │                     │ valid_date             │
│ base_price       │                     │ price                  │
│ category         │                     │ UNIQUE(shop,item,date) │
└──────────────────┘                     └────────────────────────┘
```

---

## Row Level Security (RLS)

RLS ensures data isolation at the database level, preventing managers from accessing other shops' data even if API validation is bypassed.

### RLS on `user_shops`

```sql
-- Enable RLS
ALTER TABLE public.user_shops ENABLE ROW LEVEL SECURITY;

-- Admins see all
CREATE POLICY admin_all_user_shops ON public.user_shops
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
        )
    );

-- Users see only their own assignments
CREATE POLICY user_own_shops ON public.user_shops
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
```

### RLS on `daily_shop_prices`

```sql
-- Enable RLS
ALTER TABLE public.daily_shop_prices ENABLE ROW LEVEL SECURITY;

-- Admins see all
CREATE POLICY admin_all_daily_prices ON public.daily_shop_prices
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
        )
    );

-- Managers see only their shop's prices
CREATE POLICY manager_shop_prices ON public.daily_shop_prices
    FOR SELECT TO authenticated
    USING (
        shop_id IN (
            SELECT us.shop_id 
            FROM public.user_shops us 
            WHERE us.user_id = auth.uid()
        )
    );
```

### Security Flow

```
User Request
     │
     ▼
┌────────────────────┐
│ Is User Admin?     │
│                    │
│  YES ──► See All   │
│  NO  ──▼           │
└────────────────────┘
     │
     ▼
┌────────────────────┐
│ Check user_shops   │
│ for user_id        │
│                    │
│ Return only rows   │
│ matching shop_id   │
└────────────────────┘
```

---

## Permissions

### Permission List

| Permission | Description | Assigned To |
|------------|-------------|-------------|
| `shopmanagement.view` | View Shop Management section | Admin, Manager, Store Manager |
| `shops.view` | View Shops page | Admin, Manager, Store Manager |
| `shops.read` | Read shop records | Admin, Manager, Store Manager |
| `shops.write` | Create new shops | Admin, Manager |
| `shops.update` | Update shops | Admin, Manager |
| `shops.delete` | Delete shops | Admin, Manager |
| `managers.view` | View Managers page | Admin, Manager, Store Manager |
| `managers.read` | Read manager records | Admin, Manager, Store Manager |
| `managers.onboard` | Onboard managers to shops | **Admin ONLY** |
| `managers.delete` | Remove managers | Admin, Manager |
| `priceconfig.view` | View Price Config page | Admin, Manager, Store Manager |
| `priceconfig.read` | Read price records | Admin, Manager, Store Manager |
| `priceconfig.write` | Create/update prices | **Admin ONLY** |
| `priceconfig.delete` | Delete price records | Admin, Manager |

### Role Permissions Matrix

| Permission | Admin | Manager | Store Manager |
|------------|:-----:|:-------:|:-------------:|
| shopmanagement.view | ✅ | ✅ | ✅ |
| shops.* | ✅ | ✅ | read only |
| managers.onboard | ✅ | ❌ | ❌ |
| managers.* (others) | ✅ | ✅ | read only |
| priceconfig.write | ✅ | ❌ | ❌ |
| priceconfig.* (others) | ✅ | ✅ | read only |

---

## Backend API

### Base URL

```
/api/v1/business-management
```

### Shop Endpoints

#### GET `/shops`
List all shops (filtered by user access).

**Query Parameters:**
- `is_active` (optional): Filter by active status

**Response:**
```json
[
  {
    "id": 1,
    "name": "Venus Chicken - Downtown",
    "location": "123 Main Street",
    "is_active": true,
    "created_at": "2025-11-30T10:00:00Z",
    "updated_at": "2025-11-30T10:00:00Z"
  }
]
```

**Permission:** `shops.read`

#### GET `/shops/{shop_id}`
Get a specific shop.

**Permission:** `shops.read` + shop access check

#### POST `/shops`
Create a new shop.

**Request Body:**
```json
{
  "name": "Venus Chicken - New Branch",
  "location": "456 Oak Avenue",
  "is_active": true
}
```

**Permission:** `shops.write`

#### PUT `/shops/{shop_id}`
Update a shop.

**Permission:** `shops.update`

#### DELETE `/shops/{shop_id}`
Delete a shop.

**Permission:** `shops.delete`

---

### Manager Endpoints

#### GET `/managers`
List all onboarded managers with shop assignments.

**Response:**
```json
[
  {
    "user_id": "uuid-here",
    "email": "manager@example.com",
    "full_name": "John Manager",
    "qualifications": "MBA, Food Safety Certified",
    "contact_number": "+1 234 567 8900",
    "shop_id": 1,
    "shop_name": "Venus Chicken - Downtown",
    "shop_location": "123 Main Street",
    "created_at": "2025-11-30T10:00:00Z"
  }
]
```

**Permission:** `managers.read`

#### GET `/managers/unassigned`
Get users with "Store Manager" role who are NOT yet onboarded.

**Response:**
```json
[
  {
    "user_id": "uuid-here",
    "email": "newmanager@example.com",
    "full_name": "Jane Doe"
  }
]
```

**Permission:** `managers.onboard` (Admin only)

#### POST `/managers/onboard`
Onboard a manager to a shop (atomic transaction).

**Request Body:**
```json
{
  "user_id": "uuid-here",
  "shop_id": 1,
  "qualifications": "MBA",
  "contact_number": "+1 234 567 8900"
}
```

**Logic:**
1. Insert into `manager_details`
2. Insert into `user_shops`
3. If either fails, rollback both

**Permission:** `managers.onboard` (Admin only)

#### DELETE `/managers/{user_id}`
Remove a manager (deletes from both tables).

**Permission:** `managers.delete`

---

### Price Configuration Endpoints

#### GET `/prices/daily`
Get daily prices for a shop and date.

**Query Parameters:**
- `shop_id` (required): Shop ID
- `date` (required): Date in YYYY-MM-DD format

**Response:**
```json
{
  "shop_id": 1,
  "shop_name": "Venus Chicken - Downtown",
  "date": "2025-11-30",
  "items": [
    {
      "item_id": 1,
      "item_name": "Whole Chicken",
      "sku": "WC-001",
      "category": "Poultry",
      "base_price": 12.99,
      "daily_price": 14.99,
      "unit": "piece"
    },
    {
      "item_id": 2,
      "item_name": "Chicken Breast",
      "sku": "CB-001",
      "category": "Poultry",
      "base_price": 8.99,
      "daily_price": null,
      "unit": "kg"
    }
  ]
}
```

**Note:** `daily_price: null` means use `base_price`.

**Security:** Non-admins can only access their assigned shop's prices.

**Permission:** `priceconfig.read`

#### POST `/prices/bulk-update`
Bulk upsert daily prices.

**Request Body:**
```json
{
  "shop_id": 1,
  "date": "2025-11-30",
  "items": [
    { "item_id": 1, "price": 14.99 },
    { "item_id": 2, "price": 9.49 }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "updated_count": 2,
  "message": "Successfully updated 2 price(s) for 2025-11-30"
}
```

**Permission:** `priceconfig.write` (Admin only)

#### DELETE `/prices/daily`
Delete a specific daily price (reverts to base price).

**Query Parameters:**
- `shop_id`: Shop ID
- `item_id`: Item ID
- `date`: Date

**Permission:** `priceconfig.delete`

---

### Inventory Endpoints

#### GET `/inventory`
List all inventory items.

**Query Parameters:**
- `is_active` (optional): Filter by active status
- `category` (optional): Filter by category

**Permission:** `priceconfig.read`

---

## Frontend Pages

### 1. Shops Page

**URL:** `/admin/business-management/shops`

**Features:**
- Table displaying all shops (name, location, status, created date)
- "Add Shop" button (requires `shops.write`)
- Edit button (requires `shops.update`)
- Delete button (requires `shops.delete`)
- Active/Inactive toggle
- Modal form for create/edit

**Permission:** `shops.view`

### 2. Managers Page

**URL:** `/admin/business-management/managers`

**Features:**
- Table displaying onboarded managers
  - Manager name, email
  - Contact number
  - Assigned shop with location
  - Qualifications
- "Onboard Manager" button (requires `managers.onboard`)
- Onboard Modal:
  - Dropdown of unassigned Store Managers
  - Dropdown of active shops
  - Qualifications input
  - Contact number input
- Remove button (requires `managers.delete`)

**Permission:** `managers.view`

### 3. Price Config Page

**URL:** `/admin/business-management/price-config`

**Features:**
- Shop selector dropdown
- Date picker
- Grid displaying items:
  - Item name, SKU, category
  - Base price (read-only)
  - Daily price (editable input or read-only based on permission)
  - Effective price with "Custom" badge
- "Save Changes" button (requires `priceconfig.write`)
- Read-only mode for non-admin users

**Permission:** `priceconfig.view`

### UI Components Used

| Component | Source | Usage |
|-----------|--------|-------|
| `PermissionGuard` | Custom | Page-level protection |
| `Table` | shadcn/ui | Data display |
| `Button` | shadcn/ui | Actions |
| `Input` | shadcn/ui | Forms |
| `Select` | shadcn/ui | Dropdowns |
| `Badge` | shadcn/ui | Status indicators |
| `Label` | shadcn/ui | Form labels |

---

## Business Rules

### Manager Onboarding Flow

```
1. Admin assigns "Store Manager" role to a user
   └─► User appears in "Unassigned Managers" list

2. Admin clicks "Onboard Manager"
   └─► Modal opens with dropdown of unassigned managers

3. Admin selects manager, shop, enters details
   └─► System creates:
       - manager_details record
       - user_shops record (assignment)

4. Store Manager logs in
   └─► RLS policies restrict their data access to assigned shop only
```

### Price Configuration Flow

```
1. Admin selects shop and date
   └─► System fetches all inventory items
   └─► Shows base_price for each item
   └─► Shows daily_price if set, else empty

2. Admin enters daily prices for items
   └─► Items without daily price use base_price

3. Admin clicks "Save Changes"
   └─► System upserts records in daily_shop_prices
   └─► Unique constraint prevents duplicates

4. Store Manager views prices
   └─► Read-only mode (no edit capability)
   └─► Only sees their assigned shop's prices
```

### Price Resolution Logic

```
GET effective price for (shop_id, item_id, date):
    
    daily_price = SELECT price FROM daily_shop_prices 
                  WHERE shop_id = ? AND item_id = ? AND valid_date = ?
    
    IF daily_price EXISTS:
        RETURN daily_price
    ELSE:
        RETURN base_price FROM inventory_items WHERE id = item_id
```

---

## Usage Guide

### Setting Up a New Shop

1. Navigate to `/admin/business-management/shops`
2. Click "Add Shop"
3. Enter:
   - **Name:** Shop display name
   - **Location:** Address or description
   - **Status:** Active (default)
4. Click "Create Shop"

### Onboarding a Manager

1. **Prerequisites:**
   - User must exist in the system
   - User must have "Store Manager" role assigned

2. Navigate to `/admin/business-management/managers`
3. Click "Onboard Manager"
4. Select the unassigned manager from dropdown
5. Select the target shop
6. Enter qualifications and contact number
7. Click "Onboard Manager"

### Configuring Daily Prices

1. Navigate to `/admin/business-management/price-config`
2. Select a shop from the dropdown
3. Select a date (today by default)
4. Review the item list:
   - **Base Price:** Default price (cannot edit here)
   - **Daily Price:** Enter custom price for this shop/date
   - **Effective:** Shows which price will be used
5. Click "Save Changes" to apply

### Viewing Prices as Store Manager

1. Log in as a Store Manager user
2. Navigate to `/admin/business-management/price-config`
3. Shop dropdown shows only your assigned shop
4. Date picker allows viewing historical/future prices
5. All fields are read-only (no edit capability)

---

## Troubleshooting

### "No unassigned managers available"

**Cause:** No users have "Store Manager" role or all are already onboarded.

**Solution:**
1. Go to `/admin/users`
2. Assign "Store Manager" role to a user
3. Return to Managers page

### "You don't have access to this shop"

**Cause:** Non-admin user trying to access shop they're not assigned to.

**Solution:**
- This is expected behavior - strict isolation
- Admin must onboard user to the shop first

### "Failed to fetch daily prices"

**Causes:**
1. Shop doesn't exist
2. Backend not running
3. RLS policy blocking access

**Solution:**
1. Verify shop exists in database
2. Check backend logs
3. Verify user's shop assignment in `user_shops` table

### Prices not saving

**Cause:** User lacks `priceconfig.write` permission.

**Solution:**
- Only Admins can save prices
- Store Managers have read-only access

### Manager not seeing their shop data

**Causes:**
1. `user_shops` record missing
2. RLS policy misconfigured

**Solution:**
1. Check `user_shops` table for (user_id, shop_id) entry
2. Verify RLS policies are created correctly
3. Re-run migration if needed

---

## Migration Reference

**File:** `supabase/migrations/023_business_management_tables_and_rls.sql`

**Contents:**
1. Permission: `managers.onboard`
2. Table: `shops`
3. Table: `manager_details`
4. Table: `user_shops`
5. Table: `inventory_items`
6. Table: `daily_shop_prices`
7. RLS policies (4 total)
8. Seed data: 5 shops, 15 inventory items
9. Role: "Store Manager" with basic permissions
10. Update triggers for `updated_at`

**To run:**
```bash
# Via Supabase CLI
supabase db push

# Or via SQL Editor in Supabase Dashboard
# Copy and paste migration file contents
```

---

## API Client Reference

### TypeScript Functions

```typescript
// Shops
api.businessManagement.shops.getAll(isActive?: boolean)
api.businessManagement.shops.getById(id: number)
api.businessManagement.shops.create(data: { name: string; location?: string; is_active?: boolean })
api.businessManagement.shops.update(id: number, data: { name?: string; location?: string; is_active?: boolean })
api.businessManagement.shops.delete(id: number)

// Managers
api.businessManagement.managers.getAll()
api.businessManagement.managers.getUnassigned()
api.businessManagement.managers.onboard(data: {
  user_id: string
  shop_id: number
  qualifications?: string
  contact_number?: string
})
api.businessManagement.managers.remove(userId: string)

// Inventory
api.businessManagement.inventory.getAll(isActive?: boolean, category?: string)

// Prices
api.businessManagement.prices.getDaily(shopId: number, date: string)
api.businessManagement.prices.bulkUpdate(data: {
  shop_id: number
  date: string
  items: Array<{ item_id: number; price: number }>
})
api.businessManagement.prices.deleteDaily(shopId: number, itemId: number, date: string)
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.15.0 | 2025-11-30 | Initial implementation - Full CRUD, RLS, Manager Onboarding, Price Config |

---

**Happy Managing! 🐔**
