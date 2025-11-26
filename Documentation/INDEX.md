# Documentation Index

Welcome to CoreDesk documentation! This folder contains comprehensive guides for understanding and extending the application.

---

## 📚 Documentation Files

### 1. [Getting Started](./GETTING_STARTED.md)
**Start here if you're new to CoreDesk**

- Prerequisites and installation
- Quick start guide
- Project structure overview
- First login and setup
- Common issues and troubleshooting

**Covers:**
- Environment setup
- Running the application
- Creating your first admin user
- Development workflow

---

### 2. [Permission System](./PERMISSION_SYSTEM.md)
**Complete guide to Role-Based Access Control (RBAC)**

- Architecture and design
- Database schema for RBAC
- Backend permission enforcement
- Frontend permission checking
- Adding new permissions
- Protecting routes

**Key Topics:**
- `usePermissions()` hook
- `PermissionGuard` component
- `@require_permission` decorator
- Sidebar navigation filtering
- Managing roles and permissions via UI

**When to read:** Before adding protected features or customizing access control

---

### 3. [Authentication System](./AUTHENTICATION.md)
**JWT-based authentication with Supabase**

- Authentication flow diagrams
- User registration and login
- Session management
- Token handling
- Password reset
- Security best practices

**Key Topics:**
- `AuthProvider` context
- `useAuth()` hook
- Supabase integration
- Protected routes
- API authentication

**When to read:** When implementing auth features or understanding security

---

### 4. [UI Components](./UI_COMPONENTS.md)
**Complete reference for all UI components**

- Alert modal system
- Loading animations (4 variants)
- Admin components
- Form components
- Layout components

**Key Topics:**
- `useAlert()` hook for global modals
- `LoadingSpinner` with multiple variants
- `PermissionGuard` for route protection
- shadcn/ui component usage
- Custom animations

**When to read:** When building UI or customizing components

---

### 5. [Database Schema](./DATABASE_SCHEMA.md)
**PostgreSQL database structure and relationships**

- Complete schema diagrams
- Table definitions
- Relationships (1:1, 1:M, M:N)
- Triggers and functions
- Migration guide
- Common queries

**Key Topics:**
- User profiles and roles
- Permission mappings
- Audit logs
- User sessions
- Database best practices

**When to read:** When modifying database structure or understanding data flow

---

## 🔍 Quick Reference

### For New Developers

**Read in this order:**
1. [Getting Started](./GETTING_STARTED.md) - Set up environment
2. [Permission System](./PERMISSION_SYSTEM.md) - Understand access control
3. [UI Components](./UI_COMPONENTS.md) - Learn component library

### For Adding Features

