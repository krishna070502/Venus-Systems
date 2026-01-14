'use client'

import { useStore, Shop } from '@/lib/context/StoreContext'
import { Store, ChevronDown, Loader2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface StoreSelectorProps {
    className?: string
}

export function StoreSelector({ className }: StoreSelectorProps) {
    const { currentStore, setCurrentStore, stores, loading } = useStore()
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    if (loading) {
        return (
            <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading stores...</span>
            </div>
        )
    }

    if (stores.length === 0) {
        return (
            <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
                <Store className="h-4 w-4" />
                <span className="text-sm">No stores available</span>
            </div>
        )
    }

    return (
        <div ref={dropdownRef} className={cn("relative", className)}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card hover:bg-accent transition-colors"
            >
                <Store className="h-4 w-4 text-primary" />
                <span className="font-medium">{currentStore?.name || 'Select Store'}</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 rounded-lg border bg-card shadow-lg z-50">
                    <div className="p-1">
                        {stores.map((store) => (
                            <button
                                key={store.id}
                                onClick={() => {
                                    setCurrentStore(store)
                                    setIsOpen(false)
                                }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors",
                                    currentStore?.id === store.id
                                        ? "bg-primary text-primary-foreground"
                                        : "hover:bg-accent"
                                )}
                            >
                                <Store className="h-4 w-4" />
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">{store.name}</div>
                                    {store.location && (
                                        <div className="text-xs opacity-70 truncate">{store.location}</div>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
