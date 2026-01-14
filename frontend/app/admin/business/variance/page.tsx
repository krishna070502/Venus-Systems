'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api/client'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import { useStore } from '@/lib/context/StoreContext'
import { StoreHeader } from '@/components/poultry/StoreHeader'
import {
    VarianceLog,
    VarianceLogStatus,
} from '@/lib/types/poultry'
import {
    Scale,
    Check,
    Loader2,
    AlertCircle,
    TrendingDown,
    TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function VariancePage() {
    const { currentStore } = useStore()
    const { permissions, loading: permLoading } = usePermissions()
    const [logs, setLogs] = useState<VarianceLog[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState<VarianceLogStatus | ''>('')

    const canApprove = !permLoading && hasPermission(permissions, 'variance.approve')

    const fetchLogs = useCallback(async () => {
        if (!currentStore) return
        setLoading(true)
        setError(null)
        try {
            const data = await api.poultry.variance.getAll(currentStore.id, statusFilter ? { status: statusFilter } : undefined) as VarianceLog[]
            setLogs(Array.isArray(data) ? data : [])
        } catch (err: any) {
            setError(err.message || 'Failed to load variance logs')
        } finally {
            setLoading(false)
        }
    }, [currentStore, statusFilter])

    useEffect(() => {
        if (currentStore) {
            fetchLogs()
        }
    }, [currentStore, fetchLogs])

    const handleApprove = async (id: string) => {
        const notes = prompt('Enter approval notes (optional):')
        if (notes === null) return // Cancelled

        try {
            await api.poultry.variance.approve(id, { notes: notes || 'Approved' })
            fetchLogs()
        } catch (err: any) {
            alert(err.message || 'Failed to approve variance')
        }
    }

    return (
        <PermissionGuard permission="variance.read">
            <div className="flex flex-col h-full bg-muted/20">
                <StoreHeader
                    title="Variance & Adjustments"
                    subtitle="Track and resolve stock discrepancies"
                    onRefresh={fetchLogs}
                />

                <div className="p-6">
                    {/* Filters */}
                    <div className="flex gap-4 mb-6">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as VarianceLogStatus | '')}
                            className="px-4 py-2 border rounded-lg bg-background font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                        >
                            <option value="">All Status</option>
                            <option value="PENDING">Pending Approval</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                            <option value="DEDUCTED">Deducted from Points</option>
                        </select>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center h-48">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : error ? (
                        <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" />
                            {error}
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="rounded-lg border-2 border-dashed bg-card p-12 text-center text-muted-foreground">
                            <Scale className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>No variance logs found for this store.</p>
                        </div>
                    ) : (
                        <div className="bg-card rounded-lg border overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50 font-medium">
                                            <th className="px-4 py-3 text-left">Date</th>
                                            <th className="px-4 py-3 text-left">SKU</th>
                                            <th className="px-4 py-3 text-right">Difference (kg)</th>
                                            <th className="px-4 py-3 text-left">Reason / Notes</th>
                                            <th className="px-4 py-3 text-center">Status</th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap">{new Date(log.created_at).toLocaleDateString()}</td>
                                                <td className="px-4 py-3">
                                                    <div className="font-bold">
                                                        {log.bird_type.replace('_', ' ')} • {log.inventory_type}
                                                    </div>
                                                </td>
                                                <td className={cn(
                                                    "px-4 py-3 text-right font-mono font-bold",
                                                    log.variance_weight > 0 ? "text-green-600" : log.variance_weight < 0 ? "text-red-500" : "text-muted-foreground"
                                                )}>
                                                    <div className="flex items-center justify-end gap-1">
                                                        {Number(log.variance_weight) > 0 ? <TrendingUp className="h-3 w-3" /> : Number(log.variance_weight) < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                                                        {Number(log.variance_weight) > 0 ? '+' : ''}{Number(log.variance_weight).toFixed(2)}kg
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-xs font-semibold uppercase text-accent-foreground/70 mb-1">
                                                        {log.variance_type}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground italic max-w-xs truncate">{log.notes || 'No comments'}</div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                                            log.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                                                log.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                                                    log.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                                                        )}>
                                                            {log.status}
                                                        </span>
                                                        <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                            By: {log.status === 'PENDING' ? (log.submitted_by_name || 'Staff') : (log.resolved_by_name || 'Admin')}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                                    {log.status === 'PENDING' && canApprove && (
                                                        <button
                                                            onClick={() => handleApprove(log.id)}
                                                            className="text-xs font-bold text-green-600 hover:text-green-700 bg-green-50 px-3 py-1.5 rounded-lg transition-colors border border-green-100"
                                                        >
                                                            Approve Fix
                                                        </button>
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
