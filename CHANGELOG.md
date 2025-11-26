# Changelog

All notable changes to CoreDesk will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-11-26

### Added
- **Permission Control for Documentation**
  - Added `system.docs` permission for documentation access
  - Documentation page now requires `system.docs` permission
  - API Documentation link requires `system.docs` permission
  - Sidebar filters documentation links based on permissions

- **Permission Control for Status Indicators**
  - Backend and Database status indicators require `system.admin` permission
  - Status indicators hidden for users without admin access
  - Real-time health monitoring restricted to admin users

- **Permission Control for Roles Page**
  - Roles management page now requires `roles.read` permission
  - Enhanced RBAC for role administration

- **Database Migration**
  - Added migration `011_add_docs_permission.sql` for `system.docs` permission
  - Auto-assigns `system.docs` to Admin and Manager roles

### Changed
- Updated documentation to reflect new permission requirements
- Enhanced `PERMISSION_SYSTEM.md` with complete permission list
- Updated `README.md` with new permission examples
- Improved `UI_COMPONENTS.md` with StatusIndicators permission details

### Fixed
- Fixed duplicate function export in RolesPage component
- Resolved build errors in roles page

## [1.0.0] - 2025-11-26

### Added
- Initial release of CoreDesk Enterprise SaaS Starter Kit
- Complete RBAC system with granular permissions
- Next.js 14 frontend with TypeScript
- FastAPI backend with Python 3.11
- Supabase PostgreSQL database
- JWT authentication system
- Beautiful admin panel with shadcn/ui
- Audit logging system
- Session management
- Health monitoring dashboard
- Global alert modal system
- Loading animations (4 variants)
- Comprehensive documentation suite
- Proprietary license
