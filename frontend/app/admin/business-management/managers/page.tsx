'use client'

import { useState, useEffect } from 'react'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import { api } from '@/lib/api/client'
import { 
  UserCog, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Store, 
  Phone,
  GraduationCap,
  Mail,
  Loader2,
  AlertCircle,
  Trash2,
  X
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Types
interface Manager {
  user_id: string
  email: string
  full_name: string | null
  qualifications: string | null
  contact_number: string | null
  shop_id: number | null
  shop_name: string | null
  shop_location: string | null
  created_at: string | null
}

interface UnassignedManager {
  user_id: string
  email: string
  full_name: string | null
}

interface Shop {
  id: number
  name: string
  location: string | null
  is_active: boolean
}

export default function ManagersPage() {
  const { permissions, loading: permissionsLoading } = usePermissions()
  
  // State
  const [managers, setManagers] = useState<Manager[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Modal state
  const [showOnboardModal, setShowOnboardModal] = useState(false)
  const [unassignedManagers, setUnassignedManagers] = useState<UnassignedManager[]>([])
  const [shops, setShops] = useState<Shop[]>([])
  const [loadingUnassigned, setLoadingUnassigned] = useState(false)
  const [onboardingError, setOnboardingError] = useState<string | null>(null)
  const [isOnboarding, setIsOnboarding] = useState(false)
  
  // Form state
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [selectedShopId, setSelectedShopId] = useState<string>('')
  const [qualifications, setQualifications] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  
  // Check individual permissions
  const canRead = hasPermission(permissions, 'managers.read')
  const canOnboard = hasPermission(permissions, 'managers.onboard')
  const canDelete = hasPermission(permissions, 'managers.delete')

  // Fetch managers
  const fetchManagers = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.businessManagement.managers.getAll() as Manager[]
      setManagers(data)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch managers')
    } finally {
      setLoading(false)
    }
  }

  // Fetch data for onboard modal
  const fetchOnboardData = async () => {
    setLoadingUnassigned(true)
    setOnboardingError(null)
    try {
      const [unassigned, shopList] = await Promise.all([
        api.businessManagement.managers.getUnassigned() as Promise<UnassignedManager[]>,
        api.businessManagement.shops.getAll(true) as Promise<Shop[]>
      ])
      setUnassignedManagers(unassigned)
      setShops(shopList)
    } catch (err: any) {
      setOnboardingError(err.message || 'Failed to fetch data')
    } finally {
      setLoadingUnassigned(false)
    }
  }

  // Handle onboard submit
  const handleOnboard = async () => {
    if (!selectedUserId || !selectedShopId) {
      setOnboardingError('Please select both a manager and a shop')
      return
    }

    setIsOnboarding(true)
    setOnboardingError(null)

    try {
      await api.businessManagement.managers.onboard({
        user_id: selectedUserId,
        shop_id: parseInt(selectedShopId),
        qualifications: qualifications || undefined,
        contact_number: contactNumber || undefined
      })

      // Reset form and close modal
      setSelectedUserId('')
      setSelectedShopId('')
      setQualifications('')
      setContactNumber('')
      setShowOnboardModal(false)
      
      // Refresh managers list
      await fetchManagers()
    } catch (err: any) {
      setOnboardingError(err.message || 'Failed to onboard manager')
    } finally {
      setIsOnboarding(false)
    }
  }

  // Handle remove manager
  const handleRemoveManager = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} as a manager?`)) {
      return
    }

    try {
      await api.businessManagement.managers.remove(userId)
      await fetchManagers()
    } catch (err: any) {
      setError(err.message || 'Failed to remove manager')
    }
  }

  // Open modal and fetch data
  const openOnboardModal = () => {
    setShowOnboardModal(true)
    fetchOnboardData()
  }

  useEffect(() => {
    if (canRead) {
      fetchManagers()
    }
  }, [canRead])

  return (
    <PermissionGuard permission="managers.view">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <UserCog className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Managers</h1>
              <p className="text-muted-foreground">Manage store managers and their shop assignments</p>
            </div>
          </div>
          {canOnboard && (
            <Button onClick={openOnboardModal}>
              <Plus className="mr-2 h-4 w-4" />
              Onboard Manager
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
              {canOnboard ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className={`text-sm ${canOnboard ? 'text-green-700' : 'text-red-700'}`}>
                Onboard
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
            <span className="ml-2 text-muted-foreground">Loading managers...</span>
          </div>
        )}

        {/* Managers table */}
        {!loading && managers.length > 0 && (
          <div className="bg-card rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Manager</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Assigned Shop</TableHead>
                  <TableHead>Qualifications</TableHead>
                  {canDelete && <TableHead className="w-[80px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {managers.map((manager) => (
                  <TableRow key={manager.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserCog className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{manager.full_name || 'N/A'}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {manager.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {manager.contact_number ? (
                        <span className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" />
                          {manager.contact_number}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {manager.shop_name ? (
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-primary" />
                          <div>
                            <p className="font-medium">{manager.shop_name}</p>
                            {manager.shop_location && (
                              <p className="text-xs text-muted-foreground">{manager.shop_location}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {manager.qualifications ? (
                        <span className="flex items-center gap-1 text-sm">
                          <GraduationCap className="h-3 w-3" />
                          {manager.qualifications}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    {canDelete && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveManager(manager.user_id, manager.email)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Empty state */}
        {!loading && managers.length === 0 && (
          <div className="bg-card rounded-lg border p-12 text-center">
            <UserCog className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Managers Onboarded</h3>
            <p className="text-muted-foreground mb-4">
              Get started by onboarding your first store manager.
            </p>
            {canOnboard && (
              <Button onClick={openOnboardModal}>
                <Plus className="mr-2 h-4 w-4" />
                Onboard Manager
              </Button>
            )}
          </div>
        )}

        {/* Onboard Modal */}
        {showOnboardModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background rounded-lg shadow-lg w-full max-w-md mx-4">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-semibold">Onboard New Manager</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowOnboardModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Modal Body */}
              <div className="p-4 space-y-4">
                {loadingUnassigned ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Loading...</span>
                  </div>
                ) : (
                  <>
                    {onboardingError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <p className="text-sm text-red-800">{onboardingError}</p>
                      </div>
                    )}

                    {unassignedManagers.length === 0 ? (
                      <div className="text-center py-6">
                        <UserCog className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">
                          No unassigned managers available.
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Assign the "Store Manager" role to users first.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Select Manager */}
                        <div className="space-y-2">
                          <Label htmlFor="manager">Select Manager *</Label>
                          <Select
                            value={selectedUserId}
                            onValueChange={setSelectedUserId}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a manager to onboard" />
                            </SelectTrigger>
                            <SelectContent>
                              {unassignedManagers.map((m) => (
                                <SelectItem key={m.user_id} value={m.user_id}>
                                  {m.full_name || m.email} ({m.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Select Shop */}
                        <div className="space-y-2">
                          <Label htmlFor="shop">Assign to Shop *</Label>
                          <Select
                            value={selectedShopId}
                            onValueChange={setSelectedShopId}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a shop" />
                            </SelectTrigger>
                            <SelectContent>
                              {shops.map((shop) => (
                                <SelectItem key={shop.id} value={shop.id.toString()}>
                                  {shop.name} {shop.location && `- ${shop.location}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Qualifications */}
                        <div className="space-y-2">
                          <Label htmlFor="qualifications">Qualifications</Label>
                          <Input
                            id="qualifications"
                            placeholder="e.g., MBA, Food Safety Certified"
                            value={qualifications}
                            onChange={(e) => setQualifications(e.target.value)}
                          />
                        </div>

                        {/* Contact Number */}
                        <div className="space-y-2">
                          <Label htmlFor="contact">Contact Number</Label>
                          <Input
                            id="contact"
                            type="tel"
                            placeholder="e.g., +1 234 567 8900"
                            value={contactNumber}
                            onChange={(e) => setContactNumber(e.target.value)}
                          />
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowOnboardModal(false)}
                  disabled={isOnboarding}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleOnboard}
                  disabled={isOnboarding || !selectedUserId || !selectedShopId || unassignedManagers.length === 0}
                >
                  {isOnboarding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Onboarding...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Onboard Manager
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
