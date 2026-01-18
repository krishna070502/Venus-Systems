'use client'

import { useMemo } from 'react'
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
    Home,
    ArrowRightLeft,
} from 'lucide-react'

export interface AvailablePage {
    name: string
    href: string
    icon: any
    permission?: string
    category: string
}

// Icon mapping for serialization
export const PAGE_ICONS: Record<string, any> = {
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
    Home,
    ArrowRightLeft,
}

// All available pages with their permissions - mirrors Sidebar structure
const ALL_PAGES: AvailablePage[] = [
    // Home
    { name: 'Home', href: '/admin/home', icon: Home, category: 'General' },

    // System Administration
    { name: 'System Dashboard', href: '/admin', icon: LayoutDashboard, permission: 'systemdashboard.view', category: 'System' },
    { name: 'Users', href: '/admin/users', icon: Users, permission: 'users.read', category: 'System' },
    { name: 'AI Config', href: '/admin/ai-settings', icon: Bot, permission: 'ai.admin', category: 'System' },
    { name: 'Roles', href: '/admin/roles', icon: ShieldCheck, permission: 'roles.read', category: 'System' },
    { name: 'Permissions', href: '/admin/permissions', icon: Key, permission: 'permissions.read', category: 'System' },
    { name: 'Health', href: '/admin/health', icon: Activity, permission: 'system.admin', category: 'System' },
    { name: 'Settings', href: '/admin/settings', icon: Settings, permission: 'system.settings', category: 'System' },
    { name: 'Logs', href: '/admin/logs', icon: FileText, permission: 'system.logs', category: 'System' },
    { name: 'Activity Logs', href: '/admin/activity-logs', icon: Activity, permission: 'system.logs', category: 'System' },

    // Business Dashboard
    { name: 'Business Dashboard', href: '/admin/business', icon: Activity, permission: 'businessdashboard.view', category: 'Business' },

    // Purchases & Payables
    { name: 'Purchases', href: '/admin/business/purchases', icon: ShoppingCart, permission: 'purchases.sidebar', category: 'Purchases' },
    { name: 'Suppliers', href: '/admin/business/suppliers', icon: Truck, permission: 'suppliers.sidebar', category: 'Purchases' },
    { name: 'Payments', href: '/admin/business/payments', icon: CreditCard, permission: 'payment.sidebar', category: 'Purchases' },

    // Inventory Management
    { name: 'Stock', href: '/admin/business/inventory/stock', icon: Box, permission: 'inventory.stock.sidebar', category: 'Inventory' },
    { name: 'Processing', href: '/admin/business/inventory/processing', icon: RefreshCw, permission: 'processing.sidebar', category: 'Inventory' },
    { name: 'SKUs', href: '/admin/business/skus', icon: Tags, permission: 'skus.sidebar', category: 'Inventory' },
    { name: 'Wastage', href: '/admin/business/inventory/wastage', icon: Trash2, permission: 'wastageconfig.sidebar', category: 'Inventory' },
    { name: 'Adjustments', href: '/admin/business/inventory/adjustments', icon: ClipboardEdit, permission: 'inventory.adjustments.sidebar', category: 'Inventory' },
    { name: 'Transfers', href: '/admin/business/inventory/transfers', icon: ArrowRightLeft, permission: 'inventory.transfer.view', category: 'Inventory' },

    // Sales & Income
    { name: 'POS', href: '/admin/business/sales/pos', icon: ShoppingCart, permission: 'sales.pos.sidebar', category: 'Sales' },
    { name: 'Sales', href: '/admin/business/sales', icon: TrendingUp, permission: 'sales.history.sidebar', category: 'Sales' },
    { name: 'Customers', href: '/admin/business/customers', icon: UserCheck, permission: 'customer.view', category: 'Sales' },
    { name: 'Receipts', href: '/admin/business/receipts', icon: FileCheck, permission: 'receipt.view', category: 'Sales' },

    // Finance Management
    { name: 'Expenses', href: '/admin/business/finance/expenses', icon: Banknote, permission: 'expense.view', category: 'Finance' },
    { name: 'Cashbook', href: '/admin/business/finance/cashbook', icon: Wallet, permission: 'cashbook.view', category: 'Finance' },
    { name: 'Ledger', href: '/admin/business/finance/ledger', icon: BookOpenCheck, permission: 'inventory.ledger.sidebar', category: 'Finance' },
    { name: 'Settlements', href: '/admin/business/settlements', icon: Calculator, permission: 'settlements.sidebar', category: 'Finance' },
    { name: 'Variance', href: '/admin/business/variance', icon: AlertCircle, permission: 'variance.sidebar', category: 'Finance' },

    // Reports
    { name: 'Sales Reports', href: '/admin/business/reports/sales', icon: LineChart, permission: 'salesreport.view', category: 'Reports' },
    { name: 'Purchase Reports', href: '/admin/business/reports/purchase', icon: PieChart, permission: 'purchasereport.view', category: 'Reports' },
    { name: 'Expense Reports', href: '/admin/business/reports/expense', icon: FileBarChart, permission: 'expensereport.view', category: 'Reports' },
    { name: 'Wastage Reports', href: '/admin/business/reports/wastage', icon: Trash2, permission: 'wastagereport.view', category: 'Reports' },

    // Staff Performance
    { name: 'Staff Points', href: '/admin/business/staff-points', icon: Award, permission: 'staffpoints.sidebar', category: 'Staff' },
    { name: 'Leaderboard', href: '/admin/business/staff-points/leaderboard', icon: Trophy, permission: 'staffleaderboard.sidebar', category: 'Staff' },

    // Shop Management
    { name: 'Shops', href: '/admin/business-management/shops', icon: Store, permission: 'shops.view', category: 'Management' },
    { name: 'Managers', href: '/admin/business-management/managers', icon: UserCog, permission: 'managers.view', category: 'Management' },
    { name: 'Price Config', href: '/admin/business-management/price-config', icon: Tags, permission: 'priceconfig.view', category: 'Management' },

    // Docs
    { name: 'Documentation', href: '/admin/docs', icon: BookOpen, permission: 'system.docs', category: 'Help' },
]

/**
 * Hook to get available pages based on user permissions.
 * Returns only pages the current user has permission to access.
 */
export function useAvailablePages() {
    const { permissions, loading } = usePermissions()

    const availablePages = useMemo(() => {
        if (loading) return []

        return ALL_PAGES.filter(page => {
            // Pages without permission requirement are always available
            if (!page.permission) return true
            // Check if user has the required permission
            return hasPermission(permissions, page.permission)
        })
    }, [permissions, loading])

    // Group pages by category
    const groupedPages = useMemo(() => {
        const groups: Record<string, AvailablePage[]> = {}

        availablePages.forEach(page => {
            if (!groups[page.category]) {
                groups[page.category] = []
            }
            groups[page.category].push(page)
        })

        return groups
    }, [availablePages])

    return {
        pages: availablePages,
        groupedPages,
        loading
    }
}

/**
 * Get icon name from icon component for serialization
 */
export function getIconName(icon: any): string {
    for (const [name, component] of Object.entries(PAGE_ICONS)) {
        if (component === icon) return name
    }
    return 'Home'
}
