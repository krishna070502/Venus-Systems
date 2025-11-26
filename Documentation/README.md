# Venus Chicken

**Your Application's Control Center**

Venus Chicken empowers developers and businesses to build modern applications faster by providing a fully structured foundation — roles, permissions, admin panel, and scalable architecture. Instead of reinventing the backend for every project, Venus Chicken gives you the core essentials from day one.

> **Modular. Extensible. Developer-friendly.** — Venus Chicken is the backbone for any application.

## 🚀 Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **TailwindCSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality React components
- **Supabase Client** - Authentication and real-time features

### Backend
- **FastAPI** - High-performance Python web framework
- **Python 3.11+** - Modern Python features
- **Supabase** - PostgreSQL database with built-in auth
- **JWT Authentication** - Secure token-based auth
- **Pydantic** - Data validation

## ✨ Features

### Authentication & Authorization
- ✅ Email/password authentication via Supabase Auth
- ✅ JWT token-based authentication
- ✅ Role-Based Access Control (RBAC)
- ✅ Granular permission system
- ✅ Protected routes and API endpoints

### Admin Panel (Control Center)
- ✅ Dashboard with real-time statistics
- ✅ User management (view, edit, assign roles)
- ✅ Role management (create, update, assign permissions)
- ✅ Permission management
- ✅ System health monitoring (Backend + Database)
- ✅ Audit logs viewer
- ✅ Settings configuration

### Database Schema
- ✅ User profiles
- ✅ Roles (Admin, Manager, User)
- ✅ Permissions (granular access control)
- ✅ Role-Permission mappings
- ✅ User-Role assignments

### Developer Experience
- ✅ Modular architecture
- ✅ Type-safe code
- ✅ Comprehensive error handling
- ✅ Logging and monitoring
- ✅ Docker support
- ✅ Environment-based configuration

## 📁 Project Structure

