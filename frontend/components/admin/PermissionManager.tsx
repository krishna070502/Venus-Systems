'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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

  // Update local state when props change
  useEffect(() => {
    setLocalPermissions(currentPermissions)
  }, [currentPermissions])

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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
        <CardHeader>
          <CardTitle>Manage Permissions for {roleName}</CardTitle>
          <CardDescription>
            Select which permissions this role should have
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <div className="space-y-2">
            {allPermissions.map((permission) => {
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
            })}
          </div>
        </CardContent>
        <div className="p-6 border-t">
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      </Card>
    </div>
  )
}
