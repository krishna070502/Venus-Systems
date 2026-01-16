# Migrations Reference

Complete reference of all 81 database migrations in the Venus-System.

## Migration Naming Convention

- `00X_` - Core system setup (001-009)
- `01X_` - Permission additions (010-019)
- `02X_` - Business management (020-029)
- `03X_` - Additional permissions and settings (030-039)
- `04X_` - Poultry enums and base tables (040-049)
- `05X_` - Advanced poultry features (050-059)
- `06X_` - Customer and ledger features (060-069)
- `07X_` - Staff and settlement features (070-079)
- `08X_` - Activity logging and fixes (080-083)

---

## Core System (001-009)

| File | Description |
|------|-------------|
| `001_initial_schema.sql` | Creates roles, permissions, user_roles, role_permissions, profiles tables |
| `002_seed_data.sql` | Seeds Admin, Manager, User roles and base permissions |
| `003_audit_logs.sql` | Creates audit_logs table with RLS policies |
| `004_auto_create_profile.sql` | Trigger to auto-create profile on user signup |
| `005_FIX-AUTH-TRIGGER.sql` | Fixes for authentication trigger |
| `006_add_last_sign_in_to_profiles.sql` | Adds last_sign_in_at column to profiles |
| `007_create_user_sessions_table.sql` | Creates user_sessions for session tracking |
| `008_FIX-AUDIT-AND-LOGIN.sql` | Fixes for audit logging and login flow |
| `009_RESTORE-PROPER-TRIGGERS.sql` | Restores proper database triggers |

---

## Permission Setup (010-022)

| File | Description |
|------|-------------|
| `010_add_test_permission.sql` | Adds `test.run` permission |
| `011_add_docs_permission.sql` | Adds `system.docs` permission |
| `012_add_systemdashboard_permission.sql` | Adds `systemdashboard.view` permission |
| `013_add_status_permission.sql` | Adds `system.status` permission |
| `014_add_systemadministration_permission.sql` | Adds `systemadministration.view` permission |
| `015_add_business_permission.sql` | Adds business module permissions |
| `016_add_purchases_payables_permissions.sql` | Adds purchases & payables permissions |
| `017_add_inventory_management_permissions.sql` | Adds inventory management permissions |
| `018_add_sales_income_permissions.sql` | Adds sales & income permissions |
| `019_add_finance_management_permissions.sql` | Adds finance management permissions |
| `020_add_insights_reports_permissions.sql` | Adds reporting permissions |
| `021_add_business_management_permission.sql` | Adds business management portal permissions |
| `022_add_shop_management_permissions.sql` | Adds shop management permissions |

---

## Business Management (023-035)

| File | Description |
|------|-------------|
| `023_business_management_tables_and_rls.sql` | Creates shops, manager_details, user_shops, inventory_items, daily_shop_prices with RLS |
| `024_add_inventory_items_permissions.sql` | Adds inventory item CRUD permissions |
| `025_add_gsearchbar_permission.sql` | Adds global search permissions |
| `026_create_system_settings_table.sql` | Creates system_settings key-value store |
| `027_add_roles_field_permissions.sql` | Adds field-level permissions for roles |
| `028_add_logs_field_permissions.sql` | Adds field-level permissions for logs |
| `029_add_users_field_permissions.sql` | Adds field-level permissions for users |
| `030_add_permissions_field_permissions.sql` | Adds field-level permissions for permissions |
| `031_add_items_purchase_permissions.sql` | Adds purchase item permissions |
| `033_add_item_type_to_inventory_items.sql` | Adds item_type column (purchase/sale) |
| `034_rate_limit_configs.sql` | Creates rate_limit_configs table |
| `035_ai_agent_tables.sql` | Creates ai_agent_configs and ai_knowledge_base tables |

---

## Poultry Core (040-049)

