'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api/client'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import { useStore } from '@/lib/context/StoreContext'
import { StoreHeader } from '@/components/poultry/StoreHeader'
import { SKU, SaleItemCreate, BirdType, InventoryType, PaymentMethod, Sale } from '@/lib/types/poultry'
import {
    ShoppingCart,
    Trash2,
    Loader2,
    AlertCircle,
    CreditCard,
    Banknote,
    User,
    Phone,
    ChevronRight,
    Plus,
    Minus,
    CheckCircle2,
    X,
    UserCircle2,
    Maximize,
    Minimize,
    Search
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ReceiptModal } from '@/components/pos/ReceiptModal'

interface CartItem {
    sku: SKU
    weight_kg: number
    rate_per_kg: number
    amount: number
}

import { useRef } from 'react'

export default function POSPage() {
    const posRef = useRef<HTMLDivElement>(null)
    const [isFullscreen, setIsFullscreen] = useState(false)

    const { currentStore } = useStore()
    const { permissions, loading: permLoading } = usePermissions()
    const [skus, setSKUs] = useState<SKU[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    // Cart state
    const [cart, setCart] = useState<CartItem[]>([])
    const [customerName, setCustomerName] = useState('')
    const [customerPhone, setCustomerPhone] = useState('')
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
    const [showCustomerInput, setShowCustomerInput] = useState(false)

    // Checkout state
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [showReceipt, setShowReceipt] = useState(false)
    const [lastSale, setLastSale] = useState<Sale | null>(null)

    const fetchSKUs = useCallback(async () => {
        setLoading(true)
        try {
            const data = await api.poultry.skus.getAll({ is_active: true }) as SKU[]
            setSKUs(Array.isArray(data) ? data : [])
        } catch (err: any) {
            setError(err.message || 'Failed to load SKUs')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchSKUs()

        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement)
        }

        document.addEventListener('fullscreenchange', handleFullscreenChange)
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }, [fetchSKUs])

    const toggleFullscreen = () => {
        if (!posRef.current) return

        if (!document.fullscreenElement) {
            posRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`)
            })
        } else {
            document.exitFullscreen()
        }
    }

    // Filter SKUs based on search query
    const filteredSKUs = skus.filter(sku =>
        sku.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sku.code.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Calculate totals
    const totalAmount = cart.reduce((sum, item) => sum + item.amount, 0)
    const totalWeight = cart.reduce((sum, item) => sum + item.weight_kg, 0)

    const addToCart = (sku: SKU) => {
        const existing = cart.find(c => c.sku.id === sku.id)
        if (existing) return

        const defaultRate = sku.inventory_type === 'LIVE' ? 150 : sku.inventory_type === 'SKIN' ? 200 : 250

        setCart([...cart, {
            sku,
            weight_kg: 0,
            rate_per_kg: defaultRate,
            amount: 0,
        }])
    }

    const updateCartItem = (skuId: string, field: 'weight_kg' | 'rate_per_kg' | 'amount', value: number) => {
        setCart(cart.map(item => {
            if (item.sku.id !== skuId) return item
            const updated = { ...item, [field]: value }

            if (field === 'amount') {
                updated.weight_kg = updated.rate_per_kg > 0 ? updated.amount / updated.rate_per_kg : 0
            } else {
                updated.amount = updated.weight_kg * updated.rate_per_kg
            }
            return updated
        }))
    }

    const removeFromCart = (skuId: string) => {
        setCart(cart.filter(item => item.sku.id !== skuId))
    }

    const handleCheckout = async () => {
        if (!currentStore) {
            setSaveError('No store selected')
            return
        }
        if (cart.length === 0) {
            setSaveError('Cart is empty')
            return
        }
        if (cart.some(item => item.weight_kg <= 0)) {
            setSaveError('All items must have weight > 0')
            return
        }

        setSaving(true)
        setSaveError(null)
        try {
            // Adjust items to match backend SaleItemCreate exactly
            const formattedItems: SaleItemCreate[] = cart.map(item => ({
                sku_id: item.sku.id,
                weight: item.weight_kg,
                price_snapshot: item.rate_per_kg,
            }))

            const createdSale = await api.poultry.sales.create({
                store_id: currentStore.id,
                sale_type: 'POS',
                items: formattedItems,
                payment_method: paymentMethod,
                customer_name: customerName || undefined,
                customer_phone: customerPhone || undefined,
            }) as Sale

            // Fetch full sale with items for the receipt if backend didn't return items
            let saleForReceipt = createdSale
            if (!createdSale.items) {
                saleForReceipt = await api.poultry.sales.getById(createdSale.id) as Sale
            }

            setLastSale(saleForReceipt)
            setShowReceipt(true)
            setCart([])
            setCustomerName('')
            setCustomerPhone('')
            setShowCustomerInput(false)
        } catch (err: any) {
            setSaveError(err.message || 'Failed to create sale')
        } finally {
            setSaving(false)
        }
    }

    const invTypeColors = {
        LIVE: 'border-blue-500/20 hover:border-blue-500 bg-blue-500/5',
        SKIN: 'border-orange-500/20 hover:border-orange-500 bg-orange-500/5',
        SKINLESS: 'border-green-500/20 hover:border-green-500 bg-green-500/5',
    } as const

    return (
        <PermissionGuard permission="sales.read">
            <div className="flex flex-col h-screen bg-muted/20 overflow-hidden font-sans">
                <StoreHeader
                    title="Enterprise POS"
                    subtitle="Premium Retail Management System"
                    onRefresh={fetchSKUs}
                    actions={
                        <button
                            onClick={toggleFullscreen}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-accent transition-colors"
                            title={isFullscreen ? "Exit Full Screen" : "Enter Full Screen"}
                        >
                            {isFullscreen ? (
                                <Minimize className="h-4 w-4" />
                            ) : (
                                <Maximize className="h-4 w-4" />
                            )}
                            <span className="text-sm hidden sm:inline">
                                {isFullscreen ? "Exit Full Screen" : "Full Screen"}
                            </span>
                        </button>
                    }
                />

                <div ref={posRef} className="flex-1 flex flex-col lg:flex-row overflow-hidden p-2 sm:p-4 gap-2 sm:gap-4 bg-muted/20">
                    {/* Left: Product Grid */}
                    <div className="flex-1 flex flex-col min-w-0 h-full">
                        <div className="bg-card rounded-2xl sm:rounded-3xl border shadow-sm flex-1 overflow-auto p-3 sm:p-6 scrollbar-hide">
                            <div className="flex items-center justify-between mb-4 sm:mb-8">
                                <h1 className="text-lg sm:text-2xl font-black italic tracking-tighter uppercase flex items-center gap-2">
                                    <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                                    Available Stocks
                                </h1>
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="Search SKU..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10 pr-4 py-2 bg-muted/20 border-none rounded-full text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none w-48 sm:w-64 transition-all"
                                        />
                                    </div>
                                    <div className="text-[10px] font-black text-muted-foreground uppercase opacity-50 tracking-widest">{filteredSKUs.length} PRODUCTS</div>
                                </div>
                            </div>

                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-48 sm:h-64 gap-2 sm:gap-4">
                                    <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-primary opacity-50" />
                                    <p className="text-[10px] sm:text-sm font-bold uppercase tracking-widest opacity-30">Synchronizing...</p>
                                </div>
                            ) : error ? (
                                <div className="bg-destructive/10 text-destructive p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-destructive/20 flex items-center gap-3">
                                    <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                                    <span className="font-bold text-xs sm:text-base">{error}</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-4 lg:gap-6">
                                    {filteredSKUs.map((sku) => {
                                        const inCart = cart.some(c => c.sku.id === sku.id)
                                        return (
                                            <button
                                                key={sku.id}
                                                onClick={() => addToCart(sku)}
                                                disabled={inCart}
                                                className={cn(
                                                    "p-3 sm:p-5 rounded-2xl sm:rounded-3xl border-2 transition-all group relative overflow-hidden flex flex-col h-full",
                                                    inCart ? "opacity-30 cursor-not-allowed bg-muted border-muted grayscale" :
                                                        cn("bg-card shadow-sm hover:shadow-2xl hover:-translate-y-1 active:scale-95", invTypeColors[sku.inventory_type as InventoryType])
                                                )}
                                            >
                                                <div className="flex items-start justify-between mb-2 sm:mb-4">
                                                    <span className="text-xl sm:text-3xl filter drop-shadow-md group-hover:scale-110 transition-transform duration-300">
                                                        {sku.bird_type === 'BROILER' ? '🐔' : '🐓'}
                                                    </span>
                                                    <div className="px-1.5 py-0.5 rounded-full text-[7px] sm:text-[8px] font-black uppercase tracking-tighter bg-white/80 border shadow-sm">
                                                        {sku.inventory_type}
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-black text-xs sm:text-base leading-none mb-1 group-hover:text-primary transition-colors truncate">{sku.name}</div>
                                                    <div className="text-[8px] sm:text-[10px] font-mono opacity-50 font-bold uppercase tracking-widest truncate">{sku.code}</div>
                                                </div>
                                                <div className="mt-2 sm:mt-4 flex items-center justify-between text-[10px] sm:text-xs font-black">
                                                    <span className="opacity-50 italic">MRP</span>
                                                    <span className="text-primary tracking-tighter">₹{sku.inventory_type === 'LIVE' ? '150' : '200'}+</span>
                                                </div>

                                                {inCart && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[2px]">
                                                        <CheckCircle2 className="h-6 w-6 sm:h-10 sm:w-10 text-primary drop-shadow-lg" />
                                                    </div>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Floating Exit Button for Full Screen */}
                        {isFullscreen && (
                            <button
                                onClick={toggleFullscreen}
                                className="absolute top-4 right-4 z-[100] p-3 bg-destructive text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center gap-2 group"
                            >
                                <Minimize className="h-5 w-5" />
                                <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap">
                                    Exit Full Screen
                                </span>
                            </button>
                        )}
                    </div>

                    {/* Right: Cart & Checkout */}
                    <div className="w-full lg:w-[380px] xl:w-[420px] flex flex-col min-h-0 h-full gap-2 sm:gap-4">
                        {/* Billing Info */}
                        <div className="bg-card rounded-2xl sm:rounded-3xl border shadow-xl flex-1 flex flex-col overflow-hidden">
                            <div className="p-3 sm:p-6 border-b bg-muted/10 flex items-center justify-between">
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="p-1.5 sm:p-2 bg-primary/10 rounded-xl sm:rounded-2xl">
                                        <ShoppingCart className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
                                    </div>
                                    <h3 className="font-black text-sm sm:text-xl uppercase tracking-tighter">Terminal</h3>
                                </div>
                                <div className="text-[8px] sm:text-[10px] font-black uppercase bg-secondary px-2 sm:px-3 py-0.5 sm:py-1 rounded-full tracking-widest">{cart.length} ITEMS</div>
                            </div>

                            {/* Cart Items */}
                            <div className="flex-1 overflow-auto p-2 sm:p-4 space-y-2 sm:space-y-3">
                                {cart.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2 sm:gap-4 opacity-20">
                                        <div className="p-6 sm:p-10 bg-muted/50 rounded-full">
                                            <ShoppingCart className="h-10 w-10 sm:h-20 sm:w-20" />
                                        </div>
                                        <p className="font-black text-sm sm:text-lg tracking-widest uppercase italic font-mono">Terminal Idle</p>
                                    </div>
                                ) : (
                                    cart.map((item) => (
                                        <div key={item.sku.id} className="bg-muted/5 border-2 border-transparent hover:border-primary/20 hover:bg-muted/10 transition-all rounded-2xl sm:rounded-3xl p-3 sm:p-4 flex flex-col gap-2 sm:gap-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-black text-xs sm:text-sm uppercase leading-tight truncate">{item.sku.name}</div>
                                                    <div className="text-[8px] sm:text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest font-mono mt-0.5 flex items-center gap-1.5">
                                                        <span>{item.sku.code}</span>
                                                        <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                                        <span className="text-secondary-foreground">{item.sku.inventory_type}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeFromCart(item.sku.id)}
                                                    className="p-1.5 sm:p-2.5 bg-destructive/10 text-destructive rounded-xl sm:rounded-2xl hover:bg-destructive hover:text-destructive-foreground transition-all active:scale-90"
                                                >
                                                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-2">
                                                <div className="space-y-1 sm:space-y-1.5">
                                                    <label className="text-[8px] sm:text-[9px] font-black text-muted-foreground uppercase pl-1 tracking-tighter">Quant (kg)</label>
                                                    <div className="relative group">
                                                        <input
                                                            type="number"
                                                            value={item.weight_kg || ''}
                                                            onChange={(e) => updateCartItem(item.sku.id, 'weight_kg', parseFloat(e.target.value) || 0)}
                                                            className="w-full pl-2 sm:pl-3 pr-6 sm:pr-8 py-2 sm:py-3 bg-white border-2 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black focus:border-primary transition-all outline-none tabular-nums"
                                                            placeholder="0.000"
                                                        />
                                                        <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-[8px] sm:text-[10px] font-black opacity-30 select-none">KG</div>
                                                    </div>
                                                </div>
                                                <div className="space-y-1 sm:space-y-1.5">
                                                    <label className="text-[8px] sm:text-[9px] font-black text-muted-foreground uppercase pl-1 tracking-tighter">Rate (₹)</label>
                                                    <div className="relative group">
                                                        <input
                                                            type="number"
                                                            value={item.rate_per_kg || ''}
                                                            onChange={(e) => updateCartItem(item.sku.id, 'rate_per_kg', parseFloat(e.target.value) || 0)}
                                                            className="w-full pl-2 sm:pl-3 pr-6 sm:pr-8 py-2 sm:py-3 bg-white border-2 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black focus:border-primary transition-all outline-none tabular-nums"
                                                            placeholder="0"
                                                        />
                                                        <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-[8px] sm:text-[10px] font-black opacity-30 select-none">RATE</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-1 sm:space-y-1.5">
                                                <label className="text-[8px] sm:text-[9px] font-black text-primary uppercase pl-1 tracking-tighter">Item Total (₹) - Editable</label>
                                                <div className="relative group">
                                                    <input
                                                        type="number"
                                                        value={item.amount || ''}
                                                        onChange={(e) => updateCartItem(item.sku.id, 'amount', parseFloat(e.target.value) || 0)}
                                                        className="w-full pl-2 sm:pl-3 pr-6 sm:pr-10 py-2 sm:py-3 bg-primary/5 border-2 border-primary/20 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black focus:border-primary transition-all outline-none tabular-nums text-primary"
                                                        placeholder="0.00"
                                                    />
                                                    <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-[8px] sm:text-[10px] font-black opacity-30 select-none">TOTAL</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Customer Section */}
                            <div className="p-3 sm:p-4 border-t bg-muted/5 space-y-2 sm:space-y-3">
                                <button
                                    onClick={() => setShowCustomerInput(!showCustomerInput)}
                                    className={cn(
                                        "w-full px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest border-2 transition-all flex items-center justify-between",
                                        showCustomerInput ? "bg-primary/5 border-primary/20 text-primary" : "bg-white border-muted hover:border-primary/20"
                                    )}
                                >
                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                        <UserCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                        <span>Customer Details</span>
                                    </div>
                                    {showCustomerInput ? <Minus className="h-3 w-3 sm:h-4 sm:w-4" /> : <Plus className="h-3 w-3 sm:h-4 sm:w-4" />}
                                </button>

                                {showCustomerInput && (
                                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                                        <div className="relative group">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                            <input
                                                type="text"
                                                placeholder="Customer Name"
                                                value={customerName}
                                                onChange={(e) => setCustomerName(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 sm:py-3 border-2 rounded-xl sm:rounded-2xl bg-white text-xs sm:text-sm font-bold focus:border-primary outline-none transition-all"
                                            />
                                        </div>
                                        <div className="relative group">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                            <input
                                                type="text"
                                                placeholder="Phone Contact"
                                                value={customerPhone}
                                                onChange={(e) => setCustomerPhone(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 sm:py-3 border-2 rounded-xl sm:rounded-2xl bg-white text-xs sm:text-sm font-bold focus:border-primary outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Payment Section */}
                            {cart.length > 0 && (
                                <div className="p-2 sm:p-4 border-t bg-white flex gap-2 sm:gap-3">
                                    <button
                                        onClick={() => setPaymentMethod('CASH')}
                                        className={cn(
                                            "flex-1 py-3 sm:py-4 rounded-2xl sm:rounded-3xl border-2 flex flex-col items-center justify-center gap-1 sm:gap-1.5 transition-all shadow-sm",
                                            paymentMethod === 'CASH' ? 'border-green-500 bg-green-50 text-green-800 ring-4 ring-green-100' : 'border-muted hover:bg-muted/20'
                                        )}
                                    >
                                        <Banknote className="h-5 w-5 sm:h-6 sm:w-6" />
                                        <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Cash Sale</span>
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('UPI')}
                                        className={cn(
                                            "flex-1 py-3 sm:py-4 rounded-2xl sm:rounded-3xl border-2 flex flex-col items-center justify-center gap-1 sm:gap-1.5 transition-all shadow-sm",
                                            paymentMethod === 'UPI' ? 'border-purple-500 bg-purple-50 text-purple-800 ring-4 ring-purple-100' : 'border-muted hover:bg-muted/20'
                                        )}
                                    >
                                        <CreditCard className="h-5 w-5 sm:h-6 sm:w-6" />
                                        <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Digital Pay</span>
                                    </button>
                                </div>
                            )}

                            {/* Bottom Panel */}
                            <div className="p-4 sm:p-6 bg-primary text-primary-foreground">
                                {saveError && (
                                    <div className="bg-white/20 text-white p-2 rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest mb-3 border border-white/30 backdrop-blur-md">
                                        ⚠️ {saveError}
                                    </div>
                                )}

                                <div className="space-y-2 sm:space-y-4 mb-4 sm:mb-8">
                                    <div className="flex justify-between items-center opacity-60">
                                        <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] italic">Weight</span>
                                        <span className="font-mono font-black text-sm sm:text-lg">{totalWeight.toFixed(3)} KG</span>
                                    </div>
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-sm sm:text-lg font-black uppercase tracking-tighter italic scale-y-110 origin-left">Total</span>
                                        <span className="text-2xl sm:text-4xl font-black tracking-tighter tabular-nums drop-shadow-md">₹{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleCheckout}
                                    disabled={saving || cart.length === 0}
                                    className="w-full py-3 sm:py-5 bg-white text-primary rounded-2xl sm:rounded-3xl font-black text-sm sm:text-xl hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 sm:gap-4 transition-all active:scale-[0.98] shadow-2xl shadow-black/20 uppercase tracking-tighter italic"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <ShoppingCart className="h-5 w-5 sm:h-7 sm:w-7" />
                                            <span>Complete</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Success Receipt Modal */}
                {showReceipt && lastSale && (
                    <ReceiptModal
                        isOpen={showReceipt}
                        onClose={() => setShowReceipt(false)}
                        sale={lastSale}
                        storeName={currentStore?.name || "VENUS CHICKEN"}
                        storeAddress={currentStore?.location || undefined}
                    />
                )}
            </div>
        </PermissionGuard>
    )
}
