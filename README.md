# CoreDesk - Enterprise SaaS Starter Kit

A production-ready SaaS starter kit with comprehensive RBAC (Role-Based Access Control), built with **Next.js 14**, **FastAPI**, and **Supabase**.

![CoreDesk](https://img.shields.io/badge/CoreDesk-Enterprise%20SaaS-1E4DD8?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?style=flat-square&logo=fastapi)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)

---

## 🚀 Features

- ✅ **Complete Authentication System** - JWT-based auth with Supabase
- ✅ **Advanced RBAC** - Granular permission-based access control
- ✅ **Beautiful Admin Panel** - Modern UI with shadcn/ui components
- ✅ **Audit Logging** - Track all system changes
- ✅ **Session Management** - Monitor active user sessions
- ✅ **Health Monitoring** - System health dashboard
- ✅ **Global Modals** - Beautiful alert and confirmation dialogs
- ✅ **Loading Animations** - 4 stunning loading variants
- ✅ **Responsive Design** - Mobile-first with Tailwind CSS
- ✅ **Type Safety** - Full TypeScript support
- ✅ **API Documentation** - Auto-generated with FastAPI

---

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Adding Permissions](#adding-permissions)
- [Creating Protected Pages](#creating-protected-pages)
- [Managing Roles](#managing-roles)
- [API Development](#api-development)
- [Database Operations](#database-operations)
- [Deployment](#deployment)
- [Documentation](#documentation)

---

## 🎯 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- Supabase Account

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Business-StarterKit
   ```

2. **Set up Supabase**
   - Create project at [supabase.com](https://supabase.com)
   - Get your project URL and keys

3. **Configure environment variables**

   **Backend** (`backend/.env`):
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-service-role-key
   JWT_SECRET=your-jwt-secret
   API_URL=http://localhost:8000
   ```

   **Frontend** (`frontend/.env.local`):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

4. **Run database migrations**
   - Go to Supabase Dashboard → SQL Editor
   - Run migrations from `supabase/migrations/` in order (001, 002, 003, etc.)

5. **Start the application**
   ```bash
   ./start.sh
   ```

   Or manually:
   ```bash
   # Terminal 1 - Backend
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: .\venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload

   # Terminal 2 - Frontend
   cd frontend
   npm install
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

---

## 📁 Project Structure

```
Business-StarterKit/
├── Documentation/              # 📚 Comprehensive docs
│   ├── INDEX.md               # Documentation hub
│   ├── GETTING_STARTED.md     # Setup guide
│   ├── PERMISSION_SYSTEM.md   # RBAC guide
│   ├── AUTHENTICATION.md      # Auth system
│   ├── UI_COMPONENTS.md       # Component library
│   └── DATABASE_SCHEMA.md     # Database reference
│
├── backend/                   # 🐍 FastAPI Backend
│   ├── app/
│   │   ├── routers/          # API endpoints
│   │   │   ├── auth.py       # Authentication
│   │   │   ├── users.py      # User management
│   │   │   ├── admin.py      # Admin endpoints
│   │   │   └── ...
│   │   ├── services/         # Business logic
│   │   │   ├── user_service.py
│   │   │   ├── role_service.py
│   │   │   └── ...
│   │   ├── models/           # Pydantic models
│   │   ├── dependencies/     # Auth & RBAC
│   │   │   ├── auth.py       # JWT validation
│   │   │   └── rbac.py       # Permission checks
│   │   └── main.py           # FastAPI app
│   └── requirements.txt
│
├── frontend/                  # ⚛️ Next.js Frontend
│   ├── app/                  # App router
│   │   ├── admin/           # Admin pages
│   │   │   ├── page.tsx     # Dashboard
│   │   │   ├── users/       # User management
│   │   │   ├── roles/       # Role management
│   │   │   ├── permissions/ # Permission management
│   │   │   ├── health/      # Health monitoring
│   │   │   ├── settings/    # System settings
│   │   │   ├── logs/        # Audit logs
│   │   │   └── test/        # Test suite
│   │   └── auth/            # Login/signup
│   ├── components/
│   │   ├── admin/           # Admin components
│   │   │   ├── PermissionGuard.tsx  # Route protection
│   │   │   ├── Sidebar.tsx          # Navigation
│   │   │   └── ...
│   │   └── ui/              # Reusable components
│   │       ├── alert-modal.tsx      # Global modals
│   │       ├── loading.tsx          # Loading animations
│   │       └── ...
│   ├── lib/
│   │   ├── api/             # API client
│   │   └── auth/            # Auth context & hooks
│   │       ├── AuthProvider.tsx
│   │       └── usePermissions.ts
│   └── package.json
│
├── supabase/
│   └── migrations/           # SQL migrations
│       ├── 001_initial_schema.sql
│       ├── 002_seed_data.sql
│       └── ...
│
└── start.sh                  # Quick start script
```

---

## 🔐 Adding Permissions

### Step 1: Create Permission in Database

**Option A: Via Admin UI** (Recommended)
1. Login as Admin
2. Go to `/admin/permissions`
3. Click "Create Permission"
4. Enter:
   - **Key**: `reports.view` (format: `resource.action`)
   - **Description**: "View reports"
5. Click "Create"

**Option B: Via SQL**
```sql
INSERT INTO permissions (key, description) 
VALUES ('reports.view', 'View reports');
```

### Step 2: Assign Permission to Roles

**Via Admin UI:**
1. Go to `/admin/roles`
2. Click "Edit" on a role
3. Click "Manage Permissions"
4. Toggle on `reports.view`
5. Click "Assign"
6. Click "Done"

**Via SQL:**
```sql
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Admin' AND p.key = 'reports.view';
```

### Permission Naming Convention

Always use: `<resource>.<action>`

**Examples:**
- `systemdashboard.view` - View the system dashboard
- `users.read` - View users
- `users.write` - Create/update users
- `users.delete` - Delete users
- `reports.view` - View reports
- `reports.export` - Export reports
- `roles.read` - View and manage roles
- `permissions.read` - View and manage permissions
- `settings.update` - Update settings
- `system.admin` - Admin access, health monitoring, status indicators
- `system.logs` - View audit logs
- `system.docs` - Access documentation and API docs
- `test.run` - Run test suite

---

## 🛡️ Creating Protected Pages

### 1. Create the Page Component

**File:** `frontend/app/admin/reports/page.tsx`

```typescript
'use client'

import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export default function ReportsPage() {
  return (
    <PermissionGuard permission="reports.view">
      <ReportsPageContent />
    </PermissionGuard>
  )
}

function ReportsPageContent() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Reports</h1>
      <Card>
        <CardHeader>
          <CardTitle>Sales Report</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Your report content */}
        </CardContent>
      </Card>
    </div>
  )
}
```

### 2. Add to Sidebar Navigation

**File:** `frontend/components/admin/Sidebar.tsx`

```typescript
import { FileBarChart } from 'lucide-react'

const navigation: NavigationItem[] = [
  // ... existing items
  { 
    name: 'Reports', 
    href: '/admin/reports', 
    icon: FileBarChart, 
    permission: 'reports.view'  // ✅ Add permission here
  },
]
```

### 3. Create Backend Endpoint

**File:** `backend/app/routers/reports.py`

```python
from fastapi import APIRouter, Depends
from app.dependencies.rbac import require_permission

router = APIRouter()

@router.get(
    "/reports",
    dependencies=[Depends(require_permission(["reports.view"]))]  # ✅ Protect endpoint
)
async def get_reports():
    """Get reports - requires reports.view permission"""
    return {
        "reports": [
            {"id": 1, "name": "Sales Report", "data": []}
        ]
    }
```

### 4. Register Router

**File:** `backend/app/main.py`

```python
from app.routers import reports

app.include_router(reports.router, prefix="/api/v1", tags=["Reports"])
```

### 5. Add to API Client

**File:** `frontend/lib/api/client.ts`

```typescript
export const api = {
  // ... existing methods
  reports: {
    getAll: () => apiRequest('/api/v1/reports'),
  },
}
```

**That's it!** 🎉 Your page is now protected and only users with `reports.view` permission can access it.

---

## 👥 Managing Roles

### Create a New Role

**Via Admin UI:**
1. Go to `/admin/roles`
2. Click "Create Role"
3. Enter name and description
4. Click "Create"
5. Assign permissions via "Manage Permissions"

**Via SQL:**
```sql
-- Create role
INSERT INTO roles (name, description) 
VALUES ('Developer', 'Developer access with code deployment permissions');

-- Assign permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Developer' 
  AND p.key IN ('users.read', 'system.logs', 'code.deploy');
```

### Assign Role to User

**Via Admin UI:**
1. Go to `/admin/users`
2. Click "Edit" on user
3. Select role from dropdown
4. Click "Save"

**Via SQL:**
```sql
INSERT INTO user_roles (user_id, role_id)
SELECT 
  (SELECT id FROM auth.users WHERE email = 'user@example.com'),
  (SELECT id FROM roles WHERE name = 'Developer');
```

---

## 🔧 API Development

### Protect Endpoints with Permissions

**Single Permission:**
```python
from app.dependencies.rbac import require_permission

@router.get("/users", dependencies=[Depends(require_permission(["users.read"]))])
async def get_users():
    return {"users": []}
```

**Multiple Permissions (ALL required):**
```python
@router.post(
    "/users", 
    dependencies=[Depends(require_permission(["users.write", "users.manage"]))]
)
async def create_user(data: dict):
    return {"user": data}
```

**Role-Based Protection:**
```python
from app.dependencies.rbac import require_admin, require_admin_or_manager

@router.delete("/users/{id}", dependencies=[Depends(require_admin)])
async def delete_user(id: str):
    return {"deleted": True}
```

### Get Current User

```python
from app.dependencies.auth import get_current_user

@router.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    # ... fetch user data
    return {"profile": {}}
```

---

## 💾 Database Operations

### Add New Table

1. **Create migration file:** `supabase/migrations/011_create_reports_table.sql`

```sql
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reports_user ON reports(user_id);
```

2. **Run migration** in Supabase Dashboard → SQL Editor

### Query Data

```python
from app.services.supabase_client import supabase_client

# Select all
result = supabase_client.table("reports").select("*").execute()

# Filter
result = supabase_client.table("reports")\
    .select("*")\
    .eq("user_id", user_id)\
    .execute()

# Insert
result = supabase_client.table("reports").insert({
    "user_id": user_id,
    "title": "Monthly Report",
    "data": {"sales": 1000}
}).execute()
```

---

## 🎨 UI Components

### Use Alert Modals

```typescript
import { useAlert } from '@/components/ui/alert-modal'

function MyComponent() {
  const { showError, showSuccess, showWarning, showInfo, showConfirm } = useAlert()

  const handleDelete = () => {
    showConfirm(
      'Delete User',
      'Are you sure?',
      () => {
        // Confirmed
        deleteUser()
        showSuccess('User deleted!')
      }
    )
  }

  return <Button onClick={handleDelete}>Delete</Button>
}
```

### Use Loading States

```typescript
import { LoadingSpinner, PageLoading } from '@/components/ui/loading'

// Page loading
if (loading) return <PageLoading />

// Button loading
<Button disabled={loading}>
  {loading ? <LoadingSpinner size="sm" /> : 'Save'}
</Button>

// Custom spinner
<LoadingSpinner variant="dots" size="lg" text="Loading..." />
```

### Available Variants

- `default` - Gradient spinner with glow
- `dots` - Bouncing dots
- `pulse` - Pulsing circles
- `bars` - Animated bars

---

## 🚢 Deployment

### Frontend (Vercel)

```bash
cd frontend
npm run build
vercel --prod
```

**Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL` (your backend URL)

### Backend (Railway/Heroku/Docker)

```bash
cd backend
# Build Docker image
docker build -t coredesk-backend .
docker run -p 8000:8000 coredesk-backend
```

**Environment Variables:**
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `JWT_SECRET`

---

## 📚 Documentation

Comprehensive documentation available in `Documentation/` folder:

| Document | Description |
|----------|-------------|
| [INDEX.md](./Documentation/INDEX.md) | Documentation hub with quick links |
| [GETTING_STARTED.md](./Documentation/GETTING_STARTED.md) | Complete setup guide |
| [PERMISSION_SYSTEM.md](./Documentation/PERMISSION_SYSTEM.md) | **RBAC implementation guide** ⭐ |
| [AUTHENTICATION.md](./Documentation/AUTHENTICATION.md) | Auth system details |
| [UI_COMPONENTS.md](./Documentation/UI_COMPONENTS.md) | Component library reference |
| [DATABASE_SCHEMA.md](./Documentation/DATABASE_SCHEMA.md) | Database structure |

---

## 🔍 Common Tasks

### Task: Add Permission-Protected Feature

1. **Create permission:** `feature.access` (via UI or SQL)
2. **Create page:** Wrap with `<PermissionGuard permission="feature.access">`
3. **Add to sidebar:** Include `permission: 'feature.access'`
4. **Protect API:** Use `require_permission(["feature.access"])`
5. **Assign to roles:** Via UI or SQL

### Task: Customize Branding

**Change Logo:**
```typescript
// frontend/components/admin/Sidebar.tsx
<h2 className="text-3xl font-bold text-[#1E4DD8]">YourBrand</h2>
```

**Change Colors:**
```javascript
// tailwind.config.js
theme: {
  extend: {
    colors: {
      primary: '#YOUR_COLOR',
    }
  }
}
```

### Task: Add User Field

1. **Migrate database:**
   ```sql
   ALTER TABLE profiles ADD COLUMN phone VARCHAR(20);
   ```

2. **Update model:** `backend/app/models/user.py`
   ```python
   class UserProfile(BaseModel):
       phone: Optional[str] = None
   ```

3. **Update form:** Add input field in `EditUserDialog.tsx`

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Kill process on port
lsof -ti:3000 | xargs kill -9  # Frontend
lsof -ti:8000 | xargs kill -9  # Backend
```

### Permission Not Working

1. Check permission exists: `/admin/permissions`
2. Check role has permission: `/admin/roles` → Edit → Manage Permissions
3. Check user has role: `/admin/users` → Edit
4. Logout and login again to refresh permissions

### Database Connection Failed

1. Verify Supabase URL and keys in `.env`
2. Check project not paused in Supabase Dashboard
3. Test connection: `curl https://your-project.supabase.co`

### CORS Errors

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

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

---

## 📝 License

MIT License - see [LICENSE](./LICENSE) file

---

## 🌟 Key Highlights

✨ **Fully Type-Safe** - TypeScript + Python type hints
✨ **Production Ready** - Authentication, RBAC, Audit Logs
✨ **Beautiful UI** - Modern components with Tailwind CSS
✨ **Well Documented** - Extensive docs for all features
✨ **Easy to Extend** - Clear patterns for adding features
✨ **Best Practices** - Industry-standard architecture

---

## 🆘 Support

- 📖 **Documentation:** `Documentation/` folder
- 🐛 **Issues:** GitHub Issues
- 💬 **Discussions:** GitHub Discussions
- 📧 **Email:** support@example.com

---

## 🎯 Quick Links

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs
- **Admin Panel:** http://localhost:3000/admin
- **Documentation:** [Documentation/INDEX.md](./Documentation/INDEX.md)

---

**Built with ❤️ using Next.js, FastAPI, and Supabase**

**Happy Building! 🚀**
