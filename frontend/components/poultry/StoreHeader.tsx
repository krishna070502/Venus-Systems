'use client'

import { StoreSelector } from './StoreSelector'
import { useStore } from '@/lib/context/StoreContext'
import { RefreshCw, Calendar, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface StoreHeaderProps {
    title: string
    subtitle?: string
    showDatePicker?: boolean
    selectedDate?: string
    onDateChange?: (date: string) => void
    onRefresh?: () => Promise<void>
    actions?: React.ReactNode
}

export function StoreHeader({
    title,
    subtitle,
    showDatePicker = false,
    selectedDate,
    onDateChange,
    onRefresh,
    actions,
}: StoreHeaderProps) {
    const { currentStore } = useStore()
    const [refreshing, setRefreshing] = useState(false)

    const handleRefresh = async () => {
        if (!onRefresh) return
        setRefreshing(true)
        try {
            await onRefresh()
        } finally {
            setRefreshing(false)
        }
    }

    // Format today's date for input
    const today = new Date().toISOString().split('T')[0]

    return (
        <div className="bg-card border-b px-6 py-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Left: Title and Store */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">{title}</h1>
                        {subtitle && (
                            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
                        )}
                    </div>
                    <div className="h-8 w-px bg-border hidden sm:block" />
                    <StoreSelector />
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Date Picker */}
                    {showDatePicker && (
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <input
                                type="date"
                                value={selectedDate || today}
                                onChange={(e) => onDateChange?.(e.target.value)}
                                className="px-3 py-2 border rounded-lg bg-background text-sm"
                            />
                        </div>
                    )}

                    {/* Refresh Button */}
                    {onRefresh && (
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-accent transition-colors disabled:opacity-50"
                        >
                            {refreshing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4" />
                            )}
                            <span className="text-sm hidden sm:inline">Refresh</span>
                        </button>
                    )}

                    {/* Custom Actions */}
                    {actions}
                </div>
            </div>
        </div>
    )
}
