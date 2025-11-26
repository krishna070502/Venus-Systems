'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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

interface ManualGroupAssignment {
  [permissionKey: string]: string // permission key -> group name
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
  const [manualAssignments, setManualAssignments] = useState<ManualGroupAssignment>({})
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false)

  // Load manual assignments from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('manual-permission-groups')
    if (stored) {
      try {
        setManualAssignments(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to load manual assignments:', e)
      }
    }
  }, [])

  // Save manual assignments to localStorage
  useEffect(() => {
    if (Object.keys(manualAssignments).length > 0) {
      localStorage.setItem('manual-permission-groups', JSON.stringify(manualAssignments))
    }
  }, [manualAssignments])

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

  // Group permissions based on sidebar structure + manual assignments
  const groupPermissions = (): PermissionGroup[] => {
    const groups: PermissionGroup[] = []

    // Helper to add manually assigned permissions to a group
    const getPermissionsForGroup = (groupName: string, autoPerms: Permission[]): Permission[] => {
      const autoPermKeys = new Set(autoPerms.map(p => p.key))
      const manualPerms = allPermissions.filter(p => 
        manualAssignments[p.key] === groupName && !autoPermKeys.has(p.key)
      )
      return [...autoPerms, ...manualPerms]
    }

    // System Administration Group
    const systemAdminAutoPerms = allPermissions.filter(p => 
      p.key.startsWith('system.') || 
      p.key.startsWith('users.') ||
      p.key.startsWith('roles.') ||
      p.key.startsWith('permissions.') ||
      p.key.startsWith('test.') ||
      p.key === 'systemadministration.view' ||
      p.key === 'systemdashboard.view'
    )
    const systemAdminPerms = getPermissionsForGroup('System Administration', systemAdminAutoPerms)
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
    const purchasesPayablesAutoPerms = allPermissions.filter(p =>
      p.key === 'purchase&payment.view' ||
      p.key.startsWith('purchase.') ||
      p.key.startsWith('supplier.') ||
      p.key.startsWith('payment.')
    )
    const purchasesPayablesPerms = getPermissionsForGroup('Purchases & Payables', purchasesPayablesAutoPerms)

    // Inventory Management
    const inventoryAutoPerms = allPermissions.filter(p =>
      p.key === 'inventory.view' ||
      p.key.startsWith('stock.') ||
      p.key.startsWith('wastage.') ||
      p.key.startsWith('adjustments.')
    )
    const inventoryPerms = getPermissionsForGroup('Inventory Management', inventoryAutoPerms)

    // Sales & Income
    const salesIncomeAutoPerms = allPermissions.filter(p =>
      p.key === 'salesincome.view' ||
      p.key.startsWith('sales.') ||
      p.key.startsWith('customer.') ||
      p.key.startsWith('receipt.')
    )
    const salesIncomePerms = getPermissionsForGroup('Sales & Income', salesIncomeAutoPerms)

    // Finance Management
    const financeAutoPerms = allPermissions.filter(p =>
      p.key === 'finance.view' ||
      p.key.startsWith('expense.') ||
      p.key.startsWith('cashbook.') ||
      p.key.startsWith('ledger.')
    )
    const financePerms = getPermissionsForGroup('Finance Management', financeAutoPerms)

    // Insights & Reports
    const reportsAutoPerms = allPermissions.filter(p =>
      p.key === 'analytics.view' ||
      p.key.startsWith('salesreport.') ||
      p.key.startsWith('purchasereport.') ||
      p.key.startsWith('expensereport.') ||
      p.key.startsWith('wastagereport.')
    )
    const reportsPerms = getPermissionsForGroup('Insights & Reports', reportsAutoPerms)

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
    const shopMgmtAutoPerms = allPermissions.filter(p =>
      p.key === 'shopmanagement.view' ||
      p.key.startsWith('shops.') ||
      p.key.startsWith('managers.') ||
      p.key.startsWith('priceconfig.')
    )
    const shopMgmtPerms = getPermissionsForGroup('Shop Management', shopMgmtAutoPerms)

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
    const docsAutoPerms = allPermissions.filter(p => p.key.startsWith('system.docs'))
    const docsPerms = getPermissionsForGroup('Documentation', docsAutoPerms)
    if (docsPerms.length > 0) {
      groups.push({
        name: 'Documentation',
        permissions: docsPerms
      })
    }

    return groups
  }

  const getUngroupedPermissions = (): Permission[] => {
    const groupedKeys = new Set<string>()
    const groups = groupPermissions()
    
    const collectKeys = (group: PermissionGroup) => {
      group.permissions.forEach(p => groupedKeys.add(p.key))
      if (group.subGroups) {
        group.subGroups.forEach(collectKeys)
      }
    }
    
    groups.forEach(collectKeys)
    return allPermissions.filter(p => !groupedKeys.has(p.key))
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

  const assignPermissionToGroup = (permissionKey: string, groupName: string) => {
    setManualAssignments(prev => ({
      ...prev,
      [permissionKey]: groupName
    }))
  }

  const removePermissionFromManualGroup = (permissionKey: string) => {
    setManualAssignments(prev => {
      const newAssignments = { ...prev }
      delete newAssignments[permissionKey]
      return newAssignments
    })
  }

  const getAllGroupNames = (): string[] => {
    const groups = groupPermissions()
    const names: string[] = []
    
    const collectNames = (group: PermissionGroup) => {
      names.push(group.name)
      if (group.subGroups) {
        group.subGroups.forEach(collectNames)
      }
    }
    
    groups.forEach(collectNames)
    return names
  }

  const getAutoAssignedGroup = (permissionKey: string): string | null => {
    const groups = groupPermissions()
    
    const findInGroup = (group: PermissionGroup): string | null => {
      if (group.permissions.some(p => p.key === permissionKey)) {
        return group.name
      }
      if (group.subGroups) {
        for (const subGroup of group.subGroups) {
          const found = findInGroup(subGroup)
          if (found) return found
        }
      }
      return null
    }
    
    for (const group of groups) {
      const found = findInGroup(group)
      if (found) return found
    }
    return null
  }

  const isPermissionAutoGrouped = (permissionKey: string): boolean => {
    return getAutoAssignedGroup(permissionKey) !== null
  }

  const renderPermissionItem = (permission: Permission, showGroupSelector: boolean = false) => {
    const isAssigned = localPermissions.includes(permission.key)
    const manualGroup = manualAssignments[permission.key]
    const autoGroup = getAutoAssignedGroup(permission.key)
    const currentGroup = manualGroup || autoGroup
    const isManuallyAssigned = !!manualGroup
    
    return (
      <div
        key={permission.id}
        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="font-mono text-sm font-medium">
              {permission.key}
            </div>
            {currentGroup && (
              <Badge variant={isManuallyAssigned ? "default" : "secondary"} className="text-xs">
                {currentGroup}
              </Badge>
            )}
          </div>
          {permission.description && (
            <div className="text-sm text-muted-foreground">
              {permission.description}
            </div>
          )}
        </div>
        <div className="flex gap-2 items-center">
          {showGroupSelector && (
            <div className="flex gap-2 items-center">
              <Select
                value={manualGroup || ''}
                onValueChange={(value) => assignPermissionToGroup(permission.key, value)}
              >
                <SelectTrigger className="w-[200px] h-9">
                  <SelectValue placeholder="Assign to group..." />
                </SelectTrigger>
                <SelectContent>
                  {getAllGroupNames().map(groupName => (
                    <SelectItem key={groupName} value={groupName}>
                      {groupName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isManuallyAssigned && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removePermissionFromManualGroup(permission.key)}
                  title="Remove from manual group"
                >
                  <ChevronRight className="h-4 w-4 rotate-90" />
                </Button>
              )}
            </div>
          )}
          <Button
            size="sm"
            variant={isAssigned ? 'default' : 'outline'}
            onClick={() => handleToggle(permission, isAssigned)}
            disabled={loading}
          >
            {isAssigned ? 'Assigned' : 'Assign'}
          </Button>
        </div>
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

  const ungroupedPermissions = getUngroupedPermissions()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-[95vw] max-h-[95vh] flex flex-col">
        <CardHeader>
          <CardTitle>Manage Permissions for {roleName}</CardTitle>
          <CardDescription>
            Select which permissions this role should have. Permissions are automatically grouped, and you can manually assign ungrouped permissions to any group.
          </CardDescription>
          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search permissions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button
                variant={showUnassignedOnly ? 'default' : 'outline'}
                onClick={() => setShowUnassignedOnly(!showUnassignedOnly)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ungrouped ({ungroupedPermissions.length})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          {searchQuery ? (
            <div className="space-y-2">
              {filteredPermissions.length > 0 ? (
                filteredPermissions.map(p => renderPermissionItem(p, true))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No permissions found matching "{searchQuery}"
                </div>
              )}
            </div>
          ) : showUnassignedOnly ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Ungrouped Permissions</h3>
                <p className="text-sm text-blue-800 mb-3">
                  These permissions are not automatically grouped. Use the dropdown to assign them to a group.
                </p>
              </div>
              {ungroupedPermissions.length > 0 ? (
                <div className="space-y-2">
                  {ungroupedPermissions.map(p => renderPermissionItem(p, true))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  All permissions are grouped!
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {permissionGroups.map(group => renderPermissionGroup(group))}
              
              {ungroupedPermissions.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-amber-900">Ungrouped Permissions</h3>
                        <p className="text-sm text-amber-800 mt-1">
                          {ungroupedPermissions.length} permissions need to be assigned to a group
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setShowUnassignedOnly(true)}
                        variant="outline"
                      >
                        View All
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <div className="p-6 border-t flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {localPermissions.length} permissions assigned
            {Object.keys(manualAssignments).length > 0 && (
              <span className="ml-2">• {Object.keys(manualAssignments).length} manually grouped</span>
            )}
          </div>
          <Button onClick={onClose}>
            Done
          </Button>
        </div>
      </Card>
    </div>
  )
}
