# Technical Documentation: Poultry Retail Analytics Suite

This document detailes the changes and upgrades made to the Venus Chicken Systems to implement professional analytics dashboards and harden the platform's security.

## Overview
The "Coming Soon" placeholders for Sales, Wastage, Purchase, and Expense reports have been replaced with high-end, data-driven dashboards. Simultaneously, the security model was updated to ensure strict isolation between operational duties and business intelligence.

---

## 1. Backend Changes (Core Logic & Security)

### Shared Security Utilities
**File:** [utils.py](file:///Users/gopalsmac/Documents/Venus-System/backend/app/routers/poultry_retail/utils.py)
- **`validate_store_access(store_id, user)`**: Consolidated duplicate logic from 4 different routers into one shared function. Updated to check both top-level `store_ids` and `user_metadata` for multi-store permissions.
- **`has_allstores_permission(user)`**: Centralized the check for admin or specific "allstores" permissions.

### Analytics Endpoints
Implemented or Hardened the following endpoints:

| Endpoint | File | Permission Required | Description |
| :--- | :--- | :--- | :--- |
| `GET /sales/analytics` | [sales.py](file:///Users/gopalsmac/Documents/Venus-System/backend/app/routers/poultry_retail/sales.py) | `salesreport.view` | Trend analysis and SKU rankings. |
| `GET /processing/analytics`| [processing.py](file:///Users/gopalsmac/Documents/Venus-System/backend/app/routers/poultry_retail/processing.py) | `wastagereport.view`| Yield and wastage tracking. |
| `GET /purchases/analytics` | [purchases.py](file:///Users/gopalsmac/Documents/Venus-System/backend/app/routers/poultry_retail/purchases.py) | `purchasereport.view`| Procurement spend and supplier share. |
| `GET /expenses/analytics` | [expenses.py](file:///Users/gopalsmac/Documents/Venus-System/backend/app/routers/poultry_retail/expenses.py) | `expensereport.view` | **NEW**: Includes keyword-based categorization. |

### Data Models
**File:** [settlements.py](file:///Users/gopalsmac/Documents/Venus-System/backend/app/models/poultry_retail/settlements.py)
- Added `ExpenseAnalyticsResponse`, `ExpenseTrendItem`, and `ExpenseCategoryItem` Pydantic models to support structured analytics delivery.

---

## 2. Frontend Changes (UI & Integration)

### Dashboard Implementation
**File:** [Expense Reports Page](file:///Users/gopalsmac/Documents/Venus-System/frontend/app/admin/business/reports/expense/page.tsx)
- **Categorical Breakdown**: Implemented a Pie chart for expense distribution.
- **KPI Grid**: Real-time cards for Total, Average, Approved, and Pending expenses.
- **Trend Chart**: Interactive Area chart for monitoring burn rates.

### API Client
**File:** [client.ts](file:///Users/gopalsmac/Documents/Venus-System/frontend/lib/api/client.ts)
- Integrated `getAnalytics` for the expenses module.
- Standardized the use of the `api` singleton across all report pages.

### Security Hardening (UI Layer)
- Updated all report pages to use the specific `*report.view` permissions in `PermissionGuard`.
- Fixed import errors where `poultryApi` was being called instead of the standard `api` client.

---

## 3. Permission Isolation Matrix
To prevent unauthorized data access, the following decoupling was performed:

| Target Page | View Permission | Operational Permission (Unaffected) |
| :--- | :--- | :--- |
| Sales Reports | `salesreport.view` | `sales.view` |
| Purchase Reports | `purchasereport.view` | `purchases.view` |
| Wastage Reports | `wastagereport.view` | `processing.view` |
| Expense Reports | `expensereport.view` | `expense.read` |

**Security Result**: A store manager can still perform sales and view local history, but they are strictly blocked from seeing aggregated business analytics by both the UI and the Backend API.
