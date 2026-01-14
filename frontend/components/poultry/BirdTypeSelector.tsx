'use client'

import { BirdType } from '@/lib/types/poultry'
import { cn } from '@/lib/utils'

interface BirdTypeSelectorProps {
    value: BirdType | ''
    onChange: (value: BirdType | '') => void
    allowAll?: boolean
    className?: string
    disabled?: boolean
}

const BIRD_TYPES: { value: BirdType; label: string; icon: string }[] = [
    { value: 'BROILER', label: 'Broiler', icon: '🐔' },
    { value: 'PARENT_CULL', label: 'Parent Cull', icon: '🐓' },
]

export function BirdTypeSelector({
    value,
    onChange,
    allowAll = true,
    className,
    disabled = false,
}: BirdTypeSelectorProps) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value as BirdType | '')}
            disabled={disabled}
            className={cn(
                "px-3 py-2 border rounded-lg bg-background text-sm",
                "focus:outline-none focus:ring-2 focus:ring-primary/50",
                disabled && "opacity-50 cursor-not-allowed",
                className
            )}
        >
            {allowAll && <option value="">All Bird Types</option>}
            {BIRD_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                </option>
            ))}
        </select>
    )
}

// Pill-style selector for inline use
export function BirdTypePills({
    value,
    onChange,
    allowAll = false,
    className,
}: BirdTypeSelectorProps) {
    return (
        <div className={cn("flex gap-2", className)}>
            {allowAll && (
                <button
                    onClick={() => onChange('')}
                    className={cn(
                        "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                        value === ''
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80"
                    )}
                >
                    All
                </button>
            )}
            {BIRD_TYPES.map((type) => (
                <button
                    key={type.value}
                    onClick={() => onChange(type.value)}
                    className={cn(
                        "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                        value === type.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80"
                    )}
                >
                    {type.icon} {type.label}
                </button>
            ))}
        </div>
    )
}
