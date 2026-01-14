'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from '@/lib/api/client'
import { usePermissions } from '@/lib/auth/usePermissions'

// ============ Types ============

export interface Shop {
    id: number
    name: string
    location: string | null
    store_code?: string
    is_active: boolean
}

interface StoreContextType {
    currentStore: Shop | null
    setCurrentStore: (store: Shop) => void
    stores: Shop[]
    loading: boolean
    error: string | null
    refreshStores: () => Promise<void>
}

// ============ Context ============

const StoreContext = createContext<StoreContextType | null>(null)

// ============ Hook ============

export function useStore() {
    const context = useContext(StoreContext)
    if (!context) {
        throw new Error('useStore must be used within a StoreProvider')
    }
    return context
}

// ============ Provider ============

interface StoreProviderProps {
    children: ReactNode
}

export function StoreProvider({ children }: StoreProviderProps) {
    const { roles, store_ids, loading: permsLoading } = usePermissions()
    const [stores, setStores] = useState<Shop[]>([])
    const [currentStore, setCurrentStore] = useState<Shop | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const loadStores = async () => {
        // Wait for permissions to load before filtering
        if (permsLoading) return

        try {
            setLoading(true)
            setError(null)
            const allShops = await api.businessManagement.shops.getAll(true) as Shop[]

            // Filter shops if user is NOT an Admin
            const isAdmin = roles.includes('Admin')
            const data = isAdmin
                ? allShops
                : allShops.filter(shop => store_ids.includes(shop.id))

            setStores(data)

            // Auto-select first store if none selected
            if (data.length > 0) {
                // Try to restore from localStorage
                const savedStoreId = localStorage.getItem('poultry_current_store')
                let restoreStore: Shop | undefined

                if (savedStoreId) {
                    restoreStore = data.find(s => s.id === parseInt(savedStoreId))
                }

                // If saved store is valid for this user, use it; otherwise default to first available
                if (restoreStore) {
                    setCurrentStore(restoreStore)
                } else if (!currentStore || !data.find(s => s.id === currentStore.id)) {
                    setCurrentStore(data[0])
                }
            } else {
                setCurrentStore(null)
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load stores')
        } finally {
            setLoading(false)
        }
    }

    // Refresh stores when permissions change (e.g. login)
    useEffect(() => {
        loadStores()
    }, [roles, store_ids, permsLoading])

    // Save to localStorage when store changes
    useEffect(() => {
        if (currentStore) {
            localStorage.setItem('poultry_current_store', currentStore.id.toString())
        }
    }, [currentStore])

    const value: StoreContextType = {
        currentStore,
        setCurrentStore,
        stores,
        loading,
        error,
        refreshStores: loadStores,
    }

    return (
        <StoreContext.Provider value={value}>
            {children}
        </StoreContext.Provider>
    )
}
