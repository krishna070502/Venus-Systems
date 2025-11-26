'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAlert } from '@/components/ui/alert-modal'
import { LoadingSpinner } from '@/components/ui/loading'

interface EditPermissionDialogProps {
  permission: { id: number; key: string; description?: string }
  onClose: () => void
  onSave: (key: string, description: string) => Promise<void>
}

export default function EditPermissionDialog({ permission, onClose, onSave }: EditPermissionDialogProps) {
  const [key, setKey] = useState(permission.key)
  const [description, setDescription] = useState(permission.description || '')
  const [loading, setLoading] = useState(false)
  const { showError } = useAlert()

  const handleSave = async () => {
    setLoading(true)
    try {
      await onSave(key, description)
      onClose()
    } catch (error) {
      showError((error as Error).message, 'Failed to update permission')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Edit Permission</CardTitle>
          <CardDescription>Update permission key and description</CardDescription>
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
            <Button onClick={handleSave} disabled={loading || !key} className="flex-1">
              {loading ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Saving...
                </span>
              ) : 'Save Changes'}
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
