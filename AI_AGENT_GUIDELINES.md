# AI Agent Guidelines for Venus Chicken Development

## 🤖 CRITICAL INSTRUCTIONS FOR AI AGENTS

This document contains **MANDATORY** guidelines for AI agents working on Venus Chicken. Follow these rules **STRICTLY** to maintain system integrity and security.

---

## 📖 RULE 0: READ ALL DOCUMENTATION FIRST

**⚠️ BEFORE MAKING ANY CHANGES:**

1. **READ** the `/Documentation/` folder - Contains 15+ comprehensive guides
2. **READ** `README.md` - Project overview, setup, and common tasks
3. **READ** `CHANGELOG.md` - Recent changes and version history
4. **READ** this file (`AI_AGENT_GUIDELINES.md`) - Complete guidelines

**Why this matters:**
- Prevents breaking existing functionality
- Ensures consistency with established patterns
- Avoids duplicate implementations
- Maintains security standards
- Preserves permission system integrity

**Key Documentation Files:**
- `Documentation/PERMISSION_SYSTEM.md` - Complete RBAC implementation
- `Documentation/AUTHENTICATION.md` - Auth system and JWT
- `Documentation/DATABASE_SCHEMA.md` - Database structure and migrations
- `Documentation/UI_COMPONENTS.md` - All UI components and usage
- `Documentation/GETTING_STARTED.md` - Setup and quick start

**❌ DO NOT:**
- Skip reading documentation
- Assume you know the architecture
- Implement features without checking existing patterns
- Make changes without understanding the current system

**✅ ALWAYS:**
- Review relevant documentation before coding
- Check existing implementations for similar features
- Follow established naming conventions and patterns
- Update documentation after making changes

---

## 🔒 PERMISSION SYSTEM - MANDATORY RULES

### Rule 1: EVERY New Page MUST Have Permission Control

**⚠️ CRITICAL:** When creating ANY new page in the admin section, you **MUST**:

1. **Wrap the page component with `PermissionGuard`**
   ```typescript
   import { PermissionGuard } from '@/components/admin/PermissionGuard'
   
   export default function NewPage() {
     return (
       <PermissionGuard permission="resource.action">
         <NewPageContent />
       </PermissionGuard>
     )
   }
   ```

2. **Add permission to Sidebar navigation**
   ```typescript
   // In frontend/components/admin/Sidebar.tsx
   { 
     name: 'New Page', 
     href: '/admin/newpage', 
     icon: IconName, 
     permission: 'resource.action' 
   }
   ```

3. **Create database migration**
   ```sql
   -- supabase/migrations/XXX_add_newpage_permission.sql
   INSERT INTO permissions (key, description)
   VALUES ('resource.action', 'Description of permission')
   ON CONFLICT (key) DO NOTHING;
   
   -- Assign to appropriate roles
   INSERT INTO role_permissions (role_id, permission_id)
   SELECT r.id, p.id
   FROM roles r
   CROSS JOIN permissions p
   WHERE r.name = 'Admin' AND p.key = 'resource.action'
   ON CONFLICT (role_id, permission_id) DO NOTHING;
   ```

4. **Add backend endpoint protection** (if applicable)
   ```python
   from app.dependencies.rbac import require_permission
   
   @router.get("/endpoint")
   async def get_data(
       current_user: dict = Depends(require_permission(["resource.action"]))
   ):
       # endpoint logic
   ```

5. **Update documentation**
   - Add to `Documentation/PERMISSION_SYSTEM.md`
   - Add to `README.md` permission examples
   - Update `CHANGELOG.md` with version bump

### Rule 2: Permission Naming Convention

**Format:** `<resource>.<action>` or `<category>.<resource>.<action>`

**Examples:**
- ✅ `users.read`, `users.write`, `users.delete`
- ✅ `systemdashboard.view`, `businessdashboard.view`
- ✅ `systemadministration.view` (controls entire admin section)
- ✅ `reports.view`, `reports.export`
- ✅ `system.admin`, `system.logs`, `system.docs`
- ❌ `read_users` (wrong format)
- ❌ `UserRead` (wrong format)

### Rule 3: Never Skip Permission Checks

- ❌ **NEVER** create public admin pages (without PermissionGuard)
- ❌ **NEVER** add navigation items without permission field
- ❌ **NEVER** create backend endpoints without `require_permission`
- ✅ **ALWAYS** protect both frontend AND backend
- ✅ **ALWAYS** use principle of least privilege

### Rule 4: Dynamic Feature Display Pattern

**When adding new pages with permissions**, update the featureMap to show them in the landing page:

**File:** `frontend/app/admin/page.tsx`

```typescript
const featureMap: Record<string, {
  name: string
  description: string
  href: string
  icon: any
}> = {
  // Existing mappings...
  
  // Add new permission mapping
  'reports.view': {
    name: 'Reports',
    description: 'View analytics and reports',
    href: '/admin/reports',
    icon: FileBarChart  // Import from lucide-react
  }
}
```

