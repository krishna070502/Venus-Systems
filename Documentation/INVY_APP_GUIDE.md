# Venus Chicken - Complete Application Guide for Invy

> **Last Updated**: January 2026  
> **Target Audience**: Invy AI Assistant for answering user queries

---

## Application Overview

Venus Chicken is a comprehensive **Poultry Business Management System** for a chicken business operating in India. It provides:

- **Admin Dashboard**: Central control panel for all operations
- **User Management**: Managing employees, roles, and granular permissions (100+ permissions)
- **Business Operations**: Inventory, purchases, sales, processing, settlements, payments
- **Staff Performance Tracking**: Points-based grading system with bonuses and penalties
- **AI Assistant (Invy)**: Intelligent helper for queries and operations
- **Fraud Detection**: Automatic monitoring of suspicious activities

### Currency and Location
- **Location**: India
- **Currency**: Always use Indian Rupees (₹ / INR)
- **Language**: English with Indian business context

### Tech Stack
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth (JWT-based)

---

## PAGES AND FEATURES

### SYSTEM ADMINISTRATION

#### 1. Dashboard (/admin)
**Purpose**: Overview of the entire business at a glance
**Features**:
- Total users count
- Active sessions
- System health status
- Quick access to all modules
**Related Tables**: profiles, user_sessions, system_settings

#### 2. Users (/admin/users)
**Purpose**: Manage all system users
**Features**:
- View all registered users
- Edit user profiles
- Assign/remove roles
- Activate/deactivate accounts
**Related Tables**: profiles, user_roles
**Permissions Required**: users.read, users.write

#### 3. Roles (/admin/roles)
**Purpose**: Define and manage user roles
**Features**:
- Create new roles (e.g., Admin, Store Manager, Cashier)
- Edit role names and descriptions
- Assign permissions to roles
- Delete unused roles
**Related Tables**: roles, role_permissions
**Permissions Required**: roles.read, roles.write

#### 4. Permissions (/admin/permissions)
**Purpose**: Manage granular permissions
**Features**:
- Create new permissions
- Edit permission keys and descriptions
- Delete permissions
- View which roles have which permissions
**Related Tables**: permissions, role_permissions
**Permission Format**: resource.action (e.g., users.read, inventory.write)

#### 5. Active Sessions (/admin/sessions)
**Purpose**: Monitor who is logged into the system
**Features**:
- View all active user sessions
- See IP addresses, browsers, and devices
- Identify suspicious login activity
- "Active Now" indicator for recent activity
**Related Tables**: user_sessions

#### 6. Audit Logs (/admin/logs)
**Purpose**: Complete audit trail of all system changes
**Features**:
- View all CREATE, UPDATE, DELETE actions
- Filter by action type, resource, user
- Export logs
- View detailed changes (before/after)
**Related Tables**: audit_logs
**Columns**: timestamp, action, resource_type, resource_id, changes, user_id, ip_address, user_agent

#### 7. System Settings (/admin/settings)
**Purpose**: Configure system-wide settings
**Features**:
- Enable/disable user registration
- Enable/disable maintenance mode
- Configure AI assistant settings
- Configure SearXNG URL
**Related Tables**: system_settings

#### 8. Health Monitoring (/admin/health)
**Purpose**: Monitor system health
**Features**:
- Backend connectivity status
- Database connection health
- API response times

---

### BUSINESS MANAGEMENT

#### 9. Shops Management (/admin/business-management/shops)
**Purpose**: Manage physical store locations
**Features**:
- Add new shop locations
- Edit shop details (name, location, timezone)
- Activate/deactivate shops
**Related Tables**: shops
**Fields**: id, name, location, timezone, is_active, created_at

#### 10. Managers (/admin/business-management/managers)
**Purpose**: Assign managers to shops
**Features**:
- Onboard new managers
- Assign manager to specific shop
- View manager qualifications and contact info
- Remove manager assignments
**Related Tables**: manager_details, user_shops

---

### INVENTORY MANAGEMENT

#### 11. Stock Management (/admin/business/inventory/stock)
**Purpose**: Track current inventory levels by bird type
**Database Tables**: inventory_ledger, current_stock_view
**Features**:
- View current stock levels by bird type (BROILER, DESI, TURKEY)
- View by inventory type (LIVE_BIRD, CURRY_CUT, SKINLESS, etc.)
- Stock movement tracking
- Low stock alerts

#### 12. SKUs (/admin/business/skus)
**Purpose**: Manage Stock Keeping Units
**Database Table**: skus
**Features**:
- Create/edit SKUs
- Set prices per store
- Configure bird types and inventory types
**Fields**: id, name, bird_type, inventory_type, price, is_active

