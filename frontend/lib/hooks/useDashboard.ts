'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiRequest } from '../api/client'
import { useAuth } from '@/lib/auth/AuthProvider'

// Types
export interface WidgetConfig {
    id: string
    type: string
    position: number
    size: 'full' | 'half' | 'quarter'
}

export interface DashboardLayout {
    columns: number
    widgets: WidgetConfig[]
}

export interface DashboardConfig {
    id?: string
    user_id: string
    layout: DashboardLayout
    theme: string
}

export interface Shortcut {
    id: string
    user_id: string
    name: string
    href: string
    icon: string
    color: string
    position: number
}

export interface HomepagePreference {
    user_id: string
    homepage: 'dashboard' | 'admin'
}

// Available widget types
export const WIDGET_TYPES = [
    { type: 'shortcuts', name: 'Quick Links', description: 'Your custom shortcuts', icon: 'Link', permission: 'dashboard.widget.shortcuts' },
    { type: 'recent-activity', name: 'Recent Activity', description: 'Your recent actions', icon: 'Activity', permission: 'dashboard.widget.recent-activity' },
    { type: 'clock', name: 'Clock & Date', description: 'Current time and date', icon: 'Clock', permission: 'dashboard.widget.clock' },
    { type: 'store-summary', name: 'Store Summary', description: 'Current store overview', icon: 'Store', permission: 'dashboard.widget.store-summary' },
    { type: 'sales-summary', name: 'Sales Summary', description: 'Today\'s sales overview', icon: 'TrendingUp', permission: 'dashboard.widget.sales-summary' },
    { type: 'staff-points', name: 'My Points', description: 'Your staff points balance', icon: 'Award', permission: 'dashboard.widget.staff-points' },
]

// Default config when API fails or tables don't exist
const DEFAULT_CONFIG: DashboardConfig = {
    user_id: '',
    layout: {
        columns: 2,
        widgets: [
            { id: 'shortcuts', type: 'shortcuts', position: 0, size: 'full' },
            { id: 'recent-activity', type: 'recent-activity', position: 1, size: 'half' },
            { id: 'clock', type: 'clock', position: 2, size: 'half' },
        ]
    },
    theme: 'default'
}