```
Business-StarterKit/
├── frontend/                 # Next.js frontend
│   ├── app/                 # App Router pages
│   │   ├── auth/           # Authentication pages
│   │   ├── admin/          # Admin panel
│   │   ├── layout.tsx      # Root layout
│   │   ├── page.tsx        # Home page
│   │   └── globals.css     # Global styles
│   ├── components/         # Reusable components
│   │   ├── ui/            # shadcn/ui components
│   │   └── admin/         # Admin-specific components
│   ├── lib/               # Utilities and config
│   │   ├── api/          # API client
│   │   ├── auth/         # Auth provider
│   │   └── supabase/     # Supabase client
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── .env.example
│
├── backend/                # FastAPI backend
│   ├── app/
│   │   ├── main.py        # Application entry point
│   │   ├── config/        # Configuration
│   │   ├── models/        # Pydantic models
│   │   ├── routers/       # API routes
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── roles.py
│   │   │   ├── permissions.py
│   │   │   └── admin.py
│   │   ├── services/      # Business logic
│   │   ├── dependencies/  # FastAPI dependencies
│   │   └── utils/         # Utilities
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
└── supabase/              # Database migrations
    └── migrations/
        ├── 001_initial_schema.sql
        └── 002_seed_data.sql
```

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Python 3.11+
- Supabase account (https://supabase.com)
- Git

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd Business-StarterKit
```

### 2. Set Up Supabase

1. Create a new project at [Supabase](https://supabase.com)
2. Go to **SQL Editor** and run the migrations:
   - Run `supabase/migrations/001_initial_schema.sql`
   - Run `supabase/migrations/002_seed_data.sql`
3. Get your project credentials from **Settings > API**:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Get your JWT secret from **Settings > API > JWT Settings**:
   - `SUPABASE_JWT_SECRET`

### 3. Set Up Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env and add your Supabase credentials
nano .env  # or use your preferred editor
```

**Edit `backend/.env`:**
```env
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
```

**Run the backend:**
```bash
python -m uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### 4. Set Up Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local and add your Supabase credentials
nano .env.local
```

**Edit `frontend/.env.local`:**
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Run the frontend:**
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

### 5. Create Your First Admin User

1. Navigate to `http://localhost:3000/auth/signup`
2. Create an account
3. In Supabase SQL Editor, manually assign Admin role:
```sql
-- Get the user_id from the profiles table
SELECT id FROM profiles WHERE email = 'your-email@example.com';

-- Assign Admin role (role_id = 1 for Admin)
INSERT INTO user_roles (user_id, role_id)
VALUES ('your-user-id-here', 1);
```
4. Log in and access the admin panel at `/admin`

## 🔧 Configuration

### Environment Variables

#### Backend (`backend/.env`)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `SUPABASE_JWT_SECRET` - JWT secret for token validation
- `ENVIRONMENT` - development/staging/production
- `LOG_LEVEL` - DEBUG/INFO/WARNING/ERROR

#### Frontend (`frontend/.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `NEXT_PUBLIC_API_URL` - Backend API URL

## 📖 Usage Guide

### Adding a New API Endpoint

1. **Create a router** in `backend/app/routers/`:
```python
from fastapi import APIRouter, Depends
from app.dependencies import get_current_user, require_permission

router = APIRouter()

@router.get("/my-endpoint", dependencies=[Depends(require_permission(["my.permission"]))])
async def my_endpoint():
    return {"message": "Success"}
```

2. **Register the router** in `backend/app/main.py`:
```python
from app.routers import my_router
app.include_router(my_router.router, prefix="/api/v1/my", tags=["My Module"])
```

### Adding a New Frontend Page

1. **Create a page** in `frontend/app/`:
```tsx
'use client'

export default function MyPage() {
  return <div>My Page</div>
}
```

2. **Add to admin sidebar** in `frontend/components/admin/Sidebar.tsx`:
```tsx
const navigation = [
  // ... existing items
  { name: 'My Page', href: '/admin/my-page', icon: MyIcon },
]
```

### Adding a New Permission

1. Add to `supabase/migrations/002_seed_data.sql`:
```sql
INSERT INTO public.permissions (key, description) VALUES
  ('my.permission', 'Description of my permission');
```

2. Assign to roles:
```sql
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin' AND p.key = 'my.permission';
```

### Adding a New Database Table

1. Create migration in `supabase/migrations/`:
```sql
CREATE TABLE IF NOT EXISTS public.my_table (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
```

2. Create Pydantic model in `backend/app/models/`:
```python
from pydantic import BaseModel

class MyModel(BaseModel):
    id: int
    name: str
```

3. Create service in `backend/app/services/`:
```python
class MyService:
    async def get_all(self):
        # Implementation
        pass
```

## 🐳 Docker Deployment

### Build and Run Backend
```bash
cd backend
docker build -t saas-backend .
docker run -p 8000:8000 --env-file .env saas-backend
```

### Build and Run Frontend
```bash
cd frontend
docker build -t saas-frontend .
docker run -p 3000:3000 saas-frontend
```

## 🔒 Security Best Practices

1. **Never commit `.env` files** - Use `.env.example` as template
2. **Rotate JWT secrets** regularly in production
3. **Use HTTPS** in production
4. **Implement rate limiting** on authentication endpoints
5. **Regular security audits** of dependencies
6. **Sanitize user inputs** on both frontend and backend
7. **Use Row Level Security (RLS)** in Supabase for data protection

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📚 API Documentation

Once the backend is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### Common Issues

**Backend won't start:**
- Check Python version (`python --version` should be 3.11+)
- Ensure all dependencies are installed (`pip install -r requirements.txt`)
- Verify Supabase credentials in `.env`

**Frontend won't start:**
- Check Node version (`node --version` should be 18+)
- Clear node_modules and reinstall (`rm -rf node_modules && npm install`)
- Verify environment variables in `.env.local`

**Can't log in:**
- Check that Supabase migrations have been run
- Verify JWT secret matches in both frontend and backend
- Check browser console for errors

**Permission denied:**
- Ensure user has been assigned a role
- Check that role has required permissions
- Verify permission checks in backend routes

## 🎯 Roadmap

- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Implement email verification
- [ ] Add password reset functionality
- [ ] Implement 2FA
- [ ] Add API rate limiting
- [ ] Add comprehensive logging
- [ ] Add monitoring and analytics
- [ ] Add CI/CD pipeline
- [ ] Add multi-tenancy support

## 💡 Tips for Extending

### Adding Stripe Integration
1. Install Stripe SDK in backend
2. Create Stripe webhook handlers
3. Add subscription models
4. Create billing UI components

### Adding Email Service
1. Choose provider (SendGrid, AWS SES, etc.)
2. Create email templates
3. Add email service in backend
4. Trigger emails on events

### Adding File Upload
1. Configure Supabase Storage
2. Create upload API endpoints
3. Add file upload UI components
4. Handle file validation and security

---

**Built with ❤️ for developers who want to ship fast**

For questions or support, please open an issue on GitHub.
