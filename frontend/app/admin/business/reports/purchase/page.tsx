'use client'

import { useState, useEffect, useMemo } from 'react'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import {
  BarChart3,
  TrendingUp,
  ShoppingCart,
  Truck,
  Scale,
  Calendar,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Download,
  Users
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StoreSelector } from '@/components/poultry/StoreSelector'
import { useStore } from '@/lib/context/StoreContext'
import { api } from '@/lib/api/client'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import { format, subDays } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

export default function PurchaseReportsPage() {
  const { currentStore } = useStore()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [dateRange, setDateRange] = useState({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  })

  useEffect(() => {
    async function fetchData() {
      if (!currentStore) return
      setLoading(true)
      try {
        const result = await api.poultry.purchases.getAnalytics({
          store_id: currentStore.id,
          from_date: dateRange.from,
          to_date: dateRange.to
        })
        setData(result)
      } catch (err) {
        console.error('Failed to fetch purchase analytics:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [currentStore, dateRange])

  const chartData = useMemo(() => {
    if (!data?.trends) return []
    return data.trends.map((t: any) => ({
      ...t,
      formattedDate: format(new Date(t.date), 'MMM dd')
    }))
  }, [data])

  const supplierData = useMemo(() => {
    if (!data?.suppliers) return []
    return data.suppliers.map((s: any) => ({
      name: s.supplier_name,
      value: Number(s.amount)
    }))
  }, [data])

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Aggregating procurement data...</p>
      </div>
    )
  }

  return (
    <PermissionGuard permission="purchasereport.view">
      <div className="p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2 text-indigo-900">
              <ShoppingCart className="h-8 w-8 text-primary" />
              Procurement & Purchase Reports
            </h1>
            <p className="text-muted-foreground mt-1">
              Insight into supplier spend, procurement trends, and bird sourcing for {currentStore?.name || 'All Stores'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StoreSelector />
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow border-indigo-100 bg-gradient-to-br from-white to-indigo-50/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Procurement</CardTitle>
              <div className="p-2 bg-indigo-100 rounded-full text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <BarChart3 className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{data?.kpis?.total_spend?.toLocaleString() || '0'}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3 text-green-500" />
                <span className="text-green-500 font-medium">+8.2%</span> from last month
              </p>
              <div className="absolute bottom-0 left-0 h-1 bg-indigo-500 w-full opacity-50" />
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-emerald-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
              <Scale className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.kpis?.total_weight?.toFixed(2) || '0'} kg</div>
              <p className="text-xs text-muted-foreground mt-1">
                {data?.kpis?.total_bird_count || '0'} total birds sourced
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Sourcing Price</CardTitle>
              <TrendingUp className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{data?.kpis?.avg_price_per_kg?.toFixed(2) || '0'}/kg</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                Weighted average across all types
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Suppliers</CardTitle>
              <Truck className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.suppliers?.length || '0'}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Providing consistent supply
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Spend Trend Chart */}
          <Card className="lg:col-span-2 border-indigo-50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Procurement Spending Trend</CardTitle>
                <CardDescription>Daily investment in stock replenishment</CardDescription>
              </div>
              <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100">COMMITTED ORDERS</Badge>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis
                      dataKey="formattedDate"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, 'Investment']}
                    />
                    <Area
                      type="monotone"
                      dataKey="spend"
                      stroke="#6366f1"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorSpend)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Supplier Distribution Pie Chart */}
          <Card border-indigo-50 shadow-sm>
            <CardHeader>
              <CardTitle>Supplier Distribution</CardTitle>
              <CardDescription>Breakdown by total spend share</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={supplierData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {supplierData.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `₹${Number(value).toLocaleString()}`} />
                    <Legend verticalAlign="bottom" height={36} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4 mt-4">
                {data?.suppliers?.slice(0, 4).map((s: any, i: number) => (
                  <div key={s.supplier_name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                      <span className="font-medium text-muted-foreground truncate max-w-[120px]">{s.supplier_name}</span>
                    </div>
                    <span className="font-bold">₹{Number(s.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Supplier Performance Table */}
        <Card border-indigo-50 shadow-sm>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Key Suppliers & Procurement Stats</CardTitle>
              <CardDescription>Comprehensive metrics per sourcing partner</CardDescription>
            </div>
            <Button variant="ghost" className="text-primary hover:text-primary/80 hover:bg-primary/5">
              Manage Suppliers <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-indigo-50">
                  <TableHead className="w-[300px]">Supplier Name</TableHead>
                  <TableHead>Reliability Status</TableHead>
                  <TableHead className="text-right">Total Weight (kg)</TableHead>
                  <TableHead className="text-right">Order Count</TableHead>
                  <TableHead className="text-right font-bold text-foreground">Total Sourcing Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.suppliers?.map((s: any, index: number) => (
                  <TableRow key={s.supplier_name} className="group transition-colors hover:bg-indigo-50/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                          <Truck className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground">{s.supplier_name}</span>
                          <span className="text-xs text-muted-foreground">Premium Supply Partner</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 font-semibold">
                        <Users className="h-3 w-3" />
                        Preferred
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{Number(s.weight).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{s.count} orders</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-foreground">₹{Number(s.amount).toLocaleString()}</span>
                        <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{
                              width: `${(Number(s.amount) / Number(data.suppliers[0].amount)) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  )
}