#### 13. Processing (/admin/business/inventory/processing)
**Purpose**: Record bird processing operations
**Database Table**: processing_entries
**Features**:
- Convert live birds to processed products (curry cut, skinless, etc.)
- Automatic yield calculation based on wastage config
- Track processing date and staff
- Wastage configuration per bird type

---

### PURCHASES & SUPPLIERS

#### 14. Purchases (/admin/business/purchases)
**Purpose**: Record purchase orders from suppliers
**Database Tables**: purchases, purchase_items
**Features**:
- Create purchase orders
- Track supplier deliveries
- Record purchase costs
- Commit purchases to add stock to inventory
- Cancel purchases if needed
**Statuses**: DRAFT, COMMITTED, CANCELLED

#### 15. Suppliers (/admin/business/suppliers)
**Purpose**: Manage supplier database
**Database Table**: suppliers
**Features**:
- Supplier profiles
- Contact details (phone, address)
- GST number tracking
- Supply history
- Payment tracking
**Statuses**: ACTIVE, INACTIVE

---

### SALES & CUSTOMERS

#### 16. Sales (/admin/business/sales)
**Purpose**: Record daily sales transactions
**Database Tables**: sales, sale_items
**Features**:
- Record sale transactions (POS or BULK)
- Select items and quantities
- Apply prices per shop
- Support credit sales
- Track sales history
**Sale Types**: POS (walk-in), BULK (credit customers)

#### 17. POS (Point of Sale) (/admin/business/sales/pos)
**Purpose**: Quick sales entry for walk-in customers
**Features**:
- Fast item selection
- Quantity entry
- Real-time total calculation
- Cash/credit payment modes

#### 18. Customers (/admin/business/customers)
**Purpose**: Manage customer database
**Database Table**: customers
**Features**:
- Customer profiles
- Contact information
- Credit limit tracking
- Outstanding balance
- Customer ledger (transaction history)
**Statuses**: ACTIVE, INACTIVE

#### 19. Receipts (/admin/business/receipts)
**Purpose**: Manage payment receipts
**Database Table**: receipts
**Features**:
- Record cash/card receipts
- Link to sales transactions
- Customer payment tracking

#### 20. Payments (/admin/business/payments)
**Purpose**: Track outgoing payments
**Database Table**: payments
**Features**:
- Supplier payments
- Expense payments
- Payment history

---

### SETTLEMENTS & VARIANCE

#### 21. Settlements (/admin/business/settlements)
**Purpose**: Daily cash and stock reconciliation
**Database Table**: settlements
**Features**:
- Expected stock calculation
- Actual stock entry
- Variance detection (positive/negative)
- Cash collection tracking
- Submit for approval
**Statuses**: DRAFT, SUBMITTED, APPROVED, LOCKED

#### 22. Variance Management (/admin/business/variance)
**Purpose**: Handle stock discrepancies
**Database Table**: variance_records
**Features**:
- View pending variances
- Approve positive variance (found stock)
- Deduct negative variance (lost stock → triggers penalty points)
- Track resolution history
**Variance Types**: POSITIVE (found more stock), NEGATIVE (lost stock)

---

### FINANCE

#### 23. Expenses (/admin/business/finance/expenses)
**Purpose**: Track business expenses
**Database Table**: expenses
**Features**:
- Record expense transactions
- Categorize expenses
- Track expense trends
- Attach receipts (storage bucket)

#### 24. Ledger (/admin/business/finance/ledger)
**Purpose**: Account-wise transaction tracking
**Database Table**: customer_ledger
**Features**:
- Customer account balances
- Transaction history per customer
- Credit/debit tracking

---

### REPORTS

#### 25. Sales Report (/admin/business/reports/sales)
**Purpose**: Analyze sales performance
**Features**:
- Daily/weekly/monthly sales
- Shop-wise comparisons
- Product performance

#### 26. Purchase Report (/admin/business/reports/purchase)
**Purpose**: Analyze purchase patterns
**Features**:
- Supplier-wise purchases
- Category spending
- Purchase trends

#### 27. Expense Report (/admin/business/reports/expense)
**Purpose**: Expense analysis
**Features**:
- Category-wise expenses
- Trend analysis

#### 28. Wastage Report (/admin/business/reports/wastage)
**Purpose**: Wastage analysis
**Features**:
- Wastage trends
- Root cause analysis
- Cost impact

---

## STAFF POINTS & GRADING SYSTEM

