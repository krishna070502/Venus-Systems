# Permission-Based Access Control (RBAC) System

## Overview

Venus Chicken implements a comprehensive Role-Based Access Control (RBAC) system that controls access to routes, UI components, and API endpoints based on user permissions. This document covers the complete implementation, configuration, and usage of the permission system.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Database Schema](#database-schema)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Implementation](#frontend-implementation)
5. [Adding New Permissions](#adding-new-permissions)
6. [Protecting Routes](#protecting-routes)
7. [Managing Permissions](#managing-permissions)
8. [Troubleshooting](#troubleshooting)

---

## Architecture

The RBAC system consists of four main components:

```
┌─────────────────────────────────────────────────────────────┐
│                        RBAC SYSTEM                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. DATABASE LAYER (PostgreSQL/Supabase)                     │
│     - Roles table                                            │
│     - Permissions table                                      │
│     - User-Role mappings                                     │
│     - Role-Permission mappings                               │
│                                                               │
│  2. BACKEND LAYER (FastAPI)                                  │
│     - JWT Authentication                                     │
│     - Permission decorators (@require_permission)            │
│     - User permission retrieval                              │
│                                                               │
│  3. FRONTEND LAYER (Next.js/React)                           │
│     - usePermissions() hook                                  │
│     - PermissionGuard component                              │
│     - Sidebar filtering                                      │
│                                                               │
│  4. UI LAYER                                                 │
│     - Admin panels for managing roles/permissions            │
│     - Real-time updates                                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Tables

#### `roles`
Stores role definitions.

```sql
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Default Roles:**
- `Admin` - Full system access
- `Manager` - Can manage users and view reports
- `User` - Basic user access

#### `permissions`
Stores permission definitions.

```sql
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Permission Naming Convention:**
`<resource>.<action>`

Examples:
- `users.read` - View users
- `users.write` - Create/update users
- `roles.delete` - Delete roles
- `system.settings` - Access settings
- `test.run` - Run test suite

#### `user_roles`
Maps users to roles (many-to-many).

```sql
CREATE TABLE user_roles (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);
```

#### `role_permissions`
Maps roles to permissions (many-to-many).

```sql
CREATE TABLE role_permissions (
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);
```

### Database Function

#### `get_user_permissions(user_id UUID)`
Returns all permissions for a user through their roles.

```sql
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_id UUID)
RETURNS TABLE(permission_key VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.key
    FROM permissions p
    INNER JOIN role_permissions rp ON p.id = rp.permission_id
    INNER JOIN user_roles ur ON rp.role_id = ur.role_id
    WHERE ur.user_id = $1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Location:** `supabase/migrations/001_initial_schema.sql`

---

## Backend Implementation

### Authentication Dependency

**File:** `backend/app/dependencies/auth.py`

```python
async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """Validate JWT token and return current user"""
    # Validates token and returns user data
    return {
        "id": user_id,
        "email": email,
        # ... other user data
    }
```

### Permission Checking

**File:** `backend/app/dependencies/rbac.py`

```python
def require_permission(permission: str):
    """Decorator to require specific permission for endpoint access"""
    async def permission_checker(
        current_user: dict = Depends(get_current_user)
    ) -> dict:
        role_service = RoleService()
        user_permissions = await role_service.get_user_permissions(
            current_user["id"]
        )
        
        if permission not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required permission: {permission}"
            )
        
        return current_user
    
    return permission_checker
```

### User Profile Endpoint

**File:** `backend/app/routers/users.py`

The `/users/me` endpoint returns user data with roles and permissions:

```python
@router.get("/me")
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    """Get current user's profile with roles and permissions"""
    user_service = UserService()
    role_service = RoleService()
    
    profile = await user_service.get_user_by_id(current_user["id"])
    
    # Add roles (as array of strings)
    roles = await role_service.get_user_roles(current_user["id"])
    profile["roles"] = [role["name"] for role in roles]
    
    # Add permissions (as array of strings)
    permissions = await role_service.get_user_permissions(current_user["id"])
    profile["permissions"] = permissions
    
    return profile
```

**Response Example:**
```json
{
  "id": "uuid-here",
  "email": "admin@example.com",
  "full_name": "Admin User",
  "roles": ["Admin"],
  "permissions": [
    "systemdashboard.view",
    "users.read",
    "users.write",
    "roles.read",
    "permissions.read",
    "system.settings",
    "system.logs",
    "system.docs",
    "system.admin",
    "test.run"
  ]
}
```

### Protected Endpoint Example

```python
from app.dependencies.rbac import require_permission

@router.get("/users")
async def get_users(
    current_user: dict = Depends(require_permission("users.read"))
):
    """Get all users - requires users.read permission"""
    # Only users with users.read permission can access this
    return await user_service.get_all_users()
```

---

## Frontend Implementation

### Permission Hook

**File:** `frontend/lib/auth/usePermissions.ts`

```typescript
interface UserPermissions {
  roles: string[]
  permissions: string[]
  loading: boolean
}

export function usePermissions(): UserPermissions {
  const { user } = useAuth()
  const [permissions, setPermissions] = useState<UserPermissions>({
    roles: [],
    permissions: [],
    loading: true,
  })

  useEffect(() => {
    if (!user) {
      setPermissions({ roles: [], permissions: [], loading: false })
      return
    }

    // Fetch user's roles and permissions from backend
    const fetchPermissions = async () => {
      try {
        const userData = await api.users.getMe() as any
        
        setPermissions({
          roles: userData.roles || [],
          permissions: userData.permissions || [],
          loading: false,
        })
      } catch (error) {
        console.error('Failed to load permissions:', error)
        setPermissions({ roles: [], permissions: [], loading: false })
      }
    }

    fetchPermissions()
  }, [user])

  return permissions
}
```

### Permission Helper Functions

```typescript
// Check if user has a specific permission
export function hasPermission(
  userPermissions: string[], 
  requiredPermission: string
): boolean {
  return userPermissions.includes(requiredPermission)
}

// Check if user has a specific role
export function hasRole(
  userRoles: string[], 
  requiredRole: string
): boolean {
  return userRoles.includes(requiredRole)
}

// Check if user has ANY of the required permissions
export function hasAnyPermission(
  userPermissions: string[], 
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.some(perm => 
    userPermissions.includes(perm)
  )
}

// Check if user has ALL of the required permissions
export function hasAllPermissions(
  userPermissions: string[], 
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.every(perm => 
    userPermissions.includes(perm)
  )
}
```

### PermissionGuard Component

**File:** `frontend/components/admin/PermissionGuard.tsx`

```typescript
interface PermissionGuardProps {
  children: React.ReactNode
  permission: string
  fallback?: React.ReactNode
}

export function PermissionGuard({ 
  children, 
  permission, 
  fallback 
}: PermissionGuardProps) {
  const router = useRouter()
  const { permissions, loading } = usePermissions()

  useEffect(() => {
    if (!loading && !hasPermission(permissions, permission)) {
      // Redirect to dashboard if user doesn't have permission
      router.push('/admin')
    }
  }, [loading, permissions, permission, router])

  // Show loading state while checking permissions
  if (loading) {
    return <PageLoading />
  }

  // If user doesn't have permission, show fallback or redirect
  if (!hasPermission(permissions, permission)) {
    return fallback || <AccessDeniedMessage permission={permission} />
  }

  // User has permission, render children
  return <>{children}</>
}
```

### Sidebar Navigation Filtering

**File:** `frontend/components/admin/Sidebar.tsx`

```typescript
interface NavigationItem {
  name: string
  href: string
  icon: any
  permission?: string // Optional permission required
}

const navigation: NavigationItem[] = [
  { 
    name: 'Dashboard', 
    href: '/admin', 
    icon: LayoutDashboard, 
    permission: 'systemdashboard.view' 
  },
  { 
    name: 'Users', 
    href: '/admin/users', 
    icon: Users, 
    permission: 'users.read' 
  },
  { 
    name: 'Roles', 
    href: '/admin/roles', 
    icon: ShieldCheck, 
    permission: 'roles.read' 
  },
  { 
    name: 'Permissions', 
    href: '/admin/permissions', 
    icon: Key, 
    permission: 'permissions.read' 
  },
  { 
    name: 'Health', 
    href: '/admin/health', 
    icon: Activity, 
    permission: 'system.admin' 
  },
  { 
    name: 'Settings', 
    href: '/admin/settings', 
    icon: Settings, 
    permission: 'system.settings' 
  },
  { 
    name: 'Logs', 
    href: '/admin/logs', 
    icon: FileText, 
    permission: 'system.logs' 
  },
  { 
    name: 'Test', 
    href: '/admin/test', 
    icon: TestTube, 
    permission: 'test.run' 
  },
]

const docsNavigation = [
  { 
    name: 'Documentation', 
    href: '/admin/docs', 
    icon: BookOpen, 
    permission: 'system.docs' 
  },
]

export function AdminSidebar() {
  const { permissions: userPermissions, loading } = usePermissions()

  // Filter navigation items based on user permissions
  const filteredNavigation = navigation.filter((item) => {
    // If no permission required, show the item
    if (!item.permission) return true
    
    // If permissions are still loading, don't show permission-protected items
    if (loading) return false
    
    // Check if user has the required permission
    return hasPermission(userPermissions, item.permission)
  })

  return (
    <nav>
      {filteredNavigation.map((item) => (
        <Link key={item.name} href={item.href}>
          <item.icon /> {item.name}
        </Link>
      ))}
    </nav>
  )
}
```

### Dynamic Feature Display (Landing Page)

**File:** `frontend/app/admin/page.tsx`

Venus Chicken includes a sophisticated dynamic permission display system that automatically shows ALL user permissions without requiring code changes for new permissions.

**How It Works:**

```typescript
// 1. Define a featureMap for known permissions with UI features
const featureMap: Record<string, {
  name: string
  description: string
  href: string
  icon: any
}> = {
  'systemdashboard.view': {
    name: 'System Dashboard',
    description: 'Overview and analytics',
    href: '/admin',
    icon: LayoutDashboard
  },
  'users.read': {
    name: 'User Management',
    description: 'Manage users and access',
    href: '/admin/users',
    icon: Users
  },
  // ... 9 total permission mappings
}

// 2. Filter permissions into two groups
const availableFeatures = permissions
  .filter(perm => featureMap[perm])
  .map(perm => ({
    permission: perm,
    ...featureMap[perm]
  }))

// Permissions not in featureMap (new/unmapped permissions)
const otherPermissions = permissions.filter(perm => !featureMap[perm])

// 3. Render feature cards for mapped permissions
{availableFeatures.map((feature) => (
  <Link key={feature.permission} href={feature.href}>
    <div className="feature-card">
      <Icon className="h-5 w-5 text-[#1E4DD8]" />
      <div>
        <p className="font-medium">{feature.name}</p>
        <p className="text-xs text-muted-foreground">{feature.description}</p>
      </div>
    </div>
  </Link>
))}

// 4. Show unmapped permissions as badges
{otherPermissions.length > 0 && (
  <div className="mt-6">
    <p className="text-sm font-medium mb-3">Additional Permissions:</p>
    <div className="flex flex-wrap gap-2">
      {otherPermissions.map((perm) => (
        <div key={perm} className="px-3 py-1.5 bg-white rounded-md border">
          {perm}
        </div>
      ))}
    </div>
  </div>
)}
```

**Key Benefits:**

- ✅ **Automatic** - New permissions appear immediately without code changes
- ✅ **Complete** - Shows ALL permissions user has, not just predefined ones
- ✅ **Scalable** - Add feature mappings as UI features are built
- ✅ **User-Friendly** - Clear distinction between UI features and raw permissions
- ✅ **Maintainable** - Reduced code complexity (140 lines → 35 lines)

**Adding New Features:**

When you create a new page with a permission, add it to the featureMap:

```typescript
const featureMap: Record<string, {...}> = {
  // Existing...
  'reports.view': {
    name: 'Reports',
    description: 'View analytics and reports',
    href: '/admin/reports',
    icon: FileBarChart
  }
}
```

The permission will automatically appear as a feature card when assigned to users.

**Current Mapped Permissions:**
- `systemdashboard.view` - System Dashboard
- `users.read` - User Management
- `roles.read` - Role Management
- `permissions.read` - Permissions
- `system.settings` - System Settings
- `system.logs` - Audit Logs
- `test.run` - Test Suite
- `system.docs` - Documentation
- `system.status` - System Health



---

## Adding New Permissions

### Step 1: Add Permission to Database

**Option A: Via SQL Migration**

Create a new migration file (e.g., `supabase/migrations/011_add_new_permission.sql`):

```sql
-- Add new permission
INSERT INTO public.permissions (key, description) 
VALUES ('reports.view', 'View reports')
ON CONFLICT (key) DO NOTHING;

-- Assign to Admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin' AND p.key = 'reports.view'
ON CONFLICT (role_id, permission_id) DO NOTHING;
```

**Option B: Via Admin UI**

1. Login as Admin
2. Navigate to `/admin/permissions`
3. Click "Create Permission"
4. Enter permission key (e.g., `reports.view`) and description
5. Navigate to `/admin/roles`
6. Select role and click "Edit"
7. Assign the new permission to desired roles

### Step 2: Protect Backend Endpoint

```python
@router.get("/reports")
async def get_reports(
    current_user: dict = Depends(require_permission("reports.view"))
):
    """Get reports - requires reports.view permission"""
    return await report_service.get_all_reports()
```

### Step 3: Add to Sidebar (if needed)

Update `frontend/components/admin/Sidebar.tsx`:

```typescript
const navigation: NavigationItem[] = [
  // ... existing items
  { 
    name: 'Reports', 
    href: '/admin/reports', 
    icon: FileBarChart, 
    permission: 'reports.view' 
  },
]
```

### Step 4: Protect Frontend Page

Create `frontend/app/admin/reports/page.tsx`:

```typescript
import { PermissionGuard } from '@/components/admin/PermissionGuard'

export default function ReportsPage() {
  return (
    <PermissionGuard permission="reports.view">
      <ReportsPageContent />
    </PermissionGuard>
  )
}

function ReportsPageContent() {
  // Your page content here
  return <div>Reports</div>
}
```

---

## Protecting Routes

### Full Page Protection

Wrap the entire page component with `PermissionGuard`:

```typescript
// frontend/app/admin/settings/page.tsx
import { PermissionGuard } from '@/components/admin/PermissionGuard'

export default function SettingsPage() {
  return (
    <PermissionGuard permission="system.settings">
      <SettingsPageContent />
    </PermissionGuard>
  )
}
```

**What happens:**
- User WITH permission: Page renders normally
- User WITHOUT permission: 
  - Shows loading spinner while checking
  - Redirects to `/admin` dashboard
  - Shows "Access Denied" message briefly

### Conditional UI Elements

Show/hide specific UI elements based on permissions:

```typescript
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'

function MyComponent() {
  const { permissions } = usePermissions()
  
  return (
    <div>
      <h1>Dashboard</h1>
      
      {hasPermission(permissions, 'users.write') && (
        <Button>Create User</Button>
      )}
      
      {hasPermission(permissions, 'users.delete') && (
        <Button variant="destructive">Delete User</Button>
      )}
    </div>
  )
}
```

### Custom Fallback UI

Provide custom UI when permission is denied:

```typescript
<PermissionGuard 
  permission="admin.panel"
  fallback={
    <div>
      <h1>Premium Feature</h1>
      <p>Upgrade to access this feature</p>
      <Button>Upgrade Now</Button>
    </div>
  }
>
  <AdminPanel />
</PermissionGuard>
```

---

## Managing Permissions

### Via Admin UI

#### Assign Role to User

1. Navigate to `/admin/users`
2. Click "Edit" on a user
3. Select roles from dropdown
4. Click "Save"

#### Assign Permission to Role

1. Navigate to `/admin/roles`
2. Click "Edit" on a role
3. Click "Manage Permissions"
4. Toggle permissions on/off
5. Click "Assign" for each permission
6. Click "Done"

#### Create New Permission

1. Navigate to `/admin/permissions`
2. Click "Create Permission"
3. Enter permission key (e.g., `feature.access`)
4. Enter description
5. Click "Create"

### Via API

#### Get User Permissions

```bash
GET /api/users/me
Authorization: Bearer <token>

Response:
{
  "id": "...",
  "email": "...",
  "roles": ["Admin"],
  "permissions": ["users.read", "users.write", ...]
}
```

#### Assign Role to User

```bash
POST /api/admin/users/{user_id}/roles
Authorization: Bearer <token>

{
  "role_id": 1
}
```

#### Assign Permission to Role

```bash
POST /api/admin/roles/{role_id}/permissions
Authorization: Bearer <token>

{
  "permission_id": 5
}
```

---

## Troubleshooting

### Issue: User can't see menu items after permission is assigned

**Cause:** Frontend permission cache not refreshed

**Solution:** 
1. Logout and login again to refresh permissions
2. Or reload the page (the usePermissions hook will refetch)

### Issue: User can access page URL directly even without permission

**Cause:** PermissionGuard not implemented on the page

**Solution:** Wrap page with PermissionGuard:

```typescript
export default function MyPage() {
  return (
    <PermissionGuard permission="required.permission">
      <MyPageContent />
    </PermissionGuard>
  )
}
```

### Issue: Permission check always fails

**Possible Causes:**

1. **Permission key mismatch**
   - Check: Sidebar uses `users.read`
   - Check: Database has `users.read` (not `user.read`)
   - Check: Backend uses `users.read`

2. **Permission not assigned to role**
   - Navigate to `/admin/roles`
   - Edit the role
   - Check if permission is assigned

3. **User not assigned to role**
   - Navigate to `/admin/users`
   - Check user's roles

4. **Database function not working**
   - Run migration: `001_initial_schema.sql`
   - Check function exists: `get_user_permissions`

### Issue: Backend returns 403 Forbidden

**Cause:** User lacks required permission for the endpoint

**Check:**
1. What permission does the endpoint require?
   ```python
   @router.get("/path")
   async def endpoint(
       user: dict = Depends(require_permission("some.permission"))
   ):
   ```

2. Does the user have that permission?
   - Check via `/api/users/me`
   - Look in `permissions` array

3. Is the permission assigned to user's role?
   - Check in Admin UI under Roles → Edit → Manage Permissions

---

## Permission List Reference

### User Permissions
- `users.read` - View users
- `users.write` - Create and update users
- `users.delete` - Delete users
- `users.manage_roles` - Assign roles to users

### Role Permissions
- `roles.read` - View roles
- `roles.write` - Create and update roles
- `roles.delete` - Delete roles

### Permission Management
- `permissions.read` - View permissions
- `permissions.write` - Create and update permissions
- `permissions.manage` - Assign permissions to roles

### System Permissions
- `systemdashboard.view` - Access to view the system dashboard
- `system.settings` - Access system settings
- `system.logs` - View audit logs
- `system.docs` - Access documentation and API documentation
- `system.status` - View backend and database status indicators
- `system.admin` - Access admin panel and health monitoring

### Profile Permissions
- `profile.read` - View own profile
- `profile.write` - Update own profile

### Test Permissions
- `test.run` - Run test suite

---

## Best Practices

1. **Permission Naming Convention**
   - Use format: `<resource>.<action>`
   - Examples: `users.read`, `reports.write`, `system.settings`
   - Be consistent across frontend and backend

2. **Always Protect Both Frontend and Backend**
   - Frontend: For UX (hide unavailable features)
   - Backend: For security (enforce access control)

3. **Use Granular Permissions**
   - Prefer: `users.read`, `users.write`, `users.delete`
   - Avoid: `users.all`

4. **Test Permission Changes**
   - Login with different roles
   - Verify menu items appear/disappear
   - Try accessing URLs directly
   - Check API responses

5. **Document Custom Permissions**
   - Add comments in migration files
   - Update this documentation
   - Add descriptions in UI

6. **Regular Audits**
   - Review role-permission assignments
   - Check audit logs for permission changes
   - Verify principle of least privilege

---

## Quick Reference

### Add Permission-Protected Page

```typescript
// 1. Create page with PermissionGuard
// frontend/app/admin/mypage/page.tsx
import { PermissionGuard } from '@/components/admin/PermissionGuard'

export default function MyPage() {
  return (
    <PermissionGuard permission="myfeature.access">
      <MyPageContent />
    </PermissionGuard>
  )
}

// 2. Add to sidebar
// frontend/components/admin/Sidebar.tsx
const navigation: NavigationItem[] = [
  // ...
  { 
    name: 'My Feature', 
    href: '/admin/mypage', 
    icon: MyIcon, 
    permission: 'myfeature.access' 
  },
]

// 3. Protect backend endpoint
// backend/app/routers/myrouter.py
@router.get("/myendpoint")
async def my_endpoint(
    user: dict = Depends(require_permission("myfeature.access"))
):
    return {"data": "protected"}

// 4. Add permission via UI
// - Login as Admin
// - Go to /admin/permissions
// - Create: myfeature.access
// - Go to /admin/roles
// - Assign to desired roles
```

---

## File Locations

- **Migrations:** `supabase/migrations/001_initial_schema.sql`
- **Seed Data:** `supabase/migrations/002_seed_data.sql`
- **Backend Auth:** `backend/app/dependencies/auth.py`
- **Backend RBAC:** `backend/app/dependencies/rbac.py`
- **Role Service:** `backend/app/services/role_service.py`
- **Users Router:** `backend/app/routers/users.py`
- **Permission Hook:** `frontend/lib/auth/usePermissions.ts`
- **Permission Guard:** `frontend/components/admin/PermissionGuard.tsx`
- **Sidebar:** `frontend/components/admin/Sidebar.tsx`

---

## Related Documentation

- [Authentication System](./AUTHENTICATION.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [API Documentation](./API_REFERENCE.md)
- [Admin UI Guide](./ADMIN_UI_GUIDE.md)
