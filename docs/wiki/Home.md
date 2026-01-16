# Venus-System Wiki

Welcome to the **Venus-System** documentation wiki! This wiki provides comprehensive documentation for the entire codebase.

## Quick Navigation

### 📚 Architecture
- [[Architecture-Overview]] - System architecture and design
- [[Technology-Stack]] - Technologies used

### 🔧 Backend
- [[Backend-Overview]] - FastAPI backend structure
- [[API-Routers]] - All API endpoints documentation
- [[Services]] - Business logic services
- [[Middleware]] - Request processing middleware
- [[Authentication]] - Auth and RBAC system
- [[Database-Models]] - Pydantic models

### 🎨 Frontend
- [[Frontend-Overview]] - Next.js frontend structure
- [[Components]] - UI component library
- [[Pages-Routing]] - App router pages
- [[State-Management]] - Auth and permission hooks
- [[API-Client]] - Backend API integration

### 🗃️ Database
- [[Database-Schema]] - Complete schema overview
- [[Migrations-Reference]] - All 81 migrations documented
- [[RLS-Policies]] - Row Level Security policies

### 🔐 Security
- [[RBAC-System]] - Roles and permissions
- [[Security-Best-Practices]] - Security guidelines

### 📦 Poultry Retail Module
- [[Poultry-Overview]] - Business module overview
- [[Poultry-API-Reference]] - Complete API documentation

---

## Getting Started

1. Clone the repository
2. Set up environment variables (see [[Environment-Setup]])
3. Run migrations (see [[Database-Schema]])
4. Start development servers

```bash
# Start both frontend and backend
./start.sh
```

---

## Project Structure

```
Venus-System/
├── backend/           # FastAPI Python backend
│   ├── app/
│   │   ├── config/    # Settings and configuration
│   │   ├── dependencies/ # Auth, RBAC dependencies
│   │   ├── middleware/   # Rate limiting, session tracking
│   │   ├── models/       # Pydantic data models
│   │   ├── routers/      # API route handlers
│   │   ├── services/     # Business logic
│   │   └── utils/        # Utilities
│   └── main.py
├── frontend/          # Next.js React frontend
│   ├── app/           # App router pages
│   ├── components/    # React components
│   └── lib/           # Utilities and hooks
├── supabase/
│   └── migrations/    # 81 SQL migration files
└── docs/              # Documentation
```
