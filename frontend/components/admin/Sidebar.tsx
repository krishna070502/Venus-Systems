'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthProvider'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Key,
  Settings,
  FileText,
  Activity,
  BookOpen,
  TestTube,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavigationItem {
  name: string
  href: string
  icon: any
  permission?: string // Optional permission required to view this item
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: Users, permission: 'users.read' },
  { name: 'Roles', href: '/admin/roles', icon: ShieldCheck, permission: 'roles.read' },
  { name: 'Permissions', href: '/admin/permissions', icon: Key, permission: 'permissions.read' },
  { name: 'Health', href: '/admin/health', icon: Activity, permission: 'system.admin' },
  { name: 'Settings', href: '/admin/settings', icon: Settings, permission: 'system.settings' },
  { name: 'Logs', href: '/admin/logs', icon: FileText, permission: 'system.logs' },
  { name: 'Test', href: '/admin/test', icon: TestTube, permission: 'test.run' },
]

const docsNavigation = [
  { name: 'Documentation', href: '/admin/docs', icon: BookOpen, permission: 'system.docs' },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { permissions: userPermissions, loading: permissionsLoading } = usePermissions()

  const apiDocsUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  // Filter navigation items based on user permissions
  const filteredNavigation = navigation.filter((item) => {
    // If no permission required, show the item
    if (!item.permission) return true
    
    // If permissions are still loading, don't show permission-protected items yet
    if (permissionsLoading) return false
    
    // Check if user has the required permission
    return hasPermission(userPermissions, item.permission)
  })

  // Filter docs navigation based on permissions
  const filteredDocsNavigation = docsNavigation.filter((item) => {
    if (!item.permission) return true
    if (permissionsLoading) return false
    return hasPermission(userPermissions, item.permission)
  })

  // Check if user can view API documentation
  const canViewApiDocs = !permissionsLoading && hasPermission(userPermissions, 'system.docs')

  return (
    <div className="w-64 bg-card border-r flex flex-col">
      <div className="p-6 pb-4">
        <h2 className="text-3xl font-bold text-[#1E4DD8]">CoreDesk</h2>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 pb-4 space-y-1 border-t pt-4">
        {filteredDocsNavigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </div>

      <div className="p-4 border-t">{/* Remove space-y-1 */}
        {canViewApiDocs && (
          <a
            href={`${apiDocsUrl}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <BookOpen className="h-5 w-5" />
            <span>API Documentation</span>
          </a>
        )}
      </div>
    </div>
  )
}
