# UI Components Documentation

## Overview

CoreDesk includes a comprehensive set of custom UI components built on top of shadcn/ui and Tailwind CSS. This document covers all custom components, their usage, props, and examples.

---

## Table of Contents

1. [Alert Modal System](#alert-modal-system)
2. [Loading Components](#loading-components)
3. [Admin Components](#admin-components)
4. [Form Components](#form-components)
5. [Layout Components](#layout-components)

---

## Alert Modal System

### Overview

A beautiful, global modal system for showing alerts, confirmations, and notifications throughout the app.

**File:** `frontend/components/ui/alert-modal.tsx`

### Features

- ✅ 4 alert types: error, success, warning, info
- ✅ Confirmation dialogs with callbacks
- ✅ Backdrop blur effect
- ✅ Smooth animations
- ✅ Icon-based visual feedback
- ✅ Global context (use anywhere)

### AlertProvider

Wrap your app with AlertProvider to enable global alerts:

```typescript
// In layout.tsx or _app.tsx
import { AlertProvider } from '@/components/ui/alert-modal'

export default function Layout({ children }) {
  return (
    <AlertProvider>
      {children}
    </AlertProvider>
  )
}
```

### useAlert Hook

Access alert functions anywhere in your app:

```typescript
import { useAlert } from '@/components/ui/alert-modal'

function MyComponent() {
  const { showError, showSuccess, showWarning, showInfo, showConfirm } = useAlert()

  // Show error
  const handleError = () => {
    showError('Failed to save changes')
  }

  // Show success
  const handleSuccess = () => {
    showSuccess('Changes saved successfully!')
  }

  // Show warning
  const handleWarning = () => {
    showWarning('This action cannot be undone')
  }

  // Show info
  const handleInfo = () => {
    showInfo('Your session will expire in 5 minutes')
  }

  // Show confirmation dialog
  const handleDelete = () => {
    showConfirm(
      'Delete User',
      'Are you sure you want to delete this user? This action cannot be undone.',
      () => {
        // User clicked "Confirm"
        deleteUser()
      },
      () => {
        // User clicked "Cancel"
        console.log('Cancelled')
      }
    )
  }

  return (
    <div>
      <Button onClick={handleError}>Show Error</Button>
      <Button onClick={handleSuccess}>Show Success</Button>
      <Button onClick={handleWarning}>Show Warning</Button>
      <Button onClick={handleInfo}>Show Info</Button>
      <Button onClick={handleDelete}>Delete with Confirmation</Button>
    </div>
  )
}
```

### Alert Functions Reference

#### `showError(message: string)`
Shows a red error alert with X icon.

```typescript
showError('Invalid email format')
```

#### `showSuccess(message: string)`
Shows a green success alert with checkmark icon.

```typescript
showSuccess('User created successfully!')
```

#### `showWarning(message: string)`
Shows a yellow/orange warning alert with warning icon.

```typescript
showWarning('Your trial expires in 3 days')
```

#### `showInfo(message: string)`
Shows a blue info alert with info icon.

```typescript
showInfo('New features are available!')
```

#### `showConfirm(title: string, message: string, onConfirm?: () => void, onCancel?: () => void)`
Shows a confirmation dialog with Confirm and Cancel buttons.

```typescript
showConfirm(
  'Delete Item',
  'Are you sure? This cannot be undone.',
  () => console.log('Confirmed'),
  () => console.log('Cancelled')
)
```

### Styling

Alerts use CoreDesk brand colors:
- Error: Red with red icon
- Success: Green with checkmark
- Warning: Yellow/orange with alert triangle
- Info: Blue with info circle
- Backdrop: Blur effect with dark overlay

---

## Loading Components

### Overview

Multiple loading animation variants for different use cases.

**File:** `frontend/components/ui/loading.tsx`

### LoadingSpinner

Main spinner component with 4 variants.

#### Variants

1. **Default Spinner** - Gradient rotating spinner with glow
2. **Dots Spinner** - Three bouncing dots
3. **Pulse Spinner** - Concentric pulsing circles
4. **Bars Spinner** - Animated vertical bars

#### Usage

```typescript
import { LoadingSpinner } from '@/components/ui/loading'

// Default spinner
<LoadingSpinner />

// With size
<LoadingSpinner size="sm" />  // sm, md, lg, xl
<LoadingSpinner size="lg" />

// Different variants
<LoadingSpinner variant="default" />
<LoadingSpinner variant="dots" />
<LoadingSpinner variant="pulse" />
<LoadingSpinner variant="bars" />

// Custom text
<LoadingSpinner text="Loading..." />
```

#### Props

```typescript
interface LoadingSpinnerProps {
  variant?: 'default' | 'dots' | 'pulse' | 'bars'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  text?: string
  className?: string
}
```

### PageLoading

Full-page loading overlay.

```typescript
import { PageLoading } from '@/components/ui/loading'

function MyPage() {
  const [loading, setLoading] = useState(true)

  if (loading) return <PageLoading />

  return <div>Page content</div>
}
```

### ButtonLoading

Inline loading for buttons.

```typescript
import { ButtonLoading } from '@/components/ui/loading'

<Button disabled={loading}>
  {loading ? <ButtonLoading /> : 'Save Changes'}
</Button>
```

### SkeletonCard

Skeleton loader for card layouts.

```typescript
import { SkeletonCard } from '@/components/ui/loading'

function MyComponent() {
  const [loading, setLoading] = useState(true)

  if (loading) return <SkeletonCard />

  return <Card>...</Card>
}
```

### SkeletonTable

Skeleton loader for tables.

```typescript
import { SkeletonTable } from '@/components/ui/loading'

function UsersTable() {
  const [loading, setLoading] = useState(true)

  if (loading) return <SkeletonTable rows={5} />

  return <Table>...</Table>
}
```

**Props:**
```typescript
interface SkeletonTableProps {
  rows?: number  // Default: 5
}
```

---

## Admin Components

### PermissionGuard

Protects routes based on user permissions.

**File:** `frontend/components/admin/PermissionGuard.tsx`

```typescript
import { PermissionGuard } from '@/components/admin/PermissionGuard'

export default function SettingsPage() {
  return (
    <PermissionGuard permission="system.settings">
      <SettingsContent />
    </PermissionGuard>
  )
}

// With custom fallback
<PermissionGuard 
  permission="premium.access"
  fallback={<UpgradePage />}
>
  <PremiumFeatures />
</PermissionGuard>
```

**Props:**
```typescript
interface PermissionGuardProps {
  children: React.ReactNode
  permission: string
  fallback?: React.ReactNode
}
```

### UserAvatar

Displays user avatar with dropdown menu.

**File:** `frontend/components/admin/UserAvatar.tsx`

```typescript
import { UserAvatar } from '@/components/admin/UserAvatar'

// In layout or header
<UserAvatar />
```

**Features:**
- Shows user initials in colored circle
- Displays full name and role
- Dropdown with profile info and logout
- Auto-fetches user profile

### Sidebar

Admin navigation sidebar.

**File:** `frontend/components/admin/Sidebar.tsx`

```typescript
import { AdminSidebar } from '@/components/admin/Sidebar'

export default function AdminLayout({ children }) {
  return (
    <div className="flex">
      <AdminSidebar />
      <main>{children}</main>
    </div>
  )
}
```

**Features:**
- Permission-based navigation filtering
- Active route highlighting
- CoreDesk branding
- External API docs link

### StatusIndicators

Real-time status badges and indicators.

**File:** `frontend/components/admin/StatusIndicators.tsx`

```typescript
import { StatusBadge, HealthStatus } from '@/components/admin/StatusIndicators'

// Status badge
<StatusBadge status="healthy" />
<StatusBadge status="degraded" />
<StatusBadge status="unhealthy" />

// Health status with icon
<HealthStatus status="healthy" label="Database" />
```

### CreateRoleDialog

Modal dialog for creating roles.

**File:** `frontend/components/admin/CreateRoleDialog.tsx`

```typescript
import CreateRoleDialog from '@/components/admin/CreateRoleDialog'

<CreateRoleDialog onRoleCreated={handleRefresh} />
```

**Features:**
- Form validation
- Loading state with spinner
- Success/error alerts
- Auto-refresh on success

### EditRoleDialog

Modal dialog for editing roles and managing permissions.

**File:** `frontend/components/admin/EditRoleDialog.tsx`

```typescript
import EditRoleDialog from '@/components/admin/EditRoleDialog'

<EditRoleDialog 
  role={selectedRole} 
  onRoleUpdated={handleRefresh}
  onClose={() => setSelectedRole(null)}
/>
```

**Features:**
- Edit role name and description
- Manage role permissions
- Real-time permission assignment
- Optimistic UI updates

### CreatePermissionDialog

Modal dialog for creating permissions.

**File:** `frontend/components/admin/CreatePermissionDialog.tsx`

```typescript
import CreatePermissionDialog from '@/components/admin/CreatePermissionDialog'

<CreatePermissionDialog onPermissionCreated={handleRefresh} />
```

### EditPermissionDialog

Modal dialog for editing permissions.

**File:** `frontend/components/admin/EditPermissionDialog.tsx`

```typescript
import EditPermissionDialog from '@/components/admin/EditPermissionDialog'

<EditPermissionDialog 
  permission={selectedPermission}
  onPermissionUpdated={handleRefresh}
  onClose={() => setSelectedPermission(null)}
/>
```

### EditUserDialog

Modal dialog for editing users and assigning roles.

**File:** `frontend/components/admin/EditUserDialog.tsx`

```typescript
import EditUserDialog from '@/components/admin/EditUserDialog'

<EditUserDialog 
  user={selectedUser}
  onUserUpdated={handleRefresh}
  onClose={() => setSelectedUser(null)}
/>
```

**Features:**
- Edit user full name
- Assign/remove roles
- Loading states
- Success/error alerts

### PermissionManager

Permission assignment interface within role editor.

**File:** `frontend/components/admin/PermissionManager.tsx`

```typescript
import PermissionManager from '@/components/admin/PermissionManager'

<PermissionManager roleId={role.id} />
```

**Features:**
- Toggle permissions on/off
- Real-time updates
- Optimistic UI
- Error handling with rollback

### RoleManager

Role assignment interface within user editor.

**File:** `frontend/components/admin/RoleManager.tsx`

```typescript
import RoleManager from '@/components/admin/RoleManager'

<RoleManager userId={user.id} />
```

**Features:**
- Toggle roles on/off
- Real-time updates
- Optimistic UI
- Error handling with rollback

### LogDetailsModal

Modal for viewing audit log details.

**File:** `frontend/components/admin/LogDetailsModal.tsx`

```typescript
import LogDetailsModal from '@/components/admin/LogDetailsModal'

<LogDetailsModal 
  log={selectedLog}
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
/>
```

**Features:**
- JSON pretty-print for changes
- Metadata display
- Formatted timestamps
- Syntax highlighting

---

## Form Components

All form components from shadcn/ui are available:

### Input

```typescript
import { Input } from '@/components/ui/input'

<Input 
  type="email"
  placeholder="Enter email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>
```

### Button

```typescript
import { Button } from '@/components/ui/button'

<Button>Click Me</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost">Ghost Button</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button disabled>Disabled</Button>
```

**Variants:** default, destructive, outline, secondary, ghost, link

**Sizes:** default, sm, lg, icon

### Label

```typescript
import { Label } from '@/components/ui/label'

<Label htmlFor="email">Email Address</Label>
<Input id="email" type="email" />
```

### Badge

```typescript
import { Badge } from '@/components/ui/badge'

<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Outline</Badge>
```

### Select

```typescript
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

<Select value={role} onValueChange={setRole}>
  <SelectTrigger>
    <SelectValue placeholder="Select role" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="admin">Admin</SelectItem>
    <SelectItem value="user">User</SelectItem>
  </SelectContent>
</Select>
```

### Checkbox

```typescript
import { Checkbox } from '@/components/ui/checkbox'

<Checkbox 
  checked={isChecked}
  onCheckedChange={setIsChecked}
/>
```

### Switch

```typescript
import { Switch } from '@/components/ui/switch'

<Switch 
  checked={enabled}
  onCheckedChange={setEnabled}
/>
```

---

## Layout Components

### Card

```typescript
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter 
} from '@/components/ui/card'

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

### Table

```typescript
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

<Table>
  <TableCaption>A list of users</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John Doe</TableCell>
      <TableCell>john@example.com</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Dialog

```typescript
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    <div>Dialog content</div>
    <DialogFooter>
      <Button onClick={() => setIsOpen(false)}>Close</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### DropdownMenu

```typescript
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

<DropdownMenu>
  <DropdownMenuTrigger>Open</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuLabel>My Account</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Profile</DropdownMenuItem>
    <DropdownMenuItem>Settings</DropdownMenuItem>
    <DropdownMenuItem>Logout</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Avatar

```typescript
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

<Avatar>
  <AvatarImage src="https://github.com/shadcn.png" />
  <AvatarFallback>CN</AvatarFallback>
</Avatar>
```

---

## Styling Guidelines

### CoreDesk Brand Colors

```css
/* Primary Blue */
--primary: #1E4DD8

/* Accent Cyan */
--accent: #29C6D1

/* Usage in components */
className="text-[#1E4DD8]"
className="bg-[#29C6D1]"
```

### Tailwind Utility Classes

```typescript
// Spacing
className="p-4 m-2 space-y-4"

// Typography
className="text-sm font-medium text-muted-foreground"

// Flexbox
className="flex items-center justify-between gap-4"

// Grid
className="grid grid-cols-1 md:grid-cols-2 gap-4"

// Rounded corners
className="rounded-md rounded-lg rounded-full"

// Hover states
className="hover:bg-accent hover:text-accent-foreground"

// Transitions
className="transition-colors duration-200"
```

### Responsive Design

```typescript
// Mobile-first approach
className="text-sm md:text-base lg:text-lg"
className="hidden sm:block"
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
```

---

## Custom Animations

### Loading Animations

Defined in `frontend/app/globals.css`:

```css
@keyframes scaleY {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(1.5); }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-25%); }
}

.animate-scaleY {
  animation: scaleY 1s ease-in-out infinite;
}

.animate-bounce {
  animation: bounce 1s ease-in-out infinite;
}
```

### Usage

```typescript
<div className="animate-scaleY" />
<div className="animate-bounce" />
<div className="animate-spin" />  // Built-in Tailwind
<div className="animate-pulse" /> // Built-in Tailwind
```

---

## Best Practices

### 1. Always Use TypeScript

```typescript
// Good
interface MyComponentProps {
  title: string
  onClose: () => void
}

export function MyComponent({ title, onClose }: MyComponentProps) {
  // ...
}

// Bad
export function MyComponent({ title, onClose }) {
  // ...
}
```

### 2. Use Loading States

```typescript
// Good
const [loading, setLoading] = useState(false)

<Button disabled={loading}>
  {loading ? <LoadingSpinner /> : 'Save'}
</Button>

// Bad
<Button onClick={handleClick}>Save</Button>
```

### 3. Use Alert Modals Instead of Browser Alerts

```typescript
// Good
const { showError, showSuccess } = useAlert()
showError('Failed to save')

// Bad
alert('Failed to save')
```

### 4. Destructure Props

```typescript
// Good
export function MyComponent({ title, description }: Props) {
  return <div>{title}</div>
}

// Avoid
export function MyComponent(props: Props) {
  return <div>{props.title}</div>
}
```

### 5. Use Semantic HTML

```typescript
// Good
<button onClick={handleClick}>Click</button>
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// Bad
<div onClick={handleClick}>Click</div>
```

---

## File Locations

- **Alert Modal:** `frontend/components/ui/alert-modal.tsx`
- **Loading:** `frontend/components/ui/loading.tsx`
- **PermissionGuard:** `frontend/components/admin/PermissionGuard.tsx`
- **Sidebar:** `frontend/components/admin/Sidebar.tsx`
- **UserAvatar:** `frontend/components/admin/UserAvatar.tsx`
- **Dialogs:** `frontend/components/admin/*Dialog.tsx`
- **Managers:** `frontend/components/admin/*Manager.tsx`
- **Base Components:** `frontend/components/ui/*.tsx`

---

## Related Documentation

- [Permission System](./PERMISSION_SYSTEM.md)
- [Authentication](./AUTHENTICATION.md)
- [Admin Pages Guide](./ADMIN_PAGES.md)
