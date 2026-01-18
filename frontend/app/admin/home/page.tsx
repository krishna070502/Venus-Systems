'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    RefreshCw,
    Home,
    Edit3,
    Check
} from 'lucide-react'
import { useDashboard, WidgetConfig } from '../../../lib/hooks/useDashboard'
import { usePermissions, hasPermission } from '../../../lib/auth/usePermissions'
import { useAuth } from '../../../lib/auth/AuthProvider'
import { ShortcutGrid } from '../../../components/dashboard/ShortcutGrid'
import { WidgetRenderer } from '../../../components/dashboard/DashboardWidgets'
import { WidgetPicker } from '../../../components/dashboard/WidgetPicker'
import { DraggableWidgetGrid } from '../../../components/dashboard/DraggableWidgetGrid'
import { PageLoading } from '../../../components/ui/loading'
import { cn } from '../../../lib/utils'

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
        reorderWidgets,
        resizeWidget,
        updateHomepagePreference,
        refresh
    } = useDashboard()

    const [isEditMode, setIsEditMode] = useState(false)

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

    // Handle widget reorder from drag-drop
    const handleReorder = async (reorderedWidgets: WidgetConfig[]) => {
        await reorderWidgets(reorderedWidgets)
    }

    // Render individual widget content
    const renderWidgetContent = (widget: WidgetConfig) => {
        if (widget.type === 'shortcuts') {
            return (
                <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
                    <ShortcutGrid
                        shortcuts={shortcuts}
                        onAdd={addShortcut}
                        onUpdate={updateShortcut}
                        onDelete={deleteShortcut}
                        editable={canCustomize}
                        isEditMode={isEditMode}
                    />
                </div>
            )
        }

        // For other widget types, use the existing WidgetRenderer's internal content
        return (
            <WidgetRenderer
                widget={widget}
                onRemove={() => { }}
                onMove={() => { }}
                editable={false}
            />
        )
    }

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

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => refresh()}
                        className="p-2.5 hover:bg-accent rounded-xl border transition-all active:scale-95"
                        title="Refresh Data"
                    >
                        <RefreshCw className="h-5 w-5" />
                    </button>

                    {canCustomize && (
                        <>
                            {/* Edit Mode Toggle */}
                            <button
                                onClick={() => setIsEditMode(!isEditMode)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all active:scale-95 font-medium",
                                    isEditMode
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "hover:bg-accent"
                                )}
                                title={isEditMode ? "Done editing" : "Edit layout"}
                            >
                                {isEditMode ? (
                                    <>
                                        <Check className="h-4 w-4" />
                                        Done
                                    </>
                                ) : (
                                    <>
                                        <Edit3 className="h-4 w-4" />
                                        Edit
                                    </>
                                )}
                            </button>

                            {/* Widget Picker - only visible in edit mode */}
                            {isEditMode && config && (
                                <WidgetPicker
                                    onAdd={addWidget}
                                    existingWidgets={config.layout.widgets}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Edit Mode Indicator */}
            {isEditMode && canCustomize && (
                <div className="bg-primary/5 border-2 border-primary/20 border-dashed rounded-xl p-4 flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
                    <p className="text-sm font-medium text-primary">
                        Edit mode active — Drag widgets to reorder, use controls to resize or remove.
                    </p>
                </div>
            )}

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


            {/* Widgets Grid with Drag-Drop */}
            {config && config.layout.widgets.length > 0 ? (
                <DraggableWidgetGrid
                    widgets={config.layout.widgets}
                    onReorder={handleReorder}
                    onRemove={removeWidget}
                    onResize={resizeWidget}
                    onMove={moveWidget}
                    renderWidget={renderWidgetContent}
                    editable={canCustomize}
                    isEditMode={isEditMode}
                />
            ) : (
                /* Empty State */
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
