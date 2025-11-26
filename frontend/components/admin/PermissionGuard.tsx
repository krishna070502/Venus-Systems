'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import { PageLoading } from '@/components/ui/loading'
import { AlertCircle } from 'lucide-react'

interface PermissionGuardProps {
  children: React.ReactNode
  permission: string
  fallback?: React.ReactNode
}

export function PermissionGuard({ children, permission, fallback }: PermissionGuardProps) {
  const router = useRouter()
  const { permissions, loading } = usePermissions()

  useEffect(() => {
    if (!loading && !hasPermission(permissions, permission)) {
      // Redirect to dashboard if user doesn't have permission
      router.push('/admin')
    }
  }, [loading, permissions, permission, router])

  // Show loading state while checking permissions
  if (loading) {
    return <PageLoading />
  }

  // If user doesn't have permission, show fallback or nothing (will redirect)
  if (!hasPermission(permissions, permission)) {
    return fallback || (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-4">
          You don't have permission to access this page.
        </p>
        <p className="text-sm text-muted-foreground">
          Required permission: <code className="bg-muted px-2 py-1 rounded">{permission}</code>
        </p>
      </div>
    )
  }

  // User has permission, render children
  return <>{children}</>
}
