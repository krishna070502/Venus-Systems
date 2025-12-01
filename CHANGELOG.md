# Changelog

All notable changes to Venus Chicken will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.17.0] - 2025-11-30

### Added
- **Functional System Settings**
  - System settings now persist to database (`system_settings` table)
  - Database migration `026_create_system_settings_table.sql`
  - Settings table stores: `app_name`, `support_email`, `maintenance_mode`, `registration_enabled`, `api_version`
  - Type-safe value storage with `value_type` column (string, boolean, number, json)
  - Auto-updating `updated_at` trigger

- **User Registration Toggle**
  - "Allow new users to sign up" toggle in Settings page is now functional
  - Backend endpoint `GET /api/v1/auth/registration-status` (public)
  - Signup page checks registration status before showing form
  - Shows "Registration Disabled" message when turned off
  - Backend validates on signup POST (double protection)

- **Maintenance Mode**
  - "Disable access for non-admin users" toggle in Settings page is now functional
  - Backend endpoint `GET /api/v1/auth/maintenance-status` (public)
  - `MaintenanceGuard` component wraps admin layout
  - Non-admin users see maintenance page when enabled
  - Admin users can always access (bypass maintenance)
  - Auto-checks every 30 seconds for real-time status updates
  - Orange "MAINTENANCE" badge in header status indicators when active
  - Clean maintenance page with "Check Again" and "Sign Out" options

- **Global Search Bar**
  - Added search bar in header to quickly navigate pages
  - Keyboard shortcuts: `⌘K` (Mac) / `Ctrl+K` (Windows)
  - Permission-aware: only shows pages user can access
  - Grouped results by category (System Administration, Business, etc.)
  - Arrow key navigation and Enter to select
  - Database migration `025_add_gsearchbar_permission.sql`
  - `gsearchbar.view` permission controls visibility

### Changed
- Settings page completely rewritten with functional toggles
- Admin layout now includes `MaintenanceGuard` wrapper
- Status indicators show maintenance mode badge for admins

### Technical
- New component: `MaintenanceGuard.tsx` - Blocks non-admins during maintenance
- New component: `GlobalSearch.tsx` - Quick page navigation
- Updated: `StatusIndicators.tsx` - Shows maintenance badge
- Updated: `auth.py` - Registration and maintenance status endpoints
- Updated: `admin.py` - Settings CRUD from database

## [1.16.0] - 2025-11-30

### Added
- **Inventory Items Management Page**
  - Full CRUD operations for inventory items under Business > Inventory Management > Items
  - Search by name, SKU, or category
  - Filter by category and active status
  - Create new items with name, SKU, category, base price, and unit
  - Edit existing items
  - Delete items (with protection for items with price configurations)
  - Stats dashboard showing total, active, inactive items and categories

- **Database Migration (024)**
  - 5 new permissions: `inventoryitems.view`, `inventoryitems.read`, `inventoryitems.write`, `inventoryitems.update`, `inventoryitems.delete`
  - Assigned to Admin and Manager roles (full access)
  - Store Manager gets view and read only

- **Backend API Enhancements**
  - `GET /api/v1/business-management/inventory/{id}` - Get item by ID
  - `PUT /api/v1/business-management/inventory/{id}` - Update item
  - `DELETE /api/v1/business-management/inventory/{id}` - Delete item (with usage protection)
  - Updated existing inventory endpoints to use `inventoryitems.*` permissions

- **Frontend API Client**
  - Added `inventory.getById()`, `inventory.update()`, `inventory.delete()` methods

- **Sidebar Navigation**
  - Added "Items" link under Inventory Management dropdown

## [1.15.0] - 2025-11-30

### Added
- **Full Business Management Implementation**
  - Complete multi-tenant shop isolation with Row Level Security (RLS)
  - Manager onboarding workflow with atomic transactions
  - Day-wise price configuration per shop

