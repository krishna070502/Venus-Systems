# Changelog

All notable changes to Venus Chicken will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.0] - 2025-11-26

### Added
- **System Administration Dropdown Menu**
  - Grouped sidebar navigation into "System Administration" section
  - Added collapsible dropdown for better organization
  - New permission `systemadministration.view` controls entire section visibility
  - Groups 8 pages: Dashboard, Users, Roles, Permissions, Health, Settings, Logs, Test
  - Improved navigation UX with expand/collapse functionality
  - Database migration `014_add_systemadministration_permission.sql`
  - Auto-assigns to Admin and Manager roles

### Changed
- Sidebar now uses grouped navigation structure
- Individual page permissions still enforced within the group
- Enhanced visual hierarchy with indented sub-items
- Added chevron indicators for dropdown state

## [1.5.0] - 2025-11-26

### Added
- **Dynamic Permission Display System**
  - Landing page now shows ALL user permissions automatically
  - Feature cards display for 9 mapped permissions with icons, names, descriptions, and navigation links
  - "Additional Permissions" section displays unmapped permissions as badges
  - New permissions appear automatically without code changes
  - Fully scalable architecture using featureMap pattern

### Changed
- Converted hardcoded permission display (140 lines) to dynamic system (35 lines)
- "Your Available Features" section now renders all permissions dynamically
- Improved code maintainability and scalability for future permission additions
- Updated UI_COMPONENTS.md with detailed dynamic feature display documentation
- Updated PERMISSION_SYSTEM.md with featureMap implementation guide

### Technical
- Created featureMap for 9 known permissions
- Automatic filtering of permissions into availableFeatures and otherPermissions
- Dynamic rendering using .map() instead of individual permission checks
- Clear separation between UI features and raw permissions

## [1.4.0] - 2025-11-26

### Added
- **Dedicated Status Indicator Permission**
  - Added `system.status` permission for viewing API status indicators
  - Separated status indicator access from `system.admin`
  - More granular control over who can view backend/database status
  - Database migration `013_add_status_permission.sql`
  - Auto-assigns to Admin and Manager roles

### Changed
- StatusIndicators component now requires `system.status` instead of `system.admin`
- Updated all documentation with new permission

## [1.3.0] - 2025-11-26

### Added
- **Home Landing Page**
  - Created beautiful landing page for users without `systemdashboard.view` permission
  - Shows welcome message with Venus Chicken branding and gradient effects
  - Displays app features: Enterprise Security, Modern UI, Real-Time Monitoring
  - "Your Available Features" section dynamically shows all accessible pages
  - Displays 9 possible features based on user permissions
  - Provides help section for requesting additional access
  - Improves UX for users with limited permissions

### Changed
- Dashboard now shows different content based on `systemdashboard.view` permission
- Users without dashboard permission see Home Landing Page instead of access denied
- Enhanced permission-based UI rendering

## [1.2.0] - 2025-11-26

### Added
- **Dashboard Permission Control**
  - Added `systemdashboard.view` permission for dashboard access
  - Dashboard now requires `systemdashboard.view` permission to view
  - Allows separation between system dashboard and future business dashboards
  - Database migration `012_add_systemdashboard_permission.sql`
  - Auto-assigns to Admin and Manager roles

### Changed
- Updated documentation with `systemdashboard.view` permission
- Enhanced sidebar navigation to filter dashboard based on permission

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
- Initial release of Venus Chicken Enterprise SaaS Starter Kit
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
