'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus, Link, Activity, Clock, Award, TrendingUp, Store } from 'lucide-react'
import { WIDGET_TYPES, WidgetConfig } from '../../lib/hooks/useDashboard'
import { cn } from '../../lib/utils'
import { usePermissions, hasPermission } from '../../lib/auth/usePermissions'

// Widget type definition for WIDGET_TYPES array items
interface WidgetType {
    type: string
    name: string
    description: string
    icon: string
    permission?: string
}

// Icon mapping for widget types
const WIDGET_ICONS: Record<string, any> = {
    shortcuts: Link,
    'recent-activity': Activity,
    clock: Clock,
    'staff-points': Award,
    'sales-summary': TrendingUp,
    'store-summary': Store,
}

interface WidgetPickerProps {
    onAdd: (type: string) => Promise<boolean>
    existingWidgets: WidgetConfig[]
}

export function WidgetPicker({ onAdd, existingWidgets }: WidgetPickerProps) {
    const { permissions } = usePermissions()
    const [open, setOpen] = useState(false)
    const [adding, setAdding] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const existingTypes = new Set(existingWidgets.map(w => w.type))

    // Filter widgets by permission
    const availableWidgets = WIDGET_TYPES.filter(widget =>
        !widget.permission || hasPermission(permissions, widget.permission)
    )

    const handleAdd = async (type: string) => {
        setAdding(type)
        const success = await onAdd(type)
        setAdding(null)
        if (success) {
            setOpen(false)
        }
    }

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={() => setOpen(false)}
            />

            {/* Modal Container */}
            <div className="bg-card rounded-xl border shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col relative z-10 animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
                    <h2 className="text-lg font-semibold">Add Widget</h2>
                    <button onClick={() => setOpen(false)} className="p-2 hover:bg-accent rounded-full transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                    <p className="text-sm text-muted-foreground mb-4">
                        Select a widget to add to your dashboard
                    </p>

                    <div className="grid gap-3">
                        {availableWidgets.map((widget: WidgetType) => {
                            const Icon = WIDGET_ICONS[widget.type] || Link
                            const isAdded = existingTypes.has(widget.type)
                            const isAdding = adding === widget.type

                            return (
                                <button
                                    key={widget.type}
                                    onClick={() => !isAdded && handleAdd(widget.type)}
                                    disabled={isAdded || isAdding}
                                    className={cn(
                                        "flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-all",
                                        isAdded
                                            ? "border-muted bg-muted/50 opacity-50 cursor-not-allowed"
                                            : "border-transparent hover:border-primary hover:bg-accent focus:ring-2 focus:ring-primary/20 outline-none"
                                    )}
                                >
                                    <div className={cn(
                                        "w-12 h-12 rounded-lg flex items-center justify-center",
                                        isAdded ? "bg-muted" : "bg-primary/10"
                                    )}>
                                        <Icon className={cn(
                                            "h-6 w-6",
                                            isAdded ? "text-muted-foreground" : "text-primary"
                                        )} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium">{widget.name}</p>
                                        <p className="text-sm text-muted-foreground">{widget.description}</p>
                                    </div>
                                    {isAdded && (
                                        <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded font-medium">Added</span>
                                    )}
                                    {isAdding && (
                                        <span className="text-xs text-primary animate-pulse font-medium">Adding...</span>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className="px-6 py-4 border-t flex-shrink-0 bg-muted/30">
                    <button
                        onClick={() => setOpen(false)}
                        className="w-full px-4 py-2 border bg-background font-medium rounded-lg hover:bg-accent transition-colors shadow-sm"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    )

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all shadow-sm hover:shadow-md active:scale-95"
            >
                <Plus className="h-4 w-4" />
                Add Widget
            </button>

            {open && mounted && createPortal(modalContent, document.body)}
        </>
    )
}
