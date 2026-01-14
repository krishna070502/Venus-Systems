'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api/client'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import { Supplier, SupplierCreate, SupplierStatus } from '@/lib/types/poultry'
import {
  Truck,
  Plus,
  Edit,
  Trash2,
  Phone,
  Mail,
  Loader2,
  Search,
  X,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SuppliersPage() {
  const { permissions, loading: permLoading } = usePermissions()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<SupplierStatus | ''>('')

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState<SupplierCreate>({
    name: '',
    phone: '',
    email: '',
    address: '',
    gst_number: '',
    pan_number: '',
    notes: '',
  })

  const canCreate = !permLoading && hasPermission(permissions, 'suppliers.create')
  const canEdit = !permLoading && hasPermission(permissions, 'suppliers.edit')
  const canDelete = !permLoading && hasPermission(permissions, 'suppliers.delete')

  const fetchSuppliers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.poultry.suppliers.getAll(statusFilter || undefined) as Supplier[]
      setSuppliers(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err.message || 'Failed to load suppliers')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchSuppliers()
  }, [fetchSuppliers])

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const openCreateModal = () => {
    setEditingSupplier(null)
    setFormData({
      name: '', phone: '', email: '', address: '',
      gst_number: '', pan_number: '', notes: '',
    })
    setSaveError(null)
    setShowModal(true)
  }

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setFormData({
      name: supplier.name,
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      gst_number: supplier.gst_number || '',
      pan_number: supplier.pan_number || '',
      notes: supplier.notes || '',
    })
    setSaveError(null)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setSaveError('Supplier name is required')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      if (editingSupplier) {
        await api.poultry.suppliers.update(editingSupplier.id, formData)
      } else {
        await api.poultry.suppliers.create(formData)
      }
      setShowModal(false)
      fetchSuppliers()
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save supplier')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (supplier: Supplier) => {
    if (!confirm(`Are you sure you want to delete "${supplier.name}"?`)) return
    try {
      await api.poultry.suppliers.delete(supplier.id)
      fetchSuppliers()
    } catch (err: any) {
      alert(err.message || 'Failed to delete supplier')
    }
  }

  const statusColors: Record<SupplierStatus, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    INACTIVE: 'bg-gray-100 text-gray-800',
    BLOCKED: 'bg-red-100 text-red-800',
  }

  return (
    <PermissionGuard permission="suppliers.view">
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Truck className="h-8 w-8" />
              Suppliers
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your poultry suppliers
            </p>
          </div>
          {canCreate && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Supplier
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search suppliers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as SupplierStatus | '')}
            className="px-4 py-2 border rounded-lg bg-background"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="BLOCKED">Blocked</option>
          </select>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed bg-card p-12 text-center">
            <Truck className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Suppliers Yet</h3>
            <p className="text-muted-foreground mb-4">Add your first supplier to get started.</p>
            {canCreate && (
              <button onClick={openCreateModal} className="text-primary hover:underline">
                Add your first supplier
              </button>
            )}
          </div>
        ) : (
          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Contact</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">GST</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-4">
                        <div className="font-medium">{supplier.name}</div>
                        {supplier.address && (
                          <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {supplier.address}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {supplier.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" /> {supplier.phone}
                          </div>
                        )}
                        {supplier.email && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" /> {supplier.email}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn("px-2 py-1 rounded-full text-xs font-medium", statusColors[supplier.status])}>
                          {supplier.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm">{supplier.gst_number || '—'}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {canEdit && (
                            <button onClick={() => openEditModal(supplier)} className="p-2 hover:bg-accent rounded-lg" title="Edit">
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => handleDelete(supplier)} className="p-2 hover:bg-destructive/10 text-destructive rounded-lg" title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
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
            <div className="bg-card rounded-lg border shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold">{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</h2>
                <button onClick={() => setShowModal(false)} className="p-1 hover:bg-accent rounded"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                {saveError && <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{saveError}</div>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Name <span className="text-destructive">*</span></label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-background" placeholder="Supplier name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-background" placeholder="+91 98765 43210" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-background" placeholder="supplier@example.com" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Address</label>
                    <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-background" rows={2} placeholder="Full address" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">GST Number</label>
                    <input type="text" value={formData.gst_number} onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-background" placeholder="22AAAAA0000A1Z5" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">PAN Number</label>
                    <input type="text" value={formData.pan_number} onChange={(e) => setFormData({ ...formData, pan_number: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-background" placeholder="AAAAA0000A" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Notes</label>
                    <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-background" rows={2} placeholder="Additional notes..." />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg hover:bg-accent transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingSupplier ? 'Update Supplier' : 'Create Supplier'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  )
}
