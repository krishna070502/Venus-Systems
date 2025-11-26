'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthProvider'
import { AdminSidebar } from '@/components/admin/Sidebar'
import { UserAvatar } from '@/components/admin/UserAvatar'
import { StatusIndicators } from '@/components/admin/StatusIndicators'
import { AlertProvider } from '@/components/ui/alert-modal'
import { LoadingSpinner } from '@/components/ui/loading'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" variant="default" text="Loading CoreDesk..." />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <AlertProvider>
      <div className="h-screen flex overflow-hidden">
        <AdminSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="border-b bg-card px-8 py-4 flex items-center justify-between flex-shrink-0">
            <div>
              <h1 className="text-2xl font-bold text-[#1E4DD8]">CoreDesk</h1>
              <p className="text-sm text-muted-foreground">Your Application's Control Center</p>
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
    </AlertProvider>
  )
}
