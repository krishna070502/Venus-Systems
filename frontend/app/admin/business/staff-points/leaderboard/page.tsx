'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api/client'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { LeaderboardEntry, StaffGrade } from '@/lib/types/poultry'
import { Trophy, RefreshCw, Loader2, AlertCircle, ArrowLeft, Store, Calendar, Award } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useStore } from '@/lib/context/StoreContext'

export default function LeaderboardPage() {
    const { currentStore } = useStore()
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [period, setPeriod] = useState<'week' | 'month' | 'year' | 'all'>('month')

    const fetchLeaderboard = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            // Show all stores - don't filter by currentStore
            const data = await api.poultry.staffPoints.getLeaderboard(
                undefined,
                period
            ) as any // Response structure update handled here

            // The backend returns { entries: LeaderboardEntry[], ... }
            const entries = data.entries || data
            setLeaderboard(Array.isArray(entries) ? entries : [])
        } catch (err: any) {
            setError(err.message || 'Failed to load leaderboard')
        } finally {
            setLoading(false)
        }
    }, [period])

    useEffect(() => {
        fetchLeaderboard()
    }, [fetchLeaderboard])

    const getRankStyle = (rank: number) => {
        switch (rank) {
            case 1: return 'from-yellow-400/20 to-yellow-600/20 border-yellow-500/50 shadow-yellow-500/10'
            case 2: return 'from-gray-300/20 to-gray-500/20 border-gray-400/50 shadow-gray-400/10'
            case 3: return 'from-orange-400/20 to-orange-600/20 border-orange-500/50 shadow-orange-500/10'
            default: return 'border-muted bg-card'
        }
    }

    const getGradeBadge = (grade?: StaffGrade) => {
        if (!grade) return null
        const color = grade.startsWith('A') ? 'text-green-500 bg-green-50' :
            grade === 'B' ? 'text-blue-500 bg-blue-50' :
                grade === 'C' ? 'text-slate-500 bg-slate-50' : 'text-red-500 bg-red-50'
        return (
            <span className={cn("px-2 py-0.5 rounded text-[10px] font-black border", color)}>
                {grade.replace('_', '+')}
            </span>
        )
    }

    return (
        <PermissionGuard permission="staffpoints.viewall">
            <div className="p-6 max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/business/staff-points" className="p-2 border rounded-xl hover:bg-accent transition-colors shadow-sm bg-card">
                            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black flex items-center gap-2 tracking-tight">
                                <Trophy className="h-8 w-8 text-yellow-500" />
                                Leaderboard
                            </h1>
                            <p className="text-muted-foreground text-sm font-medium flex items-center gap-1.5 mt-0.5">
                                <Store className="h-3 w-3" />
                                All Stores • {period.toUpperCase()}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center p-1 bg-muted/30 rounded-xl border">
                            {(['week', 'month', 'year', 'all'] as const).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={cn(
                                        "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                                        period === p
                                            ? "bg-card shadow-sm text-primary"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {p.toUpperCase()}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={fetchLeaderboard}
                            disabled={loading}
                            className="p-2.5 border rounded-xl hover:bg-accent transition-colors shadow-sm bg-card disabled:opacity-50"
                        >
                            <RefreshCw className={cn("h-4 w-4 text-muted-foreground", loading && "animate-spin")} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                {loading && leaderboard.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4">
                        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
                        <p className="text-sm font-medium text-muted-foreground italic">Crunching performance data...</p>
                    </div>
                ) : error ? (
                    <div className="bg-destructive/10 text-destructive p-4 rounded-xl border border-destructive/20 flex items-center gap-3">
                        <AlertCircle className="h-5 w-5" />
                        <p className="font-bold text-sm">{error}</p>
                    </div>
                ) : leaderboard.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed bg-card p-16 text-center">
                        <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                            <Trophy className="h-10 w-10 text-muted-foreground/30" />
                        </div>
                        <h3 className="text-2xl font-black mb-2 opacity-80 uppercase tracking-tighter italic">No Rankings Found</h3>
                        <p className="text-muted-foreground font-medium max-w-sm mx-auto leading-relaxed">
                            Looks like nobody has earned any points in this period yet. Time to get to work!
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {leaderboard.map((staff, idx) => {
                            const isTopThree = staff.rank <= 3
                            return (
                                <div
                                    key={staff.user_id}
                                    className={cn(
                                        "group bg-gradient-to-br border-2 p-5 rounded-2xl flex items-center gap-6 transition-all hover:scale-[1.01] hover:shadow-xl",
                                        getRankStyle(staff.rank)
                                    )}
                                >
                                    <div className={cn(
                                        "w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-inner border-2",
                                        staff.rank === 1 ? "bg-yellow-400 text-yellow-900 border-yellow-500" :
                                            staff.rank === 2 ? "bg-slate-200 text-slate-700 border-slate-300" :
                                                staff.rank === 3 ? "bg-orange-200 text-orange-800 border-orange-300" :
                                                    "bg-muted text-muted-foreground border-transparent"
                                    )}>
                                        {staff.rank}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <div className="font-bold text-lg truncate group-hover:text-primary transition-colors">
                                                {staff.user_name || 'Anonymous Staff'}
                                            </div>
                                            {getGradeBadge(staff.grade)}
                                        </div>
                                        <div className="text-xs text-muted-foreground font-medium truncate flex items-center gap-1 opacity-70">
                                            <Store className="h-3 w-3" />
                                            {staff.user_email}
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <Award className={cn("h-4 w-4", isTopThree ? "text-primary" : "text-muted-foreground/30")} />
                                            <div className="font-black text-2xl tracking-tighter text-foreground">
                                                {staff.total_points.toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest leading-none">
                                            Total Points
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </PermissionGuard>
    )
}
