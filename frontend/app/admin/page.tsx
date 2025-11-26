'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, ShieldCheck, Key, Activity } from 'lucide-react'
import { PageLoading } from '@/components/ui/loading'
import { PermissionGuard } from '@/components/admin/PermissionGuard'

export default function AdminDashboard() {
  return (
    <PermissionGuard permission="systemdashboard.view">
      <AdminDashboardContent />
    </PermissionGuard>
  )
}

function AdminDashboardContent() {
  const router = useRouter()
  const [stats, setStats] = useState({
    total_users: 0,
    total_roles: 0,
    total_permissions: 0,
    active_sessions: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const data = await api.admin.getStats() as {
        total_users: number
        total_roles: number
        total_permissions: number
        active_sessions: number
      }
      setStats(data)
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <PageLoading text="Loading dashboard..." />
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#1E4DD8]">Welcome to CoreDesk</h1>
        <p className="text-muted-foreground mt-2">
          Your Application's Control Center - Manage users, roles, and permissions
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_users}</div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Roles</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_roles}</div>
            <p className="text-xs text-muted-foreground">System roles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Permissions</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_permissions}</div>
            <p className="text-xs text-muted-foreground">Available permissions</p>
          </CardContent>
        </Card>

        <Link href="/admin/sessions">
          <Card className="cursor-pointer hover:border-core-blue transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active_sessions}</div>
              <p className="text-xs text-muted-foreground">Current user sessions</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div 
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
            onClick={() => router.push('/admin/users')}
          >
            <div>
              <p className="font-medium">Manage Users</p>
              <p className="text-sm text-muted-foreground">View and edit user accounts</p>
            </div>
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <div 
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
            onClick={() => router.push('/admin/roles')}
          >
            <div>
              <p className="font-medium">Configure Roles</p>
              <p className="text-sm text-muted-foreground">Set up roles and permissions</p>
            </div>
            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          </div>
          <div 
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
            onClick={() => router.push('/admin/logs')}
          >
            <div>
              <p className="font-medium">System Logs</p>
              <p className="text-sm text-muted-foreground">View system activity</p>
            </div>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
