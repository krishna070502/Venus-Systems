# Quick Start Guide

This guide will get you up and running in under 10 minutes.

## Step 1: Supabase Setup (3 minutes)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Wait for the database to initialize (~2 minutes)
4. Go to **SQL Editor** (left sidebar)
5. Click **New Query**
6. Copy and paste the content of `supabase/migrations/001_initial_schema.sql`
7. Click **Run**
8. Create another new query
9. Copy and paste the content of `supabase/migrations/002_seed_data.sql`
10. Click **Run**

## Step 2: Get Supabase Credentials (1 minute)

1. Go to **Settings** > **API**
2. Copy these values (keep this tab open):
   - Project URL
   - anon/public key
   - service_role key
3. Scroll down to **JWT Settings**
4. Copy the JWT Secret

## Step 3: Backend Setup (2 minutes)

```bash
# Navigate to backend
cd backend

# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate  # Mac/Linux
# OR
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Edit .env with your favorite editor
nano .env  # or code .env, vim .env, etc.
```

**Paste your Supabase credentials into `.env`:**
```env
SUPABASE_URL=your-project-url-here
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_JWT_SECRET=your-jwt-secret-here
```

**Start the backend:**
```bash
python -m uvicorn app.main:app --reload
```

✅ Backend running at http://localhost:8000

## Step 4: Frontend Setup (2 minutes)

**Open a NEW terminal window:**

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local
nano .env.local  # or your preferred editor
```

**Paste your Supabase credentials:**
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Start the frontend:**
```bash
npm run dev
```

✅ Frontend running at http://localhost:3000

## Step 5: Create Admin Account (1 minute)

1. Open http://localhost:3000/auth/signup
2. Create an account with your email
3. Go to Supabase dashboard > **SQL Editor**
4. Run this query (replace with your email):

```sql
-- Get your user ID
SELECT id, email FROM profiles WHERE email = 'your-email@example.com';

-- Assign Admin role (copy the user ID from above)
INSERT INTO user_roles (user_id, role_id)
VALUES ('paste-user-id-here', 1);
```

## Step 6: Access Admin Panel

1. Go to http://localhost:3000/auth/login
2. Sign in with your credentials
3. You'll be redirected to http://localhost:3000/admin

🎉 **You're all set!**

## What to Explore

- **Dashboard**: Overview of your system
- **Users**: Manage user accounts
- **Roles**: Configure role-based access
- **Permissions**: Fine-grained access control
- **Settings**: System configuration
- **Logs**: View system activity

## API Documentation

Visit http://localhost:8000/docs to see all available API endpoints and test them interactively.

## Need Help?

- Check `README.md` for detailed documentation
- Backend errors? Check the terminal running the backend
- Frontend errors? Check the browser console (F12)
- Database issues? Check Supabase dashboard > Logs

## Common Issues

**"Connection refused" errors:**
- Make sure both backend and frontend are running
- Check that ports 3000 and 8000 are not in use

**"Invalid credentials":**
- Verify Supabase credentials in `.env` and `.env.local`
- Make sure they match exactly (no extra spaces)

**"Permission denied":**
- Make sure you ran the SQL query to assign Admin role
- Try logging out and back in

---

Happy building! 🚀
