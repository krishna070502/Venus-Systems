# Backend Overview

The Venus-System backend is built with **FastAPI** (Python), providing a robust, high-performance REST API.

## Directory Structure

```
backend/
├── app/
│   ├── config/           # Application configuration
│   │   └── settings.py   # Pydantic settings management
│   ├── dependencies/     # FastAPI dependencies
│   │   ├── auth.py       # JWT authentication
│   │   └── rbac.py       # Role-based access control
│   ├── middleware/       # Request/response middleware
│   │   ├── rate_limiter.py    # Role-based rate limiting
│   │   └── session_tracker.py # User session tracking
│   ├── models/           # Pydantic data models
│   │   ├── user.py       # User models
│   │   ├── role.py       # Role models
│   │   ├── permission.py # Permission models
│   │   ├── business_management.py  # Shop, inventory models
│   │   └── poultry_retail/  # Poultry business models
│   ├── routers/          # API route handlers
│   │   ├── auth.py       # Authentication endpoints
│   │   ├── users.py      # User management
│   │   ├── roles.py      # Role management
│   │   ├── permissions.py # Permission management
│   │   ├── admin.py      # Admin dashboard
│   │   ├── health.py     # Health checks
│   │   ├── business_management.py  # Business module
│   │   ├── ai.py         # AI assistant
│   │   ├── activity_logs.py  # Activity logging
│   │   ├── rate_limits.py    # Rate limit config
│   │   └── poultry_retail/   # 16+ poultry modules
│   ├── services/         # Business logic layer
│   │   ├── supabase_client.py  # Database client
│   │   ├── user_service.py     # User operations
│   │   ├── role_service.py     # RBAC operations
│   │   ├── audit_service.py    # Audit logging
│   │   ├── activity_service.py # Activity logging
│   │   ├── ai_service.py       # AI integration
│   │   └── knowledge_service.py # RAG knowledge base
│   └── utils/            # Utility functions
│       ├── logger.py     # Logging configuration
│       └── field_filter.py # Field-level security
└── main.py               # FastAPI application entry point
```

## Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| FastAPI | Latest | Web framework |
| Pydantic | v2 | Data validation |
| Uvicorn | Latest | ASGI server |
| Supabase-py | Latest | Database client |
| python-jose | Latest | JWT handling |
| NVIDIA NIM | API | AI integration |

## Application Entry Point

The main FastAPI application is configured in `main.py`:

```python
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
)

# Middleware Stack
app.add_middleware(CORSMiddleware, ...)
app.add_middleware(SessionTrackerMiddleware)
app.add_middleware(RateLimiterMiddleware)

# Routers
app.include_router(auth.router, prefix="/api/v1/auth")
app.include_router(users.router, prefix="/api/v1/users")
# ... etc
```

## Configuration

All settings are managed via environment variables using Pydantic:

```python
class Settings(BaseSettings):
    PROJECT_NAME: str = "SaaS Starter Kit API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_JWT_SECRET: str
    
    NVIDIA_NIM_API_KEY: Optional[str] = None
```

## Related Pages

- [[API-Routers]] - Complete API documentation
- [[Authentication]] - Auth system details
- [[Services]] - Business logic layer
- [[Middleware]] - Request processing
