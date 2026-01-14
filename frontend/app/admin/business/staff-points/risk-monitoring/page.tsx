'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api/client'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { FraudFlagUser, RiskLevel } from '@/lib/types/poultry'
import {
    ShieldAlert,
    AlertTriangle,
    Users,
    Loader2,
    ArrowLeft,
    Store,
    Calendar,
    Search,
    UserX,
    UserCheck,
    Info,
    ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

interface Shop {
    id: number
    name: string
}

export default function RiskMonitoringPage() {
    const [shops, setShops] = useState<Shop[]>([])
    const [selectedShopId, setSelectedShopId] = useState<string>('all')
    const [atRiskUsers, setAtRiskUsers] = useState<FraudFlagUser[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [riskFilter, setRiskFilter] = useState<'ALL' | RiskLevel>('ALL')

    const fetchData = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const storeId = selectedShopId !== 'all' ? parseInt(selectedShopId) : undefined
            const [shopsData, flagsData] = await Promise.all([
                api.businessManagement.shops.getAll(true),
                api.poultry.grading.getFraudFlags(storeId as any) // Backend takes Header for storeId
            ])

            setShops(shopsData as Shop[])
            setAtRiskUsers((flagsData as any).users || [])
        } catch (err: any) {
            setError(err.message || 'Failed to load risk data')
        } finally {
            setLoading(false)
        }
    }, [selectedShopId])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const filteredUsers = atRiskUsers.filter(user => {
        const matchesSearch =
            user.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.user_email?.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesRisk = riskFilter === 'ALL' || user.risk_level === riskFilter

        return matchesSearch && matchesRisk
    })

    return (
        <PermissionGuard permission="staffgrading.view">
            <div className="p-6 max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin/business/staff-points"
                            className="p-2 border rounded-xl hover:bg-accent transition-colors shadow-sm bg-card"
                        >
                            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                        </Link>
                        <div className="h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                            <ShieldAlert className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Risk Monitoring</h1>
                            <p className="text-sm text-muted-foreground font-medium uppercase tracking-tighter">Fraud & Performance Alert Dashboard</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Select value={selectedShopId} onValueChange={setSelectedShopId}>
                            <SelectTrigger className="w-[180px]">
                                <Store className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="All Stores" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Stores</SelectItem>
                                {shops.map(shop => (
                                    <SelectItem key={shop.id} value={shop.id.toString()}>{shop.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                {/* Filters & Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-card border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                        />
                    </div>
                    <div>
                        <Select value={riskFilter} onValueChange={(v: any) => setRiskFilter(v)}>
                            <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="Filter by Risk" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Risk Levels</SelectItem>
                                <SelectItem value="HIGH">High Risk Only</SelectItem>
                                <SelectItem value="MEDIUM">Medium Risk Only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center justify-center px-4 py-2 bg-card border rounded-xl font-bold text-sm">
                        <span className="text-muted-foreground mr-2 font-medium">Total At-Risk:</span>
                        <span className="text-red-600">{atRiskUsers.length}</span>
                    </div>
                </div>

                {/* Grid Layout */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-muted-foreground font-medium">Analyzing staff performance patterns...</p>
                    </div>
                ) : filteredUsers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredUsers.map((user) => (
                            <div key={user.id} className="bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group">
                                {/* Risk Header */}
                                <div className={cn(
                                    "p-4 flex items-center justify-between border-b",
                                    user.risk_level === 'HIGH' ? "bg-red-500/5 text-red-700" : "bg-orange-500/5 text-orange-700"
                                )}>
                                    <div className="flex items-center gap-2">
                                        {user.risk_level === 'HIGH' ? <ShieldAlert className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                                        <span className="text-xs font-black uppercase tracking-widest">{user.risk_level} RISK</span>
                                    </div>
                                    {user.is_suspended ? (
                                        <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-black rounded-full shadow-sm">SUSPENDED</span>
                                    ) : (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-black rounded-full border border-green-200">ACTIVE</span>
                                    )}
                                </div>

                                <div className="p-5 space-y-4 flex-1">
                                    {/* User Info */}
                                    <div>
                                        <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{user.user_name || 'System User'}</h3>
                                        <p className="text-xs text-muted-foreground font-medium font-mono">{user.user_email}</p>
                                    </div>

                                    {/* Key Metrics */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-muted/40 rounded-xl border border-muted flex flex-col items-center justify-center text-center">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter mb-1">Grade</span>
                                            <span className={cn(
                                                "text-lg font-black",
                                                user.grade === 'E' ? "text-red-600" : "text-orange-600"
                                            )}>{user.grade}</span>
                                        </div>
                                        <div className="p-3 bg-muted/40 rounded-xl border border-muted flex flex-col items-center justify-center text-center">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter mb-1">Points</span>
                                            <span className="text-lg font-black">{user.total_points}</span>
                                        </div>
                                    </div>

                                    {/* Reason Cards */}
                                    <div className="space-y-2">
                                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Risk Indicators</h4>
                                        <div className="space-y-1.5">
                                            {user.has_fraud_flag && (
                                                <div className="flex items-start gap-2 p-2 bg-red-50 rounded-lg border border-red-100 text-[11px] font-bold text-red-700">
                                                    <ShieldAlert className="h-3 w-3 mt-0.5 shrink-0" />
                                                    <span>Potential Fraud Flag detected in activity logs.</span>
                                                </div>
                                            )}
                                            {user.grade === 'E' && (
                                                <div className="flex items-start gap-2 p-2 bg-orange-50 rounded-lg border border-orange-100 text-[11px] font-bold text-orange-700">
                                                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                                                    <span>Critically low performance score (Grade E).</span>
                                                </div>
                                            )}
                                            {user.normalized_score < -0.3 && (
                                                <div className="flex items-start gap-2 p-2 bg-red-50 rounded-lg border border-red-100 text-[11px] font-bold text-red-700">
                                                    <UserX className="h-3 w-3 mt-0.5 shrink-0" />
                                                    <span>Near suspension threshold (-0.3 normalized).</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Actions */}
                                <div className="p-3 bg-muted/20 border-t flex items-center justify-between">
                                    <div className="flex items-center text-[10px] font-bold text-muted-foreground">
                                        <Calendar className="h-3 w-3 mr-1" />
                                        {user.month}/{user.year}
                                    </div>
                                    <Link
                                        href={`/admin/business/staff-points/history?userId=${user.user_id}`}
                                        className="text-[11px] font-black text-primary flex items-center hover:underline"
                                    >
                                        VIEW HISTORY
                                        <ExternalLink className="ml-1 h-3 w-3" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-card rounded-2xl border p-20 text-center shadow-sm">
                        <div className="h-20 w-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
                            <UserCheck className="h-10 w-10 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">No High-Risk Activity</h3>
                        <p className="text-muted-foreground text-sm max-w-sm mx-auto font-medium">All store managers are currently performing within acceptable ranges and no fraud flags have been detected for the selected period.</p>
                        <Button
                            variant="outline"
                            className="mt-8 rounded-xl font-bold"
                            onClick={() => {
                                setSearchQuery('')
                                setRiskFilter('ALL')
                                setSelectedShopId('all')
                            }}
                        >
                            Reset Filters
                        </Button>
                    </div>
                )}
            </div>
        </PermissionGuard>
    )
}