export function useDashboard() {
    const { user, loading: authLoading } = useAuth()
    const [config, setConfig] = useState<DashboardConfig>(DEFAULT_CONFIG)
    const [shortcuts, setShortcuts] = useState<Shortcut[]>([])
    const [homepagePreference, setHomepagePreference] = useState<HomepagePreference | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [tablesExist, setTablesExist] = useState(true)

    // Load dashboard config
    const loadConfig = useCallback(async () => {
        try {
            const data = await apiRequest<DashboardConfig>('/api/v1/user/dashboard/config')
            setConfig(data)
            setTablesExist(true)
        } catch (err: any) {
            console.error('Failed to load dashboard config:', err)
            // If table doesn't exist, use defaults silently
            if (err.message?.includes('PGRST205') || err.message?.includes('schema cache')) {
                setTablesExist(false)
            }
            setConfig(DEFAULT_CONFIG)
        }
    }, [])

    // Load shortcuts
    const loadShortcuts = useCallback(async () => {
        try {
            const data = await apiRequest<Shortcut[]>('/api/v1/user/dashboard/shortcuts')
            setShortcuts(data)
        } catch (err: any) {
            console.error('Failed to load shortcuts:', err)
            setShortcuts([])
        }
    }, [])

    // Load homepage preference
    const loadHomepagePreference = useCallback(async () => {
        try {
            const data = await apiRequest<HomepagePreference>('/api/v1/user/dashboard/homepage-preference')
            setHomepagePreference(data)
        } catch (err: any) {
            console.error('Failed to load homepage preference:', err)
        }
    }, [])

    // Initial load
    useEffect(() => {
        if (authLoading) return

        if (!user) {
            setConfig(DEFAULT_CONFIG)
            setShortcuts([])
            setHomepagePreference(null)
            setLoading(false)
            return
        }

        const loadAll = async () => {
            setLoading(true)
            await Promise.all([loadConfig(), loadShortcuts(), loadHomepagePreference()])
            setLoading(false)
        }
        loadAll()
    }, [user, authLoading, loadConfig, loadShortcuts, loadHomepagePreference])

    // Save dashboard layout (only if tables exist)
    const saveLayout = async (layout: DashboardLayout) => {
        if (!tablesExist) {
            // Just update local state
            setConfig(prev => ({ ...prev, layout }))
            return true
        }

        try {
            const data = await apiRequest<DashboardConfig>('/api/v1/user/dashboard/config', {
                method: 'PUT',
                body: JSON.stringify({ layout })
            })
            setConfig(data)
            return true
        } catch (err: any) {
            setError(err.message || 'Failed to save layout')
            return false
        }
    }

    // Add widget
    const addWidget = async (type: string) => {
        const newWidget: WidgetConfig = {
            id: `${type}-${Date.now()}`,
            type,
            position: config.layout.widgets.length,
            size: type === 'shortcuts' ? 'full' : 'half'
        }

        const newLayout = {
            ...config.layout,
            widgets: [...config.layout.widgets, newWidget]
        }

        return saveLayout(newLayout)
    }

    // Remove widget
    const removeWidget = async (widgetId: string) => {
        const newLayout = {
            ...config.layout,
            widgets: config.layout.widgets.filter(w => w.id !== widgetId)
        }

        return saveLayout(newLayout)
    }

    // Move widget (position reordering)
    const moveWidget = async (widgetId: string, direction: 'up' | 'down') => {
        const widgets = [...config.layout.widgets]
        const index = widgets.findIndex(w => w.id === widgetId)
        if (index === -1) return false

        const newIndex = direction === 'up' ? index - 1 : index + 1
        if (newIndex < 0 || newIndex >= widgets.length) return false

        // Swap
        const temp = widgets[index]
        widgets[index] = widgets[newIndex]
        widgets[newIndex] = temp

        // Update positions
        const updatedWidgets = widgets.map((w, i) => ({ ...w, position: i }))

        return saveLayout({ ...config.layout, widgets: updatedWidgets })
    }

    // Add shortcut
    const addShortcut = async (shortcut: Omit<Shortcut, 'id' | 'user_id' | 'position'>) => {
        if (!tablesExist) {
            // Just update local state with a fake ID
            const newShortcut: Shortcut = {
                ...shortcut,
                id: `temp-${Date.now()}`,
                user_id: '',
                position: shortcuts.length
            }
            setShortcuts(prev => [...prev, newShortcut])
            return true
        }

        try {
            const data = await apiRequest<Shortcut>('/api/v1/user/dashboard/shortcuts', {
                method: 'POST',
                body: JSON.stringify(shortcut)
            })
            setShortcuts(prev => [...prev, data])
            return true
        } catch (err: any) {
            setError(err.message || 'Failed to add shortcut')
            return false
        }
    }

    // Update shortcut
    const updateShortcut = async (id: string, updates: Partial<Shortcut>) => {
        if (!tablesExist) {
            setShortcuts(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
            return true
        }

        try {
            const data = await apiRequest<Shortcut>(`/api/v1/user/dashboard/shortcuts/${id}`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            })
            setShortcuts(prev => prev.map(s => s.id === id ? data : s))
            return true
        } catch (err: any) {
            setError(err.message || 'Failed to update shortcut')
            return false
        }
    }

    // Delete shortcut
    const deleteShortcut = async (id: string) => {
        if (!tablesExist) {
            setShortcuts(prev => prev.filter(s => s.id !== id))
            return true
        }

        try {
            await apiRequest(`/api/v1/user/dashboard/shortcuts/${id}`, {
                method: 'DELETE'
            })
            setShortcuts(prev => prev.filter(s => s.id !== id))
            return true
        } catch (err: any) {
            setError(err.message || 'Failed to delete shortcut')
            return false
        }
    }

    // Update homepage preference
    const updateHomepagePreference = async (homepage: 'dashboard' | 'admin') => {
        if (!tablesExist) {
            setHomepagePreference({ user_id: '', homepage })
            return true
        }

        try {
            const data = await apiRequest<HomepagePreference>('/api/v1/user/dashboard/homepage-preference', {
                method: 'PUT',
                body: JSON.stringify({ homepage })
            })
            setHomepagePreference(data)
            return true
        } catch (err: any) {
            setError(err.message || 'Failed to update homepage preference')
            return false
        }
    }

    return {
        config,
        shortcuts,
        homepagePreference,
        loading,
        error,
        tablesExist,
        saveLayout,
        addWidget,
        removeWidget,
        addShortcut,
        updateShortcut,
        deleteShortcut,
        moveWidget,
        updateHomepagePreference,
        refresh: () => {
            if (!user) return Promise.resolve()
            return Promise.all([loadConfig(), loadShortcuts()])
        }
    }
}
