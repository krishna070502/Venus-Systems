# Field Level Permissions

## Overview

Field-level permissions provide granular control over what columns/fields users can see and what actions they can perform on each admin page. This document details the implementation process, errors encountered, and lessons learned.

## Implementation Pattern

### 1. Database Migration

Create a migration file in `supabase/migrations/` with the naming convention `XXX_add_{module}_field_permissions.sql`.

**Structure:**
```sql
-- Field visibility permissions
INSERT INTO permissions (key, description) VALUES
  ('{module}.field.{fieldname}', 'Can view {field} column')
ON CONFLICT (key) DO NOTHING;

-- Action permissions
INSERT INTO permissions (key, description) VALUES
  ('{module}.action.{actionname}', 'Can perform {action}')
ON CONFLICT (key) DO NOTHING;

-- Assign to Admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Admin'
  AND p.key LIKE '{module}.field.%'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign to other roles as needed
```

**Example Migrations Created:**
| Migration | Module | Field Permissions | Action Permissions |
|-----------|--------|-------------------|-------------------|
| 027 | roles | name, description, permissions, usercount, createdat | edit, delete, managepermissions, viewpermissions, duplicate, export |
| 028 | logs | timestamp, action, resource, changes, user, metadata | view, export, filter, search |
| 029 | users | email, name, roles, created | edit, delete, manageroles, viewroles, search, export, filter, impersonate |
| 030 | permissions | key, description, group | create, edit, delete, search, expand, export |

---

### 2. Frontend Page Structure

#### Required Imports
```typescript
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Columns, Info, Check, X } from 'lucide-react'
```

#### Field Configuration
```typescript
const FIELD_CONFIG = {
  fieldName: { label: 'Display Label', permission: '{module}.field.{fieldname}' },
  // ... more fields
} as const

type FieldKey = keyof typeof FIELD_CONFIG

const ACTION_PERMISSIONS = {
  actionName: '{module}.action.{actionname}',
  // ... more actions
} as const
```

#### State Management
```typescript
const [visibleFields, setVisibleFields] = useState<Set<FieldKey>>(
  new Set<FieldKey>(['field1', 'field2', 'field3'])
)
const [showPermissionsInfo, setShowPermissionsInfo] = useState(false)

const { permissions: userPermissions, loading: permissionsLoading } = usePermissions()

// Check field permissions
const canViewField = (field: FieldKey) => {
  if (permissionsLoading) return false
  const permission = FIELD_CONFIG[field].permission
  return hasPermission(userPermissions, permission)
}

// Check action permissions
const canCreate = !permissionsLoading && hasPermission(userPermissions, ACTION_PERMISSIONS.create)
const canEdit = !permissionsLoading && hasPermission(userPermissions, ACTION_PERMISSIONS.edit)
// ... more actions

// Toggle field visibility
const toggleField = (field: FieldKey) => {
  setVisibleFields(prev => {
    const newSet = new Set(prev)
    if (newSet.has(field)) {
      newSet.delete(field)
    } else {
      newSet.add(field)
    }
    return newSet
  })
}

// Check if field is visible (must have permission AND be toggled on)
const isFieldVisible = (field: FieldKey) => canViewField(field) && visibleFields.has(field)
```

#### UI Components

**Header with Info Button and Column Toggle:**
```tsx
<div className="flex items-center gap-2">
  {/* Info Button */}
  <Button
    variant="outline"
    size="icon"
    className="rounded-full h-8 w-8 bg-blue-50 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:hover:bg-blue-900/40"
    onClick={() => setShowPermissionsInfo(true)}
    title="View your permissions"
  >
    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
  </Button>
  
  {/* Column Toggle Dropdown */}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="sm">
        <Columns className="h-4 w-4 mr-2" />
        Columns
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-48">
      <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
      <DropdownMenuSeparator />
      {(Object.keys(FIELD_CONFIG) as FieldKey[]).map((field) => (
        <DropdownMenuCheckboxItem
          key={field}
          checked={visibleFields.has(field)}
          onCheckedChange={() => toggleField(field)}
          disabled={!canViewField(field)}
        >
          {FIELD_CONFIG[field].label}
          {!canViewField(field) && (
            <span className="ml-2 text-xs text-muted-foreground">(No access)</span>
          )}
        </DropdownMenuCheckboxItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

**Conditional Table Headers and Cells:**
```tsx
<TableHeader>
  <TableRow>
    {isFieldVisible('fieldName') && <TableHead>Field Label</TableHead>}
    {(canEdit || canDelete) && <TableHead>Actions</TableHead>}
  </TableRow>
