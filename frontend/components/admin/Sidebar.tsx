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
  ChevronLeft,
  Menu,
  Receipt,
  ShoppingCart,
  Truck,
  CreditCard,
  Package,
  Box,
  Trash2,
  ClipboardEdit,
  DollarSign,
  TrendingUp,
  UserCheck,
  FileCheck,
  Landmark,
  Banknote,
  Wallet,
  BookOpenCheck,
  BarChart3,
  LineChart,
  PieChart,
  FileBarChart,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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
  items: (NavigationItem | NavigationGroup)[] // Items can be pages or nested groups
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

// Purchases & Payables sub-group
const purchasesPayablesGroup: NavigationGroup = {
  name: '🧾 Purchases & Payables',
  icon: Receipt,
  permission: 'purchase&payment.view',
  items: [
    { name: 'Purchases', href: '/admin/business/purchases', icon: ShoppingCart, permission: 'purchase.view' },
    { name: 'Suppliers', href: '/admin/business/suppliers', icon: Truck, permission: 'supplier.view' },
    { name: 'Payments', href: '/admin/business/payments', icon: CreditCard, permission: 'payment.view' },
  ]
}

// Inventory Management sub-group
const inventoryManagementGroup: NavigationGroup = {
  name: '📦 Inventory Management',
  icon: Package,
  permission: 'inventory.view',
  items: [
    { name: 'Stock', href: '/admin/business/inventory/stock', icon: Box, permission: 'stock.view' },
    { name: 'Wastage', href: '/admin/business/inventory/wastage', icon: Trash2, permission: 'wastage.view' },
    { name: 'Adjustments', href: '/admin/business/inventory/adjustments', icon: ClipboardEdit, permission: 'adjustments.view' },
  ]
}

// Sales & Income sub-group
const salesIncomeGroup: NavigationGroup = {
  name: '💰 Sales & Income',
  icon: DollarSign,
  permission: 'salesincome.view',
  items: [
    { name: 'Sales', href: '/admin/business/sales', icon: TrendingUp, permission: 'sales.view' },
    { name: 'Customers', href: '/admin/business/customers', icon: UserCheck, permission: 'customer.view' },
    { name: 'Receipts', href: '/admin/business/receipts', icon: FileCheck, permission: 'receipt.view' },
  ]
}

// Finance Management sub-group
const financeManagementGroup: NavigationGroup = {
  name: '🏦 Finance Management',
  icon: Landmark,
  permission: 'finance.view',
  items: [
    { name: 'Expenses', href: '/admin/business/finance/expenses', icon: Banknote, permission: 'expense.view' },
    { name: 'Cashbook', href: '/admin/business/finance/cashbook', icon: Wallet, permission: 'cashbook.view' },
    { name: 'Ledger', href: '/admin/business/finance/ledger', icon: BookOpenCheck, permission: 'ledger.view' },
  ]
}

// Insights & Reports sub-group
const insightsReportsGroup: NavigationGroup = {
  name: '📊 Insights & Reports',
  icon: BarChart3,
  permission: 'analytics.view',
  items: [
    { name: 'Sales Reports', href: '/admin/business/reports/sales', icon: LineChart, permission: 'salesreport.view' },
    { name: 'Purchase Reports', href: '/admin/business/reports/purchase', icon: PieChart, permission: 'purchasereport.view' },
    { name: 'Expense Reports', href: '/admin/business/reports/expense', icon: FileBarChart, permission: 'expensereport.view' },
    { name: 'Wastage Reports', href: '/admin/business/reports/wastage', icon: Trash2, permission: 'wastagereport.view' },
  ]
}

// Business group
const businessGroup: NavigationGroup = {
  name: 'Business',
  icon: Activity,
  permission: 'business.view',
  items: [
    { name: 'Business Dashboard', href: '/admin/business', icon: Activity, permission: 'businessdashboard.view' },
    purchasesPayablesGroup,
    inventoryManagementGroup,
    salesIncomeGroup,
    financeManagementGroup,
    insightsReportsGroup,
    // Add more business-related pages here
  ]
}

const navigationGroups: NavigationGroup[] = [
  systemAdministrationGroup,
  businessGroup
]

