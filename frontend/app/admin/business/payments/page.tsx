'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiRequest } from '@/lib/api/client'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import { SupplierPayment, SupplierPaymentCreate, Supplier, ReceiptPaymentMethod } from '@/lib/types/poultry'
import {
  CreditCard,
  Plus,
  Search,
  X,
  Loader2,
  AlertCircle,
  Calendar,
  Truck
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function PaymentsPage() {
  const { permissions, loading: permLoading } = usePermissions()
  const [payments, setPayments] = useState<SupplierPayment[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState<SupplierPaymentCreate>({
    supplier_id: '',
    amount: 0,
    payment_method: 'CASH',
    reference_number: '',
    notes: '',
  })

  const canCreate = !permLoading && hasPermission(permissions, 'payment.write')

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiRequest<SupplierPayment[]>('/api/v1/poultry/payments')
      setPayments(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err.message || 'Failed to load payments')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSuppliers = useCallback(async () => {
    try {
      const data = await apiRequest<Supplier[]>('/api/v1/poultry/suppliers?status=ACTIVE')
      setSuppliers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load suppliers:', err)
    }
  }, [])

  useEffect(() => {
    fetchPayments()
    fetchSuppliers()
  }, [fetchPayments, fetchSuppliers])

  const filteredPayments = payments.filter(p =>
    p.payment_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const openCreateModal = () => {
    setFormData({
      supplier_id: '',
      amount: 0,
      payment_method: 'CASH',
      reference_number: '',
      notes: '',
    })
    setSaveError(null)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.supplier_id) {
      setSaveError('Please select a supplier')
      return
    }
    if (formData.amount <= 0) {
      setSaveError('Amount must be greater than 0')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      await apiRequest('/api/v1/poultry/payments', {
        method: 'POST',
        body: JSON.stringify(formData)
      })
      setShowModal(false)
      fetchPayments()
    } catch (err: any) {
      setSaveError(err.message || 'Failed to create payment')
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    })
  }

  const paymentMethodColors: Record<ReceiptPaymentMethod, string> = {
    CASH: 'bg-green-100 text-green-800',
    BANK: 'bg-blue-100 text-blue-800',
    UPI: 'bg-purple-100 text-purple-800',
    CHEQUE: 'bg-amber-100 text-amber-800',
    OTHER: 'bg-gray-100 text-gray-800',
  }

  return (
    <PermissionGuard permission="payment.view">
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <CreditCard className="h-8 w-8" />
              Supplier Payments
            </h1>
            <p className="text-muted-foreground mt-2">
              Track payments made to suppliers
            </p>
          </div>
          {canCreate && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Make Payment
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search payments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
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
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No payments found</p>
          </div>
        ) : (
          <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Payment #</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Supplier</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Method</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-4 font-mono text-sm">{payment.payment_number}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-muted-foreground" />
                          {payment.supplier_name || 'Unknown'}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(payment.payment_date)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn("px-2 py-1 rounded-full text-xs font-medium", paymentMethodColors[payment.payment_method])}>
                          {payment.payment_method}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right font-medium text-red-600">
                        {formatCurrency(payment.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-lg border shadow-xl w-full max-w-lg">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold">Make Payment to Supplier</h2>
                <button onClick={() => setShowModal(false)} className="p-1 hover:bg-accent rounded"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                {saveError && <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{saveError}</div>}

                <div>
                  <label className="block text-sm font-medium mb-1">Supplier <span className="text-destructive">*</span></label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-background"
                  >
                    <option value="">Select supplier...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Amount <span className="text-destructive">*</span></label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg bg-background"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Payment Method</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as ReceiptPaymentMethod })}
                    className="w-full px-3 py-2 border rounded-lg bg-background"
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Reference Number</label>
                  <input
                    type="text"
                    value={formData.reference_number}
                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-background"
                    placeholder="Transaction/Cheque reference"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-background"
                    rows={2}
                    placeholder="Optional notes..."
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg hover:bg-accent transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Record Payment
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  )
}
