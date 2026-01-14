'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api/client'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions } from '@/lib/auth/usePermissions'
import { OverallGradingConfig, ReasonCode } from '@/lib/types/poultry'
import {
    Award,
    Settings,
    ChevronLeft,
    Save,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Target,
    Zap,
    Scale,
    ShieldAlert,
    Clock,
    DollarSign,
    Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

type SettingsTab = 'points' | 'grading' | 'incentives'

export default function GradingConfigPage() {
    const { permissions, loading: permLoading } = usePermissions()
    const [activeTab, setActiveTab] = useState<SettingsTab>('points')
    const [overallConfig, setOverallConfig] = useState<OverallGradingConfig | null>(null)
    const [reasonCodes, setReasonCodes] = useState<ReasonCode[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const [configData, codesData] = await Promise.all([
                api.poultry.grading.getConfig(),
                api.poultry.grading.getReasonCodes()
            ])
            setOverallConfig(configData as OverallGradingConfig)
            setReasonCodes(codesData as ReasonCode[])
        } catch (err: any) {
            setError(err.message || 'Failed to load configuration data')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleUpdateReason = async (code: string, points: number) => {
        setSaving(true)
        setError(null)
        setSuccess(null)
        try {
            await api.poultry.grading.updateReasonCode(code, { points_value: points })
            setSuccess(`Updated point value for ${code}`)
            fetchData()
        } catch (err: any) {
            setError(err.message || 'Failed to update point value')
        } finally {
            setSaving(false)
        }
    }

    const handleUpdateConfig = async (key: string, value: number) => {
        setSaving(true)
        setError(null)
        setSuccess(null)
        try {
            await api.poultry.grading.updateConfig(key, { config_value: value })
            setSuccess(`Updated setting ${key}`)
            fetchData()
        } catch (err: any) {
            setError(err.message || 'Failed to update setting')
        } finally {
            setSaving(false)
        }
    }

    if (loading && !overallConfig) {
        return (
            <div className="flex flex-col items-center justify-center h-[400px] gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground font-medium">Loading configuration system...</p>
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
                            href="/admin/business/staff-points"
                            className="p-2 hover:bg-muted rounded-full transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold flex items-center gap-2">
                                <Settings className="h-5 w-5 text-primary" />
                                System Configuration
                            </h1>
                            <p className="text-xs text-muted-foreground font-medium font-mono uppercase tracking-tighter">Staff Points & Performance Engine</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {error && (
                            <div className="flex items-center gap-2 text-xs font-bold text-destructive bg-destructive/10 px-3 py-1.5 rounded-full border border-destructive/20 animate-in fade-in slide-in-from-top-1">
                                <AlertCircle className="h-3.5 w-3.5" />
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-200 animate-in fade-in slide-in-from-top-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {success}
                            </div>
                        )}
                        <button
                            onClick={fetchData}
                            className="p-2 hover:bg-muted rounded-lg transition-colors border shadow-sm bg-card"
                            title="Refresh Data"
                        >
                            <Loader2 className={cn("h-4 w-4", saving && "animate-spin")} />
                        </button>
                    </div>
                </div>

                <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
                    {/* Tabs */}
                    <div className="flex p-1 bg-muted/30 rounded-xl border self-start gap-1">
                        <button
                            onClick={() => setActiveTab('points')}
                            className={cn(
                                "flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all",
                                activeTab === 'points' ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:bg-card/50"
                            )}
                        >
                            <Target className="h-4 w-4" />
                            Reason Codes
                        </button>
                        <button
                            onClick={() => setActiveTab('grading')}
                            className={cn(
                                "flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all",
                                activeTab === 'grading' ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:bg-card/50"
                            )}
                        >
                            <Scale className="h-4 w-4" />
                            Grade Thresholds
                        </button>
                        <button
                            onClick={() => setActiveTab('incentives')}
                            className={cn(
                                "flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all",
                                activeTab === 'incentives' ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:bg-card/50"
                            )}
                        >
                            <DollarSign className="h-4 w-4" />
                            Bonus & Penalties
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="space-y-6">
                        {activeTab === 'points' && (
                            <div className="grid grid-cols-1 gap-6">
                                {/* Reasoning for points */}
                                <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
                                    <div className="p-4 border-b bg-muted/10">
                                        <h3 className="font-bold flex items-center gap-2">
                                            <Zap className="h-4 w-4 text-yellow-500" />
                                            Point Allocation Rules
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-1">Configure how points are awarded or deducted for automated events.</p>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-muted/30 text-left border-b">
                                                    <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider">Reason Code</th>
                                                    <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider">Description</th>
                                                    <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider">Category</th>
                                                    <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-right">Points</th>
                                                    <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-center w-24">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {reasonCodes.map(rc => (
                                                    <tr key={rc.code} className="hover:bg-muted/10 transition-colors">
                                                        <td className="px-4 py-3">
                                                            <code className="text-[10px] px-2 py-0.5 bg-muted rounded font-bold border">{rc.code}</code>
                                                        </td>
                                                        <td className="px-4 py-3 text-muted-foreground font-medium">{rc.description}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={cn(
                                                                "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                                                rc.category === 'SETTLEMENT' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                                    rc.category === 'DISCIPLINE' ? "bg-orange-50 text-orange-700 border-orange-200" :
                                                                        rc.category === 'FRAUD' ? "bg-red-50 text-red-700 border-red-200" : "bg-slate-50 text-slate-700 border-slate-200"
                                                            )}>
                                                                {rc.category}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <EditableValue
                                                                value={rc.points_value}
                                                                onSave={(val) => handleUpdateReason(rc.code, val)}
                                                                isPerKg={rc.is_per_kg}
                                                                disabled={!rc.is_configurable || saving}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {!rc.is_configurable && (
                                                                <ShieldAlert className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'grading' && overallConfig && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-card border rounded-xl shadow-sm">
                                    <div className="p-4 border-b bg-muted/10">
                                        <h3 className="font-bold flex items-center gap-2">
                                            <Scale className="h-4 w-4 text-primary" />
                                            Grade Thresholds
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-1">Minimum normalized score (Points/Kg) required for each grade.</p>
                                    </div>
                                    <div className="p-6 space-y-6">
                                        <ConfigItem
                                            label="A+ Threshold"
                                            value={overallConfig.thresholds.A_PLUS_min}
                                            onSave={(v) => handleUpdateConfig('GRADE_A_PLUS_MIN', v)}
                                            help="Staff with score >= this will be A+"
                                        />
                                        <ConfigItem
                                            label="A Threshold"
                                            value={overallConfig.thresholds.A_min}
                                            onSave={(v) => handleUpdateConfig('GRADE_A_MIN', v)}
                                            help="Staff with score >= this will be A"
                                        />
                                        <ConfigItem
                                            label="B Threshold"
                                            value={overallConfig.thresholds.B_min}
                                            onSave={(v) => handleUpdateConfig('GRADE_B_MIN', v)}
                                            help="Staff with score >= this will be B"
                                        />
                                        <ConfigItem
                                            label="C Threshold"
                                            value={overallConfig.thresholds.C_min}
                                            onSave={(v) => handleUpdateConfig('GRADE_C_MIN', v)}
                                            help="Staff with score >= this will be C. Below this are penalties."
                                        />
                                        <ConfigItem
                                            label="D Threshold"
                                            value={overallConfig.thresholds.D_min}
                                            onSave={(v) => handleUpdateConfig('GRADE_D_MIN', v)}
                                            help="Staff with score >= this will be D. Below this is E."
                                        />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
                                        <div className="flex items-start gap-4">
                                            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                                                <Info className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-primary">How Scoring Works</h4>
                                                <p className="text-sm mt-1 text-primary/80 leading-relaxed">
                                                    Staff performance is measured by <strong>Normalized Score</strong>. It is calculated at the end of each month as:
                                                </p>
                                                <div className="bg-primary/10 p-3 rounded-lg font-mono text-xs my-3 text-center border border-primary/20">
                                                    Score = (Total Points) / (Total Kgs Handled)
                                                </div>
                                                <p className="text-sm text-primary/80">
                                                    A staff member earning 100 points on 200kg sales gets a score of <strong>0.50</strong> (Grade A+).
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-card border rounded-xl shadow-sm">
                                        <div className="p-4 border-b bg-muted/10">
                                            <h3 className="font-bold flex items-center gap-2">
                                                <ShieldAlert className="h-4 w-4 text-red-500" />
                                                System Limits
                                            </h3>
                                        </div>
                                        <div className="p-6 space-y-6">
                                            <ConfigItem
                                                label="Max Monthly Bonus"
                                                value={overallConfig.bonus_cap}
                                                onSave={(v) => handleUpdateConfig('BONUS_CAP_MONTHLY', v)}
                                                format="currency"
                                            />
                                            <ConfigItem
                                                label="Max Monthly Penalty"
                                                value={overallConfig.penalty_cap}
                                                onSave={(v) => handleUpdateConfig('PENALTY_CAP_MONTHLY', v)}
                                                format="currency"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'incentives' && overallConfig && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-card border rounded-xl shadow-sm h-fit">
                                    <div className="p-4 border-b bg-muted/10 flex items-center justify-between">
                                        <div>
                                            <h3 className="font-bold flex items-center gap-2">
                                                <DollarSign className="h-4 w-4 text-green-600" />
                                                Bonus Rates (Rewards)
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-0.5">Amount awarded per kg handled based on final grade.</p>
                                        </div>
                                        <Award className="h-8 w-8 text-green-100" />
                                    </div>
                                    <div className="p-6 space-y-6">
                                        <ConfigItem
                                            label="Grade A+ Bonus"
                                            value={overallConfig.bonus_rates.A_PLUS}
                                            onSave={(v) => handleUpdateConfig('BONUS_RATE_A_PLUS', v)}
                                            format="rate"
                                        />
                                        <ConfigItem
                                            label="Grade A Bonus"
                                            value={overallConfig.bonus_rates.A}
                                            onSave={(v) => handleUpdateConfig('BONUS_RATE_A', v)}
                                            format="rate"
                                        />
                                        <ConfigItem
                                            label="Grade B Bonus"
                                            value={overallConfig.bonus_rates.B}
                                            onSave={(v) => handleUpdateConfig('BONUS_RATE_B', v)}
                                            format="rate"
                                        />
                                        <ConfigItem
                                            label="Grade C Bonus"
                                            value={overallConfig.bonus_rates.C}
                                            onSave={(v) => handleUpdateConfig('BONUS_RATE_C', v)}
                                            format="rate"
                                        />
                                    </div>
                                </div>

                                <div className="bg-card border rounded-xl shadow-sm h-fit">
                                    <div className="p-4 border-b bg-muted/10 flex items-center justify-between">
                                        <div>
                                            <h3 className="font-bold flex items-center gap-2">
                                                <ShieldAlert className="h-4 w-4 text-red-600" />
                                                Penalty Rates (Loss Deductions)
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-0.5">Amount deducted per kg of negative variance.</p>
                                        </div>
                                        <AlertCircle className="h-8 w-8 text-red-100" />
                                    </div>
                                    <div className="p-6 space-y-6">
                                        <ConfigItem
                                            label="Grade C Penalty"
                                            value={overallConfig.penalty_rates.C}
                                            onSave={(v) => handleUpdateConfig('PENALTY_RATE_C', v)}
                                            format="rate"
                                        />
                                        <ConfigItem
                                            label="Grade D Penalty"
                                            value={overallConfig.penalty_rates.D}
                                            onSave={(v) => handleUpdateConfig('PENALTY_RATE_D', v)}
                                            format="rate"
                                        />
                                        <ConfigItem
                                            label="Grade E Penalty"
                                            value={overallConfig.penalty_rates.E}
                                            onSave={(v) => handleUpdateConfig('PENALTY_RATE_E', v)}
                                            format="rate"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </PermissionGuard>
    )
}

function ConfigItem({ label, value, onSave, format = 'number', help }: {
    label: string,
    value: number,
    onSave: (v: number) => void,
    format?: 'number' | 'currency' | 'rate'
    help?: string
}) {
    const [localValue, setLocalValue] = useState(value.toString())
    const [isDirty, setIsDirty] = useState(false)

    useEffect(() => {
        setLocalValue(value.toString())
        setIsDirty(false)
    }, [value])

    const handleSave = () => {
        onSave(parseFloat(localValue) || 0)
        setIsDirty(false)
    }

    return (
        <div className="flex items-center justify-between gap-6 group">
            <div className="flex-1">
                <label className="text-sm font-bold text-foreground block">{label}</label>
                {help && <p className="text-xs text-muted-foreground mt-0.5 opacity-70 group-hover:opacity-100 transition-opacity">{help}</p>}
            </div>
            <div className="flex items-center gap-2">
                <div className="relative">
                    {format === 'currency' && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">₹</span>}
                    <input
                        type="number"
                        value={localValue}
                        onChange={(e) => {
                            setLocalValue(e.target.value)
                            setIsDirty(true)
                        }}
                        step="0.01"
                        className={cn(
                            "w-28 px-3 py-1.5 bg-background border rounded-lg text-sm font-bold text-right outline-none focus:ring-2 focus:ring-primary/20",
                            format === 'currency' && "pl-6",
                            isDirty && "border-primary"
                        )}
                    />
                    {format === 'rate' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px] font-bold">/kg</span>}
                </div>
                <button
                    disabled={!isDirty}
                    onClick={handleSave}
                    className={cn(
                        "p-1.5 rounded-lg border transition-all",
                        isDirty ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-muted text-muted-foreground opacity-20 cursor-not-allowed"
                    )}
                >
                    <Save className="h-4 w-4" />
                </button>
            </div>
        </div>
    )
}

function EditableValue({ value, onSave, isPerKg, disabled }: {
    value: number,
    onSave: (val: number) => void,
    isPerKg?: boolean,
    disabled?: boolean
}) {
    const [editing, setEditing] = useState(false)
    const [localValue, setLocalValue] = useState(value.toString())

    if (disabled) {
        return (
            <div className="text-right font-bold text-muted-foreground">
                {value > 0 ? `+${value}` : value}
                {isPerKg && <span className="text-[10px] ml-1 opacity-50">/kg</span>}
            </div>
        )
    }

    if (editing) {
        return (
            <div className="flex items-center justify-end gap-1">
                <div className="relative">
                    <input
                        autoFocus
                        type="number"
                        value={localValue}
                        onChange={(e) => setLocalValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                onSave(parseInt(localValue) || 0)
                                setEditing(false)
                            }
                            if (e.key === 'Escape') {
                                setLocalValue(value.toString())
                                setEditing(false)
                            }
                        }}
                        className="w-16 h-8 px-2 bg-background border border-primary rounded text-sm text-right font-bold outline-none"
                    />
                    {isPerKg && <span className="absolute right-1 top-full text-[8px] font-bold text-primary">/kg</span>}
                </div>
                <button
                    onClick={() => {
                        onSave(parseInt(localValue) || 0)
                        setEditing(false)
                    }}
                    className="p-1 hover:bg-primary/10 text-primary rounded"
                >
                    <Save className="h-3.5 w-3.5" />
                </button>
            </div>
        )
    }

    return (
        <button
            onClick={() => setEditing(true)}
            className={cn(
                "w-full text-right font-bold transition-colors group px-2 py-1 rounded hover:bg-primary/5",
                value > 0 ? "text-green-600" : value < 0 ? "text-red-500" : "text-slate-500"
            )}
        >
            <span className="group-hover:translate-x-[-4px] inline-block transition-transform">
                {value > 0 ? `+${value}` : value}
                {isPerKg && <span className="text-[10px] ml-1 opacity-50">/kg</span>}
            </span>
        </button>
    )
}
