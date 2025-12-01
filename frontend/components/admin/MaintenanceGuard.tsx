'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions, hasRole } from '@/lib/auth/usePermissions'
import { AlertTriangle, Wrench, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading'
import { createClient } from '@/lib/supabase/client'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface MaintenanceGuardProps {
  children: React.ReactNode
}

export function MaintenanceGuard({ children }: MaintenanceGuardProps) {
  const { roles, loading: permissionsLoading } = usePermissions()
  const [maintenanceMode, setMaintenanceMode] = useState<boolean | null>(null)
  const [checkingMaintenance, setCheckingMaintenance] = useState(true)
  const router = useRouter()

  // Check maintenance mode status
  useEffect(() => {
    const checkMaintenanceMode = async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/auth/maintenance-status`)
        if (response.ok) {
          const data = await response.json()
          setMaintenanceMode(data.maintenance_mode)
        } else {
          setMaintenanceMode(false) // Default to not in maintenance on error
        }
      } catch (error) {
        console.error('Failed to check maintenance mode:', error)
        setMaintenanceMode(false) // Default to not in maintenance on error
      } finally {
        setCheckingMaintenance(false)
      }
    }

    checkMaintenanceMode()

    // Check every 30 seconds in case admin toggles it
    const interval = setInterval(checkMaintenanceMode, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  // Still loading - show spinner
  if (checkingMaintenance || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="xl" variant="default" text="Checking system status..." />
      </div>
    )
  }

  // Check if user is admin - admins can always access
  const isAdmin = hasRole(roles, 'Admin')

  // If maintenance mode is enabled and user is NOT admin, show maintenance page
  if (maintenanceMode && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-lg border-orange-200 dark:border-orange-800 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-20 h-20 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-4">
              <Wrench className="h-10 w-10 text-orange-600 dark:text-orange-400 animate-pulse" />
            </div>
            <CardTitle className="text-2xl font-bold text-orange-700 dark:text-orange-400">
              System Under Maintenance
            </CardTitle>
            <CardDescription className="text-base mt-2">
              We're currently performing scheduled maintenance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-orange-800 dark:text-orange-200">
                  <p className="font-medium mb-1">What's happening?</p>
                  <p className="text-orange-700 dark:text-orange-300">
                    Our team is working on improving the system. This typically takes a few minutes to a few hours.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                Maintenance in progress
              </p>
              <p className="text-center text-xs">
                If you're an administrator, please log in with your admin account to access the system.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={() => window.location.reload()}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                Check Again
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Sign Out & Switch Account
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Venus Chicken - We apologize for any inconvenience
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Not in maintenance mode or user is admin - render children
  return <>{children}</>
}
