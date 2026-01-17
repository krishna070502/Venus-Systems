'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api/client'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import { useStore } from '@/lib/context/StoreContext'
import { StoreHeader } from '@/components/poultry/StoreHeader'
import {
    ProcessingCreate,
    ProcessingEntry,
    BirdType,
    InventoryType
} from '@/lib/types/poultry'
import {
    Scissors,
    Plus,
    ArrowRight,
    TrendingDown,
    Loader2,
    AlertCircle,
    X as XIcon,
    Scale,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default function ProcessingPage() {
    const { currentStore } = useStore()
    const { permissions, loading: permLoading } = usePermissions()
    const [entries, setEntries] = useState<ProcessingEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)

    // Form state
    const [formData, setFormData] = useState({
        input_bird_type: 'BROILER' as BirdType,
        input_weight: 0,
        input_bird_count: 0,
        output_inventory_type: 'SKINLESS' as InventoryType,
    })
    const [localOutputWeight, setLocalOutputWeight] = useState(0)
    const [actualOutputWeight, setActualOutputWeight] = useState<number | ''>('')
    const [configuredWastage, setConfiguredWastage] = useState(0)
    const [isCalculating, setIsCalculating] = useState(false)
    const [localNotes, setLocalNotes] = useState('')

    const canCreate = !permLoading && hasPermission(permissions, 'processing.create')

    const fetchEntries = useCallback(async () => {
        if (!currentStore) return
        setLoading(true)
        setError(null)
        try {
            const data = await api.poultry.processing.getAll(currentStore.id, { limit: 50 }) as ProcessingEntry[]
            setEntries(Array.isArray(data) ? data : [])
        } catch (err: any) {
            setError(err.message || 'Failed to load processing history')
        } finally {
            setLoading(false)
        }
    }, [currentStore])

    useEffect(() => {
        if (currentStore) {
            fetchEntries()
        }
    }, [currentStore, fetchEntries])

    // Auto-calculate yield when inputs change
    useEffect(() => {
        const calculateYield = async () => {
            if (formData.input_weight > 0 && formData.input_bird_type && formData.output_inventory_type) {
                setIsCalculating(true)
                try {
                    const result = await api.poultry.processing.calculateYield({
                        input_weight: formData.input_weight,
                        bird_type: formData.input_bird_type,
                        output_type: formData.output_inventory_type
                    }) as any
                    if (result && result.output_weight) {
                        const est = Number(Number(result.output_weight).toFixed(3))
                        setLocalOutputWeight(est)
                        // If actual is empty, pre-fill with estimated
                        if (actualOutputWeight === '') {
                            setActualOutputWeight(est)
                        }
                        setConfiguredWastage(Number(result.wastage_percentage))
                    }
                } catch (err) {
                    console.error('Failed to calculate yield:', err)
                } finally {
                    setIsCalculating(false)
                }
            }
        };

        const timeoutId = setTimeout(calculateYield, 500);
        return () => clearTimeout(timeoutId);
    }, [formData.input_weight, formData.input_bird_type, formData.output_inventory_type]);

    const yieldPercentage = formData.input_weight && localOutputWeight
        ? (localOutputWeight / formData.input_weight) * 100
        : 0

    const wastageWeight = (formData.input_weight || 0) - (localOutputWeight || 0)

    const handleCreate = async () => {
        if (!currentStore) return
        if (!formData.input_weight || formData.input_weight <= 0) {
            setSaveError('Input weight must be greater than 0')
            return
        }

        setSaving(true)
        setSaveError(null)
        try {
            await api.poultry.processing.create({
                store_id: currentStore.id,
                input_bird_type: formData.input_bird_type,
                output_inventory_type: formData.output_inventory_type,
                input_weight: formData.input_weight,
                input_bird_count: formData.input_bird_count || undefined,
                actual_output_weight: typeof actualOutputWeight === 'number' ? actualOutputWeight : undefined,
            })
            setShowModal(false)
            fetchEntries()
        } catch (err: any) {
            setSaveError(err.message || 'Failed to save processing entry')
        } finally {
            setSaving(false)
        }
    }

    return (
        <PermissionGuard permission="processing.read">
            <div className="flex flex-col h-full bg-muted/20">
                <StoreHeader
                    title="Processing"
                    subtitle="Convert live birds to skin/skinless meat"
                    onRefresh={fetchEntries}
                    actions={
                        <div className="flex items-center gap-2">
                            {hasPermission(permissions, 'staffgrading.config') && (
                                <Link
                                    href="/admin/config/wastage"
                                    className="flex items-center gap-2 px-4 py-2 border rounded-lg bg-card hover:bg-accent transition-colors text-sm font-semibold shadow-sm"
                                >
                                    <Scale className="h-4 w-4 text-primary" />
                                    Configure Wastage
                                </Link>
                            )}
                            {canCreate && (
                                <button
                                    onClick={() => {
                                        setFormData({
                                            input_bird_type: 'BROILER',
                                            input_weight: 0,
                                            input_bird_count: 0,
                                            output_inventory_type: 'SKINLESS',
                                        })
                                        setLocalOutputWeight(0)
                                        setActualOutputWeight('')
                                        setLocalNotes('')
                                        setSaveError(null)
                                        setShowModal(true)
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                                >
                                    <Plus className="h-4 w-4" />
                                    New Entry
                                </button>
                            )}
                        </div>
                    }
                />

                <div className="p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-48">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : error ? (
                        <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" />
                            {error}
                        </div>
                    ) : entries.length === 0 ? (
                        <div className="rounded-lg border-2 border-dashed bg-card p-12 text-center text-muted-foreground">
                            <Scissors className="h-16 w-16 mx-auto mb-4 opacity-20" />
                            <h3 className="text-xl font-semibold mb-2 text-foreground">No Processing History</h3>
                            <p className="mb-4 text-sm">Start by converting your live stock into processed meat.</p>
                            {canCreate && (
                                <button
                                    onClick={() => setShowModal(true)}
                                    className="text-primary hover:underline font-medium text-sm"
                                >
                                    Create your first entry
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="bg-card rounded-lg border overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50 font-medium">
                                            <th className="px-4 py-3 text-left">Date</th>
                                            <th className="px-4 py-3 text-left">Bird Type</th>
                                            <th className="px-4 py-3 text-right">Input (Live)</th>
                                            <th className="px-4 py-3 text-center"></th>
                                            <th className="px-4 py-3 text-left">Output (Type)</th>
                                            <th className="px-4 py-3 text-right">Output (Weight)</th>
                                            <th className="px-4 py-3 text-right">Yield %</th>
                                            <th className="px-4 py-3 text-right text-red-600">Wastage</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {entries.map((entry) => (
                                            <tr key={entry.id} className="hover:bg-muted/10 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap">{new Date(entry.created_at).toLocaleString()}</td>
                                                <td className="px-4 py-3 font-medium">{entry.input_bird_type}</td>
                                                <td className="px-4 py-3 text-right font-mono">{Number(entry.input_weight).toFixed(2)} kg</td>
                                                <td className="px-4 py-3 text-center text-muted-foreground"><ArrowRight className="h-4 w-4 inline" /></td>
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold uppercase">
                                                        {entry.output_inventory_type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono font-bold text-primary">{Number(entry.output_weight).toFixed(2)} kg</td>
                                                <td className="px-4 py-3 text-right font-semibold text-green-600">{(100 - Number(entry.wastage_percentage)).toFixed(1)}%</td>
                                                <td className="px-4 py-3 text-right font-mono text-red-500">{Number(entry.wastage_weight).toFixed(2)} kg</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                        <div className="bg-card rounded-xl border shadow-2xl w-full max-w-lg overflow-hidden">
                            <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/30">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Scissors className="h-5 w-5 text-primary" />
                                    New Processing Entry
                                </h2>
                                <button onClick={() => setShowModal(false)} className="p-1 hover:bg-accent rounded-lg transition-colors">
                                    <XIcon className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {saveError && <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm flex items-center gap-2 font-medium">
                                    <AlertCircle className="h-4 w-4" />
                                    {saveError}
                                </div>}

                                <div className="grid grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Bird Type</label>
                                        <select
                                            value={formData.input_bird_type}
                                            onChange={(e) => setFormData({ ...formData, input_bird_type: e.target.value as BirdType })}
                                            className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 appearance-none outline-none font-medium text-lg"
                                        >
                                            <option value="BROILER">🐔 Broiler</option>
                                            <option value="PARENT_CULL">🐓 Parent Cull</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">No. of Birds</label>
                                        <input
                                            type="number"
                                            value={formData.input_bird_count || ''}
                                            onChange={(e) => setFormData({ ...formData, input_bird_count: parseInt(e.target.value) || 0 })}
                                            className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none font-mono text-lg"
                                            placeholder="0"
                                            min="1"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Input Weight (kg)</label>
                                        <input
                                            type="number"
                                            value={formData.input_weight || ''}
                                            onChange={(e) => setFormData({ ...formData, input_weight: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none font-mono text-lg"
                                            placeholder="0.00"
                                            step="0.01"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-dashed">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Output Type</label>
                                        <select
                                            value={formData.output_inventory_type}
                                            onChange={(e) => setFormData({ ...formData, output_inventory_type: e.target.value as InventoryType })}
                                            className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 appearance-none outline-none font-medium text-lg"
                                        >
                                            <option value="SKIN">Skin-On</option>
                                            <option value="SKINLESS">Skinless</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider block">Estimated Output (kg)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={localOutputWeight || ''}
                                                readOnly
                                                className="w-full px-4 py-2 bg-muted/50 border rounded-lg outline-none font-mono text-lg font-bold text-muted-foreground cursor-not-allowed"
                                                placeholder="0.00"
                                            />
                                            {isCalculating && (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-primary uppercase tracking-wider block">Actual Weight (kg)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={actualOutputWeight}
                                                onChange={(e) => setActualOutputWeight(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                                className="w-full px-4 py-2 bg-white border-2 border-primary rounded-lg outline-none font-mono text-lg font-bold text-primary focus:ring-4 focus:ring-primary/10 transition-all"
                                                placeholder="0.00"
                                                step="0.001"
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <Scale className="h-5 w-5 text-primary opacity-50" />
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground font-medium">Recorded weight for inventory and wastage tracking</p>
                                    </div>
                                </div>

                                {/* Summary Box */}
                                <div className="bg-muted/50 p-4 rounded-xl space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-muted-foreground">Configured Wastage:</span>
                                        <span className="text-sm font-bold text-primary">
                                            {configuredWastage.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-muted-foreground">Estimated Yield:</span>
                                        <span className={cn(
                                            "text-lg font-bold",
                                            yieldPercentage > (100 - configuredWastage - 5) ? "text-green-600" : "text-yellow-600"
                                        )}>
                                            {yieldPercentage.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-red-500">
                                        <div className="flex items-center gap-1">
                                            <TrendingDown className="h-4 w-4" />
                                            <span className="text-sm font-medium">Total Wastage:</span>
                                        </div>
                                        <span className="font-mono font-bold">{wastageWeight.toFixed(2)} kg</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider text-xs">Notes (Internal)</label>
                                    <textarea
                                        value={localNotes}
                                        onChange={(e) => setLocalNotes(e.target.value)}
                                        className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm min-h-[80px]"
                                        placeholder="E.g. High wastage due to..."
                                    />
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-muted/30 border-t flex items-center justify-end gap-3">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-6 py-2.5 font-semibold text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={saving}
                                    className="px-8 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all font-bold disabled:opacity-50 shadow-lg shadow-primary/20 flex items-center gap-2"
                                >
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                    Save Processing Record
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </PermissionGuard>
    )
}
