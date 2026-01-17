'use client'

import { useState, useEffect, useCallback } from 'react'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import { useStore } from '@/lib/context/StoreContext'
import { StoreHeader } from '@/components/poultry/StoreHeader'
import { api } from '@/lib/api/client'
import {
  ClipboardEdit,
  Plus,
  History,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Save
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface StockSummary {
  LIVE: number
  LIVE_COUNT: number
  SKIN: number
  SKINLESS: number
}

interface ReasonCode {
  code: string
  description: string
}

interface LedgerEntry {
  id: string
  bird_type: string
  inventory_type: string
  quantity_change: number
  bird_count_change: number
  new_quantity: number
  reason_code: string
  notes: string
  created_at: string
}

export default function AdjustmentsPage() {
  const { currentStore } = useStore()
  const { permissions, roles, loading: permLoading } = usePermissions()

  const [stock, setStock] = useState<Record<string, StockSummary>>({})
  const [reasons, setReasons] = useState<ReasonCode[]>([])
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [birdType, setBirdType] = useState<'BROILER' | 'PARENT_CULL'>('BROILER')
  const [invType, setInvType] = useState<'LIVE' | 'SKIN' | 'SKINLESS'>('LIVE')
  const [mode, setMode] = useState<'ADJUST' | 'OVERWRITE'>('OVERWRITE')
  const [weight, setWeight] = useState<string>('')
  const [birds, setBirds] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  const isAdmin = !permLoading && roles?.includes('Admin')

  const fetchData = useCallback(async () => {
    if (!currentStore) return
    setLoading(true)
    setError(null)
    try {
      const [stockData, reasonData, ledgerData] = await Promise.all([
        api.poultry.inventory.getStock(currentStore.id),
        api.poultry.inventory.getReasonCodes(),
        api.poultry.inventory.getLedger(currentStore.id, { limit: 10 })
      ]) as [any, any, any]

      // Transform stock data
      const stockMap: Record<string, StockSummary> = {
        BROILER: { LIVE: 0, LIVE_COUNT: 0, SKIN: 0, SKINLESS: 0 },
        PARENT_CULL: { LIVE: 0, LIVE_COUNT: 0, SKIN: 0, SKINLESS: 0 }
      }

      if (stockData.BROILER) stockMap.BROILER = stockData.BROILER
      if (stockData.PARENT_CULL) stockMap.PARENT_CULL = stockData.PARENT_CULL

      setStock(stockMap)
      setReasons(reasonData.filter((r: any) => r.category === 'MANUAL' || r.code.startsWith('ADJUSTMENT')))
      setLedger(ledgerData)
    } catch (err: any) {
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [currentStore])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentStore || !isAdmin) return
    if (!weight || !reason) {
      setError('Please fill required fields (Weight, Reason)')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const data: any = {
        store_id: currentStore.id,
        bird_type: birdType,
        inventory_type: invType,
        reason_code: reason,
        notes: notes || `Manual ${mode === 'OVERWRITE' ? 'overwrite' : 'adjustment'}`
      }

      if (mode === 'OVERWRITE') {
        data.absolute_quantity = parseFloat(weight)
        if (invType === 'LIVE' && birds) {
          data.absolute_bird_count = parseInt(birds)
        }
      } else {
        data.quantity_change = parseFloat(weight)
        if (invType === 'LIVE' && birds) {
          data.bird_count_change = parseInt(birds)
        }
      }

      await api.poultry.inventory.adjust(data)

      setSuccess('Adjustment recorded successfully')
      setWeight('')
      setBirds('')
      setNotes('')
      fetchData()
    } catch (err: any) {
      setError(err.message || 'Failed to save adjustment')
    } finally {
      setSubmitting(false)
    }
  }

  const currentQty = stock[birdType]?.[invType] || 0
  const currentCount = invType === 'LIVE' ? (stock[birdType]?.LIVE_COUNT || 0) : 0

  return (
    <PermissionGuard permission="inventory.adjust">
      <div className="flex flex-col h-full bg-background">
        <StoreHeader title="Inventory Adjustments" subtitle="Admin only: Force update stock levels" />

        <div className="flex-1 overflow-auto p-4 lg:p-6 space-y-6">
          {permLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !isAdmin ? (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-8 rounded-xl text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Admin Access Required</h2>
              <p>Only system administrators can perform inventory adjustments.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Adjustment Form */}
              <div className="xl:col-span-1">
                <form onSubmit={handleSubmit} className="bg-card rounded-xl border shadow-sm p-6 space-y-6">
                  <div className="flex items-center gap-2 text-primary font-semibold mb-2">
                    <Plus className="h-5 w-5" />
                    New Adjustment
                  </div>

                  {/* Bird Type & Inv Type */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">Bird Type</label>
                      <div className="flex rounded-lg border p-1 bg-muted/50">
                        {['BROILER', 'PARENT_CULL'].map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setBirdType(type as any)}
                            className={cn(
                              "flex-1 py-1.5 text-xs font-medium rounded-md transition-all",
                              birdType === type ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {type.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">Inv Type</label>
                      <div className="flex rounded-lg border p-1 bg-muted/50">
                        {['LIVE', 'SKIN', 'SKINLESS'].map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setInvType(type as any)}
                            className={cn(
                              "flex-1 py-1.5 text-xs font-medium rounded-md transition-all",
                              invType === type ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Mode Switcher */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Adjustment Mode</label>
                    <div className="flex rounded-lg border p-1 bg-muted/50">
                      {[
                        { id: 'OVERWRITE', label: 'Force Overwrite', icon: ClipboardEdit },
                        { id: 'ADJUST', label: 'Add/Subtract', icon: ArrowRight }
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setMode(m.id as any)}
                          className={cn(
                            "flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2",
                            mode === m.id ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <m.icon className="h-4 w-4" />
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Current Stock Preview */}
                  <div className="bg-muted/30 rounded-lg p-4 flex items-center justify-between border">
                    <div className="text-sm font-medium">Current Stock</div>
                    <div className="text-right">
                      <div className="font-mono text-lg">{Number(currentQty).toFixed(2)} kg</div>
                      {invType === 'LIVE' && <div className="text-xs text-muted-foreground">{currentCount} birds</div>}
                    </div>
                  </div>

                  {/* Inputs */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">
                        {mode === 'OVERWRITE' ? 'New Weight (Kg)' : 'Adjustment (± Kg)'}
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="0.000"
                        className="w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>
                    {invType === 'LIVE' && (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">
                          {mode === 'OVERWRITE' ? 'New Count' : 'Adjustment (± Birds)'}
                        </label>
                        <input
                          type="number"
                          value={birds}
                          onChange={(e) => setBirds(e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Reason Select */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Reason Code</label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-3 py-2 bg-background border rounded-lg outline-none"
                    >
                      <option value="">Select a reason</option>
                      {reasons.map(r => (
                        <option key={r.code} value={r.code}>{r.description}</option>
                      ))}
                    </select>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Audit trail notes..."
                      className="w-full px-3 py-2 bg-background border rounded-lg h-20 outline-none"
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="p-3 bg-green-100 border border-green-200 text-green-700 text-sm rounded-lg flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      {success}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-11 bg-primary text-primary-foreground font-semibold rounded-lg shadow-sm hover:translate-y-[-1px] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:translate-y-0"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Commit Adjustment
                  </button>
                </form>
              </div>

              {/* History / Ledger */}
              <div className="xl:col-span-2 space-y-6">
                <div className="bg-card rounded-xl border shadow-sm flex flex-col h-[600px]">
                  <div className="p-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold">
                      <History className="h-5 w-5 text-primary" />
                      Recent Adjustment Logs
                    </div>
                    <button onClick={fetchData} className="text-xs text-primary hover:underline">Refresh</button>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold uppercase text-[10px]">Date/Time</th>
                          <th className="text-left px-4 py-3 font-semibold uppercase text-[10px]">Type</th>
                          <th className="text-left px-4 py-3 font-semibold uppercase text-[10px]">Change</th>
                          <th className="text-left px-4 py-3 font-semibold uppercase text-[10px]">New Qty</th>
                          <th className="text-left px-4 py-3 font-semibold uppercase text-[10px]">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {loading ? (
                          <tr>
                            <td colSpan={5} className="py-20 text-center">
                              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                            </td>
                          </tr>
                        ) : ledger.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-20 text-center text-muted-foreground italic">
                              No recent logs found
                            </td>
                          </tr>
                        ) : (
                          ledger.map((entry) => (
                            <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3 text-muted-foreground">
                                {new Date(entry.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-xs">{entry.bird_type}</div>
                                <div className="text-[10px] text-muted-foreground">{entry.inventory_type}</div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={cn(
                                  "font-mono px-2 py-0.5 rounded text-xs",
                                  entry.quantity_change > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                )}>
                                  {entry.quantity_change > 0 ? '+' : ''}{Number(entry.quantity_change).toFixed(2)} kg
                                </span>
                                {entry.bird_count_change !== 0 && (
                                  <div className="text-[10px] text-muted-foreground mt-1">
                                    {entry.bird_count_change > 0 ? '+' : ''}{entry.bird_count_change} birds
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 font-mono font-medium">
                                {Number(entry.new_quantity).toFixed(2)} kg
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-xs">{entry.reason_code.replace(/_/g, ' ')}</div>
                                <div className="text-[10px] text-muted-foreground max-w-[150px] truncate">{entry.notes}</div>
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
          )}
        </div>
      </div>
    </PermissionGuard>
  )
}
