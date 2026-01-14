'use client'

import { useState, useEffect } from 'react'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import { api } from '@/lib/api/client'
import { 
  Package, Plus, Edit, Trash2, Search, Filter, X, 
  Check, AlertCircle, Loader2, Tag, IndianRupee, Archive 
} from 'lucide-react'

// Types
interface InventoryItem {
  id: number
  name: string
  sku: string | null
  category: string | null
  base_price: number | string
  unit: string
  item_type: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface ItemFormData {
  name: string
  sku: string
  category: string
  base_price: string
  unit: string
  item_type: string
  is_active: boolean
}

const DEFAULT_FORM: ItemFormData = {
  name: '',
  sku: '',
  category: '',
  base_price: '',
  unit: 'piece',
  item_type: 'sale',
  is_active: true,
}

const CATEGORIES = [
  'Poultry',
  'Processed',
  'Marinated',
  'Ready-to-Cook',
  'Offal',
  'Broth',
  'Other',
]

const UNITS = ['piece', 'kg', 'pack', 'litre', 'gram', 'dozen']

export default function ItemsPage() {
  const { permissions, loading: permissionsLoading } = usePermissions()

  const canRead = !permissionsLoading && hasPermission(permissions, 'inventoryitems.read')
  const canWrite = !permissionsLoading && hasPermission(permissions, 'inventoryitems.write')
  const canUpdate = !permissionsLoading && hasPermission(permissions, 'inventoryitems.update')
  const canDelete = !permissionsLoading && hasPermission(permissions, 'inventoryitems.delete')

  // State
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  
  // Form state
  const [formData, setFormData] = useState<ItemFormData>(DEFAULT_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Fetch items
  const fetchItems = async () => {
    if (!canRead) return
    
    try {
      setLoading(true)
      setError(null)
      
      const isActive = activeFilter === 'all' ? undefined : activeFilter === 'active'
      const category = categoryFilter || undefined
      
      const data = await api.businessManagement.inventory.getAll(isActive, category, 'sale') as InventoryItem[]
      setItems(data)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch items')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canRead) {
      fetchItems()
    }
  }, [canRead, categoryFilter, activeFilter])

  // Filter items by search
  const filteredItems = items.filter(item => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      item.name.toLowerCase().includes(query) ||
      (item.sku && item.sku.toLowerCase().includes(query)) ||
      (item.category && item.category.toLowerCase().includes(query))
    )
  })

  // Handle create
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    
    if (!formData.name.trim()) {
      setFormError('Item name is required')
      return
    }
    
    if (!formData.base_price || parseFloat(formData.base_price) < 0) {
      setFormError('Valid base price is required')
      return
    }
    
    try {
      setSubmitting(true)
      await api.businessManagement.inventory.create({
        name: formData.name.trim(),
        sku: formData.sku.trim() || undefined,
        category: formData.category || undefined,
        base_price: parseFloat(formData.base_price),
        unit: formData.unit,
        item_type: 'sale',
        is_active: formData.is_active,
      })
      
      setShowCreateModal(false)
      setFormData(DEFAULT_FORM)
      fetchItems()
    } catch (err: any) {
      setFormError(err.message || 'Failed to create item')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle update
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem) return
    setFormError(null)
    
    if (!formData.name.trim()) {
      setFormError('Item name is required')
      return
    }
    
    if (!formData.base_price || parseFloat(formData.base_price) < 0) {
      setFormError('Valid base price is required')
      return
    }
    
    try {
      setSubmitting(true)
      await api.businessManagement.inventory.update(selectedItem.id, {
        name: formData.name.trim(),
        sku: formData.sku.trim() || undefined,
        category: formData.category || undefined,
        base_price: parseFloat(formData.base_price),
        unit: formData.unit,
        item_type: 'sale',
        is_active: formData.is_active,
      })
      
      setShowEditModal(false)
      setSelectedItem(null)
      setFormData(DEFAULT_FORM)
      fetchItems()
    } catch (err: any) {
      setFormError(err.message || 'Failed to update item')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (!selectedItem) return
    
    try {
      setSubmitting(true)
      await api.businessManagement.inventory.delete(selectedItem.id)
      setShowDeleteConfirm(false)
      setSelectedItem(null)
      fetchItems()
    } catch (err: any) {
      setFormError(err.message || 'Failed to delete item')
    } finally {
      setSubmitting(false)
    }
  }

  // Open edit modal
  const openEditModal = (item: InventoryItem) => {
    setSelectedItem(item)
    setFormData({
      name: item.name,
      sku: item.sku || '',
      category: item.category || '',
      base_price: String(parseFloat(String(item.base_price))),
      unit: item.unit,
      item_type: 'sale',
      is_active: item.is_active,
    })
    setFormError(null)
    setShowEditModal(true)
  }

  // Open delete confirmation
  const openDeleteConfirm = (item: InventoryItem) => {
    setSelectedItem(item)
    setFormError(null)
    setShowDeleteConfirm(true)
  }

  // Format price
  const formatPrice = (price: number | string) => {
    return `₹${parseFloat(String(price)).toFixed(2)}`
  }

  return (
    <PermissionGuard permission="inventoryitems.view">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Package className="h-8 w-8" />
                Inventory Items
              </h1>
              <p className="text-muted-foreground mt-2">
                Manage your inventory items, SKUs, and base prices
              </p>
            </div>
            {canWrite && (
              <button
                onClick={() => {
                  setFormData(DEFAULT_FORM)
                  setFormError(null)
                  setShowCreateModal(true)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, SKU, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-md bg-background"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border rounded-md bg-background min-w-[150px]"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Active Filter */}
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="px-4 py-2 border rounded-md bg-background min-w-[130px]"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-md flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Items Table */}
        {!loading && filteredItems.length > 0 && (
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Item Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">SKU</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Base Price</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Unit</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium">{item.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      {item.sku ? (
                        <code className="px-2 py-1 bg-muted rounded text-sm">{item.sku}</code>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.category ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded text-sm">
                          <Tag className="h-3 w-3" />
                          {item.category}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatPrice(item.base_price)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-muted-foreground">{item.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded text-sm">
                          <Check className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded text-sm">
                          <Archive className="h-3 w-3" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {canUpdate && (
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-2 hover:bg-muted rounded-md transition-colors"
                            title="Edit item"
                          >
                            <Edit className="h-4 w-4 text-blue-600" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => openDeleteConfirm(item)}
                            className="p-2 hover:bg-destructive/10 rounded-md transition-colors"
                            title="Delete item"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredItems.length === 0 && (
          <div className="rounded-lg border-2 border-dashed bg-card p-12 text-center">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {items.length === 0 ? 'No items found' : 'No matching items'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {items.length === 0 
                ? 'Get started by adding your first inventory item.'
                : 'Try adjusting your search or filters.'}
            </p>
            {canWrite && items.length === 0 && (
              <button
                onClick={() => {
                  setFormData(DEFAULT_FORM)
                  setFormError(null)
                  setShowCreateModal(true)
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Add First Item
              </button>
            )}
          </div>
        )}

        {/* Stats */}
        {!loading && items.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">Total Items</div>
              <div className="text-2xl font-bold">{items.length}</div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">Active Items</div>
              <div className="text-2xl font-bold text-green-600">
                {items.filter(i => i.is_active).length}
              </div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">Inactive Items</div>
              <div className="text-2xl font-bold text-gray-500">
                {items.filter(i => !i.is_active).length}
              </div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">Categories</div>
              <div className="text-2xl font-bold">
                {new Set(items.map(i => i.category).filter(Boolean)).size}
              </div>
            </div>
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background rounded-lg shadow-xl w-full max-w-lg mx-4">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add New Item
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-muted rounded-md"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-4 space-y-4">
                {formError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Item Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    placeholder="e.g., Chicken Breast"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">SKU</label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                      placeholder="e.g., CB-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    >
                      <option value="">Select category</option>
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Base Price (₹) <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.base_price}
                        onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 border rounded-md bg-background"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Unit</label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    >
                      {UNITS.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active_create"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="is_active_create" className="text-sm">
                    Item is active and available
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border rounded-md hover:bg-muted"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background rounded-lg shadow-xl w-full max-w-lg mx-4">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  Edit Item
                </h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-muted rounded-md"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleUpdate} className="p-4 space-y-4">
                {formError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Item Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    placeholder="e.g., Chicken Breast"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">SKU</label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                      placeholder="e.g., CB-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    >
                      <option value="">Select category</option>
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Base Price (₹) <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.base_price}
                        onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 border rounded-md bg-background"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Unit</label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    >
                      {UNITS.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active_edit"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="is_active_edit" className="text-sm">
                    Item is active and available
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border rounded-md hover:bg-muted"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && selectedItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-destructive/10 rounded-full">
                    <Trash2 className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Delete Item</h2>
                    <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
                  </div>
                </div>

                {formError && (
                  <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
                    {formError}
                  </div>
                )}

                <p className="mb-6">
                  Are you sure you want to delete <strong>{selectedItem.name}</strong>
                  {selectedItem.sku && <span> (SKU: {selectedItem.sku})</span>}?
                </p>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setSelectedItem(null)
                      setFormError(null)
                    }}
                    className="px-4 py-2 border rounded-md hover:bg-muted"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={submitting}
                    className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 flex items-center gap-2"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  )
}
