# Venus Chicken - Complete Project Documentation

> **Enterprise SaaS Starter Kit with Comprehensive RBAC**
> 
> Version: 1.15.0 | Last Updated: 30 November 2025
> 
> Repository: https://github.com/krishna070502/Venus-BusinessApp-StarterKit-.git

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Architecture](#2-tech-stack--architecture)
3. [Quick Start Guide](#3-quick-start-guide)
4. [Project Structure](#4-project-structure)
5. [Database Schema](#5-database-schema)
6. [Permission System (RBAC)](#6-permission-system-rbac)
7. [Authentication System](#7-authentication-system)
8. [Frontend Implementation](#8-frontend-implementation)
9. [Backend Implementation](#9-backend-implementation)
10. [UI Components Library](#10-ui-components-library)
11. [Admin Pages Reference](#11-admin-pages-reference)
12. [Business Modules](#12-business-modules)
13. [API Reference](#13-api-reference)
14. [Database Migrations](#14-database-migrations)
15. [Configuration & Environment](#15-configuration--environment)
16. [Deployment Guide](#16-deployment-guide)
17. [Development Guidelines](#17-development-guidelines)
18. [Troubleshooting](#18-troubleshooting)
19. [Security & Performance Audit](#19-security--performance-audit)
20. [Version History](#20-version-history)

---

## 1. Project Overview

### 1.1 What is Venus Chicken?

Venus Chicken is a **production-ready Enterprise SaaS Starter Kit** that provides:

- ✅ **Complete Authentication System** - JWT-based auth with Supabase
- ✅ **Advanced RBAC** - Granular permission-based access control
- ✅ **Beautiful Admin Panel** - Modern UI with shadcn/ui components
- ✅ **Dynamic Landing Page** - Shows ALL user permissions automatically
- ✅ **Audit Logging** - Track all system changes
- ✅ **Session Management** - Monitor active user sessions
- ✅ **Health Monitoring** - Real-time system health dashboard
- ✅ **Global Modals** - Beautiful alert and confirmation dialogs
- ✅ **Loading Animations** - 4 stunning loading variants
- ✅ **Responsive Design** - Mobile-first with Tailwind CSS
- ✅ **Type Safety** - Full TypeScript support
- ✅ **API Documentation** - Auto-generated with FastAPI

### 1.2 Key Features

| Feature | Description |
|---------|-------------|
| **RBAC System** | Role-based access control with granular permissions |
| **Multi-level Navigation** | Nested dropdown menus with permission filtering |
| **Draggable Sidebar** | Resizable sidebar (200-500px) |
| **Collapsible Sidebar** | Icon-only view with tooltips |
| **Dynamic Permission Display** | New permissions appear automatically |
| **Audit Logging** | Complete activity tracking |
| **Session Tracking** | Real-time session monitoring |
| **Health Checks** | Backend and database status |

### 1.3 Statistics

- **Total Permissions**: 100+ CRUD permissions
- **Admin Pages**: 25+ pages
- **UI Components**: 50+ reusable components
- **Migrations**: 23 database migrations
- **Business Modules**: 6 nested dropdown sections (including Business Management)

---

## 2. Tech Stack & Architecture

### 2.1 Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Frontend** | Next.js (App Router) | 14.x |
| **Frontend** | TypeScript | 5.x |
| **Frontend** | Tailwind CSS | 3.x |
| **Frontend** | shadcn/ui | Latest |
| **Backend** | FastAPI | 0.104.x |
| **Backend** | Python | 3.11+ |
| **Backend** | Pydantic | 2.x |
| **Database** | PostgreSQL | via Supabase |
| **Auth** | Supabase Auth | Latest |
| **Icons** | Lucide React | 0.292.x |

### 2.2 System Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │         │                 │
│   Next.js 14    │────────▶│   FastAPI       │────────▶│   Supabase      │
│   Frontend      │  HTTP   │   Backend       │   SQL   │   PostgreSQL    │
│   (React)       │         │   (Python)      │         │                 │
│                 │         │                 │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
        │                          │                           │
        │                          │                           │
        └──────────────────────────┴───────────────────────────┘
                        Supabase Auth (JWT)
```

### 2.3 Key Architectural Patterns

1. **Server vs Client Components**: Server components for static content, client components for interactivity
2. **Permission-Based Routing**: All routes protected by PermissionGuard
3. **Layered Backend Architecture**: Routers → Dependencies → Services → Database
4. **Optimistic UI Updates**: Immediate feedback with rollback on errors
5. **Real-time Updates**: WebSocket support via Supabase

---

## 3. Quick Start Guide

### 3.1 Prerequisites

- Node.js 18+
- Python 3.11+
- Supabase Account

### 3.2 Installation Steps

```bash
# 1. Clone the repository
git clone https://github.com/krishna070502/Venus-BusinessApp-StarterKit-.git
cd CoreDesk--App-Starter-Template

# 2. Set up Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate
pip install -r requirements.txt

# 3. Set up Frontend
cd ../frontend
npm install

# 4. Configure environment variables (see section 15)

# 5. Run database migrations in Supabase Dashboard

# 6. Start the application
./start.sh
# Or manually:
# Terminal 1: cd backend && uvicorn app.main:app --reload
# Terminal 2: cd frontend && npm run dev
```

### 3.3 Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Documentation | http://localhost:8000/docs |
| Admin Panel | http://localhost:3000/admin |

### 3.4 Default Users

After running migrations and seed data:

| Role | Permissions |
|------|-------------|
| **Admin** | All permissions |
| **Manager** | Business + limited admin |
| **User** | Basic access only |

---

## 4. Project Structure

```
CoreDesk--App-Starter-Template/
│
├── 📁 Documentation/              # Comprehensive documentation
│   ├── INDEX.md                   # Documentation hub
│   ├── GETTING_STARTED.md         # Setup guide
│   ├── PERMISSION_SYSTEM.md       # RBAC guide
│   ├── AUTHENTICATION.md          # Auth system
│   ├── UI_COMPONENTS.md           # Component library
│   ├── DATABASE_SCHEMA.md         # Database reference
│   ├── ARCHITECTURE.md            # System architecture
│   └── ...more docs
│
├── 📁 backend/                    # FastAPI Backend
│   ├── app/
│   │   ├── main.py               # FastAPI entry point
│   │   ├── config/
│   │   │   └── settings.py       # Configuration management
│   │   ├── routers/              # API endpoints
│   │   │   ├── auth.py           # Authentication
│   │   │   ├── users.py          # User management
│   │   │   ├── roles.py          # Role management
│   │   │   ├── permissions.py    # Permission management
│   │   │   ├── admin.py          # Admin endpoints
│   │   │   └── health.py         # Health checks
│   │   ├── services/             # Business logic
│   │   │   ├── user_service.py
│   │   │   ├── role_service.py
│   │   │   └── supabase_client.py
│   │   ├── models/               # Pydantic models
│   │   ├── dependencies/         # Auth & RBAC
│   │   │   ├── auth.py           # JWT validation
│   │   │   └── rbac.py           # Permission checks
│   │   ├── middleware/
│   │   │   └── session_tracker.py
│   │   └── utils/
│   │       └── logger.py
│   └── requirements.txt
│
├── 📁 frontend/                   # Next.js Frontend
│   ├── app/                      # App Router pages
│   │   ├── admin/               # Admin section
│   │   │   ├── page.tsx         # Dashboard/Landing
│   │   │   ├── layout.tsx       # Admin layout
│   │   │   ├── users/           # User management
│   │   │   ├── roles/           # Role management
│   │   │   ├── permissions/     # Permission management
│   │   │   ├── health/          # Health monitoring
│   │   │   ├── settings/        # System settings
│   │   │   ├── logs/            # Audit logs
│   │   │   ├── sessions/        # Session management
│   │   │   ├── test/            # Test suite
│   │   │   ├── docs/            # Documentation viewer
│   │   │   ├── business/        # Business modules
│   │   │   │   ├── purchases/
│   │   │   │   ├── suppliers/
│   │   │   │   ├── payments/
│   │   │   │   ├── inventory/
│   │   │   │   ├── sales/
│   │   │   │   ├── customers/
│   │   │   │   ├── receipts/
│   │   │   │   ├── finance/
│   │   │   │   └── reports/
│   │   │   └── business-management/
│   │   │       ├── shops/
│   │   │       ├── managers/
│   │   │       └── price-config/
│   │   └── auth/                # Auth pages
│   │       ├── login/
│   │       └── signup/
│   ├── components/
│   │   ├── admin/               # Admin components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── PermissionGuard.tsx
│   │   │   ├── PermissionManager.tsx
│   │   │   ├── UserAvatar.tsx
│   │   │   ├── StatusIndicators.tsx
│   │   │   └── *Dialog.tsx      # Various dialogs
│   │   └── ui/                  # Reusable UI
│   │       ├── alert-modal.tsx
│   │       ├── loading.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── select.tsx
│   │       └── ...more components
│   ├── lib/
│   │   ├── api/
│   │   │   └── client.ts        # API client
│   │   ├── auth/
│   │   │   ├── AuthProvider.tsx
│   │   │   └── usePermissions.ts
│   │   └── supabase/
│   │       └── client.ts
│   ├── package.json
│   └── tailwind.config.js
│
├── 📁 supabase/
│   └── migrations/              # Database migrations
│       ├── 001_initial_schema.sql
│       ├── 002_seed_data.sql
│       ├── 003_audit_logs.sql
│       └── ...022_add_shop_management_permissions.sql
│
├── AI_AGENT_GUIDELINES.md        # Guidelines for AI agents
├── CHANGELOG.md                  # Version history
├── README.md                     # Project overview
├── start.sh                      # Quick start script
└── LICENSE                       # Proprietary license
```

---

## 5. Database Schema

### 5.1 Entity Relationship Diagram

```
┌──────────────────┐
│   auth.users     │ (Supabase Auth)
│                  │
│  - id (UUID)     │
│  - email         │
│  - created_at    │
└────────┬─────────┘
         │
         │ 1:1
         ▼
┌──────────────────┐       ┌──────────────────┐
│    profiles      │       │  user_sessions   │
│                  │       │                  │
│  - id (UUID) PK  │       │  - id (UUID) PK  │
│  - email         │       │  - user_id FK    │
│  - full_name     │       │  - created_at    │
│  - avatar_url    │       │  - last_activity │
│  - created_at    │       │  - ip_address    │
│  - last_sign_in  │       │  - user_agent    │
└────────┬─────────┘       └──────────────────┘
         │
         │ M:N (via user_roles)
         ▼
┌──────────────────┐       ┌──────────────────┐
│   user_roles     │       │      roles       │
│                  │       │                  │
│  - user_id FK    │◄─────►│  - id (INT) PK   │
│  - role_id FK    │       │  - name UNIQUE   │
│  - assigned_at   │       │  - description   │
└──────────────────┘       │  - created_at    │
                           └────────┬─────────┘
                                    │
                                    │ M:N (via role_permissions)
                                    ▼
                           ┌──────────────────┐       ┌──────────────────┐
                           │ role_permissions │       │   permissions    │
                           │                  │       │                  │
                           │  - role_id FK    │◄─────►│  - id (INT) PK   │
                           │  - permission_id │       │  - key UNIQUE    │
                           │  - assigned_at   │       │  - description   │
                           └──────────────────┘       │  - created_at    │
                                                      └──────────────────┘

┌──────────────────┐
│   audit_logs     │
│                  │
│  - id (INT) PK   │
│  - user_id FK    │
│  - action        │
│  - resource_type │
│  - resource_id   │
│  - changes JSONB │
│  - metadata JSONB│
│  - timestamp     │
└──────────────────┘
```

### 5.2 Core Tables

#### profiles
```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR NOT NULL,
    full_name VARCHAR,
    avatar_url VARCHAR,
    created_at TIMESTAMP DEFAULT NOW(),
    last_sign_in_at TIMESTAMP
);
```

#### roles
```sql
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Default roles
INSERT INTO roles (name, description) VALUES
  ('Admin', 'Full system access with all permissions'),
  ('Manager', 'Can manage users and view reports'),
  ('User', 'Standard user with basic access');
```

#### permissions
```sql
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### user_roles
```sql
CREATE TABLE user_roles (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);
```

#### role_permissions
```sql
CREATE TABLE role_permissions (
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);
```

#### audit_logs
```sql
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    changes JSONB,
    metadata JSONB,
    timestamp TIMESTAMP DEFAULT NOW()
);
```

#### user_sessions
```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_activity TIMESTAMP DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT
);
```

### 5.3 Key Database Functions

#### get_user_permissions(user_id UUID)
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

### 5.4 Triggers

#### Auto-Create Profile on Signup
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name'
    );
    
    INSERT INTO public.user_roles (user_id, role_id)
    SELECT NEW.id, id FROM public.roles WHERE name = 'User'
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 6. Permission System (RBAC)

### 6.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        RBAC SYSTEM                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. DATABASE LAYER (PostgreSQL/Supabase)                   │
│     - Roles table                                          │
│     - Permissions table                                    │
│     - User-Role mappings                                   │
│     - Role-Permission mappings                             │
│                                                             │
│  2. BACKEND LAYER (FastAPI)                                │
│     - JWT Authentication                                   │
│     - Permission decorators (require_permission)           │
│     - User permission retrieval                            │
│                                                             │
│  3. FRONTEND LAYER (Next.js/React)                         │
│     - usePermissions() hook                                │
│     - PermissionGuard component                            │
│     - Sidebar filtering                                    │
│                                                             │
│  4. UI LAYER                                               │
│     - Admin panels for managing roles/permissions          │
│     - Real-time updates                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Permission Naming Convention

**Format**: `<resource>.<action>` or `<category>.<resource>.<action>`

### 6.3 Complete Permission List

#### System Administration Permissions
| Permission | Description |
|------------|-------------|
| `systemadministration.view` | Access System Administration section |
| `systemdashboard.view` | View the system dashboard |
| `users.read` | View users |
| `users.write` | Create/update users |
| `users.delete` | Delete users |
| `roles.read` | View and manage roles |
| `permissions.read` | View and manage permissions |
| `system.admin` | Admin access and health monitoring |
| `system.settings` | Access system settings |
| `system.logs` | View audit logs |
| `system.docs` | Access documentation |
| `system.status` | View status indicators |
| `test.run` | Run test suite |

#### Business Section Permissions
| Permission | Description |
|------------|-------------|
| `business.view` | Access Business section |
| `businessdashboard.view` | View business dashboard |

#### Purchases & Payables (16 permissions)
| Permission | Description |
|------------|-------------|
| `purchase&payment.view` | Access section |
| `purchase.view/read/write/update/delete` | Manage purchases |
| `supplier.view/read/write/update/delete` | Manage suppliers |
| `payment.view/read/write/update/delete` | Manage payments |

#### Inventory Management (16 permissions)
| Permission | Description |
|------------|-------------|
| `inventory.view` | Access section |
| `stock.view/read/write/update/delete` | Manage stock |
| `wastage.view/read/write/update/delete` | Manage wastage |
| `adjustments.view/read/write/update/delete` | Manage adjustments |

#### Sales & Income (16 permissions)
| Permission | Description |
|------------|-------------|
| `salesincome.view` | Access section |
| `sales.view/read/write/update/delete` | Manage sales |
| `customer.view/read/write/update/delete` | Manage customers |
| `receipt.view/read/write/update/delete` | Manage receipts |

#### Finance Management (16 permissions)
| Permission | Description |
|------------|-------------|
| `finance.view` | Access section |
| `expense.view/read/write/update/delete` | Manage expenses |
| `cashbook.view/read/write/update/delete` | Manage cashbook |
| `ledger.view/read/write/update/delete` | Manage ledger |

#### Insights & Reports (21 permissions)
| Permission | Description |
|------------|-------------|
| `analytics.view` | Access section |
| `salesreport.view/read/write/update/delete` | Sales reports |
| `purchasereport.view/read/write/update/delete` | Purchase reports |
| `expensereport.view/read/write/update/delete` | Expense reports |
| `wastagereport.view/read/write/update/delete` | Wastage reports |

#### Business Management (16 permissions)
| Permission | Description |
|------------|-------------|
| `businessmanagement.view` | Access section |
| `shopmanagement.view` | Access Shop Management |
| `shops.view/read/write/update/delete` | Manage shops |
| `managers.view/read/write/update/delete` | Manage managers |
| `priceconfig.view/read/write/update/delete` | Manage pricing |

### 6.4 Frontend Permission Implementation

#### usePermissions Hook
```typescript
// frontend/lib/auth/usePermissions.ts
export function usePermissions(): {
  roles: string[]
  permissions: string[]
  loading: boolean
} {
  const { user } = useAuth()
  const [data, setData] = useState({ roles: [], permissions: [], loading: true })

  useEffect(() => {
    if (!user) {
      setData({ roles: [], permissions: [], loading: false })
      return
    }

    const fetchPermissions = async () => {
      const userData = await api.users.getMe()
      setData({
        roles: userData.roles || [],
        permissions: userData.permissions || [],
        loading: false,
      })
    }

    fetchPermissions()
  }, [user])

  return data
}

// Helper functions
export function hasPermission(userPermissions: string[], required: string): boolean {
  return userPermissions.includes(required)
}

export function hasRole(userRoles: string[], required: string): boolean {
  return userRoles.includes(required)
}
```

#### PermissionGuard Component
```typescript
// frontend/components/admin/PermissionGuard.tsx
export function PermissionGuard({ 
  children, 
  permission, 
  fallback 
}: {
  children: React.ReactNode
  permission: string
  fallback?: React.ReactNode
}) {
  const { permissions, loading } = usePermissions()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !hasPermission(permissions, permission)) {
      router.push('/admin')
    }
  }, [loading, permissions, permission, router])

  if (loading) return <PageLoading />
  if (!hasPermission(permissions, permission)) return fallback || <AccessDenied />

  return <>{children}</>
}
```

### 6.5 Backend Permission Implementation

```python
# backend/app/dependencies/rbac.py
def require_permission(permissions: list[str]):
    """Decorator to require specific permissions for endpoint access"""
    async def permission_checker(
        current_user: dict = Depends(get_current_user)
    ) -> dict:
        role_service = RoleService()
        user_permissions = await role_service.get_user_permissions(
            current_user["id"]
        )
        
        for perm in permissions:
            if perm not in user_permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Missing required permission: {perm}"
                )
        
        return current_user
    
    return permission_checker

# Usage in router:
@router.get("/users")
async def get_users(
    current_user: dict = Depends(require_permission(["users.read"]))
):
    return await user_service.get_all_users()
```

### 6.6 Adding New Permissions

**Step 1: Create Migration**
```sql
-- supabase/migrations/XXX_add_new_permission.sql
INSERT INTO permissions (key, description) 
VALUES ('resource.action', 'Description')
ON CONFLICT (key) DO NOTHING;

-- Assign to roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('Admin', 'Manager') AND p.key = 'resource.action'
ON CONFLICT DO NOTHING;
```

**Step 2: Add to Sidebar**
```typescript
// frontend/components/admin/Sidebar.tsx
const navigation: NavigationItem[] = [
  { 
    name: 'New Page', 
    href: '/admin/newpage', 
    icon: IconName, 
    permission: 'resource.action' 
  },
]
```

**Step 3: Protect Page**
```typescript
// frontend/app/admin/newpage/page.tsx
export default function NewPage() {
  return (
    <PermissionGuard permission="resource.action">
      <NewPageContent />
    </PermissionGuard>
  )
}
```

**Step 4: Protect Backend**
```python
@router.get("/endpoint")
async def endpoint(
    user: dict = Depends(require_permission(["resource.action"]))
):
    return {"data": "protected"}
```

---

## 7. Authentication System

### 7.1 Authentication Flow

```
┌──────────┐          ┌──────────┐          ┌──────────┐
│  Client  │          │  Backend │          │ Supabase │
│ (Next.js)│          │ (FastAPI)│          │   Auth   │
└────┬─────┘          └────┬─────┘          └────┬─────┘
     │                     │                     │
     │ 1. Sign Up/Login    │                     │
     │────────────────────>│                     │
     │                     │  2. Verify          │
     │                     │────────────────────>│
     │                     │  3. JWT Token       │
     │                     │<────────────────────│
     │  4. JWT + Profile   │                     │
     │<────────────────────│                     │
     │ 5. Store Token      │                     │
     │ 6. API Request      │                     │
     │────────────────────>│  7. Validate        │
     │                     │────────────────────>│
     │  8. Response        │                     │
     │<────────────────────│                     │
```

### 7.2 AuthProvider Context

```typescript
// frontend/lib/auth/AuthProvider.tsx
interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // ... signIn, signUp, signOut methods

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

### 7.3 Backend JWT Validation

```python
# backend/app/dependencies/auth.py
async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    try:
        user_response = supabase_client.auth.get_user(token)
        
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )
        
        return {
            "id": user_response.user.id,
            "email": user_response.user.email,
            "user_metadata": user_response.user.user_metadata
        }
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
```

---

## 8. Frontend Implementation

### 8.1 Frontend Dependencies

```json
{
  "dependencies": {
    "@hookform/resolvers": "^3.3.2",
    "@radix-ui/react-avatar": "^1.1.11",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "@radix-ui/react-select": "^2.2.6",
    "@radix-ui/react-tooltip": "^1.2.8",
    "@supabase/auth-helpers-nextjs": "^0.8.7",
    "@supabase/supabase-js": "^2.38.4",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.0.0",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.292.0",
    "next": "^14.0.3",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.48.2",
    "tailwind-merge": "^2.0.0",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.22.4",
    "zustand": "^4.4.7"
  }
}
```

### 8.2 Sidebar Navigation Structure

The sidebar supports nested dropdowns with permission filtering:

```typescript
// Navigation structure
const navigationGroups: NavigationGroup[] = [
  {
    name: 'System Administration',
    icon: Settings,
    permission: 'systemadministration.view',
    items: [
      { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, permission: 'systemdashboard.view' },
      { name: 'Users', href: '/admin/users', icon: Users, permission: 'users.read' },
      // ... more items
    ]
  },
  {
    name: 'Business',
    icon: Activity,
    permission: 'business.view',
    items: [
      { name: 'Business Dashboard', href: '/admin/business', icon: Activity, permission: 'businessdashboard.view' },
      purchasesPayablesGroup, // Nested group
      inventoryManagementGroup,
      salesIncomeGroup,
      financeManagementGroup,
      insightsReportsGroup,
    ]
  },
  {
    name: 'Business Management',
    icon: Settings,
    permission: 'businessmanagement.view',
    items: [
      shopManagementGroup, // Nested group
    ]
  }
]
```

### 8.3 API Client

```typescript
// frontend/lib/api/client.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const getAuthHeader = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token 
    ? { Authorization: `Bearer ${session.access_token}` }
    : {}
}

export const api = {
  users: {
    getMe: async () => apiRequest('/api/v1/users/me'),
    getAll: async () => apiRequest('/api/v1/users'),
    update: async (id: string, data: any) => apiRequest(`/api/v1/users/${id}`, 'PUT', data),
  },
  roles: {
    getAll: async () => apiRequest('/api/v1/roles'),
    create: async (data: any) => apiRequest('/api/v1/roles', 'POST', data),
  },
  permissions: {
    getAll: async () => apiRequest('/api/v1/permissions'),
  },
  health: {
    check: async () => apiRequest('/api/v1/health'),
  },
  logs: {
    getAll: async () => apiRequest('/api/v1/admin/logs'),
  },
}
```

---

## 9. Backend Implementation

### 9.1 Backend Dependencies

```
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic>=2.0.0
pydantic-settings>=2.0.0
python-jose[cryptography]==3.3.0
python-multipart==0.0.6
supabase==2.0.3
httpx>=0.24.0,<0.25.0
python-dotenv==1.0.0
psutil==7.1.3
```

### 9.2 Main Application

```python
# backend/app/main.py
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Venus Chicken API",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Session Tracker Middleware
app.add_middleware(SessionTrackerMiddleware)

# Router Registration
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(roles.router, prefix="/api/v1/roles", tags=["Roles"])
app.include_router(permissions.router, prefix="/api/v1/permissions", tags=["Permissions"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(health.router, prefix="/api/v1/health", tags=["Health"])
```

### 9.3 API Endpoints

| Endpoint | Method | Description | Permission |
|----------|--------|-------------|------------|
| `/api/v1/auth/signup` | POST | Register new user | Public |
| `/api/v1/auth/signin` | POST | Login | Public |
| `/api/v1/auth/signout` | POST | Logout | Authenticated |
| `/api/v1/users/me` | GET | Get current user | Authenticated |
| `/api/v1/users` | GET | List all users | `users.read` |
| `/api/v1/users/{id}` | PUT | Update user | `users.write` |
| `/api/v1/users/{id}` | DELETE | Delete user | `users.delete` |
| `/api/v1/roles` | GET | List roles | `roles.read` |
| `/api/v1/roles` | POST | Create role | `roles.write` |
| `/api/v1/permissions` | GET | List permissions | `permissions.read` |
| `/api/v1/admin/logs` | GET | Get audit logs | `system.logs` |
| `/api/v1/health` | GET | Health check | `system.admin` |

---

## 10. UI Components Library

### 10.1 Alert Modal System

```typescript
import { useAlert } from '@/components/ui/alert-modal'

function MyComponent() {
  const { showError, showSuccess, showWarning, showInfo, showConfirm } = useAlert()

  // Error alert
  showError('Failed to save changes')

  // Success alert
  showSuccess('Changes saved successfully!')

  // Warning alert
  showWarning('This action cannot be undone')

  // Info alert
  showInfo('New features available!')

  // Confirmation dialog
  showConfirm(
    'Delete User',
    'Are you sure?',
    () => deleteUser(),  // On confirm
    () => console.log('Cancelled')  // On cancel
  )
}
```

### 10.2 Loading Components

```typescript
import { LoadingSpinner, PageLoading, SkeletonTable } from '@/components/ui/loading'

// Page loading
if (loading) return <PageLoading />

// Spinner variants
<LoadingSpinner variant="default" />  // Gradient spinner
<LoadingSpinner variant="dots" />     // Bouncing dots
<LoadingSpinner variant="pulse" />    // Pulsing circles
<LoadingSpinner variant="bars" />     // Animated bars

// Sizes
<LoadingSpinner size="sm" />
<LoadingSpinner size="md" />
<LoadingSpinner size="lg" />
<LoadingSpinner size="xl" />

// Skeleton loaders
<SkeletonTable rows={5} />
```

### 10.3 Form Components (shadcn/ui)

```typescript
// Button
<Button variant="default">Primary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost">Ghost</Button>

// Input
<Input type="email" placeholder="Email" />

// Select
<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="a">Option A</SelectItem>
    <SelectItem value="b">Option B</SelectItem>
  </SelectContent>
</Select>

// Card
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content</CardContent>
  <CardFooter>Footer</CardFooter>
</Card>

// Badge
<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Error</Badge>
```

### 10.4 Admin Components

```typescript
// PermissionGuard - Protect pages
<PermissionGuard permission="users.read">
  <UsersPage />
</PermissionGuard>

// UserAvatar - User dropdown
<UserAvatar />

// StatusIndicators - Real-time health
<StatusIndicators />

// PermissionManager - Manage role permissions (with manual grouping)
<PermissionManager
  roleId={role.id}
  roleName={role.name}
  currentPermissions={permissions}
  allPermissions={allPermissions}
  onAssign={handleAssign}
  onRemove={handleRemove}
  onClose={handleClose}
/>
```

---

## 11. Admin Pages Reference

### 11.1 System Administration Pages

| Page | Route | Permission | Description |
|------|-------|------------|-------------|
| Dashboard | `/admin` | `systemdashboard.view` | System overview |
| Users | `/admin/users` | `users.read` | User management |
| Roles | `/admin/roles` | `roles.read` | Role management |
| Permissions | `/admin/permissions` | `permissions.read` | Permission management |
| Health | `/admin/health` | `system.admin` | Health monitoring |
| Settings | `/admin/settings` | `system.settings` | System settings |
| Logs | `/admin/logs` | `system.logs` | Audit logs |
| Sessions | `/admin/sessions` | `system.admin` | Session management |
| Test | `/admin/test` | `test.run` | Test suite |
| Documentation | `/admin/docs` | `system.docs` | Documentation viewer |

### 11.2 Business Pages

| Page | Route | Permission |
|------|-------|------------|
| Business Dashboard | `/admin/business` | `businessdashboard.view` |
| Purchases | `/admin/business/purchases` | `purchase.view` |
| Suppliers | `/admin/business/suppliers` | `supplier.view` |
| Payments | `/admin/business/payments` | `payment.view` |
| Stock | `/admin/business/inventory/stock` | `stock.view` |
| Wastage | `/admin/business/inventory/wastage` | `wastage.view` |
| Adjustments | `/admin/business/inventory/adjustments` | `adjustments.view` |
| Sales | `/admin/business/sales` | `sales.view` |
| Customers | `/admin/business/customers` | `customer.view` |
| Receipts | `/admin/business/receipts` | `receipt.view` |
| Expenses | `/admin/business/finance/expenses` | `expense.view` |
| Cashbook | `/admin/business/finance/cashbook` | `cashbook.view` |
| Ledger | `/admin/business/finance/ledger` | `ledger.view` |
| Sales Reports | `/admin/business/reports/sales` | `salesreport.view` |
| Purchase Reports | `/admin/business/reports/purchase` | `purchasereport.view` |
| Expense Reports | `/admin/business/reports/expense` | `expensereport.view` |
| Wastage Reports | `/admin/business/reports/wastage` | `wastagereport.view` |

### 11.3 Business Management Pages

| Page | Route | Permission |
|------|-------|------------|
| Shops | `/admin/business-management/shops` | `shops.view` |
| Managers | `/admin/business-management/managers` | `managers.view` |
| Price Config | `/admin/business-management/price-config` | `priceconfig.view` |

---

## 12. Business Modules

### 12.1 Module Hierarchy

```
Business (business.view)
├── Business Dashboard (businessdashboard.view)
├── Purchases & Payables (purchase&payment.view)
│   ├── Purchases (purchase.*)
│   ├── Suppliers (supplier.*)
│   └── Payments (payment.*)
├── Inventory Management (inventory.view)
│   ├── Stock (stock.*)
│   ├── Wastage (wastage.*)
│   └── Adjustments (adjustments.*)
├── Sales & Income (salesincome.view)
│   ├── Sales (sales.*)
│   ├── Customers (customer.*)
│   └── Receipts (receipt.*)
├── Finance Management (finance.view)
│   ├── Expenses (expense.*)
│   ├── Cashbook (cashbook.*)
│   └── Ledger (ledger.*)
└── Insights & Reports (analytics.view)
    ├── Sales Reports (salesreport.*)
    ├── Purchase Reports (purchasereport.*)
    ├── Expense Reports (expensereport.*)
    └── Wastage Reports (wastagereport.*)

Business Management (businessmanagement.view)
└── Shop Management (shopmanagement.view)
    ├── Shops (shops.*)
    ├── Managers (managers.*)
    └── Price Config (priceconfig.*)
```

### 12.2 Business Management Module (v1.15.0)

#### Multi-Tenancy Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    MULTI-TENANT ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  Shop 1  │    │  Shop 2  │    │  Shop 3  │    │  Shop N  │  │
│  │(Tenant 1)│    │(Tenant 2)│    │(Tenant 3)│    │(Tenant N)│  │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘  │
│       │               │               │               │         │
│       ▼               ▼               ▼               ▼         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              ROW LEVEL SECURITY (RLS)                    │  │
│  │   - Users only see data from their assigned shops        │  │
│  │   - Admins bypass RLS for full access                    │  │
│  │   - Enforced at database level                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Database Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `shops` | Store/tenant definitions | id, name, location, contact_number, is_active |
| `manager_details` | Extended manager profiles | user_id, employee_id, qualifications |
| `user_shops` | User-shop assignments | user_id, shop_id (junction table) |
| `inventory_items` | Shop inventory items | id, shop_id, name, base_price, is_available |
| `daily_shop_prices` | Day-wise pricing | shop_id, item_id, date, daily_price |

#### RLS Policies

```sql
-- Users can only access shops they are assigned to
CREATE POLICY shop_access_policy ON shops
  USING (
    is_admin() OR
    id IN (SELECT shop_id FROM user_shops WHERE user_id = auth.uid())
  );

-- Prices follow shop access rules
CREATE POLICY price_access_policy ON daily_shop_prices
  USING (
    is_admin() OR
    shop_id IN (SELECT shop_id FROM user_shops WHERE user_id = auth.uid())
  );
```

#### Key API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/business/shops` | shops.read | List accessible shops |
| POST | `/api/v1/business/shops` | shops.write | Create new shop |
| GET | `/api/v1/business/managers/unassigned` | managers.read | List unassigned users |
| POST | `/api/v1/business/managers/onboard` | managers.onboard | Onboard manager to shop |
| GET | `/api/v1/business/prices/daily` | priceconfig.read | Get daily prices |
| POST | `/api/v1/business/prices/bulk-update` | priceconfig.update | Bulk update prices |

> **See [BUSINESS_MANAGEMENT.md](Documentation/BUSINESS_MANAGEMENT.md) for complete documentation.**

### 12.3 CRUD Permission Pattern

Each module follows this pattern:
- `.view` - See page in sidebar
- `.read` - Read/list records
- `.write` - Create new records
- `.update` - Update existing records
- `.delete` - Delete records

---

## 13. API Reference

### 13.1 Authentication Endpoints

#### POST `/api/v1/auth/signup`
```json
Request:
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe"
}

Response:
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": {...}
}
```

#### POST `/api/v1/auth/signin`
```json
Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": {...}
}
```

### 13.2 User Endpoints

#### GET `/api/v1/users/me`
```json
Response:
{
  "id": "uuid",
  "email": "admin@example.com",
  "full_name": "Admin User",
  "roles": ["Admin"],
  "permissions": ["users.read", "users.write", ...]
}
```

### 13.3 Admin Endpoints

#### GET `/api/v1/admin/logs`
```json
Response:
[
  {
    "id": 1,
    "user_id": "uuid",
    "action": "UPDATE",
    "resource_type": "user",
    "resource_id": "uuid",
    "changes": {...},
    "timestamp": "2025-11-26T10:00:00Z"
  }
]
```

---

## 14. Database Migrations

### 14.1 Migration Files

| # | File | Description |
|---|------|-------------|
| 001 | `001_initial_schema.sql` | Core tables, functions |
| 002 | `002_seed_data.sql` | Default roles, permissions |
| 003 | `003_audit_logs.sql` | Audit logging table |
| 004 | `004_auto_create_profile.sql` | Profile creation trigger |
| 005 | `005_FIX-AUTH-TRIGGER.sql` | Trigger fixes |
| 006 | `006_add_last_sign_in_to_profiles.sql` | Last sign-in tracking |
| 007 | `007_create_user_sessions_table.sql` | Session table |
| 008 | `008_FIX-AUDIT-AND-LOGIN.sql` | Audit/login fixes |
| 009 | `009_RESTORE-PROPER-TRIGGERS.sql` | Trigger restoration |
| 010 | `010_add_test_permission.sql` | Test permission |
| 011 | `011_add_docs_permission.sql` | Docs permission |
| 012 | `012_add_systemdashboard_permission.sql` | Dashboard permission |
| 013 | `013_add_status_permission.sql` | Status permission |
| 014 | `014_add_systemadministration_permission.sql` | System admin permission |
| 015 | `015_add_business_permission.sql` | Business permission |
| 016 | `016_add_purchases_payables_permissions.sql` | 16 permissions |
| 017 | `017_add_inventory_management_permissions.sql` | 16 permissions |
| 018 | `018_add_sales_income_permissions.sql` | 16 permissions |
| 019 | `019_add_finance_management_permissions.sql` | 16 permissions |
| 020 | `020_add_insights_reports_permissions.sql` | 21 permissions |
| 021 | `021_add_business_management_permission.sql` | Business mgmt permission |
| 022 | `022_add_shop_management_permissions.sql` | 16 permissions |

### 14.2 Running Migrations

1. Go to Supabase Dashboard → SQL Editor
2. Run migrations in order (001, 002, 003, etc.)
3. Each migration is idempotent (safe to run multiple times)

---

## 15. Configuration & Environment

### 15.1 Backend Environment Variables

**File**: `backend/.env`

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key

# JWT Configuration
JWT_SECRET=your-jwt-secret

# API Configuration
API_URL=http://localhost:8000

# Environment
ENVIRONMENT=development

# CORS Origins
ALLOWED_ORIGINS=http://localhost:3000
```

### 15.2 Frontend Environment Variables

**File**: `frontend/.env.local`

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 16. Deployment Guide

### 16.1 Frontend Deployment (Vercel)

```bash
cd frontend
npm run build
vercel --prod
```

**Environment Variables to Set**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL`

### 16.2 Backend Deployment (Railway/Render/Docker)

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Environment Variables to Set**:
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `JWT_SECRET`
- `ENVIRONMENT=production`
- `ALLOWED_ORIGINS`

### 16.3 Database (Supabase)

1. Create project at supabase.com
2. Run all migrations in SQL Editor
3. Configure Auth settings
4. Set up RLS policies if needed

---

## 17. Development Guidelines

### 17.1 Adding a New Protected Page

1. **Create permission in database** (via UI or migration)
2. **Create page component** with PermissionGuard:
   ```typescript
   export default function NewPage() {
     return (
       <PermissionGuard permission="resource.action">
         <NewPageContent />
       </PermissionGuard>
     )
   }
   ```
3. **Add to sidebar** in Sidebar.tsx
4. **Protect backend endpoint**:
   ```python
   @router.get("/endpoint")
   async def endpoint(user = Depends(require_permission(["resource.action"]))):
       return data
   ```
5. **Update documentation**

### 17.2 Code Standards

- Use TypeScript strictly
- Follow ESLint rules
- Use Tailwind CSS for styling
- Use shadcn/ui components
- Implement loading states
- Handle errors with useAlert
- Use PageLoading for full-page loads

### 17.3 Git Commit Format

```
<type>: <description>

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- refactor: Code refactoring
- security: Security updates
- perf: Performance improvements
```

---

## 18. Troubleshooting

### 18.1 Common Issues

#### Port Already in Use
```bash
lsof -ti:3000 | xargs kill -9  # Frontend
lsof -ti:8000 | xargs kill -9  # Backend
```

#### Permission Not Working
1. Check permission exists in database
2. Check role has permission assigned
3. Check user has role assigned
4. Logout and login again

#### Database Connection Failed
1. Verify Supabase URL and keys
2. Check project is not paused
3. Test: `curl https://your-project.supabase.co`

#### CORS Errors
Update `backend/app/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 18.2 Permission Check Flow

1. **Frontend**: `usePermissions()` → fetches from `/users/me`
2. **Backend**: Validates JWT → queries `get_user_permissions()`
3. **Database**: Joins user_roles → role_permissions → permissions

---

## 19. Security & Performance Audit

### 19.1 Primary Performance Bottlenecks
The system currently experiences latency due to **synchronous network I/O** in the backend middleware and RBAC logic. Every request is blocked by sequential calls to Supabase.

### 19.2 Security Observations
- **Credentials**: Correct use of environment variables, though a default `SECRET_KEY` needs rotation.
- **Vulnerabilities**: Missing CSRF protection and in-memory rate limiting.
- **Data Isolation**: Strong RLS policies are in place for multi-tenant data protection.

For the full detailed report, see [SECURITY_AND_PERFORMANCE_AUDIT.md](./Documentation/SECURITY_AND_PERFORMANCE_AUDIT.md).

---

## 20. Version History

### v1.15.0 (2025-11-30)
- **Business Management Module - Full Implementation**
  - 5 new database tables: shops, manager_details, user_shops, inventory_items, daily_shop_prices
  - Row Level Security (RLS) for strict shop isolation
  - Manager onboarding workflow
  - Day-wise price configuration per shop
  - Multi-tenancy with user-shop assignments
- New API endpoints: 12+ endpoints for business management
- New permission: managers.onboard (Admin only)
- Frontend pages fully implemented with CRUD operations
- Comprehensive documentation in BUSINESS_MANAGEMENT.md

### v1.14.0 (2025-11-26)
- Added Shop Management module (shops, managers, price config)
- 16 new permissions for business management
- Manual permission grouping in roles page

### v1.13.0 (2025-11-26)
- Added Business Management section
- New top-level navigation group

### v1.12.0 (2025-11-26)
- Added Insights & Reports module
- 21 new report permissions

### v1.11.0 (2025-11-26)
- Added Finance Management module
- 16 new finance permissions

### v1.10.0 (2025-11-26)
- Added Sales & Income module
- 16 new sales permissions

### v1.9.0 (2025-11-26)
- Added Inventory Management module
- 16 new inventory permissions

### v1.8.0 (2025-11-26)
- Added Purchases & Payables module
- 16 new purchase permissions
- Nested dropdown support

### v1.7.0 (2025-11-26)
- Added Business dropdown menu
- Collapsible sidebar

### v1.6.0 (2025-11-26)
- Added System Administration dropdown
- Grouped navigation structure

### v1.5.0 (2025-11-26)
- Dynamic permission display system
- Automatic feature detection

### v1.0.0 (2025-11-26)
- Initial release
- Complete RBAC system
- JWT authentication
- Admin panel
- Audit logging

---

## Quick Reference Card

### Essential Commands

```bash
# Start development
./start.sh

# Or manually:
cd backend && uvicorn app.main:app --reload
cd frontend && npm run dev

# Build production
cd frontend && npm run build
cd backend && docker build -t venuschicken .
```

### Essential Files

| Purpose | Location |
|---------|----------|
| Permission hook | `frontend/lib/auth/usePermissions.ts` |
| Permission guard | `frontend/components/admin/PermissionGuard.tsx` |
| Sidebar | `frontend/components/admin/Sidebar.tsx` |
| Backend auth | `backend/app/dependencies/auth.py` |
| Backend RBAC | `backend/app/dependencies/rbac.py` |
| API client | `frontend/lib/api/client.ts` |
| Migrations | `supabase/migrations/*.sql` |

### URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| Admin | http://localhost:3000/admin |

---

**Built with ❤️ for Venus Chicken**

**Happy Building! 🚀**