### Overview
The Staff Points & Grading System is a **performance-based incentive framework** designed to:
- **Track staff performance** through measurable point-based metrics
- **Detect and minimize fraud** through variance penalties
- **Reward high performers** with bonuses based on their grade
- **Provide accountability** through monthly performance snapshots

### How Points Are Earned/Lost

| Action | Points | Type |
|--------|--------|------|
| Perfect settlement (Zero Variance) | **+10** | Reward |
| On-time settlement submission | **+2** | Reward |
| Positive variance approved (found stock) | **+3 per kg** | Reward |
| Late settlement submission | **-3** | Penalty |
| Negative variance (lost stock) | **-8 per kg** | Penalty |
| Manual correction by Admin | **-5** | Penalty |
| Repeated negative (3 consecutive days) | **-20** | Penalty |
| Settlement locked without submission | **-30** | Penalty |
| Missed settlement (sales but no submission) | **-15** | Penalty |
| Selling blocked stock | **-50** | Fraud |
| Inventory tampering | **-100** | Fraud |
| Bypassing POS system | **-100** | Fraud |
| Repeated fraud flag | **-500** | Fraud |

### Reason Codes
| Code | Description | Points | Category |
|------|-------------|--------|----------|
| `ZERO_VARIANCE` | Perfect settlement | +10 | Settlement |
| `POSITIVE_VARIANCE_APPROVED` | Found stock verified | +3/kg | Settlement |
| `NEGATIVE_VARIANCE` | Stock shortage | -8/kg | Settlement |
| `ON_TIME_SETTLEMENT` | Submitted on time | +2 | Discipline |
| `LATE_SETTLEMENT` | Late submission (<24h) | -3 | Discipline |
| `MANUAL_CORRECTION` | Admin manual fix | -5 | Discipline |
| `REPEATED_NEGATIVE_3DAYS` | 3 consecutive shortages | -20 | Discipline |
| `MISSED_SETTLEMENT` | Failed to submit on day with sales | -15 | Discipline |
| `SETTLEMENT_LOCKED_NO_SUBMIT` | Draft locked by system | -30 | Discipline |
| `SELLING_BLOCKED_STOCK` | Attempted fraud | -50 | Fraud |
| `INVENTORY_TAMPERING` | Tampering detected | -100 | Fraud |
| `BYPASSING_POS` | Bypassing POS system | -100 | Fraud |
| `REPEATED_FRAUD_FLAG` | Multiple fraud flags | -500 | Fraud |
| `ADMIN_BONUS` | Manual bonus | Variable | Manual |
| `ADMIN_PENALTY` | Manual penalty | Variable | Manual |

### Normalized Score
The normalized score is calculated as:
```
Normalized Score = Total Points ÷ Total Weight Handled (kg)
```

This ensures fairness across stores with different volumes.

### Grade Thresholds
| Grade | Min Score | Performance Level | Color |
|-------|-----------|-------------------|-------|
| **A+** | ≥ +0.50 | Outstanding | 🟡 Gold |
| **A** | ≥ +0.30 | Excellent | 🟢 Green |
| **B** | ≥ +0.10 | Good | 🔵 Blue |
| **C** | ≥ -0.10 | Average | ⚪ Grey |
| **D** | ≥ -0.30 | Below Average | 🟠 Orange |
| **E** | < -0.30 | Poor Performance | 🔴 Red |

### Bonus Rates (Per kg handled)
| Grade | Bonus Rate | Example (500 kg) |
|-------|------------|------------------|
| **A+** | ₹10/kg | ₹5,000 |
| **A** | ₹6/kg | ₹3,000 |
| **B** | ₹3/kg | ₹1,500 |
| **C** | ₹0/kg | ₹0 |
| **D** | ₹0/kg | ₹0 |
| **E** | ₹0/kg | ₹0 |

### Penalty Rates (For negative variance)
| Grade | Penalty Rate | Example (10 kg loss) |
|-------|--------------|----------------------|
| **A+, A, B** | ₹0/kg | ₹0 |
| **C** | ₹0/kg | ₹0 |
| **D** | ₹5/kg | ₹50 |
| **E** | ₹10/kg | ₹100 |

### Monthly Caps
| Limit | Amount |
|-------|--------|
| **Maximum Bonus** | ₹5,000/month |
| **Maximum Penalty** | ₹10,000/month |

### Fraud Detection
Auto-suspension threshold: **-200 points** cumulative

