# Architecture Documentation

## System Architecture

This SaaS starter kit follows a modern, scalable architecture with clear separation of concerns.

### High-Level Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│             │         │             │         │             │
│   Next.js   │────────▶│   FastAPI   │────────▶│  Supabase   │
│  Frontend   │  HTTP   │   Backend   │   SQL   │  PostgreSQL │
│             │         │             │         │             │
└─────────────┘         └─────────────┘         └─────────────┘
      │                       │                        │
      │                       │                        │
      └───────────────────────┴────────────────────────┘
                  Supabase Auth (JWT)
```

## Frontend Architecture

### Directory Structure
```
frontend/
├── app/                    # Next.js App Router
│   ├── (routes)/          # Page routes
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── admin/            # Admin-specific components
└── lib/                  # Utilities and configurations
    ├── api/             # API client
    ├── auth/            # Authentication logic
    └── supabase/        # Supabase client
```

### Key Patterns

#### 1. Server vs Client Components
- **Server Components** (default): Used for static content, SEO-critical pages
- **Client Components** ('use client'): Used for interactivity, state management

#### 2. Authentication Flow
```
User Login ──▶ Supabase Auth ──▶ JWT Token ──▶ Stored in Browser
                                               │
                                               ▼
All API Requests ──▶ Include JWT in Header ──▶ FastAPI validates
```

#### 3. State Management
- **Global State**: Zustand (optional)
- **Auth State**: React Context (AuthProvider)
- **Server State**: React hooks + API calls

## Backend Architecture

### Directory Structure
```
backend/
├── app/
│   ├── main.py           # FastAPI app entry point
│   ├── config/           # Configuration management
│   ├── models/           # Pydantic models
│   ├── routers/          # API endpoints
│   ├── services/         # Business logic
│   ├── dependencies/     # FastAPI dependencies
│   └── utils/            # Helper functions
```

### Layered Architecture

```
┌─────────────────────────────────────┐
│         Routers (API Layer)         │  ← HTTP endpoints
├─────────────────────────────────────┤
│       Dependencies (Middleware)     │  ← Auth, permissions
├─────────────────────────────────────┤
│        Services (Business Logic)    │  ← Core functionality
├─────────────────────────────────────┤
│         Models (Data Layer)         │  ← Data validation
├─────────────────────────────────────┤
│      Supabase Client (Database)     │  ← Data persistence
└─────────────────────────────────────┘
```

### Key Patterns

#### 1. Dependency Injection
FastAPI's dependency injection system is used for:
- Authentication (`get_current_user`)
- Authorization (`require_role`, `require_permission`)
- Database connections
- Service instances

#### 2. Error Handling
```python
# Global exception handlers
@app.exception_handler(Exception)
async def handle_exception(request, exc):
    # Log error
    # Return appropriate response
    pass
```

#### 3. Request/Response Models
```python
# Request validation
class UserCreate(BaseModel):
    email: EmailStr
    password: str

# Response serialization
class UserProfile(BaseModel):
    id: str
    email: str
```

## Database Architecture

### Schema Overview

```sql
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   profiles   │     │     roles    │     │ permissions  │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id (PK)      │     │ id (PK)      │     │ id (PK)      │
│ email        │     │ name         │     │ key          │
│ full_name    │     │ description  │     │ description  │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                     │
       │                    └──────┬──────────────┘
       │                           │
       ▼                           ▼
┌──────────────┐          ┌──────────────────┐
│ user_roles   │          │ role_permissions │
├──────────────┤          ├──────────────────┤
│ user_id (FK) │          │ role_id (FK)     │
│ role_id (FK) │          │ permission_id (FK)│
└──────────────┘          └──────────────────┘
```

### Row Level Security (RLS)

Policies are set up to ensure:
- Users can only view/edit their own profile
- Only authenticated users can view roles and permissions
- Admin operations require proper permissions

## Authentication & Authorization

### Authentication Flow

```
1. User submits credentials
       ▼
2. Frontend sends to Supabase Auth
       ▼
3. Supabase validates and returns JWT
       ▼
4. Frontend stores JWT and includes in all requests
       ▼
5. Backend validates JWT on each request
```

### Authorization Model

**Three-tier authorization:**

1. **Authentication**: User is logged in (has valid JWT)
2. **Role-Based**: User has specific role (Admin, Manager, User)
3. **Permission-Based**: User has specific permission (users.read, etc.)

**Example Checks:**
```python
# Requires authentication
@router.get("/profile", dependencies=[Depends(get_current_user)])

# Requires specific role
@router.get("/admin", dependencies=[Depends(require_role(["Admin"]))])

# Requires specific permission
@router.get("/users", dependencies=[Depends(require_permission(["users.read"]))])
```

## API Design

### RESTful Conventions

```
GET    /api/v1/users          # List all users
POST   /api/v1/users          # Create user
GET    /api/v1/users/{id}     # Get specific user
PUT    /api/v1/users/{id}     # Update user
DELETE /api/v1/users/{id}     # Delete user
```

### Response Format

**Success Response:**
```json
{
  "id": "123",
  "email": "user@example.com",
  "created_at": "2024-11-24T10:00:00Z"
}
```

**Error Response:**
```json
{
  "detail": "User not found",
  "message": "Resource not found"
}
```

## Security Considerations

### Frontend Security
1. **XSS Prevention**: React auto-escapes by default
2. **CSRF Protection**: JWT tokens (not cookies)
3. **Secure Storage**: Supabase handles token storage
4. **HTTPS Only**: Enforce in production

### Backend Security
1. **JWT Validation**: Every protected route validates token
2. **SQL Injection**: Supabase client uses parameterized queries
3. **Rate Limiting**: Should be added for production
4. **CORS**: Configured for specific origins only

### Database Security
1. **RLS Policies**: Protect data at database level
2. **Service Role**: Used only in backend, never exposed
3. **Anon Key**: Limited permissions, safe for frontend
4. **Connection Pooling**: Managed by Supabase

## Scalability Considerations

### Horizontal Scaling
- **Frontend**: Deploy to Vercel, Netlify (auto-scales)
- **Backend**: Deploy multiple instances behind load balancer
- **Database**: Supabase handles scaling

### Performance Optimizations
1. **Frontend**:
   - Server-side rendering for initial load
   - Client-side navigation for speed
   - Code splitting automatically

2. **Backend**:
   - Async/await for non-blocking operations
   - Connection pooling
   - Caching (Redis) can be added

3. **Database**:
   - Indexes on frequently queried fields
   - Materialized views for complex queries
   - Read replicas for heavy read loads

## Extension Points

### Adding New Features

1. **New Database Table**:
   - Create migration SQL
   - Add Pydantic models
   - Create service layer
   - Add router endpoints
   - Create frontend components

2. **New Permission**:
   - Add to permissions table
   - Assign to roles
   - Use in route dependencies

3. **New Integration**:
   - Add to services layer
   - Create API endpoints if needed
   - Add frontend UI

## Deployment Architecture

### Recommended Production Setup

```
┌──────────────┐
│   Vercel     │  ← Frontend (Next.js)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Railway    │  ← Backend (FastAPI)
│   or Render  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Supabase   │  ← Database + Auth
└──────────────┘
```

### Environment-Specific Configs

```
Development:  Local servers, verbose logging
Staging:      Similar to production, test data
Production:   Optimized, monitoring, backups
```

---

This architecture is designed to be:
- **Scalable**: Handle growth in users and data
- **Maintainable**: Clear separation of concerns
- **Secure**: Multiple layers of protection
- **Extensible**: Easy to add new features
