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
import EditPermissionDialog from '@/components/admin/EditPermissionDialog'
import CreatePermissionDialog from '@/components/admin/CreatePermissionDialog'
import { PageLoading } from '@/components/ui/loading'

interface Permission {
  id: number
  key: string
  description?: string
}

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const { showError, showSuccess, showConfirm } = useAlert()

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

  if (loading) {
    return <PageLoading text="Loading permissions..." />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Permissions</h1>
          <p className="text-muted-foreground mt-2">
            Manage granular permissions for roles
          </p>
        </div>
        <Button onClick={handleCreatePermission}>Create Permission</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Permissions</CardTitle>
          <CardDescription>
            Permissions are assigned to roles to control access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissions.map((permission) => (
                <TableRow key={permission.id}>
                  <TableCell className="font-mono text-sm">
                    {permission.key}
                  </TableCell>
                  <TableCell>{permission.description || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEditPermission(permission)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeletePermission(permission)} className="text-red-600 hover:text-red-700">
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
    </div>
  )
}