### Staff Points Pages
| Page | Route | Description |
|------|-------|-------------|
| My Performance | `/admin/business/staff-points` | View own points and history |
| Leaderboard | `/admin/business/staff-points/leaderboard` | Store/company rankings |
| Performance Management | `/admin/business/staff-points/performance` | Admin view of all staff |
| Risk Monitoring | `/admin/business/staff-points/risk-monitoring` | Fraud flags dashboard |
| Configuration | `/admin/business/staff-points/config` | Admin config for thresholds/rates |

---

## BUSINESS TERMS

### Poultry Terms
- **Broiler Birds**: Young chickens raised for meat (most common)
- **Desi Birds**: Country/native breed chickens
- **Turkey**: Turkey birds
- **Parent/Cull Birds**: Older breeding chickens sold for meat
- **Live Bird**: Whole live bird before processing
- **Curry Cut**: Bird cut into standard curry pieces
- **Skinless**: Bird with skin removed
- **Dressed Bird**: Cleaned and prepared for sale

### Business Terms
- **SKU**: Stock Keeping Unit (product code)
- **Base Price**: Default price before shop-specific adjustments
- **Daily Price**: Shop-specific price for a particular day
- **Wastage**: Product lost during processing (feathers, blood, organs)
- **Variance**: Difference between expected and actual stock
- **Settlement**: Daily reconciliation of stock and cash
- **POS**: Point of Sale (walk-in cash sales)
- **Bulk Sale**: Credit sales to registered customers

---

## DATABASE TABLES REFERENCE

### Core Tables
| Table Name | Purpose |
|------------|---------|
| profiles | User profiles and basic info |
| roles | Role definitions (Admin, Manager, etc.) |
| permissions | Permission keys and descriptions |
| role_permissions | Links roles to permissions |
| user_roles | Links users to roles |
| shops | Store/shop locations |
| user_sessions | Active login sessions |
| audit_logs | All system changes |
| system_settings | System configuration |
| manager_details | Manager-specific information |
| user_shops | User-to-shop assignments |

### Poultry Retail Tables
| Table Name | Purpose |
|------------|---------|
| suppliers | Supplier information |
| purchases | Purchase orders |
| purchase_items | Purchase line items |
| skus | Stock keeping units |
| sku_store_prices | Per-store SKU pricing |
| inventory_ledger | Stock movement ledger |
| current_stock_view | Current stock levels (view) |
| processing_entries | Bird processing records |
| wastage_config | Wastage rates by bird type |
| sales | Sales transactions |
| sale_items | Sale line items |
| customers | Customer database |
| customer_ledger | Customer transaction history |
| receipts | Payment receipts |
| payments | Outgoing payments |
| settlements | Daily settlements |
| variance_records | Stock variance tracking |

### Staff Points Tables
| Table Name | Purpose |
|------------|---------|
| staff_points | Individual point transactions |
| staff_points_config | Points configuration (rewards/penalties) |
| staff_grading_config | Grade thresholds and bonus rates |
| points_reason_codes | Reason code definitions |
| monthly_performance | Monthly performance snapshots |

### AI Tables
| Table Name | Purpose |
|------------|---------|
| ai_conversations | Invy chat conversations |
| ai_messages | Invy chat messages |
| knowledge_base | Invy's learned knowledge (embeddings) |

---

## AI ASSISTANT (Invy)

### What is Invy?
Invy is the AI-powered assistant built into Venus Chicken. Named for the business, Invy helps users:
- Query business data using natural language
- Understand system features
- Get help with tasks
- Access business insights

### Invy's Capabilities
1. **Database Queries**: Can look up any data the user has permission to access
2. **Business Knowledge**: Knows SOPs, policies, and procedures
3. **Page Context**: Understands which page the user is on
4. **Tool Execution**: Can run database queries and discover tables

### Example Questions for Invy
- "How many users do we have?"
- "What was the last sale?"
- "Show me my staff points"
- "What grade am I this month?"
- "What permissions does Store Manager have?"
- "How much bonus will I get?"
- "What are today's stock levels?"
- "Show me pending variances"

---

## TIPS FOR USERS

1. Always check you have the right permissions before accessing a page
2. Use the audit logs to track who made what changes
3. Set up managers for each shop for better accountability
4. Record wastage promptly for accurate reporting
5. Submit settlements daily to avoid penalty points
6. Maintain zero variance for maximum bonus
7. Use Invy (this AI) to quickly find information!

---

## ERROR HANDLING

If Invy cannot answer a question:
1. The data might not exist in the database
2. The user might not have permission to access that data
3. The question might need more context

Invy should always try to help by calling its tools before saying it cannot answer.

---

**Document Version**: 2.0  
**Generated**: January 2026
