# Venus Chicken - Complete Application Guide for Invy

This document contains everything Invy needs to know about the Venus Chicken application to answer any user question.

## Application Overview

Venus Chicken is a comprehensive business management system for a poultry (chicken) business operating in India. The system includes:
- **Admin Dashboard**: Central control panel for all operations
- **User Management**: Managing employees, roles, and permissions
- **Business Operations**: Inventory, sales, purchases, finance tracking
- **AI Assistant (Invy)**: Intelligent helper for queries and operations

## Currency and Location

- **Location**: India
- **Currency**: Always use Indian Rupees (₹ / INR)
- **Language**: English with Indian business context

---

## PAGES AND FEATURES

### 1. Dashboard (/admin)
**Purpose**: Overview of the entire business at a glance
**Features**:
- Total users count
- Active sessions
- System health status
- Quick access to all modules
**Related Tables**: profiles, user_sessions, system_settings

### 2. Users Page (/admin/users)
**Purpose**: Manage all system users
**Features**:
- View all registered users
- Edit user profiles
- Assign/remove roles
- Activate/deactivate accounts
**Related Tables**: profiles, user_roles
**Permissions Required**: users.read, users.write

### 3. Roles Page (/admin/roles)
**Purpose**: Define and manage user roles
**Features**:
- Create new roles (e.g., Admin, Store Manager, Cashier)
- Edit role names and descriptions
- Assign permissions to roles
- Delete unused roles
**Related Tables**: roles, role_permissions
**Permissions Required**: roles.read, roles.write

### 4. Permissions Page (/admin/permissions)
**Purpose**: Manage granular permissions
**Features**:
- Create new permissions
- Edit permission keys and descriptions
- Delete permissions
- View which roles have which permissions
**Related Tables**: permissions, role_permissions
**Permission Format**: resource.action (e.g., users.read, inventory.write)

### 5. Active Sessions (/admin/sessions)
**Purpose**: Monitor who is logged into the system
**Features**:
- View all active user sessions
- See IP addresses, browsers, and devices
- Identify suspicious login activity
- "Active Now" indicator for recent activity
**Related Tables**: user_sessions

### 6. Audit Logs (/admin/logs)
**Purpose**: Complete audit trail of all system changes
**Features**:
- View all CREATE, UPDATE, DELETE actions
- Filter by action type, resource, user
- Export logs
- View detailed changes (before/after)
**Related Tables**: audit_logs
**Columns**: timestamp, action, resource_type, resource_id, changes, user_id, ip_address, user_agent

### 7. System Settings (/admin/settings)
**Purpose**: Configure system-wide settings
**Features**:
- Enable/disable user registration
- Enable/disable maintenance mode
- Configure business parameters
**Related Tables**: system_settings

---

## BUSINESS MANAGEMENT PAGES

### 8. Shops Management (/admin/business-management/shops)
**Purpose**: Manage physical store locations
**Features**:
- Add new shop locations
- Edit shop details (name, location)
- Activate/deactivate shops
**Related Tables**: shops
**Fields**: id, name, location, is_active, created_at

### 9. Managers (/admin/business-management/managers)
**Purpose**: Assign managers to shops
**Features**:
- Onboard new managers
- Assign manager to specific shop
- View manager qualifications
- Remove manager assignments
**Related Tables**: manager_details, user_shops

### 10. Price Configuration (/admin/business-management/price-config)
**Purpose**: Set and manage daily product prices
**Features**:
- Set base prices for inventory items
- Configure daily shop-specific prices
- Bulk price updates
**Related Tables**: inventory_items, daily_shop_prices

---

## INVENTORY MANAGEMENT

### 11. Items-Purchase (/admin/business/inventory/items-purchase)
**Purpose**: Manage items that are PURCHASED (bought from suppliers)
**Database Table**: inventory_items (with filter: item_type = 'purchase')
**Features**:
- Add purchase items (Broiler Birds, Parent/Cull Birds, Feed, Medicine, Equipment, Packaging)
- Set base prices
- Categorize items
- Activate/deactivate items
**Fields**: id, name, sku, category, base_price, unit, item_type, is_active

### 12. Stock Management (/admin/business/inventory/stock)
**Purpose**: Track current inventory levels
**Database Table**: inventory_items (general view)
**Features**:
- View current stock levels
- Stock adjustments
- Low stock alerts

### 13. Inventory Adjustments (/admin/business/inventory/adjustments)
**Purpose**: Record stock corrections and adjustments
**Features**:
- Add/subtract quantities
- Record reasons for adjustments
- Track adjustment history

### 14. Wastage Tracking (/admin/business/inventory/wastage)
**Purpose**: Track product wastage/loss
**Features**:
- Record wastage incidents
- Categorize wastage reasons
- Generate wastage reports

---

## SALES AND PURCHASES

### 15. Sales (/admin/business/sales)
**Purpose**: Record daily sales transactions
**Features**:
- Record sale transactions
- Select items and quantities
- Apply prices per shop
- Track sales history

