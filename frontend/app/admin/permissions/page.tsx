'use client'

import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api/client'
import { useAlert } from '@/components/ui/alert-modal'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import EditPermissionDialog from '@/components/admin/EditPermissionDialog'
import CreatePermissionDialog from '@/components/admin/CreatePermissionDialog'
import { PageLoading } from '@/components/ui/loading'
import { ChevronDown, ChevronRight, Search, FolderOpen, Key, Shield, Columns, Info, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// Field configuration for permissions page
const FIELD_CONFIG = {
  key: { label: 'Permission Key', permission: 'permissions.field.key' },
  description: { label: 'Description', permission: 'permissions.field.description' },
  group: { label: 'Group Info', permission: 'permissions.field.group' },
} as const

type FieldKey = keyof typeof FIELD_CONFIG

// Action permissions for the page
const ACTION_PERMISSIONS = {
  create: 'permissions.action.create',
  edit: 'permissions.action.edit',
  delete: 'permissions.action.delete',
  search: 'permissions.action.search',
  expand: 'permissions.action.expand',
  export: 'permissions.action.export',
} as const

interface Permission {
  id: number
  key: string
  description?: string
}

interface PermissionGroup {
  name: string
  displayName: string
  permissions: Permission[]
}

// Map permission prefixes to display names and categories
const GROUP_CONFIG: Record<string, { displayName: string; category: string }> = {
  // System Administration
  'system': { displayName: 'System', category: 'System Administration' },
  'systemadministration': { displayName: 'System Administration', category: 'System Administration' },
  'systemdashboard': { displayName: 'System Dashboard', category: 'System Administration' },
  'users': { displayName: 'Users', category: 'System Administration' },
  'users.field': { displayName: 'Users - Field Permissions', category: 'System Administration' },
  'users.action': { displayName: 'Users - Action Permissions', category: 'System Administration' },
  'roles': { displayName: 'Roles', category: 'System Administration' },
  'roles.field': { displayName: 'Roles - Field Permissions', category: 'System Administration' },
  'roles.action': { displayName: 'Roles - Action Permissions', category: 'System Administration' },
  'logs': { displayName: 'Logs', category: 'System Administration' },
  'logs.field': { displayName: 'Logs - Field Permissions', category: 'System Administration' },
  'logs.action': { displayName: 'Logs - Action Permissions', category: 'System Administration' },
  'permissions': { displayName: 'Permissions', category: 'System Administration' },
  'permissions.field': { displayName: 'Permissions - Field Permissions', category: 'System Administration' },
  'permissions.action': { displayName: 'Permissions - Action Permissions', category: 'System Administration' },
  'test': { displayName: 'Test', category: 'System Administration' },
  'gsearchbar': { displayName: 'Global Search', category: 'System Administration' },

  // Business
  'business': { displayName: 'Business', category: 'Business' },
  'businessdashboard': { displayName: 'Business Dashboard', category: 'Business' },
  'purchase&payment': { displayName: 'Purchases & Payables', category: 'Business' },
  'purchase': { displayName: 'Purchases', category: 'Business' },
  'supplier': { displayName: 'Suppliers', category: 'Business' },
  'payment': { displayName: 'Payments', category: 'Business' },
  'inventory': { displayName: 'Inventory', category: 'Business' },
  'inventoryitems': { displayName: 'Inventory Items', category: 'Business' },
  'stock': { displayName: 'Stock', category: 'Business' },
  'wastage': { displayName: 'Wastage', category: 'Business' },
  'adjustments': { displayName: 'Adjustments', category: 'Business' },
  'salesincome': { displayName: 'Sales & Income', category: 'Business' },
  'sales': { displayName: 'Sales', category: 'Business' },
  'customer': { displayName: 'Customers', category: 'Business' },
  'receipt': { displayName: 'Receipts', category: 'Business' },
  'finance': { displayName: 'Finance', category: 'Business' },
  'expense': { displayName: 'Expenses', category: 'Business' },
  'cashbook': { displayName: 'Cashbook', category: 'Business' },
  'ledger': { displayName: 'Ledger', category: 'Business' },
  'analytics': { displayName: 'Analytics', category: 'Business' },
  'salesreport': { displayName: 'Sales Reports', category: 'Business' },
  'purchasereport': { displayName: 'Purchase Reports', category: 'Business' },
  'expensereport': { displayName: 'Expense Reports', category: 'Business' },
  'wastagereport': { displayName: 'Wastage Reports', category: 'Business' },

  // Business Management
  'businessmanagement': { displayName: 'Business Management', category: 'Business Management' },
  'shopmanagement': { displayName: 'Shop Management', category: 'Business Management' },
  'shops': { displayName: 'Shops', category: 'Business Management' },
  'managers': { displayName: 'Managers', category: 'Business Management' },
  'priceconfig': { displayName: 'Price Config', category: 'Business Management' },

  // Personal Home
  'dashboard': { displayName: 'Personal Home', category: 'Personal Home' },
  'dashboard.widget': { displayName: 'Personal Home - Widgets', category: 'Personal Home' },
}

const CATEGORY_ORDER = ['System Administration', 'Business', 'Business Management', 'Personal Home', 'Other']

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])
  const [expandedCategories, setExpandedCategories] = useState<string[]>(CATEGORY_ORDER)
  const [visibleFields, setVisibleFields] = useState<Set<FieldKey>>(new Set<FieldKey>(['key', 'description', 'group']))
  const [showPermissionsInfo, setShowPermissionsInfo] = useState(false)
  const { showError, showSuccess, showConfirm } = useAlert()
  const { permissions: userPermissions, loading: permissionsLoading } = usePermissions()

  // Check field permissions
  const canViewField = (field: FieldKey) => {
    if (permissionsLoading) return false
    const permission = FIELD_CONFIG[field].permission
    return hasPermission(userPermissions, permission)
  }

  // Check action permissions
  const canCreate = !permissionsLoading && hasPermission(userPermissions, ACTION_PERMISSIONS.create)
  const canEdit = !permissionsLoading && hasPermission(userPermissions, ACTION_PERMISSIONS.edit)
  const canDelete = !permissionsLoading && hasPermission(userPermissions, ACTION_PERMISSIONS.delete)
  const canSearch = !permissionsLoading && hasPermission(userPermissions, ACTION_PERMISSIONS.search)
  const canExpand = !permissionsLoading && hasPermission(userPermissions, ACTION_PERMISSIONS.expand)
  const canExport = !permissionsLoading && hasPermission(userPermissions, ACTION_PERMISSIONS.export)

  // Toggle field visibility
  const toggleField = (field: FieldKey) => {
    setVisibleFields(prev => {
      const newSet = new Set(prev)
      if (newSet.has(field)) {
        newSet.delete(field)
      } else {
        newSet.add(field)
      }
      return newSet
    })
  }

  // Check if field is visible (must have permission AND be toggled on)
  const isFieldVisible = (field: FieldKey) => canViewField(field) && visibleFields.has(field)

  useEffect(() => {
    loadPermissions()
  }, [])

  const loadPermissions = async () => {
    try {
      const data = await api.permissions.getAll() as Permission[]
      setPermissions(data)
    } catch (error) {
      console.error('Failed to load permissions:', error)
      showError((error as Error).message, 'Failed to load permissions')
    } finally {
      setLoading(false)
    }
  }

  // Group permissions by their prefix
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {}

    permissions.forEach(permission => {
      // Extract the prefix (everything before the last dot)
      const parts = permission.key.split('.')
      const prefix = parts.length > 1 ? parts.slice(0, -1).join('.') : permission.key

      if (!groups[prefix]) {
        groups[prefix] = []
      }
      groups[prefix].push(permission)
    })

    // Convert to array and sort
    return Object.entries(groups).map(([name, perms]) => ({
      name,
      displayName: GROUP_CONFIG[name]?.displayName || name.charAt(0).toUpperCase() + name.slice(1),
      category: GROUP_CONFIG[name]?.category || 'Other',
      permissions: perms.sort((a, b) => a.key.localeCompare(b.key))
    })).sort((a, b) => a.displayName.localeCompare(b.displayName))
  }, [permissions])

  // Group by category
  const categorizedGroups = useMemo(() => {
    const categories: Record<string, PermissionGroup[]> = {}

    groupedPermissions.forEach(group => {
      const category = group.category
      if (!categories[category]) {
        categories[category] = []
      }
      categories[category].push(group)
    })

    return categories
  }, [groupedPermissions])

  // Filter permissions based on search
  const filteredCategorizedGroups = useMemo(() => {
    if (!searchQuery) return categorizedGroups

    const filtered: Record<string, PermissionGroup[]> = {}

    Object.entries(categorizedGroups).forEach(([category, groups]) => {
      const filteredGroups = groups.map(group => ({
        ...group,
        permissions: group.permissions.filter(p =>
          p.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      })).filter(g => g.permissions.length > 0)

      if (filteredGroups.length > 0) {
        filtered[category] = filteredGroups
      }
    })

    return filtered
  }, [categorizedGroups, searchQuery])

  const toggleGroup = (groupName: string) => {
    if (!canExpand) return
    setExpandedGroups(prev =>
      prev.includes(groupName)
        ? prev.filter(n => n !== groupName)
        : [...prev, groupName]
    )
  }

  const toggleCategory = (category: string) => {
    if (!canExpand) return
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(n => n !== category)
        : [...prev, category]
    )
  }

  const expandAll = () => {
    if (!canExpand) return
    setExpandedCategories(CATEGORY_ORDER)
    setExpandedGroups(groupedPermissions.map(g => g.name))
  }

  const collapseAll = () => {
    if (!canExpand) return
    setExpandedCategories([])
    setExpandedGroups([])
  }

  const handleCreatePermission = () => {
    setShowCreateDialog(true)
  }

  const handleCreate = async (key: string, description: string) => {
    await api.permissions.create({ key, description })
    await loadPermissions()
  }

  const handleEditPermission = (permission: Permission) => {
    setEditingPermission(permission)
  }

  const handleSavePermission = async (key: string, description: string) => {
    if (!editingPermission) return
    await api.permissions.update(editingPermission.id, { key, description })
    await loadPermissions()
  }

  const handleDeletePermission = (permission: Permission) => {
    showConfirm(
      `Are you sure you want to delete permission "${permission.key}"? This action cannot be undone.`,
      async () => {
        try {
          await api.permissions.delete(permission.id)
          showSuccess('Permission deleted successfully')
          loadPermissions()
        } catch (error) {
          showError((error as Error).message, 'Failed to delete permission')
        }
      },
      'Delete Permission'
    )
  }

  // Count total permissions
  const totalPermissions = permissions.length
  const totalGroups = groupedPermissions.length
  const totalCategories = Object.keys(categorizedGroups).length

  if (loading) {
    return <PageLoading text="Loading permissions..." />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">Permissions</h1>
            {/* Info Button */}
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-8 w-8 bg-blue-50 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:hover:bg-blue-900/40"
              onClick={() => setShowPermissionsInfo(true)}
              title="View your permissions"
            >
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </Button>
          </div>
          <p className="text-muted-foreground mt-2">
            Manage granular permissions for roles
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Column Toggle Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns className="h-4 w-4 mr-2" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.keys(FIELD_CONFIG) as FieldKey[]).map((field) => (
                <DropdownMenuCheckboxItem
                  key={field}
                  checked={visibleFields.has(field)}
                  onCheckedChange={() => toggleField(field)}
                  disabled={!canViewField(field)}
                >
                  {FIELD_CONFIG[field].label}
                  {!canViewField(field) && (
                    <span className="ml-2 text-xs text-muted-foreground">(No access)</span>
                  )}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {canCreate && (
            <Button onClick={handleCreatePermission}>Create Permission</Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Key className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPermissions}</p>
                <p className="text-sm text-muted-foreground">Total Permissions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <FolderOpen className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalGroups}</p>
                <p className="text-sm text-muted-foreground">Permission Groups</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCategories}</p>
                <p className="text-sm text-muted-foreground">Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Permissions</CardTitle>
              <CardDescription>
                Permissions are grouped by module and category
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {canExpand && (
                <>
                  <Button variant="outline" size="sm" onClick={expandAll}>
                    Expand All
                  </Button>
                  <Button variant="outline" size="sm" onClick={collapseAll}>
                    Collapse All
                  </Button>
                </>
              )}
            </div>
          </div>
          {canSearch && (
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search permissions by key or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {CATEGORY_ORDER.map(category => {
            const groups = filteredCategorizedGroups[category]
            if (!groups || groups.length === 0) return null

            const isCategoryExpanded = expandedCategories.includes(category)
            const categoryPermissionCount = groups.reduce((sum, g) => sum + g.permissions.length, 0)

            return (
              <div key={category} className="border rounded-lg overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isCategoryExpanded ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                    <span className="font-semibold text-lg">{category}</span>
                    <Badge variant="secondary">{categoryPermissionCount} permissions</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">{groups.length} groups</span>
                </button>

                {/* Category Content */}
                {isCategoryExpanded && (
                  <div className="divide-y">
                    {groups.map(group => {
                      const isGroupExpanded = expandedGroups.includes(group.name)

                      return (
                        <div key={group.name}>
                          {/* Group Header */}
                          <button
                            onClick={() => toggleGroup(group.name)}
                            className="w-full flex items-center justify-between px-6 py-2 hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              {isGroupExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <FolderOpen className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{group.displayName}</span>
                              <Badge variant="outline" className="text-xs">
                                {group.permissions.length}
                              </Badge>
                            </div>
                            <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                              {group.name}.*
                            </code>
                          </button>

                          {/* Permissions Table */}
                          {isGroupExpanded && (
                            <div className="px-6 pb-3">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    {isFieldVisible('key') && (
                                      <TableHead className="w-[300px]">Permission Key</TableHead>
                                    )}
                                    {isFieldVisible('description') && (
                                      <TableHead>Description</TableHead>
                                    )}
                                    {(canEdit || canDelete) && (
                                      <TableHead className="w-[150px]">Actions</TableHead>
                                    )}
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {group.permissions.map((permission) => (
                                    <TableRow key={permission.id}>
                                      {isFieldVisible('key') && (
                                        <TableCell>
                                          <code className="text-sm bg-muted px-2 py-1 rounded">
                                            {permission.key}
                                          </code>
                                        </TableCell>
                                      )}
                                      {isFieldVisible('description') && (
                                        <TableCell className="text-muted-foreground">
                                          {permission.description || '-'}
                                        </TableCell>
                                      )}
                                      {(canEdit || canDelete) && (
                                        <TableCell>
                                          <div className="flex gap-2">
                                            {canEdit && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEditPermission(permission)}
                                              >
                                                Edit
                                              </Button>
                                            )}
                                            {canDelete && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeletePermission(permission)}
                                                className="text-red-600 hover:text-red-700"
                                              >
                                                Delete
                                              </Button>
                                            )}
                                          </div>
                                        </TableCell>
                                      )}
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {Object.keys(filteredCategorizedGroups).length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No permissions found matching "{searchQuery}"</p>
            </div>
          )}
        </CardContent>
      </Card>

      {editingPermission && (
        <EditPermissionDialog
          permission={editingPermission}
          onClose={() => setEditingPermission(null)}
          onSave={handleSavePermission}
        />
      )}

      {showCreateDialog && (
        <CreatePermissionDialog
          onClose={() => setShowCreateDialog(false)}
          onCreate={handleCreate}
        />
      )}

      {/* Permissions Info Modal */}
      {showPermissionsInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-blue-600" />
                    Your Permissions - Permissions Page
                  </CardTitle>
                  <CardDescription>
                    Overview of your access level for the Permissions management page
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowPermissionsInfo(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Actions */}
              <div>
                <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">Actions</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'create', label: 'Create Permission', allowed: canCreate },
                    { key: 'edit', label: 'Edit Permission', allowed: canEdit },
                    { key: 'delete', label: 'Delete Permission', allowed: canDelete },
                    { key: 'search', label: 'Search/Filter', allowed: canSearch },
                    { key: 'expand', label: 'Expand/Collapse Groups', allowed: canExpand },
                    { key: 'export', label: 'Export Data', allowed: canExport },
                  ].map((action) => (
                    <div
                      key={action.key}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-lg border",
                        action.allowed
                          ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                          : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                      )}
                    >
                      <span className="text-sm">{action.label}</span>
                      {action.allowed ? (
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Visible Columns */}
              <div>
                <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">Visible Columns</h4>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(FIELD_CONFIG) as FieldKey[]).map((field) => {
                    const hasAccess = canViewField(field)
                    return (
                      <div
                        key={field}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 rounded-lg border",
                          hasAccess
                            ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                            : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                        )}
                      >
                        <span className="text-sm">{FIELD_CONFIG[field].label}</span>
                        {hasAccess ? (
                          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
