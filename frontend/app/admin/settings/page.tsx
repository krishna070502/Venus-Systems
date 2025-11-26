'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAlert } from '@/components/ui/alert-modal'
import { PermissionGuard } from '@/components/admin/PermissionGuard'

export default function SettingsPage() {
  return (
    <PermissionGuard permission="system.settings">
      <SettingsPageContent />
    </PermissionGuard>
  )
}

function SettingsPageContent() {
  const { showSuccess, showInfo } = useAlert()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage system configuration
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>
            Configure general system settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="appName">Application Name</Label>
            <Input id="appName" defaultValue="SaaS Starter Kit" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supportEmail">Support Email</Label>
            <Input id="supportEmail" type="email" placeholder="support@example.com" />
          </div>
          <Button onClick={() => showSuccess('Settings saved successfully!')}>Save Changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>
            Configure security and authentication settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Maintenance Mode</p>
              <p className="text-sm text-muted-foreground">
                Disable access for non-admin users
              </p>
            </div>
            <Button variant="outline" onClick={() => showInfo('Maintenance mode has been toggled', 'Maintenance Mode')}>Disabled</Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">User Registration</p>
              <p className="text-sm text-muted-foreground">
                Allow new users to sign up
              </p>
            </div>
            <Button variant="outline" onClick={() => showInfo('User registration has been toggled', 'Registration')}>Enabled</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>
            Manage API settings and keys
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiUrl">API URL</Label>
            <Input id="apiUrl" defaultValue="http://localhost:8000" />
          </div>
          <Button onClick={() => showSuccess('API settings updated successfully!')}>Update API Settings</Button>
        </CardContent>
      </Card>
    </div>
  )
}
