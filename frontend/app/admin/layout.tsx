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
import AIChatWidget from '@/components/ai/AIChatWidget'

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
            <header className="border-b bg-white px-8 py-5 flex items-center justify-between flex-shrink-0 relative z-10">
              <div className="flex-1 flex items-center">
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
        {/* AI Chat Widget */}
        <AIChatWidget />
      </MaintenanceGuard>
    </AlertProvider>
  )
}

