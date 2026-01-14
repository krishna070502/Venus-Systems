'use client'

import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { useStore } from '@/lib/context/StoreContext'
import { StoreHeader } from '@/components/poultry/StoreHeader'
import {
  TrendingUp,
  ShoppingCart,
  Package,
  AlertTriangle,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'

export default function BusinessDashboardPage() {
  const { currentStore } = useStore()

  return (
    <PermissionGuard permission="businessdashboard.view">
      <div className="flex flex-col h-full bg-muted/20">
        <StoreHeader
          title="Business Dashboard"
          subtitle="Real-time operations overview"
        />

        <div className="p-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {/* Quick Stats */}
            <div className="bg-card p-5 rounded-xl border shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg"><ShoppingCart className="h-5 w-5" /></div>
                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">+12%</span>
              </div>
              <div className="text-2xl font-black">₹0.00</div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Today's Sales</div>
            </div>

            <div className="bg-card p-5 rounded-xl border shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-orange-100 text-orange-700 rounded-lg"><Package className="h-5 w-5" /></div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Live Birds</span>
              </div>
              <div className="text-2xl font-black">0.00 kg</div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Current Stock</div>
            </div>

            <div className="bg-card p-5 rounded-xl border shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-lg"><TrendingUp className="h-5 w-5" /></div>
                <span className="text-[10px] font-bold text-primary">Target: 85%</span>
              </div>
              <div className="text-2xl font-black">0.0%</div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Processing Yield</div>
            </div>

            <div className="bg-card p-5 rounded-xl border shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-red-100 text-red-700 rounded-lg"><AlertTriangle className="h-5 w-5" /></div>
                <span className="text-xs font-bold text-red-600">Action Required</span>
              </div>
              <div className="text-2xl font-black">0</div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pending Tasks</div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="bg-card rounded-xl border shadow-sm p-6 overflow-hidden relative">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg">Quick Access</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Link href="/admin/business/sales/pos" className="p-4 bg-primary/5 hover:bg-primary/10 border border-primary/10 rounded-xl transition-all group">
                  <div className="font-bold text-primary flex items-center justify-between">
                    Point of Sale
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                  </div>
                  <div className="text-[10px] text-muted-foreground">Start new transaction</div>
                </Link>
                <Link href="/admin/business/purchases" className="p-4 bg-muted/30 hover:bg-muted/50 border rounded-xl transition-all group">
                  <div className="font-bold flex items-center justify-between">
                    Record Purchase
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                  </div>
                  <div className="text-[10px] text-muted-foreground">Log incoming birds</div>
                </Link>
                <Link href="/admin/business/inventory/processing" className="p-4 bg-muted/30 hover:bg-muted/50 border rounded-xl transition-all group">
                  <div className="font-bold flex items-center justify-between">
                    Processing
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                  </div>
                  <div className="text-[10px] text-muted-foreground">Convert stock</div>
                </Link>
                <Link href="/admin/business/settlements" className="p-4 bg-muted/30 hover:bg-muted/50 border rounded-xl transition-all group">
                  <div className="font-bold flex items-center justify-between">
                    Daily Report
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                  </div>
                  <div className="text-[10px] text-muted-foreground">End of day settlement</div>
                </Link>
              </div>
            </div>

            <div className="bg-card rounded-xl border shadow-sm p-6">
              <h3 className="font-bold text-lg mb-6">Recent Activity</h3>
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground border-2 border-dashed rounded-xl">
                <p className="text-sm font-medium">No recent activities for {currentStore?.name || 'this store'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PermissionGuard>
  )
}