- **Database Schema (Migration 023)**
  - `shops` table: Multi-location shop management
  - `manager_details` table: Manager qualifications and contact info
  - `user_shops` table: Manager-Shop assignments with composite PK
  - `inventory_items` table: Base inventory with SKU, category, pricing
  - `daily_shop_prices` table: Day-wise pricing per shop with unique constraint
  - RLS policies for strict shop data isolation (managers see only their shops)
  - "Store Manager" role with limited permissions
  - Seed data: 5 sample shops, 15 inventory items

- **New Permission**
  - `managers.onboard` - Admin-only permission for onboarding managers to shops

- **Backend API (`/api/v1/business-management/`)**
  - **Shops**: Full CRUD endpoints with shop isolation
  - **Managers**: 
    - `GET /managers` - List onboarded managers with shop info
    - `GET /managers/unassigned` - Users with Store Manager role not yet onboarded
    - `POST /managers/onboard` - Atomic transaction to create manager_details + user_shops
    - `DELETE /managers/{user_id}` - Remove manager (Admin only)
  - **Prices**:
    - `GET /prices/daily` - Get all items with daily/base prices for shop+date
    - `POST /prices/bulk-update` - Upsert multiple prices (Admin only)
    - `DELETE /prices/daily` - Remove daily price (reverts to base)
  - **Inventory**: List items with category filter

- **Frontend Pages (Fully Functional)**
  - **Shops Page** (`/admin/business-management/shops`)
    - CRUD operations with modal forms
    - Active/Inactive status toggle
    - Permission-based action buttons
  - **Managers Page** (`/admin/business-management/managers`)
    - Onboarded managers table with shop assignments
    - "Onboard Manager" modal with dropdown selectors
    - Fetches unassigned Store Manager role users
    - Remove manager functionality
  - **Price Config Page** (`/admin/business-management/price-config`)
    - Shop selector + Date picker filters
    - Grid display with base price and editable daily price
    - Bulk save with upsert logic
    - "Custom" badge for items with daily pricing
    - Read-only mode for users without write permission

- **API Client Extensions**
  - `api.businessManagement.shops.*` - Shop CRUD methods
  - `api.businessManagement.managers.*` - Manager onboarding methods
  - `api.businessManagement.prices.*` - Daily pricing methods
  - `api.businessManagement.inventory.*` - Inventory list methods

### Security
- Row Level Security (RLS) on `user_shops` and `daily_shop_prices`
- Admins bypass RLS, managers see only their assigned shop data
- `priceconfig.write` permission required for price modifications
- `managers.onboard` permission restricted to Admin role

### Technical
- Pydantic models: Shop, Manager, InventoryItem, DailyPrice, BulkPriceUpdate
- Atomic transactions for manager onboarding (rollback on failure)
- Decimal precision for prices (10,2)
- Updated_at triggers on all new tables
- Frontend API client with TypeScript types

## [1.14.0] - 2025-11-26

### Added
- **Shop Management Module**
  - Added nested "Shop Management" dropdown inside Business Management section
  - Comprehensive CRUD permissions for 3 modules:
    - **Shops**: 5 permissions (view, read, write, update, delete)
    - **Managers**: 5 permissions (view, read, write, update, delete)
    - **Price Config**: 5 permissions (view, read, write, update, delete)
  - Parent permission `shopmanagement.view` controls nested dropdown visibility
  - "Coming Soon" pages with permission status indicators:
    - `/admin/business-management/shops` - Manage shop locations and branches
    - `/admin/business-management/managers` - Manage shop managers and assignments
    - `/admin/business-management/price-config` - Configure product pricing strategies
  - Database migration `022_add_shop_management_permissions.sql`
  - Auto-assigns all 16 permissions to Admin and Manager roles
  - Added Store, UserCog, and Tags icons from lucide-react

### Technical
- First nested module within Business Management section
- Follows same nested dropdown pattern as Business section modules
- Permission structure: Parent controls section visibility, individual permissions control CRUD operations
- Consistent "Coming Soon" page design with permission status display

## [1.13.0] - 2025-11-26

### Added
- **Business Management Section**
  - Added new "Business Management" dropdown in sidebar
  - Permission `businessmanagement.view` controls access to entire section
  - Database migration `021_add_business_management_permission.sql`
  - Auto-assigns permission to Admin and Manager roles
  - Ready for business management modules to be added

