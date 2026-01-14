'use client'

import { InventoryType } from '@/lib/types/poultry'
import { cn } from '@/lib/utils'

interface InventoryTypeSelectorProps {
    value: InventoryType | ''
    onChange: (value: InventoryType | '') => void
    allowAll?: boolean
    className?: string
    disabled?: boolean
}

const INVENTORY_TYPES: { value: InventoryType; label: string; color: string }[] = [
    { value: 'LIVE', label: 'Live', color: 'bg-amber-100 text-amber-800' },
    { value: 'SKIN', label: 'Skin', color: 'bg-blue-100 text-blue-800' },
    { value: 'SKINLESS', label: 'Skinless', color: 'bg-green-100 text-green-800' },
]

export function InventoryTypeSelector({
    value,
    onChange,
    allowAll = true,
    className,
    disabled = false,
}: InventoryTypeSelectorProps) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value as InventoryType | '')}
            disabled={disabled}
            className={cn(
                "px-3 py-2 border rounded-lg bg-background text-sm",
                "focus:outline-none focus:ring-2 focus:ring-primary/50",
                disabled && "opacity-50 cursor-not-allowed",
                className
            )}
        >
            {allowAll && <option value="">All Types</option>}
            {INVENTORY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                    {type.label}
                </option>
            ))}
        </select>
    )
}

// Badge component
interface InventoryTypeBadgeProps {
    type: InventoryType
    className?: string
}

export function InventoryTypeBadge({ type, className }: InventoryTypeBadgeProps) {
    const typeInfo = INVENTORY_TYPES.find((t) => t.value === type)
    if (!typeInfo) return null

    return (
        <span
            className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                typeInfo.color,
                className
            )}
        >
            {typeInfo.label}
        </span>
    )
}

// Pill-style selector
export function InventoryTypePills({
    value,
    onChange,
    allowAll = false,
    className,
}: InventoryTypeSelectorProps) {
    return (
        <div className={cn("flex gap-2", className)}>
            {allowAll && (
                <button
                    onClick={() => onChange('')}
                    className={cn(
                        "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                        value === ''
                            ? "bg-gray-800 text-white"
                            : "bg-muted hover:bg-muted/80"
                    )}
                >
                    All
                </button>
            )}
            {INVENTORY_TYPES.map((type) => (
                <button
                    key={type.value}
                    onClick={() => onChange(type.value)}
                    className={cn(
                        "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                        value === type.value ? type.color : "bg-muted hover:bg-muted/80"
                    )}
                >
                    {type.label}
                </button>
            ))}
        </div>
    )
}
