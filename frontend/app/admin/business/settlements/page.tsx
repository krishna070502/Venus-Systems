'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api/client'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import { useStore } from '@/lib/context/StoreContext'
import { StoreHeader } from '@/components/poultry/StoreHeader'
import {
    Settlement,
    SettlementStatus
} from '@/lib/types/poultry'
import {
    AlertTriangle,
    Plus,
    Send,
    FileText,
    Check,
    Loader2,
    AlertCircle,
    TrendingUp,
    Banknote,
    XCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SettlementModal } from '@/components/admin/settlements/SettlementModal'

export default function SettlementsPage() {
    const { currentStore } = useStore()
    const { permissions, loading: permLoading } = usePermissions()
    const [settlements, setSettlements] = useState<Settlement[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState<SettlementStatus | ''>('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null)

    const canApprove = !permLoading && hasPermission(permissions, 'settlements.approve')
    const canCreate = !permLoading && hasPermission(permissions, 'settlements.create')
    const canSubmit = !permLoading && hasPermission(permissions, 'settlements.submit')

    const fetchSettlements = useCallback(async () => {
        if (!currentStore) return
        setLoading(true)
        setError(null)
        try {
            const data = await api.poultry.settlements.getAll(currentStore.id, statusFilter ? { status: statusFilter } : undefined) as Settlement[]
            setSettlements(Array.isArray(data) ? data : [])
        } catch (err: any) {
            setError(err.message || 'Failed to load settlements')
        } finally {
            setLoading(false)
        }
    }, [currentStore, statusFilter])

    useEffect(() => {
        if (currentStore) {
            fetchSettlements()
        }
    }, [currentStore, fetchSettlements])

    const handleOpenModal = (s?: Settlement) => {
        setSelectedSettlement(s || null)
        setIsModalOpen(true)
    }

    const handleApprove = async (id: string) => {
        if (!confirm('Approve this settlement? This will lock the day\'s records.')) return
        try {
            await api.poultry.settlements.approve(id)
            fetchSettlements()
        } catch (err: any) {
            alert(err.message || 'Failed to approve settlement')
        }
    }

    const handleReject = async (id: string) => {
        if (!confirm('Reject this settlement expenses? This will require manager to submit full cash.')) return
        try {
            await api.poultry.settlements.reject(id)
            fetchSettlements()
        } catch (err: any) {
            alert(err.message || 'Failed to reject settlement')
        }
    }

    const statusColors: Record<SettlementStatus, string> = {
        DRAFT: 'bg-yellow-100 text-yellow-800',
        SUBMITTED: 'bg-blue-100 text-blue-800',
        APPROVED: 'bg-green-100 text-green-800',
        REJECTED: 'bg-red-100 text-red-800',
        LOCKED: 'bg-slate-100 text-slate-800',
    }

    return (
        <PermissionGuard permission="settlements.view">
            <div className="flex flex-col h-full bg-muted/20">
                <StoreHeader
                    title="Daily Settlements"
                    subtitle="Review and approve store end-of-day reports"
                    onRefresh={fetchSettlements}
                    actions={
                        canCreate && (
                            <button
                                onClick={() => handleOpenModal()}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all font-bold text-sm shadow-lg shadow-primary/20"
                            >
                                <Plus className="h-4 w-4" />
                                Create Settlement
                            </button>
                        )
                    }
                />

                <div className="p-6">
                    {/* Filters */}
                    <div className="flex gap-4 mb-6">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as SettlementStatus | '')}
                            className="px-4 py-2 border rounded-lg bg-background font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                        >
                            <option value="">All Status</option>
                            <option value="DRAFT">Draft</option>
                            <option value="SUBMITTED">Submitted</option>
                            <option value="APPROVED">Approved</option>
                            <option value="LOCKED">Locked</option>
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
                    ) : settlements.length === 0 ? (
                        <div className="rounded-lg border-2 border-dashed bg-card p-12 text-center text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>No settlements found for this store.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {settlements.map((s) => (
                                <div key={s.id} className="bg-card border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow group">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-primary/10 p-3 rounded-lg text-primary">
                                                <Banknote className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-lg">{new Date(s.settlement_date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-widest mt-0.5">Report ID: {s.id.substring(0, 8)}</div>
                                            </div>
                                        </div>

                                        {(() => {
                                            const expectedSales = s.expected_sales || {}
                                            const totalExpected = Number(expectedSales.CASH || 0) + Number(expectedSales.UPI || 0) + Number(expectedSales.CARD || 0) + Number(expectedSales.BANK || 0)
                                            const totalDeclared = Number(s.declared_cash || 0) + Number(s.declared_upi || 0) + Number(s.declared_card || 0) + Number(s.declared_bank || 0)
                                            const variance = totalDeclared - totalExpected

                                            return (
                                                <>
                                                    <div className="flex items-center gap-8 px-6 border-x hidden lg:flex">
                                                        <div className="text-center">
                                                            <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Total Expected</div>
                                                            <div className="font-bold text-primary">₹{totalExpected.toLocaleString()}</div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Total Declared</div>
                                                            <div className="font-bold">₹{totalDeclared.toLocaleString()}</div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Variance</div>
                                                            <div className={cn(
                                                                "font-bold flex items-center gap-1 justify-center",
                                                                variance < 0 ? "text-red-500" : variance > 0 ? "text-green-500" : "text-muted-foreground"
                                                            )}>
                                                                {variance !== 0 && (variance < 0 ? <TrendingUp className="h-3 w-3 rotate-180" /> : <TrendingUp className="h-3 w-3" />)}
                                                                ₹{Math.abs(variance).toLocaleString()}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4 justify-between md:justify-end min-w-[200px]">
                                                        <span className={cn(
                                                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm",
                                                            statusColors[s.status]
                                                        )}>
                                                            {s.status}
                                                        </span>
                                                        {s.status === 'SUBMITTED' && (
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => handleOpenModal(s)}
                                                                    className="flex items-center gap-2 px-4 py-2 border border-primary/20 bg-primary/5 text-primary rounded-lg hover:bg-primary/10 transition-all font-bold text-sm"
                                                                >
                                                                    <FileText className="h-4 w-4" />
                                                                    Review
                                                                </button>
                                                                {canApprove && (
                                                                    <button
                                                                        onClick={() => handleApprove(s.id)}
                                                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-bold text-sm shadow-md shadow-green-200"
                                                                    >
                                                                        <Check className="h-4 w-4" />
                                                                        Approve
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                        {(s.status === 'APPROVED' || s.status === 'LOCKED') && (
                                                            <button
                                                                onClick={() => handleOpenModal(s)}
                                                                className="flex items-center gap-2 px-4 py-2 border bg-muted/50 rounded-lg hover:bg-muted transition-all font-bold text-sm"
                                                            >
                                                                <FileText className="h-4 w-4" />
                                                                View
                                                            </button>
                                                        )}
                                                        {s.status === 'DRAFT' && canSubmit && (
                                                            <button
                                                                onClick={() => handleOpenModal(s)}
                                                                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all font-bold text-sm shadow-md shadow-primary/20"
                                                            >
                                                                <Send className="h-4 w-4" />
                                                                Submit Report
                                                            </button>
                                                        )}
                                                    </div>
                                                </>
                                            )
                                        })()}
                                    </div>

                                    {(() => {
                                        const expectedSales = s.expected_sales || {}
                                        const totalExpected = Number(expectedSales.CASH || 0) + Number(expectedSales.UPI || 0) + Number(expectedSales.CARD || 0) + Number(expectedSales.BANK || 0)
                                        const totalDeclared = Number(s.declared_cash || 0) + Number(s.declared_upi || 0) + Number(s.declared_card || 0) + Number(s.declared_bank || 0)
                                        const variance = totalDeclared - totalExpected

                                        return variance !== 0 && (
                                            <div className="mt-4 pt-4 border-t flex items-start gap-2 text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg">
                                                <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 mt-0.5 shrink-0" />
                                                <div>
                                                    <span className="font-bold text-yellow-700">Audit Alert:</span>
                                                    {variance < 0
                                                        ? ` Cash shortage of ₹${Math.abs(variance).toLocaleString()} noticed for this day.`
                                                        : ` Excess cash of ₹${variance.toLocaleString()} found.`}
                                                </div>
                                            </div>
                                        )
                                    })()}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <SettlementModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    storeId={currentStore?.id || 0}
                    settlement={selectedSettlement}
                    onSuccess={fetchSettlements}
                />
            </div>
        </PermissionGuard>
    )
}
