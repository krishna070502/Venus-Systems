# 🔍 Comprehensive Audit Logging - Setup Instructions

Your SaaS starter kit now includes **enterprise-grade audit logging** that tracks **every single change** in the system.

## What Gets Logged

### ✅ Automatically Tracked:
- **Role Changes**: Name, description modifications (even 1 letter changes)
- **Permission Changes**: Any edit to permission keys or descriptions
- **User Profile Changes**: Name updates, email changes
- **Role Assignments**: When users get new roles
- **Permission Assignments**: When roles get new permissions
- **Deletions**: Complete record of what was deleted
- **Database Triggers**: Automatic logging at database level

### 📊 Information Captured:
- **Who**: User ID of person making the change
- **What**: Type of action (CREATE, UPDATE, DELETE, etc.)
- **When**: Precise timestamp
- **Where**: Resource type and ID
- **Before/After**: Exact values before and after change
- **Context**: Additional metadata about the change

## Setup Instructions

### 1. Run the Audit Log Migration

Go to your Supabase dashboard:
1. Navigate to https://rwbrcenqafknsqvxgvqq.supabase.co
2. Click **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `supabase/migrations/003_audit_logs.sql`
5. Click **Run**

You should see: **Success**

### 2. Verify Installation

Run this query to check:

```sql
-- Check if audit_logs table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'audit_logs';

-- Check if triggers are installed
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name LIKE 'audit%';
```

You should see:
- ✅ `audit_logs` table
- ✅ 5 triggers (`audit_roles_changes`, `audit_permissions_changes`, etc.)

### 3. Restart Backend

```bash
# The backend will automatically use the audit logging service
# Just restart if it's running:
cd backend
source venv/bin/activate
python -m uvicorn app.main:app --reload
```

### 4. Test It Out

1. Go to http://localhost:3001/admin/roles
2. Edit a role's description (change even 1 letter)
3. Go to http://localhost:3001/admin/logs
4. You'll see the exact change logged with before/after values!

## Example Log Entries

### Role Name Change:
```json
{
  "action": "UPDATE",
  "resource_type": "role",
  "resource_id": "1",
  "changes": {
    "name": {
      "before": "Admin",
      "after": "Administrator"
    }
  }
}
```

### Permission Assignment:
```json
{
  "action": "ASSIGN_PERMISSION",
  "resource_type": "role",
  "resource_id": "2",
  "changes": {
    "permission_id": 5
  },
  "metadata": {
    "role_name": "Manager"
  }
}
```

### User Profile Update:
```json
{
  "action": "UPDATE",
  "resource_type": "profiles",
  "changes": {
    "full_name": {
      "before": "John Do",
      "after": "John Doe"
    }
  }
}
```

## Viewing Logs

### In Admin Panel:
- Navigate to **Admin → Logs**
- See all changes in chronological order
- Click **View** to see full details
- Filter by action type, resource, or user

### In Database:
```sql
-- See all changes in last hour
SELECT * FROM audit_logs 
WHERE timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC;

-- See all role changes
SELECT * FROM audit_logs 
WHERE resource_type = 'role'
ORDER BY timestamp DESC;

-- See changes by specific user
SELECT * FROM audit_logs 
WHERE user_id = 'your-user-id'
ORDER BY timestamp DESC;

-- See what changed in a specific role
SELECT 
  timestamp,
  action,
  changes,
  metadata
FROM audit_logs 
WHERE resource_type = 'role' 
  AND resource_id = '1'
ORDER BY timestamp DESC;
```

## Features

✨ **Automatic Database Triggers**: Changes are logged even if made directly in database
🔒 **Secure**: Row-level security ensures users only see appropriate logs
📊 **Detailed**: Captures exact before/after values for every field
⚡ **Fast**: Indexed for quick queries
🎯 **Comprehensive**: Tracks roles, permissions, users, assignments
💾 **Persistent**: Never deleted, complete audit trail

## Security

- Admins can view all logs
- Regular users can only view their own actions
- Logs are immutable (can't be edited or deleted)
- Separate permissions for log viewing
- User IDs are tracked, not usernames (for security)

---

**🎉 You now have complete audit logging!**

Every change in your system is tracked. Even changing a single letter in a description will be logged with the exact before/after values.
