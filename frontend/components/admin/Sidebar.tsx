'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthProvider'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import { useState, useRef, useEffect } from 'react'
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
  Store,
  UserCog,
  Tags,
  // Poultry Retail icons
  Egg,
  Scale,
  Calculator,
  Trophy,
  ClipboardList,
  RefreshCw,
  Target,
  Award,
  AlertCircle,
  Bot,
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
    { name: 'AI Config', href: '/admin/ai-settings', icon: Bot, permission: 'ai.admin' },
    { name: 'Roles', href: '/admin/roles', icon: ShieldCheck, permission: 'roles.read' },
    { name: 'Permissions', href: '/admin/permissions', icon: Key, permission: 'permissions.read' },
    { name: 'Health', href: '/admin/health', icon: Activity, permission: 'system.admin' },
    { name: 'Settings', href: '/admin/settings', icon: Settings, permission: 'system.settings' },
    { name: 'Logs', href: '/admin/logs', icon: FileText, permission: 'system.logs' },
    { name: 'Activity Logs', href: '/admin/activity-logs', icon: Activity, permission: 'system.logs' },
    { name: 'Test', href: '/admin/test', icon: TestTube, permission: 'test.run' },
  ]
}

// Purchases & Payables sub-group
const purchasesPayablesGroup: NavigationGroup = {
  name: 'Purchases & Payables',
  icon: Receipt,
  permission: 'purchases.view',
  items: [
    { name: 'Purchases', href: '/admin/business/purchases', icon: ShoppingCart, permission: 'purchases.sidebar' },
    { name: 'Suppliers', href: '/admin/business/suppliers', icon: Truck, permission: 'suppliers.sidebar' },
    { name: 'Payments', href: '/admin/business/payments', icon: CreditCard, permission: 'payment.sidebar' },
  ]
}

// Inventory Management sub-group
const inventoryManagementGroup: NavigationGroup = {
  name: 'Inventory Management',
  icon: Package,
  permission: 'inventory.sidebar',
  items: [
    // { name: 'Items-Purchase', href: '/admin/business/inventory/items-purchase', icon: Package, permission: 'itemspurchase.view' }, // Hidden - replaced by SKUs
    { name: 'Stock', href: '/admin/business/inventory/stock', icon: Box, permission: 'inventory.stock.sidebar' },
    { name: 'Processing', href: '/admin/business/inventory/processing', icon: RefreshCw, permission: 'processing.sidebar' },
    { name: 'SKUs', href: '/admin/business/skus', icon: Tags, permission: 'skus.sidebar' },
    { name: 'Wastage', href: '/admin/business/inventory/wastage', icon: Trash2, permission: 'wastageconfig.sidebar' },
    { name: 'Adjustments', href: '/admin/business/inventory/adjustments', icon: ClipboardEdit, permission: 'inventory.adjustments.sidebar' },
  ]
}

// Sales & Income sub-group
const salesIncomeGroup: NavigationGroup = {
  name: 'Sales & Income',
  icon: DollarSign,
  permission: 'sales.sidebar',
  items: [
    { name: 'POS', href: '/admin/business/sales/pos', icon: ShoppingCart, permission: 'sales.pos.sidebar' },
    { name: 'Sales', href: '/admin/business/sales', icon: TrendingUp, permission: 'sales.history.sidebar' },
    // { name: 'Items-Sale', href: '/admin/business/sales-items', icon: Package, permission: 'inventoryitems.view' }, // Hidden - replaced by SKUs
    { name: 'Customers', href: '/admin/business/customers', icon: UserCheck, permission: 'customer.view' },
    { name: 'Receipts', href: '/admin/business/receipts', icon: FileCheck, permission: 'receipt.view' },
  ]
}

// Finance Management sub-group
const financeManagementGroup: NavigationGroup = {
  name: 'Finance Management',
  icon: Landmark,
  permission: 'finance.view',
  items: [
    { name: 'Expenses', href: '/admin/business/finance/expenses', icon: Banknote, permission: 'expense.view' },
    { name: 'Cashbook', href: '/admin/business/finance/cashbook', icon: Wallet, permission: 'cashbook.view' },
    { name: 'Ledger', href: '/admin/business/finance/ledger', icon: BookOpenCheck, permission: 'inventory.ledger.sidebar' },
    { name: 'Settlements', href: '/admin/business/settlements', icon: Calculator, permission: 'settlements.sidebar' },
    { name: 'Variance', href: '/admin/business/variance', icon: AlertCircle, permission: 'variance.sidebar' },
  ]
}

