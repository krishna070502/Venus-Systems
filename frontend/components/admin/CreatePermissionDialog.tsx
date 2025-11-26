'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAlert } from '@/components/ui/alert-modal'
import { LoadingSpinner } from '@/components/ui/loading'

interface CreatePermissionDialogProps {
  onClose: () => void
  onCreate: (key: string, description: string) => Promise<void>
}

export default function CreatePermissionDialog({ onClose, onCreate }: CreatePermissionDialogProps) {
  const [key, setKey] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const { showError } = useAlert()

  const handleCreate = async () => {
    setLoading(true)
    try {
      await onCreate(key, description)
      onClose()
    } catch (error) {
      showError((error as Error).message, 'Failed to create permission')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create New Permission</CardTitle>
          <CardDescription>Add a new permission to the system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="key">Permission Key</Label>
            <Input
              id="key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="e.g., users.create"
              className="font-mono"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter permission description"
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button onClick={handleCreate} disabled={loading || !key} className="flex-1">
              {loading ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Creating...
                </span>
              ) : 'Create Permission'}
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