**How it works:**
- The landing page automatically displays ALL user permissions
- Permissions in featureMap show as clickable feature cards with icons
- Permissions NOT in featureMap show in "Additional Permissions" section as badges
- **No code changes needed** for new permissions to appear - they show automatically
- Only add to featureMap when you create the actual UI page/feature

**Benefits:**
- ✅ Scalable - New permissions appear automatically
- ✅ Complete - Shows all permissions, not just mapped ones
- ✅ User-friendly - Clear visual distinction between features and permissions
- ✅ Maintainable - Simple pattern to follow

---

## 🏗️ PROJECT ARCHITECTURE - CRITICAL PATTERNS

### Database Migrations

1. **Never skip migrations** - All schema changes MUST have migrations
2. **Sequential naming** - Use format `XXX_description.sql` where XXX is next number
3. **Idempotent operations** - Always use `ON CONFLICT DO NOTHING` or similar
4. **Test migrations** - Verify they run without errors

### Frontend Structure

1. **Page Components**
   - Main export wrapped in PermissionGuard
   - Content in separate component (e.g., `PageNameContent`)
   - Use `PageLoading` component for loading states
   - Handle errors with `useAlert` hook

2. **API Calls**
   - Always use `api` client from `@/lib/api/client`
   - Handle errors in try-catch blocks
   - Show user-friendly error messages
   - Use TypeScript interfaces for responses

3. **State Management**
   - Use React hooks (useState, useEffect)
   - Extract permissions with `usePermissions()` hook
   - Check auth status with `useAuth()` hook

### Backend Structure

1. **Endpoint Protection**
   - Use `require_permission([list])` - note: pass as LIST not string
   - Import from `app.dependencies.rbac`
   - Place before route handler parameters

2. **Error Handling**
   - Return proper HTTP status codes
   - Use HTTPException for errors
   - Include meaningful error messages

3. **Database Queries**
   - Use parameterized queries (prevent SQL injection)
   - Handle connection errors gracefully
   - Use transactions for multi-step operations

---

## 📝 DOCUMENTATION - MANDATORY UPDATES

### When Adding Features

**MUST UPDATE:**
1. `CHANGELOG.md` - Add version entry with changes
2. `README.md` - Update relevant sections
3. `Documentation/PERMISSION_SYSTEM.md` - If adding permissions
4. `Documentation/UI_COMPONENTS.md` - If adding UI components
5. `Documentation/AUTHENTICATION.md` - If touching auth

### Documentation Standards

- Use clear, concise language
- Include code examples
- Update table of contents
- Add visual diagrams where helpful
- Keep consistent formatting

---

## 🔐 SECURITY - NON-NEGOTIABLE RULES

### Authentication & Authorization

1. **NEVER** bypass authentication checks
2. **NEVER** trust client-side permission checks alone
3. **ALWAYS** validate on backend
4. **ALWAYS** use JWT tokens for auth
5. **NEVER** expose sensitive data in error messages

### Data Protection

1. **NEVER** log passwords or tokens
2. **NEVER** commit `.env` files
3. **ALWAYS** sanitize user inputs
4. **ALWAYS** use environment variables for secrets
5. **NEVER** expose internal system details

### API Security

1. **ALWAYS** use HTTPS in production
2. **ALWAYS** validate request data
3. **ALWAYS** implement rate limiting
4. **ALWAYS** use CORS properly
5. **NEVER** allow arbitrary file uploads without validation

---

## 🎨 UI/UX CONSISTENCY

### Component Usage

