'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiRequest } from '@/lib/api/client'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import { SupplierLedgerSummary, CustomerLedgerSummary, FinancialLedgerEntry } from '@/lib/types/poultry'
import {
  BookOpenCheck,
  Truck,
  UserCheck,
  Loader2,
  AlertCircle,
  ChevronRight,
  ArrowLeft,
  Phone
} from 'lucide-react'
import { cn } from '@/lib/utils'

type TabType = 'suppliers' | 'customers'

export default function LedgerPage() {
  const { permissions, loading: permLoading } = usePermissions()
  const [activeTab, setActiveTab] = useState<TabType>('suppliers')
  const [supplierLedger, setSupplierLedger] = useState<SupplierLedgerSummary[]>([])
  const [customerLedger, setCustomerLedger] = useState<CustomerLedgerSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Detail view
  const [selectedEntity, setSelectedEntity] = useState<{ id: string; name: string; type: TabType } | null>(null)
  const [ledgerDetails, setLedgerDetails] = useState<FinancialLedgerEntry[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchSupplierLedger = useCallback(async () => {
    try {
      const data = await apiRequest<SupplierLedgerSummary[]>('/api/v1/poultry/ledger/suppliers')
      setSupplierLedger(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err.message || 'Failed to load supplier ledger')
    }
  }, [])

  const fetchCustomerLedger = useCallback(async () => {
    try {
      const data = await apiRequest<CustomerLedgerSummary[]>('/api/v1/poultry/ledger/customers')
      setCustomerLedger(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err.message || 'Failed to load customer ledger')
    }
  }, [])

  const fetchLedgerDetails = async (entityId: string, entityType: TabType) => {
    setDetailLoading(true)
    try {
      const endpoint = entityType === 'suppliers'
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
    setLoading(true)
    Promise.all([fetchSupplierLedger(), fetchCustomerLedger()])
      .finally(() => setLoading(false))
  }, [fetchSupplierLedger, fetchCustomerLedger])

  const handleEntityClick = (entity: SupplierLedgerSummary | CustomerLedgerSummary, type: TabType) => {
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

  // Detail View
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
              {selectedEntity.type === 'suppliers' ? <Truck className="h-8 w-8" /> : <UserCheck className="h-8 w-8" />}
              {selectedEntity.name}
            </h1>
            <p className="text-muted-foreground mt-2">
              Transaction history
            </p>
          </div>

          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : ledgerDetails.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpenCheck className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No transactions found</p>
            </div>
          ) : (
            <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Notes</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Debit</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerDetails.map((entry) => (
                    <tr key={entry.id} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-4 text-sm">{formatDate(entry.created_at)}</td>
                      <td className="px-4 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          entry.transaction_type === 'PURCHASE' || entry.transaction_type === 'SALE'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        )}>
                          {entry.transaction_type}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{entry.notes || '—'}</td>
                      <td className="px-4 py-4 text-right font-medium text-red-600">
                        {(Number(entry.debit) || 0) > 0 ? formatCurrency(Number(entry.debit)) : '—'}
                      </td>
                      <td className="px-4 py-4 text-right font-medium text-green-600">
                        {(Number(entry.credit) || 0) > 0 ? formatCurrency(Number(entry.credit)) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </PermissionGuard>
    )
  }

  // Main Ledger View
  return (
    <PermissionGuard permission="ledger.view">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpenCheck className="h-8 w-8" />
            Ledger
          </h1>
          <p className="text-muted-foreground mt-2">
            Financial overview of suppliers and customers
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <Truck className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Payable (Suppliers)</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalSupplierOutstanding)}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Receivable (Customers)</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalCustomerOutstanding)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab('suppliers')}
            className={cn(
              "px-4 py-2 font-medium transition-colors border-b-2 -mb-px",
              activeTab === 'suppliers' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Truck className="h-4 w-4 inline mr-2" />
            Suppliers
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={cn(
              "px-4 py-2 font-medium transition-colors border-b-2 -mb-px",
              activeTab === 'customers' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <UserCheck className="h-4 w-4 inline mr-2" />
            Customers
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-6 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
            {activeTab === 'suppliers' ? (
              supplierLedger.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Truck className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No supplier data</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Supplier</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Purchases</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Payments</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Outstanding</th>
                      <th className="px-4 py-3 text-right text-sm font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierLedger.map((supplier) => (
                      <tr
                        key={supplier.entity_id}
                        className="border-b hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => handleEntityClick(supplier, 'suppliers')}
                      >
                        <td className="px-4 py-4">
                          <div className="font-medium">{supplier.entity_name}</div>
                          {supplier.phone && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" /> {supplier.phone}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">{formatCurrency(Number(supplier.total_purchases || 0))}</td>
                        <td className="px-4 py-4 text-right">{formatCurrency(Number(supplier.total_payments || 0))}</td>
                        <td className="px-4 py-4 text-right">
                          <span className={cn("font-medium", (Number(supplier.outstanding) || 0) > 0 ? "text-red-600" : "text-green-600")}>
                            {formatCurrency(Number(supplier.outstanding || 0))}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              customerLedger.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No customer data</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Customer</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Credit Limit</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Sales</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Receipts</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Outstanding</th>
                      <th className="px-4 py-3 text-right text-sm font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerLedger.map((customer) => (
                      <tr
                        key={customer.entity_id}
                        className="border-b hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => handleEntityClick(customer, 'customers')}
                      >
                        <td className="px-4 py-4">
                          <div className="font-medium">{customer.entity_name}</div>
                          {customer.phone && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" /> {customer.phone}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right text-muted-foreground">{formatCurrency(Number(customer.credit_limit || 0))}</td>
                        <td className="px-4 py-4 text-right">{formatCurrency(Number(customer.total_sales || 0))}</td>
                        <td className="px-4 py-4 text-right">{formatCurrency(Number(customer.total_receipts || 0))}</td>
                        <td className="px-4 py-4 text-right">
                          <span className={cn("font-medium", (Number(customer.outstanding) || 0) > 0 ? "text-amber-600" : "text-green-600")}>
                            {formatCurrency(Number(customer.outstanding || 0))}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        )}
      </div>
    </PermissionGuard>
  )
}
