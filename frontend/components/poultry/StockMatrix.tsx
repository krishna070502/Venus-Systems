'use client'

import { BirdType, InventoryType, StockMatrix as StockMatrixType } from '@/lib/types/poultry'
import { cn } from '@/lib/utils'
import { Package, Loader2, AlertCircle } from 'lucide-react'

interface StockMatrixProps {
    data: StockMatrixType | null
    loading?: boolean
    error?: string | null
    className?: string
}

const BIRD_TYPES: { value: BirdType; label: string; icon: string }[] = [
    { value: 'BROILER', label: 'Broiler', icon: '🐔' },
    { value: 'PARENT_CULL', label: 'Parent Cull', icon: '🐓' },
]

const INVENTORY_TYPES: { value: InventoryType; label: string; color: string }[] = [
    { value: 'LIVE', label: 'Live', color: 'text-amber-600' },
    { value: 'SKIN', label: 'Skin', color: 'text-blue-600' },
    { value: 'SKINLESS', label: 'Skinless', color: 'text-green-600' },
]

export function StockMatrix({ data, loading, error, className }: StockMatrixProps) {
    if (loading) {
        return (
            <div className={cn("bg-card rounded-lg border p-8", className)}>
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading stock data...</span>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className={cn("bg-card rounded-lg border p-8", className)}>
                <div className="flex items-center justify-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    <span>{error}</span>
                </div>
            </div>
        )
    }

    if (!data) {
        return (
            <div className={cn("bg-card rounded-lg border p-8", className)}>
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Package className="h-10 w-10" />
                    <span>No stock data available</span>
                </div>
            </div>
        )
    }

    // Calculate totals
    const totals = INVENTORY_TYPES.reduce((acc, inv) => {
        acc[inv.value] = BIRD_TYPES.reduce((sum, bird) => {
            const qty = data[bird.value]?.[inv.value] || 0
            return sum + (Number(qty) || 0)
        }, 0)
        return acc
    }, {} as Record<InventoryType, number>)

    const formatWeight = (weight: any) => {
        const num = Number(weight) || 0
        return num.toFixed(3) + ' kg'
    }

    return (
        <div className={cn("bg-card rounded-lg border overflow-hidden", className)}>
            <div className="px-4 py-3 bg-muted/50 border-b">
                <h3 className="font-semibold flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Current Stock
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                    As of: {new Date(data.as_of).toLocaleString()}
                </p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b bg-muted/30">
                            <th className="px-4 py-3 text-left text-sm font-medium">Bird Type</th>
                            {INVENTORY_TYPES.map((type) => (
                                <th key={type.value} className="px-4 py-3 text-right text-sm font-medium">
                                    <span className={type.color}>{type.label}</span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {BIRD_TYPES.map((bird) => (
                            <tr key={bird.value} className="border-b hover:bg-muted/20 transition-colors">
                                <td className="px-4 py-4">
                                    <span className="flex items-center gap-2 font-medium">
                                        <span className="text-xl">{bird.icon}</span>
                                        {bird.label}
                                    </span>
                                </td>
                                {INVENTORY_TYPES.map((inv) => {
                                    const qty = data[bird.value]?.[inv.value] || 0
                                    const count = inv.value === 'LIVE' ? (data[bird.value] as any)?.LIVE_COUNT : null

                                    return (
                                        <td key={inv.value} className="px-4 py-4 text-right">
                                            <div className={cn(
                                                "font-mono text-lg font-semibold",
                                                qty === 0 ? "text-muted-foreground" : ""
                                            )}>
                                                {formatWeight(qty)}
                                            </div>
                                            {count !== null && count > 0 && (
                                                <div className="text-xs text-muted-foreground font-medium">
                                                    {count} birds
                                                </div>
                                            )}
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                        {/* Totals Row */}
                        <tr className="bg-muted/50 font-semibold">
                            <td className="px-4 py-3">Total</td>
                            {INVENTORY_TYPES.map((inv) => (
                                <td key={inv.value} className="px-4 py-3 text-right">
                                    <span className="font-mono">{formatWeight(totals[inv.value])}</span>
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// Compact version for dashboard widgets
export function StockMatrixCompact({ data, className }: { data: StockMatrixType | null; className?: string }) {
    if (!data) return null

    return (
        <div className={cn("grid grid-cols-3 gap-4", className)}>
            {INVENTORY_TYPES.map((inv) => {
                let total = 0
                BIRD_TYPES.forEach((bird) => {
                    const qty = (data as any)[bird.value]?.[inv.value] || 0
                    total += Number(qty) || 0
                })

                return (
                    <div key={inv.value} className="bg-card rounded-lg border p-4 text-center">
                        <div className={cn("text-sm font-medium mb-1", inv.color)}>{inv.label}</div>
                        <div className="text-2xl font-bold font-mono">{total.toFixed(3)}</div>
                        <div className="text-xs text-muted-foreground">
                            {inv.value === 'LIVE' ? (
                                <span>{BIRD_TYPES.reduce((sum, b) => sum + ((data as any)[b.value]?.LIVE_COUNT || 0), 0)} birds</span>
                            ) : (
                                <span>kg</span>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
