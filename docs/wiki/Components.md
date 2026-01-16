# UI Components

The Venus-System frontend includes a comprehensive component library.

## Component Categories

| Category | Location | Description |
|----------|----------|-------------|
| Admin | `components/admin/` | Admin dashboard components |
| AI | `components/ai/` | AI assistant components |
| POS | `components/pos/` | Point of Sale components |
| Poultry | `components/poultry/` | Business-specific components |
| UI | `components/ui/` | Base component library |

---

## Admin Components

**Location:** `frontend/components/admin/`

### Layout Components

| Component | File | Description |
|-----------|------|-------------|
| `Sidebar` | `Sidebar.tsx` | Navigation sidebar with permission filtering |
| `AdminLayout` | `AdminLayout.tsx` | Admin page wrapper |
| `PermissionGuard` | `PermissionGuard.tsx` | Permission-based access control |

### Sidebar

The sidebar dynamically shows navigation items based on user permissions:

```tsx
// Navigation structure
const systemAdministrationGroup = {
  name: 'System Administration',
  icon: Settings,
  permission: 'systemadministration.view',
  items: [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, permission: 'systemdashboard.view' },
    { name: 'Users', href: '/admin/users', icon: Users, permission: 'users.read' },
    { name: 'AI Config', href: '/admin/ai-settings', icon: Bot, permission: 'ai.admin' },
    { name: 'Roles', href: '/admin/roles', icon: ShieldCheck, permission: 'roles.read' },
    { name: 'Permissions', href: '/admin/permissions', icon: Key, permission: 'permissions.read' },
    { name: 'Logs', href: '/admin/logs', icon: FileText, permission: 'system.logs' },
    { name: 'Activity Logs', href: '/admin/activity-logs', icon: Activity, permission: 'system.logs' },
  ]
}
```

### PermissionGuard

Wrapper component for permission-based rendering:

```tsx
interface PermissionGuardProps {
  children: React.ReactNode
  permission: string
  fallback?: React.ReactNode
}

export function PermissionGuard({ children, permission, fallback }) {
  const { permissions, loading } = usePermissions()

  if (loading) return <PageLoading />
  
  if (!hasPermission(permissions, permission)) {
    return fallback || <AccessDenied permission={permission} />
  }

  return <>{children}</>
}

// Usage
<PermissionGuard permission="users.read">
  <UserTable />
</PermissionGuard>
```

---

## AI Components

**Location:** `frontend/components/ai/`

### AIChatWidget

Floating AI assistant widget:

```tsx
// Features
- Expandable chat interface
- Markdown rendering with syntax highlighting
- Message history
- Typing indicators
- Tool call visualization
```

### AIConfigDashboard

Admin interface for AI configuration:

```tsx
// Tabs
- Access Control: Enable/disable AI access
- Data Scope: Configure table access
- Limits & Guardrails: Rate limiting settings
- Permission Preview: Real-time permission visualization
```

---

## Base UI Components

**Location:** `frontend/components/ui/`

### Available Components

| Component | File | Description |
|-----------|------|-------------|
| Button | `button.tsx` | Styled buttons with variants |
| Card | `card.tsx` | Card container |
| Dialog | `dialog.tsx` | Modal dialogs |
| Input | `input.tsx` | Form inputs |
| Label | `label.tsx` | Form labels |
| Select | `select.tsx` | Dropdown selects |
| Switch | `switch.tsx` | Toggle switches |
| Table | `table.tsx` | Data tables |
| Tabs | `tabs.tsx` | Tabbed interfaces |
| Toast | `toast.tsx` | Notifications |
| Tooltip | `tooltip.tsx` | Hover tooltips |

### Button Variants

```tsx
<Button variant="default">Default</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>
```

### Card Usage

```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Loading States

```tsx
import { PageLoading, LoadingSpinner } from '@/components/ui/loading'

// Full page loader
<PageLoading />

// Inline spinner
<LoadingSpinner className="h-4 w-4" />
```

---

## Poultry Components

**Location:** `frontend/components/poultry/`

Business-specific components for poultry retail operations:

| Component | Purpose |
|-----------|---------|
| StoreSelector | Shop/store selection |
| InventoryTable | Stock management display |
| SalesForm | POS sales entry |
| SettlementCard | Daily settlement display |
| VarianceAlert | Stock variance indicators |
| StaffPointsCard | Staff performance display |

---

## Icons

The system uses **Lucide React** for icons:

```tsx
import { 
  Users, Settings, ShieldCheck, Key, 
  Activity, FileText, LayoutDashboard,
  AlertCircle, CheckCircle, XCircle
} from 'lucide-react'

<Users className="h-4 w-4" />
```

---

## Related Pages

- [[Frontend-Overview]] - Frontend architecture
- [[State-Management]] - Hooks and context
- [[Pages-Routing]] - Page structure