</TableHeader>
<TableBody>
  {items.map((item) => (
    <TableRow key={item.id}>
      {isFieldVisible('fieldName') && <TableCell>{item.fieldName}</TableCell>}
      {(canEdit || canDelete) && (
        <TableCell>
          {canEdit && <Button>Edit</Button>}
          {canDelete && <Button>Delete</Button>}
        </TableCell>
      )}
    </TableRow>
  ))}
</TableBody>
```

**Permissions Info Modal:**
```tsx
{showPermissionsInfo && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              Your Permissions - {PageName} Page
            </CardTitle>
            <CardDescription>
              Overview of your access level
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowPermissionsInfo(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Actions Grid */}
        <div>
          <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            {actions.map((action) => (
              <div
                key={action.key}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg border",
                  action.allowed
                    ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                    : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                )}
              >
                <span className="text-sm">{action.label}</span>
                {action.allowed ? (
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Visible Columns Grid */}
        <div>
          <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">Visible Columns</h4>
          <div className="grid grid-cols-2 gap-2">
            {/* Similar structure for fields */}
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
)}
```

---

### 3. Update GROUP_CONFIG (Permissions Page)

Add new field/action groups to the `GROUP_CONFIG` in `frontend/app/admin/permissions/page.tsx`:

```typescript
const GROUP_CONFIG: Record<string, { displayName: string; category: string }> = {
  // ... existing entries
  '{module}': { displayName: '{Module}', category: 'System Administration' },
  '{module}.field': { displayName: '{Module} - Field Permissions', category: 'System Administration' },
  '{module}.action': { displayName: '{Module} - Action Permissions', category: 'System Administration' },
}
```

---

## Errors Encountered

### Error 1: Module Not Found - usePermissions

**Error Message:**
```
Module not found: Can't resolve '@/lib/hooks/usePermissions'
```

**Cause:** Used incorrect import path.

**Solution:** 
```typescript
// ❌ Wrong
import { usePermissions } from '@/lib/hooks/usePermissions'

// ✅ Correct
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
```

---

### Error 2: Module Not Found - Dialog Component

**Error Message:**
```
Module not found: Can't resolve '@/components/ui/dialog'
```

**Cause:** The project doesn't have a `@/components/ui/dialog` component. Dialogs are implemented manually.

**Solution:** Use the manual overlay pattern:
```tsx
// ❌ Wrong - Dialog component doesn't exist
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

<Dialog open={showModal} onOpenChange={setShowModal}>
  <DialogContent>...</DialogContent>
</Dialog>

// ✅ Correct - Manual overlay pattern
{showModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <Card className="w-full max-w-2xl">
      {/* Content */}
    </Card>
  </div>
)}
```

---

### Error 3: hasPermission is not a function

**Error Message:**
```
TypeError: hasPermission is not a function
```

**Cause:** Incorrectly assumed `usePermissions()` returns a `hasPermission` function.

**What `usePermissions` Actually Returns:**
```typescript
interface UserPermissions {
  roles: string[]
  permissions: string[]
  loading: boolean
}
```

**Solution:**
```typescript
// ❌ Wrong - Destructuring non-existent function
const { hasPermission } = usePermissions()
const canCreate = hasPermission('permissions.action.create')

// ✅ Correct - Import hasPermission separately and pass permissions array
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'

const { permissions: userPermissions, loading: permissionsLoading } = usePermissions()
const canCreate = !permissionsLoading && hasPermission(userPermissions, 'permissions.action.create')
```

---

### Error 4: TypeScript Type Inference for Set

**Error Message:**
```
Type 'Set<string>' is not assignable to type 'Set<"field1" | "field2" | "field3">'
```

**Cause:** TypeScript infers array literals as `string[]` instead of literal union types.

**Solution:**
```typescript
// ❌ Wrong - TypeScript infers string[]
const [visibleFields, setVisibleFields] = useState<Set<FieldKey>>(
  new Set(['field1', 'field2', 'field3'])
)

