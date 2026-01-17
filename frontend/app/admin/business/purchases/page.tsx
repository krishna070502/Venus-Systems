'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api/client'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import { useStore } from '@/lib/context/StoreContext'
import { StoreHeader } from '@/components/poultry/StoreHeader'
import {
  Purchase,
  PurchaseCreate,
  PurchaseStatus,
  BirdType,
  Supplier
} from '@/lib/types/poultry'
import {
  Plus,
  Check,
  X as XIcon,
  Loader2,
  AlertCircle,
  Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { generatePurchaseBillPDF } from '@/lib/utils/generatePDF'

export default function PurchasesPage() {
  const { currentStore } = useStore()
  const { permissions, loading: permLoading } = usePermissions()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<PurchaseStatus | ''>('')

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState<Partial<PurchaseCreate>>({
    supplier_id: '',
    bird_type: 'BROILER',
    bird_count: 0,
    total_weight: 0,
    price_per_kg: 0,
    vehicle_number: '',
    driver_name: '',
    notes: '',
  })

  const canCreate = !permLoading && hasPermission(permissions, 'purchases.create')
  const canCommit = !permLoading && hasPermission(permissions, 'purchases.commit')

  const fetchPurchases = useCallback(async () => {
    if (!currentStore) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.poultry.purchases.getAll(currentStore.id, statusFilter || undefined) as Purchase[]
      setPurchases(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err.message || 'Failed to load purchases')
    } finally {
      setLoading(false)
    }
  }, [currentStore, statusFilter])

  const fetchSuppliers = useCallback(async () => {
    try {
      const data = await api.poultry.suppliers.getAll('ACTIVE') as Supplier[]
      setSuppliers(Array.isArray(data) ? data : [])
    } catch {
      // Ignore
    }
  }, [])

  useEffect(() => {
    if (currentStore) {
      fetchPurchases()
      fetchSuppliers()
    }
  }, [currentStore, fetchPurchases, fetchSuppliers])

  const openCreateModal = () => {
    setFormData({
      supplier_id: suppliers[0]?.id || '',
      bird_type: 'BROILER',
      bird_count: 0,
      total_weight: 0,
      price_per_kg: 0,
      vehicle_number: '',
      driver_name: '',
      notes: '',
    })
    setSaveError(null)
    setShowModal(true)
  }

  const handleCreate = async () => {
    if (!currentStore) return
    if (!formData.supplier_id) {
      setSaveError('Please select a supplier')
      return
    }
    if (!formData.total_weight || formData.total_weight <= 0) {
      setSaveError('Weight must be greater than 0')
      return
    }
    if (!formData.price_per_kg || formData.price_per_kg <= 0) {
      setSaveError('Rate must be greater than 0')
      return
    }

    setSaving(true)
    setSaveError(null)
    try {
      await api.poultry.purchases.create({
        ...formData,
        store_id: currentStore.id
      } as PurchaseCreate)
      setShowModal(false)
      fetchPurchases()
    } catch (err: any) {
      setSaveError(err.message || 'Failed to create purchase')
    } finally {
      setSaving(false)
    }
  }

  const handleCommit = async (purchase: Purchase) => {
    if (!confirm(`Commit this purchase? This will add ${purchase.total_weight} kg to inventory.`)) return
    try {
      await api.poultry.purchases.commit(purchase.id)
      fetchPurchases()
    } catch (err: any) {
      alert(err.message || 'Failed to commit purchase')
    }
  }

  const handleCancel = async (purchase: Purchase) => {
    if (!confirm('Cancel this purchase order?')) return
    try {
      await api.poultry.purchases.cancel(purchase.id)
      fetchPurchases()
    } catch (err: any) {
      alert(err.message || 'Failed to cancel purchase')
    }
  }

  const statusColors: Record<PurchaseStatus, string> = {
    DRAFT: 'bg-yellow-100 text-yellow-800',
    COMMITTED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
  }

  const totalAmount = (formData.total_weight || 0) * (formData.price_per_kg || 0)

  return (
    <PermissionGuard permission="purchases.view">
      <div className="flex flex-col h-full bg-muted/20">
        <StoreHeader
          title="Purchases"
          subtitle="Manage purchase orders for live birds"
          onRefresh={fetchPurchases}
          actions={
            canCreate && (
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Purchase
              </button>
            )
          }
        />

        <div className="p-6">
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PurchaseStatus | '')}
              className="px-4 py-2 border rounded-lg bg-background"
            >
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="COMMITTED">Committed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
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
          ) : purchases.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed bg-card p-12 text-center">
              <Plus className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Purchases Yet</h3>
              <p className="text-muted-foreground mb-4">Create your first purchase order to get started.</p>
              {canCreate && (
                <button onClick={openCreateModal} className="text-primary hover:underline">
                  Create your first purchase
                </button>
              )}
            </div>
          ) : (
            <div className="bg-card rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Supplier</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Bird Type</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Birds</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Weight (kg)</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Rate</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Total</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((p) => (
                      <tr key={p.id} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-sm">{new Date(p.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-medium">{p.supplier_name || p.supplier?.name || '—'}</td>
                        <td className="px-4 py-3">{p.bird_type === 'BROILER' ? '🐔' : '🐓'} {p.bird_type}</td>
                        <td className="px-4 py-3 text-right font-mono">{p.bird_count || 0}</td>
                        <td className="px-4 py-3 text-right font-mono">{Number(p.total_weight || 0).toFixed(3)}</td>
                        <td className="px-4 py-3 text-right font-mono">₹{Number(p.price_per_kg || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold">₹{Number(p.total_amount || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn("px-2 py-1 rounded-full text-xs font-medium", statusColors[p.status])}>{p.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {p.status === 'DRAFT' && canCommit && (
                              <>
                                <button onClick={() => handleCommit(p)} className="p-1.5 hover:bg-green-100 text-green-600 rounded" title="Commit">
                                  <Check className="h-4 w-4" />
                                </button>
                                <button onClick={() => handleCancel(p)} className="p-1.5 hover:bg-red-100 text-red-600 rounded" title="Cancel">
                                  <XIcon className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => generatePurchaseBillPDF({
                                purchaseId: p.id,
                                date: new Date(p.created_at).toLocaleDateString('en-IN'),
                                supplierName: p.supplier_name || p.supplier?.name || 'Unknown Supplier',
                                birdType: p.bird_type,
                                birdCount: p.bird_count || 0,
                                totalWeight: Number(p.total_weight || 0),
                                pricePerKg: Number(p.price_per_kg || 0),
                                totalAmount: Number(p.total_amount || 0),
                                status: p.status,
                                vehicleNumber: p.vehicle_number || undefined,
                                driverName: p.driver_name || undefined,
                                notes: p.notes || undefined,
                                storeName: currentStore?.name
                              })}
                              className="p-1.5 hover:bg-blue-100 text-blue-600 rounded"
                              title="Download Bill"
                            >
                              <Download className="h-4 w-4" />
                            </button>

                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-lg border shadow-xl w-full max-w-lg">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold">New Purchase Order</h2>
                <button onClick={() => setShowModal(false)} className="p-1 hover:bg-accent rounded"><XIcon className="h-5 w-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                {saveError && <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{saveError}</div>}
                <div>
                  <label className="block text-sm font-medium mb-1">Supplier *</label>
                  <select value={formData.supplier_id} onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-background">
                    <option value="">Select supplier</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bird Type *</label>
                  <select value={formData.bird_type} onChange={(e) => setFormData({ ...formData, bird_type: e.target.value as BirdType })} className="w-full px-3 py-2 border rounded-lg bg-background">
                    <option value="BROILER">🐔 Broiler</option>
                    <option value="PARENT_CULL">🐓 Parent Cull</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">No. of Birds *</label>
                    <input type="number" value={formData.bird_count || ''} onChange={(e) => setFormData({ ...formData, bird_count: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg bg-background" min="1" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Weight (kg) *</label>
                    <input type="number" value={formData.total_weight || ''} onChange={(e) => setFormData({ ...formData, total_weight: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg bg-background" step="0.001" min="0" placeholder="0.000" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Rate/kg (₹) *</label>
                    <input type="number" value={formData.price_per_kg || ''} onChange={(e) => setFormData({ ...formData, price_per_kg: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg bg-background" step="0.01" min="0" placeholder="0.00" />
                  </div>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Amount:</span>
                  <span className="text-2xl font-bold">₹{totalAmount.toLocaleString()}</span>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-background" rows={2} placeholder="Additional notes..." />
                </div>
              </div>
              <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg hover:bg-accent transition-colors">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Purchase
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  )
}
