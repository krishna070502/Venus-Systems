# Architecture Overview

High-level system architecture for Venus-System.

## System Architecture

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        Browser[Web Browser]
        Mobile[Mobile Browser]
    end
    
    subgraph Frontend["Frontend (Next.js)"]
        NextApp[Next.js App]
        AuthProv[AuthProvider]
        PermHook[usePermissions]
        APIClient[API Client]
    end
    
    subgraph Backend["Backend (FastAPI)"]
        FastAPI[FastAPI App]
        MW[Middleware]
        Routers[API Routers]
        Services[Services]
        RBAC[RBAC Layer]
    end
    
    subgraph External["External Services"]
        Supabase[(Supabase)]
        NIM[NVIDIA NIM]
    end
    
    Browser --> NextApp
    Mobile --> NextApp
    NextApp --> AuthProv
    AuthProv --> APIClient
    PermHook --> APIClient
    APIClient -->|REST API| FastAPI
    FastAPI --> MW
    MW --> Routers
    Routers --> RBAC
    RBAC --> Services
    Services --> Supabase
    Services --> NIM
    AuthProv -->|Direct Auth| Supabase
```

---

## Component Overview

### Frontend (Next.js 14)

| Component | Purpose |
|-----------|---------|
| App Router | Client-side navigation |
| AuthProvider | Supabase authentication |
| usePermissions | Permission state management |
| API Client | Backend communication |
| PermissionGuard | Access control components |
| Admin Sidebar | Dynamic navigation |

### Backend (FastAPI)

| Component | Purpose |
|-----------|---------|
| Main App | Request routing |
| Middleware | Rate limiting, session tracking |
| Routers | API endpoints |
| Dependencies | Authentication, RBAC |
| Services | Business logic |
| Models | Data validation |

### Database (Supabase)

| Component | Purpose |
|-----------|---------|
| PostgreSQL | Data storage |
| Auth | User authentication |
| RLS | Row-level security |
| Triggers | Automated actions |
| Functions | Stored procedures |

---

## Request Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant F as Frontend
    participant B as Backend
    participant D as Database

    C->>F: Page Request
    F->>F: Check Auth State
    F->>B: API Request + JWT
    B->>B: Validate JWT
    B->>B: Check Permissions
    B->>D: Query Data
    D->>B: Return Data
    B->>F: JSON Response
    F->>C: Render Page
```

---

## Data Flow

### Authentication Flow

```
1. User enters credentials
2. Frontend → Supabase Auth
3. Supabase returns JWT
4. Frontend stores session
5. Frontend → Backend /record-session
6. Backend logs activity
7. Frontend → Backend /users/me
8. Backend returns permissions
```

### Business Operation Flow

```
1. User initiates action
2. Frontend checks permissions (client-side)
3. Frontend → Backend API
4. Backend validates JWT
5. Backend checks RBAC permissions
6. Backend validates store access
7. Service layer processes
8. Database enforces RLS
9. Audit log recorded
10. Response returned
```

---

## Deployment Architecture

```mermaid
flowchart LR
    subgraph Production
        LB[Load Balancer]
        FE1[Frontend 1]
        FE2[Frontend 2]
        BE1[Backend 1]
        BE2[Backend 2]
        DB[(Supabase)]
    end
    
    Users --> LB
    LB --> FE1
    LB --> FE2
    FE1 --> BE1
    FE1 --> BE2
    FE2 --> BE1
    FE2 --> BE2
    BE1 --> DB
    BE2 --> DB
```

---

## Security Layers

| Layer | Protection |
|-------|------------|
| **Network** | HTTPS, CORS |
| **Authentication** | JWT tokens, Supabase Auth |
| **Authorization** | RBAC (roles + permissions) |
| **Database** | RLS policies |
| **Application** | Input validation, rate limiting |
| **Audit** | Activity logging |

---

## Related Pages

- [[Backend-Overview]] - Backend details
- [[Frontend-Overview]] - Frontend details
- [[Authentication]] - Auth system
- [[Database-Schema]] - Data model
