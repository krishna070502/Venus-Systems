'use client'

import { useState, useEffect, useCallback } from 'react'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import { api } from '@/lib/api/client'
import {
  Banknote,
  Loader2,
  AlertCircle,
  FileText,
  Store,
  Calendar,
  Filter,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  Check,
  XCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExpenseItem {
  id: string
  store_id: number
  store_name: string | null
  settlement_date: string
  expense_amount: number
  expense_notes: string | null
  expense_receipts: string[] | null
  status: string
  expense_status: string
  submitted_by: string | null
  submitted_at: string | null
  approved_by: string | null
  approved_at: string | null
}

interface ExpenseListResponse {
  items: ExpenseItem[]
  total: number
  page: number
  page_size: number
}

interface Shop {
  id: number
  name: string
}

export default function ExpensesPage() {
  const { permissions, loading: permLoading } = usePermissions()
  const canViewAllStores = !permLoading && hasPermission(permissions, 'expense.allstores')

  const [expenses, setExpenses] = useState<ExpenseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shops, setShops] = useState<Shop[]>([])

  // Filters
  const [storeId, setStoreId] = useState<number | ''>('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)

  // Image preview modal
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const fetchShops = useCallback(async () => {
    try {
      const data = await api.businessManagement.shops.getAll(true) as Shop[]
      setShops(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load shops:', err)
    }
  }, [])

  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: any = {
        page,
        page_size: pageSize
      }
      if (storeId) params.store_id = storeId
      if (fromDate) params.from_date = fromDate
      if (toDate) params.to_date = toDate
      if (statusFilter) params.status = statusFilter

      const data = await api.poultry.expenses.getAll(params) as ExpenseListResponse
      setExpenses(data.items || [])
      setTotal(data.total || 0)
    } catch (err: any) {
      setError(err.message || 'Failed to load expenses')
      setExpenses([])
    } finally {
      setLoading(false)
    }
  }, [storeId, fromDate, toDate, statusFilter, page, pageSize])

  const handleApprove = async (id: string) => {
    try {
      await api.poultry.expenses.approve(id)
      fetchExpenses()
    } catch (err: any) {
      alert(err.message || 'Failed to approve expense')
    }
  }

  const handleReject = async (id: string) => {
    if (!confirm('Are you sure you want to reject this expense? This will require the manager to submit the full cash amount.')) return
    try {
      await api.poultry.expenses.reject(id)
      fetchExpenses()
    } catch (err: any) {
      alert(err.message || 'Failed to reject expense')
    }
  }

  useEffect(() => {
    fetchShops()
  }, [fetchShops])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const clearFilters = () => {
    setStoreId('')
    setFromDate('')
    setToDate('')
    setStatusFilter('')
    setPage(1)
  }

  const hasActiveFilters = storeId || fromDate || toDate || statusFilter

  const totalPages = Math.ceil(total / pageSize)

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-yellow-100 text-yellow-800',
    SUBMITTED: 'bg-blue-100 text-blue-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    LOCKED: 'bg-slate-100 text-slate-800',
  }

  const isImageUrl = (url: string) => {
    const lower = url.toLowerCase()
    return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') ||
      lower.endsWith('.webp') || lower.endsWith('.gif')
  }

  return (
    <PermissionGuard permission="expense.read">
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Banknote className="h-8 w-8" />
                Expenses
              </h1>
              <p className="text-muted-foreground mt-2">
                Verify and approve store expenses from daily settlements
              </p>
            </div>
          </div>
        </div>
        {/* ... existing filters ... */}
        {/* I will truncate filters for brevity in replacement but I must maintain them if I'm doing a single block. */}
        {/* Actually, it's better to replace the table rows specifically. */}

        {/* Filters */}
        <div className="bg-card border rounded-xl p-4 mb-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground mb-4">
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="ml-auto text-xs text-primary hover:underline flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Clear All
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Store Filter */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                <Store className="h-3 w-3" />
                Store
              </label>
              <select
                value={storeId}
                onChange={(e) => {
                  setStoreId(e.target.value ? Number(e.target.value) : '')
                  setPage(1)
                }}
                className="w-full px-3 py-2 border rounded-lg bg-background font-medium text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="">
                  {canViewAllStores ? 'All Stores' : 'Select Store'}
                </option>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
            </div>

            {/* From Date */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value)
                  setPage(1)
                }}
                className="w-full px-3 py-2 border rounded-lg bg-background font-medium text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            {/* To Date */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value)
                  setPage(1)
                }}
                className="w-full px-3 py-2 border rounded-lg bg-background font-medium text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            {/* Status Filter */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
                className="w-full px-3 py-2 border rounded-lg bg-background font-medium text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="APPROVED">Approved</option>
                <option value="LOCKED">Locked</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        ) : expenses.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed bg-card p-12 text-center text-muted-foreground">
            <Banknote className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="font-medium">No expenses found</p>
            <p className="text-sm mt-1">Expenses from settlement forms will appear here</p>
          </div>
        ) : (
          <>
            {/* Expenses Table */}
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Store</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Amount</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Notes</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Bills</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Settlement</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Expense Status</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right pr-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {expenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-4">
                          <div className="font-bold">
                            {new Date(expense.settlement_date + 'T00:00:00').toLocaleDateString(undefined, {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium text-sm">
                            {expense.store_name || `Store #${expense.store_id}`}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="font-bold text-lg">
                            ₹{Number(expense.expense_amount).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-4 py-4 max-w-xs">
                          <div className="text-sm text-muted-foreground truncate">
                            {expense.expense_notes || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {expense.expense_receipts && expense.expense_receipts.length > 0 ? (
                            <div className="flex items-center justify-center gap-1">
                              {expense.expense_receipts.slice(0, 3).map((url, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => isImageUrl(url) ? setPreviewImage(url) : window.open(url, '_blank')}
                                  className="w-8 h-8 rounded border bg-muted/30 overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                                  title="View bill"
                                >
                                  {isImageUrl(url) ? (
                                    <img src={url} alt="Bill" className="w-full h-full object-cover" />
                                  ) : (
                                    <FileText className="w-4 h-4 m-auto text-muted-foreground" />
                                  )}
                                </button>
                              ))}
                              {expense.expense_receipts.length > 3 && (
                                <span className="text-xs text-muted-foreground font-medium">
                                  +{expense.expense_receipts.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No bills</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={cn(
                            "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            statusColors[expense.status] || 'bg-gray-100 text-gray-800'
                          )}>
                            {expense.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={cn(
                            "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            statusColors[expense.expense_status] || 'bg-gray-100 text-gray-800'
                          )}>
                            {expense.expense_status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right pr-6">
                          <div className="flex items-center justify-end gap-2">
                            {expense.expense_status === 'SUBMITTED' && (
                              <>
                                <button
                                  onClick={() => handleApprove(expense.id)}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                                  title="Approve expense"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleReject(expense.id)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Reject expense"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => window.location.href = `/admin/business/settlements/${expense.id}`}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="View settlement"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="border-t px-4 py-3 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} of {total}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-medium px-2">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-2 border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Image Preview Modal */}
        {previewImage && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              <img
                src={previewImage}
                alt="Bill Preview"
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              />
              <div className="absolute top-4 right-4 flex gap-2">
                <a
                  href={previewImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 bg-white/20 rounded-full hover:bg-white/40 transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-5 w-5 text-white" />
                </a>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="p-2 bg-white/20 rounded-full hover:bg-white/40 transition-colors"
                  title="Close"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  )
}
