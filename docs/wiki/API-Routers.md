# API Routers Reference

Complete documentation of all API endpoints in the Venus-System backend.

## Router Summary

| Router | Prefix | Description | Endpoints |
|--------|--------|-------------|-----------|
| `auth` | `/api/v1/auth` | Authentication | 8 |
| `users` | `/api/v1/users` | User management | 6 |
| `roles` | `/api/v1/roles` | Role management | 7 |
| `permissions` | `/api/v1/permissions` | Permission management | 5 |
| `admin` | `/api/v1/admin` | Admin dashboard | 10 |
| `health` | `/api/v1/health` | Health checks | 3 |
| `business_management` | `/api/v1/business-management` | Shops, inventory, prices | 15+ |
| `ai` | `/api/v1/ai` | AI assistant | 5 |
| `activity_logs` | `/api/v1/activity-logs` | Activity logging | 2 |
| `rate_limits` | `/api/v1/rate-limits` | Rate limit config | 4 |
| `poultry_retail` | `/api/v1/poultry` | Business operations | 50+ |

---

## Authentication Router (`/api/v1/auth`)

**File:** `backend/app/routers/auth.py`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/registration-status` | Check if registration is enabled | Public |
| `GET` | `/maintenance-status` | Check maintenance mode | Public |
| `POST` | `/signup` | Register new user | Public |
| `POST` | `/login` | Login with credentials | Public |
| `POST` | `/logout` | Logout current user | Required |
| `GET` | `/me` | Get current user info | Required |
| `POST` | `/refresh` | Refresh access token | Required |
| `POST` | `/record-session` | Record session metadata | Required |

### Key Features
- Supabase Auth integration
- Activity logging on all auth events
- Maintenance mode support
- Registration toggle via settings

---

## Users Router (`/api/v1/users`)

**File:** `backend/app/routers/users.py`

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/me` | Get my profile | Authenticated |
| `PUT` | `/me` | Update my profile | Authenticated |
| `GET` | `/` | List all users | `users.read` |
| `GET` | `/{user_id}` | Get user by ID | `users.read` |
| `PUT` | `/{user_id}` | Update user | `users.write` |
| `DELETE` | `/{user_id}` | Delete user | `users.delete` |
| `GET` | `/search/` | Search users | `users.read` |

### Field-Level Security
Users router implements field-level permissions:
- `users.field.email` - View email addresses
- `users.field.name` - View full names
- `users.field.roles` - View role assignments
- `users.field.permissions` - View permissions

---

## Roles Router (`/api/v1/roles`)

**File:** `backend/app/routers/roles.py`

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/` | List all roles | `roles.read` |
| `GET` | `/{role_id}` | Get role details | `roles.read` |
| `POST` | `/` | Create role | `roles.write` |
| `PUT` | `/{role_id}` | Update role | `roles.write` |
| `DELETE` | `/{role_id}` | Delete role | `roles.delete` |
| `POST` | `/{role_id}/permissions/{permission_id}` | Assign permission | `roles.write` |
| `DELETE` | `/{role_id}/permissions/{permission_id}` | Remove permission | `roles.write` |

---

## Permissions Router (`/api/v1/permissions`)

**File:** `backend/app/routers/permissions.py`

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/` | List all permissions | `permissions.read` |
| `GET` | `/{permission_id}` | Get permission | `permissions.read` |
| `POST` | `/` | Create permission | `permissions.write` |
| `PUT` | `/{permission_id}` | Update permission | `permissions.write` |
| `DELETE` | `/{permission_id}` | Delete permission | `permissions.delete` |

---

## Admin Router (`/api/v1/admin`)

**File:** `backend/app/routers/admin.py`

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| `GET` | `/users` | List all users with roles | Admin |
| `POST` | `/users/{user_id}/roles/{role_id}` | Assign role | Admin |
| `DELETE` | `/users/{user_id}/roles/{role_id}` | Remove role | Admin |
| `GET` | `/roles` | Get all roles with permissions | Admin |
| `GET` | `/settings` | Get system settings | Admin |
| `PUT` | `/settings` | Update system settings | Admin |
| `GET` | `/settings/{key}` | Get specific setting | Admin |
| `GET` | `/logs` | Get audit logs | `system.logs` |
| `GET` | `/stats` | Get system statistics | `system.admin` |
| `GET` | `/sessions` | Get active sessions | Admin |

---

## Business Management Router (`/api/v1/business-management`)

**File:** `backend/app/routers/business_management.py`

### Shop Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/shops` | List shops | `shops.read` |
| `GET` | `/shops/{id}` | Get shop | `shops.read` |
| `POST` | `/shops` | Create shop | `shops.create` |
| `PUT` | `/shops/{id}` | Update shop | `shops.update` |
| `DELETE` | `/shops/{id}` | Delete shop | `shops.delete` |

### Manager Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/managers` | List managers | `managers.read` |
| `GET` | `/managers/unassigned` | Get unassigned managers | `managers.read` |
| `POST` | `/managers/onboard` | Onboard manager | `managers.onboard` |
| `DELETE` | `/managers/{user_id}` | Remove manager | `managers.onboard` |

### Inventory Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/inventory` | List inventory items | `inventoryitems.read` |
| `GET` | `/inventory/{id}` | Get item | `inventoryitems.read` |
| `POST` | `/inventory` | Create item | `inventoryitems.create` |
| `PUT` | `/inventory/{id}` | Update item | `inventoryitems.update` |
| `DELETE` | `/inventory/{id}` | Delete item | `inventoryitems.delete` |

### Price Configuration

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/prices/daily` | Get daily prices | `priceconfig.read` |
| `POST` | `/prices/bulk-update` | Bulk update prices | `priceconfig.write` |
| `DELETE` | `/prices/daily` | Delete daily price | `priceconfig.delete` |

---

## Activity Logs Router (`/api/v1/activity-logs`)

**File:** `backend/app/routers/activity_logs.py`

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/` | List activity logs | `system.logs` |
| `GET` | `/stats` | Get activity statistics | `system.logs` |

### Query Parameters
- `user_id` - Filter by user
- `event_type` - Filter by type (LOGIN, LOGOUT, SIGNUP, etc.)
- `status` - Filter by status (SUCCESS, FAILED)
- `from_date` / `to_date` - Date range
- `limit` / `offset` - Pagination

---

## AI Router (`/api/v1/ai`)

**File:** `backend/app/routers/ai.py`

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `POST` | `/chat` | Chat with AI assistant | Authenticated |
| `GET` | `/config` | Get AI configuration | `ai.admin` |
| `PUT` | `/config` | Update AI config | `ai.admin` |
| `POST` | `/knowledge/train` | Train on knowledge base | `ai.admin` |
| `GET` | `/knowledge/status` | Get training status | `ai.admin` |

---

## Health Router (`/api/v1/health`)

**File:** `backend/app/routers/health.py`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/` | Basic health check | Public |
| `GET` | `/status` | Detailed status | `system.status` |
| `GET` | `/detailed` | Full system health | `system.admin` |

---

## Poultry Retail Module

See [[Poultry-API-Reference]] for complete documentation of 16+ sub-routers:

- Suppliers
- Purchases  
- Inventory
- Processing
- SKUs
- Sales
- Settlements
- Variance
- Staff Points
- Grading
- Customers
- Receipts
- Payments
- Ledger
- Expenses
- Scheduled Tasks