### Technical
- New top-level navigation group alongside System Administration and Business
- Follows same permission structure as other navigation groups
- Expandable/collapsible dropdown with nested item support

## [1.12.0] - 2025-11-26

### Added
- **Insights & Reports Module**
  - Added nested "📊 Insights & Reports" dropdown inside Business section
  - Comprehensive CRUD permissions for 4 report modules:
    - **Sales Reports**: 5 permissions (view, read, write, update, delete)
    - **Purchase Reports**: 5 permissions (view, read, write, update, delete)
    - **Expense Reports**: 5 permissions (view, read, write, update, delete)
    - **Wastage Reports**: 5 permissions (view, read, write, update, delete)
  - Parent permission `analytics.view` controls entire nested section
  - Four "Coming Soon" pages with permission status indicators:
    - `/admin/business/reports/sales` - Analyze sales data and insights
    - `/admin/business/reports/purchase` - Analyze purchase and supplier data
    - `/admin/business/reports/expense` - Analyze expense patterns
    - `/admin/business/reports/wastage` - Track and analyze wastage patterns
  - Database migration `020_add_insights_reports_permissions.sql`
  - Auto-assigns all 21 permissions to Admin and Manager roles
  - Added icons: BarChart3, LineChart, PieChart, FileBarChart, Trash2 from lucide-react

### Technical
- Follows same nested dropdown pattern as other business modules
- Permission structure: Parent controls section visibility, individual permissions control CRUD operations
- Consistent "Coming Soon" page design with permission status display
- Business section now has 5 nested modules with 85 CRUD permissions total

## [1.11.0] - 2025-11-26

### Added
- **Finance Management Module**
  - Added nested "🏬 Finance Management" dropdown inside Business section
  - Comprehensive CRUD permissions for 3 modules:
    - **Expenses**: 5 permissions (view, read, write, update, delete)
    - **Cashbook**: 5 permissions (view, read, write, update, delete)
    - **Ledger**: 5 permissions (view, read, write, update, delete)
  - Parent permission `finance.view` controls entire nested section
  - Three "Coming Soon" pages with permission status indicators:
    - `/admin/business/finance/expenses` - Track business expenses
    - `/admin/business/finance/cashbook` - Manage cash transactions
    - `/admin/business/finance/ledger` - General ledger accounting
  - Database migration `019_add_finance_management_permissions.sql`
  - Auto-assigns all 16 permissions to Admin and Manager roles
  - Added icons: Landmark, Banknote, Wallet, BookOpenCheck from lucide-react

### Technical
- Follows same nested dropdown pattern as other business modules
- Permission structure: Parent controls section visibility, individual permissions control CRUD operations
- Consistent "Coming Soon" page design with permission status display
- Business section now has 4 nested modules: Purchases & Payables, Inventory, Sales & Income, Finance

## [1.10.0] - 2025-11-26

### Added
- **Sales & Income Module**
  - Added nested "💰 Sales & Income" dropdown inside Business section
  - Comprehensive CRUD permissions for 3 modules:
    - **Sales**: 5 permissions (view, read, write, update, delete)
    - **Customers**: 5 permissions (view, read, write, update, delete)
    - **Receipts**: 5 permissions (view, read, write, update, delete)
  - Parent permission `salesincome.view` controls entire nested section
  - Three "Coming Soon" pages with permission status indicators:
    - `/admin/business/sales` - Track sales transactions
    - `/admin/business/customers` - Manage customer database
    - `/admin/business/receipts` - Manage sales receipts
  - Database migration `018_add_sales_income_permissions.sql`
  - Auto-assigns all 16 permissions to Admin and Manager roles
  - Added icons: DollarSign, TrendingUp, UserCheck, FileCheck from lucide-react

### Technical
- Follows same nested dropdown pattern as Purchases & Payables and Inventory Management
- Permission structure: Parent controls section visibility, individual permissions control CRUD operations
- Consistent "Coming Soon" page design with permission status display

## [1.9.0] - 2025-11-26

