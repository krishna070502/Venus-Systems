'use client'

import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import {
    Link as LinkIcon,
    Plus,
    Trash2,
    Edit2,
    X,
    ExternalLink,
    ShoppingCart,
    Users,
    FileText,
    Settings,
    Home,
    BarChart3,
    Package,
    CreditCard,
    Truck,
    Store,
    Activity,
    Award,
    Calendar,
    Clock,
    Briefcase,
    Building,
    Search,
    ChevronDown,
    Check
} from 'lucide-react'
import { Shortcut } from '../../lib/hooks/useDashboard'
import { useAvailablePages, PAGE_ICONS, getIconName, AvailablePage } from '../../lib/hooks/useAvailablePages'
import { cn } from '../../lib/utils'

// Available icons for shortcuts
export const SHORTCUT_ICONS: Record<string, any> = {
    Link: LinkIcon,
    ShoppingCart,
    Users,
    FileText,
    Settings,
    Home,
    BarChart3,
    Package,
    CreditCard,
    Truck,
    Store,
    Activity,
    Award,
    Calendar,
    Clock,
    Briefcase,
    Building,
    ExternalLink,
    ...PAGE_ICONS
}

// Preset colors
export const SHORTCUT_COLORS = [
    '#1E4DD8', // Blue
    '#29C6D1', // Teal
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#6B7280', // Gray
]

interface ShortcutGridProps {
    shortcuts: Shortcut[]
    onAdd: (shortcut: Omit<Shortcut, 'id' | 'user_id' | 'position'>) => Promise<boolean>
    onUpdate: (id: string, updates: Partial<Shortcut>) => Promise<boolean>
    onDelete: (id: string) => Promise<boolean>
    editable?: boolean
    isEditMode?: boolean
}

