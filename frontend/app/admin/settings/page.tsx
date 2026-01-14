'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAlert } from '@/components/ui/alert-modal'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import { api } from '@/lib/api/client'
import { Loader2, Save, RefreshCw, Shield, Zap, Clock, ToggleLeft, ToggleRight } from 'lucide-react'

interface SystemSettings {
  registration_enabled: boolean
  maintenance_mode: boolean
  app_name: string
  support_email: string
  api_version: string
}

interface RateLimitConfig {
  id: number
  role_id: number
  role_name?: string
  requests_per_minute?: number
  requests_per_hour?: number
  enabled?: boolean
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
  const { showSuccess, showError } = useAlert()
  const { permissions: userPermissions, loading: permissionsLoading } = usePermissions()
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS)
  const [rateLimits, setRateLimits] = useState<RateLimitConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [editingRateLimit, setEditingRateLimit] = useState<number | null>(null)
  const [editValues, setEditValues] = useState<{ rpm: number; rph: number }>({ rpm: 60, rph: 1000 })

  // Permission checks
  const canViewRateLimits = !permissionsLoading && hasPermission(userPermissions, 'ratelimits.read')
  const canEditRateLimits = !permissionsLoading && hasPermission(userPermissions, 'ratelimits.write')
  const canViewRpm = !permissionsLoading && hasPermission(userPermissions, 'ratelimits.field.rpm')
  const canViewRph = !permissionsLoading && hasPermission(userPermissions, 'ratelimits.field.rph')
  const canViewEnabled = !permissionsLoading && hasPermission(userPermissions, 'ratelimits.field.enabled')

  useEffect(() => {
    fetchSettings()
    if (canViewRateLimits) {
      fetchRateLimits()
    }
  }, [canViewRateLimits])

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

  const fetchRateLimits = async () => {
    try {
      const data = await api.rateLimits.getAll() as RateLimitConfig[]
      setRateLimits(data)
    } catch (error: any) {
      console.error('Failed to fetch rate limits:', error)
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

  const toggleRateLimit = async (config: RateLimitConfig) => {
    try {
      setSavingKey(`toggle-${config.id}`)
      await api.rateLimits.toggle(config.id)
      await fetchRateLimits()
      showSuccess(`Rate limiting ${config.enabled ? 'disabled' : 'enabled'} for ${config.role_name}`)
    } catch (error: any) {
      showError('Failed to toggle rate limit')
    } finally {
      setSavingKey(null)
    }
  }

  const startEditingRateLimit = (config: RateLimitConfig) => {
    setEditingRateLimit(config.id)
    setEditValues({
      rpm: config.requests_per_minute || 60,
      rph: config.requests_per_hour || 1000,
    })
  }

  const saveRateLimitEdit = async (configId: number) => {
    try {
      setSavingKey(`edit-${configId}`)
      await api.rateLimits.update(configId, {
        requests_per_minute: editValues.rpm,
        requests_per_hour: editValues.rph,
      })
      await fetchRateLimits()
      setEditingRateLimit(null)
      showSuccess('Rate limits updated successfully!')
    } catch (error: any) {
      showError('Failed to update rate limits')
    } finally {
      setSavingKey(null)
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

      {/* Rate Limiting Card */}
      {canViewRateLimits && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <CardTitle>Rate Limiting</CardTitle>
            </div>
            <CardDescription>
              Configure API rate limits per role. Higher limits for trusted roles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rateLimits.map((config) => (
                <div
                  key={config.id}
                  className={`p-4 border rounded-lg transition-colors ${config.enabled ? 'bg-background' : 'bg-muted/50'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{config.role_name || `Role ${config.role_id}`}</p>
                        {editingRateLimit === config.id ? (
                          <div className="flex items-center gap-4 mt-2">
                            {canViewRpm && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <Input
                                  type="number"
                                  value={editValues.rpm}
                                  onChange={(e) => setEditValues(prev => ({ ...prev, rpm: parseInt(e.target.value) || 0 }))}
                                  className="w-20 h-8"
                                />
                                <span className="text-xs text-muted-foreground">/min</span>
                              </div>
                            )}
                            {canViewRph && (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={editValues.rph}
                                  onChange={(e) => setEditValues(prev => ({ ...prev, rph: parseInt(e.target.value) || 0 }))}
                                  className="w-24 h-8"
                                />
                                <span className="text-xs text-muted-foreground">/hour</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-4 mt-1">
                            {canViewRpm && config.requests_per_minute !== undefined && (
                              <span className="text-sm text-muted-foreground">
                                {config.requests_per_minute} req/min
                              </span>
                            )}
                            {canViewRph && config.requests_per_hour !== undefined && (
                              <span className="text-sm text-muted-foreground">
                                {config.requests_per_hour} req/hour
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {canViewEnabled && (
                        <Badge variant={config.enabled ? "default" : "secondary"}>
                          {config.enabled ? 'Active' : 'Disabled'}
                        </Badge>
                      )}
                      {canEditRateLimits && (
                        <>
                          {editingRateLimit === config.id ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingRateLimit(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => saveRateLimitEdit(config.id)}
                                disabled={savingKey === `edit-${config.id}`}
                              >
                                {savingKey === `edit-${config.id}` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Save'
                                )}
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startEditingRateLimit(config)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleRateLimit(config)}
                                disabled={savingKey === `toggle-${config.id}`}
                              >
                                {savingKey === `toggle-${config.id}` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : config.enabled ? (
                                  <ToggleRight className="h-4 w-4" />
                                ) : (
                                  <ToggleLeft className="h-4 w-4" />
                                )}
                              </Button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {rateLimits.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No rate limit configurations found.</p>
                  <p className="text-sm">Run the database migration to create default configs.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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