1. **Use shadcn/ui components** - Don't create custom unless necessary
2. **Follow Venus Chicken branding** - Blue (#1E4DD8), Teal (#29C6D1)
3. **Consistent icons** - Use lucide-react
4. **Loading states** - Use `PageLoading` or `LoadingSpinner`
5. **Error handling** - Use `useAlert` for user feedback

### Styling

1. **Use Tailwind classes** - Avoid custom CSS
2. **Mobile-first** - Responsive design required
3. **Accessibility** - Use semantic HTML, ARIA labels
4. **Consistent spacing** - Follow existing patterns

---

## 🧪 TESTING REQUIREMENTS

### Before Committing

1. **Test locally** - Verify changes work
2. **Check console** - No errors or warnings
3. **Test permissions** - Verify access controls work
4. **Test API endpoints** - Use FastAPI /docs
5. **Run migrations** - Ensure they execute successfully

### Quality Checks

- ✅ TypeScript compiles without errors
- ✅ No ESLint warnings
- ✅ All imports resolve correctly
- ✅ No broken links in navigation
- ✅ Backend starts without errors

---

## 📦 DEPLOYMENT CONSIDERATIONS

### Environment Variables

**NEVER commit these files:**
- `.env`
- `.env.local`
- `.env.production`

**ALWAYS provide:**
- `.env.example` with dummy values
- Documentation of required variables

### Production Checklist

1. All migrations applied
2. Environment variables configured
3. CORS settings correct
4. Rate limiting enabled
5. Health checks working
6. Error logging configured

---

## 🚨 COMMON PITFALLS TO AVOID

### Permission System

- ❌ Using string instead of list: `require_permission("perm")` 
- ✅ Correct: `require_permission(["perm"])`

### Frontend

- ❌ Not checking `authLoading` before using permissions
- ❌ Forgetting to import PermissionGuard
- ❌ Creating pages without permission protection

### Backend

- ❌ Not handling database connection errors
- ❌ Missing error messages in exceptions
- ❌ Forgetting to add CORS for new endpoints

### Database

- ❌ Running migrations out of order
- ❌ Not using transactions for related operations
- ❌ Hardcoding IDs instead of using queries

---

## 📊 GIT WORKFLOW

### Commit Messages

**Format:** `<type>: <description>`

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `refactor:` - Code refactoring
- `security:` - Security updates
- `perf:` - Performance improvements

**Example:**
```
feat: Add inventory management with permissions

- Created inventory page with permission control
- Added inventory.read and inventory.write permissions
- Updated sidebar navigation
- Created migration 013_add_inventory_permissions.sql
- Updated documentation
```

### Before Pushing

1. Commit message follows format
2. All files staged (`git add -A`)
3. No sensitive data in commits
4. CHANGELOG.md updated
5. Documentation updated

---

## 🎯 PROJECT-SPECIFIC NOTES

### Venus Chicken Architecture

- **Frontend:** Next.js 14 App Router (not Pages Router)
- **Backend:** FastAPI with async/await
- **Database:** Supabase (PostgreSQL)
- **Auth:** JWT tokens with Supabase Auth
- **State:** React Context API (no Redux)

### Key Files

- `frontend/lib/auth/usePermissions.ts` - Permission hook
- `frontend/components/admin/PermissionGuard.tsx` - Route protection
- `backend/app/dependencies/rbac.py` - Backend permission checks
- `backend/app/services/role_service.py` - Permission retrieval

### Database Schema

- `profiles` - User profiles (linked to auth.users)
- `roles` - Role definitions
- `permissions` - Permission definitions
- `user_roles` - Many-to-many user-role mapping
- `role_permissions` - Many-to-many role-permission mapping
- `audit_logs` - System audit trail
- `user_sessions` - Active session tracking

---

## ✅ PRE-DEPLOYMENT CHECKLIST

Before marking work as complete:

- [ ] All new pages have permission protection
- [ ] Database migrations created and tested
- [ ] Backend endpoints protected
- [ ] Sidebar navigation updated
- [ ] Documentation updated (CHANGELOG, README, etc.)
- [ ] No console errors or warnings
- [ ] TypeScript compiles successfully
- [ ] Backend starts without errors
- [ ] Tested with different user roles
- [ ] Git commit message descriptive
- [ ] Changes pushed to GitHub

---

## 🆘 TROUBLESHOOTING GUIDE

### Permission Issues

**Problem:** User can't see navigation item
- Check if permission added to Sidebar
- Verify user has permission in database
- Check `usePermissions` hook is working

**Problem:** 403 Forbidden on API call
- Verify backend uses `require_permission([list])`
- Check user has permission assigned
- Verify JWT token is valid

### Build Errors

**Problem:** TypeScript errors
- Check all imports are correct
- Verify types match interfaces
- Run `npm run build` to see all errors

**Problem:** Module not found
- Check file path is correct
- Verify file exists
- Check imports use `@/` alias correctly

---

## 📞 IMPORTANT CONTACTS

**Project:** Venus Chicken - Enterprise SaaS Starter Kit  
**Repository:** https://github.com/krishna070502/Venus Chicken--App-Starter-Template  
**License:** Proprietary - All Rights Reserved  
**Documentation:** `/Documentation/` folder

---

## 🔄 VERSION HISTORY

- v1.8.0 (2025-11-26) - Added Purchases & Payables nested dropdown with 16 CRUD permissions
- v1.7.0 (2025-11-26) - Added Business dropdown and collapsible sidebar
- v1.6.0 (2025-11-26) - Added System Administration dropdown with systemadministration.view permission
- v1.5.0 (2025-11-26) - Added dynamic permission display system
- v1.2.0 (2025-11-26) - Added systemdashboard.view permission
- v1.1.0 (2025-11-26) - Added permission controls for docs, status, roles
- v1.0.0 (2025-11-26) - Initial release with complete RBAC system

---

**Last Updated:** 26 November 2025  
**Maintained By:** Venus Chicken Development Team

---

## ⚠️ FINAL WARNING

**Violating these guidelines can:**
- Create security vulnerabilities
- Break existing functionality
- Cause data inconsistencies
- Require emergency rollbacks
- Compromise user data

**When in doubt:**
1. Review existing code patterns
2. Check documentation
3. Test thoroughly
4. Ask for clarification

**Remember:** Security and consistency are more important than speed!
