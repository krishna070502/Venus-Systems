# RLS Policies

Row Level Security (RLS) policies protect data at the database level.

## Overview

Supabase uses PostgreSQL RLS to enforce access control directly in the database, ensuring security even if API is bypassed.

## Enabled Tables

| Table | RLS Enabled | Policies |
|-------|-------------|----------|
| `profiles` | ✅ | Admin view all, users view own |
| `user_roles` | ✅ | Admin manage, users view own |
| `user_shops` | ✅ | Admin all, users own |
| `daily_shop_prices` | ✅ | Admin all, managers store-scoped |
| `app_activity_logs` | ✅ | Admin all, users own |
| `audit_logs` | ✅ | Admin view only |

---

## Policy Patterns

### Admin Full Access

```sql
CREATE POLICY admin_all_access ON public.table_name
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
        )
    );
```

### User Own Records

```sql
CREATE POLICY user_own_records ON public.table_name
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
```

### Store-Scoped Access

```sql
CREATE POLICY manager_store_access ON public.table_name
    FOR SELECT
    TO authenticated
    USING (
        store_id IN (
            SELECT us.shop_id 
            FROM public.user_shops us 
            WHERE us.user_id = auth.uid()
        )
    );
```

---

## Specific Policies

### profiles

```sql
-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY user_own_profile ON public.profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY user_update_own ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

-- Admins can view all profiles
CREATE POLICY admin_view_all_profiles ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
        )
    );
```

### user_shops

```sql
ALTER TABLE public.user_shops ENABLE ROW LEVEL SECURITY;

-- Admins can manage all assignments
CREATE POLICY admin_all_user_shops ON public.user_shops
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
        )
    );

-- Users can see their own assignments
CREATE POLICY user_own_shops ON public.user_shops
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
```

### daily_shop_prices

```sql
ALTER TABLE public.daily_shop_prices ENABLE ROW LEVEL SECURITY;

-- Admins can manage all prices
CREATE POLICY admin_all_daily_prices ON public.daily_shop_prices
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
        )
    );

-- Managers can view their store prices
CREATE POLICY manager_shop_prices ON public.daily_shop_prices
    FOR SELECT
    TO authenticated
    USING (
        shop_id IN (
            SELECT us.shop_id 
            FROM public.user_shops us 
            WHERE us.user_id = auth.uid()
        )
    );
```

### app_activity_logs

```sql
ALTER TABLE public.app_activity_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY admin_view_all_activity ON public.app_activity_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
        )
    );

-- Users can view their own activity
CREATE POLICY user_own_activity ON public.app_activity_logs
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
```

---

## Service Role Bypass

The backend uses the Supabase Service Role Key, which bypasses RLS:

```python
# This bypasses RLS - use carefully
supabase_client = create_client(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY  # Bypasses RLS
)
```

> ⚠️ **Important**: When using service role, ensure authorization is handled in application code.

---

## Testing Policies

### Check Policy Works

```sql
-- Set context
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "user-uuid-here"}';

-- Test query
SELECT * FROM public.profiles;
```

### List Policies on Table

```sql
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'profiles';
```

---

## Related Pages

- [[Database-Schema]] - Table structures
- [[RBAC-System]] - Application-level access control
- [[Migrations-Reference]] - RLS migration files