### Added
- **Inventory Management Module**
  - Added nested "📦 Inventory Management" dropdown inside Business section
  - Comprehensive CRUD permissions for 3 modules:
    - **Stock**: 5 permissions (view, read, write, update, delete)
    - **Wastage**: 5 permissions (view, read, write, update, delete)
    - **Adjustments**: 5 permissions (view, read, write, update, delete)
  - Parent permission `inventory.view` controls entire nested section
  - Three "Coming Soon" pages with permission status indicators:
    - `/admin/business/inventory/stock` - Manage inventory stock levels
    - `/admin/business/inventory/wastage` - Track inventory wastage
    - `/admin/business/inventory/adjustments` - Make inventory adjustments
  - Database migration `017_add_inventory_management_permissions.sql`
  - Auto-assigns all 16 permissions to Admin and Manager roles
  - Added icons: Package, Box, Trash2, ClipboardEdit from lucide-react

### Technical
- Follows same nested dropdown pattern as Purchases & Payables
- Permission structure: Parent controls section visibility, individual permissions control CRUD operations
- Consistent "Coming Soon" page design with permission status display

## [1.8.0] - 2025-11-26

### Added
- **Purchases & Payables Module**
  - Added nested "🧾 Purchases & Payables" dropdown inside Business section
  - Comprehensive CRUD permissions for 3 modules:
    - **Purchases**: 5 permissions (view, read, write, update, delete)
    - **Suppliers**: 5 permissions (view, read, write, update, delete)
    - **Payments**: 5 permissions (view, read, write, update, delete)
  - Parent permission `purchase&payment.view` controls entire nested section
  - Three "Coming Soon" pages with permission status indicators:
    - `/admin/business/purchases` - Manage purchase orders
    - `/admin/business/suppliers` - Manage supplier relationships
    - `/admin/business/payments` - Track payment transactions
  - Database migration `016_add_purchases_payables_permissions.sql`
  - Auto-assigns all 16 permissions to Admin and Manager roles
  - Enhanced sidebar with nested dropdown support
  - Recursive permission filtering for multi-level navigation

### Changed
- Sidebar now supports nested navigation groups (groups within groups)
- Updated TypeScript interfaces to handle multi-level navigation
- Enhanced permission filtering logic with recursive function
- Improved rendering logic for nested dropdowns with indentation

### Technical
- Added icons: Receipt, ShoppingCart, Truck, CreditCard from lucide-react
- Implemented `isNavigationGroup` type guard for nested detection
- Created `filterNavigationGroup` recursive function
- Enhanced rendering with nested group expansion/collapse
- Permission structure: Parent controls section, individual permissions control CRUD operations

## [1.7.0] - 2025-11-26

### Added
- **Business Dropdown Menu**
  - Added new "Business" section in sidebar navigation
  - New permission `business.view` controls Business section visibility
  - Ready for business-related pages to be added
  - Database migration `015_add_business_permission.sql`
  - Auto-assigns to Admin and Manager roles
- **Collapsible Sidebar**
  - Added collapse/expand toggle button
  - Icon-only view when collapsed (64px width)
  - Full view when expanded (256px width)
  - Shows "VC" logo when collapsed
  - Tooltips on hover for all navigation items
  - Smooth 300ms transition animations
  - Fixed z-index layering

## [1.6.0] - 2025-11-26

### Added
- **System Administration Dropdown Menu**
  - Grouped sidebar navigation into "System Administration" section
  - Added collapsible dropdown for better organization
  - New permission `systemadministration.view` controls entire section visibility
  - Groups 8 pages: Dashboard, Users, Roles, Permissions, Health, Settings, Logs, Test
  - Improved navigation UX with expand/collapse functionality
  - Database migration `014_add_systemadministration_permission.sql`
  - Auto-assigns to Admin and Manager roles

### Changed
- Sidebar now uses grouped navigation structure
- Individual page permissions still enforced within the group
- Enhanced visual hierarchy with indented sub-items
- Added chevron indicators for dropdown state

## [1.5.0] - 2025-11-26

