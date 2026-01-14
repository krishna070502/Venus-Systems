'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import {
  Search,
  X,
  LayoutDashboard,
  Users,
  ShieldCheck,
  Key,
  Settings,
  FileText,
  Activity,
  BookOpen,
  TestTube,
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
  Command,
} from 'lucide-react'

interface SearchableItem {
  name: string
  href: string
  icon: any
  permission?: string
  category: string
  keywords: string[]
}

// All searchable pages
const allPages: SearchableItem[] = [
  // System Administration
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, permission: 'systemdashboard.view', category: 'System Administration', keywords: ['home', 'main', 'overview'] },
  { name: 'Users', href: '/admin/users', icon: Users, permission: 'users.read', category: 'System Administration', keywords: ['accounts', 'people', 'members'] },
  { name: 'Roles', href: '/admin/roles', icon: ShieldCheck, permission: 'roles.read', category: 'System Administration', keywords: ['permissions', 'access', 'groups'] },
  { name: 'Permissions', href: '/admin/permissions', icon: Key, permission: 'permissions.read', category: 'System Administration', keywords: ['access', 'rights', 'authorization'] },
  { name: 'Health', href: '/admin/health', icon: Activity, permission: 'system.admin', category: 'System Administration', keywords: ['status', 'monitoring', 'system'] },
  { name: 'Settings', href: '/admin/settings', icon: Settings, permission: 'system.settings', category: 'System Administration', keywords: ['configuration', 'preferences', 'options'] },
  { name: 'Logs', href: '/admin/logs', icon: FileText, permission: 'system.logs', category: 'System Administration', keywords: ['audit', 'history', 'activity'] },
  { name: 'Test', href: '/admin/test', icon: TestTube, permission: 'test.run', category: 'System Administration', keywords: ['debug', 'testing'] },
  { name: 'Sessions', href: '/admin/sessions', icon: Users, permission: 'system.admin', category: 'System Administration', keywords: ['active', 'login', 'connected'] },
  { name: 'Documentation', href: '/admin/docs', icon: BookOpen, permission: 'system.docs', category: 'System Administration', keywords: ['help', 'guide', 'manual'] },

  // Business
  { name: 'Business Dashboard', href: '/admin/business', icon: Activity, permission: 'businessdashboard.view', category: 'Business', keywords: ['overview', 'summary'] },

  // Purchases & Payables
  { name: 'Purchases', href: '/admin/business/purchases', icon: ShoppingCart, permission: 'purchases.view', category: 'Purchases & Payables', keywords: ['buy', 'orders', 'procurement'] },
  { name: 'Suppliers', href: '/admin/business/suppliers', icon: Truck, permission: 'suppliers.view', category: 'Purchases & Payables', keywords: ['vendors', 'providers'] },
  { name: 'Payments', href: '/admin/business/payments', icon: CreditCard, permission: 'payment.view', category: 'Purchases & Payables', keywords: ['pay', 'bills', 'invoices'] },

  // Inventory Management
  { name: 'Items-Purchase', href: '/admin/business/inventory/items-purchase', icon: Package, permission: 'itemspurchase.view', category: 'Inventory Management', keywords: ['products', 'inventory', 'buying', 'procurement'] },
  { name: 'Stock', href: '/admin/business/inventory/stock', icon: Box, permission: 'stock.view', category: 'Inventory Management', keywords: ['inventory', 'quantity', 'levels'] },
  { name: 'Wastage', href: '/admin/business/inventory/wastage', icon: Trash2, permission: 'wastage.view', category: 'Inventory Management', keywords: ['loss', 'spoilage', 'damage'] },
  { name: 'Adjustments', href: '/admin/business/inventory/adjustments', icon: ClipboardEdit, permission: 'adjustments.view', category: 'Inventory Management', keywords: ['corrections', 'modify', 'changes'] },

  // Sales & Income
  { name: 'Sales', href: '/admin/business/sales', icon: TrendingUp, permission: 'sales.view', category: 'Sales & Income', keywords: ['revenue', 'transactions', 'orders'] },
  { name: 'Items-Sale', href: '/admin/business/sales-items', icon: Package, permission: 'inventoryitems.view', category: 'Sales & Income', keywords: ['inventory', 'selling', 'products'] },
  { name: 'Customers', href: '/admin/business/customers', icon: UserCheck, permission: 'customer.view', category: 'Sales & Income', keywords: ['clients', 'buyers'] },
  { name: 'Receipts', href: '/admin/business/receipts', icon: FileCheck, permission: 'receipt.view', category: 'Sales & Income', keywords: ['invoices', 'bills'] },

  // Finance Management
  { name: 'Expenses', href: '/admin/business/finance/expenses', icon: Banknote, permission: 'expense.view', category: 'Finance Management', keywords: ['costs', 'spending'] },
  { name: 'Cashbook', href: '/admin/business/finance/cashbook', icon: Wallet, permission: 'cashbook.view', category: 'Finance Management', keywords: ['cash', 'money', 'transactions'] },
  { name: 'Ledger', href: '/admin/business/finance/ledger', icon: BookOpenCheck, permission: 'ledger.view', category: 'Finance Management', keywords: ['accounts', 'bookkeeping'] },

  // Insights & Reports
  { name: 'Sales Reports', href: '/admin/business/reports/sales', icon: LineChart, permission: 'salesreport.view', category: 'Insights & Reports', keywords: ['analytics', 'revenue'] },
  { name: 'Purchase Reports', href: '/admin/business/reports/purchase', icon: PieChart, permission: 'purchasereport.view', category: 'Insights & Reports', keywords: ['analytics', 'buying'] },
  { name: 'Expense Reports', href: '/admin/business/reports/expense', icon: FileBarChart, permission: 'expensereport.view', category: 'Insights & Reports', keywords: ['analytics', 'costs'] },
  { name: 'Wastage Reports', href: '/admin/business/reports/wastage', icon: Trash2, permission: 'wastagereport.view', category: 'Insights & Reports', keywords: ['analytics', 'loss'] },

  // Business Management - Shop Management
  { name: 'Shops', href: '/admin/business-management/shops', icon: Store, permission: 'shops.view', category: 'Shop Management', keywords: ['stores', 'locations', 'branches'] },
  { name: 'Managers', href: '/admin/business-management/managers', icon: UserCog, permission: 'managers.view', category: 'Shop Management', keywords: ['staff', 'employees', 'onboard'] },
  { name: 'Price Config', href: '/admin/business-management/price-config', icon: Tags, permission: 'priceconfig.view', category: 'Shop Management', keywords: ['pricing', 'rates', 'daily'] },
]

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { permissions, loading: permissionsLoading } = usePermissions()

  // Filter pages based on permissions
  const accessiblePages = allPages.filter(page => {
    if (!page.permission) return true
    if (permissionsLoading) return false
    return hasPermission(permissions, page.permission)
  })

  // Search results
  const results = query.trim()
    ? accessiblePages.filter(page => {
      const searchLower = query.toLowerCase()
      return (
        page.name.toLowerCase().includes(searchLower) ||
        page.category.toLowerCase().includes(searchLower) ||
        page.keywords.some(k => k.toLowerCase().includes(searchLower))
      )
    })
    : accessiblePages.slice(0, 8) // Show first 8 when no query

  // Keyboard shortcut to open search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault()
      navigateTo(results[selectedIndex].href)
    }
  }, [results, selectedIndex])

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current) {
      const selected = resultsRef.current.querySelector(`[data-index="${selectedIndex}"]`)
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  const navigateTo = (href: string) => {
    setIsOpen(false)
    router.push(href)
  }

  // Group results by category
  const groupedResults = results.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, SearchableItem[]>)

  return (
    <>
      {/* Search Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground bg-muted/30 border rounded-xl hover:bg-muted/50 transition-all min-w-[450px] shadow-sm hover:shadow-md border-gray-100"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search pages...</span>
        <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-background border rounded">
          <Command className="h-3 w-3" />K
        </kbd>
      </button>

      {/* Search Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal */}
          <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl mx-4">
            <div className="bg-background rounded-lg shadow-2xl border overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b">
                <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setSelectedIndex(0)
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search pages..."
                  className="flex-1 bg-transparent outline-none text-base placeholder:text-muted-foreground"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="p-1 hover:bg-muted rounded"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
                <kbd className="hidden sm:inline-flex px-2 py-0.5 text-xs bg-muted rounded">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div ref={resultsRef} className="max-h-[400px] overflow-y-auto p-2">
                {results.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No pages found for "{query}"</p>
                  </div>
                ) : (
                  Object.entries(groupedResults).map(([category, items]) => (
                    <div key={category} className="mb-2">
                      <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {category}
                      </div>
                      {items.map((item) => {
                        const globalIndex = results.indexOf(item)
                        const Icon = item.icon
                        return (
                          <button
                            key={item.href}
                            data-index={globalIndex}
                            onClick={() => navigateTo(item.href)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${selectedIndex === globalIndex
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted'
                              }`}
                          >
                            <Icon className={`h-4 w-4 flex-shrink-0 ${selectedIndex === globalIndex ? '' : 'text-muted-foreground'
                              }`} />
                            <span className="flex-1">{item.name}</span>
                            {selectedIndex === globalIndex && (
                              <span className="text-xs opacity-70">Enter ↵</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t bg-muted/30 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-background border rounded">↑</kbd>
                  <kbd className="px-1.5 py-0.5 bg-background border rounded">↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-background border rounded">↵</kbd>
                  Open
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-background border rounded">ESC</kbd>
                  Close
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
