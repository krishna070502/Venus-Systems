'use client'

import { useState, useEffect, useCallback } from 'react'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions } from '@/lib/auth/usePermissions'
import { useStore } from '@/lib/context/StoreContext'
import { StoreHeader } from '@/components/poultry/StoreHeader'
import { api } from '@/lib/api/client'
import {
  Wallet,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  TrendingUp,
  ArrowDownCircle,
  IndianRupee,
  RefreshCw,
  Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface CashbookEntry {
  id: string
  store_id: number
  store_name: string
  settlement_date: string
  declared_cash: number
  expense_amount: number
  expense_status: string
  status: string
  submit_amount: number
  is_estimated: boolean
  notes: string | null
}

export default function CashbookPage() {
  const { currentStore } = useStore()
  const { permissions, loading: permLoading } = usePermissions()

  const [entries, setEntries] = useState<CashbookEntry[]>([])
  const [stats, setStats] = useState({
    total_cash: 0,
    total_expenses: 0,
    total_to_collect: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fromDate, setFromDate] = useState<string>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  const [toDate, setToDate] = useState<string>(new Date().toISOString().split('T')[0])

  // Custom API call for cashbook to ensure store_id is correctly appended
  const fetchCashbook = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.poultry.finance.getCashbook({
        from_date: fromDate,
        to_date: toDate,
        store_id: currentStore?.id
      }) as any

      setEntries(data.entries)
      setStats({
        total_cash: data.total_cash,
        total_expenses: data.total_expenses,
        total_to_collect: data.total_to_collect
      })
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cashbook data')
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate, currentStore?.id])

  useEffect(() => {
    fetchCashbook()
  }, [fetchCashbook])

  const getStatusConfig = (status: string, isEstimated: boolean) => {
    switch (status) {
      case 'APPROVED':
      case 'LOCKED':
        return {
          icon: CheckCircle2,
          color: 'text-green-600 bg-green-50 border-green-200',
          label: 'Approved'
        }
      case 'REJECTED':
        return {
          icon: XCircle,
          color: 'text-red-600 bg-red-50 border-red-200',
          label: 'Rejected'
        }
      case 'SUBMITTED':
        return isEstimated ? {
          icon: Clock,
          color: 'text-amber-600 bg-amber-50 border-amber-200',
          label: 'Estimated (Pending Appr.)'
        } : {
          icon: Clock,
          color: 'text-blue-600 bg-blue-50 border-blue-200',
          label: 'Submitted'
        }
      default:
        return {
          icon: AlertCircle,
          color: 'text-muted-foreground bg-muted border-muted-foreground/20',
          label: status
        }
    }
  }

  return (
    <PermissionGuard permission="cashbook.view">
      <div className="flex flex-col h-full bg-muted/20">
        <StoreHeader title="Cashbook Dashboard" subtitle="Track cash submissions and expense approvals" />

        <div className="flex-1 overflow-auto p-4 lg:p-6 space-y-6">
          {/* Filters & Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 rounded-xl border shadow-sm">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-background border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <span className="text-muted-foreground">to</span>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-background border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
            </div>
            <button
              onClick={fetchCashbook}
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-semibold hover:bg-primary/20 transition-colors"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card p-6 rounded-xl border shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Declared Cash</span>
                <IndianRupee className="h-5 w-5 text-blue-500" />
              </div>
              <div className="text-3xl font-bold font-mono">₹{stats.total_cash.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Gross cash from sales
              </div>
            </div>
            <div className="bg-card p-6 rounded-xl border shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Expenses</span>
                <ArrowDownCircle className="h-5 w-5 text-red-500" />
              </div>
              <div className="text-3xl font-bold text-red-600 font-mono">₹{stats.total_expenses.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">
                Approved expenses only
              </div>
            </div>
            <div className="bg-primary p-6 rounded-xl border shadow-sm space-y-2 text-primary-foreground">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium opacity-80 uppercase tracking-wider">Cash to Collect</span>
                <Wallet className="h-5 w-5 opacity-80" />
              </div>
              <div className="text-3xl font-bold font-mono">₹{stats.total_to_collect.toLocaleString()}</div>
              <div className="text-xs opacity-70">
                Net amount after expenses
              </div>
            </div>
          </div>

          {/* Records List */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Submissions
            </h2>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center bg-card rounded-xl border border-dashed">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Loading financial records...</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center bg-card rounded-xl border border-dashed">
                <Wallet className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground italic">No settlement records found for this period.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {entries.map((entry) => {
                  const config = getStatusConfig(entry.status, entry.is_estimated)
                  const StatusIcon = config.icon

                  return (
                    <div
                      key={entry.id}
                      className="bg-card p-5 rounded-xl border shadow-sm hover:border-primary/50 transition-all group"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex gap-4 items-start">
                          <div className={cn("p-3 rounded-lg border", config.color.split(' ')[1])}>
                            <StatusIcon className={cn("h-6 w-6", config.color.split(' ')[0])} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 font-bold text-lg">
                              {entry.store_name}
                              <span className={cn(
                                "text-[10px] uppercase px-2 py-0.5 rounded-full border font-semibold",
                                config.color
                              )}>
                                {config.label}
                              </span>
                              {entry.expense_status === 'REJECTED' && (
                                <span className="text-[10px] uppercase px-2 py-0.5 rounded-full border border-red-200 bg-red-50 text-red-600 font-bold">
                                  Expense Rejected
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              {new Date(entry.settlement_date).toLocaleDateString('en-IN', { dateStyle: 'long' })}
                              {entry.notes && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                  <span className="truncate max-w-[200px]">{entry.notes}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2">
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">Cash Submission</div>
                            <div className="text-2xl font-bold font-mono">
                              {entry.is_estimated && <span className="text-sm font-normal text-muted-foreground mr-1">Est.</span>}
                              ₹{entry.submit_amount.toLocaleString()}
                            </div>
                          </div>
                          <Link
                            href={`/admin/business/settlements/${entry.id}`}
                            className="p-2 bg-muted rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                            title="View Settlement"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>

                      {/* Detail Breakdown (Desktop only) */}
                      <div className="hidden md:flex mt-4 pt-4 border-t border-dashed items-center gap-8 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          Declared: ₹{entry.declared_cash.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          Expense: ₹{entry.expense_amount.toLocaleString()}
                          {entry.expense_status === 'REJECTED' && " (N/A - Rejected)"}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </PermissionGuard>
  )
}
