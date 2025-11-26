'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Activity, 
  Server, 
  Database, 
  Cpu, 
  HardDrive, 
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageLoading, LoadingSpinner } from '@/components/ui/loading'
import { PermissionGuard } from '@/components/admin/PermissionGuard'

interface HealthStatus {
  overall_status: string
  backend: {
    status: string
    timestamp: string
    python_version: string
    api_version: string
    uptime_seconds: number
  }
  system: {
    status: string
    cpu: {
      usage_percent: number
      count: number
    }
    memory: {
      total_mb: number
      available_mb: number
      used_mb: number
      usage_percent: number
    }
    disk: {
      total_gb: number
      used_gb: number
      free_gb: number
      usage_percent: number
    }
  }
  database: {
    status: string
    type: string
    latency_ms: number
    connection: string
    tables: {
      profiles: number
      roles: number
      permissions: number
    }
  }
  response_time_ms: number
}

export default function HealthPage() {
  return (
    <PermissionGuard permission="system.admin">
      <HealthPageContent />
    </PermissionGuard>
  )
}

function HealthPageContent() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchHealth = async () => {
    setLoading(true)
    try {
      const data = await api.health.getDetailed() as HealthStatus
      setHealth(data)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error fetching health status:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'degraded':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      default:
        return <XCircle className="h-5 w-5 text-red-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      healthy: 'default',
      degraded: 'secondary',
      unhealthy: 'destructive'
    }
    return (
      <Badge variant={variants[status] || 'outline'} className="capitalize">
        {status}
      </Badge>
    )
  }

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    return `${hours}h ${minutes}m ${secs}s`
  }

  if (loading && !health) {
    return <PageLoading text="Loading health status..." />
  }

  if (!health) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Failed to load health status</p>
          <Button onClick={fetchHealth} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Health</h1>
          <p className="text-muted-foreground mt-1">
            Real-time monitoring of backend and database services
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right text-sm text-muted-foreground">
            <Clock className="h-4 w-4 inline mr-1" />
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
          <Button onClick={fetchHealth} disabled={loading} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(health.overall_status)}
              <CardTitle>Overall Status</CardTitle>
            </div>
            {getStatusBadge(health.overall_status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <Server className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Backend API</p>
                <p className="text-xs text-muted-foreground">{health.backend.status}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Database</p>
                <p className="text-xs text-muted-foreground">{health.database.status}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm font-medium">Response Time</p>
                <p className="text-xs text-muted-foreground">{health.response_time_ms.toFixed(0)}ms</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Backend Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Server className="h-6 w-6 text-blue-500" />
              <div>
                <CardTitle>Backend API</CardTitle>
                <CardDescription>FastAPI Server Status</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Status</span>
              {getStatusBadge(health.backend.status)}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">API Version</span>
              <span className="text-sm text-muted-foreground">{health.backend.api_version}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Python Version</span>
              <span className="text-sm text-muted-foreground font-mono text-xs">
                {health.backend.python_version.split(' ')[0]}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Uptime</span>
              <span className="text-sm text-muted-foreground">
                {formatUptime(health.backend.uptime_seconds)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Timestamp</span>
              <span className="text-sm text-muted-foreground">
                {new Date(health.backend.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Database Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Database className="h-6 w-6 text-purple-500" />
              <div>
                <CardTitle>Database</CardTitle>
                <CardDescription>Supabase PostgreSQL</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Status</span>
              {getStatusBadge(health.database.status)}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Connection</span>
              <span className="text-sm text-muted-foreground capitalize">{health.database.connection}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Latency</span>
              <span className="text-sm text-muted-foreground">{health.database.latency_ms.toFixed(1)}ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Type</span>
              <span className="text-sm text-muted-foreground">{health.database.type}</span>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Table Records</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Profiles</span>
                  <span className="font-medium">{health.database.tables.profiles}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Roles</span>
                  <span className="font-medium">{health.database.tables.roles}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Permissions</span>
                  <span className="font-medium">{health.database.tables.permissions}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Resources */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Cpu className="h-6 w-6 text-orange-500" />
            <div>
              <CardTitle>System Resources</CardTitle>
              <CardDescription>Server hardware metrics</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* CPU */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  CPU Usage
                </span>
                <span className="text-sm font-bold">{health.system.cpu.usage_percent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(health.system.cpu.usage_percent, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{health.system.cpu.count} cores</p>
            </div>

            {/* Memory */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Memory Usage
                </span>
                <span className="text-sm font-bold">{health.system.memory.usage_percent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(health.system.memory.usage_percent, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {health.system.memory.used_mb.toFixed(0)} / {health.system.memory.total_mb.toFixed(0)} MB
              </p>
            </div>

            {/* Disk */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  Disk Usage
                </span>
                <span className="text-sm font-bold">{health.system.disk.usage_percent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(health.system.disk.usage_percent, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {health.system.disk.used_gb.toFixed(1)} / {health.system.disk.total_gb.toFixed(1)} GB
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
