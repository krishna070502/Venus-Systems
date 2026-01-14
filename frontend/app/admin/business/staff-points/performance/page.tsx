'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api/client'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { StaffGrade, LeaderboardEntry, StaffPerformanceBreakdown } from '@/lib/types/poultry'
import {
    Users,
    Loader2,
    AlertCircle,
    TrendingUp,
    TrendingDown,
    Calendar,
    Store,
    Award,
    Target,
    ChevronDown,
    ChevronUp,
    ChevronRight,
    Filter,
    Clock,
    Zap,
    Scale,
    ArrowLeft,
    CalendarDays,
    Play,
    Lock,
    CheckCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
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
    location: string | null
}

interface ExpandedData {
    breakdown: StaffPerformanceBreakdown | null
    loading: boolean
}

export default function PerformanceManagementPage() {
    const [shops, setShops] = useState<Shop[]>([])
    const [selectedShopId, setSelectedShopId] = useState<string>('all')
    const [period, setPeriod] = useState<string>('month')
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [sortField, setSortField] = useState<'rank' | 'points' | 'grade'>('rank')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
    const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
    const [expandedData, setExpandedData] = useState<Record<string, ExpandedData>>({})

    // Generate Monthly Performance state
    const [showGenerateDialog, setShowGenerateDialog] = useState(false)
    const [generateYear, setGenerateYear] = useState(new Date().getFullYear())
    const [generateMonth, setGenerateMonth] = useState(new Date().getMonth() + 1)
    const [generateStoreId, setGenerateStoreId] = useState<string>('')
    const [generating, setGenerating] = useState(false)
    const [generateResult, setGenerateResult] = useState<{ success: boolean; message: string } | null>(null)

    // Lock state
    const [showLockDialog, setShowLockDialog] = useState(false)
    const [locking, setLocking] = useState(false)

    const fetchShops = async () => {
        try {
            const data = await api.businessManagement.shops.getAll(true) as Shop[]
            setShops(data)
        } catch (err: any) {
            console.error('Failed to fetch shops:', err)
        }
    }

    const fetchLeaderboard = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const storeId = selectedShopId !== 'all' ? parseInt(selectedShopId) : undefined
            const data = await api.poultry.staffPoints.getLeaderboard(storeId, period) as any
            const entries = data.entries || data
            setLeaderboard(Array.isArray(entries) ? entries : [])
        } catch (err: any) {
            setError(err.message || 'Failed to load performance data')
            setLeaderboard([])
        } finally {
            setLoading(false)
        }
    }, [selectedShopId, period])

    const fetchBreakdown = async (userId: string) => {
        if (expandedData[userId]?.breakdown) return // Already loaded

        setExpandedData(prev => ({
            ...prev,
            [userId]: { breakdown: null, loading: true }
        }))

        try {
            const today = new Date()
            let fromDate: string | undefined

            if (period === 'week') {
                const weekAgo = new Date(today)
                weekAgo.setDate(weekAgo.getDate() - 7)
                fromDate = weekAgo.toISOString().split('T')[0]
            } else if (period === 'month') {
                fromDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
            } else if (period === 'year') {
                fromDate = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0]
            }

            const storeId = selectedShopId !== 'all' ? parseInt(selectedShopId) : undefined
            const data = await api.poultry.staffPoints.getBreakdown({
                user_id: userId,
                store_id: storeId,
                from_date: fromDate
            }) as StaffPerformanceBreakdown

            setExpandedData(prev => ({
                ...prev,
                [userId]: { breakdown: data, loading: false }
            }))
        } catch (err: any) {
            console.error('Failed to fetch breakdown:', err)
            setExpandedData(prev => ({
                ...prev,
                [userId]: { breakdown: null, loading: false }
            }))
        }
    }

    const toggleExpand = (userId: string) => {
        if (expandedUserId === userId) {
            setExpandedUserId(null)
        } else {
            setExpandedUserId(userId)
            fetchBreakdown(userId)
        }
    }

    useEffect(() => { fetchShops() }, [])
    useEffect(() => {
        fetchLeaderboard()
        setExpandedUserId(null) // Reset expanded when filters change
        setExpandedData({})
    }, [fetchLeaderboard])

    const sortedLeaderboard = [...leaderboard].sort((a, b) => {
        let comparison = 0
        switch (sortField) {
            case 'rank': comparison = a.rank - b.rank; break
            case 'points': comparison = a.total_points - b.total_points; break
            case 'grade':
                const gradeOrder = ['A_PLUS', 'A', 'B', 'C', 'D', 'E']
                comparison = gradeOrder.indexOf(a.grade || 'C') - gradeOrder.indexOf(b.grade || 'C')
                break
        }
        return sortOrder === 'asc' ? comparison : -comparison
    })

    const summaryStats = {
        totalManagers: leaderboard.length,
        totalPoints: leaderboard.reduce((sum, p) => sum + p.total_points, 0),
        avgPoints: leaderboard.length > 0
            ? leaderboard.reduce((sum, p) => sum + p.total_points, 0) / leaderboard.length : 0,
        gradeDistribution: ['A_PLUS', 'A', 'B', 'C', 'D', 'E'].map(grade => ({
            grade: grade as StaffGrade,
            count: leaderboard.filter(p => p.grade === grade).length
        }))
    }

    const getGradeColor = (grade: StaffGrade) => {
        const colors: Record<string, string> = {
            'A_PLUS': 'text-yellow-600 bg-yellow-100 border-yellow-300',
            'A': 'text-green-600 bg-green-100 border-green-300',
            'B': 'text-blue-600 bg-blue-100 border-blue-300',
            'C': 'text-slate-600 bg-slate-100 border-slate-300',
            'D': 'text-orange-600 bg-orange-100 border-orange-300',
            'E': 'text-red-600 bg-red-100 border-red-300',
        }
        return colors[grade] || 'text-muted-foreground bg-muted'
    }

    const getGradeBgColor = (grade: StaffGrade) => {
        const colors: Record<string, string> = {
            'A_PLUS': 'bg-yellow-500', 'A': 'bg-green-500', 'B': 'bg-blue-500',
            'C': 'bg-slate-500', 'D': 'bg-orange-500', 'E': 'bg-red-500',
        }
        return colors[grade] || 'bg-muted'
    }

    const handleSort = (field: typeof sortField) => {
        if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
        else { setSortField(field); setSortOrder('asc') }
    }

    const SortIcon = ({ field }: { field: typeof sortField }) => {
        if (sortField !== field) return null
        return sortOrder === 'asc' ? <ChevronUp className="h-3 w-3 inline ml-1" /> : <ChevronDown className="h-3 w-3 inline ml-1" />
    }

    const periodLabels: Record<string, string> = {
        'week': 'This Week',
        'month': 'This Month',
        'year': 'This Year',
        'all': 'All Time'
    }

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ]

    const handleGeneratePerformance = async () => {
        if (!generateStoreId) return

        setGenerating(true)
        setGenerateResult(null)

        try {
            const result = await api.poultry.grading.generatePerformance(
                parseInt(generateStoreId),
                generateYear,
                generateMonth
            ) as any

            setGenerateResult({
                success: true,
                message: `Successfully generated performance for ${result.records_processed || 0} staff members for ${monthNames[generateMonth - 1]} ${generateYear}`
            })

            // Refresh leaderboard
            fetchLeaderboard()
        } catch (err: any) {
            setGenerateResult({
                success: false,
                message: err.message || 'Failed to generate performance'
            })
        } finally {
            setGenerating(false)
        }
    }

    const handleLockPerformance = async () => {
        if (!generateStoreId) return

        setLocking(true)

        try {
            const result = await api.poultry.grading.lockPerformance(
                parseInt(generateStoreId),
                generateYear,
                generateMonth
            ) as any

            setGenerateResult({
                success: true,
                message: `Locked ${result.records_locked || 0} performance records for ${monthNames[generateMonth - 1]} ${generateYear}. These records are now immutable.`
            })
            setShowLockDialog(false)
        } catch (err: any) {
            setGenerateResult({
                success: false,
                message: err.message || 'Failed to lock performance'
            })
        } finally {
            setLocking(false)
        }
    }

    return (
        <PermissionGuard permission="staffgrading.view">
            <div className="p-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin/business/staff-points"
                            className="p-2 border rounded-xl hover:bg-accent transition-colors shadow-sm bg-card"
                        >
                            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                        </Link>
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Users className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Performance Management</h1>
                            <p className="text-sm text-muted-foreground">Track all store managers' performance</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        <Select value={period} onValueChange={setPeriod}>
                            <SelectTrigger className="w-[150px]">
                                <Clock className="h-4 w-4 mr-2" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="week">This Week</SelectItem>
                                <SelectItem value="month">This Month</SelectItem>
                                <SelectItem value="year">This Year</SelectItem>
                                <SelectItem value="all">All Time</SelectItem>
                            </SelectContent>
                        </Select>

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

                        <Button variant="outline" onClick={fetchLeaderboard} disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
                        </Button>

                        <Button
                            variant="default"
                            onClick={() => setShowGenerateDialog(true)}
                            className="gap-2"
                        >
                            <CalendarDays className="h-4 w-4" />
                            Generate Monthly
                        </Button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-card rounded-xl border p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <Users className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase">Staff</span>
                        </div>
                        <div className="text-2xl font-bold">{summaryStats.totalManagers}</div>
                    </div>
                    <div className="bg-card rounded-xl border p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <Target className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase">Total Points</span>
                        </div>
                        <div className={cn("text-2xl font-bold", summaryStats.totalPoints >= 0 ? "text-green-600" : "text-red-600")}>
                            {summaryStats.totalPoints > 0 ? '+' : ''}{summaryStats.totalPoints}
                        </div>
                    </div>
                    <div className="bg-card rounded-xl border p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase">Avg Points</span>
                        </div>
                        <div className={cn("text-2xl font-bold", summaryStats.avgPoints >= 0 ? "text-green-600" : "text-red-600")}>
                            {summaryStats.avgPoints.toFixed(1)}
                        </div>
                    </div>
                    <div className="bg-card rounded-xl border p-4">
                        <div className="flex items-center gap-2 text-primary mb-2">
                            <Calendar className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase">Period</span>
                        </div>
                        <div className="text-2xl font-bold text-primary">{periodLabels[period]}</div>
                    </div>
                </div>

                {/* Grade Distribution */}
                <div className="bg-card rounded-xl border p-4 mb-6">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Award className="h-4 w-4" /> Grade Distribution
                    </h3>
                    <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
                        {summaryStats.gradeDistribution.map(({ grade, count }) => {
                            const pct = summaryStats.totalManagers > 0 ? (count / summaryStats.totalManagers) * 100 : 0
                            if (count === 0) return null
                            return (
                                <div key={grade} className={cn("flex items-center justify-center text-white text-xs font-bold", getGradeBgColor(grade))}
                                    style={{ width: `${pct}%`, minWidth: '40px' }} title={`${grade.replace('_', '+')}: ${count}`}>
                                    {grade.replace('_', '+')} ({count})
                                </div>
                            )
                        })}
                        {summaryStats.totalManagers === 0 && (
                            <div className="flex-1 bg-muted flex items-center justify-center text-muted-foreground text-xs">No data</div>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="bg-destructive/10 text-destructive p-4 rounded-xl flex items-center gap-3 mb-6 border">
                        <AlertCircle className="h-5 w-5" />
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {loading && (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}

                {!loading && leaderboard.length > 0 && (
                    <div className="bg-card rounded-xl border overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        <th className="px-2 py-3 w-8"></th>
                                        <th className="px-4 py-3 text-center font-semibold cursor-pointer hover:text-primary w-16" onClick={() => handleSort('rank')}>
                                            Rank <SortIcon field="rank" />
                                        </th>
                                        <th className="px-4 py-3 text-left font-semibold">Staff Member</th>
                                        <th className="px-4 py-3 text-left font-semibold">Store</th>
                                        <th className="px-4 py-3 text-center font-semibold cursor-pointer hover:text-primary" onClick={() => handleSort('grade')}>
                                            Grade <SortIcon field="grade" />
                                        </th>
                                        <th className="px-4 py-3 text-right font-semibold cursor-pointer hover:text-primary" onClick={() => handleSort('points')}>
                                            Points <SortIcon field="points" />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {sortedLeaderboard.map((entry) => {
                                        const isExpanded = expandedUserId === entry.user_id
                                        const userData = expandedData[entry.user_id]

                                        return (
                                            <>
                                                <tr
                                                    key={entry.user_id}
                                                    className={cn(
                                                        "hover:bg-muted/30 transition-colors cursor-pointer",
                                                        isExpanded && "bg-muted/20"
                                                    )}
                                                    onClick={() => toggleExpand(entry.user_id)}
                                                >
                                                    <td className="px-2 py-3 text-center">
                                                        <ChevronRight className={cn(
                                                            "h-4 w-4 text-muted-foreground transition-transform",
                                                            isExpanded && "rotate-90"
                                                        )} />
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className={cn(
                                                            "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold",
                                                            entry.rank === 1 ? "bg-yellow-100 text-yellow-700" :
                                                                entry.rank === 2 ? "bg-slate-200 text-slate-700" :
                                                                    entry.rank === 3 ? "bg-orange-100 text-orange-700" :
                                                                        "bg-muted text-muted-foreground"
                                                        )}>
                                                            {entry.rank}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium">{entry.user_name || entry.user_email}</div>
                                                        {entry.user_name && <div className="text-xs text-muted-foreground">{entry.user_email}</div>}
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground">
                                                        {entry.store_name || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={cn("px-3 py-1 rounded-full text-xs font-bold border", getGradeColor(entry.grade || 'C'))}>
                                                            {(entry.grade || 'C').replace('_', '+')}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono">
                                                        <span className={cn("font-bold text-lg", entry.total_points >= 0 ? "text-green-600" : "text-red-600")}>
                                                            {entry.total_points > 0 ? '+' : ''}{entry.total_points}
                                                        </span>
                                                    </td>
                                                </tr>

                                                {/* Expanded Details Row */}
                                                {isExpanded && (
                                                    <tr key={`${entry.user_id}-expanded`} className="bg-muted/10">
                                                        <td colSpan={6} className="p-4">
                                                            {userData?.loading ? (
                                                                <div className="flex items-center justify-center py-8">
                                                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                                                </div>
                                                            ) : userData?.breakdown ? (
                                                                <div className="grid md:grid-cols-2 gap-6">
                                                                    {/* Points Breakdown */}
                                                                    <div className="bg-card rounded-lg border p-4">
                                                                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                                                                            <Zap className="h-4 w-4 text-yellow-500" />
                                                                            Points Breakdown
                                                                        </h4>
                                                                        {userData.breakdown.points_breakdown.length === 0 ? (
                                                                            <p className="text-muted-foreground text-sm italic">No point entries for this period</p>
                                                                        ) : (
                                                                            <div className="space-y-2">
                                                                                {userData.breakdown.points_breakdown.map((item, idx) => (
                                                                                    <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                                                                                        <div>
                                                                                            <div className="font-medium text-sm">{item.description}</div>
                                                                                            <div className="text-xs text-muted-foreground">
                                                                                                {item.reason_code.replace(/_/g, ' ')} • {item.count} events
                                                                                            </div>
                                                                                        </div>
                                                                                        <span className={cn(
                                                                                            "font-bold px-2 py-1 rounded text-sm",
                                                                                            item.points >= 0 ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"
                                                                                        )}>
                                                                                            {item.points > 0 ? '+' : ''}{item.points}
                                                                                        </span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Performance Metrics */}
                                                                    <div className="bg-card rounded-lg border p-4">
                                                                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                                                                            <Scale className="h-4 w-4 text-blue-500" />
                                                                            Performance Metrics
                                                                        </h4>
                                                                        <div className="grid grid-cols-2 gap-4">
                                                                            <div className="bg-muted/30 rounded-lg p-3">
                                                                                <div className="text-2xl font-bold">{userData.breakdown.total_points}</div>
                                                                                <div className="text-xs text-muted-foreground uppercase">Total Points</div>
                                                                            </div>
                                                                            <div className="bg-muted/30 rounded-lg p-3">
                                                                                <div className="text-2xl font-bold">{userData.breakdown.total_weight_handled.toFixed(1)} kg</div>
                                                                                <div className="text-xs text-muted-foreground uppercase">Weight Handled</div>
                                                                            </div>
                                                                            <div className="bg-muted/30 rounded-lg p-3">
                                                                                <div className="text-2xl font-bold text-primary">{userData.breakdown.normalized_score.toFixed(3)}</div>
                                                                                <div className="text-xs text-muted-foreground uppercase">Normalized Score</div>
                                                                            </div>
                                                                            <div className="bg-muted/30 rounded-lg p-3">
                                                                                <div className={cn("text-2xl font-bold px-2 rounded inline-block", getGradeColor(userData.breakdown.grade as StaffGrade))}>
                                                                                    {userData.breakdown.grade.replace('_', '+')}
                                                                                </div>
                                                                                <div className="text-xs text-muted-foreground uppercase mt-1">Grade</div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Variance Summary */}
                                                                        <div className="mt-4 pt-4 border-t">
                                                                            <div className="text-sm font-medium mb-2">Variance Summary</div>
                                                                            <div className="flex gap-4">
                                                                                <div className="flex-1 bg-green-50 rounded-lg p-2 text-center">
                                                                                    <div className="text-green-600 font-bold">+{userData.breakdown.variance_summary.positive_kg.toFixed(2)} kg</div>
                                                                                    <div className="text-xs text-green-700">Positive</div>
                                                                                </div>
                                                                                <div className="flex-1 bg-red-50 rounded-lg p-2 text-center">
                                                                                    <div className="text-red-600 font-bold">-{userData.breakdown.variance_summary.negative_kg.toFixed(2)} kg</div>
                                                                                    <div className="text-xs text-red-700">Negative</div>
                                                                                </div>
                                                                                <div className="flex-1 bg-blue-50 rounded-lg p-2 text-center">
                                                                                    <div className="text-blue-600 font-bold">{userData.breakdown.variance_summary.count}</div>
                                                                                    <div className="text-xs text-blue-700">Total</div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <p className="text-muted-foreground text-sm italic text-center py-4">Unable to load details</p>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {!loading && leaderboard.length === 0 && !error && (
                    <div className="bg-card rounded-xl border p-12 text-center">
                        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">No Performance Data</h3>
                        <p className="text-muted-foreground text-sm">No staff records found for the selected period.</p>
                    </div>
                )}
            </div>

            {/* Generate Monthly Performance Dialog */}
            <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CalendarDays className="h-5 w-5 text-primary" />
                            Generate Monthly Performance
                        </DialogTitle>
                        <DialogDescription>
                            Calculate performance scores, grades, and bonuses for all staff in a store for a specific month.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Store Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Store</label>
                            <Select value={generateStoreId} onValueChange={setGenerateStoreId}>
                                <SelectTrigger>
                                    <Store className="h-4 w-4 mr-2" />
                                    <SelectValue placeholder="Select a store" />
                                </SelectTrigger>
                                <SelectContent>
                                    {shops.map(shop => (
                                        <SelectItem key={shop.id} value={shop.id.toString()}>
                                            {shop.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Month Selection */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Month</label>
                                <Select
                                    value={generateMonth.toString()}
                                    onValueChange={(v) => setGenerateMonth(parseInt(v))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {monthNames.map((name, index) => (
                                            <SelectItem key={index + 1} value={(index + 1).toString()}>
                                                {name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Year</label>
                                <Select
                                    value={generateYear.toString()}
                                    onValueChange={(v) => setGenerateYear(parseInt(v))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[2024, 2025, 2026, 2027].map(year => (
                                            <SelectItem key={year} value={year.toString()}>
                                                {year}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Result Message */}
                        {generateResult && (
                            <div className={cn(
                                "rounded-lg p-3 text-sm",
                                generateResult.success
                                    ? "bg-green-50 text-green-700 border border-green-200"
                                    : "bg-red-50 text-red-700 border border-red-200"
                            )}>
                                <div className="flex items-start gap-2">
                                    {generateResult.success
                                        ? <CheckCircle className="h-4 w-4 mt-0.5" />
                                        : <AlertCircle className="h-4 w-4 mt-0.5" />}
                                    <span>{generateResult.message}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowLockDialog(true)}
                            disabled={!generateStoreId || !generateResult?.success || locking}
                        >
                            <Lock className="h-4 w-4 mr-2" />
                            Lock Month
                        </Button>
                        <Button
                            onClick={handleGeneratePerformance}
                            disabled={!generateStoreId || generating}
                        >
                            {generating ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Play className="h-4 w-4 mr-2" />
                            )}
                            Generate
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Lock Confirmation Dialog */}
            <Dialog open={showLockDialog} onOpenChange={setShowLockDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600">
                            <Lock className="h-5 w-5" />
                            Lock Monthly Performance
                        </DialogTitle>
                        <DialogDescription>
                            <span className="text-amber-600 font-medium">Warning:</span> This action cannot be undone.
                            Locked records become immutable and will be used for salary calculations.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <p className="text-sm">
                            You are about to lock performance records for:
                        </p>
                        <div className="mt-2 p-3 bg-muted rounded-lg">
                            <p className="font-medium">
                                {shops.find(s => s.id.toString() === generateStoreId)?.name || 'Store'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {monthNames[generateMonth - 1]} {generateYear}
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowLockDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleLockPerformance}
                            disabled={locking}
                        >
                            {locking ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Lock className="h-4 w-4 mr-2" />
                            )}
                            Lock Permanently
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </PermissionGuard>
    )
}
