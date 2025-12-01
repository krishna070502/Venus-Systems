'use client'

import { useState, useEffect } from 'react'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import { api } from '@/lib/api/client'
import { 
  Store, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  AlertCircle,
  Trash2,
  Pencil,
  X,
  MapPin,
  ToggleLeft,
  ToggleRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

// Types
interface Shop {
  id: number
  name: string
  location: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function ShopsPage() {
  const { permissions, loading: permissionsLoading } = usePermissions()
  
  // State
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingShop, setEditingShop] = useState<Shop | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  
  // Form state
  const [formName, setFormName] = useState('')
  const [formLocation, setFormLocation] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)
  
  // Permissions
  const canRead = hasPermission(permissions, 'shops.read')
  const canWrite = hasPermission(permissions, 'shops.write')
  const canUpdate = hasPermission(permissions, 'shops.update')
  const canDelete = hasPermission(permissions, 'shops.delete')

  // Fetch shops
  const fetchShops = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.businessManagement.shops.getAll() as Shop[]
      setShops(data)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch shops')
    } finally {
      setLoading(false)
    }
  }

  // Open modal for create
  const openCreateModal = () => {
    setEditingShop(null)
    setFormName('')
    setFormLocation('')
    setFormIsActive(true)
    setModalError(null)
    setShowModal(true)
  }

  // Open modal for edit
  const openEditModal = (shop: Shop) => {
    setEditingShop(shop)
    setFormName(shop.name)
    setFormLocation(shop.location || '')
    setFormIsActive(shop.is_active)
    setModalError(null)
    setShowModal(true)
  }

  // Close modal
  const closeModal = () => {
    setShowModal(false)
    setEditingShop(null)
    setModalError(null)
  }

  // Handle submit
  const handleSubmit = async () => {
    if (!formName.trim()) {
      setModalError('Shop name is required')
      return
    }

    setIsSubmitting(true)
    setModalError(null)

    try {
      if (editingShop) {
        // Update
        await api.businessManagement.shops.update(editingShop.id, {
          name: formName.trim(),
          location: formLocation.trim() || undefined,
          is_active: formIsActive
        })
        setSuccess('Shop updated successfully')
      } else {
        // Create
        await api.businessManagement.shops.create({
          name: formName.trim(),
          location: formLocation.trim() || undefined,
          is_active: formIsActive
        })
        setSuccess('Shop created successfully')
      }
      
      closeModal()
      await fetchShops()
    } catch (err: any) {
      setModalError(err.message || 'Failed to save shop')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle delete
  const handleDelete = async (shop: Shop) => {
    if (!confirm(`Are you sure you want to delete "${shop.name}"?`)) {
      return
    }

    try {
      setError(null)
      await api.businessManagement.shops.delete(shop.id)
      setSuccess('Shop deleted successfully')
      await fetchShops()
    } catch (err: any) {
      setError(err.message || 'Failed to delete shop')
    }
  }

  // Toggle active status
  const handleToggleActive = async (shop: Shop) => {
    try {
      await api.businessManagement.shops.update(shop.id, {
        is_active: !shop.is_active
      })
      await fetchShops()
    } catch (err: any) {
      setError(err.message || 'Failed to update shop status')
    }
  }

  // Initial fetch
  useEffect(() => {
    if (canRead) {
      fetchShops()
    }
  }, [canRead])

  // Clear success message after 3s
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  return (
    <PermissionGuard permission="shops.view">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Store className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Shops</h1>
              <p className="text-muted-foreground">Manage your store locations</p>
            </div>
          </div>
          {canWrite && (
            <Button onClick={openCreateModal}>
              <Plus className="mr-2 h-4 w-4" />
              Add Shop
            </Button>
          )}
        </div>

        {/* Permission badges */}
        <div className="bg-card rounded-lg p-4 mb-6 border">
          <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Your Permissions:</h3>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              {canRead ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className={`text-sm ${canRead ? 'text-green-700' : 'text-red-700'}`}>
                Read
              </span>
            </div>
            <div className="flex items-center gap-2">
              {canWrite ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className={`text-sm ${canWrite ? 'text-green-700' : 'text-red-700'}`}>
                Write
              </span>
            </div>
            <div className="flex items-center gap-2">
              {canUpdate ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className={`text-sm ${canUpdate ? 'text-green-700' : 'text-red-700'}`}>
                Update
              </span>
            </div>
            <div className="flex items-center gap-2">
              {canDelete ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className={`text-sm ${canDelete ? 'text-green-700' : 'text-red-700'}`}>
                Delete
              </span>
            </div>
          </div>
        </div>

        {/* Success message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading shops...</span>
          </div>
        )}

        {/* Shops table */}
        {!loading && shops.length > 0 && (
          <div className="bg-card rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shop Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  {(canUpdate || canDelete) && <TableHead className="w-[120px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {shops.map((shop) => (
                  <TableRow key={shop.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Store className="h-5 w-5 text-primary" />
                        </div>
                        <div className="font-medium">{shop.name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {shop.location ? (
                        <span className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3" />
                          {shop.location}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={shop.is_active ? "default" : "secondary"}
                        className={shop.is_active 
                          ? "bg-green-100 text-green-800 hover:bg-green-200" 
                          : "bg-gray-100 text-gray-600"}
                      >
                        {shop.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(shop.created_at).toLocaleDateString()}
                      </span>
                    </TableCell>
                    {(canUpdate || canDelete) && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {canUpdate && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleActive(shop)}
                                title={shop.is_active ? 'Deactivate' : 'Activate'}
                              >
                                {shop.is_active ? (
                                  <ToggleRight className="h-4 w-4 text-green-600" />
                                ) : (
                                  <ToggleLeft className="h-4 w-4 text-gray-400" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(shop)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(shop)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Empty state */}
        {!loading && shops.length === 0 && (
          <div className="bg-card rounded-lg border p-12 text-center">
            <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Shops Found</h3>
            <p className="text-muted-foreground mb-4">
              Get started by adding your first shop location.
            </p>
            {canWrite && (
              <Button onClick={openCreateModal}>
                <Plus className="mr-2 h-4 w-4" />
                Add Shop
              </Button>
            )}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background rounded-lg shadow-lg w-full max-w-md mx-4">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-semibold">
                  {editingShop ? 'Edit Shop' : 'Add New Shop'}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeModal}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Modal Body */}
              <div className="p-4 space-y-4">
                {modalError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <p className="text-sm text-red-800">{modalError}</p>
                  </div>
                )}

                {/* Shop Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Shop Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Venus Chicken - Downtown"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="e.g., 123 Main Street, City"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                  />
                </div>

                {/* Active Status */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Status</Label>
                    <p className="text-sm text-muted-foreground">
                      Inactive shops won't appear in selections
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setFormIsActive(!formIsActive)}
                    className="gap-2"
                  >
                    {formIsActive ? (
                      <>
                        <ToggleRight className="h-5 w-5 text-green-600" />
                        <span className="text-green-600">Active</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="h-5 w-5 text-gray-400" />
                        <span className="text-gray-600">Inactive</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t">
                <Button
                  variant="outline"
                  onClick={closeModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formName.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      {editingShop ? 'Update Shop' : 'Create Shop'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  )
}
