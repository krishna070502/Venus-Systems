'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api/client'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { StaffPointEntry } from '@/lib/types/poultry'
import { History, Loader2, AlertCircle, ArrowLeft, Calendar, Info, Store } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { format } from 'date-fns'
import { StoreHeader } from '@/components/poultry/StoreHeader'

export default function StaffPointsHistoryPage() {
    const [history, setHistory] = useState<StaffPointEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchHistory = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await api.poultry.staffPoints.getHistory({ limit: 100 }) as StaffPointEntry[]
            setHistory(Array.isArray(data) ? data : [])
        } catch (err: any) {
            setError(err.message || 'Failed to load point history')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchHistory()
    }, [fetchHistory])

    return (
        <PermissionGuard permission="staffpoints.view">
            <div className="flex flex-col h-full bg-muted/20">
                <StoreHeader
                    title="Points History"
                    subtitle="Detailed chronological audit of your performance points"
                    onRefresh={fetchHistory}
                    actions={
                        <Link href="/admin/business/staff-points" className="flex items-center gap-2 px-4 py-2 border rounded-lg bg-card hover:bg-accent transition-colors text-sm font-semibold shadow-sm">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Dashboard
                        </Link>
                    }
                />

                <div className="p-6 max-w-5xl mx-auto w-full">
                    {loading ? (
                        <div className="flex items-center justify-center h-48">
                            <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                        </div>
                    ) : error ? (
                        <div className="bg-destructive/10 text-destructive p-4 rounded-xl flex items-center gap-3 border border-destructive/20">
                            <AlertCircle className="h-5 w-5" />
                            <p className="font-bold text-sm">{error}</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="rounded-2xl border-2 border-dashed bg-card p-16 text-center">
                            <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                                <History className="h-10 w-10 text-muted-foreground/30" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">No History Recorded</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto text-sm">You haven't earned or lost any points yet. Activities like sales and processing will generate history.</p>
                        </div>
                    ) : (
                        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-muted/30 border-b">
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Reason</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Points</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {history.map((entry) => (
                                            <tr key={entry.id} className="hover:bg-muted/10 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm">{format(new Date(entry.effective_date), 'MMM dd, yyyy')}</span>
                                                        <span className="text-[10px] text-muted-foreground font-medium">{format(new Date(entry.created_at), 'HH:mm')}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm text-foreground">{entry.reason}</span>
                                                        <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-tighter">
                                                            {entry.reason_code.replace(/_/g, ' ')}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={cn(
                                                        "inline-flex items-center justify-center w-10 h-10 rounded-xl font-black text-sm border-2",
                                                        entry.points_change >= 0
                                                            ? "bg-green-50 text-green-600 border-green-100"
                                                            : "bg-red-50 text-red-600 border-red-100 shadow-sm"
                                                    )}>
                                                        {entry.points_change > 0 ? `+${entry.points_change}` : entry.points_change}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {entry.reason_details ? (
                                                        <div className="flex items-start gap-2 max-w-xs">
                                                            <Info className="h-3.5 w-3.5 text-muted-foreground/40 mt-0.5 shrink-0" />
                                                            <span className="text-xs text-muted-foreground font-medium leading-relaxed italic line-clamp-2">
                                                                {entry.reason_details}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground/30 italic">No details provided</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </PermissionGuard>
    )
}