// Insights & Reports sub-group
const insightsReportsGroup: NavigationGroup = {
  name: 'Insights & Reports',
  icon: BarChart3,
  permission: 'analytics.view',
  items: [
    { name: 'Sales Reports', href: '/admin/business/reports/sales', icon: LineChart, permission: 'salesreport.view' },
    { name: 'Purchase Reports', href: '/admin/business/reports/purchase', icon: PieChart, permission: 'purchasereport.view' },
    { name: 'Expense Reports', href: '/admin/business/reports/expense', icon: FileBarChart, permission: 'expensereport.view' },
    { name: 'Wastage Reports', href: '/admin/business/reports/wastage', icon: Trash2, permission: 'wastagereport.view' },
  ]
}

// Staff Performance sub-group
const staffPerformanceGroup: NavigationGroup = {
  name: 'Staff Performance',
  icon: Trophy,
  permission: 'managers.view',
  items: [
    { name: 'Points', href: '/admin/business/staff-points', icon: Award, permission: 'staffpoints.sidebar' },
    { name: 'Leaderboard', href: '/admin/business/staff-points/leaderboard', icon: Trophy, permission: 'staffleaderboard.sidebar' },
  ]
}

// Business group
const businessGroup: NavigationGroup = {
  name: 'Business',
  icon: Activity,
  permission: 'poultry.sidebar',
  items: [
    { name: 'Business Dashboard', href: '/admin/business', icon: Activity, permission: 'businessdashboard.view' },
    purchasesPayablesGroup,
    inventoryManagementGroup,
    salesIncomeGroup,
    financeManagementGroup,
    insightsReportsGroup,
    staffPerformanceGroup,
  ]
}

// Shop Management sub-group
const shopManagementGroup: NavigationGroup = {
  name: 'Shop Management',
  icon: Store,
  permission: 'shopmanagement.view',
  items: [
    { name: 'Shops', href: '/admin/business-management/shops', icon: Store, permission: 'shops.view' },
    { name: 'Managers', href: '/admin/business-management/managers', icon: UserCog, permission: 'managers.view' },
    { name: 'Price Config', href: '/admin/business-management/price-config', icon: Tags, permission: 'priceconfig.view' },
  ]
}

// Business Management group
const businessManagementGroup: NavigationGroup = {
  name: 'Business Management',
  icon: Settings,
  permission: 'businessmanagement.view',
  items: [
    shopManagementGroup,
    // Add more business management modules here
  ]
}

// Main poultry retail group (removed to use existing Business group)

const navigationGroups: NavigationGroup[] = [
  systemAdministrationGroup,
  businessGroup,
  businessManagementGroup
]

const docsNavigation = [
  { name: 'Documentation', href: '/admin/docs', icon: BookOpen, permission: 'system.docs' },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { permissions: userPermissions, loading: permissionsLoading } = usePermissions()
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(300) // 300px default width
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  const apiDocsUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  // Handle mouse down on resize handle
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true)
    e.preventDefault()
  }

  // Handle mouse move for resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return

      const newWidth = e.clientX
      // Set min width to 200px and max width to 500px
      if (newWidth >= 200 && newWidth <= 500) {
        setSidebarWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

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
    // Check if user has explicit permission to view the group
    // BUT we also want to show the group if a child item is accessible
    const hasGroupPermission = !group.permission || (hasPermission(userPermissions, group.permission))

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
      <div
        ref={sidebarRef}
        className={cn(
          "bg-card border-r flex flex-col relative z-20",
          isCollapsed ? "w-16" : ""
        )}
        style={!isCollapsed ? { width: `${sidebarWidth}px` } : undefined}
      >
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
            const hasActiveItem = group.items.some(item => 'href' in item && pathname === item.href)

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
                  <Link
                    href="/admin/api-docs"
                    className="flex items-center justify-center p-3 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <BookOpen className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>API Documentation</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Link
                href="/admin/api-docs"
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <BookOpen className="h-5 w-5" />
                <span>API Documentation</span>
              </Link>
            )
          )}
        </div>


        {/* Resize Handle */}
        {!isCollapsed && (
          <div
            onMouseDown={handleMouseDown}
            className={cn(
              "absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50 transition-colors",
              isResizing && "bg-primary"
            )}
            style={{ touchAction: 'none' }}
          />
        )}
      </div>
    </TooltipProvider>
  )
}
