'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthProvider'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import { useState } from 'react'
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
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavigationItem {
  name: string
  href: string
  icon: any
  permission?: string // Optional permission required to view this item
}

interface NavigationGroup {
  name: string
  icon: any
  permission?: string // Permission required to view the entire group
  items: NavigationItem[]
}

// System Administration group
const systemAdministrationGroup: NavigationGroup = {
  name: 'System Administration',
  icon: Settings,
  permission: 'systemadministration.view',
  items: [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, permission: 'systemdashboard.view' },
    { name: 'Users', href: '/admin/users', icon: Users, permission: 'users.read' },
    { name: 'Roles', href: '/admin/roles', icon: ShieldCheck, permission: 'roles.read' },
    { name: 'Permissions', href: '/admin/permissions', icon: Key, permission: 'permissions.read' },
    { name: 'Health', href: '/admin/health', icon: Activity, permission: 'system.admin' },
    { name: 'Settings', href: '/admin/settings', icon: Settings, permission: 'system.settings' },
    { name: 'Logs', href: '/admin/logs', icon: FileText, permission: 'system.logs' },
    { name: 'Test', href: '/admin/test', icon: TestTube, permission: 'test.run' },
  ]
}

const navigationGroups: NavigationGroup[] = [
  systemAdministrationGroup
]

const docsNavigation = [
  { name: 'Documentation', href: '/admin/docs', icon: BookOpen, permission: 'system.docs' },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { permissions: userPermissions, loading: permissionsLoading } = usePermissions()
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['System Administration'])

  const apiDocsUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupName)
        ? prev.filter(name => name !== groupName)
        : [...prev, groupName]
    )
  }

  // Filter navigation groups based on user permissions
  const filteredNavigationGroups = navigationGroups.map(group => {
    // Check if user has permission to view the group
    if (group.permission && (!permissionsLoading && !hasPermission(userPermissions, group.permission))) {
      return null
    }

    // Filter items within the group
    const filteredItems = group.items.filter((item) => {
      if (!item.permission) return true
      if (permissionsLoading) return false
      return hasPermission(userPermissions, item.permission)
    })

    // Don't show the group if it has no visible items
    if (filteredItems.length === 0) return null

    return {
      ...group,
      items: filteredItems
    }
  }).filter(Boolean) as NavigationGroup[]

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
      <Link href="/admin" className="p-6 pb-4 cursor-pointer hover:opacity-80 transition-opacity">
        <h2 className="text-3xl font-bold text-[#1E4DD8]">Venus Chicken</h2>
      </Link>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {filteredNavigationGroups.map((group) => {
          const isExpanded = expandedGroups.includes(group.name)
          const hasActiveItem = group.items.some(item => pathname === item.href)
          
          return (
            <div key={group.name} className="space-y-1">
              <button
                onClick={() => toggleGroup(group.name)}
                className={cn(
                  'w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  hasActiveItem
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <div className="flex items-center gap-3">
                  <group.icon className="h-5 w-5" />
                  <span>{group.name}</span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              
              {isExpanded && (
                <div className="ml-4 space-y-1 border-l-2 border-border pl-2">
                  {group.items.map((item) => {
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
                        <item.icon className="h-4 w-4" />
                        {item.name}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
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
