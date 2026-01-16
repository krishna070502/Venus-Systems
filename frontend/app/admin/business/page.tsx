'use client'

import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { useStore } from '@/lib/context/StoreContext'
import { StoreHeader } from '@/components/poultry/StoreHeader'
import {
  TrendingUp,
  ShoppingCart,
  Package,
  AlertTriangle,
  ArrowRight,
  Loader2,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api/client'
import { cn } from '@/lib/utils'

export default function BusinessDashboardPage() {
  const { currentStore } = useStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    todaySales: 0,
    currentStock: 0,
    processingYield: 0,
    pendingTasks: 0,
    recentActivity: [] as any[]
  })

  const today = new Date().toLocaleDateString('en-CA') // Format as YYYY-MM-DD in local time

  const fetchDashboardData = useCallback(async () => {
    if (!currentStore) return
    setLoading(true)
    setError(null)
    try {
      const [salesSummary, stockData, pendingVariance, recentSales] = await Promise.all([
        api.poultry.sales.getSummary(currentStore.id, today),
        api.poultry.inventory.getStock(currentStore.id),
        api.poultry.variance.getPending(currentStore.id),
        api.poultry.sales.getAll(currentStore.id, { limit: 5 })
      ])

      // Calculate Processing Yield (average of recent entries)
      const processingData = await api.poultry.processing.getAll(currentStore.id, { limit: 10 }) as any[]
      const avgYield = processingData.length > 0
        ? processingData.reduce((acc: number, curr: any) => acc + (Number(curr.yield_percentage) || 0), 0) / processingData.length
        : 0

      // Calculate total stock weight from StockSummary
      let totalStock = 0
      if (stockData && typeof stockData === 'object') {
        const s = stockData as any
        // Sum up BROILER
        if (s.BROILER) {
          totalStock += (Number(s.BROILER.LIVE) || 0) + (Number(s.BROILER.SKIN) || 0) + (Number(s.BROILER.SKINLESS) || 0)
        }
        // Sum up PARENT_CULL
        if (s.PARENT_CULL) {
          totalStock += (Number(s.PARENT_CULL.LIVE) || 0) + (Number(s.PARENT_CULL.SKIN) || 0) + (Number(s.PARENT_CULL.SKINLESS) || 0)
        }
      }

      setStats({
        todaySales: Number((salesSummary as any)?.total_sales) || 0,
        currentStock: totalStock,
        processingYield: avgYield,
        pendingTasks: Number((pendingVariance as any)?.pending_count) || 0,
        recentActivity: Array.isArray(recentSales) ? recentSales : []
      })
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err)
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [currentStore, today])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  return (
    <PermissionGuard permission="businessdashboard.view">
      <div className="flex flex-col h-full bg-muted/20">
        <StoreHeader
          title="Business Dashboard"
          subtitle="Real-time operations overview"
          onRefresh={fetchDashboardData}
        />

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-center gap-3">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-bold text-sm">{error}</p>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {/* Quick Stats */}
            <div className="bg-card p-5 rounded-xl border shadow-sm relative overflow-hidden group">
              {loading && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>}
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg"><ShoppingCart className="h-5 w-5" /></div>
                <TrendingUp className="h-4 w-4 text-green-600 opacity-20 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-2xl font-black">₹{stats.todaySales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Today's Sales</div>
            </div>

            <div className="bg-card p-5 rounded-xl border shadow-sm relative overflow-hidden group">
              {loading && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>}
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-orange-100 text-orange-700 rounded-lg"><Package className="h-5 w-5" /></div>
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Kg</span>
              </div>
              <div className="text-2xl font-black">{stats.currentStock.toFixed(2)}</div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Current Stock</div>
            </div>

            <div className="bg-card p-5 rounded-xl border shadow-sm relative overflow-hidden group">
              {loading && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>}
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-lg"><TrendingUp className="h-5 w-5" /></div>
                <span className="text-[10px] font-bold text-primary">Efficiency</span>
              </div>
              <div className="text-2xl font-black">{stats.processingYield.toFixed(1)}%</div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Processing Yield</div>
            </div>

            <div className="bg-card p-5 rounded-xl border shadow-sm relative overflow-hidden group">
              {loading && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>}
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-red-100 text-red-700 rounded-lg"><AlertTriangle className="h-5 w-5" /></div>
                {stats.pendingTasks > 0 && <span className="text-xs font-bold text-red-600 animate-pulse">Action Required</span>}
              </div>
              <div className="text-2xl font-black">{stats.pendingTasks}</div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pending Variances</div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="bg-card rounded-xl border shadow-sm p-6 overflow-hidden relative">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg italic uppercase tracking-tighter">Quick Access</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Link href="/admin/business/sales/pos" className="p-4 bg-primary/5 hover:bg-primary/10 border border-primary/10 rounded-xl transition-all group">
                  <div className="font-black text-primary flex items-center justify-between uppercase text-xs">
                    Point of Sale
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                  </div>
                  <div className="text-[10px] font-bold text-muted-foreground mt-1">Start new transaction</div>
                </Link>
                <Link href="/admin/business/purchases" className="p-4 bg-muted/30 hover:bg-muted/50 border rounded-xl transition-all group">
                  <div className="font-black flex items-center justify-between uppercase text-xs">
                    Record Purchase
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                  </div>
                  <div className="text-[10px] font-bold text-muted-foreground mt-1">Log incoming birds</div>
                </Link>
                <Link href="/admin/business/inventory/processing" className="p-4 bg-muted/30 hover:bg-muted/50 border rounded-xl transition-all group">
                  <div className="font-black flex items-center justify-between uppercase text-xs">
                    Processing
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                  </div>
                  <div className="text-[10px] font-bold text-muted-foreground mt-1">Convert stock</div>
                </Link>
                <Link href="/admin/business/settlements" className="p-4 bg-muted/30 hover:bg-muted/50 border rounded-xl transition-all group">
                  <div className="font-black flex items-center justify-between uppercase text-xs">
                    Daily Report
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                  </div>
                  <div className="text-[10px] font-bold text-muted-foreground mt-1">End of day settlement</div>
                </Link>
              </div>
            </div>

            <div className="bg-card rounded-xl border shadow-sm p-6 relative overflow-hidden">
              {loading && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" /></div>}
              <h3 className="font-bold text-lg mb-6 italic uppercase tracking-tighter">Recent Sales</h3>
              <div className="space-y-4">
                {stats.recentActivity.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground border-2 border-dashed rounded-xl">
                    <p className="text-xs font-black uppercase tracking-widest opacity-30">No recent sales data</p>
                  </div>
                ) : (
                  stats.recentActivity.map((sale: any) => (
                    <div key={sale.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-transparent hover:border-primary/10 transition-colors">
                      <div>
                        <div className="text-xs font-black uppercase">{sale.customer_name || 'Guest Customer'}</div>
                        <div className="text-[10px] font-bold text-muted-foreground">{new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {sale.payment_method}</div>
                      </div>
                      <div className="text-sm font-black text-primary">₹{sale.total_amount.toLocaleString()}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PermissionGuard>
  )
}