// ✅ Correct - Explicitly type the Set constructor
const [visibleFields, setVisibleFields] = useState<Set<FieldKey>>(
  new Set<FieldKey>(['field1', 'field2', 'field3'])
)
```

---

## Mistakes to Avoid

### 1. **Always Check Existing Patterns First**
Before implementing, search the codebase for similar implementations:
```bash
grep -r "usePermissions" --include="*.tsx"
grep -r "Dialog" --include="*.tsx"
```

### 2. **Verify Import Paths**
Use file search to find the correct path:
- `usePermissions` is at `@/lib/auth/usePermissions`, NOT `@/lib/hooks/usePermissions`

### 3. **Understand Hook Return Types**
Read the hook implementation before using it:
```typescript
// usePermissions returns:
{ roles: string[], permissions: string[], loading: boolean }

// hasPermission is a SEPARATE exported function:
hasPermission(userPermissions: string[], requiredPermission: string): boolean
```

### 4. **Check for UI Component Availability**
Not all shadcn/ui components may be installed. Check `components/ui/` directory before importing.

### 5. **TypeScript Generic Type Annotations**
When using `Set` or `Map` with literal union types, explicitly annotate the constructor:
```typescript
new Set<FieldKey>([...])  // ✅ Explicit type
new Set([...])            // ❌ Infers string[]
```

### 6. **Always Check `permissionsLoading` State**
Prevent false negatives by checking loading state:
```typescript
// ❌ Wrong - May return false while still loading
const canEdit = hasPermission(userPermissions, 'module.action.edit')

// ✅ Correct - Waits for permissions to load
const canEdit = !permissionsLoading && hasPermission(userPermissions, 'module.action.edit')
```

---

## Checklist for Adding Field-Level Permissions

- [ ] Create migration file `XXX_add_{module}_field_permissions.sql`
- [ ] Add field permissions: `{module}.field.{fieldname}`
- [ ] Add action permissions: `{module}.action.{actionname}`
- [ ] Assign permissions to Admin role
- [ ] Assign appropriate permissions to other roles
- [ ] Update `GROUP_CONFIG` in permissions page
- [ ] Import `usePermissions` and `hasPermission` from `@/lib/auth/usePermissions`
- [ ] Add `FIELD_CONFIG` constant with field-permission mappings
- [ ] Add `ACTION_PERMISSIONS` constant
- [ ] Add `visibleFields` state with explicit `Set<FieldKey>` typing
- [ ] Implement `canViewField` and action permission checks
- [ ] Add Column Toggle dropdown
- [ ] Add Info button (ℹ️) with modal
- [ ] Wrap table headers/cells with permission checks
- [ ] Wrap action buttons with permission checks
- [ ] Test with different user roles

---

## Additional Features

### Audit Logs - User Information Display

The Logs page displays user information (name, email) instead of just user IDs.

**Backend Implementation** (`backend/app/routers/admin.py`):
```python
@router.get("/logs")
async def admin_get_logs(limit: int = 100, offset: int = 0):
    # Fetch logs
    result = supabase_client.table("audit_logs")\
        .select("*")\
        .order("timestamp", desc=True)\
        .range(offset, offset + limit - 1)\
        .execute()
    
    logs = result.data if result.data else []
    
    # Get unique user IDs
    user_ids = list(set(log.get('user_id') for log in logs if log.get('user_id')))
    
    # Fetch user details from profiles table
    user_map = {}
    if user_ids:
        users_result = supabase_client.table("profiles")\
            .select("id, email, full_name")\
            .in_("id", user_ids)\
            .execute()
        
        if users_result.data:
            for user in users_result.data:
                user_map[user['id']] = {
                    'email': user.get('email'),
                    'full_name': user.get('full_name')
                }
    
    # Add user info to logs
    for log in logs:
        user_id = log.get('user_id')
        if user_id and user_id in user_map:
            log['user_email'] = user_map[user_id].get('email')
            log['user_name'] = user_map[user_id].get('full_name')
        else:
            log['user_email'] = None
            log['user_name'] = None
    
    return {"logs": logs, "total": len(logs)}
