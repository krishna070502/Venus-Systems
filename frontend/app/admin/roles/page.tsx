'use client'

import { useEffect, useState } from 'react'
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
import PermissionManager from '@/components/admin/PermissionManager'
import EditRoleDialog from '@/components/admin/EditRoleDialog'
import CreateRoleDialog from '@/components/admin/CreateRoleDialog'
import { PageLoading } from '@/components/ui/loading'
import { PermissionGuard } from '@/components/admin/PermissionGuard'

interface Role {
  id: number
  name: string
  description?: string
  permissions?: string[]
}

interface Permission {
  id: number
  key: string
  description?: string
}

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

  const { showError, showSuccess, showConfirm } = useAlert()

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

  if (loading) {
    return <PageLoading text="Loading roles..." />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Roles</h1>
          <p className="text-muted-foreground mt-2">
            Manage roles and their permissions
          </p>
        </div>
        <Button onClick={handleCreateRole}>Create Role</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Roles</CardTitle>
          <CardDescription>
            Roles define what users can do in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell>{role.description || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions?.slice(0, 3).map((perm) => (
                        <Badge key={perm} variant="outline" className="text-xs">
                          {perm}
                        </Badge>
                      ))}
                      {role.permissions && role.permissions.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{role.permissions.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEditRole(role)}>
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => manageRolePermissions(role)}>
                        Permissions
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteRole(role)} className="text-red-600 hover:text-red-700">
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
