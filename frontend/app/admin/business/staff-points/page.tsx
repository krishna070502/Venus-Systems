'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api/client'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions } from '@/lib/auth/usePermissions'
import { useStore } from '@/lib/context/StoreContext'
import { StoreHeader } from '@/components/poultry/StoreHeader'
import { LeaderboardEntry, StaffPerformanceBreakdown, StaffGrade } from '@/lib/types/poultry'
import {
    Award,
    Loader2,
    AlertCircle,
    Trophy,
    User,
    Settings,
    TrendingUp,
    Scale,
    Zap,
    TrendingDown,
    Calendar,
    ChevronRight,
    ArrowUpRight,
    Target
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { hasPermission } from '@/lib/auth/usePermissions'

export default function StaffPointsPage() {
    const { currentStore } = useStore()
    const { permissions, loading: permLoading } = usePermissions()
    const [performance, setPerformance] = useState<StaffPerformanceBreakdown | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [period, setPeriod] = useState<'month' | 'year' | 'all'>('month')

    const fetchPerformance = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const today = new Date()
            let fromDate: string | undefined

            if (period === 'month') {
                fromDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
            } else if (period === 'year') {
                fromDate = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0]
            }

            const data = await api.poultry.staffPoints.getBreakdown({
                store_id: currentStore?.id,
                from_date: fromDate
            }) as StaffPerformanceBreakdown
            setPerformance(data)
        } catch (err: any) {
            setError(err.message || 'Failed to load performance data')
        } finally {
            setLoading(false)
        }
    }, [currentStore, period])

    useEffect(() => {
        fetchPerformance()
    }, [fetchPerformance])

    const getGradeColor = (grade: StaffGrade) => {
        switch (grade) {
            case 'A_PLUS': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
            case 'A': return 'text-green-500 bg-green-500/10 border-green-500/20'
            case 'B': return 'text-blue-500 bg-blue-500/10 border-blue-500/20'
            case 'C': return 'text-slate-500 bg-slate-500/10 border-slate-500/20'
            case 'D': return 'text-orange-500 bg-orange-500/10 border-orange-500/20'
            case 'E': return 'text-red-500 bg-red-500/10 border-red-500/20'
            default: return 'text-muted-foreground bg-muted'
        }
    }

    return (
        <PermissionGuard permission="staffpoints.view">
            <div className="flex flex-col h-full bg-muted/20">
                <StoreHeader
                    title="My Performance"
                    subtitle="Track your points, grade, and efficiency metrics"
                    onRefresh={fetchPerformance}
                    actions={
                        <div className="flex items-center gap-2">
                            <select
                                value={period}
                                onChange={(e) => setPeriod(e.target.value as any)}
                                className="bg-card border rounded-lg px-3 py-2 text-sm font-semibold shadow-sm outline-none"
                            >
                                <option value="month">Current Month</option>
                                <option value="year">Current Year</option>
                                <option value="all">Lifetime</option>
                            </select>
                            {hasPermission(permissions, 'staffgrading.config') && (
                                <Link
                                    href="/admin/business/staff-points/config"
                                    className="p-2 border rounded-lg bg-card hover:bg-accent transition-colors shadow-sm"
                                    title="System Configuration"
                                >
                                    <Settings className="h-4 w-4 text-primary" />
                                </Link>
                            )}
                            <Link
                                href="/admin/business/staff-points/leaderboard"
                                className="flex items-center gap-2 px-4 py-2 border rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-bold shadow-sm"
                            >
                                <Trophy className="h-4 w-4" />
                                Leaderboard
                            </Link>
                        </div>
                    }
                />

                <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
                    {loading && !performance ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-4">
                            <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
                            <p className="text-sm font-medium text-muted-foreground">Calculating performance metrics...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-destructive/10 text-destructive p-4 rounded-xl flex items-center gap-3 border border-destructive/20">
                            <AlertCircle className="h-5 w-5" />
                            <p className="text-sm font-bold">{error}</p>
                        </div>
                    ) : performance ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left Column: Summary & Grade */}
                            <div className="space-y-6 lg:col-span-1">
                                <div className="bg-card rounded-2xl border-2 border-primary/10 p-6 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                                        <Award className="h-32 w-32" />
                                    </div>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                            <Trophy className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">Your Status</h3>
                                            <p className="text-xs text-muted-foreground font-medium">Performance Grade</p>
                                        </div>
                                    </div>

                                    <div className="flex items-end justify-between gap-4">
                                        <div className={cn(
                                            "text-6xl font-black rounded-2xl px-6 py-3 border-2 inline-block shadow-inner",
                                            getGradeColor(performance.grade)
                                        )}>
                                            {performance.grade.replace('_', '+')}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl font-black text-foreground">{performance.total_points}</div>
                                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Points</div>
                                        </div>
                                    </div>

                                    <div className="mt-8 pt-6 border-t space-y-4">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                                                <TrendingUp className="h-4 w-4" />
                                                Normalized Score
                                            </div>
                                            <div className="font-mono font-bold text-lg text-primary">{performance.normalized_score.toFixed(3)}</div>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground italic font-medium leading-relaxed">
                                            * Based on {performance.total_weight_handled.toFixed(1)}kg handled this {period}.
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-card rounded-2xl border p-6 shadow-sm">
                                    <h3 className="font-bold mb-4 flex items-center gap-2">
                                        <Scale className="h-4 w-4 text-muted-foreground" />
                                        Variance Efficiency
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                                            <div className="text-green-600 font-bold text-xl">{performance.variance_summary.positive_kg.toFixed(2)}kg</div>
                                            <div className="text-[10px] font-bold text-green-700 uppercase tracking-tighter">Positive (Found)</div>
                                        </div>
                                        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                                            <div className="text-red-600 font-bold text-xl">{performance.variance_summary.negative_kg.toFixed(2)}kg</div>
                                            <div className="text-[10px] font-bold text-red-700 uppercase tracking-tighter">Negative (Lost)</div>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/30 p-2 rounded-lg">
                                        <Calendar className="h-3 w-3" />
                                        Processed {performance.variance_summary.count} variances this {period}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Reason Breakdown */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-card rounded-2xl border shadow-sm overflow-hidden flex flex-col h-full">
                                    <div className="p-6 border-b flex items-center justify-between bg-muted/10">
                                        <div>
                                            <h3 className="font-bold text-lg flex items-center gap-2">
                                                <Zap className="h-5 w-5 text-yellow-500" />
                                                Point Breakdown
                                            </h3>
                                            <p className="text-xs text-muted-foreground font-medium">detailed allocation by reason</p>
                                        </div>
                                        <Link
                                            href="/admin/business/staff-points/history"
                                            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                                        >
                                            View Full History
                                            <ArrowUpRight className="h-3 w-3" />
                                        </Link>
                                    </div>

                                    {performance.points_breakdown.length === 0 ? (
                                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                                            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                                <Target className="h-8 w-8 text-muted-foreground/30" />
                                            </div>
                                            <p className="text-sm font-bold text-muted-foreground">No points recorded for this {period}</p>
                                        </div>
                                    ) : (
                                        <div className="p-2">
                                            {performance.points_breakdown.map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center justify-between p-4 hover:bg-muted/30 rounded-xl transition-colors group"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn(
                                                            "h-10 w-10 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border",
                                                            item.points >= 0 ? "bg-green-50 text-green-600 border-green-100" : "bg-red-50 text-red-600 border-red-100"
                                                        )}>
                                                            {item.points > 0 ? `+${item.points}` : item.points}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-sm">{item.description}</div>
                                                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                                                                {item.reason_code.replace(/_/g, ' ')} • {item.count} events
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground/20 group-hover:text-primary transition-all opacity-0 group-hover:opacity-100" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Tips Carousal / Notice Area */}
                                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 relative overflow-hidden">
                                    <div className="absolute -top-4 -right-4 h-24 w-24 bg-primary/10 rounded-full blur-2xl" />
                                    <h4 className="font-bold text-primary flex items-center gap-2 mb-2">
                                        <User className="h-4 w-4" />
                                        Performance Pro-Tip
                                    </h4>
                                    <p className="text-sm text-primary/80 leading-relaxed font-medium">
                                        Your grade is calculated by <strong>points per KG handled</strong>.
                                        Submitting perfect settlements (Zero Variance) awards 10 points instantly,
                                        significantly boosting your normalized score!
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </PermissionGuard>
    )
}
