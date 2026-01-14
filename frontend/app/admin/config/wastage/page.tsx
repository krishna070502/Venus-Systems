'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api/client'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions } from '@/lib/auth/usePermissions'
import { WastageConfig, BirdType, InventoryType } from '@/lib/types/poultry'
import {
    Scissors,
    ChevronLeft,
    Save,
    Loader2,
    AlertCircle,
    CheckCircle2,
    ToggleLeft,
    ToggleRight,
    Plus,
    Scale,
    ShieldCheck,
    Info,
    History
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default function WastageConfigPage() {
    const { permissions, loading: permLoading } = usePermissions()
    const [configs, setConfigs] = useState<WastageConfig[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    // Form state for new config
    const [showNewForm, setShowNewForm] = useState(false)
    const [newConfig, setNewConfig] = useState({
        bird_type: 'BROILER' as BirdType,
        target_inventory_type: 'SKINLESS' as InventoryType,
        percentage: 0,
        effective_date: new Date().toISOString().split('T')[0],
        is_active: true
    })

    const fetchConfigs = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await api.poultry.processing.getWastageConfig() as WastageConfig[]
            setConfigs(Array.isArray(data) ? data : [])
        } catch (err: any) {
            setError(err.message || 'Failed to load wastage configuration')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchConfigs()
    }, [fetchConfigs])

    const handleSaveNew = async () => {
        if (newConfig.percentage < 0 || newConfig.percentage >= 100) {
            setError('Percentage must be between 0 and 100')
            return
        }

        setSaving(true)
        setError(null)
        setSuccess(null)
        try {
            await api.poultry.processing.setWastageConfig(newConfig)
            setSuccess('New wastage configuration saved successfully')
            setShowNewForm(false)
            fetchConfigs()
        } catch (err: any) {
            setError(err.message || 'Failed to save configuration')
        } finally {
            setSaving(false)
        }
    }

    const handleToggleStatus = async (config: WastageConfig) => {
        setSaving(true)
        setError(null)
        setSuccess(null)
        try {
            await api.poultry.processing.setWastageConfig({
                bird_type: config.bird_type,
                target_inventory_type: config.target_inventory_type,
                percentage: config.percentage,
                effective_date: config.effective_date,
                is_active: !config.is_active
            })
            setSuccess(`Configuration ${!config.is_active ? 'activated' : 'deactivated'}`)
            fetchConfigs()
        } catch (err: any) {
            setError(err.message || 'Failed to update status')
        } finally {
            setSaving(false)
        }
    }

    if (loading && configs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[400px] gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground font-medium">Loading wastage policies...</p>
            </div>
        )
    }

    return (
        <PermissionGuard permission="staffgrading.config">
            <div className="flex flex-col h-full bg-muted/20">
                {/* Header */}
                <div className="bg-card border-b px-6 py-4 flex items-center justify-between sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/admin/business/inventory/processing"
                            className="p-2 hover:bg-muted rounded-full transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold flex items-center gap-2">
                                <Scale className="h-5 w-5 text-primary" />
                                Allowed Wastage Configuration
                            </h1>
                            <p className="text-xs text-muted-foreground font-medium font-mono uppercase tracking-tighter">Processing Yield Policies</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {error && (
                            <div className="flex items-center gap-2 text-xs font-bold text-destructive bg-destructive/10 px-3 py-1.5 rounded-full border border-destructive/20">
                                <AlertCircle className="h-3.5 w-3.5" />
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {success}
                            </div>
                        )}
                        <button
                            onClick={() => setShowNewForm(!showNewForm)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm",
                                showNewForm ? "bg-muted text-foreground border" : "bg-primary text-primary-foreground hover:bg-primary/90"
                            )}
                        >
                            {showNewForm ? 'Cancel' : (
                                <>
                                    <Plus className="h-4 w-4" />
                                    Add Rule
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
                    {/* Information Alert */}
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-4">
                        <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                            <Info className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h4 className="font-bold text-primary text-sm">Policy Governance</h4>
                            <p className="text-xs mt-1 text-primary/80 leading-relaxed">
                                Allowed wastage is used to calculate processing yield and expected inventory. Changes are forward-only and do not affect historical records. Every combination of Bird Type and Output Type should have at least one active rule.
                            </p>
                        </div>
                    </div>

                    {/* New Configuration Form */}
                    {showNewForm && (
                        <div className="bg-card border rounded-xl shadow-lg p-6 animate-in fade-in slide-in-from-top-2">
                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                <Plus className="h-4 w-4 text-primary" />
                                Create New Wastage Rule
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Bird Type</label>
                                    <select
                                        value={newConfig.bird_type}
                                        onChange={(e) => setNewConfig({ ...newConfig, bird_type: e.target.value as BirdType })}
                                        className="w-full px-3 py-2 bg-muted/30 border rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                                    >
                                        <option value="BROILER">Broiler</option>
                                        <option value="PARENT_CULL">Parent Cull</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Output Type</label>
                                    <select
                                        value={newConfig.target_inventory_type}
                                        onChange={(e) => setNewConfig({ ...newConfig, target_inventory_type: e.target.value as InventoryType })}
                                        className="w-full px-3 py-2 bg-muted/30 border rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                                    >
                                        <option value="SKIN">Skin-On</option>
                                        <option value="SKINLESS">Skinless</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Allowed Wastage %</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={newConfig.percentage || ''}
                                            onChange={(e) => setNewConfig({ ...newConfig, percentage: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 bg-muted/30 border rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 pr-8"
                                            placeholder="0.00"
                                            step="0.01"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">%</span>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Effective Date</label>
                                    <input
                                        type="date"
                                        value={newConfig.effective_date}
                                        onChange={(e) => setNewConfig({ ...newConfig, effective_date: e.target.value })}
                                        className="w-full px-3 py-2 bg-muted/30 border rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={handleSaveNew}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
                                >
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    Save Rule
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Configuration Table */}
                    <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b bg-muted/10 flex items-center justify-between">
                            <h3 className="font-bold flex items-center gap-2">
                                <History className="h-4 w-4 text-muted-foreground" />
                                Active Policies & History
                            </h3>
                            <ShieldCheck className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-muted/30 text-left border-b">
                                        <th className="px-6 py-3 font-bold text-xs uppercase tracking-wider">Bird Type</th>
                                        <th className="px-6 py-3 font-bold text-xs uppercase tracking-wider">Output Type</th>
                                        <th className="px-6 py-3 font-bold text-xs uppercase tracking-wider text-right">Allowed Wastage</th>
                                        <th className="px-6 py-3 font-bold text-xs uppercase tracking-wider">Effective From</th>
                                        <th className="px-6 py-3 font-bold text-xs uppercase tracking-wider text-center">Status</th>
                                        <th className="px-6 py-3 font-bold text-xs uppercase tracking-wider text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y text-sm">
                                    {configs.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground font-medium">
                                                No wastage configurations found. Create your first rule to start.
                                            </td>
                                        </tr>
                                    ) : (
                                        configs.map(config => (
                                            <tr key={config.id} className={cn(
                                                "hover:bg-muted/5 transition-colors",
                                                !config.is_active && "opacity-50 grayscale bg-muted/10"
                                            )}>
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-foreground">{config.bird_type}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold uppercase">
                                                        {config.target_inventory_type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="font-mono font-bold text-lg">{Number(config.percentage).toFixed(2)}%</span>
                                                </td>
                                                <td className="px-6 py-4 text-muted-foreground font-medium">
                                                    {new Date(config.effective_date).toLocaleDateString(undefined, {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={cn(
                                                        "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                                        config.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-700 border-slate-200"
                                                    )}>
                                                        {config.is_active ? 'ACTIVE' : 'INACTIVE'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleToggleStatus(config)}
                                                        disabled={saving}
                                                        className={cn(
                                                            "p-2 rounded-lg transition-colors border",
                                                            config.is_active ? "text-red-500 hover:bg-red-50 border-red-100" : "text-green-600 hover:bg-green-50 border-green-100"
                                                        )}
                                                        title={config.is_active ? 'Deactivate Rule' : 'Activate Rule'}
                                                    >
                                                        {config.is_active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </PermissionGuard>
    )
}
