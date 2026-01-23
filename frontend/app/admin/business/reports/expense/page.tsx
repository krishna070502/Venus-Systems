'use client'

import { useState, useEffect } from 'react'
import {
  FileBarChart,
  TrendingUp,
  Wallet,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Filter,
  Calendar,
  Download,
  AlertCircle,
  Hash
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { api } from '@/lib/api/client'
import { useStore } from '@/lib/context/StoreContext'
import { PermissionGuard } from '@/components/admin/PermissionGuard'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4']

export default function ExpenseReportsPage() {
  const { currentStore } = useStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchAnalytics()
  }, [currentStore, dateRange])

  const fetchAnalytics = async () => {
    try {
      if (!currentStore) return
      setLoading(true)
      const res = await api.poultry.expenses.getAnalytics({
        store_id: currentStore.id,
        from_date: dateRange.from,
        to_date: dateRange.to
      })
      setAnalytics(res)
      setError(null)
    } catch (err: any) {
      console.error('Failed to fetch expense analytics:', err)
      setError(err.message || 'Failed to load expense data')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !analytics) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-20 bg-muted rounded-xl w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-32 bg-muted rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[400px] bg-muted rounded-xl" />
          <div className="h-[400px] bg-muted rounded-xl" />
        </div>
      </div>
    )
  }

  const kpis = analytics?.kpis || {}
  const trends = analytics?.trends || []
  const categories = analytics?.categories || []
  const topExpenses = analytics?.top_expenses || []

  return (
    <PermissionGuard permission="expensereport.view">
      <div className="p-6 space-y-6 bg-[#f8fafc]/50 min-h-screen">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg text-white">
                <FileBarChart className="h-8 w-8" />
              </div>
              Expense Analytics
            </h1>
            <p className="text-slate-500 mt-1 font-medium">
              Monitoring operational costs and settlement expenses
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white rounded-xl shadow-sm border p-1">
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="bg-transparent border-none text-sm font-medium focus:ring-0 px-3 outline-none"
              />
              <span className="text-slate-400 px-1">→</span>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="bg-transparent border-none text-sm font-medium focus:ring-0 px-3 outline-none"
              />
            </div>
            <button className="p-2.5 bg-white rounded-xl shadow-sm border hover:bg-slate-50 transition-colors">
              <Download className="h-5 w-5 text-slate-600" />
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard
            title="Total Expenses"
            value={`₹${(kpis.total_expense || 0).toLocaleString()}`}
            icon={<Wallet className="h-5 w-5 text-indigo-600" />}
            color="indigo"
          />
          <KPICard
            title="Avg Daily"
            value={`₹${Math.round(kpis.avg_daily_expense || 0).toLocaleString()}`}
            icon={<TrendingUp className="h-5 w-5 text-violet-600" />}
            color="violet"
          />
          <KPICard
            title="Approved"
            value={`₹${(kpis.approved_expense || 0).toLocaleString()}`}
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
            color="emerald"
          />
          <KPICard
            title="Pending Approval"
            value={`₹${(kpis.pending_expense || 0).toLocaleString()}`}
            icon={<Clock className="h-5 w-5 text-amber-600" />}
            color="amber"
          />
          <KPICard
            title="Expense Count"
            value={kpis.expense_count || 0}
            icon={<Hash className="h-5 w-5 text-slate-600" />}
            color="slate"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-500" />
                Expense Trend
              </h3>
            </div>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends}>
                  <defs>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(val) => new Date(val).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(val) => `₹${val >= 1000 ? (val / 1000) + 'k' : val}`}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    formatter={(val: any) => [`₹${Number(val || 0).toLocaleString()}`, 'Amount']}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#6366f1"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorExpense)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Breakdown Chart */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Filter className="h-5 w-5 text-indigo-500" />
              Expense Distribution
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="amount"
                    nameKey="category"
                  >
                    {categories.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => `₹${Number(val || 0).toLocaleString()}`}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-3">
              {categories.map((cat: any, idx: number) => (
                <div key={cat.category} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-slate-600 font-medium">{cat.category}</span>
                  </div>
                  <span className="font-bold text-slate-800">{cat.percentage.toFixed(1)}%</span>
                </div>
              ))}
              {categories.length === 0 && (
                <div className="text-center py-10 text-slate-400 italic">
                  No categorical data available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Details Table */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-500" />
              Recent High Expenses
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Notes / Category</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topExpenses.map((expense: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-600">
                      {new Date(expense.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-800 truncate max-w-[300px]">
                        {expense.notes || 'General Expense'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${expense.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                        expense.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                        {expense.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-slate-900">
                        ₹{expense.amount.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
                {topExpenses.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic">
                      No expenses found for the selected period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PermissionGuard>
  )
}

function KPICard({ title, value, icon, trend, trendUp, color }: any) {
  const colorClasses: any = {
    indigo: 'bg-indigo-50 border-indigo-100',
    violet: 'bg-violet-50 border-violet-100',
    emerald: 'bg-emerald-50 border-emerald-100',
    amber: 'bg-amber-50 border-amber-100',
    slate: 'bg-slate-50 border-slate-100'
  }

  return (
    <div className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-xl ${colorClasses[color]}`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${trendUp ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
            <ArrowUpRight className={`h-3 w-3 ${trendUp ? '' : 'rotate-90'}`} />
            {trend}
          </div>
        )}
      </div>
      <div>
        <p className="text-slate-500 text-sm font-bold mb-1 uppercase tracking-tight">{title}</p>
        <h4 className="text-2xl font-black text-slate-900">{value}</h4>
      </div>
    </div>
  )
}
