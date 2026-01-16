"""
FastAPI Main Application
========================
Entry point for the SaaS Starter Kit backend API.
Includes CORS, exception handlers, and router registration.
"""

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging

from app.config.settings import settings
from app.routers import auth, users, roles, permissions, admin, health, business_management, rate_limits, ai, activity_logs
from app.routers.poultry_retail import router as poultry_retail_router
from app.utils.logger import setup_logging
from app.middleware.session_tracker import SessionTrackerMiddleware
from app.middleware.rate_limiter import RateLimiterMiddleware

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="""
## Venus Chicken - Enterprise SaaS Starter Kit

**Your Application's Control Center** with enterprise-grade RBAC and beautiful admin panel.

### ✨ Key Features

- 🔐 **Advanced RBAC** - Comprehensive permission-based access control
- 🎯 **Dynamic Permission Display** - Automatically shows all user permissions
- 👥 **User Management** - Complete user and role administration
- 📊 **Audit Logging** - Track all system changes
- 🏥 **Health Monitoring** - Real-time backend and database status
- 🎨 **Beautiful Admin UI** - Modern, responsive interface

### 🔑 Permission System

Venus Chicken implements a sophisticated permission system:

- **Permission Format**: `<resource>.<action>` (e.g., `users.read`, `systemdashboard.view`)
- **Dynamic Features**: New permissions automatically appear in the UI
- **Feature Mapping**: Known permissions display as feature cards with icons
- **Granular Control**: Protect pages, components, and API endpoints

### 📖 Available Permissions

- `systemdashboard.view` - View system dashboard
- `users.read` - View users
- `users.write` - Create/update users
- `roles.read` - Manage roles
- `permissions.read` - Manage permissions
- `system.admin` - Admin access
- `system.settings` - Access settings
- `system.logs` - View audit logs
- `system.docs` - Access documentation
- `system.status` - View status indicators
- `test.run` - Run test suite

### 🚀 Getting Started

1. **Authenticate**: Use `/api/v1/auth/login` to get JWT token
2. **Include Token**: Add `Authorization: Bearer <token>` header to requests
3. **Check Permissions**: User permissions returned in `/api/v1/users/me`

### 🔒 Security

All admin endpoints require appropriate permissions. See endpoint descriptions for required permissions.
""",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
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

# Rate Limiter Middleware
app.add_middleware(RateLimiterMiddleware)


# =============================================================================
# EXCEPTION HANDLERS
# =============================================================================

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with detailed messages"""
    logger.error(f"Validation error: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": exc.errors(),
            "message": "Validation error occurred"
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all uncaught exceptions"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "message": "An internal server error occurred",
            "detail": str(exc) if settings.ENVIRONMENT != "production" else None
        },
    )


# =============================================================================
# ROUTES
# =============================================================================

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "Venus Chicken API - Your Application's Control Center",
        "version": settings.VERSION,
        "status": "healthy"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "version": settings.VERSION
    }


# =============================================================================
# ROUTER REGISTRATION
# =============================================================================

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(roles.router, prefix="/api/v1/roles", tags=["Roles"])
app.include_router(permissions.router, prefix="/api/v1/permissions", tags=["Permissions"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(health.router, prefix="/api/v1/health", tags=["Health"])
app.include_router(business_management.router, prefix="/api/v1/business-management", tags=["Business Management"])
app.include_router(rate_limits.router, prefix="/api/v1/rate-limits", tags=["Rate Limits"])
app.include_router(ai.router, prefix="/api/v1/ai", tags=["AI Assistant"])
app.include_router(activity_logs.router, prefix="/api/v1/activity-logs", tags=["Activity Logs"])
app.include_router(poultry_retail_router, prefix="/api/v1", tags=["Poultry Retail"])


# =============================================================================
# STARTUP/SHUTDOWN EVENTS
# =============================================================================

@app.on_event("startup")
async def startup_event():
    """Run on application startup"""
    logger.info(f"🚀 Starting {settings.PROJECT_NAME} v{settings.VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Supabase URL: {settings.SUPABASE_URL}")


@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown"""
    logger.info(f"Shutting down {settings.PROJECT_NAME}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.ENVIRONMENT == "development"
    )
