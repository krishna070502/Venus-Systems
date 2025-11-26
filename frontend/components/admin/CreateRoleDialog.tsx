'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAlert } from '@/components/ui/alert-modal'
import { LoadingSpinner } from '@/components/ui/loading'

interface CreateRoleDialogProps {
  onClose: () => void
  onCreate: (name: string, description: string) => Promise<void>
}

export default function CreateRoleDialog({ onClose, onCreate }: CreateRoleDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const { showError } = useAlert()

  const handleCreate = async () => {
    setLoading(true)
    try {
      await onCreate(name, description)
      onClose()
    } catch (error) {
      showError((error as Error).message, 'Failed to create role')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create New Role</CardTitle>
          <CardDescription>Add a new role to the system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Role Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter role name"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter role description"
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button onClick={handleCreate} disabled={loading || !name} className="flex-1">
              {loading ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Creating...
                </span>
              ) : 'Create Role'}
            </Button>
            <Button onClick={onClose} variant="outline" disabled={loading}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
