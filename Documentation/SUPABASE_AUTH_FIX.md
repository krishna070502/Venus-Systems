# =============================================================================
# SUPABASE AUTH TROUBLESHOOTING GUIDE
# =============================================================================

This guide will help you fix the "500 Internal Server Error" from Supabase Auth.

## Common Causes:

### 1. Email Confirmation Required (Most Common)
By default, Supabase requires email confirmation for new signups.

**Fix in Supabase Dashboard:**
1. Go to: https://supabase.com/dashboard/project/rwbrcenqafknsqvxgvqq
2. Navigate to: **Authentication** → **Providers** → **Email**
3. Find: **"Confirm email"** setting
4. DISABLE: "Confirm email" (toggle it OFF for development)
5. Click **Save**

### 2. Check Email Provider Settings
1. In Supabase Dashboard → **Authentication** → **Providers**
2. Ensure **Email** provider is ENABLED
3. For development, you can disable email confirmation

### 3. Check Auto-Confirm New Users (Alternative)
1. Go to: **Authentication** → **Settings**
2. Find: **"Email Confirmations"** section
3. Enable: **"Auto Confirm Users"** (for development only)

### 4. Database Trigger Issues
The error might be caused by the `handle_new_user()` trigger.

**Run this in Supabase SQL Editor to check:**

```sql
-- Check if trigger exists and is working
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table, 
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Check if the function exists
SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'handle_new_user';

-- Test the profiles table
SELECT count(*) FROM public.profiles;
```

### 5. Disable Email Rate Limiting (Development)
1. Go to: **Authentication** → **Rate Limits**
2. Temporarily increase or disable rate limits for development

### 6. Check Auth Logs
1. Go to: **Authentication** → **Logs**
2. Look for recent failed authentication attempts
3. Check the error message details

## Quick Fix (Recommended for Development):

Run this SQL in Supabase SQL Editor to auto-confirm users:

```sql
-- Auto-confirm all new signups (DEVELOPMENT ONLY)
ALTER DATABASE postgres SET "app.settings.auth.confirm_email" TO 'false';

-- Or update your Supabase project settings via Dashboard:
-- Authentication → Email → Disable "Confirm email"
```

## Test Your Fix:

After making changes, try to sign up with a new email address:
1. Clear browser cache/cookies
2. Try signing up again
3. Check Supabase Dashboard → Authentication → Users to see if user was created

## If Still Not Working:

1. Check browser console for detailed error messages
2. Check Supabase Dashboard → **Logs** → **Auth Logs**
3. Ensure the `handle_new_user()` trigger is not failing
4. Try creating a user directly in Supabase Dashboard to test

## For Production:

⚠️ **Important**: Re-enable email confirmation before going to production!
1. Enable "Confirm email" in Email provider settings
2. Configure SMTP settings for email delivery
3. Set up email templates
