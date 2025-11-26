'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  BookOpen, 
  Rocket, 
  Code2, 
  Database, 
  Shield, 
  Zap,
  FileText,
  Settings,
  Workflow,
  Package
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PermissionGuard } from '@/components/admin/PermissionGuard'

const documentationSections = [
  {
    id: 'quick-start',
    title: 'Quick Start Guide',
    icon: Rocket,
    description: 'Get up and running in under 10 minutes',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    content: `
# Quick Start Guide

Get Venus Chicken running in under 10 minutes.

## Prerequisites
- Node.js 18+
- Python 3.11+
- Supabase account

## Step 1: Supabase Setup

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Run migrations in SQL Editor:
   - \`001_initial_schema.sql\`
   - \`002_seed_data.sql\`

## Step 2: Backend Setup

\`\`\`bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Add your Supabase credentials to .env
python -m uvicorn app.main:app --reload
\`\`\`

## Step 3: Frontend Setup

\`\`\`bash
cd frontend
npm install
cp .env.example .env.local
# Add your Supabase credentials to .env.local
npm run dev
\`\`\`

## Step 4: Create Admin Account

1. Sign up at http://localhost:3000/auth/signup
2. Assign admin role via Supabase SQL Editor
3. Login and access /admin

🎉 You're ready to build!
    `
  },
  {
    id: 'architecture',
    title: 'Architecture',
    icon: Code2,
    description: 'System design and patterns',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    content: `
# Architecture Documentation

## System Overview

Venus Chicken follows a modern three-tier architecture:

\`\`\`
Frontend (Next.js) ←→ Backend (FastAPI) ←→ Database (Supabase)
\`\`\`

## Frontend Architecture

**Tech Stack:**
- Next.js 14 with App Router
- TypeScript for type safety
- TailwindCSS for styling
- shadcn/ui components

**Key Patterns:**
- Server Components for static content
- Client Components for interactivity
- Context API for auth state
- API client for backend communication

## Backend Architecture

**Layered Design:**
1. **Routers**: HTTP endpoints
2. **Dependencies**: Auth/permissions middleware
3. **Services**: Business logic
4. **Models**: Data validation (Pydantic)
5. **Database**: Supabase client

**Key Features:**
- FastAPI dependency injection
- JWT authentication
- Role-based access control
- Async/await for performance

## Database Schema

**Core Tables:**
- \`profiles\`: User information
- \`roles\`: Admin, Manager, User
- \`permissions\`: Granular access control
- \`user_roles\`: User-role assignments
- \`role_permissions\`: Role-permission mappings

## Security

**Multi-layer Protection:**
- JWT token validation
- Row Level Security (RLS)
- Permission-based access
- SQL injection prevention
    `
  },
  {
    id: 'database',
    title: 'Database Setup',
    icon: Database,
    description: 'Schema, migrations, and Supabase config',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    content: `
# Database Setup Guide

## Supabase Configuration

### 1. Create Project
- Go to [supabase.com](https://supabase.com)
- Click "New Project"
- Choose a name and password
- Select a region

### 2. Run Migrations

Navigate to SQL Editor and run these in order:

**001_initial_schema.sql:**
Creates core tables (profiles, roles, permissions, etc.)

**002_seed_data.sql:**
Populates default roles and permissions

### 3. Get Credentials

**Settings > API:**
- Project URL
- anon/public key
- service_role key

**Settings > API > JWT Settings:**
- JWT Secret

## Schema Overview

### Profiles Table
\`\`\`sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

### Roles Table
\`\`\`sql
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT
);
\`\`\`

### Permissions Table
\`\`\`sql
CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  description TEXT
);
\`\`\`

## Row Level Security

Enable RLS on all tables:
\`\`\`sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
\`\`\`

Create policies to protect data.
    `
  },
  {
    id: 'authentication',
    title: 'Authentication',
    icon: Shield,
    description: 'Auth flow, JWT, and user management',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    content: `
# Authentication & Authorization

## Authentication Flow

1. **User Login**
   - Frontend sends credentials to Supabase Auth
   - Supabase validates and returns JWT token
   - Token stored securely in browser

2. **API Requests**
   - Frontend includes JWT in Authorization header
   - Backend validates token
   - Request proceeds if valid

## JWT Structure

\`\`\`json
{
  "sub": "user-id",
  "email": "user@example.com",
  "role": "authenticated",
  "exp": 1234567890
}
\`\`\`

## Authorization Levels

### 1. Authentication
User must be logged in:
\`\`\`python
@router.get("/profile", dependencies=[Depends(get_current_user)])
\`\`\`

### 2. Role-Based
User must have specific role:
\`\`\`python
@router.get("/admin", dependencies=[Depends(require_role(["Admin"]))])
\`\`\`

### 3. Permission-Based
User must have specific permission:
\`\`\`python
@router.get("/users", dependencies=[Depends(require_permission(["users.read"]))])
\`\`\`

## Default Roles

**Admin:**
- Full system access
- All permissions

**Manager:**
- Read/write most resources
- Cannot modify permissions

**User:**
- Read-only access
- Can update own profile

## Security Best Practices

- Never expose service_role key
- Rotate JWT secrets regularly
- Use HTTPS in production
- Implement rate limiting
- Validate all inputs
    `
  },
  {
    id: 'api-reference',
    title: 'API Reference',
    icon: Workflow,
    description: 'Complete API endpoint documentation',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    content: `
# API Reference

## Base URL
\`\`\`
http://localhost:8000/api/v1
\`\`\`

## Authentication Endpoints

### Login
\`\`\`
POST /auth/login
\`\`\`
**Body:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "password123"
}
\`\`\`
**Response:**
\`\`\`json
{
  "access_token": "eyJ...",
  "token_type": "bearer"
}
\`\`\`

### Signup
\`\`\`
POST /auth/signup
\`\`\`
**Body:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe"
}
\`\`\`

## User Endpoints

### Get All Users
\`\`\`
GET /users
Authorization: Bearer {token}
\`\`\`

### Get User Profile
\`\`\`
GET /users/{user_id}
Authorization: Bearer {token}
\`\`\`

### Update User
\`\`\`
PUT /users/{user_id}
Authorization: Bearer {token}
\`\`\`
**Body:**
\`\`\`json
{
  "full_name": "Jane Doe"
}
\`\`\`

## Role Endpoints

### Get All Roles
\`\`\`
GET /roles
Authorization: Bearer {token}
\`\`\`

### Create Role
\`\`\`
POST /roles
Authorization: Bearer {token}
\`\`\`
**Body:**
\`\`\`json
{
  "name": "Manager",
  "description": "Can manage users"
}
\`\`\`

## Admin Endpoints

### Get System Stats
\`\`\`
GET /admin/stats
Authorization: Bearer {token}
\`\`\`

### Get Health Status
\`\`\`
GET /admin/health
Authorization: Bearer {token}
\`\`\`

For interactive API docs, visit:
**http://localhost:8000/docs**
    `
  },
  {
    id: 'deployment',
    title: 'Deployment',
    icon: Zap,
    description: 'Production deployment guide',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    content: `
# Deployment Guide

## Frontend Deployment (Vercel)

### 1. Connect Repository
- Go to [vercel.com](https://vercel.com)
- Import your Git repository
- Select the \`frontend\` directory as root

### 2. Configure Environment
Add these environment variables:
\`\`\`
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=your-backend-url
\`\`\`

### 3. Deploy
- Click "Deploy"
- Vercel handles build and deployment
- Your site is live!

## Backend Deployment (Railway/Render)

### Railway

1. Create new project
2. Add PostgreSQL (or use Supabase)
3. Add environment variables
4. Deploy from GitHub

### Render

1. Create new Web Service
2. Connect repository
3. Set build command: \`pip install -r requirements.txt\`
4. Set start command: \`uvicorn app.main:app --host 0.0.0.0\`

## Docker Deployment

### Backend Dockerfile
\`\`\`dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0"]
\`\`\`

### Build and Run
\`\`\`bash
docker build -t coredesk-backend .
docker run -p 8000:8000 --env-file .env coredesk-backend
\`\`\`

## Environment Variables

### Production .env
\`\`\`env
SUPABASE_URL=your-prod-url
SUPABASE_ANON_KEY=your-prod-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-prod-service-key
SUPABASE_JWT_SECRET=your-prod-jwt-secret
ENVIRONMENT=production
LOG_LEVEL=INFO
\`\`\`

## Post-Deployment Checklist

- ✅ Enable HTTPS
- ✅ Set up monitoring
- ✅ Configure backups
- ✅ Set up error tracking (Sentry)
- ✅ Enable rate limiting
- ✅ Review security settings
- ✅ Test all critical flows
    `
  },
  {
    id: 'customization',
    title: 'Customization',
    icon: Settings,
    description: 'Branding, features, and extensions',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    content: `
# Customization Guide

## Branding

### Update Colors
Edit \`tailwind.config.js\`:
\`\`\`javascript
theme: {
  extend: {
    colors: {
      'core-blue': '#1E4DD8',
      'core-cyan': '#29C6D1',
      // Add your brand colors
    }
  }
}
\`\`\`

### Update Logo
Replace Venus Chicken text in:
- \`components/admin/Sidebar.tsx\`
- \`app/admin/layout.tsx\`
- \`app/page.tsx\`

### Custom Fonts
Add to \`app/layout.tsx\`:
\`\`\`typescript
import { Inter, Poppins } from 'next/font/google'

const font = Poppins({ weight: ['400', '600'], subsets: ['latin'] })
\`\`\`

## Adding Features

### New API Endpoint

1. **Create Router** (\`backend/app/routers/my_feature.py\`):
\`\`\`python
from fastapi import APIRouter

router = APIRouter()

@router.get("/items")
async def get_items():
    return {"items": []}
\`\`\`

2. **Register in main.py**:
\`\`\`python
from app.routers import my_feature
app.include_router(my_feature.router, prefix="/api/v1/items", tags=["Items"])
\`\`\`

### New Frontend Page

1. **Create Page** (\`app/admin/my-page/page.tsx\`):
\`\`\`typescript
export default function MyPage() {
  return <div>My Custom Page</div>
}
\`\`\`

2. **Add to Sidebar** (\`components/admin/Sidebar.tsx\`):
\`\`\`typescript
{ name: 'My Page', href: '/admin/my-page', icon: MyIcon }
\`\`\`

### New Permission

1. **Add to migrations**:
\`\`\`sql
INSERT INTO permissions (key, description) 
VALUES ('items.read', 'Can view items');
\`\`\`

2. **Assign to role**:
\`\`\`sql
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Admin' AND p.key = 'items.read';
\`\`\`

3. **Use in endpoint**:
\`\`\`python
@router.get("/items", dependencies=[Depends(require_permission(["items.read"]))])
\`\`\`

## Third-Party Integrations

### Stripe Payments
\`\`\`bash
pip install stripe
npm install @stripe/stripe-js
\`\`\`

### SendGrid Email
\`\`\`bash
pip install sendgrid
\`\`\`

### Analytics
\`\`\`bash
npm install @vercel/analytics
\`\`\`
    `
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: FileText,
    description: 'Common issues and solutions',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    content: `
# Troubleshooting Guide

## Common Issues

### Backend Won't Start

**Issue:** "Module not found" errors
\`\`\`bash
# Solution
cd backend
source venv/bin/activate
pip install -r requirements.txt
\`\`\`

**Issue:** "Invalid Supabase credentials"
- Check \`.env\` file exists
- Verify credentials match Supabase dashboard
- Ensure no extra spaces or quotes

### Frontend Won't Start

**Issue:** "Cannot find module"
\`\`\`bash
# Solution
rm -rf node_modules package-lock.json
npm install
\`\`\`

**Issue:** "Environment variables not found"
- Check \`.env.local\` file exists
- Verify all variables start with \`NEXT_PUBLIC_\`
- Restart dev server after changes

### Authentication Issues

**Issue:** "Invalid token"
- JWT secret must match in both frontend and backend
- Check token hasn't expired
- Verify Supabase URL is correct

**Issue:** "Permission denied"
- User must have assigned role
- Role must have required permission
- Check database tables: user_roles, role_permissions

### Database Issues

**Issue:** "Table does not exist"
- Ensure migrations were run in correct order
- Check Supabase SQL Editor for errors
- Verify table names are lowercase

**Issue:** "Row Level Security block"
- Disable RLS for testing (not production!)
- Check policy definitions
- Verify user authentication

## Debug Tips

### Enable Verbose Logging

**Backend:**
\`\`\`env
LOG_LEVEL=DEBUG
\`\`\`

**Frontend:**
Check browser console (F12)

### Test API Directly
\`\`\`bash
curl http://localhost:8000/api/v1/health
\`\`\`

### Check Database
Use Supabase Table Editor to verify data

### Clear Cache
\`\`\`bash
# Frontend
rm -rf .next

# Backend
find . -type d -name __pycache__ -exec rm -r {} +
\`\`\`

## Getting Help

1. Check error messages carefully
2. Search existing GitHub issues
3. Review documentation
4. Ask in community forums
5. Create detailed bug report

## Performance Issues

**Slow API responses:**
- Add database indexes
- Implement caching
- Optimize queries

**Slow page loads:**
- Enable Next.js Image optimization
- Implement code splitting
- Use React.memo for expensive components
    `
  },
  {
    id: 'best-practices',
    title: 'Best Practices',
    icon: Package,
    description: 'Code quality and security guidelines',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    content: `
# Best Practices

## Security

### Never Commit Secrets
\`\`\`bash
# Add to .gitignore
.env
.env.local
*.key
*.pem
\`\`\`

### Use Environment Variables
\`\`\`typescript
// ❌ Bad
const apiKey = "sk_live_123abc"

// ✅ Good
const apiKey = process.env.API_KEY
\`\`\`

### Validate User Input
\`\`\`python
# ✅ Use Pydantic models
class UserCreate(BaseModel):
    email: EmailStr
    password: constr(min_length=8)
\`\`\`

### Implement Rate Limiting
\`\`\`python
from fastapi_limiter import FastAPILimiter

@app.get("/api/endpoint")
@limiter.limit("100/minute")
async def endpoint():
    pass
\`\`\`

## Code Quality

### Use TypeScript Strictly
\`\`\`json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true
  }
}
\`\`\`

### Write Meaningful Names
\`\`\`typescript
// ❌ Bad
const u = await getUserById(id)
const d = new Date()

// ✅ Good
const user = await getUserById(id)
const createdAt = new Date()
\`\`\`

### Keep Functions Small
\`\`\`typescript
// ✅ Single responsibility
async function validateUser(email: string) {
  // Only validation logic
}

async function createUser(data: UserData) {
  // Only creation logic
}
\`\`\`

## Performance

### Use Async/Await
\`\`\`python
# ✅ Non-blocking
async def get_users():
    return await db.fetch_all()
\`\`\`

### Optimize Database Queries
\`\`\`sql
-- ✅ Add indexes
CREATE INDEX idx_user_email ON profiles(email);
\`\`\`

### Cache Static Data
\`\`\`typescript
// ✅ Cache roles/permissions
const roles = useMemo(() => fetchRoles(), [])
\`\`\`

## Testing

### Write Unit Tests
\`\`\`python
def test_user_creation():
    user = create_user({"email": "test@example.com"})
    assert user.email == "test@example.com"
\`\`\`

### Test Edge Cases
\`\`\`typescript
// Test invalid inputs
expect(() => validateEmail("invalid")).toThrow()
expect(() => validateEmail("")).toThrow()
\`\`\`

## Git Workflow

### Commit Messages
\`\`\`
feat: Add user profile endpoint
fix: Resolve authentication token expiry
docs: Update API documentation
\`\`\`

### Branch Naming
\`\`\`
feature/user-profiles
bugfix/auth-token-expiry
hotfix/security-vulnerability
\`\`\`

## Documentation

### Comment Complex Logic
\`\`\`python
# Calculate user permissions based on roles and overrides
# 1. Get base permissions from roles
# 2. Apply user-specific overrides
# 3. Return merged permission set
\`\`\`

### Keep README Updated
Document all setup steps, environment variables, and deployment procedures.
    `
  }
]