const docsNavigation = [
  { name: 'Documentation', href: '/admin/docs', icon: BookOpen, permission: 'system.docs' },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { permissions: userPermissions, loading: permissionsLoading } = usePermissions()
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['System Administration', 'Business'])
  const [isCollapsed, setIsCollapsed] = useState(false)

  const apiDocsUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupName)
        ? prev.filter(name => name !== groupName)
        : [...prev, groupName]
    )
  }

  // Helper function to check if item is a group (has items array)
  const isNavigationGroup = (item: NavigationItem | NavigationGroup): item is NavigationGroup => {
    return 'items' in item
  }

  // Recursive function to filter navigation groups and items
  const filterNavigationGroup = (group: NavigationGroup): NavigationGroup | null => {
    // Check if user has permission to view the group
    if (group.permission && (!permissionsLoading && !hasPermission(userPermissions, group.permission))) {
      return null
    }

    // Filter items within the group (can be pages or nested groups)
    const filteredItems = group.items
      .map((item) => {
        if (isNavigationGroup(item)) {
          // Recursively filter nested group
          return filterNavigationGroup(item)
        } else {
          // Filter regular navigation item
          if (!item.permission) return item
          if (permissionsLoading) return null
          return hasPermission(userPermissions, item.permission) ? item : null
        }
      })
      .filter(Boolean) as (NavigationItem | NavigationGroup)[]

    // Don't show the group if it has no visible items
    if (filteredItems.length === 0) return null

    return {
      ...group,
      items: filteredItems
    }
  }

  // Filter navigation groups based on user permissions
  const filteredNavigationGroups = navigationGroups
    .map(filterNavigationGroup)
    .filter(Boolean) as NavigationGroup[]

  // Filter docs navigation based on permissions
  const filteredDocsNavigation = docsNavigation.filter((item) => {
    if (!item.permission) return true
    if (permissionsLoading) return false
    return hasPermission(userPermissions, item.permission)
  })

  // Check if user can view API documentation
  const canViewApiDocs = !permissionsLoading && hasPermission(userPermissions, 'system.docs')

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn(
        "bg-card border-r flex flex-col transition-all duration-300 relative z-20",
        isCollapsed ? "w-16" : "w-64"
      )}>
        {/* Header with Logo and Toggle */}
        <div className="p-4 flex items-center justify-between border-b">
          {isCollapsed ? (
            <Link href="/admin" className="cursor-pointer hover:opacity-80 transition-opacity">
              <div className="text-2xl font-bold text-[#1E4DD8]">VC</div>
            </Link>
          ) : (
            <Link href="/admin" className="cursor-pointer hover:opacity-80 transition-opacity">
              <h2 className="text-2xl font-bold text-[#1E4DD8]">Venus Chicken</h2>
            </Link>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md hover:bg-accent transition-colors"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {filteredNavigationGroups.map((group) => {
            const isExpanded = expandedGroups.includes(group.name)
            const hasActiveItem = group.items.some(item => pathname === item.href)
            
            return (
              <div key={group.name} className="space-y-1">
                {isCollapsed ? (
                  // Collapsed view - show only group icon with tooltip
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => toggleGroup(group.name)}
                        className={cn(
                          'w-full flex items-center justify-center p-3 rounded-md text-sm font-medium transition-colors',
                          hasActiveItem
                            ? 'bg-accent text-accent-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        <group.icon className="h-5 w-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="flex flex-col gap-1">
                      <p className="font-semibold">{group.name}</p>
                      {group.items.map((item) => (
                        <p key={item.name} className="text-xs text-muted-foreground">
                          • {item.name}
                        </p>
                      ))}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  // Expanded view - show full group with dropdown
                  <>
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
                          // Check if this is a nested group
                          if (isNavigationGroup(item)) {
                            const nestedGroup = item
                            const isNestedExpanded = expandedGroups.includes(nestedGroup.name)
                            const hasActiveNestedItem = nestedGroup.items.some((nestedItem: any) => 
                              !isNavigationGroup(nestedItem) && pathname === nestedItem.href
                            )
                            
                            return (
                              <div key={nestedGroup.name} className="space-y-1">
                                <button
                                  onClick={() => toggleGroup(nestedGroup.name)}
                                  className={cn(
                                    'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                                    hasActiveNestedItem
                                      ? 'bg-accent text-accent-foreground'
                                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    <nestedGroup.icon className="h-4 w-4" />
                                    <span>{nestedGroup.name}</span>
                                  </div>
                                  {isNestedExpanded ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                </button>
                                
                                {isNestedExpanded && (
                                  <div className="ml-4 space-y-1 border-l-2 border-border pl-2">
                                    {nestedGroup.items.map((nestedItem: any) => {
                                      if (isNavigationGroup(nestedItem)) return null // Skip deeper nesting for now
                                      const isActive = pathname === nestedItem.href
                                      return (
                                        <Link
                                          key={nestedItem.name}
                                          href={nestedItem.href}
                                          className={cn(
                                            'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                                            isActive
                                              ? 'bg-primary text-primary-foreground'
                                              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                          )}
                                        >
                                          <nestedItem.icon className="h-4 w-4" />
                                          <span>{nestedItem.name}</span>
                                        </Link>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          }
                          
                          // Regular navigation item
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
                  </>
                )}
                
                {/* Collapsed view - show group items as icons */}
                {isCollapsed && isExpanded && (
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      // Skip nested groups in collapsed view
                      if (isNavigationGroup(item)) return null
                      
                      const isActive = pathname === item.href
                      return (
                        <Tooltip key={item.name}>
                          <TooltipTrigger asChild>
                            <Link
                              href={item.href}
                              className={cn(
                                'flex items-center justify-center p-2 rounded-md transition-colors',
                                isActive
                                  ? 'bg-primary text-primary-foreground'
                                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                              )}
                            >
                              <item.icon className="h-4 w-4" />
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>{item.name}</p>
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Documentation Section */}
        <div className="px-2 pb-2 space-y-1 border-t pt-2">
          {filteredDocsNavigation.map((item) => {
            const isActive = pathname === item.href
            return isCollapsed ? (
              <Tooltip key={item.name}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center justify-center p-3 rounded-md transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.name}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
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

        {/* API Documentation Link */}
        <div className="p-2 border-t">
          {canViewApiDocs && (
            isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={`${apiDocsUrl}/docs`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center p-3 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <BookOpen className="h-5 w-5" />
                  </a>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>API Documentation</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <a
                href={`${apiDocsUrl}/docs`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <BookOpen className="h-5 w-5" />
                <span>API Documentation</span>
              </a>
            )
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
