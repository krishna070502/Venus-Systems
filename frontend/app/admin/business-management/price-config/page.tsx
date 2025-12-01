'use client'

import { useState, useEffect, useMemo } from 'react'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import { api } from '@/lib/api/client'
import { 
  Tags, 
  Save, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  AlertCircle,
  Calendar,
  Store,
  RefreshCw,
  DollarSign
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
interface Shop {
  id: number
  name: string
  location: string | null
  is_active: boolean
}

interface PriceItem {
  item_id: number
  item_name: string
  sku: string | null
  category: string | null
  base_price: number
  daily_price: number | null
  unit: string
}

interface DailyPricesResponse {
  shop_id: number
  shop_name: string
  date: string
  items: PriceItem[]
}

export default function PriceConfigPage() {
  const { permissions, loading: permissionsLoading } = usePermissions()
  
  // State
  const [shops, setShops] = useState<Shop[]>([])
  const [selectedShopId, setSelectedShopId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [priceData, setPriceData] = useState<DailyPricesResponse | null>(null)
  const [editedPrices, setEditedPrices] = useState<Record<number, string>>({})
  
  // Loading states
  const [loadingShops, setLoadingShops] = useState(true)
  const [loadingPrices, setLoadingPrices] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Error/Success states
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Permissions
  const canRead = hasPermission(permissions, 'priceconfig.read')
  const canWrite = hasPermission(permissions, 'priceconfig.write')

  // Fetch shops
  const fetchShops = async () => {
    try {
      setLoadingShops(true)
      const data = await api.businessManagement.shops.getAll(true) as Shop[]
      setShops(data)
      // Auto-select first shop if available
      if (data.length > 0 && !selectedShopId) {
        setSelectedShopId(data[0].id.toString())
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch shops')
    } finally {
      setLoadingShops(false)
    }
  }

  // Fetch daily prices
  const fetchPrices = async () => {
    if (!selectedShopId || !selectedDate) return
    
    try {
      setLoadingPrices(true)
      setError(null)
      const data = await api.businessManagement.prices.getDaily(
        parseInt(selectedShopId),
        selectedDate
      ) as DailyPricesResponse
      setPriceData(data)
      
      // Initialize edited prices with current daily prices
      const initialPrices: Record<number, string> = {}
      data.items.forEach(item => {
        if (item.daily_price !== null) {
          initialPrices[item.item_id] = item.daily_price.toString()
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
  const handlePriceChange = (itemId: number, value: string) => {
    setEditedPrices(prev => ({
      ...prev,
      [itemId]: value
    }))
    setSuccess(null)
  }

  // Check if there are changes
  const hasChanges = useMemo(() => {
    if (!priceData) return false
    
    return priceData.items.some(item => {
      const editedPrice = editedPrices[item.item_id]
      const currentPrice = item.daily_price?.toString() || ''
      
      // Has value and it's different from current
      if (editedPrice && editedPrice !== currentPrice) {
        return true
      }
      // Had value but now empty (will revert to base)
      if (!editedPrice && currentPrice) {
        return true
      }
      return false
    })
  }, [priceData, editedPrices])

  // Save changes
  const handleSave = async () => {
    if (!priceData || !selectedShopId) return
    
    // Collect items with changed prices
    const changedItems: Array<{ item_id: number; price: number }> = []
    
    priceData.items.forEach(item => {
      const editedPrice = editedPrices[item.item_id]
      if (editedPrice) {
        const price = parseFloat(editedPrice)
        if (!isNaN(price) && price >= 0) {
          changedItems.push({
            item_id: item.item_id,
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
      
      await api.businessManagement.prices.bulkUpdate({
        shop_id: parseInt(selectedShopId),
        date: selectedDate,
        items: changedItems
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

  // Reset to base prices (clear edited)
  const handleReset = () => {
    setEditedPrices({})
    setSuccess(null)
  }

  // Initial fetch
  useEffect(() => {
    if (canRead) {
      fetchShops()
    }
  }, [canRead])

  // Fetch prices when shop or date changes
  useEffect(() => {
    if (selectedShopId && selectedDate) {
      fetchPrices()
    }
  }, [selectedShopId, selectedDate])

  // Get display price for an item
  const getDisplayPrice = (item: PriceItem): string => {
    const editedPrice = editedPrices[item.item_id]
    if (editedPrice !== undefined) {
      return editedPrice
    }
    return item.daily_price?.toString() || ''
  }

  // Check if item has custom price
  const hasCustomPrice = (item: PriceItem): boolean => {
    const editedPrice = editedPrices[item.item_id]
    return editedPrice !== undefined && editedPrice !== '' || item.daily_price !== null
  }

  return (
    <PermissionGuard permission="priceconfig.view">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Tags className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Price Configuration</h1>
              <p className="text-muted-foreground">Configure daily prices per shop</p>
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
                Read Prices
              </span>
            </div>
            <div className="flex items-center gap-2">
              {canWrite ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className={`text-sm ${canWrite ? 'text-green-700' : 'text-red-700'}`}>
                Write Prices
              </span>
            </div>
          </div>
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
                Select Date
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
                <DollarSign className="h-5 w-5" />
                Prices for {priceData.shop_name} - {new Date(priceData.date).toLocaleDateString()}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Leave daily price empty to use base price. {!canWrite && '(Read-only mode)'}
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Base Price</TableHead>
                  <TableHead className="text-right w-[180px]">Daily Price</TableHead>
                  <TableHead className="text-right">Effective</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priceData.items.map((item) => {
                  const displayPrice = getDisplayPrice(item)
                  const basePrice = parseFloat(String(item.base_price))
                  const effectivePrice = displayPrice 
                    ? parseFloat(displayPrice) 
                    : basePrice
                  const isCustom = hasCustomPrice(item)
                  
                  return (
                    <TableRow key={item.item_id}>
                      <TableCell>
                        <div className="font-medium">{item.item_name}</div>
                        <div className="text-xs text-muted-foreground">/{item.unit}</div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono">{item.sku || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{item.category || '-'}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono">${basePrice.toFixed(2)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        {canWrite ? (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Use base"
                            value={displayPrice}
                            onChange={(e) => handlePriceChange(item.item_id, e.target.value)}
                            className="w-[120px] ml-auto text-right font-mono"
                          />
                        ) : (
                          <span className="font-mono">
                            {item.daily_price !== null 
                              ? `$${parseFloat(String(item.daily_price)).toFixed(2)}` 
                              : '-'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-mono font-semibold ${isCustom ? 'text-primary' : ''}`}>
                          ${effectivePrice.toFixed(2)}
                        </span>
                        {isCustom && (
                          <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            Custom
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

        {/* Empty state - no items */}
        {!loadingPrices && priceData && priceData.items.length === 0 && (
          <div className="bg-card rounded-lg border p-12 text-center">
            <Tags className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Inventory Items</h3>
            <p className="text-muted-foreground">
              No inventory items found. Add items to start configuring prices.
            </p>
          </div>
        )}
      </div>
    </PermissionGuard>
  )
}
