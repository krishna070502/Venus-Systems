'use client'

import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api/client'
import { useAlert } from '@/components/ui/alert-modal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import PermissionManager from '@/components/admin/PermissionManager'
import EditRoleDialog from '@/components/admin/EditRoleDialog'
import CreateRoleDialog from '@/components/admin/CreateRoleDialog'
import { PageLoading } from '@/components/ui/loading'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import { Settings2, Eye, EyeOff, Copy, Download, Shield, Users, Calendar, FileText, Key, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Role {
  id: number
  name: string
  description?: string
  permissions?: string[]
  user_count?: number
  created_at?: string
}

interface Permission {
  id: number
  key: string
  description?: string
}

// Field configuration with permission keys
const FIELD_CONFIG = {
  name: {
    key: 'roles.field.name',
    label: 'Name',
    icon: Shield,
    defaultVisible: true,
  },
  description: {
    key: 'roles.field.description',
    label: 'Description',
    icon: FileText,
    defaultVisible: true,
  },
  permissions: {
    key: 'roles.field.permissions',
    label: 'Permissions',
    icon: Key,
    defaultVisible: true,
  },
  usercount: {
    key: 'roles.field.usercount',
    label: 'Users',
    icon: Users,
    defaultVisible: false,
  },
  createdat: {
    key: 'roles.field.createdat',
    label: 'Created',
    icon: Calendar,
    defaultVisible: false,
  },
}

type FieldKey = keyof typeof FIELD_CONFIG

export default function RolesPage() {
  return (
    <PermissionGuard permission="roles.read">
      <RolesPageContent />
    </PermissionGuard>
  )
}

function RolesPageContent() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showPermissionsInfo, setShowPermissionsInfo] = useState(false)
  const [visibleFields, setVisibleFields] = useState<Set<FieldKey>>(new Set(['name', 'description', 'permissions']))
  const [viewingPermissionsRole, setViewingPermissionsRole] = useState<Role | null>(null)

  const { permissions: userPermissions, loading: permissionsLoading } = usePermissions()
  const { showError, showSuccess, showConfirm } = useAlert()

  // Check field-level permissions
  const canViewField = (fieldKey: FieldKey): boolean => {
    if (permissionsLoading) return false
    const config = FIELD_CONFIG[fieldKey]
    return hasPermission(userPermissions, config.key)
  }

  // Check action permissions
  const canEdit = !permissionsLoading && hasPermission(userPermissions, 'roles.action.edit')
  const canDelete = !permissionsLoading && hasPermission(userPermissions, 'roles.action.delete')
  const canManagePermissions = !permissionsLoading && hasPermission(userPermissions, 'roles.action.managepermissions')
  const canViewPermissions = !permissionsLoading && hasPermission(userPermissions, 'roles.action.viewpermissions')
  const canDuplicate = !permissionsLoading && hasPermission(userPermissions, 'roles.action.duplicate')
  const canExport = !permissionsLoading && hasPermission(userPermissions, 'roles.action.export')
  const canCreate = !permissionsLoading && hasPermission(userPermissions, 'roles.write')

  // Get available fields (fields user has permission to see)
  const availableFields = useMemo(() => {
    return (Object.keys(FIELD_CONFIG) as FieldKey[]).filter(key => canViewField(key))
  }, [userPermissions, permissionsLoading])

  // Initialize visible fields based on permissions
  useEffect(() => {
    if (!permissionsLoading) {
      const defaultVisible = availableFields.filter(key => FIELD_CONFIG[key].defaultVisible)
      setVisibleFields(new Set(defaultVisible))
    }
  }, [availableFields, permissionsLoading])

  useEffect(() => {
    loadRoles()
    loadPermissions()
  }, [])

  const loadRoles = async () => {
    try {
      const data = await api.admin.getRoles() as Role[]
      setRoles(data)
    } catch (error) {
      console.error('Failed to load roles:', error)
      showError((error as Error).message, 'Failed to load roles')
    } finally {
      setLoading(false)
    }
  }

  const loadPermissions = async () => {
    try {
      const data = await api.permissions.getAll() as Permission[]
      setAllPermissions(data)
    } catch (error) {
      console.error('Failed to load permissions:', error)
    }
  }

  const handleCreateRole = () => {
    setShowCreateDialog(true)
  }

  const handleCreate = async (name: string, description: string) => {
    await api.roles.create({ name, description })
    await loadRoles()
  }

  const handleEditRole = (role: Role) => {
    setEditingRole(role)
  }

  const handleSaveRole = async (name: string, description: string) => {
    if (!editingRole) return
    await api.roles.update(editingRole.id, { name, description })
    await loadRoles()
  }

  const manageRolePermissions = (role: Role) => {
    setSelectedRole(role)
  }

  const viewRolePermissions = (role: Role) => {
    setViewingPermissionsRole(role)
  }

  const handleAssignPermission = async (permissionId: number) => {
    if (!selectedRole) return
    await api.roles.assignPermission(selectedRole.id, permissionId)
    await loadRoles()
  }

  const handleRemovePermission = async (permissionId: number) => {
    if (!selectedRole) return
    await api.roles.removePermission(selectedRole.id, permissionId)
    await loadRoles()
  }

  const handleDeleteRole = (role: Role) => {
    showConfirm(
      `Are you sure you want to delete role "${role.name}"? This action cannot be undone.`,
      async () => {
        try {
          await api.roles.delete(role.id)
          showSuccess('Role deleted successfully')
          loadRoles()
        } catch (error) {
          showError((error as Error).message, 'Failed to delete role')
        }
      },
      'Delete Role'
    )
  }

  const handleDuplicateRole = async (role: Role) => {
    try {
      await api.roles.create({ 
        name: `${role.name} (Copy)`, 
        description: role.description || '' 
      })
      showSuccess('Role duplicated successfully')
      await loadRoles()
    } catch (error) {
      showError((error as Error).message, 'Failed to duplicate role')
    }
  }

  const handleExportRoles = () => {
    const exportData = roles.map(role => ({
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      user_count: role.user_count,
    }))
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `roles-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    showSuccess('Roles exported successfully')
  }

  const toggleFieldVisibility = (field: FieldKey) => {
    setVisibleFields(prev => {
      const newSet = new Set(prev)
      if (newSet.has(field)) {
        // Don't allow hiding the last visible field
        if (newSet.size > 1) {
          newSet.delete(field)
        }
      } else {
        newSet.add(field)
      }
      return newSet
    })
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading || permissionsLoading) {
    return <PageLoading text="Loading roles..." />
  }

  const hasAnyActions = canEdit || canDelete || canManagePermissions || canViewPermissions || canDuplicate

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold">Roles</h1>
            <p className="text-muted-foreground mt-2">
              Manage roles and their permissions
            </p>
          </div>
          {/* Info Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full h-8 w-8 bg-blue-100 hover:bg-blue-200 text-blue-600"
            onClick={() => setShowPermissionsInfo(true)}
            title="View your permissions"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          {canExport && (
            <Button variant="outline" onClick={handleExportRoles}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
          {canCreate && (
            <Button onClick={handleCreateRole}>Create Role</Button>
          )}
        </div>
      </div>

      {/* Field Permissions Info Card */}
      {availableFields.length < Object.keys(FIELD_CONFIG).length && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-blue-800">
              <Eye className="h-5 w-5" />
              <span className="text-sm">
                You have access to {availableFields.length} of {Object.keys(FIELD_CONFIG).length} available columns based on your permissions.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>System Roles</CardTitle>
              <CardDescription>
                Roles define what users can do in the system
              </CardDescription>
            </div>
            
            {/* Column Visibility Dropdown */}
            {availableFields.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings2 className="h-4 w-4 mr-2" />
                    Columns
                    <Badge variant="secondary" className="ml-2">
                      {visibleFields.size}/{availableFields.length}
                    </Badge>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {availableFields.map(fieldKey => {
                    const config = FIELD_CONFIG[fieldKey]
                    const Icon = config.icon
                    return (
                      <DropdownMenuCheckboxItem
                        key={fieldKey}
                        checked={visibleFields.has(fieldKey)}
                        onCheckedChange={() => toggleFieldVisibility(fieldKey)}
                        disabled={visibleFields.size === 1 && visibleFields.has(fieldKey)}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {config.label}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <div className="mt-4">
            <input
              type="text"
              placeholder="Search roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {visibleFields.has('name') && <TableHead>Name</TableHead>}
                {visibleFields.has('description') && <TableHead>Description</TableHead>}
                {visibleFields.has('permissions') && <TableHead>Permissions</TableHead>}
                {visibleFields.has('usercount') && <TableHead>Users</TableHead>}
                {visibleFields.has('createdat') && <TableHead>Created</TableHead>}
                {hasAnyActions && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.filter(role => 
                role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (role.description && role.description.toLowerCase().includes(searchQuery.toLowerCase()))
              ).map((role) => (
                <TableRow key={role.id}>
                  {visibleFields.has('name') && (
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        {role.name}
                      </div>
                    </TableCell>
                  )}
                  {visibleFields.has('description') && (
                    <TableCell className="max-w-[300px]">
                      <span className="text-muted-foreground truncate block">
                        {role.description || '-'}
                      </span>
                    </TableCell>
                  )}
                  {visibleFields.has('permissions') && (
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {role.permissions?.slice(0, 3).map((perm) => (
                          <Badge key={perm} variant="outline" className="text-xs">
                            {perm}
                          </Badge>
                        ))}
                        {role.permissions && role.permissions.length > 3 && (
                          <Badge variant="secondary" className="text-xs cursor-pointer" onClick={() => canViewPermissions && viewRolePermissions(role)}>
                            +{role.permissions.length - 3} more
                          </Badge>
                        )}
                        {(!role.permissions || role.permissions.length === 0) && (
                          <span className="text-muted-foreground text-sm">No permissions</span>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {visibleFields.has('usercount') && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{role.user_count ?? '-'}</span>
                      </div>
                    </TableCell>
                  )}
                  {visibleFields.has('createdat') && (
                    <TableCell className="text-muted-foreground">
                      {formatDate(role.created_at)}
                    </TableCell>
                  )}
                  {hasAnyActions && (
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {canEdit && (
                          <Button variant="ghost" size="sm" onClick={() => handleEditRole(role)}>
                            Edit
                          </Button>
                        )}
                        {canManagePermissions && (
                          <Button variant="outline" size="sm" onClick={() => manageRolePermissions(role)}>
                            Permissions
                          </Button>
                        )}
                        {!canManagePermissions && canViewPermissions && (
                          <Button variant="outline" size="sm" onClick={() => viewRolePermissions(role)}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        )}
                        {canDuplicate && (
                          <Button variant="ghost" size="sm" onClick={() => handleDuplicateRole(role)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteRole(role)} 
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
              {roles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={visibleFields.size + (hasAnyActions ? 1 : 0)} className="text-center py-8 text-muted-foreground">
                    No roles found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Your Permissions Info Modal */}
      {showPermissionsInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-lg">Your Role Permissions</CardTitle>
                <CardDescription>What you can do on this page</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowPermissionsInfo(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className={cn(
                  "p-3 rounded-lg border",
                  canCreate ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                )}>
                  <div className="flex items-center gap-2">
                    {canCreate ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-gray-400" />}
                    <span className={cn("text-sm font-medium", canCreate ? "text-green-700" : "text-gray-500")}>
                      Create Roles
                    </span>
                  </div>
                </div>
                <div className={cn(
                  "p-3 rounded-lg border",
                  canEdit ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                )}>
                  <div className="flex items-center gap-2">
                    {canEdit ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-gray-400" />}
                    <span className={cn("text-sm font-medium", canEdit ? "text-green-700" : "text-gray-500")}>
                      Edit Roles
                    </span>
                  </div>
                </div>
                <div className={cn(
                  "p-3 rounded-lg border",
                  canManagePermissions ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                )}>
                  <div className="flex items-center gap-2">
                    {canManagePermissions ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-gray-400" />}
                    <span className={cn("text-sm font-medium", canManagePermissions ? "text-green-700" : "text-gray-500")}>
                      Manage Permissions
                    </span>
                  </div>
                </div>
                <div className={cn(
                  "p-3 rounded-lg border",
                  canDelete ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                )}>
                  <div className="flex items-center gap-2">
                    {canDelete ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-gray-400" />}
                    <span className={cn("text-sm font-medium", canDelete ? "text-green-700" : "text-gray-500")}>
                      Delete Roles
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-2">Visible Columns:</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(FIELD_CONFIG) as FieldKey[]).map(fieldKey => {
                    const config = FIELD_CONFIG[fieldKey]
                    const canView = canViewField(fieldKey)
                    return (
                      <Badge 
                        key={fieldKey} 
                        variant={canView ? "default" : "secondary"}
                        className={cn(!canView && "opacity-50")}
                      >
                        {config.label}
                        {!canView && " (No Access)"}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedRole && (
        <PermissionManager
          roleId={selectedRole.id}
          roleName={selectedRole.name}
          currentPermissions={selectedRole.permissions || []}
          allPermissions={allPermissions}
          onClose={() => setSelectedRole(null)}
          onAssign={handleAssignPermission}
          onRemove={handleRemovePermission}
        />
      )}

      {/* View-only Permission Dialog */}
      {viewingPermissionsRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
            <CardHeader>
              <CardTitle>Permissions for {viewingPermissionsRole.name}</CardTitle>
              <CardDescription>
                Read-only view of assigned permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <div className="space-y-2">
                {viewingPermissionsRole.permissions && viewingPermissionsRole.permissions.length > 0 ? (
                  viewingPermissionsRole.permissions.map(perm => (
                    <div key={perm} className="flex items-center gap-2 p-2 border rounded-lg">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      <code className="text-sm">{perm}</code>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">No permissions assigned</p>
                )}
              </div>
            </CardContent>
            <div className="p-4 border-t flex justify-end">
              <Button onClick={() => setViewingPermissionsRole(null)}>Close</Button>
            </div>
          </Card>
        </div>
      )}

      {editingRole && (
        <EditRoleDialog
          role={editingRole}
          onClose={() => setEditingRole(null)}
          onSave={handleSaveRole}
        />
      )}

      {showCreateDialog && (
        <CreateRoleDialog
          onClose={() => setShowCreateDialog(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}
