# Getting Started Guide

## Welcome to Venus Chicken

Venus Chicken is a production-ready SaaS starter kit built with Next.js, FastAPI, and Supabase. This guide will help you set up and start building your application.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Project Structure](#project-structure)
4. [Environment Setup](#environment-setup)
5. [Running the Application](#running-the-application)
6. [First Login](#first-login)
7. [Next Steps](#next-steps)

---

## Prerequisites

### Required Software

- **Node.js** 18+ and npm
- **Python** 3.11+
- **PostgreSQL** (via Supabase)
- **Git**

### Recommended Tools

- **VS Code** with extensions:
  - ESLint
  - Prettier
  - Python
  - Tailwind CSS IntelliSense
- **Postman** or **Insomnia** for API testing
- **Supabase CLI** (optional)

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/venuschicken.git
cd venuschicken
```

### 2. Set Up Supabase

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Get your project credentials:
   - Project URL
   - Anon/Public Key
   - Service Role Key

### 3. Configure Environment Variables

**Backend** (`backend/.env`):
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret
API_URL=http://localhost:8000
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 4. Run Database Migrations

1. Go to Supabase Dashboard → SQL Editor
2. Run migrations in order:
   - `001_initial_schema.sql`
   - `002_seed_data.sql`
   - `003_audit_logs.sql`
   - `004_auto_create_profile.sql`
   - And so on...

### 5. Start the Application

```bash
# From project root
./start.sh
```

This will:
- Start backend on `http://localhost:8000`
- Start frontend on `http://localhost:3000`
- Check for port conflicts
- Set up Python virtual environment

### 6. Access the Application

- **Frontend:** http://localhost:3000
- **Backend API Docs:** http://localhost:8000/docs
- **Admin Panel:** http://localhost:3000/admin

---

## Project Structure

```
venuschicken/
├── Documentation/           # All documentation files
│   ├── PERMISSION_SYSTEM.md
│   ├── AUTHENTICATION.md
│   ├── UI_COMPONENTS.md
│   ├── DATABASE_SCHEMA.md
│   └── GETTING_STARTED.md
│
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── routers/        # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── models/         # Pydantic models
│   │   ├── dependencies/   # Auth & RBAC
│   │   ├── middleware/     # Request middleware
│   │   └── main.py         # FastAPI app
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/                # Next.js frontend
│   ├── app/                # App router pages
│   │   ├── admin/          # Admin pages
│   │   │   ├── users/
│   │   │   ├── roles/
│   │   │   ├── permissions/
│   │   │   ├── health/
│   │   │   ├── settings/
│   │   │   ├── logs/
│   │   │   └── test/
│   │   └── auth/           # Login/signup
│   ├── components/         # React components
│   │   ├── admin/          # Admin-specific
│   │   └── ui/             # Reusable UI
│   ├── lib/                # Utilities
│   │   ├── api/            # API client
│   │   └── auth/           # Auth context
│   ├── package.json
│   └── next.config.js
│
├── supabase/               # Database
│   └── migrations/         # SQL migrations
│
├── start.sh                # Start script
└── README.md
```

---

## Environment Setup

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate  # macOS/Linux
# or
.\venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your credentials
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local with your credentials
```

### Database Setup

**Option 1: Supabase Dashboard (Recommended)**

1. Login to Supabase Dashboard
2. Go to SQL Editor
3. Create new query
4. Paste migration content
5. Run query
6. Repeat for all migrations in order

**Option 2: Supabase CLI**

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

---

## Running the Application

### Using Start Script (Recommended)

```bash
# From project root
./start.sh
```

Features:
- ✅ Checks if ports 3000 and 8000 are available
- ✅ Creates Python virtual environment if needed
- ✅ Starts both backend and frontend
- ✅ Colored output for easy monitoring
- ✅ Graceful shutdown with Ctrl+C

### Manual Start

**Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm run dev
```

### Docker (Optional)

```bash
# Build and run
docker-compose up --build

# Run in background
docker-compose up -d

# Stop
docker-compose down
```

---

## First Login

### Create Admin User

**Option 1: Sign Up via UI**

1. Go to http://localhost:3000/auth/signup
2. Enter:
   - Full Name: `Admin User`
   - Email: `admin@example.com`
   - Password: `admin123`
3. Click "Create Account"
4. User created with default "User" role

**Option 2: Via SQL**

```sql
-- Create user in Supabase Dashboard → Auth → Users
-- Or use SQL:
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES ('admin@example.com', crypt('admin123', gen_salt('bf')), NOW());
```

### Assign Admin Role

1. Login to Supabase Dashboard
2. Go to SQL Editor
3. Run:

```sql
-- Get user ID
SELECT id, email FROM auth.users WHERE email = 'admin@example.com';

-- Assign Admin role
INSERT INTO user_roles (user_id, role_id)
SELECT 
    (SELECT id FROM auth.users WHERE email = 'admin@example.com'),
    (SELECT id FROM roles WHERE name = 'Admin')
ON CONFLICT DO NOTHING;
```

4. Logout and login again

### Login

1. Go to http://localhost:3000/auth/login
2. Enter credentials
3. Redirected to http://localhost:3000/admin
4. You should see:
   - Dashboard
   - Users
   - Roles
   - Permissions
   - Health
   - Settings
   - Logs
   - Test

---

## Next Steps

### 1. Explore the Admin Panel

- **Users:** Manage user accounts and assign roles
- **Roles:** Create and edit roles
- **Permissions:** Create permissions and assign to roles
- **Health:** Monitor system health
- **Settings:** Configure system settings
- **Logs:** View audit logs
- **Test:** Run test suite

### 2. Understand the Permission System

Read: [Permission System Documentation](./PERMISSION_SYSTEM.md)

Key concepts:
- Permissions define what actions can be performed
- Roles group permissions together
- Users are assigned roles
- Frontend filters UI based on permissions
- Backend enforces permissions on API endpoints

### 3. Customize Your Application

**Add a New Feature:**

1. **Create Permission:**
   ```sql
   INSERT INTO permissions (key, description)
   VALUES ('reports.view', 'View reports');
   ```

2. **Create Page:**
   ```typescript
   // frontend/app/admin/reports/page.tsx
   import { PermissionGuard } from '@/components/admin/PermissionGuard'
   
   export default function ReportsPage() {
     return (
       <PermissionGuard permission="reports.view">
         <div>Reports Content</div>
       </PermissionGuard>
     )
   }
   ```

3. **Add to Sidebar:**
   ```typescript
   // frontend/components/admin/Sidebar.tsx
   { 
     name: 'Reports', 
     href: '/admin/reports', 
     icon: FileBarChart, 
     permission: 'reports.view' 
   }
   ```

4. **Create Backend Endpoint:**
   ```python
   # backend/app/routers/reports.py
   @router.get("/reports")
   async def get_reports(
       user: dict = Depends(require_permission("reports.view"))
   ):
       return {"data": []}
   ```

### 4. Configure Branding

**Change Logo and Colors:**

1. Update logo in `Sidebar.tsx`:
   ```typescript
   <h2 className="text-3xl font-bold text-[#1E4DD8]">YourBrand</h2>
   ```

2. Update colors in `tailwind.config.js`:
   ```javascript
   theme: {
     extend: {
       colors: {
         primary: '#YOUR_COLOR',
       }
     }
   }
   ```

3. Update metadata in `layout.tsx`:
   ```typescript
   export const metadata: Metadata = {
     title: 'Your App Name',
     description: 'Your description',
   }
   ```

### 5. Deploy to Production

**Frontend (Vercel):**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel
```

**Backend (Railway/Heroku):**
```bash
# Example with Railway
railway up
railway add
railway deploy
```

**Environment Variables:**
- Update all localhost URLs to production URLs
- Use production Supabase credentials
- Enable SSL/HTTPS

### 6. Read Documentation

- [Authentication System](./AUTHENTICATION.md)
- [Permission System](./PERMISSION_SYSTEM.md)
- [UI Components](./UI_COMPONENTS.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [API Reference](./API_REFERENCE.md)

---

## Common Issues

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Or use the start script (it checks automatically)
./start.sh
```

### Module Not Found Errors

**Backend:**
```bash
cd backend
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
```

### Database Connection Failed

1. Check Supabase credentials in `.env`
2. Verify project is not paused in Supabase Dashboard
3. Test connection:
   ```bash
   curl https://your-project.supabase.co
   ```

### CORS Errors

Update `backend/app/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Add your domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Profile Not Created on Signup

1. Check trigger exists:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```

2. Re-run migration:
   ```bash
   # Run 004_auto_create_profile.sql again
   ```

---

## Development Workflow

### 1. Start Development

```bash
# Terminal 1: Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload

# Terminal 2: Frontend
cd frontend
npm run dev
```

### 2. Make Changes

- Edit files
- Changes auto-reload (hot module replacement)
- Check browser console for errors
- Check terminal for server errors

### 3. Test Changes

- **Frontend:** Check UI in browser
- **Backend:** Use API docs at http://localhost:8000/docs
- **Database:** Use Supabase Dashboard → Table Editor

### 4. Commit Changes

```bash
git add .
git commit -m "Description of changes"
git push
```

---

## Useful Commands

### Backend

```bash
# Start server
uvicorn app.main:app --reload

# Install new package
pip install package-name
pip freeze > requirements.txt

# Format code
black app/
flake8 app/
```

### Frontend

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Add new package
npm install package-name

# Format code
npm run lint
```

### Database

```bash
# Backup database
pg_dump postgresql://... > backup.sql

# Restore database
psql postgresql://... < backup.sql

# Run migration
psql postgresql://... < migration.sql
```

---

## Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [FastAPI Docs](https://fastapi.tiangolo.com)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

### Community
- [GitHub Issues](https://github.com/your-org/venuschicken/issues)
- [Discord Server](#) (if applicable)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/venuschicken)

---

## Support

Need help? Check these resources:

1. **Documentation:** Read the docs in `Documentation/` folder
2. **API Docs:** http://localhost:8000/docs
3. **GitHub Issues:** Report bugs or request features
4. **Email Support:** support@venuschicken.com (if applicable)

---

## License

MIT License - see LICENSE file for details

---

**Ready to build something awesome? Let's go! 🚀**
