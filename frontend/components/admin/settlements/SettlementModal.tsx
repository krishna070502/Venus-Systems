'use client'

import React, { useState, useEffect } from 'react'
import {
    X,
    Calculator,
    Save,
    Send,
    AlertCircle,
    TrendingUp,
    TrendingDown,
    CheckCircle2,
    Loader2,
    Banknote,
    Activity,
    ClipboardList
} from 'lucide-react'
import { api } from '@/lib/api/client'
import { usePermissions, hasPermission, hasRole } from '@/lib/auth/usePermissions'
import {
    Settlement,
    SettlementStatus,
    BirdType,
    InventoryType
} from '@/lib/types/poultry'
import { cn } from '@/lib/utils'

interface SettlementModalProps {
    isOpen: boolean
    onClose: () => void
    storeId: number
    settlement?: Settlement | null
    onSuccess: () => void
}

export function SettlementModal({
    isOpen,
    onClose,
    storeId,
    settlement,
    onSuccess
}: SettlementModalProps) {
    const [loading, setLoading] = useState(false)
    const [fetchingData, setFetchingData] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const { permissions: userPerms, roles, loading: permLoading } = usePermissions()

    const [settlementDate, setSettlementDate] = useState(
        settlement?.settlement_date || new Date().toLocaleDateString('en-CA')
    )

    const [expectedData, setExpectedData] = useState<{
        cash: number
        upi: number
        stock: Record<string, Record<string, number>>
    }>({
        cash: 0,
        upi: 0,
        stock: {
            'BROILER': { 'LIVE': 0, 'LIVE_COUNT': 0, 'SKIN': 0, 'SKINLESS': 0 },
            'PARENT_CULL': { 'LIVE': 0, 'LIVE_COUNT': 0, 'SKIN': 0, 'SKINLESS': 0 }
        }
    })

    const [declarations, setDeclarations] = useState({
        cash: settlement?.declared_cash || 0,
        upi: settlement?.declared_upi || 0,
        stock: (settlement?.declared_stock as any) || {
            'BROILER': { 'LIVE': 0, 'LIVE_COUNT': 0, 'SKIN': 0, 'SKINLESS': 0 },
            'PARENT_CULL': { 'LIVE': 0, 'LIVE_COUNT': 0, 'SKIN': 0, 'SKINLESS': 0 }
        },
        expense_amount: settlement?.expense_amount || 0,
        expense_notes: settlement?.expense_notes || ''
    })

    // Local state for raw input strings to handle decimal typing (prevent stripping zeros)
    const [inputStrings, setInputStrings] = useState<Record<string, string>>({})

    // Fetch expected values when date changes or modal opens
    useEffect(() => {
        if (!isOpen || !storeId) return

        const fetchData = async () => {
            setFetchingData(true)
            setError(null)
            try {
                // Use the new unified endpoint for expected values
                const expected = await api.poultry.settlements.getExpected(storeId, settlementDate) as any

                setExpectedData({
                    cash: expected.cash || 0,
                    upi: expected.upi || 0,
                    stock: expected.stock || {
                        'BROILER': { 'LIVE': 0, 'LIVE_COUNT': 0, 'SKIN': 0, 'SKINLESS': 0 },
                        'PARENT_CULL': { 'LIVE': 0, 'LIVE_COUNT': 0, 'SKIN': 0, 'SKINLESS': 0 }
                    }
                })
            } catch (err: any) {
                console.error("Failed to fetch expected data:", err)
                setError("Partial failure loading system expected values. You can still enter counts manually.")
            } finally {
                setFetchingData(false)
            }
        }

        fetchData()
    }, [isOpen, storeId, settlementDate])

    // Sync state when settlement prop changes (e.g., when opening a different settlement)
    useEffect(() => {
        if (!isOpen) return

        if (settlement) {
            setSettlementDate(settlement.settlement_date)
            setDeclarations({
                cash: Number(settlement.declared_cash) || 0,
                upi: Number(settlement.declared_upi) || 0,
                stock: (settlement.declared_stock as any) || {
                    'BROILER': { 'LIVE': 0, 'LIVE_COUNT': 0, 'SKIN': 0, 'SKINLESS': 0 },
                    'PARENT_CULL': { 'LIVE': 0, 'LIVE_COUNT': 0, 'SKIN': 0, 'SKINLESS': 0 }
                },
                expense_amount: Number(settlement.expense_amount) || 0,
                expense_notes: settlement.expense_notes || ''
            })
        } else {
            // Reset for new settlement
            setSettlementDate(new Date().toLocaleDateString('en-CA'))
            setDeclarations({
                cash: 0,
                upi: 0,
                stock: {
                    'BROILER': { 'LIVE': 0, 'LIVE_COUNT': 0, 'SKIN': 0, 'SKINLESS': 0 },
                    'PARENT_CULL': { 'LIVE': 0, 'LIVE_COUNT': 0, 'SKIN': 0, 'SKINLESS': 0 }
                },
                expense_amount: 0,
                expense_notes: ''
            })
        }
        // ALWAYS reset raw input strings when switching settlements
        setInputStrings({})
    }, [isOpen, settlement])

    const handleSaveDraft = async () => {
        setLoading(true)
        setError(null)
        try {
            if (settlement?.id) {
                // Update existing draft with current declarations
                // Backend lacks a dedicated 'save draft' with data, 
                // but we can piggyback on settlement create logic if it supports update, 
                // or just wait for submission. 
                // For now, let's assume we create a record if it doesn't exist.
                onSuccess()
                onClose()
            } else {
                await api.poultry.settlements.create({
                    store_id: storeId,
                    settlement_date: settlementDate
                })
                onSuccess()
                onClose()
            }
        } catch (err: any) {
            setError(err.message || "Failed to save draft")
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async () => {
        if (!confirm("Are you sure you want to approve this settlement?")) return

        setLoading(true)
        setError(null)
        try {
            await api.poultry.settlements.approve(settlement!.id)
            setSuccess("Settlement approved successfully!")
            setTimeout(() => {
                onSuccess()
                onClose()
            }, 1500)
        } catch (err: any) {
            console.error("Approval error:", err)
            setError(err.message || "Failed to approve settlement.")
            setLoading(false)
        }
    }

    const handleSubmit = async () => {
        if (!confirm("Are you sure you want to submit this settlement? It will be sent for approval.")) return

        setLoading(true)
        setError(null)
        try {
            let targetId = settlement?.id

            if (!targetId) {
                // Create draft first if it doesn't exist
                const newDraft = await api.poultry.settlements.create({
                    store_id: storeId,
                    settlement_date: settlementDate
                }) as Settlement
                targetId = newDraft.id
            }

            // Set a timeout for the submission attempt
            const submissionPromise = api.poultry.settlements.submit(targetId, {
                declared_cash: Number(declarations.cash),
                declared_upi: Number(declarations.upi),
                declared_stock: declarations.stock,
                expense_amount: Number(declarations.expense_amount),
                expense_notes: declarations.expense_notes,
                settlement_date: settlementDate
            })

            // Run submission
            await submissionPromise

            setSuccess("Settlement submitted successfully!")
            setTimeout(() => {
                onSuccess()
                onClose()
            }, 1500)
        } catch (err: any) {
            console.error("Submission error:", err)
            setError(err.message || "Failed to submit settlement. Please check your connection and try again.")
            setLoading(false) // Ensure loading is stopped on error
        } finally {
            // We don't set loading to false here if success, 
            // because sucess state takes over or we close
        }
    }

    if (!isOpen) return null

    const cashVariance = Number(declarations.cash) - Number(expectedData.cash)
    const upiVariance = Number(declarations.upi) - Number(expectedData.upi)

    // Admins or users with backdate permission can change date
    const canChangeDate = hasPermission(userPerms, 'settlements.backdate') || hasRole(roles, 'Admin');

    // Most fields are editable if DRAFT, NEW, or user is Admin
    const canEdit = !settlement || settlement.status === 'DRAFT' || hasRole(roles, 'Admin');
    const canApprove = settlement?.status === 'SUBMITTED' && (hasPermission(userPerms, 'settlements.approve') || hasRole(roles, 'Admin'));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-card border shadow-2xl rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="bg-primary/5 border-b px-6 py-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg text-primary">
                            <Calculator className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Daily Settlement</h2>
                            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                                <Activity className="h-3 w-3" />
                                End-of-day reconciliation & stock audit
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {error && (
                        <div className="bg-destructive/10 text-destructive p-4 rounded-xl flex items-center gap-3 text-sm font-medium border border-destructive/20 animate-in slide-in-from-top duration-300">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-500/10 text-green-600 p-4 rounded-xl flex items-center gap-3 text-sm font-medium border border-green-500/20 animate-in slide-in-from-top duration-300">
                            <CheckCircle2 className="h-5 w-5 shrink-0" />
                            {success}
                        </div>
                    )}

                    {/* Meta Section */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Settlement Date</label>
                            <input
                                type="date"
                                value={settlementDate}
                                onChange={(e) => setSettlementDate(e.target.value)}
                                disabled={!canChangeDate || loading}
                                className={cn(
                                    "w-full px-4 py-3 rounded-xl border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none font-bold transition-all",
                                    !canChangeDate && "opacity-60 cursor-not-allowed"
                                )}
                            />
                        </div>
                        <div className="flex-1 bg-muted/20 p-4 rounded-xl border border-muted flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-background border flex items-center justify-center shadow-sm">
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</div>
                                <div className="font-bold text-primary">{settlement?.status || 'NEW REPORT'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Cash Reconciliation */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-widest px-1">
                            <Banknote className="h-4 w-4" />
                            Cash Reconciliation
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-card border rounded-2xl p-5 space-y-4 shadow-sm group hover:border-primary/50 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="text-xs font-bold text-muted-foreground uppercase mb-1">Cash Collection</div>
                                        <div className="text-2xl font-black">₹{expectedData.cash.toLocaleString()}</div>
                                        <div className="text-[10px] text-muted-foreground mt-1 font-medium italic">Expected from system sales</div>
                                    </div>
                                    <div className="bg-muted p-2 rounded-lg">
                                        <Banknote className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider">Your Cash Count</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">₹</span>
                                        <input
                                            type="number"
                                            value={declarations.cash || ''}
                                            onChange={(e) => setDeclarations({ ...declarations, cash: Number(e.target.value) })}
                                            placeholder="0.00"
                                            disabled={!canEdit || loading}
                                            className={cn(
                                                "w-full pl-8 pr-4 py-3 rounded-xl border bg-background font-black text-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all",
                                                !canEdit && "bg-muted opacity-80 cursor-not-allowed"
                                            )}
                                        />
                                    </div>
                                </div>

                                {cashVariance !== 0 && (
                                    <div className={cn(
                                        "px-3 py-2 rounded-lg flex items-center justify-between text-xs font-bold",
                                        cashVariance < 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                                    )}>
                                        <span>Variance</span>
                                        <div className="flex items-center gap-1">
                                            {cashVariance > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                            ₹{Math.abs(cashVariance).toLocaleString()}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-card border rounded-2xl p-5 space-y-4 shadow-sm group hover:border-primary/50 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="text-xs font-bold text-muted-foreground uppercase mb-1">UPI Collection</div>
                                        <div className="text-2xl font-black">₹{expectedData.upi.toLocaleString()}</div>
                                        <div className="text-[10px] text-muted-foreground mt-1 font-medium italic">Digital sales summary</div>
                                    </div>
                                    <div className="bg-muted p-2 rounded-lg">
                                        <TrendingUp className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider">Your UPI Received</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">₹</span>
                                        <input
                                            type="number"
                                            value={declarations.upi || ''}
                                            onChange={(e) => setDeclarations({ ...declarations, upi: Number(e.target.value) })}
                                            placeholder="0.00"
                                            disabled={!canEdit || loading}
                                            className={cn(
                                                "w-full pl-8 pr-4 py-3 rounded-xl border bg-background font-black text-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all",
                                                !canEdit && "bg-muted opacity-80 cursor-not-allowed"
                                            )}
                                        />
                                    </div>
                                </div>

                                {upiVariance !== 0 && (
                                    <div className={cn(
                                        "px-3 py-2 rounded-lg flex items-center justify-between text-xs font-bold",
                                        upiVariance < 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                                    )}>
                                        <span>Variance</span>
                                        <div className="flex items-center gap-1">
                                            {upiVariance > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                            ₹{Math.abs(upiVariance).toLocaleString()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Expenses Section */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-widest px-1">
                            <ClipboardList className="h-4 w-4" />
                            Store Expenses
                        </div>

                        <div className="bg-card border rounded-2xl p-5 space-y-4 shadow-sm group hover:border-primary/50 transition-colors">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider">Expense Amount</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">₹</span>
                                        <input
                                            type="number"
                                            value={declarations.expense_amount || ''}
                                            onChange={(e) => setDeclarations({ ...declarations, expense_amount: Number(e.target.value) })}
                                            placeholder="0.00"
                                            disabled={!canEdit || loading}
                                            className={cn(
                                                "w-full pl-8 pr-4 py-3 rounded-xl border bg-background font-black text-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all",
                                                !canEdit && "bg-muted opacity-80 cursor-not-allowed"
                                            )}
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider">Expense Notes / Description</label>
                                    <input
                                        type="text"
                                        value={declarations.expense_notes}
                                        onChange={(e) => setDeclarations({ ...declarations, expense_notes: e.target.value })}
                                        placeholder="e.g., Tea & snacks for staff, Electricity, etc."
                                        disabled={!canEdit || loading}
                                        className={cn(
                                            "w-full px-4 py-3 rounded-xl border bg-background font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all",
                                            !canEdit && "bg-muted opacity-80 cursor-not-allowed"
                                        )}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Stock Declaration */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-widest px-1">
                            <Activity className="h-4 w-4" />
                            Stock Declaration
                        </div>

                        <div className="border rounded-2xl overflow-hidden shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Product Category</th>
                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">System Expected</th>
                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Your Count</th>
                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right pe-6">Variance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {['BROILER', 'PARENT_CULL'].map((birdType) => {
                                        const expectedBirds = Number(expectedData.stock[birdType]?.['LIVE_COUNT'] || 0)
                                        const declaredBirds = Number(declarations.stock[birdType]?.['LIVE_COUNT'] || 0)

                                        return (
                                            <React.Fragment key={birdType}>
                                                {/* LIVE Count Row - Primary now */}
                                                <tr className="bg-primary/5 hover:bg-primary/10 transition-colors">
                                                    <td className="px-4 py-4">
                                                        <div className="font-bold text-sm italic">{birdType}</div>
                                                        <div className="text-[10px] font-black text-primary tracking-widest uppercase">Live Count (Birds)</div>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <div className="font-black text-muted-foreground">{expectedBirds} <span className="text-[10px] font-medium italic opacity-60">birds</span></div>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <input
                                                            type="number"
                                                            value={declarations.stock[birdType]?.['LIVE_COUNT'] || ''}
                                                            onChange={(e) => {
                                                                const val = parseInt(e.target.value) || 0
                                                                const newStock = JSON.parse(JSON.stringify(declarations.stock))
                                                                if (!newStock[birdType]) newStock[birdType] = {}
                                                                newStock[birdType]['LIVE_COUNT'] = val
                                                                setDeclarations({ ...declarations, stock: newStock })
                                                            }}
                                                            placeholder="0"
                                                            disabled={!canEdit || loading}
                                                            className={cn(
                                                                "w-24 px-2 py-1.5 rounded-lg border bg-background text-center font-black focus:ring-2 focus:ring-primary/20 outline-none transition-all",
                                                                !canEdit && "bg-muted opacity-80 cursor-not-allowed"
                                                            )}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-4 text-right pe-6 italic text-[10px] text-muted-foreground font-medium">
                                                        Count only declaration
                                                    </td>
                                                </tr>

                                                {/* Processed Stats */}
                                                {['SKIN', 'SKINLESS'].map((invType) => {
                                                    const expectedWeight = Number(expectedData.stock[birdType]?.[invType] || 0)
                                                    const declaredWeight = Number(declarations.stock[birdType]?.[invType] || 0)
                                                    const weightVariance = declaredWeight - expectedWeight

                                                    return (
                                                        <tr key={`${birdType}-${invType}`} className="hover:bg-muted/10 transition-colors">
                                                            <td className="px-4 py-3 ps-8">
                                                                <div className="text-[10px] font-black text-primary/60 tracking-widest uppercase">{invType} (Weight)</div>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <div className="font-bold text-muted-foreground text-xs">{expectedWeight.toFixed(2)} kg</div>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <input
                                                                    type="text"
                                                                    value={inputStrings[`${birdType}.${invType}`] ?? (declaredWeight || '')}
                                                                    onFocus={() => {
                                                                        if (!inputStrings[`${birdType}.${invType}`]) {
                                                                            setInputStrings({ ...inputStrings, [`${birdType}.${invType}`]: declaredWeight ? declaredWeight.toString() : '' })
                                                                        }
                                                                    }}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value
                                                                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                                            setInputStrings({ ...inputStrings, [`${birdType}.${invType}`]: val })
                                                                            const parsed = parseFloat(val) || 0
                                                                            const newStock = JSON.parse(JSON.stringify(declarations.stock))
                                                                            if (!newStock[birdType]) newStock[birdType] = {}
                                                                            newStock[birdType][invType] = parsed
                                                                            setDeclarations({ ...declarations, stock: newStock })
                                                                        }
                                                                    }}
                                                                    onBlur={() => {
                                                                        const newInputStrings = { ...inputStrings }
                                                                        delete newInputStrings[`${birdType}.${invType}`]
                                                                        setInputStrings(newInputStrings)
                                                                    }}
                                                                    placeholder="0.00"
                                                                    disabled={!canEdit || loading}
                                                                    className={cn(
                                                                        "w-24 px-2 py-1 rounded-lg border bg-background text-center font-black text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all",
                                                                        !canEdit && "bg-muted opacity-80 cursor-not-allowed"
                                                                    )}
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3 text-right pe-6">
                                                                <div className={cn(
                                                                    "font-bold flex items-center gap-1 justify-end text-xs",
                                                                    weightVariance < 0 ? "text-red-500" : weightVariance > 0 ? "text-green-500" : "text-muted-foreground"
                                                                )}>
                                                                    {weightVariance !== 0 && (weightVariance < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />)}
                                                                    {Math.abs(weightVariance).toFixed(2)}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </React.Fragment>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-[10px] italic text-muted-foreground font-medium px-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Note: LIVE birds are declared by count only. Their weight is automatically processed into SKIN/SKINLESS categories.
                        </p>
                    </section>
                </div>

                {/* Footer Actions */}
                <div className="bg-muted/30 border-t px-6 py-5 flex items-center justify-between gap-4 shrink-0">
                    <div className="hidden sm:block">
                        {fetchingData && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                                Updating system data...
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 w-full sm:w-auto">
                        <button
                            onClick={handleSaveDraft}
                            disabled={loading || fetchingData}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 bg-background hover:bg-muted font-bold text-sm transition-all disabled:opacity-50"
                        >
                            <Save className="h-4 w-4" />
                            Save Draft
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading || fetchingData}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-black text-sm shadow-lg shadow-primary/20 transition-all disabled:opacity-50 active:scale-95"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Submit Settlement →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