```

**Frontend Display** (`frontend/app/admin/logs/page.tsx`):
```tsx
interface AuditLog {
  id: number
  user_id: string
  user_email?: string   // Added
  user_name?: string    // Added
  action: string
  // ... other fields
}

// In table cell
{visibleFields.has('user') && (
  <TableCell>
    <div className="flex flex-col">
      {log.user_name ? (
        <>
          <span className="font-medium text-sm">{log.user_name}</span>
          <span className="text-xs text-muted-foreground">{log.user_email}</span>
        </>
      ) : log.user_email ? (
        <span className="text-sm">{log.user_email}</span>
      ) : log.user_id ? (
        <span className="font-mono text-xs text-muted-foreground">
          {log.user_id.substring(0, 8)}...
        </span>
      ) : (
        <span className="text-muted-foreground text-sm">System</span>
      )}
    </div>
  </TableCell>
)}
```

**Key Points:**
- User data is stored in `profiles` table, NOT `users` table
- Fetch logs first, then fetch user details separately (more resilient)
- Gracefully handle missing user data (fallback to user_id or "System")

---

### Price Configuration - INR Currency & Base Price Editing

The Price Config page uses INR (₹) currency and allows inline editing of base prices.

**Currency Change:**
```tsx
// Changed from $ to ₹
<span className="font-mono">₹{basePrice.toFixed(2)}</span>
```

**Inline Base Price Editing:**
```tsx
// State for editing
const [editedBasePrices, setEditedBasePrices] = useState<Record<number, string>>({})
const [editingBasePrice, setEditingBasePrice] = useState<number | null>(null)

// Pencil icon to trigger edit
{canWrite && (
  <Button
    size="sm"
    variant="ghost"
    onClick={() => startEditingBasePrice(item.item_id, item.base_price)}
  >
    <Pencil className="h-3 w-3" />
  </Button>
)}

// Inline input with save/cancel
{isEditingBase && (
  <div className="flex items-center justify-end gap-1">
    <Input
      type="number"
      step="0.01"
      min="0"
      value={editedBasePrices[item.item_id] || ''}
      onChange={(e) => handleBasePriceChange(item.item_id, e.target.value)}
    />
    <Button onClick={() => saveBasePrice(item.item_id)}>
      <CheckCircle2 className="h-4 w-4 text-green-600" />
    </Button>
    <Button onClick={() => cancelEditingBasePrice(item.item_id)}>
      <XCircle className="h-4 w-4 text-red-600" />
    </Button>
  </div>
)}
```

**Handling Decimal Precision:**
```typescript
// API may return price as string (for precision). Always parse explicitly:
const getDisplayBasePrice = (item: PriceItem): number => {
  const editedPrice = editedBasePrices[item.item_id]
  if (editedPrice !== undefined) {
    const parsed = parseFloat(editedPrice)
    return isNaN(parsed) ? parseFloat(String(item.base_price)) : parsed
  }
  return parseFloat(String(item.base_price))  // Handle string from API
}
```

---

## Files Modified/Created

| File | Type | Purpose |
|------|------|---------|
| `supabase/migrations/027_add_roles_field_permissions.sql` | Migration | Roles field/action permissions |
| `supabase/migrations/028_add_logs_field_permissions.sql` | Migration | Logs field/action permissions |
| `supabase/migrations/029_add_users_field_permissions.sql` | Migration | Users field/action permissions |
| `supabase/migrations/030_add_permissions_field_permissions.sql` | Migration | Permissions field/action permissions |
| `frontend/app/admin/roles/page.tsx` | Page | Added field-level permissions |
| `frontend/app/admin/logs/page.tsx` | Page | Added field-level permissions + user name display |
| `frontend/app/admin/users/page.tsx` | Page | Added field-level permissions |
| `frontend/app/admin/permissions/page.tsx` | Page | Added field-level permissions + GROUP_CONFIG updates |
| `frontend/components/admin/LogDetailsModal.tsx` | Component | Updated to show user name/email |
| `frontend/app/admin/business-management/price-config/page.tsx` | Page | INR currency + base price editing |
| `frontend/lib/api/client.ts` | API | Added `updateBasePrice` method |
| `backend/app/routers/admin.py` | API | Fetch user details for logs |
