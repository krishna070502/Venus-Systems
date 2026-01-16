'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import { PageLoading, LoadingSpinner } from '@/components/ui/loading'
import { useAlert } from '@/components/ui/alert-modal'
import {
    Shield,
    Database,
    Settings,
    History,
    Eye,
    Check,
    X,
    Save,
    Lock,
    Unlock,
    Zap,
    Search,
    Filter,
    AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIConfig {
    id: number
    role_id: number
    role_name: string
    enabled: boolean
    allowed_tables: string[]
    allowed_pages: string[]
    can_execute_actions: boolean
    max_queries_per_hour: number
}

const ALL_AVAILABLE_TABLES = [
    'profiles', 'roles', 'permissions', 'role_permissions', 'user_roles',
    'shops', 'user_sessions', 'audit_logs', 'system_settings', 'manager_details', 'user_shops',
    'suppliers', 'purchases', 'purchase_items', 'skus', 'sku_store_prices',
    'inventory_ledger', 'current_stock_view', 'processing_entries', 'wastage_config',
    'sales', 'sale_items', 'customers', 'customer_ledger', 'receipts', 'payments',
    'settlements', 'variance_records', 'expenses', 'staff_points', 'staff_points_config',
    'staff_grading_config', 'points_reason_codes', 'monthly_performance',
    'ai_conversations', 'ai_messages', 'knowledge_base'
].sort()

const ALL_AVAILABLE_PAGES = [
    'dashboard', 'users', 'roles', 'permissions', 'shops', 'managers',
    'inventory', 'skus', 'processing', 'purchases', 'suppliers', 'sales',
    'pos', 'customers', 'receipts', 'payments', 'settlements', 'variance',
    'finance', 'reports', 'staff-points', 'leaderboard', '*'
].sort()

export default function AIConfigDashboard() {
    const [configs, setConfigs] = useState<AIConfig[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedRole, setSelectedRole] = useState<AIConfig | null>(null)
    const [activeTab, setActiveTab] = useState<'access' | 'scope' | 'limits' | 'preview'>('access')
    const [isSaving, setIsSaving] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    // Form state
    const [formState, setFormState] = useState<Partial<AIConfig>>({})

    const { showError, showSuccess } = useAlert()

    useEffect(() => {
        loadConfigs()
    }, [])

    const loadConfigs = async () => {
        try {
            setLoading(true)
            const data = await api.ai.getConfigs() as AIConfig[]
            setConfigs(data)
            if (data.length > 0 && !selectedRole) {
                setSelectedRole(data[0])
                setFormState(data[0])
            }
        } catch (error) {
            console.error('Failed to load AI configs:', error)
            showError((error as Error).message, 'Configuration Error')
        } finally {
            setLoading(false)
        }
    }

    const handleSelectRole = (config: AIConfig) => {
        setSelectedRole(config)
        setFormState(config)
    }

    const toggleTable = (table: string) => {
        const current = formState.allowed_tables || []
        const updated = current.includes(table)
            ? current.filter(t => t !== table)
            : [...current, table]
        setFormState(prev => ({ ...prev, allowed_tables: updated }))
    }

    const togglePage = (page: string) => {
        const current = formState.allowed_pages || []
        const updated = current.includes(page)
            ? current.filter(p => p !== page)
            : [...current, page]
        setFormState(prev => ({ ...prev, allowed_pages: updated }))
    }

    const handleSave = async () => {
        if (!selectedRole || !selectedRole.id) return

        try {
            setIsSaving(true)
            await api.ai.updateConfig(selectedRole.id, formState)
            showSuccess(`Configuration for ${selectedRole.role_name} updated successfully`)
            await loadConfigs()
        } catch (error) {
            showError((error as Error).message, 'Update Failed')
        } finally {
            setIsSaving(false)
        }
    }

    if (loading) return <PageLoading text="Loading AI configurations..." />

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Roles Sidebar */}
            <div className="lg:col-span-1 space-y-4">
                <Card className="h-full">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Shield className="h-5 w-5 text-indigo-500" />
                            Roles
                        </CardTitle>
                        <CardDescription>Manage AI per role</CardDescription>
                    </CardHeader>
                    <CardContent className="p-2">
                        <div className="space-y-1">
                            {configs.map(config => (
                                <button
                                    key={config.id}
                                    onClick={() => handleSelectRole(config)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm transition-all",
                                        selectedRole?.id === config.id
                                            ? "bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm"
                                            : "hover:bg-gray-50 text-gray-600 border border-transparent"
                                    )}
                                >
                                    <div className="flex flex-col items-start">
                                        <span className="font-medium">{config.role_name}</span>
                                        <Badge variant={config.enabled ? "default" : "secondary"} className="mt-1 text-[10px] py-0">
                                            {config.enabled ? 'Enabled' : 'Disabled'}
                                        </Badge>
                                    </div>
                                    <ChevronRight className={cn(
                                        "h-4 w-4 transition-transform",
                                        selectedRole?.id === config.id ? "translate-x-1" : "opacity-30"
                                    )} />
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Config Panels */}
            <div className="lg:col-span-3 space-y-6">
                {!selectedRole ? (
                    <Card className="h-64 flex items-center justify-center">
                        <p className="text-muted-foreground italic">Select a role to configure Invy access</p>
                    </Card>
                ) : (
                    <>
                        <Card className="overflow-hidden border-indigo-100">
                            <CardHeader className="bg-indigo-50/50 border-b pb-4">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-200">
                                            <Wand2 className="h-7 w-7 text-white" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-xl">Invy for {selectedRole.role_name}</CardTitle>
                                            <CardDescription>Control AI capabilities and data boundaries</CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={loadConfigs}>
                                            <RefreshCw className="h-4 w-4 mr-2" /> Reset
                                        </Button>
                                        <Button size="sm" onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700">
                                            {isSaving ? <LoadingSpinner size="sm" text="" className="mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                            Save Changes
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>

                            {/* Tabs Navigation */}
                            <div className="flex border-b bg-white">
                                {[
                                    { id: 'access', label: 'Access Control', icon: Shield },
                                    { id: 'scope', label: 'Data Scope', icon: Database },
                                    { id: 'limits', label: 'Limits & Guardrails', icon: Settings },
                                    { id: 'preview', label: 'Permission Preview', icon: Eye }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={cn(
                                            "flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all border-b-2",
                                            activeTab === tab.id
                                                ? "border-indigo-600 text-indigo-600 bg-indigo-50/30"
                                                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50"
                                        )}
                                    >
                                        <tab.icon className="h-4 w-4" />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <CardContent className="pt-6 min-h-[400px]">
                                {activeTab === 'access' && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between p-4 rounded-xl border bg-gray-50/50">
                                                    <div className="space-y-0.5">
                                                        <Label className="text-base font-semibold">Enable Invy AI</Label>
                                                        <p className="text-sm text-muted-foreground">Allow users with this role to chat with Invy</p>
                                                    </div>
                                                    <button
                                                        onClick={() => setFormState(prev => ({ ...prev, enabled: !prev.enabled }))}
                                                        className={cn(
                                                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
                                                            formState.enabled ? "bg-indigo-600" : "bg-gray-200"
                                                        )}
                                                    >
                                                        <span className={cn(
                                                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                                            formState.enabled ? "translate-x-6" : "translate-x-1"
                                                        )} />
                                                    </button>
                                                </div>

                                                <div className="flex items-center justify-between p-4 rounded-xl border bg-gray-50/50">
                                                    <div className="space-y-0.5">
                                                        <Label className="text-base font-semibold">Full Action Mode</Label>
                                                        <p className="text-sm text-muted-foreground">Allow Invy to execute database actions (mutations)</p>
                                                    </div>
                                                    <button
                                                        onClick={() => setFormState(prev => ({ ...prev, can_execute_actions: !prev.can_execute_actions }))}
                                                        className={cn(
                                                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
                                                            formState.can_execute_actions ? "bg-indigo-600" : "bg-gray-200"
                                                        )}
                                                    >
                                                        <span className={cn(
                                                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                                            formState.can_execute_actions ? "translate-x-6" : "translate-x-1"
                                                        )} />
                                                    </button>
                                                </div>
                                            </div>

                                            <Card className="bg-indigo-900 text-indigo-50 border-none shadow-xl">
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                                        <Zap className="h-4 w-4 text-amber-400" />
                                                        Access Mode Note
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-xs space-y-3 opacity-90">
                                                        <div className="p-3 bg-white/10 rounded-lg">
                                                            <p className="font-bold text-amber-300 mb-1">READ-ONLY MODE (Suggested for Staff)</p>
                                                            <p>Invy can answer questions based on documentation and database query results, but cannot change data.</p>
                                                        </div>
                                                        <div className="p-3 bg-white/10 rounded-lg">
                                                            <p className="font-bold text-green-300 mb-1">FULL ACTION MODE (Suggested for Admin)</p>
                                                            <p>Invy can call tools that update knowledge bases, settings, and other operational values.</p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'scope' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="flex flex-col md:flex-row gap-4 mb-4">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    placeholder="Search tables..."
                                                    className="pl-9"
                                                    value={searchQuery}
                                                    onChange={e => setSearchQuery(e.target.value)}
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" onClick={() => setFormState(prev => ({ ...prev, allowed_tables: ALL_AVAILABLE_TABLES }))}>Select All</Button>
                                                <Button variant="outline" size="sm" onClick={() => setFormState(prev => ({ ...prev, allowed_tables: [] }))}>Deselect All</Button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[400px] overflow-y-auto p-1">
                                            {ALL_AVAILABLE_TABLES.filter(t => t.includes(searchQuery.toLowerCase())).map(table => (
                                                <button
                                                    key={table}
                                                    onClick={() => toggleTable(table)}
                                                    className={cn(
                                                        "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all text-left",
                                                        formState.allowed_tables?.includes(table)
                                                            ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                                                            : "bg-white border-gray-100 text-gray-500 hover:border-gray-300"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "h-4 w-4 rounded-full border flex items-center justify-center flex-shrink-0",
                                                        formState.allowed_tables?.includes(table) ? "bg-indigo-500 border-indigo-500" : "bg-white border-gray-300"
                                                    )}>
                                                        {formState.allowed_tables?.includes(table) && <Check className="h-3 w-3 text-white" />}
                                                    </div>
                                                    <span className="truncate">{table}</span>
                                                </button>
                                            ))}
                                        </div>

                                        <div className="pt-4 border-t">
                                            <Label className="text-sm font-semibold mb-3 block">Allowed Pages (Navigation Context)</Label>
                                            <div className="flex flex-wrap gap-2">
                                                {ALL_AVAILABLE_PAGES.map(page => (
                                                    <Badge
                                                        key={page}
                                                        variant={formState.allowed_pages?.includes(page) ? "default" : "outline"}
                                                        className={cn(
                                                            "cursor-pointer px-3 py-1",
                                                            formState.allowed_pages?.includes(page) ? "bg-indigo-600" : "text-gray-500"
                                                        )}
                                                        onClick={() => togglePage(page)}
                                                    >
                                                        {page}
                                                    </Badge>
                                                ))}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground mt-3 italic">
                                                * Strictly Allow-List Only. If a table is not selected, Invy is architecturally blocked from querying it.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'limits' && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="max-w-md space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="query_limit" className="text-base font-semibold">Max Queries Per Hour</Label>
                                                <div className="flex items-center gap-4">
                                                    <Input
                                                        id="query_limit"
                                                        type="number"
                                                        value={formState.max_queries_per_hour}
                                                        onChange={e => setFormState(prev => ({ ...prev, max_queries_per_hour: parseInt(e.target.value) }))}
                                                        className="w-32"
                                                    />
                                                    <span className="text-sm text-muted-foreground">queries / session hour</span>
                                                </div>
                                                <p className="text-sm text-muted-foreground">Prevents API abuse and token cost overruns for this role.</p>
                                            </div>

                                            <div className="pt-6 border-t">
                                                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex gap-4">
                                                    <AlertCircle className="h-6 w-6 text-amber-500 flex-shrink-0" />
                                                    <div className="text-sm text-amber-800">
                                                        <p className="font-bold mb-1">Safety Guardrail</p>
                                                        <p>Once this limit is reached, Invy will automatically respond with a graceful rate-limit message until the hour resets.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'preview' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                        <Card className="bg-gray-900 border-none shadow-2xl overflow-hidden">
                                            <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
                                                <div className="flex gap-1.5">
                                                    <div className="h-3 w-3 rounded-full bg-red-500" />
                                                    <div className="h-3 w-3 rounded-full bg-amber-500" />
                                                    <div className="h-3 w-3 rounded-full bg-green-500" />
                                                </div>
                                                <span className="text-[10px] text-gray-400 font-mono">Effective AI Permissions Profile</span>
                                            </div>
                                            <CardContent className="p-6 font-mono text-xs">
                                                <div className="space-y-4 text-indigo-300">
                                                    <div>
                                                        <span className="text-gray-500"># Identity Profile</span>
                                                        <p className="text-white mt-1">ROLE: <span className="text-indigo-400">{selectedRole.role_name}</span></p>
                                                        <p className="text-white">STATUS: <span className={formState.enabled ? "text-green-400" : "text-red-400"}>{formState.enabled ? 'ACTIVE' : 'DISABLED'}</span></p>
                                                    </div>

                                                    <div className="pt-2">
                                                        <span className="text-gray-500"># Access Boundaries (Strict Allow-List Only)</span>
                                                        <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-2">
                                                            <div className="flex justify-between border-b border-gray-800 pb-1">
                                                                <span className="text-gray-400">Database Queries</span>
                                                                <span className={formState.allowed_tables?.length ? "text-green-400" : "text-red-400"}>
                                                                    {formState.allowed_tables?.length ? 'ALLOWED' : 'BLOCKED'}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between border-b border-gray-800 pb-1">
                                                                <span className="text-gray-400">Action Execution</span>
                                                                <span className={formState.can_execute_actions ? "text-amber-400" : "text-gray-500"}>
                                                                    {formState.can_execute_actions ? 'PERMITTED' : 'RESTRICTED'}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between border-b border-gray-800 pb-1">
                                                                <span className="text-gray-400">Max Query/Hour</span>
                                                                <span className="text-white">{formState.max_queries_per_hour}</span>
                                                            </div>
                                                            <div className="flex justify-between border-b border-gray-800 pb-1">
                                                                <span className="text-gray-400">Knowledge Depth</span>
                                                                <span className="text-indigo-400">FULL (SOPs + RAG)</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="pt-2">
                                                        <span className="text-gray-500"># Visible Data (Relational Scope)</span>
                                                        <div className="mt-2 flex flex-wrap gap-2 uppercase tracking-tighter opacity-80">
                                                            {formState.allowed_tables?.slice(0, 10).map(t => (
                                                                <span key={t} className="bg-indigo-500/10 px-1 border border-indigo-500/20">[{t}]</span>
                                                            ))}
                                                            {(formState.allowed_tables?.length || 0) > 10 && (
                                                                <span className="text-gray-500">... (+{(formState.allowed_tables?.length || 0) - 10} more)</span>
                                                            )}
                                                            {(!formState.allowed_tables || formState.allowed_tables.length === 0) && (
                                                                <span className="text-red-400 font-bold underline">!!! NO DATABASE TABLES VISIBLE !!!</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex gap-4">
                                            <Shield className="h-6 w-6 text-gray-500 flex-shrink-0" />
                                            <div className="text-sm">
                                                <p className="font-bold mb-1">Architecture Note</p>
                                                <p className="text-muted-foreground">Invy's system prompt is dynamically injected with these boundaries. If a user asks a question outside this scope, Invy will self-regulate or the backend will block the tool execution.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </div>
    )
}

function RefreshCw(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
}

function Wand2(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.21 1.21 0 0 0 1.72 0L21.64 5.36a1.21 1.21 0 0 0 0-1.72Z"></path><path d="m14 7 3 3"></path><path d="M5 6v4"></path><path d="M19 14v4"></path><path d="M10 2v2"></path><path d="M7 8H3"></path><path d="M21 16h-4"></path><path d="M11 3H9"></path></svg>
}

function ChevronRight(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
}
