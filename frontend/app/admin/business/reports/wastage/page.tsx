'use client'

import { useState, useEffect, useMemo } from 'react'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import {
  FileBarChart,
  TrendingUp,
  Scale,
  Trash2,
  Waves,
  Calendar,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Download,
  AlertTriangle,
  CheckCircle2
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

const COLORS = ['#ef4444', '#f59e0b', '#0ea5e9', '#22c55e', '#8b5cf6', '#ec4899']

export default function WastageReportsPage() {
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
        const result = await api.poultry.processing.getAnalytics({
          store_id: currentStore.id,
          from_date: dateRange.from,
          to_date: dateRange.to
        })
        setData(result)
      } catch (err) {
        console.error('Failed to fetch wastage analytics:', err)
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

  const birdTypeData = useMemo(() => {
    if (!data?.bird_types) return []
    return data.bird_types.map((b: any) => ({
      name: b.bird_type,
      value: Number(b.weight)
    }))
  }, [data])

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Calculating efficiency metrics...</p>
      </div>
    )
  }

  const avgEfficiency = data?.kpis?.avg_efficiency_percentage || 0
  const efficiencyColor = avgEfficiency > 75 ? 'text-green-500' : avgEfficiency > 60 ? 'text-yellow-500' : 'text-red-500'

  return (
    <PermissionGuard permission="wastagereport.view">
      <div className="p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Scale className="h-8 w-8 text-primary" />
              Wastage & Efficiency Reports
            </h1>
            <p className="text-muted-foreground mt-1">
              Processing yield analysis and wastage tracking for {currentStore?.name || 'All Stores'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StoreSelector />
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Download Report
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Wastage</CardTitle>
              <div className="p-2 bg-red-100 rounded-full text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
                <Trash2 className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{data?.kpis?.total_wastage_weight?.toFixed(2) || '0'} kg</div>
              <p className="text-xs text-muted-foreground mt-1">
                Last 30 days total loss
              </p>
              <div className="absolute bottom-0 left-0 h-1 bg-red-500 w-full opacity-50" />
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Efficiency</CardTitle>
              <Waves className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", efficiencyColor)}>
                {avgEfficiency.toFixed(1)}%
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-1000",
                      avgEfficiency > 75 ? 'bg-green-500' : avgEfficiency > 60 ? 'bg-yellow-500' : 'bg-red-500'
                    )}
                    style={{ width: `${avgEfficiency}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Input Weight</CardTitle>
              <TrendingUp className="h-4 w-4 text-cyan-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.kpis?.total_input_weight?.toFixed(2) || '0'} kg</div>
              <p className="text-xs text-muted-foreground mt-1">Total live weight processed</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processing Events</CardTitle>
              <FileBarChart className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.kpis?.entry_count || '0'}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                Across all bird & product types
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Efficiency Trend Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Processing Efficiency Trend</CardTitle>
                <CardDescription>Daily yield percentage vs Target</CardDescription>
              </div>
              <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">High Precision</Badge>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorEff" x1="0" y1="0" x2="0" y2="1">
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
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any) => [`${Number(value).toFixed(1)}%`, 'Efficiency']}
                    />
                    <Area
                      type="monotone"
                      dataKey="efficiency"
                      stroke="#0ea5e9"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorEff)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Wastage by Bird Type */}
          <Card>
            <CardHeader>
              <CardTitle>Wastage Distribution</CardTitle>
              <CardDescription>Loss by bird species</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={birdTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {birdTypeData.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `${Number(value).toFixed(2)} kg`} />
                    <Legend verticalAlign="bottom" height={36} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4 mt-4">
                {data?.bird_types?.map((b: any, i: number) => (
                  <div key={b.bird_type} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                      <span className="font-medium text-muted-foreground">{b.bird_type}</span>
                    </div>
                    <span className="font-bold">{Number(b.weight).toFixed(2)} kg</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Processing Performance Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Yield Analysis by Processing Type</CardTitle>
              <CardDescription>Breakdown of input vs output performance</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[300px]">Processing Flow</TableHead>
                  <TableHead>Efficiency Status</TableHead>
                  <TableHead className="text-right">Input Weight</TableHead>
                  <TableHead className="text-right">Output Weight</TableHead>
                  <TableHead className="text-right font-bold text-foreground">Efficiency %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.efficiencies?.map((eff: any, index: number) => (
                  <TableRow key={eff.type} className="group transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground">{eff.type}</span>
                        <span className="text-xs text-muted-foreground">Standardized processing track</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {eff.efficiency > 75 ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 font-semibold">
                          <CheckCircle2 className="h-3 w-3" />
                          Optimal
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1 font-semibold">
                          <AlertTriangle className="h-3 w-3" />
                          Review
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{Number(eff.input_weight).toFixed(2)} kg</TableCell>
                    <TableCell className="text-right font-medium">{Number(eff.output_weight).toFixed(2)} kg</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className={cn("font-bold", eff.efficiency > 75 ? 'text-green-600' : 'text-amber-600')}>
                          {Number(eff.efficiency).toFixed(1)}%
                        </span>
                        <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                          <div
                            className={cn("h-full rounded-full", eff.efficiency > 75 ? 'bg-green-500' : 'bg-amber-500')}
                            style={{ width: `${eff.efficiency}%` }}
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

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}