export function ShortcutGrid({ shortcuts, onAdd, onUpdate, onDelete, editable = true, isEditMode = false }: ShortcutGridProps) {
    const [showAddModal, setShowAddModal] = useState(false)
    const [editingShortcut, setEditingShortcut] = useState<Shortcut | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        href: '',
        icon: 'Link',
        color: '#1E4DD8'
    })
    const [saving, setSaving] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [showPagePicker, setShowPagePicker] = useState(false)
    const [pageSearch, setPageSearch] = useState('')

    const { pages: availablePages, groupedPages, loading: pagesLoading } = useAvailablePages()

    // Filter pages based on search
    const filteredPages = useMemo(() => {
        if (!pageSearch) return availablePages
        const search = pageSearch.toLowerCase()
        return availablePages.filter(page =>
            page.name.toLowerCase().includes(search) ||
            page.category.toLowerCase().includes(search) ||
            page.href.toLowerCase().includes(search)
        )
    }, [availablePages, pageSearch])

    // Group filtered pages by category
    const filteredGroupedPages = useMemo(() => {
        const groups: Record<string, AvailablePage[]> = {}
        filteredPages.forEach(page => {
            if (!groups[page.category]) {
                groups[page.category] = []
            }
            groups[page.category].push(page)
        })
        return groups
    }, [filteredPages])

    useEffect(() => {
        setMounted(true)
    }, [])

    const resetForm = () => {
        setFormData({ name: '', href: '', icon: 'Link', color: '#1E4DD8' })
        setEditingShortcut(null)
        setPageSearch('')
        setShowPagePicker(false)
    }

    const openAddModal = () => {
        resetForm()
        setShowAddModal(true)
    }

    const openEditModal = (shortcut: Shortcut) => {
        setFormData({
            name: shortcut.name,
            href: shortcut.href,
            icon: shortcut.icon,
            color: shortcut.color
        })
        setEditingShortcut(shortcut)
        setShowAddModal(true)
    }

    const handleSelectPage = (page: AvailablePage) => {
        setFormData({
            ...formData,
            name: page.name,
            href: page.href,
            icon: getIconName(page.icon)
        })
        setShowPagePicker(false)
        setPageSearch('')
    }

    const handleSave = async () => {
        if (!formData.name || !formData.href) return

        setSaving(true)
        let success = false

        if (editingShortcut) {
            success = await onUpdate(editingShortcut.id, formData)
        } else {
            success = await onAdd(formData)
        }

        setSaving(false)
        if (success) {
            setShowAddModal(false)
            resetForm()
        }
    }

    const handleDelete = async (shortcut: Shortcut) => {
        if (!confirm(`Delete "${shortcut.name}" shortcut?`)) return
        await onDelete(shortcut.id)
    }

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={() => setShowAddModal(false)}
            />

            {/* Modal Container */}
            <div className="bg-card rounded-xl border shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col relative z-10 animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
                    <h2 className="text-lg font-semibold">
                        {editingShortcut ? 'Edit Shortcut' : 'Add Shortcut'}
                    </h2>
                    <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-accent rounded-full transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                    {/* Page Picker - NEW */}
                    {!editingShortcut && (
                        <div>
                            <label className="block text-sm font-medium mb-2">Quick Select Page</label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowPagePicker(!showPagePicker)}
                                    className="w-full px-3 py-2.5 border rounded-lg bg-background flex items-center justify-between hover:bg-accent/50 transition-colors text-left"
                                >
                                    <span className={formData.href ? "text-foreground" : "text-muted-foreground"}>
                                        {formData.href ? `${formData.name} (${formData.href})` : 'Select a page from your sidebar...'}
                                    </span>
                                    <ChevronDown className={cn("h-4 w-4 transition-transform", showPagePicker && "rotate-180")} />
                                </button>

                                {showPagePicker && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-xl z-20 max-h-64 overflow-hidden flex flex-col">
                                        {/* Search */}
                                        <div className="p-2 border-b">
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <input
                                                    type="text"
                                                    value={pageSearch}
                                                    onChange={(e) => setPageSearch(e.target.value)}
                                                    placeholder="Search pages..."
                                                    className="w-full pl-8 pr-3 py-2 text-sm border rounded-md bg-background"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>

                                        {/* Pages List */}
                                        <div className="flex-1 overflow-y-auto max-h-48">
                                            {pagesLoading ? (
                                                <div className="p-4 text-center text-muted-foreground text-sm">Loading pages...</div>
                                            ) : filteredPages.length === 0 ? (
                                                <div className="p-4 text-center text-muted-foreground text-sm">No pages found</div>
                                            ) : (
                                                Object.entries(filteredGroupedPages).map(([category, pages]) => (
                                                    <div key={category}>
                                                        <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                                                            {category}
                                                        </div>
                                                        {pages.map((page) => {
                                                            const Icon = page.icon
                                                            const isSelected = formData.href === page.href
                                                            return (
                                                                <button
                                                                    key={page.href}
                                                                    onClick={() => handleSelectPage(page)}
                                                                    className={cn(
                                                                        "w-full px-3 py-2 flex items-center gap-2 hover:bg-accent transition-colors text-left text-sm",
                                                                        isSelected && "bg-primary/10"
                                                                    )}
                                                                >
                                                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                                                    <span className="flex-1">{page.name}</span>
                                                                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Only pages you have permission to access are shown
                            </p>
                        </div>
                    )}

                    {/* Divider */}
                    {!editingShortcut && (
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex-1 h-px bg-border" />
                            <span>or customize manually</span>
                            <div className="flex-1 h-px bg-border" />
                        </div>
                    )}

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            placeholder="e.g., Sales Dashboard"
                        />
                    </div>

                    {/* URL */}
                    <div>
                        <label className="block text-sm font-medium mb-1">URL</label>
                        <input
                            type="text"
                            value={formData.href}
                            onChange={(e) => setFormData({ ...formData, href: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            placeholder="e.g., /admin/business/sales"
                        />
                    </div>

                    {/* Icon */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Icon</label>
                        <div className="grid grid-cols-8 gap-1.5 bg-muted/30 p-2 rounded-lg max-h-32 overflow-y-auto">
                            {Object.keys(SHORTCUT_ICONS).slice(0, 32).map((iconName) => {
                                const Icon = SHORTCUT_ICONS[iconName]
                                return (
                                    <button
                                        key={iconName}
                                        onClick={() => setFormData({ ...formData, icon: iconName })}
                                        className={cn(
                                            "p-2 rounded-lg border-2 transition-all hover:scale-110",
                                            formData.icon === iconName ? "border-primary bg-primary/10" : "border-transparent hover:bg-background"
                                        )}
                                        title={iconName}
                                    >
                                        <Icon className="h-4 w-4 mx-auto" style={{ color: formData.color }} />
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Color */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Color</label>
                        <div className="flex flex-wrap gap-2 justify-between">
                            {SHORTCUT_COLORS.map((color) => (
                                <button
                                    key={color}
                                    onClick={() => setFormData({ ...formData, color })}
                                    className={cn(
                                        "w-8 h-8 rounded-full border-2 transition-all hover:scale-110 shadow-sm",
                                        formData.color === color ? "border-foreground ring-2 ring-primary/20" : "border-transparent"
                                    )}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t flex items-center justify-end gap-3 flex-shrink-0 bg-muted/30">
                    <button
                        onClick={() => setShowAddModal(false)}
                        className="px-4 py-2 border bg-background font-medium rounded-lg hover:bg-accent transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !formData.name || !formData.href}
                        className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : (editingShortcut ? 'Update' : 'Add')}
                    </button>
                </div>
            </div>
        </div>
    )

    return (
        <div className="space-y-4">
            {/* Shortcuts Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {shortcuts.map((shortcut) => {
                    const Icon = SHORTCUT_ICONS[shortcut.icon] || LinkIcon
                    return (
                        <div
                            key={shortcut.id}
                            className="group relative"
                        >
                            <Link
                                href={shortcut.href}
                                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-transparent bg-card hover:border-primary/30 hover:shadow-lg transition-all"
                            >
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                                    style={{ backgroundColor: `${shortcut.color}15` }}
                                >
                                    <Icon className="h-6 w-6" style={{ color: shortcut.color }} />
                                </div>
                                <span className="text-sm font-medium text-center line-clamp-2">{shortcut.name}</span>
                            </Link>

                            {/* Edit/Delete buttons */}
                            {editable && isEditMode && (
                                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => { e.preventDefault(); openEditModal(shortcut) }}
                                        className="p-1 rounded bg-white shadow-sm hover:bg-accent"
                                        title="Edit"
                                    >
                                        <Edit2 className="h-3 w-3 text-muted-foreground" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.preventDefault(); handleDelete(shortcut) }}
                                        className="p-1 rounded bg-white shadow-sm hover:bg-red-50"
                                        title="Delete"
                                    >
                                        <Trash2 className="h-3 w-3 text-red-500" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )
                })}

                {/* Add Shortcut Button */}
                {editable && isEditMode && (
                    <button
                        onClick={openAddModal}
                        className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-accent/50 transition-all min-h-[100px]"
                    >
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                            <Plus className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <span className="text-sm text-muted-foreground">Add Shortcut</span>
                    </button>
                )}
            </div>

            {showAddModal && mounted && createPortal(modalContent, document.body)}
        </div>
    )
}
