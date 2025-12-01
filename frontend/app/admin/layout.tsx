'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthProvider'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import { AdminSidebar } from '@/components/admin/Sidebar'
import { UserAvatar } from '@/components/admin/UserAvatar'
import { StatusIndicators } from '@/components/admin/StatusIndicators'
import { GlobalSearch } from '@/components/admin/GlobalSearch'
import { MaintenanceGuard } from '@/components/admin/MaintenanceGuard'
import { AlertProvider } from '@/components/ui/alert-modal'
import { LoadingSpinner } from '@/components/ui/loading'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const { permissions, loading: permissionsLoading } = usePermissions()
  const router = useRouter()

  const canViewSearchBar = !permissionsLoading && hasPermission(permissions, 'gsearchbar.view')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" variant="default" text="Loading Venus Chicken..." />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <AlertProvider>
      <MaintenanceGuard>
        <div className="h-screen flex overflow-hidden">
          <AdminSidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <header className="border-b bg-card px-8 py-4 flex items-center justify-between flex-shrink-0 relative z-10">
              <div className="flex items-center gap-8">
                <div>
                  <h1 className="text-2xl font-bold text-[#1E4DD8]">Venus Chicken</h1>
                  <p className="text-sm text-muted-foreground">Your Application's Control Center</p>
                </div>
                {canViewSearchBar && <GlobalSearch />}
              </div>
              <div className="flex items-center gap-4">
                <StatusIndicators />
                <UserAvatar />
              </div>
            </header>
            <main className="flex-1 p-8 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
      </MaintenanceGuard>
    </AlertProvider>
  )
}