### 16. Sales Items (/admin/business/sales-items)
**Purpose**: Detailed view of items sold
**Features**:
- Individual line items from sales
- Quantity and price details

### 17. Purchases (/admin/business/purchases)
**Purpose**: Record purchase orders from suppliers
**Features**:
- Create purchase orders
- Track supplier deliveries
- Record purchase costs

### 18. Receipts (/admin/business/receipts)
**Purpose**: Manage payment receipts
**Features**:
- Record cash/card receipts
- Link to sales/purchases
- Payment tracking

### 19. Payments (/admin/business/payments)
**Purpose**: Track outgoing payments
**Features**:
- Supplier payments
- Expense payments
- Payment history

---

## FINANCE

### 20. Expenses (/admin/business/finance/expenses)
**Purpose**: Track business expenses
**Features**:
- Record expense transactions
- Categorize expenses
- Track expense trends

### 21. Cashbook (/admin/business/finance/cashbook)
**Purpose**: Daily cash flow tracking
**Features**:
- Opening/closing balances
- Cash in/out records
- Daily reconciliation

### 22. Ledger (/admin/business/finance/ledger)
**Purpose**: Account-wise transaction tracking
**Features**:
- Account balances
- Transaction history per account
- Financial summaries

---

## REPORTS

### 23. Sales Report (/admin/business/reports/sales)
**Purpose**: Analyze sales performance
**Features**:
- Daily/weekly/monthly sales
- Shop-wise comparisons
- Product performance

### 24. Purchase Report (/admin/business/reports/purchase)
**Purpose**: Analyze purchase patterns
**Features**:
- Supplier-wise purchases
- Category spending
- Purchase trends

### 25. Expense Report (/admin/business/reports/expense)
**Purpose**: Expense analysis
**Features**:
- Category-wise expenses
- Trend analysis
- Budget comparisons

### 26. Wastage Report (/admin/business/reports/wastage)
**Purpose**: Wastage analysis
**Features**:
- Wastage trends
- Root cause analysis
- Cost impact

---

## CUSTOMERS AND SUPPLIERS

### 27. Customers (/admin/business/customers)
**Purpose**: Manage customer database
**Features**:
- Customer profiles
- Contact information
- Purchase history

### 28. Suppliers (/admin/business/suppliers)
**Purpose**: Manage supplier database
**Features**:
- Supplier profiles
- Contact details
- Supply history
- Payment tracking

---

## AI ASSISTANT (Invy)

### What is Invy?
Invy is the AI-powered assistant built into Venus Chicken. Named after the traditional Venus Chicken brand, Invy helps users:
- Query business data using natural language
- Understand system features
- Get help with tasks
- Access business insights

### Invy's Capabilities:
1. **Database Queries**: Can look up any data the user has permission to access
2. **Business Knowledge**: Knows SOPs, policies, and procedures
3. **Page Context**: Understands which page the user is on
4. **Learning**: Can record new business rules when told

### How to Ask Invy Questions:
- "How many users do we have?"
- "What was the last sale?"
- "Show me active inventory items"
- "What permissions does Store Manager have?"
- "What can I do on this page?"

---

## DATABASE TABLES REFERENCE

| Table Name | Purpose |
|------------|---------|
| profiles | User profiles and basic info |
| roles | Role definitions (Admin, Manager, etc.) |
| permissions | Permission keys and descriptions |
| role_permissions | Links roles to permissions |
| user_roles | Links users to roles |
| shops | Store/shop locations |
| inventory_items | All inventory items (purchase & sale types) |
| daily_shop_prices | Shop-specific daily prices |
| user_sessions | Active login sessions |
| audit_logs | All system changes |
| system_settings | System configuration |
| manager_details | Manager-specific information |
| user_shops | User-to-shop assignments |
| ai_conversations | Invy chat conversations |
| ai_messages | Invy chat messages |
| knowledge_base | Invy's learned knowledge |

---

## COMMON BUSINESS TERMS

- **Broiler Birds**: Young chickens raised for meat
- **Parent/Cull Birds**: Older breeding chickens sold for meat
- **SKU**: Stock Keeping Unit (product code)
- **Base Price**: Default price before shop-specific adjustments
- **Daily Price**: Shop-specific price for a particular day
- **Wastage**: Product lost due to spoilage, damage, or death
- **Adjustment**: Manual correction to inventory levels

---

## TIPS FOR USERS

1. Always check you have the right permissions before accessing a page
2. Use the audit logs to track who made what changes
3. Set up managers for each shop for better accountability
4. Record wastage promptly for accurate reporting
5. Use Invy (this AI) to quickly find information!

---

## ERROR HANDLING

If Invy cannot answer a question:
1. The data might not exist in the database
2. The user might not have permission to access that data
3. The question might need more context

Invy should always try to help by calling its tools before saying it cannot answer.
