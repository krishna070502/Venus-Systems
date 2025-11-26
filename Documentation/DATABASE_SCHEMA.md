# Database Schema Documentation

## Overview

CoreDesk uses PostgreSQL via Supabase for data storage. This document covers the complete database schema, relationships, triggers, and functions.

---

## Table of Contents

1. [Schema Diagram](#schema-diagram)
2. [Tables](#tables)
3. [Relationships](#relationships)
4. [Triggers](#triggers)
5. [Functions](#functions)
6. [Migrations](#migrations)

---

## Schema Diagram

```
┌──────────────────┐
│   auth.users     │ (Supabase Auth)
│                  │
│  - id (UUID)     │
│  - email         │
│  - created_at    │
└────────┬─────────┘
         │
         │ 1:1
         │
         ▼
┌──────────────────┐       ┌──────────────────┐
│    profiles      │       │  user_sessions   │
│                  │       │                  │
│  - id (UUID) PK  │       │  - id (UUID) PK  │
│  - email         │       │  - user_id FK    │
│  - full_name     │       │  - created_at    │
│  - avatar_url    │       │  - last_activity │
│  - created_at    │       │  - ip_address    │
│  - last_sign_in  │       │  - user_agent    │
└────────┬─────────┘       └──────────────────┘
         │
         │ M:N (via user_roles)
         │
         ▼
┌──────────────────┐       ┌──────────────────┐
│   user_roles     │       │      roles       │
│                  │       │                  │
│  - user_id FK    │◄─────►│  - id (INT) PK   │
│  - role_id FK    │       │  - name UNIQUE   │
│  - assigned_at   │       │  - description   │
└──────────────────┘       │  - created_at    │
                           └────────┬─────────┘
                                    │
                                    │ M:N (via role_permissions)
                                    │
                                    ▼
                           ┌──────────────────┐       ┌──────────────────┐
                           │ role_permissions │       │   permissions    │
                           │                  │       │                  │
                           │  - role_id FK    │◄─────►│  - id (INT) PK   │
                           │  - permission_id │       │  - key UNIQUE    │
                           │  - assigned_at   │       │  - description   │
                           └──────────────────┘       │  - created_at    │
                                                      └──────────────────┘

┌──────────────────┐
│   audit_logs     │
│                  │
│  - id (INT) PK   │
│  - user_id FK    │
│  - action        │
│  - resource_type │
│  - resource_id   │
│  - changes JSONB │
│  - metadata JSONB│
│  - timestamp     │
└──────────────────┘
```

---

## Tables

### auth.users (Supabase Managed)

User authentication data managed by Supabase Auth.

```sql
-- Managed by Supabase, not directly editable
id              UUID PRIMARY KEY
email           VARCHAR UNIQUE
encrypted_password VARCHAR
created_at      TIMESTAMP
updated_at      TIMESTAMP
raw_user_meta_data JSONB
```

**Key Fields:**
- `id`: Unique user identifier
- `email`: User email (login credential)
- `raw_user_meta_data`: Custom data like `full_name`

---

### profiles

User profile information (1:1 with auth.users).

```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR NOT NULL,
    full_name VARCHAR,
    avatar_url VARCHAR,
    created_at TIMESTAMP DEFAULT NOW(),
    last_sign_in_at TIMESTAMP
);
```

**Fields:**
- `id`: User ID (references auth.users.id)
- `email`: User email (synced from auth.users)
- `full_name`: User's display name
- `avatar_url`: Profile picture URL
- `created_at`: Profile creation timestamp
- `last_sign_in_at`: Last login timestamp

**Indexes:**
```sql
CREATE INDEX idx_profiles_email ON profiles(email);
```

**Migration:** `001_initial_schema.sql`, `006_add_last_sign_in_to_profiles.sql`

---

### roles

Role definitions for RBAC system.

```sql
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Fields:**
- `id`: Auto-incrementing role ID
- `name`: Unique role name (e.g., "Admin", "Manager", "User")
- `description`: Human-readable description
- `created_at`: Creation timestamp

**Default Roles:**
```sql
-- From 002_seed_data.sql
INSERT INTO roles (name, description) VALUES
  ('Admin', 'Full system access with all permissions'),
  ('Manager', 'Can manage users and view reports'),
  ('User', 'Standard user with basic access');
```

**Migration:** `001_initial_schema.sql`, `002_seed_data.sql`

---

### permissions

Permission definitions for RBAC system.

```sql
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Fields:**
- `id`: Auto-incrementing permission ID
- `key`: Unique permission identifier (e.g., "users.read")
- `description`: Human-readable description
- `created_at`: Creation timestamp

**Naming Convention:**
`<resource>.<action>`

**Default Permissions:**
```sql
-- From 002_seed_data.sql
INSERT INTO permissions (key, description) VALUES
  ('users.read', 'View users'),
  ('users.write', 'Create and update users'),
  ('users.delete', 'Delete users'),
  ('roles.read', 'View roles'),
  ('roles.write', 'Create and update roles'),
  ('permissions.read', 'View permissions'),
  ('system.settings', 'Access system settings'),
  ('system.logs', 'View system logs'),
  ('system.admin', 'Access admin panel');
```

**Migration:** `001_initial_schema.sql`, `002_seed_data.sql`

---

### user_roles

Maps users to roles (many-to-many).

```sql
CREATE TABLE user_roles (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);
```

**Fields:**
- `user_id`: User ID (references auth.users.id)
- `role_id`: Role ID (references roles.id)
- `assigned_at`: When role was assigned
- Composite primary key prevents duplicate assignments

**Indexes:**
```sql
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
```

**Migration:** `001_initial_schema.sql`

---

### role_permissions

Maps roles to permissions (many-to-many).

```sql
CREATE TABLE role_permissions (
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);
```

**Fields:**
- `role_id`: Role ID (references roles.id)
- `permission_id`: Permission ID (references permissions.id)
- `assigned_at`: When permission was assigned
- Composite primary key prevents duplicate assignments

**Indexes:**
```sql
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);
```

**Migration:** `001_initial_schema.sql`

---

### audit_logs

Tracks all system changes for compliance and auditing.

```sql
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    changes JSONB,
    metadata JSONB,
    timestamp TIMESTAMP DEFAULT NOW()
);
```

**Fields:**
- `id`: Auto-incrementing log ID
- `user_id`: User who performed action (nullable if user deleted)
- `action`: Action performed (e.g., "CREATE", "UPDATE", "DELETE")
- `resource_type`: Type of resource (e.g., "user", "role", "permission")
- `resource_id`: ID of the affected resource
- `changes`: JSONB of before/after values
- `metadata`: Additional context (IP, user agent, etc.)
- `timestamp`: When action occurred

**Indexes:**
```sql
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
```

**Example Log Entry:**
```json
{
  "id": 123,
  "user_id": "uuid-here",
  "action": "UPDATE",
  "resource_type": "user",
  "resource_id": "user-uuid",
  "changes": {
    "before": {"full_name": "John Doe"},
    "after": {"full_name": "Jane Doe"}
  },
  "metadata": {
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0..."
  },
  "timestamp": "2025-11-26T10:30:00Z"
}
```

**Migration:** `003_audit_logs.sql`

---

### user_sessions

Tracks active user sessions.

```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_activity TIMESTAMP DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT
);
```

**Fields:**
- `id`: Unique session ID
- `user_id`: User who owns the session
- `created_at`: When session started
- `last_activity`: Last request timestamp
- `ip_address`: Client IP address
- `user_agent`: Client browser/app info

**Indexes:**
```sql
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_activity ON user_sessions(last_activity DESC);
```

**Migration:** `007_create_user_sessions_table.sql`

---

## Relationships

### One-to-One

**auth.users ↔ profiles**
- Each user has exactly one profile
- Profile created automatically via trigger on user signup
- Profile deleted when user deleted (CASCADE)

### One-to-Many

**auth.users → audit_logs**
- User can have many audit log entries
- User deletion sets user_id to NULL in logs (SET NULL)

**auth.users → user_sessions**
- User can have multiple sessions
- Sessions deleted when user deleted (CASCADE)

### Many-to-Many

**users ↔ roles** (via user_roles)
- User can have multiple roles
- Role can be assigned to multiple users
- Junction table: `user_roles`

**roles ↔ permissions** (via role_permissions)
- Role can have multiple permissions
- Permission can belong to multiple roles
- Junction table: `role_permissions`

---

## Triggers

### handle_new_user()

Auto-creates user profile when new user signs up.

**File:** `supabase/migrations/004_auto_create_profile.sql`

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name'
    );
    
    -- Assign default "User" role
    INSERT INTO public.user_roles (user_id, role_id)
    SELECT NEW.id, id FROM public.roles WHERE name = 'User'
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Triggered by:** New user signup

**Actions:**
1. Creates profile in `profiles` table
2. Copies email from `auth.users`
3. Copies full_name from user metadata
4. Assigns default "User" role

### update_last_sign_in()

Updates last sign-in timestamp on login.

**File:** `supabase/migrations/006_add_last_sign_in_to_profiles.sql`

```sql
CREATE OR REPLACE FUNCTION public.update_last_sign_in()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.profiles
    SET last_sign_in_at = NEW.last_sign_in_at
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_sign_in
    AFTER UPDATE OF last_sign_in_at ON auth.users
    FOR EACH ROW
    WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
    EXECUTE FUNCTION public.update_last_sign_in();
```

**Triggered by:** User login (updates `auth.users.last_sign_in_at`)

**Actions:**
1. Updates `profiles.last_sign_in_at` to match auth table

---

## Functions

### get_user_permissions(user_id UUID)

Returns all permissions for a user through their roles.

**File:** `supabase/migrations/001_initial_schema.sql`

```sql
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_id UUID)
RETURNS TABLE(permission_key VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.key
    FROM permissions p
    INNER JOIN role_permissions rp ON p.id = rp.permission_id
    INNER JOIN user_roles ur ON rp.role_id = ur.role_id
    WHERE ur.user_id = $1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Usage:**
```sql
-- Get all permissions for user
SELECT * FROM get_user_permissions('user-uuid-here');

-- Example result:
-- permission_key
-- --------------
-- users.read
-- users.write
-- roles.read
-- system.logs
```

**Called by:**
- Backend: `RoleService.get_user_permissions()`
- API: `/users/me` endpoint

---

## Migrations

### Migration Files

Located in: `supabase/migrations/`

#### 001_initial_schema.sql
- Creates core tables: profiles, roles, permissions, user_roles, role_permissions
- Creates `get_user_permissions()` function
- Sets up indexes

#### 002_seed_data.sql
- Seeds default roles (Admin, Manager, User)
- Seeds default permissions
- Creates role-permission mappings

#### 003_audit_logs.sql
- Creates audit_logs table
- Sets up indexes for fast querying

#### 004_auto_create_profile.sql
- Creates `handle_new_user()` trigger function
- Sets up trigger on auth.users INSERT

#### 005_FIX-AUTH-TRIGGER.sql
- Fixes profile creation trigger issues
- Ensures proper error handling

#### 006_add_last_sign_in_to_profiles.sql
- Adds last_sign_in_at column to profiles
- Creates trigger to sync from auth.users

#### 007_create_user_sessions_table.sql
- Creates user_sessions table
- Sets up session tracking

#### 008_FIX-AUDIT-AND-LOGIN.sql
- Fixes audit logging trigger
- Improves login tracking

#### 009_RESTORE-PROPER-TRIGGERS.sql
- Restores and validates all triggers
- Ensures data consistency

#### 010_add_test_permission.sql
- Adds test.run permission
- Assigns to Admin role

### Running Migrations

**Local Development:**
```bash
# Using Supabase CLI
supabase migration up

# Or apply specific migration
supabase db push supabase/migrations/001_initial_schema.sql
```

**Production:**
1. Supabase Dashboard → SQL Editor
2. Paste migration content
3. Run query

---

## Best Practices

### 1. Always Use Transactions

```sql
BEGIN;

-- Your changes here
INSERT INTO roles (name) VALUES ('New Role');
INSERT INTO permissions (key) VALUES ('new.permission');

COMMIT;
-- ROLLBACK; if error
```

### 2. Use Indexes for Performance

```sql
-- Index foreign keys
CREATE INDEX idx_user_roles_user ON user_roles(user_id);

-- Index frequently queried columns
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- Index JSONB fields if querying inside
CREATE INDEX idx_audit_logs_metadata_ip ON audit_logs((metadata->>'ip_address'));
```

### 3. Use ON DELETE Actions Appropriately

```sql
-- CASCADE: Delete related records
user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE

-- SET NULL: Keep record but clear reference
user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL

-- RESTRICT: Prevent deletion if references exist
role_id INT REFERENCES roles(id) ON DELETE RESTRICT
```

### 4. Validate with Constraints

```sql
-- Unique constraints
name VARCHAR UNIQUE NOT NULL

-- Check constraints
age INTEGER CHECK (age >= 0)

-- Not null constraints
email VARCHAR NOT NULL
```

### 5. Use JSONB for Flexible Data

```sql
-- Good for metadata, settings, dynamic fields
metadata JSONB

-- Query JSONB
SELECT * FROM audit_logs 
WHERE metadata->>'ip_address' = '192.168.1.1';

-- Update JSONB
UPDATE profiles 
SET metadata = metadata || '{"theme": "dark"}'::jsonb
WHERE id = 'user-id';
```

---

## Common Queries

### Get User with Roles and Permissions

```sql
SELECT 
    p.id,
    p.email,
    p.full_name,
    array_agg(DISTINCT r.name) as roles,
    array_agg(DISTINCT perm.key) as permissions
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions perm ON rp.permission_id = perm.id
WHERE p.id = 'user-uuid'
GROUP BY p.id, p.email, p.full_name;
```

### Get All Users in a Role

```sql
SELECT p.*
FROM profiles p
INNER JOIN user_roles ur ON p.id = ur.user_id
INNER JOIN roles r ON ur.role_id = r.id
WHERE r.name = 'Admin';
```

### Get All Permissions for a Role

```sql
SELECT perm.*
FROM permissions perm
INNER JOIN role_permissions rp ON perm.id = rp.permission_id
WHERE rp.role_id = 1;
```

### Get Audit Logs for User

```sql
SELECT 
    al.*,
    p.full_name as user_name
FROM audit_logs al
LEFT JOIN profiles p ON al.user_id = p.id
WHERE al.user_id = 'user-uuid'
ORDER BY al.timestamp DESC
LIMIT 50;
```

### Get Active Sessions

```sql
SELECT 
    s.*,
    p.email,
    p.full_name
FROM user_sessions s
INNER JOIN profiles p ON s.user_id = p.id
WHERE s.last_activity > NOW() - INTERVAL '1 hour'
ORDER BY s.last_activity DESC;
```

---

## Backup and Recovery

### Backup Database

```bash
# Using Supabase CLI
supabase db dump -f backup.sql

# Or via pg_dump
pg_dump postgresql://user:pass@host:5432/db > backup.sql
```

### Restore Database

```bash
# Using psql
psql postgresql://user:pass@host:5432/db < backup.sql

# Or via Supabase
supabase db reset --from backup.sql
```

---

## File Locations

- **Migrations:** `supabase/migrations/*.sql`
- **Seed Data:** `supabase/migrations/002_seed_data.sql`
- **Triggers:** `004_auto_create_profile.sql`, `006_add_last_sign_in_to_profiles.sql`
- **Functions:** `001_initial_schema.sql` (get_user_permissions)

---

## Related Documentation

- [Permission System](./PERMISSION_SYSTEM.md)
- [Authentication](./AUTHENTICATION.md)
- [API Reference](./API_REFERENCE.md)
