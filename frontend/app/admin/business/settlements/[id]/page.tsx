'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api/client'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions, hasPermission, hasRole } from '@/lib/auth/usePermissions'
import { useStore } from '@/lib/context/StoreContext'
import {
    Settlement,
    SettlementStatus
} from '@/lib/types/poultry'
import {
    ChevronLeft,
    Loader2,
    AlertCircle,
    Clock,
    CheckCircle2,
    Lock,
    FileText,
    IndianRupee,
    Activity,
    ClipboardList,
    AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SettlementDetailPage() {
    const { id } = useParams()
    const router = useRouter()
    const { permissions, roles, loading: permLoading } = usePermissions()

    const [settlement, setSettlement] = useState<Settlement | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchSettlement = useCallback(async () => {
        if (!id) return
        setLoading(true)
        setError(null)
        try {
            const data = await api.poultry.settlements.getById(id as string) as Settlement
            setSettlement(data)
        } catch (err: any) {
            setError(err.message || 'Failed to load settlement details')
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => {
        fetchSettlement()
    }, [fetchSettlement])

    const handleApprove = async () => {
        if (!settlement) return
        try {
            await api.poultry.settlements.approve(settlement.id)
            fetchSettlement()
        } catch (err: any) {
            alert(err.message || 'Failed to approve settlement')
        }
    }

    const getStatusConfig = (status: SettlementStatus) => {
        switch (status) {
            case 'APPROVED':
                return { icon: CheckCircle2, color: 'text-green-600 bg-green-50 border-green-200', label: 'Approved' }
            case 'LOCKED':
                return { icon: Lock, color: 'text-slate-600 bg-slate-50 border-slate-200', label: 'Locked' }
            case 'SUBMITTED':
                return { icon: Clock, color: 'text-blue-600 bg-blue-50 border-blue-200', label: 'Submitted' }
            case 'REJECTED':
                return { icon: AlertCircle, color: 'text-red-600 bg-red-50 border-red-200', label: 'Rejected (Legacy)' }
            default:
                return { icon: FileText, color: 'text-amber-600 bg-amber-50 border-amber-200', label: 'Draft' }
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        )
    }

    if (error || !settlement) {
        return (
            <div className="max-w-4xl mx-auto mt-20 p-8 text-center bg-card border rounded-2xl">
                <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Error Loading Settlement</h2>
                <p className="text-muted-foreground mb-6">{error || 'Settlement not found'}</p>
                <button onClick={() => router.back()} className="px-6 py-2 bg-primary text-white rounded-lg">
                    Go Back
                </button>
            </div>
        )
    }

    const isSubmitted = settlement.status === 'SUBMITTED'
    const canApprove = !permLoading && (hasPermission(permissions, 'settlements.approve') || hasRole(roles, 'Admin'))
    const statusConfig = getStatusConfig(settlement.status)
    const StatusIcon = statusConfig.icon

    // Variance Math
    const expectedSales = settlement.expected_sales || {}
    const totalExpected = Number(expectedSales.CASH || 0) + Number(expectedSales.UPI || 0) + Number(expectedSales.CARD || 0) + Number(expectedSales.BANK || 0)
    const totalDeclared = Number(settlement.declared_cash || 0) + Number(settlement.declared_upi || 0) + Number(settlement.declared_card || 0) + Number(settlement.declared_bank || 0)
    const variance = totalDeclared - totalExpected

    // Expense Logic
    const isExpenseRejected = (settlement as any).expense_status === 'REJECTED'
    const netSubmission = Number(settlement.declared_cash) - (isExpenseRejected ? 0 : Number(settlement.expense_amount))

    return (
        <PermissionGuard permission="settlements.view">
            <div className="flex flex-col h-full bg-muted/20 pb-20">
                <div className="bg-card border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-muted rounded-full transition-colors"
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold">Settlement Details</h1>
                            <p className="text-xs text-muted-foreground font-mono">{settlement.id}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-bold",
                            statusConfig.color
                        )}>
                            <StatusIcon className="h-4 w-4" />
                            {statusConfig.label}
                        </div>
                        {isSubmitted && canApprove && (
                            <button
                                onClick={handleApprove}
                                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-green-200 transition-all hover:bg-green-700 hover:scale-[1.02] active:scale-95"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                Approve Settlement
                            </button>
                        )}
                    </div>
                </div>

                <div className="p-6 max-w-5xl mx-auto w-full space-y-8">
                    {/* Top Info Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-card p-4 rounded-2xl border shadow-sm">
                            <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Settlement Date</div>
                            <div className="text-lg font-bold">{new Date(settlement.settlement_date).toLocaleDateString('en-IN', { dateStyle: 'full' })}</div>
                        </div>
                        <div className="bg-card p-4 rounded-2xl border shadow-sm">
                            <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Declared Cash</div>
                            <div className="text-lg font-bold font-mono">₹{Number(settlement.declared_cash).toLocaleString()}</div>
                        </div>
                        <div className="bg-card p-4 rounded-2xl border shadow-sm">
                            <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Expense Amount</div>
                            <div className="flex items-center gap-2">
                                <div className="text-lg font-bold font-mono text-red-500">₹{Number(settlement.expense_amount).toLocaleString()}</div>
                                {(settlement as any).expense_status && (
                                    <span className={cn(
                                        "px-1.5 py-0.5 rounded text-[8px] font-black uppercase",
                                        (settlement as any).expense_status === 'APPROVED' ? "bg-green-100 text-green-700" :
                                            (settlement as any).expense_status === 'REJECTED' ? "bg-red-100 text-red-700" :
                                                "bg-blue-100 text-blue-700"
                                    )}>
                                        {(settlement as any).expense_status}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="bg-card p-4 rounded-2xl border shadow-sm">
                            <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Net Submission</div>
                            <div className="text-lg font-bold font-mono text-primary">₹{netSubmission.toLocaleString()}</div>
                        </div>
                    </div>

                    {/* Reconciliation Details */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            {/* Financial Breakdown */}
                            <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                                <div className="bg-primary/5 px-6 py-4 border-b flex items-center gap-2">
                                    <IndianRupee className="h-5 w-5 text-primary" />
                                    <h3 className="font-bold">Financial Reconciliation</h3>
                                </div>
                                <div className="p-0">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/30 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                            <tr>
                                                <th className="px-6 py-3 text-left">Category</th>
                                                <th className="px-6 py-3 text-right">Expected</th>
                                                <th className="px-6 py-3 text-right">Declared</th>
                                                <th className="px-6 py-3 text-right">Variance</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {['CASH', 'UPI', 'CARD', 'BANK'].map((cat) => {
                                                const exp = Number(expectedSales[cat] || 0)
                                                const dec = Number(settlement[`declared_${cat.toLowerCase()}` as keyof Settlement] || 0)
                                                const diff = dec - exp
                                                return (
                                                    <tr key={cat} className="hover:bg-muted/10 transition-colors font-medium">
                                                        <td className="px-6 py-4">{cat}</td>
                                                        <td className="px-6 py-4 text-right font-mono text-muted-foreground">₹{exp.toLocaleString()}</td>
                                                        <td className="px-6 py-4 text-right font-mono font-bold">₹{dec.toLocaleString()}</td>
                                                        <td className={cn(
                                                            "px-6 py-4 text-right font-bold font-mono",
                                                            diff < 0 ? "text-red-500" : diff > 0 ? "text-green-500" : "text-muted-foreground"
                                                        )}>
                                                            {diff > 0 ? '+' : ''}{diff.toLocaleString()}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                            <tr className="bg-muted/20 font-black">
                                                <td className="px-6 py-4 uppercase tracking-widest text-[10px]">TOTAL</td>
                                                <td className="px-6 py-4 text-right font-mono">₹{totalExpected.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right font-mono">₹{totalDeclared.toLocaleString()}</td>
                                                <td className={cn(
                                                    "px-6 py-4 text-right font-mono",
                                                    variance < 0 ? "text-red-500" : variance > 0 ? "text-green-500" : "text-muted-foreground"
                                                )}>
                                                    {variance > 0 ? '+' : ''}{variance.toLocaleString()}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Stock Breakdown */}
                            <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                                <div className="bg-primary/5 px-6 py-4 border-b flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-primary" />
                                    <h3 className="font-bold">Stock Declaration</h3>
                                </div>
                                <div className="p-0">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/30 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                            <tr>
                                                <th className="px-6 py-3 text-left">Item</th>
                                                <th className="px-6 py-3 text-right">Expected</th>
                                                <th className="px-6 py-3 text-right">Declared</th>
                                                <th className="px-6 py-3 text-right">Variance</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {['BROILER', 'PARENT_CULL'].map((bird) => (
                                                <React.Fragment key={bird}>
                                                    <tr className="bg-muted/5 font-bold italic text-muted-foreground">
                                                        <td colSpan={4} className="px-6 py-2 text-xs">{bird}</td>
                                                    </tr>
                                                    {['LIVE_COUNT', 'LIVE', 'SKIN', 'SKINLESS'].map((type) => {
                                                        const exp = Number((settlement.expected_stock as any)?.[bird]?.[type] || 0)
                                                        const dec = Number((settlement.declared_stock as any)?.[bird]?.[type] || 0)
                                                        const diff = dec - exp
                                                        const isCount = type === 'LIVE_COUNT'
                                                        return (
                                                            <tr key={type} className="hover:bg-muted/10 transition-colors">
                                                                <td className="px-8 py-3 text-xs font-semibold">{type.replace('_COUNT', ' (Birds)').replace('LIVE', 'Live Weight (kg)').replace('SKIN', 'Skin Weight (kg)')}</td>
                                                                <td className="px-6 py-3 text-right font-mono text-muted-foreground">{isCount ? exp : exp.toFixed(2)}</td>
                                                                <td className="px-6 py-3 text-right font-mono font-bold">{isCount ? dec : dec.toFixed(2)}</td>
                                                                <td className={cn(
                                                                    "px-6 py-3 text-right font-bold font-mono",
                                                                    diff < 0 ? "text-red-500" : diff > 0 ? "text-green-500" : "text-muted-foreground"
                                                                )}>
                                                                    {diff > 0 ? '+' : ''}{isCount ? diff : diff.toFixed(2)}
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            {/* Variance Alert */}
                            {variance !== 0 && (
                                <div className={cn(
                                    "p-5 rounded-2xl border flex flex-col gap-3 shadow-sm",
                                    variance < 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"
                                )}>
                                    <div className="flex items-center gap-2 font-bold text-sm">
                                        <AlertTriangle className={cn("h-5 w-5", variance < 0 ? "text-red-600" : "text-green-600")} />
                                        Audit Alert
                                    </div>
                                    <p className="text-sm opacity-80 leading-relaxed font-medium">
                                        {variance < 0
                                            ? `A shortage of ₹${Math.abs(variance).toLocaleString()} was detected. This requires investigation into sales records.`
                                            : `An excess of ₹${variance.toLocaleString()} was found. Please ensure all sales have been recorded.`}
                                    </p>
                                </div>
                            )}

                            {/* Expense Context */}
                            <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                                <div className="bg-primary/5 px-6 py-4 border-b flex items-center gap-2">
                                    <ClipboardList className="h-5 w-5 text-primary" />
                                    <h3 className="font-bold">Expense Context</h3>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Manager Notes</div>
                                        <div className="text-sm font-medium italic bg-muted/30 p-4 rounded-xl border border-dashed">
                                            {settlement.expense_notes || 'No notes provided.'}
                                        </div>
                                    </div>
                                    {settlement.expense_receipts && settlement.expense_receipts.length > 0 && (
                                        <div>
                                            <div className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Receipts</div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {settlement.expense_receipts.map((url, i) => (
                                                    <a
                                                        key={i}
                                                        href={url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="bg-muted p-2 rounded-lg text-[10px] font-bold text-primary hover:bg-primary/10 transition-colors truncate"
                                                    >
                                                        Bill_{i + 1}.jpg
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <p className="text-[10px] text-center text-muted-foreground font-medium italic mt-4">
                                        Note: Verify individual expenses on the dedicated Expenses page.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PermissionGuard>
    )
}
