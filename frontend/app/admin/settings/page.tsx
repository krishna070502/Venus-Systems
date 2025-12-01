'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAlert } from '@/components/ui/alert-modal'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { api } from '@/lib/api/client'
import { Loader2, Save, RefreshCw } from 'lucide-react'

interface SystemSettings {
  registration_enabled: boolean
  maintenance_mode: boolean
  app_name: string
  support_email: string
  api_version: string
}

const DEFAULT_SETTINGS: SystemSettings = {
  registration_enabled: true,
  maintenance_mode: false,
  app_name: 'Venus Chicken',
  support_email: '',
  api_version: '1.0.0',
}

export default function SettingsPage() {
  return (
    <PermissionGuard permission="system.settings">
      <SettingsPageContent />
    </PermissionGuard>
  )
}

function SettingsPageContent() {
  const { showSuccess, showError, showInfo } = useAlert()
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await api.admin.getSettings() as { settings: SystemSettings }
      if (response.settings) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...response.settings,
        })
      }
    } catch (error: any) {
      console.error('Failed to fetch settings:', error)
      showError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = async (key: keyof SystemSettings, value: any) => {
    try {
      setSavingKey(key)
      await api.admin.updateSettings({ [key]: value })
      setSettings(prev => ({ ...prev, [key]: value }))
      showSuccess(`${formatSettingName(key)} updated successfully!`)
    } catch (error: any) {
      console.error(`Failed to update ${key}:`, error)
      showError(`Failed to update ${formatSettingName(key)}`)
    } finally {
      setSavingKey(null)
    }
  }

  const saveGeneralSettings = async () => {
    try {
      setSaving(true)
      await api.admin.updateSettings({
        app_name: settings.app_name,
        support_email: settings.support_email,
      })
      showSuccess('General settings saved successfully!')
    } catch (error: any) {
      console.error('Failed to save settings:', error)
      showError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const formatSettingName = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage system configuration
          </p>
        </div>
        <Button variant="outline" onClick={fetchSettings} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
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
            <Input 
              id="appName" 
              value={settings.app_name}
              onChange={(e) => setSettings(prev => ({ ...prev, app_name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supportEmail">Support Email</Label>
            <Input 
              id="supportEmail" 
              type="email" 
              placeholder="support@example.com"
              value={settings.support_email}
              onChange={(e) => setSettings(prev => ({ ...prev, support_email: e.target.value }))}
            />
          </div>
          <Button onClick={saveGeneralSettings} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
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
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Maintenance Mode</p>
              <p className="text-sm text-muted-foreground">
                Disable access for non-admin users
              </p>
            </div>
            <Button 
              variant={settings.maintenance_mode ? "destructive" : "outline"}
              onClick={() => updateSetting('maintenance_mode', !settings.maintenance_mode)}
              disabled={savingKey === 'maintenance_mode'}
            >
              {savingKey === 'maintenance_mode' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                settings.maintenance_mode ? 'Enabled' : 'Disabled'
              )}
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">User Registration</p>
              <p className="text-sm text-muted-foreground">
                Allow new users to sign up
              </p>
            </div>
            <Button 
              variant={settings.registration_enabled ? "default" : "outline"}
              onClick={() => updateSetting('registration_enabled', !settings.registration_enabled)}
              disabled={savingKey === 'registration_enabled'}
            >
              {savingKey === 'registration_enabled' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                settings.registration_enabled ? 'Enabled' : 'Disabled'
              )}
            </Button>
          </div>
          
          {!settings.registration_enabled && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ User registration is currently disabled. New users will not be able to sign up.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>
            View API information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>API Version</Label>
            <div className="px-3 py-2 bg-muted rounded-md text-sm font-mono">
              {settings.api_version}
            </div>
          </div>
          <div className="space-y-2">
            <Label>API URL</Label>
            <div className="px-3 py-2 bg-muted rounded-md text-sm font-mono">
              {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
