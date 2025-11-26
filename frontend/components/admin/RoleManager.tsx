'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Role {
  id: number
  name: string
  description?: string
}

interface RoleManagerProps {
  userId: string
  userEmail: string
  currentRoles: string[]
  allRoles: Role[]
  onClose: () => void
  onAssign: (roleId: number) => Promise<void>
  onRemove: (roleId: number) => Promise<void>
}

export default function RoleManager({
  userId,
  userEmail,
  currentRoles,
  allRoles,
  onClose,
  onAssign,
  onRemove,
}: RoleManagerProps) {
  const [loading, setLoading] = useState(false)
  const [localRoles, setLocalRoles] = useState<string[]>(currentRoles)

  // Update local state when props change
  useEffect(() => {
    setLocalRoles(currentRoles)
  }, [currentRoles])

  const handleToggle = async (role: Role, isAssigned: boolean) => {
    setLoading(true)
    try {
      if (isAssigned) {
        // Optimistically update UI
        setLocalRoles(prev => prev.filter(r => r !== role.name))
        await onRemove(role.id)
      } else {
        // Optimistically update UI
        setLocalRoles(prev => [...prev, role.name])
        await onAssign(role.id)
      }
    } catch (error) {
      console.error('Failed to toggle role:', error)
      // Revert on error
      setLocalRoles(currentRoles)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
        <CardHeader>
          <CardTitle>Manage Roles for {userEmail}</CardTitle>
          <CardDescription>
            Assign or remove roles for this user
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <div className="space-y-2">
            {allRoles.map((role) => {
              const isAssigned = localRoles.includes(role.name)
              return (
                <div
                  key={role.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="font-medium">{role.name}</div>
                    {role.description && (
                      <div className="text-sm text-muted-foreground">
                        {role.description}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={isAssigned ? 'default' : 'outline'}
                    onClick={() => handleToggle(role, isAssigned)}
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
