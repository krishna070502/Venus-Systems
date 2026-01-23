'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { apiRequest } from '@/lib/api/client'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions } from '@/lib/auth/usePermissions'
import {
  SupplierLedgerSummary,
  CustomerLedgerSummary,
  FinancialLedgerEntry,
  EnrichedFinancialLedgerEntry
} from '@/lib/types/poultry'
import {
  BookOpenCheck,
  Truck,
  UserCheck,
  Loader2,
  AlertCircle,
  ChevronRight,
  ArrowLeft,
  Phone,
  Search,
  Filter,
  Calendar,
  X,
  CreditCard,
  History,
  Store
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/lib/context/StoreContext'
import { format } from 'date-fns'

type MainTab = 'overviews' | 'transactions'
type SubTab = 'suppliers' | 'customers'

export default function LedgerPage() {
  const { currentStore, stores } = useStore()
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('overviews')
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('suppliers')

  // Overview Data
  const [supplierLedger, setSupplierLedger] = useState<SupplierLedgerSummary[]>([])
  const [customerLedger, setCustomerLedger] = useState<CustomerLedgerSummary[]>([])
  const [overviewLoading, setOverviewLoading] = useState(true)

  // Transactions Data
  const [transactions, setTransactions] = useState<EnrichedFinancialLedgerEntry[]>([])
  const [transLoading, setTransLoading] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  })
  const [entityType, setEntityType] = useState<string>('all')
  const [transType, setTransType] = useState<string>('all')
  const [filterStore, setFilterStore] = useState<string>('all')

  const [error, setError] = useState<string | null>(null)

  // Detail view
  const [selectedEntity, setSelectedEntity] = useState<{ id: string; name: string; type: SubTab } | null>(null)
  const [ledgerDetails, setLedgerDetails] = useState<FinancialLedgerEntry[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchOverviews = useCallback(async () => {
    setOverviewLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStore !== 'all') params.append('store_id', filterStore)

      const [suppliers, customers] = await Promise.all([
        apiRequest<SupplierLedgerSummary[]>(`/api/v1/poultry/ledger/suppliers?${params.toString()}`),
        apiRequest<CustomerLedgerSummary[]>(`/api/v1/poultry/ledger/customers?${params.toString()}`)
      ])
      setSupplierLedger(Array.isArray(suppliers) ? suppliers : [])
      setCustomerLedger(Array.isArray(customers) ? customers : [])
    } catch (err: any) {
      setError(err.message || 'Failed to load ledger summaries')
    } finally {
      setOverviewLoading(false)
    }
  }, [filterStore])

  const fetchTransactions = useCallback(async () => {
    setTransLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (dateRange.from) params.append('from_date', dateRange.from)
      if (dateRange.to) params.append('to_date', dateRange.to)
      if (entityType !== 'all') params.append('entity_type', entityType)
      if (transType !== 'all') params.append('transaction_type', transType)
      if (filterStore !== 'all') params.append('store_id', filterStore)

      const data = await apiRequest<EnrichedFinancialLedgerEntry[]>(`/api/v1/poultry/ledger/all?${params.toString()}`)
      setTransactions(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err.message || 'Failed to load transactions')
    } finally {
      setTransLoading(false)
    }
  }, [search, dateRange, entityType, transType, filterStore])

  const fetchLedgerDetails = async (entityId: string, type: SubTab) => {
    setDetailLoading(true)
    try {
      const endpoint = type === 'suppliers'
        ? `/api/v1/poultry/ledger/suppliers/${entityId}`
        : `/api/v1/poultry/ledger/customers/${entityId}`
      const data = await apiRequest<FinancialLedgerEntry[]>(endpoint)
      setLedgerDetails(Array.isArray(data) ? data : [])
    } catch (err: any) {
      console.error('Failed to load ledger details:', err)
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    fetchOverviews()
  }, [fetchOverviews])

  useEffect(() => {
    if (activeMainTab === 'transactions') {
      fetchTransactions()
    }
  }, [activeMainTab, fetchTransactions])

  const handleEntityClick = (entity: SupplierLedgerSummary | CustomerLedgerSummary, type: SubTab) => {
    setSelectedEntity({ id: entity.entity_id, name: entity.entity_name, type })
    fetchLedgerDetails(entity.entity_id, type)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  const totalSupplierOutstanding = supplierLedger.reduce((sum, s) => sum + (Number(s.outstanding) || 0), 0)
  const totalCustomerOutstanding = customerLedger.reduce((sum, c) => sum + (Number(c.outstanding) || 0), 0)

  // UI Components
  if (selectedEntity) {
    return (
      <PermissionGuard permission="ledger.view">
        <div className="p-6">
          <button
            onClick={() => setSelectedEntity(null)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Ledger
          </button>

          <div className="mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              {selectedEntity.type === 'suppliers' ? <Truck className="h-8 w-8 text-primary" /> : <UserCheck className="h-8 w-8 text-primary" />}
              {selectedEntity.name}
            </h1>
            <p className="text-muted-foreground mt-2">
              Transaction history for this {selectedEntity.type.slice(0, -1)}
            </p>
          </div>

          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : ledgerDetails.length === 0 ? (
            <div className="text-center py-24 bg-card rounded-xl border border-dashed">
              <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-muted-foreground">No transactions found for this period</p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Date</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Type</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Notes</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold">Debit</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ledgerDetails.map((entry) => (
                      <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">{formatDate(entry.created_at)}</td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className={cn(
                            "capitalize",
                            entry.transaction_type === 'PURCHASE' || entry.transaction_type === 'SALE'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-green-50 text-green-700 border-green-200'
                          )}>
                            {entry.transaction_type.toLowerCase().replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm max-w-xs truncate">{entry.notes || '—'}</td>
                        <td className="px-6 py-4 text-right font-medium text-red-600">
                          {(Number(entry.debit) || 0) > 0 ? formatCurrency(Number(entry.debit)) : '—'}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-green-600">
                          {(Number(entry.credit) || 0) > 0 ? formatCurrency(Number(entry.credit)) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </PermissionGuard>
    )
  }

  return (
    <PermissionGuard permission="ledger.view">
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BookOpenCheck className="h-8 w-8 text-primary" />
              </div>
              Financial Ledger
            </h1>
            <p className="text-muted-foreground mt-2">
              Consolidated financial oversight of business partners
            </p>
          </div>

          <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
            <button
              onClick={() => setActiveMainTab('overviews')}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-md transition-all",
                activeMainTab === 'overviews'
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Partner Overviews
            </button>
            <button
              onClick={() => setActiveMainTab('transactions')}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-md transition-all",
                activeMainTab === 'transactions'
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All Transactions
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="border-l-4 border-l-red-500 overflow-hidden group hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-50 rounded-xl group-hover:scale-110 transition-transform">
                  <Truck className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Payable to Suppliers</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalSupplierOutstanding)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 overflow-hidden group hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-50 rounded-xl group-hover:scale-110 transition-transform">
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Receivable from Customers</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalCustomerOutstanding)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {activeMainTab === 'overviews' ? (
          <>
            {/* Overview Tabs & Store Filter */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveSubTab('suppliers')}
                  className={cn(
                    "px-4 py-3 font-semibold transition-all border-b-2 -mb-px flex items-center gap-2",
                    activeSubTab === 'suppliers'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                  )}
                >
                  <Truck className="h-4 w-4" />
                  Suppliers
                  <Badge variant="secondary" className="ml-1 bg-primary/5 text-primary border-none">
                    {supplierLedger.length}
                  </Badge>
                </button>
                <button
                  onClick={() => setActiveSubTab('customers')}
                  className={cn(
                    "px-4 py-3 font-semibold transition-all border-b-2 -mb-px flex items-center gap-2",
                    activeSubTab === 'customers'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                  )}
                >
                  <UserCheck className="h-4 w-4" />
                  Customers
                  <Badge variant="secondary" className="ml-1 bg-primary/5 text-primary border-none">
                    {customerLedger.length}
                  </Badge>
                </button>
              </div>

              <div className="flex items-center gap-2 pb-2 md:pb-0">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Filter Store:</span>
                <Select value={filterStore} onValueChange={setFilterStore}>
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder="All Stores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stores</SelectItem>
                    {stores.map(s => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {overviewLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
              </div>
            ) : (
              <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold">Partner</th>
                        {activeSubTab === 'customers' && <th className="px-6 py-4 text-right text-sm font-semibold">Credit Limit</th>}
                        <th className="px-6 py-4 text-right text-sm font-semibold">{activeSubTab === 'suppliers' ? 'Purchases' : 'Sales'}</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold">{activeSubTab === 'suppliers' ? 'Payments' : 'Receipts'}</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold">Outstanding Balance</th>
                        <th className="px-6 py-4 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(activeSubTab === 'suppliers' ? supplierLedger : customerLedger).map((entity) => (
                        <tr
                          key={entity.entity_id}
                          className="hover:bg-muted/30 transition-colors cursor-pointer group"
                          onClick={() => handleEntityClick(entity, activeSubTab)}
                        >
                          <td className="px-6 py-5">
                            <div className="font-bold text-foreground">{entity.entity_name}</div>
                            {entity.phone && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                                <Phone className="h-3 w-3" /> {entity.phone}
                              </div>
                            )}
                          </td>
                          {activeSubTab === 'customers' && (
                            <td className="px-6 py-5 text-right text-muted-foreground font-medium">
                              {formatCurrency(Number((entity as CustomerLedgerSummary).credit_limit || 0))}
                            </td>
                          )}
                          <td className="px-6 py-5 text-right font-medium">
                            {formatCurrency(Number(activeSubTab === 'suppliers' ? (entity as SupplierLedgerSummary).total_purchases : (entity as CustomerLedgerSummary).total_sales))}
                          </td>
                          <td className="px-6 py-5 text-right font-medium">
                            {formatCurrency(Number(activeSubTab === 'suppliers' ? (entity as SupplierLedgerSummary).total_payments : (entity as CustomerLedgerSummary).total_receipts))}
                          </td>
                          <td className="px-6 py-5 text-right">
                            <span className={cn(
                              "font-bold py-1 px-3 rounded-full text-sm",
                              (Number(entity.outstanding) || 0) > 0
                                ? "bg-amber-50 text-amber-700"
                                : "bg-green-50 text-green-700"
                            )}>
                              {formatCurrency(Number(entity.outstanding || 0))}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </td>
                        </tr>
                      ))}
                      {(activeSubTab === 'suppliers' ? supplierLedger.length : customerLedger.length) === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-20 text-center">
                            <div className="flex flex-col items-center gap-2 opacity-30">
                              {activeSubTab === 'suppliers' ? <Truck className="h-12 w-12" /> : <UserCheck className="h-12 w-12" />}
                              <p className="font-medium">No results found</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-6">
            {/* Transactions Filter Bar */}
            <Card className="bg-card/50 shadow-none border-dashed">
              <CardContent className="p-4 flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[200px] space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Name or notes..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">From</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="date"
                      value={dateRange.from}
                      onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                      className="pl-9 h-10 w-[160px]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">To</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="date"
                      value={dateRange.to}
                      onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                      className="pl-9 h-10 w-[160px]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Entity</label>
                  <Select value={entityType} onValueChange={setEntityType}>
                    <SelectTrigger className="w-[140px] h-10">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="CUSTOMER">Customers</SelectItem>
                      <SelectItem value="SUPPLIER">Suppliers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Type</label>
                  <Select value={transType} onValueChange={setTransType}>
                    <SelectTrigger className="w-[160px] h-10">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Events</SelectItem>
                      <SelectItem value="SALE">Sales</SelectItem>
                      <SelectItem value="RECEIPT">Receipts</SelectItem>
                      <SelectItem value="PURCHASE">Purchases</SelectItem>
                      <SelectItem value="SUPPLIER_PAYMENT">Payments</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Store</label>
                  <Select value={filterStore} onValueChange={setFilterStore}>
                    <SelectTrigger className="w-[160px] h-10">
                      <SelectValue placeholder="All Stores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stores</SelectItem>
                      {stores.map(s => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 text-muted-foreground border-dashed"
                  onClick={() => {
                    setSearch('')
                    setDateRange({ from: '', to: '' })
                    setEntityType('all')
                    setTransType('all')
                  }}
                  title="Clear Filters"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Transactions Table */}
            {transLoading ? (
              <div className="flex items-center justify-center py-32">
                <div className="text-center space-y-4">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground animate-pulse font-medium">Browsing the ledger records...</p>
                </div>
              </div>
            ) : (
              <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold">Scheduled Date</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold">Entity</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold">Transaction Type</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold">Notes & Context</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold">Debit</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {transactions.map((entry) => (
                        <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="text-sm font-semibold text-foreground">{format(new Date(entry.created_at), 'dd MMM yyyy')}</div>
                            <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{format(new Date(entry.created_at), 'HH:mm')}</div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="font-bold flex items-center gap-1.5">
                              {entry.entity_type === 'SUPPLIER' ? <Truck className="h-3.5 w-3.5 text-blue-500" /> : <UserCheck className="h-3.5 w-3.5 text-green-500" />}
                              {entry.entity_name}
                            </div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-tighter mt-1">{entry.entity_type}</div>
                          </td>
                          <td className="px-6 py-5">
                            <Badge variant="secondary" className={cn(
                              "text-[10px] font-bold py-0.5 tracking-tight uppercase",
                              entry.transaction_type === 'SALE' && "bg-blue-50 text-blue-700 border-blue-200",
                              entry.transaction_type === 'PURCHASE' && "bg-indigo-50 text-indigo-700 border-indigo-200",
                              entry.transaction_type === 'RECEIPT' && "bg-emerald-50 text-emerald-700 border-emerald-200",
                              entry.transaction_type === 'SUPPLIER_PAYMENT' && "bg-rose-50 text-rose-700 border-rose-200"
                            )}>
                              {entry.transaction_type.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="px-6 py-5">
                            <p className="text-sm text-muted-foreground max-w-xs truncate">{entry.notes || 'No notes available'}</p>
                            {entry.store_id && (
                              <div className="flex items-center gap-1 text-[10px] text-primary mt-1 font-semibold">
                                <Store className="h-2.5 w-2.5" /> ST-{entry.store_id}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-5 text-right font-bold text-rose-600">
                            {(Number(entry.debit) || 0) > 0 ? formatCurrency(Number(entry.debit)) : '-'}
                          </td>
                          <td className="px-6 py-5 text-right font-bold text-emerald-600">
                            {(Number(entry.credit) || 0) > 0 ? formatCurrency(Number(entry.credit)) : '-'}
                          </td>
                        </tr>
                      ))}
                      {transactions.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-24 text-center">
                            <div className="flex flex-col items-center gap-3 opacity-20">
                              <History className="h-16 w-16" />
                              <div className="space-y-1">
                                <p className="text-lg font-bold">No Records Found</p>
                                <p className="text-sm">Try adjusting your filters or search terms</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PermissionGuard>
  )
}
