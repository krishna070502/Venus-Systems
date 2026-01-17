'use client'

import { useState, useEffect, useCallback } from 'react'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import { useStore } from '@/lib/context/StoreContext'
import { StoreHeader } from '@/components/poultry/StoreHeader'
import { apiRequest } from '@/lib/api/client'
import {
    ArrowRightLeft,
    Plus,
    X,
    Loader2,
    AlertCircle,
    Check,
    Ban,
    Package,
    ChevronRight,
    Calendar,
    Send,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Shop {
    id: number
    name: string
}

interface StockTransfer {
    id: string
    from_store_id: number
    to_store_id: number
    from_store_name?: string
    to_store_name?: string
    bird_type: string
    inventory_type: string
    weight_kg: number
    bird_count: number
    transfer_date: string
    status: 'SENT' | 'RECEIVED' | 'APPROVED' | 'REJECTED'
    initiated_by?: string
    received_by?: string
    approved_by?: string
    notes?: string
    rejection_reason?: string
    created_at: string
}

const statusColors: Record<string, string> = {
    SENT: 'bg-yellow-100 text-yellow-800',
    RECEIVED: 'bg-blue-100 text-blue-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
}

const inventoryTypeLabels: Record<string, string> = {
    LIVE: '🐔 Live Birds',
    SKIN: '🍗 With Skin',
    SKINLESS: '🥩 Skinless',
}

export default function StockTransfersPage() {
    const { currentStore } = useStore()
    const { permissions, roles, loading: permLoading } = usePermissions()
    const [transfers, setTransfers] = useState<StockTransfer[]>([])
    const [shops, setShops] = useState<Shop[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState<string>('')

    // Modal state
    const [showCreateModal, setShowCreateModal] = useState(false)

    // Permissions
    const canCreate = !permLoading && hasPermission(permissions, 'inventory.transfer.create')
    const canReceive = !permLoading && hasPermission(permissions, 'inventory.transfer.receive')
    const canApprove = !permLoading && hasPermission(permissions, 'inventory.transfer.approve')
    const canBackdate = !permLoading && hasPermission(permissions, 'inventory.transfer.backdate')
    const canCrossStore = !permLoading && hasPermission(permissions, 'inventory.transfer.cross_store')
    // Only Admin role can approve transfers (not just permission)
    const isAdmin = !permLoading && roles?.includes('Admin')

    const fetchTransfers = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            let url = '/api/v1/poultry/transfers'
            const params = new URLSearchParams()

            if (statusFilter) params.append('status', statusFilter)
            if (currentStore) params.append('store_id', currentStore.id.toString())

            if (params.toString()) {
                url += `?${params.toString()}`
            }
            const data = await apiRequest<StockTransfer[]>(url, {
                headers: currentStore ? { 'X-Store-ID': currentStore.id.toString() } : {}
            })
            setTransfers(Array.isArray(data) ? data : [])
        } catch (err: any) {
            setError(err.message || 'Failed to load transfers')
        } finally {
            setLoading(false)
        }
    }, [statusFilter, currentStore])

    const fetchShops = useCallback(async () => {
        try {
            // Use the transfers/shops endpoint which is accessible to all users with transfer permissions
            const data = await apiRequest<Shop[]>('/api/v1/poultry/transfers/shops')
            setShops(Array.isArray(data) ? data : [])
        } catch {
            // Ignore
        }
    }, [])


    useEffect(() => {
        fetchTransfers()
        fetchShops()
    }, [fetchTransfers, fetchShops])

    const handleReceive = async (transfer: StockTransfer) => {
        if (!confirm('Accept this transfer?')) return
        try {
            await apiRequest(`/api/v1/poultry/transfers/${transfer.id}/receive`, { method: 'POST' })
            fetchTransfers()
        } catch (err: any) {
            alert(err.message || 'Failed to receive transfer')
        }
    }

    const handleApprove = async (transfer: StockTransfer) => {
        if (!confirm('Approve this transfer? This will update inventory.')) return
        try {
            await apiRequest(`/api/v1/poultry/transfers/${transfer.id}/approve`, { method: 'POST' })
            fetchTransfers()
        } catch (err: any) {
            alert(err.message || 'Failed to approve transfer')
        }
    }

    const handleReject = async (transfer: StockTransfer) => {
        const reason = prompt('Rejection reason (optional):')
        try {
            await apiRequest(`/api/v1/poultry/transfers/${transfer.id}/reject`, {
                method: 'POST',
                body: JSON.stringify({ rejection_reason: reason || null })
            })
            fetchTransfers()
        } catch (err: any) {
            alert(err.message || 'Failed to reject transfer')
        }
    }

    return (
        <PermissionGuard permission="inventory.transfer.view">
            <div className="flex flex-col h-full bg-muted/20">
                <StoreHeader
                    title="Stock Transfers"
                    subtitle="Transfer inventory between stores"
                    onRefresh={fetchTransfers}
                    actions={
                        canCreate && (
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                <Plus className="h-4 w-4" />
                                New Transfer
                            </button>
                        )
                    }
                />

                <div className="p-6">
                    {/* Filters */}
                    <div className="flex gap-4 mb-6">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 border rounded-lg bg-background"
                        >
                            <option value="">All Status</option>
                            <option value="SENT">Sent</option>
                            <option value="RECEIVED">Received</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
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
                    ) : transfers.length === 0 ? (
                        <div className="rounded-lg border-2 border-dashed bg-card p-12 text-center">
                            <ArrowRightLeft className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-xl font-semibold mb-2">No Transfers Yet</h3>
                            <p className="text-muted-foreground mb-4">Create your first stock transfer to move inventory between stores.</p>
                            {canCreate && (
                                <button onClick={() => setShowCreateModal(true)} className="text-primary hover:underline">
                                    Create your first transfer
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {transfers.map((t) => (
                                <div key={t.id} className="bg-card rounded-lg border p-4 hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between gap-4">
                                        {/* Transfer Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className={cn("px-2 py-1 rounded-full text-xs font-medium", statusColors[t.status])}>
                                                    {t.status}
                                                </span>
                                                <span className="text-sm text-muted-foreground">
                                                    {new Date(t.transfer_date).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-lg font-semibold">
                                                <span>{t.from_store_name || `Store ${t.from_store_id}`}</span>
                                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                                <span>{t.to_store_name || `Store ${t.to_store_id}`}</span>
                                            </div>
                                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                                <span>{inventoryTypeLabels[t.inventory_type] || t.inventory_type}</span>
                                                <span className="font-mono">{Number(t.weight_kg).toFixed(2)} kg</span>
                                                {t.bird_count > 0 && <span>{t.bird_count} birds</span>}
                                            </div>
                                            {t.notes && (
                                                <p className="text-sm text-muted-foreground mt-2 italic">"{t.notes}"</p>
                                            )}
                                            {t.rejection_reason && (
                                                <p className="text-sm text-red-600 mt-2">Rejection: {t.rejection_reason}</p>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            {/* Receiver (non-admin) can receive or reject transfers TO their store */}
                                            {t.status === 'SENT' && canReceive && !isAdmin && t.to_store_id === currentStore?.id && (
                                                <>
                                                    <button
                                                        onClick={() => handleReceive(t)}
                                                        className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                                        title="Accept Transfer"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(t)}
                                                        className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                                                        title="Reject Transfer"
                                                    >
                                                        <Ban className="h-4 w-4" />
                                                    </button>
                                                </>
                                            )}
                                            {/* Admin can approve/reject any pending transfer */}
                                            {(t.status === 'SENT' || t.status === 'RECEIVED') && isAdmin && (
                                                <>
                                                    <button
                                                        onClick={() => handleApprove(t)}
                                                        className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                                                        title="Approve & Update Inventory"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(t)}
                                                        className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                                                        title="Reject Transfer"
                                                    >
                                                        <Ban className="h-4 w-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Create Modal */}
                {showCreateModal && (
                    <CreateTransferModal
                        onClose={() => setShowCreateModal(false)}
                        onSave={() => {
                            setShowCreateModal(false)
                            fetchTransfers()
                        }}
                        shops={shops}
                        currentStoreId={currentStore?.id}
                        canBackdate={canBackdate}
                        canCrossStore={canCrossStore}
                    />
                )}
            </div>
        </PermissionGuard>
    )
}

function CreateTransferModal({
    onClose,
    onSave,
    shops,
    currentStoreId,
    canBackdate,
    canCrossStore,
}: {
    onClose: () => void
    onSave: () => void
    shops: Shop[]
    currentStoreId?: number
    canBackdate: boolean
    canCrossStore: boolean
}) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        from_store_id: currentStoreId || 0,
        to_store_id: 0,
        bird_type: 'BROILER',
        inventory_type: 'LIVE',
        weight_kg: '',
        bird_count: '',
        transfer_date: new Date().toISOString().split('T')[0],
        notes: '',
    })

    const handleSubmit = async () => {
        // For non-cross-store users, use currentStoreId as the source
        const sourceStoreId = canCrossStore ? formData.from_store_id : (currentStoreId || formData.from_store_id)

        if (!sourceStoreId) {
            setError('Please select a source store')
            return
        }

        if (!formData.to_store_id) {
            setError('Please select a destination store')
            return
        }
        if (formData.from_store_id === formData.to_store_id) {
            setError('Source and destination must be different')
            return
        }
        if (!formData.weight_kg || parseFloat(formData.weight_kg) <= 0) {
            setError('Weight must be greater than 0')
            return
        }

        setLoading(true)
        setError(null)
        try {
            await apiRequest('/api/v1/poultry/transfers', {
                method: 'POST',
                body: JSON.stringify({
                    from_store_id: sourceStoreId,
                    to_store_id: formData.to_store_id,
                    bird_type: formData.bird_type,
                    inventory_type: formData.inventory_type,
                    weight_kg: parseFloat(formData.weight_kg),
                    bird_count: formData.bird_count ? parseInt(formData.bird_count) : 0,
                    transfer_date: formData.transfer_date,
                    notes: formData.notes || null,
                })
            })
            onSave()
        } catch (err: any) {
            setError(err.message || 'Failed to create transfer')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl border shadow-2xl w-full max-w-lg">
                <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/30">
                    <div className="flex items-center gap-2">
                        <Send className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-bold">New Stock Transfer</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-accent rounded-full">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {error && (
                        <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}

                    {/* From Store */}
                    <div>
                        <label className="block text-sm font-medium mb-1">From Store *</label>
                        <select
                            value={formData.from_store_id}
                            onChange={(e) => setFormData({ ...formData, from_store_id: parseInt(e.target.value) })}
                            disabled={!canCrossStore}
                            className="w-full px-3 py-2 border rounded-lg bg-background disabled:opacity-60"
                        >
                            {canCrossStore ? (
                                <>
                                    <option value={0}>Select store</option>
                                    {shops.map((s) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </>
                            ) : (
                                <option value={currentStoreId}>{shops.find(s => s.id === currentStoreId)?.name || `Store ${currentStoreId}`}</option>
                            )}
                        </select>
                        {!canCrossStore && (
                            <p className="text-xs text-muted-foreground mt-1">Locked to your assigned store</p>
                        )}
                    </div>

                    {/* To Store */}
                    <div>
                        <label className="block text-sm font-medium mb-1">To Store *</label>
                        <select
                            value={formData.to_store_id}
                            onChange={(e) => setFormData({ ...formData, to_store_id: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border rounded-lg bg-background"
                        >
                            <option value={0}>Select destination store</option>
                            {shops.filter(s => s.id !== formData.from_store_id).map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Bird Type & Inventory Type */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Bird Type *</label>
                            <select
                                value={formData.bird_type}
                                onChange={(e) => setFormData({ ...formData, bird_type: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg bg-background"
                            >
                                <option value="BROILER">🐔 Broiler</option>
                                <option value="PARENT_CULL">🐓 Parent Cull</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Inventory Type *</label>
                            <select
                                value={formData.inventory_type}
                                onChange={(e) => setFormData({ ...formData, inventory_type: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg bg-background"
                            >
                                <option value="LIVE">🐔 Live</option>
                                <option value="SKIN">🍗 With Skin</option>
                                <option value="SKINLESS">🥩 Skinless</option>
                            </select>
                        </div>
                    </div>

                    {/* Weight & Bird Count */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Weight (kg) *</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.weight_kg}
                                onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg bg-background"
                                placeholder="0.00"
                            />
                        </div>
                        {formData.inventory_type === 'LIVE' && (
                            <div>
                                <label className="block text-sm font-medium mb-1">Bird Count</label>
                                <input
                                    type="number"
                                    value={formData.bird_count}
                                    onChange={(e) => setFormData({ ...formData, bird_count: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg bg-background"
                                    placeholder="0"
                                />
                            </div>
                        )}
                    </div>


                    {/* Transfer Date */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Transfer Date</label>
                        <input
                            type="date"
                            value={formData.transfer_date}
                            onChange={(e) => setFormData({ ...formData, transfer_date: e.target.value })}
                            disabled={!canBackdate}
                            className="w-full px-3 py-2 border rounded-lg bg-background disabled:opacity-60"
                        />
                        {!canBackdate && (
                            <p className="text-xs text-muted-foreground mt-1">Locked to today's date</p>
                        )}
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Notes</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg bg-background resize-none"
                            rows={2}
                            placeholder="Optional notes..."
                        />
                    </div>
                </div>

                <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border rounded-lg hover:bg-accent transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        <Send className="h-4 w-4" />
                        Send Transfer
                    </button>
                </div>
            </div>
        </div>
    )
}
