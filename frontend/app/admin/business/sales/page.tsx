'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api/client'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions } from '@/lib/auth/usePermissions'
import { useStore } from '@/lib/context/StoreContext'
import { StoreHeader } from '@/components/poultry/StoreHeader'
import {
  Receipt,
  Plus,
  X,
  PlusCircle,
  Package,
  User,
  Trash2,
  FileText,
  Loader2,
  AlertCircle,
  Download,
} from 'lucide-react'
import {
  Sale,
  SaleCreate,
  Customer,
  SKUWithPrice,
  PaymentMethod,
} from '@/lib/types/poultry'
import { apiRequest } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { generateSaleBillPDF } from '@/lib/utils/generatePDF'


export default function SalesPage() {
  const { currentStore } = useStore()
  const { loading: permsLoading } = usePermissions()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [customers, setCustomers] = useState<Customer[]>([])
  const [skus, setSkus] = useState<SKUWithPrice[]>([])
  const [showBulkModal, setShowBulkModal] = useState(false)

  const fetchSales = useCallback(async () => {
    if (!currentStore) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.poultry.sales.getAll(currentStore.id, { limit: 100 }) as Sale[]
      setSales(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err.message || 'Failed to load sales history')
    } finally {
      setLoading(false)
    }
  }, [currentStore])

  const fetchMetadata = useCallback(async () => {
    if (!currentStore) return
    try {
      const [customersData, skusData] = await Promise.all([
        apiRequest<Customer[]>('/api/v1/poultry/customers?status=ACTIVE'),
        apiRequest<any>('/api/v1/poultry/skus/prices/store', {
          headers: { 'X-Store-ID': currentStore.id.toString() }
        })
      ])
      setCustomers(Array.isArray(customersData) ? customersData : [])
      setSkus(Array.isArray(skusData?.items) ? skusData.items : [])
    } catch (err) {
      console.error('Failed to load metadata:', err)
    }
  }, [currentStore])

  useEffect(() => {
    if (currentStore) {
      fetchSales()
      fetchMetadata()
    }
  }, [currentStore, fetchSales, fetchMetadata])

  return (
    <PermissionGuard permission="sales.view">
      <div className="flex flex-col h-full bg-muted/20">
        <StoreHeader
          title="Sales History"
          subtitle="View and manage shop transactions"
          onRefresh={fetchSales}
          actions={
            <button
              onClick={() => setShowBulkModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all font-medium"
            >
              <PlusCircle className="h-4 w-4" />
              New Bulk Order
            </button>
          }
        />

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          ) : sales.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed bg-card p-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No sales found for this store.</p>
            </div>
          ) : (
            <div className="bg-card rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 font-medium">
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Receipt #</th>
                      <th className="px-4 py-3 text-left">Items</th>
                      <th className="px-4 py-3 text-right">Total Weight</th>
                      <th className="px-4 py-3 text-left">Customer</th>
                      <th className="px-4 py-3 text-right font-bold">Total Amount</th>
                      <th className="px-4 py-3 text-center">Payment</th>
                      <th className="px-4 py-3 text-center">Actions</th>

                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">{new Date(sale.created_at).toLocaleString()}</td>
                        <td className="px-4 py-3 font-mono text-xs">{sale.receipt_number}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            {sale.items?.map((item, idx) => (
                              <div key={idx} className="text-xs">
                                {item.sku_name || item.sku?.name || 'Item'} x {Number(item.weight).toFixed(2)}kg
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {Number(sale.items?.reduce((acc, item) => acc + (Number(item.weight) || 0), 0) || 0).toFixed(2)} kg
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">{sale.customer_name || 'Walk-in Customer'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-primary">₹{Number(sale.total_amount).toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-bold uppercase">
                            {sale.payment_method}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => generateSaleBillPDF({
                              receiptNumber: sale.receipt_number,
                              date: new Date(sale.created_at).toLocaleString('en-IN'),
                              customerName: sale.customer_name || 'Walk-in Customer',
                              customerPhone: sale.customer_phone || undefined,
                              items: (sale.items || []).map(item => ({
                                skuName: item.sku_name || item.sku?.name || 'Product',
                                weight: Number(item.weight) || 0,
                                rate: Number(item.price_snapshot) || 0,
                                total: (Number(item.weight) || 0) * (Number(item.price_snapshot) || 0)
                              })),
                              totalAmount: Number(sale.total_amount) || 0,
                              paymentMethod: sale.payment_method,
                              saleType: sale.sale_type || 'POS',
                              notes: sale.notes || undefined,
                              storeName: currentStore?.name
                            })}
                            className="p-1.5 hover:bg-blue-100 text-blue-600 rounded transition-colors"
                            title="Download Invoice"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {showBulkModal && (
          <BulkSaleModal
            onClose={() => setShowBulkModal(false)}
            onSave={() => {
              setShowBulkModal(false)
              fetchSales()
            }}
            customers={customers}
            skus={skus}
            store_id={currentStore?.id || 0}
          />
        )}
      </div>
    </PermissionGuard>
  )
}

function BulkSaleModal({
  onClose,
  onSave,
  customers,
  skus,
  store_id,
}: {
  onClose: () => void
  onSave: () => void
  customers: Customer[]
  skus: SKUWithPrice[]
  store_id: number
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<SaleCreate>>({
    store_id,
    sale_type: 'BULK',
    payment_method: 'CREDIT',
    customer_id: '',
    items: [{ sku_id: '', weight: 0, price_snapshot: 0 } as any],
    notes: '',
  })

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...(formData.items || []), { sku_id: '', weight: 0, price_snapshot: 0 } as any],
    })
  }

  const removeItem = (index: number) => {
    const newItems = [...(formData.items || [])]
    newItems.splice(index, 1)
    setFormData({ ...formData, items: newItems })
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...(formData.items || [])]
    newItems[index] = { ...newItems[index], [field]: value }

    // Auto-fill price if SKU changes
    if (field === 'sku_id') {
      const sku = skus.find(s => s.id === value)
      if (sku) {
        newItems[index].price_snapshot = sku.current_price || 0
      }
    }

    setFormData({ ...formData, items: newItems })
  }

  const handleSave = async () => {
    if (!formData.customer_id) {
      setError('Please select a customer')
      return
    }
    if (!formData.items?.every(item => item.sku_id && item.weight > 0)) {
      setError('Please fill all item details')
      return
    }

    setLoading(true)
    setError(null)
    try {
      await api.poultry.sales.create(formData as SaleCreate)
      onSave()
    } catch (err: any) {
      setError(err.message || 'Failed to record bulk sale')
    } finally {
      setLoading(false)
    }
  }

  const totalAmount = formData.items?.reduce((acc, item) => acc + (item.weight * item.price_snapshot), 0) || 0

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl border shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">New Bulk / Credit Order</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5 ml-1">Customer</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <select
                  value={formData.customer_id}
                  onChange={(e) => {
                    const cid = e.target.value
                    const customer = customers.find(c => c.id === cid)
                    setFormData({
                      ...formData,
                      customer_id: cid,
                      customer_name: customer?.name || '',
                      customer_phone: customer?.phone || ''
                    })
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                >
                  <option value="">Select registered customer...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5 ml-1">Payment Method</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as PaymentMethod })}
                className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              >
                <option value="CREDIT">Credit / On Account</option>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="BANK">Bank Transfer</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1 ml-1">
              <label className="text-xs font-bold uppercase text-muted-foreground">Order Items</label>
              <button
                type="button"
                onClick={addItem}
                className="text-xs text-primary hover:underline flex items-center gap-1 font-bold"
              >
                <Plus className="h-3 w-3" />
                Add Item
              </button>
            </div>

            <div className="space-y-3">
              {formData.items?.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-end p-3 bg-muted/20 rounded-lg border border-transparent hover:border-muted-foreground/10 transition-all">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-muted-foreground mb-1">SKU</label>
                    <select
                      value={item.sku_id}
                      onChange={(e) => updateItem(idx, 'sku_id', e.target.value)}
                      className="w-full px-3 py-1.5 bg-background border rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/10"
                    >
                      <option value="">Select SKU...</option>
                      {skus.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="block text-[10px] font-bold text-muted-foreground mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.weight}
                      onChange={(e) => updateItem(idx, 'weight', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-background border rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/10 text-right"
                    />
                  </div>
                  <div className="w-28 text-right">
                    <label className="block text-[10px] font-bold text-muted-foreground mb-1">Rate (₹)</label>
                    <input
                      type="number"
                      value={item.price_snapshot}
                      onChange={(e) => updateItem(idx, 'price_snapshot', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-background border rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/10 text-right font-medium text-primary"
                    />
                  </div>
                  <button
                    onClick={() => removeItem(idx)}
                    disabled={formData.items!.length <= 1}
                    className="p-2 mb-0.5 text-muted-foreground hover:text-destructive disabled:opacity-30 rounded-md transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5 ml-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
              rows={2}
              placeholder="Internal notes about the bulk order..."
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t bg-muted/10 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase">Estimated Total</div>
            <div className="text-xl font-black text-primary">₹{totalAmount.toLocaleString()}</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold border rounded-lg hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Sale Order
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