### Added
- **Dynamic Permission Display System**
  - Landing page now shows ALL user permissions automatically
  - Feature cards display for 9 mapped permissions with icons, names, descriptions, and navigation links
  - "Additional Permissions" section displays unmapped permissions as badges
  - New permissions appear automatically without code changes
  - Fully scalable architecture using featureMap pattern

### Changed
- Converted hardcoded permission display (140 lines) to dynamic system (35 lines)
- "Your Available Features" section now renders all permissions dynamically
- Improved code maintainability and scalability for future permission additions
- Updated UI_COMPONENTS.md with detailed dynamic feature display documentation
- Updated PERMISSION_SYSTEM.md with featureMap implementation guide

### Technical
- Created featureMap for 9 known permissions
- Automatic filtering of permissions into availableFeatures and otherPermissions
- Dynamic rendering using .map() instead of individual permission checks
- Clear separation between UI features and raw permissions

## [1.4.0] - 2025-11-26

### Added
- **Dedicated Status Indicator Permission**
  - Added `system.status` permission for viewing API status indicators
  - Separated status indicator access from `system.admin`
  - More granular control over who can view backend/database status
  - Database migration `013_add_status_permission.sql`
  - Auto-assigns to Admin and Manager roles

### Changed
- StatusIndicators component now requires `system.status` instead of `system.admin`
- Updated all documentation with new permission

## [1.3.0] - 2025-11-26

### Added
- **Home Landing Page**
  - Created beautiful landing page for users without `systemdashboard.view` permission
  - Shows welcome message with Venus Chicken branding and gradient effects
  - Displays app features: Enterprise Security, Modern UI, Real-Time Monitoring
  - "Your Available Features" section dynamically shows all accessible pages
  - Displays 9 possible features based on user permissions
  - Provides help section for requesting additional access
  - Improves UX for users with limited permissions

### Changed
- Dashboard now shows different content based on `systemdashboard.view` permission
- Users without dashboard permission see Home Landing Page instead of access denied
- Enhanced permission-based UI rendering

## [1.2.0] - 2025-11-26

### Added
- **Dashboard Permission Control**
  - Added `systemdashboard.view` permission for dashboard access
  - Dashboard now requires `systemdashboard.view` permission to view
  - Allows separation between system dashboard and future business dashboards
  - Database migration `012_add_systemdashboard_permission.sql`
  - Auto-assigns to Admin and Manager roles

### Changed
- Updated documentation with `systemdashboard.view` permission
- Enhanced sidebar navigation to filter dashboard based on permission

## [1.1.0] - 2025-11-26

### Added
- **Permission Control for Documentation**
  - Added `system.docs` permission for documentation access
  - Documentation page now requires `system.docs` permission
  - API Documentation link requires `system.docs` permission
  - Sidebar filters documentation links based on permissions

- **Permission Control for Status Indicators**
  - Backend and Database status indicators require `system.admin` permission
  - Status indicators hidden for users without admin access
  - Real-time health monitoring restricted to admin users

- **Permission Control for Roles Page**
  - Roles management page now requires `roles.read` permission
  - Enhanced RBAC for role administration

- **Database Migration**
  - Added migration `011_add_docs_permission.sql` for `system.docs` permission
  - Auto-assigns `system.docs` to Admin and Manager roles

### Changed
- Updated documentation to reflect new permission requirements
- Enhanced `PERMISSION_SYSTEM.md` with complete permission list
- Updated `README.md` with new permission examples
- Improved `UI_COMPONENTS.md` with StatusIndicators permission details

### Fixed
- Fixed duplicate function export in RolesPage component
- Resolved build errors in roles page

## [1.0.0] - 2025-11-26

### Added
- Initial release of Venus Chicken Enterprise SaaS Starter Kit
- Complete RBAC system with granular permissions
- Next.js 14 frontend with TypeScript
- FastAPI backend with Python 3.11
- Supabase PostgreSQL database
- JWT authentication system
- Beautiful admin panel with shadcn/ui
- Audit logging system
- Session management
- Health monitoring dashboard
- Global alert modal system
- Loading animations (4 variants)
- Comprehensive documentation suite
- Proprietary license
