'use client'

import { useState, useEffect } from 'react'
import { Clock, Activity, Award, TrendingUp, Store, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { WidgetConfig } from '../../lib/hooks/useDashboard'
import { cn } from '../../lib/utils'
import { apiRequest } from '../../lib/api/client'

interface DashboardWidgetProps {
    widget: WidgetConfig
    onRemove?: () => void
    onMove?: (direction: 'up' | 'down') => void
    editable?: boolean
    children?: React.ReactNode
}

export function DashboardWidget({ widget, onRemove, onMove, editable = true, children }: DashboardWidgetProps) {
    const sizeClasses = {
        full: 'col-span-full',
        half: 'col-span-1',
        quarter: 'col-span-1 md:col-span-1'
    }

    return (
        <div className={cn(
            "relative bg-card rounded-xl border shadow-sm overflow-hidden",
            sizeClasses[widget.size]
        )}>
            {/* Controls */}
            {editable && (
                <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                    {onMove && (
                        <>
                            <button
                                onClick={() => onMove('up')}
                                className="p-1 rounded-lg bg-background/80 hover:bg-accent text-muted-foreground transition-colors"
                                title="Move up"
                            >
                                <ChevronUp className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => onMove('down')}
                                className="p-1 rounded-lg bg-background/80 hover:bg-accent text-muted-foreground transition-colors"
                                title="Move down"
                            >
                                <ChevronDown className="h-4 w-4" />
                            </button>
                        </>
                    )}
                    {onRemove && (
                        <button
                            onClick={onRemove}
                            className="p-1 rounded-lg bg-background/80 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            title="Remove widget"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    )}
                </div>
            )}
            {children}
        </div>
    )
}

// ============================================================================
// CLOCK WIDGET
// ============================================================================

export function ClockWidget() {
    const [time, setTime] = useState(new Date())

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    return (
        <div className="p-6 flex flex-col items-center justify-center min-h-[180px]">
            <Clock className="h-8 w-8 text-primary mb-4" />
            <div className="text-4xl font-bold tabular-nums">
                {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
                {time.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
        </div>
    )
}

// ============================================================================
// RECENT ACTIVITY WIDGET
// ============================================================================

interface ActivityItem {
    id: string
    action: string
    details: string
    created_at: string
}

export function RecentActivityWidget() {
    const [activities, setActivities] = useState<ActivityItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadActivities = async () => {
            try {
                const data = await apiRequest<any[]>('/api/v1/activity-logs?limit=5')
                setActivities(data.slice(0, 5))
            } catch (err) {
                console.error('Failed to load activities:', err)
            } finally {
                setLoading(false)
            }
        }
        loadActivities()
    }, [])

    return (
        <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Recent Activity</h3>
            </div>

            {loading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
                    ))}
                </div>
            ) : activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
            ) : (
                <div className="space-y-2">
                    {activities.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{activity.action}</p>
                                <p className="text-xs text-muted-foreground">
                                    {(() => {
                                        const date = new Date(activity.created_at);
                                        return isNaN(date.getTime())
                                            ? 'Just now'
                                            : date.toLocaleString('en-IN', {
                                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                            });
                                    })()}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ============================================================================
// STAFF POINTS WIDGET
// ============================================================================

export function StaffPointsWidget() {
    const [points, setPoints] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadPoints = async () => {
            try {
                const data = await apiRequest<{ total_points: number }>('/api/v1/poultry/staff-points/me')
                setPoints(data.total_points || 0)
            } catch (err) {
                console.error('Failed to load points:', err)
                setPoints(0)
            } finally {
                setLoading(false)
            }
        }
        loadPoints()
    }, [])

    return (
        <div className="p-6 flex flex-col items-center justify-center min-h-[180px]">
            <Award className="h-8 w-8 text-amber-500 mb-4" />
            <div className="text-sm text-muted-foreground mb-1">My Points</div>
            {loading ? (
                <div className="h-10 w-24 bg-muted rounded animate-pulse" />
            ) : (
                <div className="text-4xl font-bold text-amber-600">{points?.toLocaleString()}</div>
            )}
            <div className="text-xs text-muted-foreground mt-2">Staff Performance Points</div>
        </div>
    )
}

// ============================================================================
// SALES SUMMARY WIDGET
// ============================================================================

export function SalesSummaryWidget() {
    const [summary, setSummary] = useState<{ total: number; count: number } | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadSummary = async () => {
            try {
                // Fetch global sales summary (across all stores)
                const data = await apiRequest<{ total_sales: number; sale_count: number }>('/api/v1/poultry/sales/summary/global')
                setSummary({ total: data.total_sales || 0, count: data.sale_count || 0 })
            } catch (err) {
                console.error('Failed to load sales:', err)
                setSummary({ total: 0, count: 0 })
            } finally {
                setLoading(false)
            }
        }
        loadSummary()
    }, [])


    return (
        <div className="p-6 flex flex-col items-center justify-center min-h-[180px]">
            <TrendingUp className="h-8 w-8 text-green-500 mb-4" />
            <div className="text-sm text-muted-foreground mb-1">Today's Sales</div>
            {loading ? (
                <div className="h-10 w-32 bg-muted rounded animate-pulse" />
            ) : (
                <div className="text-3xl font-bold text-green-600">
                    ₹{summary?.total.toLocaleString() || 0}
                </div>
            )}
            <div className="text-xs text-muted-foreground mt-2">
                {summary?.count || 0} transactions
            </div>
        </div>
    )
}

// ============================================================================
// STORE SUMMARY WIDGET
// ============================================================================

export function StoreSummaryWidget() {
    return (
        <div className="p-6 flex flex-col items-center justify-center min-h-[180px]">
            <Store className="h-8 w-8 text-primary mb-4" />
            <div className="text-sm text-muted-foreground mb-1">Current Store</div>
            <div className="text-lg font-semibold text-center">Select a store to view summary</div>
            <div className="text-xs text-muted-foreground mt-2">Stock, sales, and more</div>
        </div>
    )
}

// ============================================================================
// WIDGET RENDERER
// ============================================================================

interface WidgetRendererProps {
    widget: WidgetConfig
    onRemove?: () => void
    onMove?: (direction: 'up' | 'down') => void
    editable?: boolean
    shortcuts?: React.ReactNode
}

export function WidgetRenderer({ widget, onRemove, onMove, editable, shortcuts }: WidgetRendererProps) {
    const renderContent = () => {
        switch (widget.type) {
            case 'shortcuts':
                return shortcuts
            case 'clock':
                return <ClockWidget />
            case 'recent-activity':
                return <RecentActivityWidget />
            case 'staff-points':
                return <StaffPointsWidget />
            case 'sales-summary':
                return <SalesSummaryWidget />
            case 'store-summary':
                return <StoreSummaryWidget />
            default:
                return (
                    <div className="p-6 text-center text-muted-foreground">
                        Unknown widget type: {widget.type}
                    </div>
                )
        }
    }

    // Shortcuts widget has its own container, don't wrap it
    if (widget.type === 'shortcuts') {
        return shortcuts || null
    }

    return (
        <DashboardWidget widget={widget} onRemove={onRemove} onMove={onMove} editable={editable}>
            {renderContent()}
        </DashboardWidget>
    )
}
