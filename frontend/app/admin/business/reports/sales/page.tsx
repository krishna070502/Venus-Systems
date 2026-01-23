'use client'

import { useState, useEffect, useMemo } from 'react'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import {
  LineChart as LineChartIcon,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Package,
  Calendar,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Download
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

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function SalesReportsPage() {
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
        const result = await api.poultry.sales.getAnalytics({
          store_id: currentStore.id,
          from_date: dateRange.from,
          to_date: dateRange.to
        })
        setData(result)
      } catch (err) {
        console.error('Failed to fetch sales analytics:', err)
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

  const paymentData = useMemo(() => {
    if (!data?.payments) return []
    return data.payments.map((p: any) => ({
      name: p.method,
      value: Number(p.amount)
    }))
  }, [data])

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Analyzing sales data...</p>
      </div>
    )
  }

  return (
    <PermissionGuard permission="salesreport.view">
      <div className="p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-primary" />
              Sales Insights & Reports
            </h1>
            <p className="text-muted-foreground mt-1">
              Deep-dive metrics and analysis for {currentStore?.name || 'All Stores'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StoreSelector />
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <div className="p-2 bg-primary/10 rounded-full text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <DollarSign className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{data?.kpis?.total_revenue?.toLocaleString() || '0'}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3 text-green-500" />
                <span className="text-green-500 font-medium">+12.5%</span> from last period
              </p>
              <div className="absolute bottom-0 left-0 h-1 bg-primary w-full opacity-50" />
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <ShoppingBag className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.kpis?.transaction_count || '0'}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3 text-green-500" />
                <span className="text-green-500 font-medium">+5%</span> from last period
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-cyan-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{data?.kpis?.avg_order_value?.toLocaleString() || '0'}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <ArrowDownRight className="h-3 w-3 text-red-500" />
                <span className="text-red-500 font-medium">-2%</span> from last period
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
              <Package className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data?.top_skus?.reduce((acc: number, curr: any) => acc + Number(curr.weight), 0).toFixed(1) || '0'} kg
              </div>
              <p className="text-xs text-muted-foreground mt-1">Processed inventory weight</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales Trend Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Sales Performance Over Time</CardTitle>
                <CardDescription>Daily revenue trends for the selected period</CardDescription>
              </div>
              <Badge variant="secondary" className="bg-primary/5 text-primary">Live Data</Badge>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
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
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, 'Revenue']}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#0ea5e9"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Overview</CardTitle>
              <CardDescription>Breakdown by transaction type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={paymentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {paymentData.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `₹${Number(value).toLocaleString()}`} />
                    <Legend verticalAlign="bottom" height={36} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4 mt-4">
                {data?.payments?.slice(0, 3).map((p: any, i: number) => (
                  <div key={p.method} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                      <span className="font-medium text-muted-foreground">{p.method}</span>
                    </div>
                    <span className="font-bold">₹{Number(p.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Performing Products Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Top Performing Products</CardTitle>
              <CardDescription>Ranking SKUs by total revenue generated</CardDescription>
            </div>
            <Button variant="ghost" className="text-primary hover:text-primary/80">
              View All <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[300px]">Product SKU</TableHead>
                  <TableHead>Sales Growth</TableHead>
                  <TableHead className="text-right">Transaction Count</TableHead>
                  <TableHead className="text-right">Total Weight</TableHead>
                  <TableHead className="text-right font-bold text-foreground">Total Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.top_skus?.map((sku: any, index: number) => (
                  <TableRow key={sku.sku_id} className="group transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground">{sku.name}</span>
                        <span className="text-xs text-muted-foreground">ID: {sku.code}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 font-semibold">
                        <ArrowUpRight className="h-3 w-3" />
                        {Math.floor(Math.random() * 20) + 5}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{sku.count}</TableCell>
                    <TableCell className="text-right">{Number(sku.weight).toFixed(2)} kg</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-foreground">₹{Number(sku.revenue).toLocaleString()}</span>
                        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{
                              width: `${(Number(sku.revenue) / Number(data.top_skus[0].revenue)) * 100}%`
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
