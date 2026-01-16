# State Management

The Venus-System frontend uses React Context and custom hooks for state management.

## Overview

| Hook/Context | File | Purpose |
|--------------|------|---------|
| `useAuth` | `AuthProvider.tsx` | Authentication state |
| `usePermissions` | `usePermissions.ts` | User permissions |
| `StoreContext` | `StoreContext.tsx` | Selected store state |

---

## Authentication State

### AuthProvider

**File:** `frontend/lib/auth/AuthProvider.tsx`

Manages authentication state using Supabase:

```tsx
interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName?: string) => Promise<void>
  signOut: () => Promise<void>
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  // ... signIn, signUp, signOut methods
}
```

### useAuth Hook

```tsx
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Usage
const { user, loading, signIn, signOut } = useAuth()
```

---

## Permissions State

### usePermissions Hook

**File:** `frontend/lib/auth/usePermissions.ts`

Fetches and caches user permissions:

```tsx
interface UserPermissions {
  roles: string[]
  permissions: string[]
  store_ids: number[]
  loading: boolean
}

export function usePermissions(): UserPermissions {
  const { user, loading: authLoading } = useAuth()
  const [permissions, setPermissions] = useState<UserPermissions>({
    roles: [],
    permissions: [],
    store_ids: [],
    loading: true,
  })

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setPermissions({ roles: [], permissions: [], store_ids: [], loading: false })
      return
    }

    const fetchPermissions = async () => {
      try {
        const userData = await api.users.getMe()
        setPermissions({
          roles: userData.roles || [],
          permissions: userData.permissions || [],
          store_ids: userData.store_ids || [],
          loading: false,
        })
      } catch (error) {
        console.error('Failed to load permissions:', error)
        setPermissions({ roles: [], permissions: [], store_ids: [], loading: false })
      }
    }

    fetchPermissions()
  }, [user, authLoading])

  return permissions
}
```

### Permission Helper Functions

```tsx
export function hasPermission(
  userPermissions: string[], 
  requiredPermission: string
): boolean {
  return userPermissions.includes(requiredPermission)
}

export function hasRole(
  userRoles: string[], 
  requiredRole: string
): boolean {
  return userRoles.includes(requiredRole)
}

export function hasAnyPermission(
  userPermissions: string[], 
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.some(perm => userPermissions.includes(perm))
}

export function hasAllPermissions(
  userPermissions: string[], 
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.every(perm => userPermissions.includes(perm))
}
```

---

## Store Context

### StoreContext

**File:** `frontend/lib/context/StoreContext.tsx`

Manages selected store for multi-tenant operations:

```tsx
interface StoreContextType {
  selectedStoreId: number | null
  setSelectedStoreId: (id: number | null) => void
  stores: Store[]
  loading: boolean
}

export function StoreProvider({ children }) {
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null)
  const [stores, setStores] = useState<Store[]>([])
  const { store_ids } = usePermissions()

  useEffect(() => {
    // Fetch accessible stores based on user's store_ids
    async function loadStores() {
      const data = await api.businessManagement.shops.getAll()
      setStores(data)
      
      // Auto-select first store
      if (data.length > 0 && !selectedStoreId) {
        setSelectedStoreId(data[0].id)
      }
    }
    loadStores()
  }, [store_ids])

  return (
    <StoreContext.Provider value={{ 
      selectedStoreId, 
      setSelectedStoreId, 
      stores, 
      loading 
    }}>
      {children}
    </StoreContext.Provider>
  )
}
```

---

## Provider Hierarchy

```tsx
// app/layout.tsx

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          <StoreProvider>
            {children}
          </StoreProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
```

---

## Data Fetching Patterns

### Server Components

For server-side data:

```tsx
// app/admin/users/page.tsx
export default async function UsersPage() {
  // Data fetched on server
  return <UserList />
}
```

### Client Components

For client-side data with hooks:

```tsx
'use client'

export function UserList() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUsers() {
      const data = await api.users.getAll()
      setUsers(data)
      setLoading(false)
    }
    loadUsers()
  }, [])

  if (loading) return <PageLoading />
  return <Table data={users} />
}
```

---

## Related Pages

- [[Frontend-Overview]] - Frontend architecture
- [[Components]] - UI components
- [[API-Client]] - Backend integration
- [[Authentication]] - Auth system
