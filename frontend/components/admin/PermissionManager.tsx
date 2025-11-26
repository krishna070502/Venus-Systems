'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface Permission {
  id: number
  key: string
  description?: string
}

interface PermissionManagerProps {
  roleId: number
  roleName: string
  currentPermissions: string[]
  allPermissions: Permission[]
  onClose: () => void
  onAssign: (permissionId: number) => Promise<void>
  onRemove: (permissionId: number) => Promise<void>
}

interface PermissionGroup {
  name: string
  permissions: Permission[]
  subGroups?: PermissionGroup[]
}

export default function PermissionManager({
  roleId,
  roleName,
  currentPermissions,
  allPermissions,
  onClose,
  onAssign,
  onRemove,
}: PermissionManagerProps) {
  const [loading, setLoading] = useState(false)
  const [localPermissions, setLocalPermissions] = useState<string[]>(currentPermissions)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  // Update local state when props change
  useEffect(() => {
    setLocalPermissions(currentPermissions)
  }, [currentPermissions])

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupName)) {
        newSet.delete(groupName)
      } else {
        newSet.add(groupName)
      }
      return newSet
    })
  }

  // Group permissions based on sidebar structure
  const groupPermissions = (): PermissionGroup[] => {
    const groups: PermissionGroup[] = []

    // System Administration Group
    const systemAdminPerms = allPermissions.filter(p => 
      p.key.startsWith('system.') || 
      p.key.startsWith('users.') ||
      p.key.startsWith('roles.') ||
      p.key.startsWith('permissions.') ||
      p.key.startsWith('test.') ||
      p.key === 'systemadministration.view' ||
      p.key === 'systemdashboard.view'
    )
    if (systemAdminPerms.length > 0) {
      groups.push({
        name: 'System Administration',
        permissions: systemAdminPerms
      })
    }

    // Business Group with nested sub-groups
    const businessPerms = allPermissions.filter(p => 
      p.key === 'business.view' || p.key === 'businessdashboard.view'
    )

    // Purchases & Payables
    const purchasesPayablesPerms = allPermissions.filter(p =>
      p.key === 'purchase&payment.view' ||
      p.key.startsWith('purchase.') ||
      p.key.startsWith('supplier.') ||
      p.key.startsWith('payment.')
    )

    // Inventory Management
    const inventoryPerms = allPermissions.filter(p =>
      p.key === 'inventory.view' ||
      p.key.startsWith('stock.') ||
      p.key.startsWith('wastage.') ||
      p.key.startsWith('adjustments.')
    )

    // Sales & Income
    const salesIncomePerms = allPermissions.filter(p =>
      p.key === 'salesincome.view' ||
      p.key.startsWith('sales.') ||
      p.key.startsWith('customer.') ||
      p.key.startsWith('receipt.')
    )

    // Finance Management
    const financePerms = allPermissions.filter(p =>
      p.key === 'finance.view' ||
      p.key.startsWith('expense.') ||
      p.key.startsWith('cashbook.') ||
      p.key.startsWith('ledger.')
    )

    // Insights & Reports
    const reportsPerms = allPermissions.filter(p =>
      p.key === 'analytics.view' ||
      p.key.startsWith('salesreport.') ||
      p.key.startsWith('purchasereport.') ||
      p.key.startsWith('expensereport.') ||
      p.key.startsWith('wastagereport.')
    )

    const businessSubGroups: PermissionGroup[] = []
    if (purchasesPayablesPerms.length > 0) {
      businessSubGroups.push({ name: 'Purchases & Payables', permissions: purchasesPayablesPerms })
    }
    if (inventoryPerms.length > 0) {
      businessSubGroups.push({ name: 'Inventory Management', permissions: inventoryPerms })
    }
    if (salesIncomePerms.length > 0) {
      businessSubGroups.push({ name: 'Sales & Income', permissions: salesIncomePerms })
    }
    if (financePerms.length > 0) {
      businessSubGroups.push({ name: 'Finance Management', permissions: financePerms })
    }
    if (reportsPerms.length > 0) {
      businessSubGroups.push({ name: 'Insights & Reports', permissions: reportsPerms })
    }

    if (businessPerms.length > 0 || businessSubGroups.length > 0) {
      groups.push({
        name: 'Business',
        permissions: businessPerms,
        subGroups: businessSubGroups
      })
    }

    // Business Management Group with nested sub-groups
    const businessMgmtPerms = allPermissions.filter(p => 
      p.key === 'businessmanagement.view'
    )

    // Shop Management
    const shopMgmtPerms = allPermissions.filter(p =>
      p.key === 'shopmanagement.view' ||
      p.key.startsWith('shops.') ||
      p.key.startsWith('managers.') ||
      p.key.startsWith('priceconfig.')
    )

    const businessMgmtSubGroups: PermissionGroup[] = []
    if (shopMgmtPerms.length > 0) {
      businessMgmtSubGroups.push({ name: 'Shop Management', permissions: shopMgmtPerms })
    }

    if (businessMgmtPerms.length > 0 || businessMgmtSubGroups.length > 0) {
      groups.push({
        name: 'Business Management',
        permissions: businessMgmtPerms,
        subGroups: businessMgmtSubGroups
      })
    }

    // Documentation
    const docsPerms = allPermissions.filter(p => p.key.startsWith('system.docs'))
    if (docsPerms.length > 0) {
      groups.push({
        name: 'Documentation',
        permissions: docsPerms
      })
    }

    return groups
  }

  const handleToggle = async (permission: Permission, isAssigned: boolean) => {
    setLoading(true)
    try {
      if (isAssigned) {
        // Optimistically update UI
        setLocalPermissions(prev => prev.filter(p => p !== permission.key))
        await onRemove(permission.id)
      } else {
        // Optimistically update UI
        setLocalPermissions(prev => [...prev, permission.key])
        await onAssign(permission.id)
      }
    } catch (error) {
      console.error('Failed to toggle permission:', error)
      // Revert on error
      setLocalPermissions(currentPermissions)
    } finally {
      setLoading(false)
    }
  }

  const renderPermissionItem = (permission: Permission) => {
    const isAssigned = localPermissions.includes(permission.key)
    return (
      <div
        key={permission.id}
        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
      >
        <div className="flex-1">
          <div className="font-mono text-sm font-medium">
            {permission.key}
          </div>
          {permission.description && (
            <div className="text-sm text-muted-foreground">
              {permission.description}
            </div>
          )}
        </div>
        <Button
          size="sm"
          variant={isAssigned ? 'default' : 'outline'}
          onClick={() => handleToggle(permission, isAssigned)}
          disabled={loading}
        >
          {isAssigned ? 'Assigned' : 'Assign'}
        </Button>
      </div>
    )
  }

  const renderPermissionGroup = (group: PermissionGroup, level: number = 0) => {
    const isExpanded = expandedGroups.has(group.name)
    const hasContent = group.permissions.length > 0 || (group.subGroups && group.subGroups.length > 0)

    if (!hasContent) return null

    return (
      <div key={group.name} className={level > 0 ? 'ml-4' : ''}>
        <button
          onClick={() => toggleGroup(group.name)}
          className="flex items-center gap-2 w-full p-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-left transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span>{group.name}</span>
          <Badge variant="secondary" className="ml-auto">
            {group.permissions.length + (group.subGroups?.reduce((acc, sg) => acc + sg.permissions.length, 0) || 0)}
          </Badge>
        </button>

        {isExpanded && (
          <div className="mt-2 space-y-2">
            {group.permissions.map(renderPermissionItem)}
            
            {group.subGroups && group.subGroups.length > 0 && (
              <div className="space-y-2 mt-2">
                {group.subGroups.map(subGroup => renderPermissionGroup(subGroup, level + 1))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Filter permissions based on search query
  const filteredPermissions = allPermissions.filter(p => 
    p.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Use filtered permissions if searching, otherwise use grouped permissions
  const permissionGroups = searchQuery ? [] : groupPermissions()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-[95vw] max-h-[95vh] flex flex-col">
        <CardHeader>
          <CardTitle>Manage Permissions for {roleName}</CardTitle>
          <CardDescription>
            Select which permissions this role should have. Permissions are grouped by section.
          </CardDescription>
          <div className="mt-4">
            <input
              type="text"
              placeholder="Search permissions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          {searchQuery ? (
            <div className="space-y-2">
              {filteredPermissions.length > 0 ? (
                filteredPermissions.map(renderPermissionItem)
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No permissions found matching "{searchQuery}"
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {permissionGroups.map(group => renderPermissionGroup(group))}
            </div>
          )}
        </CardContent>
        <div className="p-6 border-t flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {localPermissions.length} permissions assigned
          </div>
          <Button onClick={onClose}>
            Done
          </Button>
        </div>
      </Card>
    </div>
  )
}