| File | Description |
|------|-------------|
| `040_poultry_enums_constants.sql` | Creates ENUM types for bird_type, cut_type, inventory_type, payment_method |
| `041_enhance_shops_table.sql` | Adds timezone, maintenance_mode to shops |
| `042_suppliers.sql` | Creates suppliers table |
| `043_purchases.sql` | Creates purchases and purchase_items tables |
| `044_inventory_ledger.sql` | Creates inventory_ledger for stock tracking |
| `045_current_stock_view.sql` | Creates current_stock view and helper functions |
| `046_wastage_config.sql` | Creates wastage_configs for processing yield |
| `047_processing_entries.sql` | Creates processing_entries for bird processing |
| `048_skus_and_pricing.sql` | Creates skus and sku_pricing tables |
| `049_sales.sql` | Creates sales and sale_items tables |

---

## Poultry Advanced (050-059)

| File | Description |
|------|-------------|
| `050_settlements.sql` | Creates settlements for daily reconciliation |
| `051_staff_points.sql` | Creates staff_points and point_history tables |
| `052_audit_enhancement.sql` | Enhances audit logging for poultry operations |
| `053_permissions_poultry.sql` | Adds granular poultry permissions |
| `054_migrate_inventory_to_skus.sql` | Migrates legacy inventory to SKU-based system |
| `055_staff_grading_system.sql` | Creates staff performance grading system |
| `056_poultry_granular_permissions.sql` | Adds 100+ granular poultry permissions |
| `057_fix_profiles_relationships.sql` | Fixes profile foreign key relationships |
| `058_wastage_config_active_status.sql` | Adds is_active to wastage_configs |
| `059_suppliers_field_alignment.sql` | Aligns supplier fields with models |

---

## Customer & Finance (060-069)

| File | Description |
|------|-------------|
| `060_customers_receipts_payments_ledger.sql` | Creates customers, receipts, payments, customer_ledger tables |
| `061_bird_count_tracking.sql` | Adds bird count tracking to inventory |
| `062_processing_auto_calculation.sql` | Auto-calculates processing yields |
| `063_fix_ambiguous_ledger_function.sql` | Fixes ambiguous function names |
| `064_auto_receipt_generation.sql` | Auto-generates receipt numbers |
| `065_bulk_sales_and_credit_support.sql` | Adds bulk sales and credit support |
| `066_pos_walkin_ledger_fix.sql` | Fixes walk-in customer ledger entries |
| `067_standardize_walkin_names.sql` | Standardizes walk-in customer naming |
| `068_fix_expected_stock_calculation.sql` | Fixes expected stock calculation |
| `069_shop_timezone_permission.sql` | Adds shop timezone management permission |

---

## Staff & Settlement (070-079)

| File | Description |
|------|-------------|
| `070_add_settlement_backdate_permission.sql` | Adds backdated settlement permission |
| `071_add_settlement_approve_permission.sql` | Adds settlement approval permission |
| `072_staff_performance_rpc.sql` | Creates staff performance RPC functions |
| `073_fix_add_staff_points.sql` | Fixes staff point addition function |
| `074_missed_settlement_penalty.sql` | Auto-penalty for missed settlements |
| `075_fix_timezone_in_missed_settlements.sql` | Fixes timezone handling in penalties |
| `076_admin_override_penalty.sql` | Admin override for penalties |
| `077_automatic_point_triggers.sql` | Auto-triggers for staff point events |
| `078_variance_ledger_adjustment.sql` | Variance-based ledger adjustments |

---

## Activity & Recent (080-083)

| File | Description |
|------|-------------|
| `080_expense_receipts_storage.sql` | Creates expenses and receipt storage |
| `081_enterprise_activity_logs.sql` | Creates app_activity_logs for auth events |
| `082_fix_activity_logs_relationship.sql` | Fixes activity logs FK to profiles |
| `083_admin_profiles_policy.sql` | Adds RLS policy for admin profile viewing |

---

## Running Migrations

### Via Supabase Dashboard

1. Go to SQL Editor
2. Open migration file
3. Execute

### Via Supabase CLI

```bash
supabase db push
```

### Manual Order

Migrations must be run in numerical order. Dependencies:

- 001 before 002-009
- 023 before 040+
- 040 before 041-083

---

## Related Pages

- [[Database-Schema]] - Table structures
- [[RLS-Policies]] - Row Level Security
- [[Poultry-Overview]] - Business module