export default function DocumentationPage() {
  return (
    <PermissionGuard permission="system.docs">
      <DocumentationPageContent />
    </PermissionGuard>
  )
}

function DocumentationPageContent() {
  const [selectedDoc, setSelectedDoc] = useState(documentationSections[0])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BookOpen className="h-8 w-8 text-[#1E4DD8]" />
          Documentation
        </h1>
        <p className="text-muted-foreground mt-2">
          Everything you need to build with Venus Chicken
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Topics</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <nav className="space-y-1">
                {documentationSections.map((section) => {
                  const Icon = section.icon
                  return (
                    <button
                      key={section.id}
                      onClick={() => setSelectedDoc(section)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors',
                        selectedDoc.id === section.id
                          ? 'bg-[#1E4DD8] text-white'
                          : 'hover:bg-gray-100 text-gray-700'
                      )}
                    >
                      <Icon className={cn(
                        'h-5 w-5',
                        selectedDoc.id === section.id ? 'text-white' : section.color
                      )} />
                      <span className="font-medium text-left">{section.title}</span>
                    </button>
                  )
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <Card className={cn('border-2', selectedDoc.borderColor)}>
            <CardHeader className={cn(selectedDoc.bgColor)}>
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = selectedDoc.icon
                  return <Icon className={cn('h-6 w-6', selectedDoc.color)} />
                })()}
                <div>
                  <CardTitle className="text-2xl">{selectedDoc.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {selectedDoc.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                  {selectedDoc.content}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
