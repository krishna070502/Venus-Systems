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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import RoleManager from '@/components/admin/RoleManager'
import EditUserDialog from '@/components/admin/EditUserDialog'
import { PageLoading } from '@/components/ui/loading'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import { Settings2, Eye, EyeOff, Download, Mail, User, Shield, Calendar, Info, X, UserPlus, Edit, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface User {
  id: string
  email: string
  full_name?: string
  roles?: string[]
  created_at: string
}

interface Role {
  id: number
  name: string
  description?: string
}

// Field configuration with permission keys
const FIELD_CONFIG = {
  email: {
    key: 'users.field.email',
    label: 'Email',
    icon: Mail,
    defaultVisible: true,
  },
  name: {
    key: 'users.field.name',
    label: 'Name',
    icon: User,
    defaultVisible: true,
  },
  roles: {
    key: 'users.field.roles',
    label: 'Roles',
    icon: Shield,
    defaultVisible: true,
  },
  created: {
    key: 'users.field.created',
    label: 'Created',
    icon: Calendar,
    defaultVisible: true,
  },
}

type FieldKey = keyof typeof FIELD_CONFIG

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [viewingRolesUser, setViewingRolesUser] = useState<User | null>(null)
  const [allRoles, setAllRoles] = useState<Role[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [visibleFields, setVisibleFields] = useState<Set<FieldKey>>(new Set<FieldKey>(['email', 'name', 'roles', 'created']))
  const [showPermissionsInfo, setShowPermissionsInfo] = useState(false)
  
  const { permissions: userPermissions, loading: permissionsLoading } = usePermissions()
  const { showError, showSuccess, showInfo, showConfirm } = useAlert()

  // Check field-level permissions
  const canViewField = (fieldKey: FieldKey): boolean => {
    if (permissionsLoading) return false
    const config = FIELD_CONFIG[fieldKey]
    return hasPermission(userPermissions, config.key)
  }

  // Check action permissions
  const canEdit = !permissionsLoading && hasPermission(userPermissions, 'users.action.edit')
  const canDelete = !permissionsLoading && hasPermission(userPermissions, 'users.action.delete')
  const canManageRoles = !permissionsLoading && hasPermission(userPermissions, 'users.action.manageroles')
  const canViewRoles = !permissionsLoading && hasPermission(userPermissions, 'users.action.viewroles')
  const canExport = !permissionsLoading && hasPermission(userPermissions, 'users.action.export')
  const canInvite = !permissionsLoading && hasPermission(userPermissions, 'users.action.invite')

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
    loadUsers()
    loadRoles()
  }, [])

  const loadUsers = async () => {
    try {
      const data = await api.admin.getUsers() as User[]
      setUsers(data)
    } catch (error) {
      console.error('Failed to load users:', error)
      showError((error as Error).message, 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const loadRoles = async () => {
    try {
      const data = await api.admin.getRoles() as Role[]
      setAllRoles(data)
    } catch (error) {
      console.error('Failed to load roles:', error)
    }
  }

  const toggleFieldVisibility = (field: FieldKey) => {
    setVisibleFields(prev => {
      const newSet = new Set(prev)
      if (newSet.has(field)) {
        if (newSet.size > 1) {
          newSet.delete(field)
        }
      } else {
        newSet.add(field)
      }
      return newSet
    })
  }

  const handleAddUser = () => {
    showInfo('To add a new user, they must sign up at /auth/signup. You can then assign them roles here.', 'Add New User')
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
  }

  const handleSaveUser = async (fullName: string) => {
    if (!editingUser) return
    await api.users.update(editingUser.id, { full_name: fullName })
    await loadUsers()
  }

  const manageUserRoles = (user: User) => {
    setSelectedUser(user)
  }

  const viewUserRoles = (user: User) => {
    setViewingRolesUser(user)
  }

  const handleAssignRole = async (roleId: number) => {
    if (!selectedUser) return
    await api.admin.assignRole(selectedUser.id, roleId)
    await loadUsers()
  }

  const handleRemoveRole = async (roleId: number) => {
    if (!selectedUser) return
    await api.admin.removeRole(selectedUser.id, roleId)
    await loadUsers()
  }

  const handleDeleteUser = (user: User) => {
    showConfirm(
      `Are you sure you want to delete ${user.email}? This action cannot be undone.`,
      async () => {
        try {
          await api.users.delete(user.id)
          showSuccess('User deleted successfully')
          loadUsers()
        } catch (error) {
          showError((error as Error).message, 'Failed to delete user')
        }
      },
      'Delete User'
    )
  }

  const handleExportUsers = () => {
    const exportData = users.map(user => ({
      email: user.email,
      full_name: user.full_name,
      roles: user.roles,
      created_at: user.created_at,
    }))
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `users-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    showSuccess('Users exported successfully')
  }

  if (loading || permissionsLoading) {
    return <PageLoading text="Loading users..." />
  }

  const hasAnyActions = canEdit || canDelete || canManageRoles || canViewRoles

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold">Users</h1>
            <p className="text-muted-foreground mt-2">
              Manage user accounts and roles
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
            <Button variant="outline" onClick={handleExportUsers}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
          {canInvite && (
            <Button onClick={handleAddUser}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
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
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                A list of all users in your system
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
              placeholder="Search users by email, name, or role..."
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
                {visibleFields.has('email') && <TableHead>Email</TableHead>}
                {visibleFields.has('name') && <TableHead>Name</TableHead>}
                {visibleFields.has('roles') && <TableHead>Roles</TableHead>}
                {visibleFields.has('created') && <TableHead>Created</TableHead>}
                {hasAnyActions && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.filter(user =>
                user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (user.full_name && user.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (user.roles && user.roles.some(role => role.toLowerCase().includes(searchQuery.toLowerCase())))
              ).map((user) => (
                <TableRow key={user.id}>
                  {visibleFields.has('email') && (
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {user.email}
                      </div>
                    </TableCell>
                  )}
                  {visibleFields.has('name') && (
                    <TableCell>{user.full_name || '-'}</TableCell>
                  )}
                  {visibleFields.has('roles') && (
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {user.roles?.map((role) => (
                          <Badge key={role} variant="secondary">
                            {role}
                          </Badge>
                        ))}
                        {(!user.roles || user.roles.length === 0) && (
                          <span className="text-muted-foreground text-sm">No roles</span>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {visibleFields.has('created') && (
                    <TableCell className="text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                  )}
                  {hasAnyActions && (
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {canEdit && (
                          <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)}>
                            Edit
                          </Button>
                        )}
                        {canManageRoles && (
                          <Button variant="outline" size="sm" onClick={() => manageUserRoles(user)}>
                            Roles
                          </Button>
                        )}
                        {!canManageRoles && canViewRoles && (
                          <Button variant="outline" size="sm" onClick={() => viewUserRoles(user)}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        )}
                        {canDelete && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteUser(user)} 
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
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={visibleFields.size + (hasAnyActions ? 1 : 0)} className="text-center py-8 text-muted-foreground">
                    No users found
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
                <CardTitle className="text-lg">Your User Permissions</CardTitle>
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
                  canEdit ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                )}>
                  <div className="flex items-center gap-2">
                    {canEdit ? <Edit className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-gray-400" />}
                    <span className={cn("text-sm font-medium", canEdit ? "text-green-700" : "text-gray-500")}>
                      Edit Users
                    </span>
                  </div>
                </div>
                <div className={cn(
                  "p-3 rounded-lg border",
                  canDelete ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                )}>
                  <div className="flex items-center gap-2">
                    {canDelete ? <Trash2 className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-gray-400" />}
                    <span className={cn("text-sm font-medium", canDelete ? "text-green-700" : "text-gray-500")}>
                      Delete Users
                    </span>
                  </div>
                </div>
                <div className={cn(
                  "p-3 rounded-lg border",
                  canManageRoles ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                )}>
                  <div className="flex items-center gap-2">
                    {canManageRoles ? <Shield className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-gray-400" />}
                    <span className={cn("text-sm font-medium", canManageRoles ? "text-green-700" : "text-gray-500")}>
                      Manage Roles
                    </span>
                  </div>
                </div>
                <div className={cn(
                  "p-3 rounded-lg border",
                  canExport ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                )}>
                  <div className="flex items-center gap-2">
                    {canExport ? <Download className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-gray-400" />}
                    <span className={cn("text-sm font-medium", canExport ? "text-green-700" : "text-gray-500")}>
                      Export Users
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

      {/* View-only Roles Dialog */}
      {viewingRolesUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-lg">Roles for {viewingRolesUser.email}</CardTitle>
                <CardDescription>Read-only view of assigned roles</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setViewingRolesUser(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {viewingRolesUser.roles && viewingRolesUser.roles.length > 0 ? (
                  viewingRolesUser.roles.map(role => (
                    <div key={role} className="flex items-center gap-2 p-2 border rounded-lg">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span>{role}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">No roles assigned</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedUser && (
        <RoleManager
          userId={selectedUser.id}
          userEmail={selectedUser.email}
          currentRoles={selectedUser.roles || []}
          allRoles={allRoles}
          onClose={() => setSelectedUser(null)}
          onAssign={handleAssignRole}
          onRemove={handleRemoveRole}
        />
      )}

      {editingUser && (
        <EditUserDialog
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleSaveUser}
        />
      )}
    </div>
  )
}
