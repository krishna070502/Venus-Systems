# Database Setup - CRITICAL STEP

**⚠️ You MUST run these SQL migrations in Supabase before the app will work!**

## Quick Setup (5 minutes)

### Step 1: Access Supabase SQL Editor

1. Go to: https://rwbrcenqafknsqvxgvqq.supabase.co
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run Schema Migration

Copy and paste the **ENTIRE contents** of this file into the SQL editor:
```
supabase/migrations/001_initial_schema.sql
```

Click **Run** or press `Cmd/Ctrl + Enter`

You should see: **Success. No rows returned**

### Step 3: Run Seed Data

Click **New Query** again

Copy and paste the **ENTIRE contents** of this file:
```
supabase/migrations/002_seed_data.sql
```

Click **Run**

You should see: **Success** with messages about roles and permissions being inserted

### Step 4: Verify Tables Were Created

Run this query to check:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see these tables:
- `profiles`
- `roles`
- `permissions`
- `role_permissions`
- `user_roles`

### Step 5: Check Seed Data

```sql
-- Check roles
SELECT * FROM roles;

-- Check permissions  
SELECT COUNT(*) FROM permissions;
```

You should see:
- 3 roles: Admin (id=1), Manager (id=2), User (id=3)
- 15 permissions

---

## ⚠️ Without these migrations, the app WILL NOT WORK:
- ❌ Cannot create users
- ❌ Cannot create roles
- ❌ Cannot assign permissions
- ❌ All API calls will fail

## After Running Migrations:

1. Refresh your browser at http://localhost:3001
2. Go to signup page and create an account
3. Then run this query to make yourself an admin:

```sql
-- Get your user ID
SELECT id, email FROM profiles WHERE email = 'your-email@example.com';

-- Copy the user ID and paste it here:
INSERT INTO user_roles (user_id, role_id)
VALUES ('paste-your-user-id-here', 1);
```

4. Logout and login again
5. You'll now have full admin access!

---

**Need help?** The SQL files are located at:
- `/Users/gopalsmac/Documents/Business-StarterKit/supabase/migrations/001_initial_schema.sql`
- `/Users/gopalsmac/Documents/Business-StarterKit/supabase/migrations/002_seed_data.sql`
