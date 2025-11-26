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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import RoleManager from '@/components/admin/RoleManager'
import EditUserDialog from '@/components/admin/EditUserDialog'
import { PageLoading } from '@/components/ui/loading'

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

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [allRoles, setAllRoles] = useState<Role[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const { showError, showSuccess, showInfo, showConfirm } = useAlert()

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

  if (loading) {
    return <PageLoading text="Loading users..." />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground mt-2">
            Manage user accounts and roles
          </p>
        </div>
        <Button onClick={handleAddUser}>Add User</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            A list of all users in your system
          </CardDescription>
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
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.filter(user =>
                user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (user.full_name && user.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (user.roles && user.roles.some(role => role.toLowerCase().includes(searchQuery.toLowerCase())))
              ).map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{user.full_name || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {user.roles?.map((role) => (
                        <Badge key={role} variant="secondary">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)}>
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => manageUserRoles(user)}>
                        Roles
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user)} className="text-red-600 hover:text-red-700">
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
