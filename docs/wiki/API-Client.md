# API Client

The frontend uses a centralized API client for all backend communication.

## Overview

**File:** `frontend/lib/api/client.ts`

The API client provides type-safe methods for all backend endpoints.

## Core Functions

### Authentication Token

```typescript
async function getAuthToken(): Promise<string | null> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}
```

### Base Request Function

```typescript
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'An error occurred' }))
    throw new Error(error.detail || error.message || 'API request failed')
  }

  return response.json()
}
```

---

## API Namespaces

### Users

```typescript
api.users.getMe()
api.users.updateMe(data)
api.users.getAll(limit, offset)
api.users.getById(id)
api.users.update(id, data)
api.users.delete(id)
api.users.search(query)
```

### Roles

```typescript
api.roles.getAll()
api.roles.getById(id)
api.roles.create(data)
api.roles.update(id, data)
api.roles.delete(id)
api.roles.assignPermission(roleId, permissionId)
api.roles.removePermission(roleId, permissionId)
```

### Permissions

```typescript
api.permissions.getAll()
api.permissions.getById(id)
api.permissions.create(data)
api.permissions.update(id, data)
api.permissions.delete(id)
```

### Auth

```typescript
api.auth.getMe()
api.auth.logout()
api.auth.recordSession()
```

### Admin

```typescript
api.admin.getStats()
api.admin.getSettings()
api.admin.updateSettings(settings)
api.admin.getSetting(key)
api.admin.getLogs(limit, offset)
```

### Health

```typescript
api.health.get()
api.health.getStatus()
api.health.getDetailed()
```

### Activity Logs

```typescript
api.activityLogs.getAll(params)
api.activityLogs.getStats()
```

### AI

```typescript
api.ai.chat(message, context)
api.ai.getConfig()
api.ai.updateConfig(config)
```

---

## Business Management

### Shops

```typescript
api.businessManagement.shops.getAll(isActive?)
api.businessManagement.shops.getById(id)
api.businessManagement.shops.create(data)
api.businessManagement.shops.update(id, data)
api.businessManagement.shops.delete(id)
```

### Managers

```typescript
api.businessManagement.managers.getAll()
api.businessManagement.managers.getUnassigned()
api.businessManagement.managers.onboard(data)
api.businessManagement.managers.remove(userId)
```

### Inventory

```typescript
api.businessManagement.inventory.getAll(isActive?, category?, itemType?)
api.businessManagement.inventory.getById(id)
api.businessManagement.inventory.create(data)
api.businessManagement.inventory.update(id, data)
api.businessManagement.inventory.delete(id)
```

### Prices

```typescript
api.businessManagement.prices.getDaily(shopId, date)
api.businessManagement.prices.bulkUpdate(data)
```

---

## Poultry Retail

### Store Header Pattern

Many poultry endpoints require a store ID header:

```typescript
const headers = { 'X-Store-ID': storeId.toString() }
```

### Available Endpoints

```typescript
// Suppliers
api.poultry.suppliers.getAll()
api.poultry.suppliers.getById(id)
api.poultry.suppliers.create(data)

// Purchases
api.poultry.purchases.getAll(storeId, params)
api.poultry.purchases.create(data)
api.poultry.purchases.getById(id)

// Inventory
api.poultry.inventory.getStock(storeId, birdType?)
api.poultry.inventory.getLedger(storeId, params)
api.poultry.inventory.createAdjustment(data)

// Sales
api.poultry.sales.create(data)
api.poultry.sales.getAll(storeId, params)
api.poultry.sales.getDailySummary(storeId, date)

// Settlements
api.poultry.settlements.getAll(storeId, params)
api.poultry.settlements.create(data)
api.poultry.settlements.submit(id, data)
api.poultry.settlements.approve(id)

// Variance
api.poultry.variance.getAll(storeId, params)
api.poultry.variance.approve(id, data)
api.poultry.variance.deduct(id, data)

// Staff Points
api.poultry.staffPoints.getMy()
api.poultry.staffPoints.getStore(storeId)
api.poultry.staffPoints.getLeaderboard(storeId?, period?)

// Grading
api.poultry.grading.getConfig(storeId?)
api.poultry.grading.getPerformance(storeId, year, month)

// Customers
api.poultry.customers.getAll(status?)
api.poultry.customers.getById(id)
api.poultry.customers.getLedger(id)
```

---

## Error Handling

```typescript
try {
  const users = await api.users.getAll()
} catch (error) {
  if (error.message === 'Insufficient permissions') {
    // Handle 403
  } else if (error.message === 'Not found') {
    // Handle 404
  } else {
    // Generic error
    toast.error(error.message)
  }
}
```

---

## Related Pages

- [[Frontend-Overview]] - Frontend architecture
- [[State-Management]] - Hooks and context
- [[API-Routers]] - Backend endpoints
