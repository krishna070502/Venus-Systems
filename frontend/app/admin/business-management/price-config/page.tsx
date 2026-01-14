'use client'

import { useState, useEffect, useMemo } from 'react'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import { api } from '@/lib/api/client'
import {
  Tags,
  Save,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Calendar,
  Store,
  RefreshCw,
  IndianRupee,
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

interface Shop {
  id: number
  name: string
  location: string | null
  is_active: boolean
}

interface SKUWithPrice {
  id: string
  name: string
  code: string
  bird_type: string
  inventory_type: string
  unit: string
  is_active: boolean
  current_price: number | null
  effective_date: string | null
}

interface StorePriceListResponse {
  store_id: number
  store_name: string
  date: string
  items: SKUWithPrice[]
}

export default function PriceConfigPage() {
  const { permissions, loading: permissionsLoading } = usePermissions()

  // State
  const [shops, setShops] = useState<Shop[]>([])
  const [selectedShopId, setSelectedShopId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [priceData, setPriceData] = useState<StorePriceListResponse | null>(null)
  const [editedPrices, setEditedPrices] = useState<Record<string, string>>({})

  // Loading states
  const [loadingShops, setLoadingShops] = useState(true)
  const [loadingPrices, setLoadingPrices] = useState(false)
  const [saving, setSaving] = useState(false)

  // Error/Success states
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Permissions
  const canRead = hasPermission(permissions, 'storeprices.view')
  const canWrite = hasPermission(permissions, 'storeprices.edit')

  // Fetch shops
  const fetchShops = async () => {
    try {
      setLoadingShops(true)
      const data = await api.businessManagement.shops.getAll(true) as Shop[]
      setShops(data)
      if (data.length > 0 && !selectedShopId) {
        setSelectedShopId(data[0].id.toString())
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch shops')
    } finally {
      setLoadingShops(false)
    }
  }

  // Fetch SKU prices for store
  const fetchPrices = async () => {
    if (!selectedShopId) return

    try {
      setLoadingPrices(true)
      setError(null)

      // Use the API client which handles auth properly
      const data = await api.poultry.skus.getPrices(parseInt(selectedShopId)) as StorePriceListResponse
      setPriceData(data)

      // Initialize edited prices with current prices
      const initialPrices: Record<string, string> = {}
      data.items.forEach(item => {
        if (item.current_price !== null) {
          initialPrices[item.id] = item.current_price.toString()
        }
      })
      setEditedPrices(initialPrices)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch prices')
      setPriceData(null)
    } finally {
      setLoadingPrices(false)
    }
  }

  // Handle price change
  const handlePriceChange = (skuId: string, value: string) => {
    setEditedPrices(prev => ({
      ...prev,
      [skuId]: value
    }))
    setSuccess(null)
  }

  // Check if there are changes
  const hasChanges = useMemo(() => {
    if (!priceData) return false

    return priceData.items.some(item => {
      const editedPrice = editedPrices[item.id]
      const currentPrice = item.current_price?.toString() || ''

      if (editedPrice && editedPrice !== currentPrice) {
        return true
      }
      return false
    })
  }, [priceData, editedPrices])

  // Save changes
  const handleSave = async () => {
    if (!priceData || !selectedShopId) return

    // Collect items with prices
    const changedItems: Array<{ sku_id: string; price: number }> = []

    priceData.items.forEach(item => {
      const editedPrice = editedPrices[item.id]
      if (editedPrice) {
        const price = parseFloat(editedPrice)
        if (!isNaN(price) && price >= 0) {
          changedItems.push({
            sku_id: item.id,
            price: price
          })
        }
      }
    })

    if (changedItems.length === 0) {
      setError('No valid price changes to save')
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      // Use API client for proper auth
      await api.poultry.skus.bulkPrices({
        store_id: parseInt(selectedShopId),
        effective_date: selectedDate,
        prices: changedItems
      })

      setSuccess(`Successfully updated ${changedItems.length} price(s)`)

      // Refresh prices
      await fetchPrices()
    } catch (err: any) {
      setError(err.message || 'Failed to save prices')
    } finally {
      setSaving(false)
    }
  }

  // Reset to current prices
  const handleReset = () => {
    if (!priceData) return
    const initialPrices: Record<string, string> = {}
    priceData.items.forEach(item => {
      if (item.current_price !== null) {
        initialPrices[item.id] = item.current_price.toString()
      }
    })
    setEditedPrices(initialPrices)
    setSuccess(null)
  }

  // Fetch shops on mount
  useEffect(() => {
    if (canRead) {
      fetchShops()
    }
  }, [canRead])

  // Fetch prices when store or date changes
  useEffect(() => {
    if (selectedShopId && selectedDate) {
      fetchPrices()
    }
  }, [selectedShopId, selectedDate])

  // Get display price for an item
  const getDisplayPrice = (item: SKUWithPrice): string => {
    const editedPrice = editedPrices[item.id]
    if (editedPrice !== undefined) {
      return editedPrice
    }
    return item.current_price?.toString() || ''
  }

  const inventoryTypeColors: Record<string, string> = {
    'LIVE': 'bg-blue-100 text-blue-800',
    'SKIN': 'bg-orange-100 text-orange-800',
    'SKINLESS': 'bg-green-100 text-green-800'
  }

  return (
    <PermissionGuard permission="storeprices.view">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Tags className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">SKU Price Configuration</h1>
              <p className="text-muted-foreground">Configure product prices per store</p>
            </div>
          </div>
          {canWrite && hasChanges && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset} disabled={saving}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg p-4 mb-6 border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Shop Selector */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                Select Shop
              </Label>
              {loadingShops ? (
                <div className="flex items-center gap-2 h-10">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading shops...</span>
                </div>
              ) : (
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
              )}
            </div>

            {/* Date Picker */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Effective Date
              </Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
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
        {loadingPrices && (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading prices...</span>
          </div>
        )}

        {/* Prices table */}
        {!loadingPrices && priceData && priceData.items.length > 0 && (
          <div className="bg-card rounded-lg border">
            <div className="p-4 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <IndianRupee className="h-5 w-5" />
                Prices for {priceData.store_name} - {new Date(priceData.date).toLocaleDateString()}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {priceData.items.length} SKUs available. {!canWrite && '(Read-only mode)'}
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Bird Type</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right w-[180px]">Price (₹/{priceData.items[0]?.unit || 'kg'})</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priceData.items.map((item) => {
                  const displayPrice = getDisplayPrice(item)

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.name}</div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{item.code}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{item.bird_type === 'BROILER' ? '🐔 Broiler' : '🐓 Parent Cull'}</span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${inventoryTypeColors[item.inventory_type] || 'bg-gray-100'}`}>
                          {item.inventory_type}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {canWrite ? (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Set price"
                            value={displayPrice}
                            onChange={(e) => handlePriceChange(item.id, e.target.value)}
                            className="w-[140px] ml-auto text-right font-mono"
                          />
                        ) : (
                          <span className="font-mono font-semibold">
                            {item.current_price !== null ? `₹${item.current_price.toFixed(2)}` : '-'}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Empty state - no shop selected */}
        {!loadingPrices && !selectedShopId && shops.length > 0 && (
          <div className="bg-card rounded-lg border p-12 text-center">
            <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select a Shop</h3>
            <p className="text-muted-foreground">
              Choose a shop from the dropdown above to view and configure prices.
            </p>
          </div>
        )}

        {/* Empty state - no shops */}
        {!loadingShops && shops.length === 0 && (
          <div className="bg-card rounded-lg border p-12 text-center">
            <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Shops Available</h3>
            <p className="text-muted-foreground">
              No shops are available. Create shops first to configure prices.
            </p>
          </div>
        )}

        {/* Empty state - no SKUs */}
        {!loadingPrices && priceData && priceData.items.length === 0 && (
          <div className="bg-card rounded-lg border p-12 text-center">
            <Tags className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No SKUs Found</h3>
            <p className="text-muted-foreground">
              Create SKUs first in the SKU management page.
            </p>
          </div>
        )}
      </div>
    </PermissionGuard>
  )
}
