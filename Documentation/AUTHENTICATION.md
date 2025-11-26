# Authentication System Documentation

## Overview

CoreDesk uses a JWT-based authentication system powered by Supabase Auth on the backend and a custom AuthProvider context on the frontend. This document covers the complete authentication flow, implementation details, and usage.

---

## Table of Contents

1. [Authentication Flow](#authentication-flow)
2. [Backend Implementation](#backend-implementation)
3. [Frontend Implementation](#frontend-implementation)
4. [User Registration](#user-registration)
5. [User Login](#user-login)
6. [Session Management](#session-management)
7. [Password Reset](#password-reset)
8. [Security Considerations](#security-considerations)

---

## Authentication Flow

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
     │                     │                     │
     │                     │  3. JWT Token       │
     │                     │<────────────────────│
     │  4. JWT + Profile   │                     │
     │<────────────────────│                     │
     │                     │                     │
     │ 5. Store Token      │                     │
     │  (Cookie/Storage)   │                     │
     │                     │                     │
     │ 6. API Request      │                     │
     │  + Bearer Token     │                     │
     │────────────────────>│                     │
     │                     │  7. Validate Token  │
     │                     │────────────────────>│
     │                     │                     │
     │                     │  8. User Data       │
     │                     │<────────────────────│
     │  9. Response        │                     │
     │<────────────────────│                     │
     │                     │                     │
```

---

## Backend Implementation

### JWT Token Validation

**File:** `backend/app/dependencies/auth.py`

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from supabase import Client
from app.services.supabase_client import supabase_client

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Validate JWT token and return current user
    
    Args:
        token: JWT token from Authorization header
        
    Returns:
        dict: User data with id, email, etc.
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        # Verify token with Supabase
        user_response = supabase_client.auth.get_user(token)
        
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return {
            "id": user_response.user.id,
            "email": user_response.user.email,
            "user_metadata": user_response.user.user_metadata
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
```

### Authentication Endpoints

**File:** `backend/app/routers/auth.py`

#### Sign Up

```python
@router.post("/signup")
async def signup(email: str, password: str, full_name: str):
    """
    Register a new user
    
    Args:
        email: User email
        password: User password (min 6 characters)
        full_name: User's full name
        
    Returns:
        JWT token and user data
    """
    try:
        # Create user in Supabase Auth
        auth_response = supabase_client.auth.sign_up({
            "email": email,
            "password": password,
            "options": {
                "data": {"full_name": full_name}
            }
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user"
            )
        
        # Profile is auto-created via database trigger
        
        return {
            "access_token": auth_response.session.access_token,
            "refresh_token": auth_response.session.refresh_token,
            "user": auth_response.user
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
```

#### Sign In

```python
@router.post("/signin")
async def signin(email: str, password: str):
    """
    Authenticate user and return JWT token
    
    Args:
        email: User email
        password: User password
        
    Returns:
        JWT token and user data
    """
    try:
        auth_response = supabase_client.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        return {
            "access_token": auth_response.session.access_token,
            "refresh_token": auth_response.session.refresh_token,
            "user": auth_response.user
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
```

#### Sign Out

```python
@router.post("/signout")
async def signout(current_user: dict = Depends(get_current_user)):
    """
    Sign out current user and invalidate token
    """
    try:
        supabase_client.auth.sign_out()
        return {"message": "Successfully signed out"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
```

---

## Frontend Implementation

### AuthProvider Context

**File:** `frontend/lib/auth/AuthProvider.tsx`

```typescript
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

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) throw error
    
    setSession(data.session)
    setUser(data.user)
  }

  const signUp = async (
    email: string, 
    password: string, 
    fullName: string
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    })
    
    if (error) throw error
    
    setSession(data.session)
    setUser(data.user)
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    
    setSession(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider 
      value={{ user, session, loading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

### Login Page

**File:** `frontend/app/auth/login/page.tsx`

```typescript
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()
  const { showError } = useAlert()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await signIn(email, password)
      router.push('/admin')
    } catch (error: any) {
      showError(error.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Button type="submit" disabled={loading}>
        {loading ? <LoadingSpinner /> : 'Sign In'}
      </Button>
    </form>
  )
}
```

### Signup Page

**File:** `frontend/app/auth/signup/page.tsx`

```typescript
export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const router = useRouter()
  const { showError, showSuccess } = useAlert()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await signUp(email, password, fullName)
      showSuccess('Account created successfully!')
      router.push('/admin')
    } catch (error: any) {
      showError(error.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Input
        placeholder="Full Name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
      />
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        type="password"
        placeholder="Password (min 6 characters)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={6}
      />
      <Button type="submit" disabled={loading}>
        {loading ? <LoadingSpinner /> : 'Create Account'}
      </Button>
    </form>
  )
}
```

---

## User Registration

### Flow

1. User fills signup form (email, password, full name)
2. Frontend calls `signUp()` from useAuth()
3. Supabase creates user in `auth.users` table
4. Database trigger auto-creates profile in `profiles` table
5. Default "User" role assigned via trigger
6. JWT token returned to client
7. User redirected to `/admin`

### Profile Auto-Creation Trigger

**File:** `supabase/migrations/004_auto_create_profile.sql`

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name'
    );
    
    -- Assign default "User" role
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

## User Login

### Flow

1. User enters email and password
2. Frontend calls `signIn()` from useAuth()
3. Supabase validates credentials
4. JWT access token and refresh token returned
5. Tokens stored in cookies/localStorage
6. User data loaded into AuthContext
7. User redirected to `/admin`

### Session Tracking

**File:** `supabase/migrations/007_create_user_sessions_table.sql`

Sessions are automatically tracked in the database:

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

**Middleware:** `backend/app/middleware/session_tracker.py`

Tracks user activity on each API request.

---

## Session Management

### Token Storage

Tokens are stored in HTTP-only cookies for security:

```typescript
// Automatic via Supabase client
supabase.auth.signInWithPassword({...})
// Stores tokens in cookies automatically
```

### Token Refresh

Tokens are automatically refreshed by Supabase client:

```typescript
// In AuthProvider
supabase.auth.onAuthStateChange((_event, session) => {
  setSession(session)  // Updated with refreshed tokens
  setUser(session?.user ?? null)
})
```

### Auto Logout

Sessions expire after inactivity:

```typescript
// Supabase default: 1 hour access token, 7 day refresh token
// Customize in Supabase Dashboard → Auth → Settings
```

---

## Password Reset

### Request Reset

```typescript
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: 'https://yourapp.com/reset-password',
})
```

### Update Password

```typescript
const { error } = await supabase.auth.updateUser({
  password: newPassword
})
```

---

## Security Considerations

### 1. Password Requirements

- Minimum 6 characters (enforced by Supabase)
- Consider adding: uppercase, lowercase, numbers, special chars

### 2. Token Security

- Access tokens stored in HTTP-only cookies
- Refresh tokens stored securely
- Tokens transmitted over HTTPS only

### 3. CORS Configuration

**File:** `backend/app/main.py`

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Update for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 4. Rate Limiting

Consider adding rate limiting for auth endpoints:

```python
# Example with slowapi
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/signin")
@limiter.limit("5/minute")
async def signin(...):
    ...
```

### 5. Email Verification

Enable in Supabase Dashboard:
- Auth → Settings → Enable email confirmations
- Users must verify email before access

### 6. Multi-Factor Authentication

Enable in Supabase Dashboard:
- Auth → Settings → Enable MFA
- Supports TOTP authenticator apps

---

## Protected Routes

### Middleware Pattern

Protect entire route groups:

```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Redirect to login if not authenticated
  if (!session && req.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  return res
}

export const config = {
  matcher: ['/admin/:path*']
}
```

### Component-Level Protection

```typescript
function ProtectedPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  if (loading) return <LoadingSpinner />
  if (!user) return null

  return <div>Protected Content</div>
}
```

---

## API Request Authentication

### Adding Bearer Token

**File:** `frontend/lib/api/client.ts`

```typescript
const getAuthHeader = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token 
    ? { Authorization: `Bearer ${session.access_token}` }
    : {}
}

export const api = {
  users: {
    getMe: async () => {
      const headers = await getAuthHeader()
      const response = await fetch(`${API_URL}/users/me`, { headers })
      return response.json()
    },
  },
  // ... other endpoints
}
```

---

## Troubleshooting

### Issue: "Invalid authentication credentials"

**Causes:**
- Token expired
- Token not sent in header
- Invalid token format

**Solutions:**
```typescript
// Check if session exists
const { data: { session } } = await supabase.auth.getSession()
console.log('Session:', session)

// Refresh session
await supabase.auth.refreshSession()

// Re-login
await supabase.auth.signInWithPassword({...})
```

### Issue: User redirected to login after signup

**Cause:** Email verification required

**Solution:**
1. Disable email verification (dev only):
   - Supabase Dashboard → Auth → Email Auth
   - Disable "Confirm email"

2. Or check email and verify

### Issue: CORS errors

**Solution:**
```python
# backend/app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## File Locations

- **Backend Auth:** `backend/app/dependencies/auth.py`
- **Auth Router:** `backend/app/routers/auth.py`
- **Supabase Client:** `backend/app/services/supabase_client.py`
- **Auth Provider:** `frontend/lib/auth/AuthProvider.tsx`
- **Login Page:** `frontend/app/auth/login/page.tsx`
- **Signup Page:** `frontend/app/auth/signup/page.tsx`
- **API Client:** `frontend/lib/api/client.ts`
- **Profile Trigger:** `supabase/migrations/004_auto_create_profile.sql`
- **Sessions Table:** `supabase/migrations/007_create_user_sessions_table.sql`

---

## Related Documentation

- [Permission System](./PERMISSION_SYSTEM.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [API Reference](./API_REFERENCE.md)
