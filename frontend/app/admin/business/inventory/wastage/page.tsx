'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '@/lib/api/client'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions } from '@/lib/auth/usePermissions'
import { useStore } from '@/lib/context/StoreContext'
import { StoreHeader } from '@/components/poultry/StoreHeader'
import { ProcessingEntry } from '@/lib/types/poultry'
import {
  Trash2,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Scale,
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  AlertCircle,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function WastageAnalysisPage() {
  const { currentStore } = useStore()
  const { permissions, loading: permLoading } = usePermissions()
  const [entries, setEntries] = useState<ProcessingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    if (!currentStore) return
    setLoading(true)
    setError(null)
    try {
      // Fetch the last 100 processing entries to analyze wastage
      const data = await api.poultry.processing.getAll(currentStore.id, { limit: 100 }) as ProcessingEntry[]
      setEntries(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err.message || 'Failed to load processing data')
    } finally {
      setLoading(false)
    }
  }, [currentStore])

  useEffect(() => {
    if (currentStore) {
      fetchEntries()
    }
  }, [currentStore, fetchEntries])

  // Calculations
  const stats = useMemo(() => {
    if (!entries.length) return null

    let totalInput = 0
    let totalAllowedWastage = 0
    let totalActualWastage = 0

    entries.forEach(entry => {
      const input = Number(entry.input_weight)
      const allowedWeight = Number(entry.wastage_weight)
      const actualOutput = Number(entry.actual_output_weight || entry.output_weight)
      const actualWastage = input - actualOutput

      totalInput += input
      totalAllowedWastage += allowedWeight
      totalActualWastage += actualWastage
    })

    const totalVariance = totalActualWastage - totalAllowedWastage
    const avgAllowedPct = (totalAllowedWastage / totalInput) * 100
    const avgActualPct = (totalActualWastage / totalInput) * 100

    return {
      totalInput,
      totalAllowedWastage,
      totalActualWastage,
      totalVariance,
      avgAllowedPct,
      avgActualPct,
      count: entries.length
    }
  }, [entries])

  return (
    <PermissionGuard permission="wastage.view">
      <div className="flex flex-col h-full bg-muted/20">
        <StoreHeader
          title="Wastage Analysis"
          subtitle="Monitor processing yield and wastage variance"
          onRefresh={fetchEntries}
        />

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="bg-destructive/10 text-destructive p-4 rounded-xl flex items-center gap-3 border border-destructive/20">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">{error}</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="bg-card rounded-2xl border-2 border-dashed p-12 text-center text-muted-foreground">
              <Trash2 className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <h3 className="text-xl font-bold text-foreground">No Processing Data</h3>
              <p className="max-w-xs mx-auto mt-2">Wastage analysis requires processing entries for the selected store.</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card
                  title="Total Input"
                  value={`${stats?.totalInput.toFixed(2)} kg`}
                  subtitle={`${stats?.count} processing runs`}
                  icon={<Scale className="h-5 w-5" />}
                  color="blue"
                />
                <Card
                  title="Allowed Wastage"
                  value={`${stats?.totalAllowedWastage.toFixed(2)} kg`}
                  subtitle={`${stats?.avgAllowedPct.toFixed(1)}% weighted avg`}
                  icon={<Info className="h-5 w-5" />}
                  color="slate"
                />
                <Card
                  title="Actual Wastage"
                  value={`${stats?.totalActualWastage.toFixed(2)} kg`}
                  subtitle={`${stats?.avgActualPct.toFixed(1)}% weighted avg`}
                  icon={<TrendingDown className="h-5 w-5" />}
                  color={stats && stats.totalVariance > 0 ? "amber" : "green"}
                />
                <Card
                  title="Variance"
                  value={`${stats && stats.totalVariance > 0 ? '+' : ''}${stats?.totalVariance.toFixed(2)} kg`}
                  subtitle={stats && stats.totalVariance > 0 ? "Loss (Over Allowed)" : "Profit (Under Allowed)"}
                  icon={stats && stats.totalVariance > 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  color={stats && stats.totalVariance > 0 ? "red" : "emerald"}
                  isHighlight
                />
              </div>

              {/* Analysis Table */}
              <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b bg-muted/10 flex items-center justify-between">
                  <h3 className="font-bold flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-primary" />
                    Process-by-Process Variance
                  </h3>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-green-500" /> Under Limit
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-red-500" /> Over Limit
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/30 border-b">
                        <th className="px-6 py-4 text-left font-bold text-xs uppercase text-muted-foreground">Date & ID</th>
                        <th className="px-6 py-4 text-left font-bold text-xs uppercase text-muted-foreground">Item Type</th>
                        <th className="px-6 py-4 text-right font-bold text-xs uppercase text-muted-foreground">Input</th>
                        <th className="px-6 py-4 text-right font-bold text-xs uppercase text-muted-foreground">Allowed Wastage</th>
                        <th className="px-6 py-4 text-right font-bold text-xs uppercase text-muted-foreground bg-primary/5">Actual Wastage</th>
                        <th className="px-6 py-4 text-right font-bold text-xs uppercase text-muted-foreground">Variance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y relative">
                      {entries.map((entry) => {
                        const input = Number(entry.input_weight)
                        const allowedPct = Number(entry.wastage_percentage)
                        const allowedKg = Number(entry.wastage_weight)

                        const actualOutput = Number(entry.actual_output_weight || entry.output_weight)
                        const actualKg = input - actualOutput
                        const actualPct = (actualKg / input) * 100

                        const variance = actualKg - allowedKg
                        const isWarning = variance > 0.05 // Buffer for rounding
                        const isProfit = variance < -0.05

                        return (
                          <tr key={entry.id} className="hover:bg-muted/5 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="font-bold text-foreground">
                                {new Date(entry.processing_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                              <div className="text-[10px] font-mono text-muted-foreground uppercase">{entry.id.split('-')[0]}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{entry.input_bird_type}</span>
                                <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold uppercase border border-blue-100">
                                  {entry.output_inventory_type}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right font-mono font-medium">
                              {input.toFixed(2)} kg
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="font-mono font-bold text-muted-foreground">{allowedKg.toFixed(2)} kg</div>
                              <div className="text-[10px] font-bold text-slate-400">{allowedPct.toFixed(1)}%</div>
                            </td>
                            <td className="px-6 py-4 text-right bg-primary/5">
                              <div className={cn(
                                "font-mono font-bold",
                                isWarning ? "text-red-600" : isProfit ? "text-green-600" : "text-primary"
                              )}>
                                {actualKg.toFixed(2)} kg
                              </div>
                              <div className="text-[10px] font-bold opacity-60">
                                {actualPct.toFixed(1)}%
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className={cn(
                                "flex items-center justify-end gap-1 font-mono font-black",
                                isWarning ? "text-red-500" : isProfit ? "text-emerald-600" : "text-slate-300"
                              )}>
                                {variance > 0 ? <TrendingUp className="h-3 w-3" /> : variance < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                                {Math.abs(variance).toFixed(2)} kg
                              </div>
                              <div className="text-[10px] font-bold uppercase tracking-tight">
                                {isWarning ? "Wastage Variance" : isProfit ? "Yield Surplus" : "Target Met"}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </PermissionGuard>
  )
}

function Card({ title, value, subtitle, icon, color, isHighlight = false }: any) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-green-50 text-green-700 border-green-100",
    red: "bg-red-50 text-red-700 border-red-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    slate: "bg-slate-50 text-slate-700 border-slate-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  }

  const valueColors: any = {
    blue: "text-blue-900",
    green: "text-green-900",
    red: "text-red-900",
    amber: "text-amber-900",
    slate: "text-slate-900",
    emerald: "text-emerald-900",
  }

  return (
    <div className={cn(
      "p-5 rounded-2xl border transition-all duration-300",
      isHighlight ? "shadow-md scale-[1.02] border-2" : "bg-card shadow-sm hover:shadow-md",
      isHighlight && colors[color]
    )}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{title}</span>
        <div className={cn("p-2 rounded-xl transition-colors", colors[color])}>
          {icon}
        </div>
      </div>
      <div className={cn("text-3xl font-black tracking-tighter", isHighlight ? "text-foreground" : valueColors[color])}>
        {value}
      </div>
      <p className="text-xs font-medium text-muted-foreground mt-1">{subtitle}</p>
    </div>
  )
}
