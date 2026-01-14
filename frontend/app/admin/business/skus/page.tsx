'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api/client'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import { SKU, SKUCreate, BirdType, InventoryType } from '@/lib/types/poultry'
import { useStore } from '@/lib/context/StoreContext'
import { StoreHeader } from '@/components/poultry/StoreHeader'
import { Package, Plus, Edit, Loader2, Search, X, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SKUsPage() {
    const { currentStore } = useStore()
    const { permissions, loading: permLoading } = usePermissions()
    const [skus, setSKUs] = useState<SKU[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [birdTypeFilter, setBirdTypeFilter] = useState<BirdType | ''>('')
    const [invTypeFilter, setInvTypeFilter] = useState<InventoryType | ''>('')

    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [editingSKU, setEditingSKU] = useState<SKU | null>(null)
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)

    // Form state
    const [formData, setFormData] = useState<SKUCreate>({
        name: '', code: '', description: '', bird_type: 'BROILER',
        inventory_type: 'LIVE', unit: 'kg', display_order: 0,
    })

    const canCreate = !permLoading && hasPermission(permissions, 'stock.write')
    const canEdit = !permLoading && hasPermission(permissions, 'stock.update')

    const fetchSKUs = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const params: any = { is_active: true }
            if (birdTypeFilter) params.bird_type = birdTypeFilter
            if (invTypeFilter) params.inventory_type = invTypeFilter
            const data = await api.poultry.skus.getAll(params) as SKU[]
            setSKUs(Array.isArray(data) ? data : [])
        } catch (err: any) {
            setError(err.message || 'Failed to load SKUs')
        } finally {
            setLoading(false)
        }
    }, [birdTypeFilter, invTypeFilter])

    useEffect(() => { fetchSKUs() }, [fetchSKUs])

    const filteredSKUs = skus.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const openCreateModal = () => {
        setEditingSKU(null)
        setFormData({ name: '', code: '', description: '', bird_type: 'BROILER', inventory_type: 'LIVE', unit: 'kg', display_order: skus.length + 1 })
        setSaveError(null)
        setShowModal(true)
    }

    const openEditModal = (sku: SKU) => {
        setEditingSKU(sku)
        setFormData({ name: sku.name, code: sku.code, description: sku.description || '', bird_type: sku.bird_type, inventory_type: sku.inventory_type, unit: sku.unit, display_order: sku.display_order })
        setSaveError(null)
        setShowModal(true)
    }

    const handleSave = async () => {
        if (!formData.name.trim() || !formData.code.trim()) {
            setSaveError('Name and code are required')
            return
        }
        setSaving(true)
        setSaveError(null)
        try {
            if (editingSKU) {
                await api.poultry.skus.update(editingSKU.id, formData)
            } else {
                await api.poultry.skus.create(formData)
            }
            setShowModal(false)
            fetchSKUs()
        } catch (err: any) {
            setSaveError(err.message || 'Failed to save SKU')
        } finally {
            setSaving(false)
        }
    }

    const invTypeColors: Record<InventoryType, string> = { LIVE: 'bg-blue-100 text-blue-800', SKIN: 'bg-orange-100 text-orange-800', SKINLESS: 'bg-green-100 text-green-800' }

    return (
        <PermissionGuard permission="stock.read">
            <div className="flex flex-col h-full bg-muted/20">
                <StoreHeader
                    title="Product Catalog (SKUs)"
                    subtitle="Define birds and processed item codes"
                    onRefresh={fetchSKUs}
                    actions={
                        canCreate && (
                            <button
                                onClick={openCreateModal}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                            >
                                <Plus className="h-4 w-4" />
                                <span className="text-sm font-semibold">New SKU</span>
                            </button>
                        )
                    }
                />

                <div className="p-6">
                    {/* Filters */}
                    <div className="bg-card rounded-xl border p-5 mb-6 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search by name or code..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                />
                            </div>
                            <select
                                value={birdTypeFilter}
                                onChange={(e) => setBirdTypeFilter(e.target.value as BirdType | '')}
                                className="px-3 py-2 border rounded-lg bg-background text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="">All Bird Types</option>
                                <option value="BROILER">🐔 Broiler</option>
                                <option value="PARENT_CULL">🐓 Parent Cull</option>
                            </select>
                            <select
                                value={invTypeFilter}
                                onChange={(e) => setInvTypeFilter(e.target.value as InventoryType | '')}
                                className="px-3 py-2 border rounded-lg bg-background text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="">All Inventory Types</option>
                                <option value="LIVE">Live</option>
                                <option value="SKIN">Skin</option>
                                <option value="SKINLESS">Skinless</option>
                            </select>
                        </div>
                    </div>

                    {/* Content */}
                    {loading ? (
                        <div className="flex items-center justify-center h-48">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : error ? (
                        <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" />
                            {error}
                        </div>
                    ) : filteredSKUs.length === 0 ? (
                        <div className="rounded-xl border-2 border-dashed bg-card p-12 text-center text-muted-foreground">
                            <Package className="h-16 w-16 mx-auto mb-4 opacity-20" />
                            <h3 className="text-xl font-semibold mb-2 text-foreground">No SKUs Found</h3>
                            <p className="max-w-md mx-auto text-sm mb-4">Create products to manage inventory and sales efficiently.</p>
                            {canCreate && (
                                <button onClick={openCreateModal} className="text-primary hover:underline font-bold">
                                    Define your first SKU
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredSKUs.map((sku) => (
                                <div key={sku.id} className={cn(
                                    "bg-card rounded-xl border p-5 transition-all hover:shadow-xl hover:-translate-y-1 relative group",
                                    !sku.is_active && "opacity-60 grayscale"
                                )}>
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                                            <Package className="h-6 w-6" />
                                        </div>
                                        {canEdit && (
                                            <button
                                                onClick={() => openEditModal(sku)}
                                                className="p-2 opacity-0 group-hover:opacity-100 hover:bg-accent rounded-lg transition-all"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-1 mb-4">
                                        <div className="font-bold text-lg leading-tight">{sku.name}</div>
                                        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest font-mono p-1 bg-muted/50 rounded inline-block">
                                            {sku.code}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mb-4">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted flex items-center gap-1">
                                            {sku.bird_type === 'BROILER' ? '🐔' : '🐓'} {sku.bird_type}
                                        </span>
                                        <span className={cn(
                                            "px-2 py-0.5 rounded text-[10px] font-bold border uppercase",
                                            invTypeColors[sku.inventory_type]
                                        )}>
                                            {sku.inventory_type}
                                        </span>
                                    </div>

                                    {sku.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2 italic mb-4 min-h-[2rem]">
                                            "{sku.description}"
                                        </p>
                                    )}

                                    <div className="pt-4 border-t flex items-center justify-between mt-auto">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Billing Unit</span>
                                            <span className="font-bold text-sm">{sku.unit}</span>
                                        </div>
                                        <div className={cn(
                                            "h-2 w-2 rounded-full",
                                            sku.is_active ? "bg-green-500 animate-pulse" : "bg-red-400"
                                        )} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-card rounded-2xl border shadow-2xl w-full max-w-md overflow-hidden">
                            <div className="px-6 py-5 border-b bg-muted/30 flex items-center justify-between">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Package className="h-5 w-5 text-primary" />
                                    {editingSKU ? 'Edit Product SKU' : 'Define New SKU'}
                                </h2>
                                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-accent rounded-full transition-colors font-bold">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-5">
                                {saveError && (
                                    <div className="bg-destructive/10 text-destructive p-3 rounded-xl text-xs font-bold border border-destructive/20 flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        {saveError}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest pl-1">Product Name *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-3 border rounded-xl bg-background text-sm font-medium focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                                        placeholder="e.g. Skinless Whole Chicken"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest pl-1">Item Code * (Unique)</label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        className="w-full px-4 py-3 border rounded-xl bg-background text-sm font-black font-mono focus:ring-4 focus:ring-primary/10 outline-none transition-all uppercase"
                                        placeholder="CHICKEN-SL-001"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest pl-1">Category</label>
                                        <select
                                            value={formData.bird_type}
                                            onChange={(e) => setFormData({ ...formData, bird_type: e.target.value as BirdType })}
                                            className="w-full px-4 py-3 border rounded-xl bg-background text-sm font-bold appearance-none outline-none focus:ring-2 focus:ring-primary/20"
                                        >
                                            <option value="BROILER">Broiler</option>
                                            <option value="PARENT_CULL">Parent Cull</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest pl-1">Inventory Type</label>
                                        <select
                                            value={formData.inventory_type}
                                            onChange={(e) => setFormData({ ...formData, inventory_type: e.target.value as InventoryType })}
                                            className="w-full px-4 py-3 border rounded-xl bg-background text-sm font-bold appearance-none outline-none focus:ring-2 focus:ring-primary/20"
                                        >
                                            <option value="LIVE">Live</option>
                                            <option value="SKIN">Skin-On</option>
                                            <option value="SKINLESS">Skinless</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest pl-1">Short Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-4 py-3 border rounded-xl bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[80px]"
                                        placeholder="Notes about this SKU..."
                                    />
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-muted/30 border-t flex items-center justify-end gap-3">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-6 py-2.5 font-bold text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-8 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 font-black shadow-lg shadow-primary/20"
                                >
                                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {editingSKU ? 'Update Item' : 'Create Product'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </PermissionGuard>
    )
}