**Creating a new protected page:**
1. [Permission System](./PERMISSION_SYSTEM.md#adding-new-permissions) - Add permission
2. [UI Components](./UI_COMPONENTS.md#permissionguard) - Use PermissionGuard
3. [Database Schema](./DATABASE_SCHEMA.md#permissions) - Update schema if needed

**Customizing authentication:**
1. [Authentication](./AUTHENTICATION.md) - Understand auth flow
2. [Database Schema](./DATABASE_SCHEMA.md#auth-users) - User table structure

**Adding UI components:**
1. [UI Components](./UI_COMPONENTS.md) - Available components
2. [Getting Started](./GETTING_STARTED.md#4-configure-branding) - Branding guide

### For Troubleshooting

**Permission issues:**
- [Permission System](./PERMISSION_SYSTEM.md#troubleshooting)

**Authentication errors:**
- [Authentication](./AUTHENTICATION.md#troubleshooting)

**Database problems:**
- [Database Schema](./DATABASE_SCHEMA.md#best-practices)

**General issues:**
- [Getting Started](./GETTING_STARTED.md#common-issues)

---

## 📖 Documentation by Topic

### Frontend

| Topic | Document | Section |
|-------|----------|---------|
| React Components | [UI Components](./UI_COMPONENTS.md) | All |
| Permission Checking | [Permission System](./PERMISSION_SYSTEM.md) | Frontend Implementation |
| Auth Context | [Authentication](./AUTHENTICATION.md) | Frontend Implementation |
| Loading States | [UI Components](./UI_COMPONENTS.md) | Loading Components |
| Alert Modals | [UI Components](./UI_COMPONENTS.md) | Alert Modal System |

### Backend

| Topic | Document | Section |
|-------|----------|---------|
| API Endpoints | Multiple | See routers/ folder |
| Permission Enforcement | [Permission System](./PERMISSION_SYSTEM.md) | Backend Implementation |
| JWT Validation | [Authentication](./AUTHENTICATION.md) | Backend Implementation |
| Database Queries | [Database Schema](./DATABASE_SCHEMA.md) | Common Queries |

### Database

| Topic | Document | Section |
|-------|----------|---------|
| Tables | [Database Schema](./DATABASE_SCHEMA.md) | Tables |
| Relationships | [Database Schema](./DATABASE_SCHEMA.md) | Relationships |
| Triggers | [Database Schema](./DATABASE_SCHEMA.md) | Triggers |
| Functions | [Database Schema](./DATABASE_SCHEMA.md) | Functions |
| Migrations | [Database Schema](./DATABASE_SCHEMA.md) | Migrations |

### Security

| Topic | Document | Section |
|-------|----------|---------|
| RBAC System | [Permission System](./PERMISSION_SYSTEM.md) | Architecture |
| Token Security | [Authentication](./AUTHENTICATION.md) | Security Considerations |
| Audit Logging | [Database Schema](./DATABASE_SCHEMA.md) | audit_logs |
| Session Tracking | [Database Schema](./DATABASE_SCHEMA.md) | user_sessions |

---

## 🎯 Common Tasks

### Task: Add a New Permission-Protected Page

**Files to read:**
1. [Permission System - Adding New Permissions](./PERMISSION_SYSTEM.md#adding-new-permissions)
2. [UI Components - PermissionGuard](./UI_COMPONENTS.md#permissionguard)

**Steps:**
1. Create permission in database
2. Create page component
3. Wrap with PermissionGuard
4. Add to sidebar navigation
5. Protect backend endpoint

---

### Task: Customize Branding

**Files to read:**
1. [Getting Started - Configure Branding](./GETTING_STARTED.md#4-configure-branding)
2. [UI Components - Styling Guidelines](./UI_COMPONENTS.md#styling-guidelines)

**Steps:**
1. Update logo in Sidebar
2. Change colors in tailwind.config.js
3. Update metadata in layout.tsx

---

### Task: Add User Fields

**Files to read:**
1. [Database Schema - profiles](./DATABASE_SCHEMA.md#profiles)
2. [Database Schema - Migrations](./DATABASE_SCHEMA.md#migrations)

**Steps:**
1. Create migration to add column
2. Update profile model
3. Update API endpoints
4. Update UI forms

---

## 🔧 Development Guides

### Frontend Development
- [UI Components](./UI_COMPONENTS.md) - Component library
- [Getting Started](./GETTING_STARTED.md#development-workflow) - Dev workflow

### Backend Development
- [Permission System](./PERMISSION_SYSTEM.md#backend-implementation) - API structure
- [Authentication](./AUTHENTICATION.md#backend-implementation) - Auth endpoints

### Database Development
- [Database Schema](./DATABASE_SCHEMA.md) - Complete schema
- [Database Schema - Best Practices](./DATABASE_SCHEMA.md#best-practices) - Guidelines

---

## 🆘 Getting Help

### Documentation Not Clear?

1. **Check Related Docs:** Use the links above
2. **Search Docs:** Use Cmd+F to search within files
3. **Check Examples:** Look at existing code
4. **Create Issue:** Report unclear documentation

---

## 📦 What's Included

This documentation covers:

- ✅ Complete setup and installation
- ✅ Authentication system (JWT + Supabase)
- ✅ Permission system (RBAC)
- ✅ All UI components
- ✅ Database schema and migrations
- ✅ API structure
- ✅ Troubleshooting guides
- ✅ Best practices
- ✅ Code examples

---

## 🚀 Next Steps

**New to CoreDesk?**
→ Start with [Getting Started](./GETTING_STARTED.md)

**Building a feature?**
→ Check [Permission System](./PERMISSION_SYSTEM.md) and [UI Components](./UI_COMPONENTS.md)

**Database work?**
→ Read [Database Schema](./DATABASE_SCHEMA.md)

**Authentication changes?**
→ See [Authentication](./AUTHENTICATION.md)

---

**Happy Building! 🎉**
