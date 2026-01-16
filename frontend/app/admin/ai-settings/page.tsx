'use client'

import AIConfigDashboard from '@/components/ai/AIConfigDashboard'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import { PageLoading } from '@/components/ui/loading'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, Lock } from 'lucide-react'

export default function AISettingsPage() {
    const { permissions: userPermissions, loading: permissionsLoading } = usePermissions()

    if (permissionsLoading) {
        return <PageLoading text="Verifying admin access..." />
    }

    const canAdminAI = hasPermission(userPermissions, 'ai.admin')

    if (!canAdminAI) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Card className="max-w-md border-red-100 bg-red-50">
                    <CardContent className="pt-6 text-center space-y-4">
                        <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                            <Lock className="h-6 w-6 text-red-600" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold text-red-900">Access Denied</h2>
                            <p className="text-sm text-red-700">
                                You do not have the <code className="bg-red-200 px-1 rounded">ai.admin</code> permission required to configure Invy AI settings.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="border-b pb-4">
                <h1 className="text-3xl font-bold tracking-tight">AI Configuration</h1>
                <p className="text-muted-foreground mt-2">
                    Manage Invy's role-based access, data visibility, and operational boundaries.
                </p>
            </div>

            <AIConfigDashboard />
        </div>
    )
}
