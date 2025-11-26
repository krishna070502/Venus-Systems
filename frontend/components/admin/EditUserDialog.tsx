'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAlert } from '@/components/ui/alert-modal'
import { LoadingSpinner } from '@/components/ui/loading'

interface EditUserDialogProps {
  user: { id: string; email: string; full_name?: string }
  onClose: () => void
  onSave: (fullName: string) => Promise<void>
}

export default function EditUserDialog({ user, onClose, onSave }: EditUserDialogProps) {
  const [fullName, setFullName] = useState(user.full_name || '')
  const [loading, setLoading] = useState(false)
  const { showError } = useAlert()

  const handleSave = async () => {
    setLoading(true)
    try {
      await onSave(fullName)
      onClose()
    } catch (error) {
      showError((error as Error).message, 'Failed to update user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Edit User</CardTitle>
          <CardDescription>Update user information for {user.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={user.email}
              disabled
              className="bg-gray-100"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter full name"
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={loading} className="flex-1">
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
