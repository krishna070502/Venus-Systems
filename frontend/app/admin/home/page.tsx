'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    RefreshCw,
    Home
} from 'lucide-react'
import { useDashboard, WidgetConfig } from '../../../lib/hooks/useDashboard'
import { usePermissions, hasPermission } from '../../../lib/auth/usePermissions'
import { useAuth } from '../../../lib/auth/AuthProvider'
import { ShortcutGrid } from '../../../components/dashboard/ShortcutGrid'
import { WidgetRenderer } from '../../../components/dashboard/DashboardWidgets'
import { WidgetPicker } from '../../../components/dashboard/WidgetPicker'
import { PageLoading } from '../../../components/ui/loading'

export default function AdminHomePage() {
    const router = useRouter()
    const { user, loading: authLoading } = useAuth()
    const { permissions, roles, loading: permLoading } = usePermissions()
    const {
        config,
        shortcuts,
        homepagePreference,
        loading,
        error,
        tablesExist,
        addWidget,
        removeWidget,
        addShortcut,
        updateShortcut,
        deleteShortcut,
        moveWidget,
        updateHomepagePreference,
        refresh
    } = useDashboard()

    const isAdmin = roles.includes('Admin')
    const canCustomize = hasPermission(permissions, 'dashboard.customize')

    // Redirect to login if not authenticated (though AdminLayout handles this, we keep it for safety)
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login')
        }
    }, [authLoading, user, router])

    if (authLoading || permLoading || loading) {
        return <PageLoading text="Loading your home dashboard..." />
    }

    if (!user) {
        return null
    }

    // Get greeting based on time
    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Good morning'
        if (hour < 17) return 'Good afternoon'
        return 'Good evening'
    }

    // Get first name from user profile or fall back to email prefix
    const firstName = (user as any).user_metadata?.full_name?.split(' ')[0] || (user as any).full_name?.split(' ')[0] || user.email?.split('@')[0] || 'User'


    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Context Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        {getGreeting()}, {firstName}!
                    </h1>
                    <p className="text-muted-foreground">
                        Welcome back to your personalized control center.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => refresh()}
                        className="p-2.5 hover:bg-accent rounded-xl border transition-all active:scale-95"
                        title="Refresh Data"
                    >
                        <RefreshCw className="h-5 w-5" />
                    </button>

                    {config && canCustomize && (
                        <WidgetPicker
                            onAdd={addWidget}
                            existingWidgets={config.layout.widgets}
                        />
                    )}
                </div>
            </div>

            {/* Quick Actions / Preference Notice */}
            {!tablesExist && (
                <div className="p-4 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    <p className="text-sm">
                        Customizations are stored locally until the database migration is applied.
                    </p>
                </div>
            )}

            {error && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-xl border border-destructive/20 text-sm">
                    {error}
                </div>
            )}


            {/* Widgets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {config?.layout.widgets.map((widget: WidgetConfig) => {
                    if (widget.type === 'shortcuts') {
                        return (
                            <div key={widget.id} className="col-span-full bg-card rounded-2xl border p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-bold">Quick Links</h2>
                                    {canCustomize && (
                                        <div className="flex items-center gap-4 text-xs font-medium">
                                            <button
                                                onClick={() => moveWidget(widget.id, 'up')}
                                                className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                                            >
                                                Move Up
                                            </button>
                                            <button
                                                onClick={() => moveWidget(widget.id, 'down')}
                                                className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                                            >
                                                Move Down
                                            </button>
                                            <button
                                                onClick={() => removeWidget(widget.id)}
                                                className="text-destructive/70 hover:text-destructive transition-colors flex items-center gap-1"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <ShortcutGrid
                                    shortcuts={shortcuts}
                                    onAdd={addShortcut}
                                    onUpdate={updateShortcut}
                                    onDelete={deleteShortcut}
                                    editable={canCustomize}
                                />
                            </div>
                        )
                    }

                    return (
                        <WidgetRenderer
                            key={widget.id}
                            widget={widget}
                            onRemove={() => removeWidget(widget.id)}
                            onMove={(dir: 'up' | 'down') => moveWidget(widget.id, dir)}
                            editable={canCustomize}
                        />
                    )
                })}
            </div>

            {/* Empty State */}
            {config?.layout.widgets.length === 0 && (
                <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed">
                    <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
                        <Home className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Your Home is Empty</h2>
                    <p className="text-muted-foreground mb-8 max-w-xs mx-auto">
                        {canCustomize
                            ? "Personalize your dashboard by adding widgets that matter most to you."
                            : "Your dashboard is currently empty. Contact an administrator to add widgets."}
                    </p>
                    {canCustomize && <WidgetPicker onAdd={addWidget} existingWidgets={[]} />}
                </div>
            )}
        </div>
    )
}
