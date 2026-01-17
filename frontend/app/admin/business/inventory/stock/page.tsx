'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api/client'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions } from '@/lib/auth/usePermissions'
import { useStore } from '@/lib/context/StoreContext'
import { StoreHeader } from '@/components/poultry/StoreHeader'
import { StockMatrix } from '@/components/poultry/StockMatrix'
import { StockMatrix as StockMatrixType } from '@/lib/types/poultry'
import {
  Package,
  History,
  TrendingUp,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface LedgerEntry {
  id: string
  sku_id: string
  sku_name: string
  bird_type: string
  inventory_type: string
  quantity_change: number
  bird_count_change: number
  new_quantity: number
  reason_code: string
  ref_type: string
  ref_id: string
  created_at: string
}

export default function StockPage() {
  const { currentStore } = useStore()
  const { loading: permsLoading } = usePermissions()
  const [activeTab, setActiveTab] = useState<'matrix' | 'ledger'>('matrix')
  const [stockData, setStockData] = useState<StockMatrixType | null>(null)
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStock = useCallback(async () => {
    if (!currentStore) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.poultry.inventory.getStock(currentStore.id) as StockMatrixType
      setStockData(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load stock data')
    } finally {
      setLoading(false)
    }
  }, [currentStore])

  const fetchLedger = useCallback(async () => {
    if (!currentStore) return
    setLoading(true)
    try {
      const data = await api.poultry.inventory.getLedger(currentStore.id, { limit: 50 }) as LedgerEntry[]
      setLedger(data)
    } catch (err: any) {
      // Error handled by UI
    } finally {
      setLoading(false)
    }
  }, [currentStore])

  useEffect(() => {
    if (currentStore) {
      if (activeTab === 'matrix') {
        fetchStock()
      } else {
        fetchLedger()
      }
    }
  }, [currentStore, activeTab, fetchStock, fetchLedger])

  // Helper to calculate bird totals
  const getBirdTotal = (bird: 'BROILER' | 'PARENT_CULL') => {
    if (!stockData || !stockData[bird]) return 0
    return (['LIVE', 'SKIN', 'SKINLESS'] as const).reduce((sum, type) => {
      const qty = (stockData[bird] as any)[type] || 0
      return sum + (Number(qty) || 0)
    }, 0)
  }

  const broilerTotal = getBirdTotal('BROILER')
  const parentCullTotal = getBirdTotal('PARENT_CULL')

  return (
    <PermissionGuard permission="stock.read">
      <div className="flex flex-col h-full bg-muted/20">
        <StoreHeader
          title="Inventory Management"
          subtitle="Live and processed birds stock tracking"
          onRefresh={activeTab === 'matrix' ? fetchStock : fetchLedger}
        />

        <div className="p-6">
          {/* Tabs */}
          <div className="flex border-b mb-6 bg-card rounded-t-lg px-4 pt-4">
            <button
              onClick={() => setActiveTab('matrix')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 border-b-2 transition-colors",
                activeTab === 'matrix'
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Package className="h-4 w-4" />
              Stock Matrix
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 border-b-2 transition-colors",
                activeTab === 'ledger'
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <History className="h-4 w-4" />
              Transaction Ledger
            </button>
          </div>

          {/* Content */}
          {loading && !stockData && ledger.length === 0 ? (
            <div className="flex items-center justify-center h-64 bg-card rounded-lg border">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          ) : (
            <div className="space-y-6">
              {activeTab === 'matrix' ? (
                <>
                  {stockData && (
                    <div className="bg-card p-6 rounded-lg border">
                      <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        <h2 className="text-xl font-bold">Current Stock Matrix</h2>
                      </div>
                      <StockMatrix data={stockData} />

                      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-8">
                        <div className="bg-muted/30 p-4 rounded-lg text-center">
                          <div className="text-sm text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Total Broiler</div>
                          <div className="text-2xl font-bold">{broilerTotal.toFixed(2)} kg</div>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-lg text-center">
                          <div className="text-sm text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Total Parent Cull</div>
                          <div className="text-2xl font-bold">{parentCullTotal.toFixed(2)} kg</div>
                        </div>
                        <div className="bg-primary/10 p-4 rounded-lg text-center border border-primary/20">
                          <div className="text-sm text-primary font-semibold mb-1 uppercase tracking-wider">Total Live Birds</div>
                          <div className="text-2xl font-extrabold text-primary">
                            {((stockData.BROILER.LIVE_COUNT || 0) + (stockData.PARENT_CULL.LIVE_COUNT || 0))} birds
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-card rounded-lg border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted/50 border-b">
                          <th className="px-4 py-3 text-left text-sm font-medium">Timestamp</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">SKU</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">Birds</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">Weight (kg)</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">New Balance</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Reason</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Reference</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {ledger.map((entry) => (
                          <tr key={entry.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              {new Date(entry.created_at).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-sm">{entry.sku_name}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-xs uppercase bg-muted px-2 py-0.5 rounded-full inline-block">
                                {entry.bird_type} • {entry.inventory_type}
                              </div>
                            </td>
                            <td className={cn(
                              "px-4 py-3 text-right font-mono text-sm",
                              entry.bird_count_change > 0 ? "text-green-600" : entry.bird_count_change < 0 ? "text-red-600" : "text-muted-foreground"
                            )}>
                              {entry.bird_count_change > 0 ? '+' : ''}{entry.bird_count_change}
                            </td>
                            <td className={cn(
                              "px-4 py-3 text-right font-mono font-bold",
                              Number(entry.quantity_change) > 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {Number(entry.quantity_change) > 0 ? '+' : ''}{Number(entry.quantity_change).toFixed(3)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-semibold">
                              {Number(entry.new_quantity).toFixed(3)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className="bg-accent/50 px-2 py-0.5 rounded text-xs font-medium">
                                {entry.reason_code}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                              {entry.ref_type ? `${entry.ref_type}: ` : ''}
                              {entry.ref_id ? `${entry.ref_id.substring(0, 8)}...` : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {ledger.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      No recent transactions found.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PermissionGuard>
  )
}
