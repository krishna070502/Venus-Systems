'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, ShieldCheck, Key, Activity, Home, BookOpen, Settings, Sparkles, FileText, TestTube, LayoutDashboard } from 'lucide-react'
import { PageLoading } from '../../components/ui/loading'
import { usePermissions } from '../../lib/auth/usePermissions'
import { useAuth } from '../../lib/auth/AuthProvider'
import { useDashboard } from '../../lib/hooks/useDashboard'

export default function AdminDashboard() {
  const router = useRouter()
  const { permissions, roles, loading: permLoading } = usePermissions()
  const { user, loading: authLoading } = useAuth()
  const { homepagePreference } = useDashboard()

  const isAdmin = roles.includes('Admin')
  const canViewDashboard = permissions.includes('systemdashboard.view')

  useEffect(() => {
    if (!authLoading && !permLoading) {
      if (!user) {
        router.push('/auth/login')
      } else if (!isAdmin) {
        // Non-admins go to home page
        router.push('/admin/home')
      }
      // Admins can stay on /admin if they navigate here directly
    }
  }, [user, isAdmin, authLoading, permLoading, router])


  if (authLoading || permLoading) {
    return <PageLoading text="Loading..." />
  }

  if (canViewDashboard) {
    return <AdminDashboardContent />
  } else {
    return <HomeLandingPage />
  }
}

// Landing page for users without dashboard access
function HomeLandingPage() {
  const { user } = useAuth()
  const { permissions, loading: permissionsLoading } = usePermissions()

  // Define feature mapping for known permissions
  const featureMap: Record<string, { name: string; description: string; href: string; icon: any }> = {
    'systemdashboard.view': {
      name: 'System Dashboard',
      description: 'View system overview',
      href: '/admin',
      icon: LayoutDashboard
    },
    'users.read': {
      name: 'User Management',
      description: 'View and manage users',
      href: '/admin/users',
      icon: Users
    },
    'roles.read': {
      name: 'Role Management',
      description: 'Configure roles',
      href: '/admin/roles',
      icon: ShieldCheck
    },
    'permissions.read': {
      name: 'Permissions',
      description: 'Manage permissions',
      href: '/admin/permissions',
      icon: Key
    },
    'system.admin': {
      name: 'System Health',
      description: 'Monitor system status',
      href: '/admin/health',
      icon: Activity
    },
    'system.settings': {
      name: 'Settings',
      description: 'Configure system',
      href: '/admin/settings',
      icon: Settings
    },
    'system.logs': {
      name: 'Audit Logs',
      description: 'View system logs',
      href: '/admin/logs',
      icon: FileText
    },
    'system.docs': {
      name: 'Documentation',
      description: 'Browse guides',
      href: '/admin/docs',
      icon: BookOpen
    },
    'test.run': {
      name: 'Test Suite',
      description: 'Run tests',
      href: '/admin/test',
      icon: TestTube
    }
  }

  // Get all features user has access to
  const availableFeatures = permissions
    .filter(perm => featureMap[perm])
    .map(perm => ({ permission: perm, ...featureMap[perm] }))

  // Get permissions without features (just display permission keys)
  const otherPermissions = permissions.filter(perm => !featureMap[perm])

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4 py-12">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#1E4DD8] to-[#29C6D1] flex items-center justify-center">
            <Home className="h-10 w-10 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-[#1E4DD8] to-[#29C6D1] bg-clip-text text-transparent">
          Welcome to Venus Chicken
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Hello, {user?.email || 'User'}! You're successfully logged in.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
        <Card className="border-2 hover:border-[#1E4DD8] transition-all">
          <CardHeader>
            <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
              <ShieldCheck className="h-6 w-6 text-[#1E4DD8]" />
            </div>
            <CardTitle>Enterprise-Grade Security</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Built with advanced role-based access control (RBAC) to keep your data secure and organized.
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 hover:border-[#29C6D1] transition-all">
          <CardHeader>
            <div className="h-12 w-12 rounded-lg bg-teal-100 flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-[#29C6D1]" />
            </div>
            <CardTitle>Modern & Beautiful</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Enjoy a clean, intuitive interface built with the latest technologies and best practices.
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 hover:border-[#1E4DD8] transition-all">
          <CardHeader>
            <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
            <CardTitle>Real-Time Monitoring</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Track system health, user activity, and performance metrics in real-time.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="max-w-5xl mx-auto bg-gradient-to-br from-blue-50 to-teal-50 border-2">
        <CardHeader>
          <CardTitle className="text-2xl">Your Available Features</CardTitle>
          <CardDescription>Based on your current permissions</CardDescription>
        </CardHeader>
        <CardContent>
          {permissionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <div className="animate-spin h-8 w-8 border-4 border-[#1E4DD8] border-t-transparent rounded-full mx-auto"></div>
                <p className="text-sm text-muted-foreground">Loading your features...</p>
              </div>
            </div>
          ) : permissions.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You have access to the following areas:
              </p>

              {/* Feature Cards */}
              {availableFeatures.length > 0 && (
                <div className="grid gap-3 md:grid-cols-2">
                  {availableFeatures.map((feature) => {
                    const Icon = feature.icon
                    return (
                      <Link key={feature.permission} href={feature.href}>
                        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border hover:border-[#1E4DD8] transition-all cursor-pointer">
                          <Icon className="h-5 w-5 text-[#1E4DD8]" />
                          <div>
                            <p className="font-medium">{feature.name}</p>
                            <p className="text-xs text-muted-foreground">{feature.description}</p>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}

              {/* Other Permissions */}
              {otherPermissions.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm font-medium mb-3">Additional Permissions:</p>
                  <div className="flex flex-wrap gap-2">
                    {otherPermissions.map((perm) => (
                      <div key={perm} className="px-3 py-1.5 bg-white rounded-md border border-gray-200 text-xs font-mono text-gray-700">
                        {perm}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                You don't have any specific permissions assigned yet. Please contact your administrator for access.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="max-w-5xl mx-auto">
        <CardHeader>
          <CardTitle>Need More Access?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            If you need additional permissions or access to more features, please reach out to your system administrator.
          </p>
          <div className="flex gap-4">
            <div className="flex-1 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="font-medium text-sm mb-1">Current Role</p>
              <p className="text-xs text-muted-foreground">
                Contact admin to upgrade your access level
              </p>
            </div>
            <div className="flex-1 p-4 bg-teal-50 rounded-lg border border-teal-200">
              <p className="font-medium text-sm mb-1">Support</p>
              <p className="text-xs text-muted-foreground">
                Email support for assistance
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// System dashboard for users with permission
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
        <h1 className="text-3xl font-bold text-[#1E4DD8]">System Dashboard</h1>
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
          <Card className="cursor-pointer hover:border-[#1E4DD8] transition-colors">
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
