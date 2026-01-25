'use client'

import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import {
    Search,
    RefreshCcw,
    ShoppingCart,
    Truck,
    DollarSign,
    ArrowRightLeft,
    Calculator,
    Scale,
    Receipt,
    Plus,
    Check,
    X,
    Clock,
    Lock,
    Send,
    Package
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TransactionLog {
    id: number
    user_id: string
    profiles?: {
        full_name: string
        email: string
    }
    shops?: {
        name: string
    }
    store_id: number
    transaction_type: string
    action: string
    resource_id: string
    amount?: number
    quantity?: number
    metadata: any
    created_at: string
}

export default function TransactionLogsPage() {
    return (
        <PermissionGuard permission="transaction_logs.view">
            <TransactionLogsContent />
        </PermissionGuard>
    )
}

function TransactionLogsContent() {
    const [logs, setLogs] = useState<TransactionLog[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [typeFilter, setTypeFilter] = useState('all')
    const [actionFilter, setActionFilter] = useState('all')

    useEffect(() => {
        loadLogs()
    }, [])

    const loadLogs = async () => {
        setLoading(true)
        try {
            const response = await api.transactionLogs.getAll() as any
            setLogs(Array.isArray(response.items) ? response.items : Array.isArray(response) ? response : [])
        } catch (error) {
            console.error('Failed to load transaction logs:', error)
            setLogs([])
        } finally {
            setLoading(false)
        }
    }

    const getTypeIcon = (type: string) => {
        switch (type?.toUpperCase()) {
            case 'SALE': return <ShoppingCart className="h-4 w-4 text-green-500" />
            case 'PURCHASE': return <Truck className="h-4 w-4 text-blue-500" />
            case 'EXPENSE': return <DollarSign className="h-4 w-4 text-orange-500" />
            case 'TRANSFER': return <ArrowRightLeft className="h-4 w-4 text-purple-500" />
            case 'SETTLEMENT': return <Calculator className="h-4 w-4 text-indigo-500" />
            case 'PROCESSING': return <Scale className="h-4 w-4 text-amber-500" />
            default: return <Receipt className="h-4 w-4 text-muted-foreground" />
        }
    }

    const getTypeBadge = (type: string) => {
        switch (type?.toUpperCase()) {
            case 'SALE': return <Badge className="bg-green-600">Sale</Badge>
            case 'PURCHASE': return <Badge className="bg-blue-600">Purchase</Badge>
            case 'EXPENSE': return <Badge className="bg-orange-600">Expense</Badge>
            case 'TRANSFER': return <Badge className="bg-purple-600">Transfer</Badge>
            case 'SETTLEMENT': return <Badge className="bg-indigo-600">Settlement</Badge>
            case 'PROCESSING': return <Badge className="bg-amber-600">Processing</Badge>
            default: return <Badge variant="secondary">{type}</Badge>
        }
    }

    const getActionIcon = (action: string) => {
        switch (action?.toUpperCase()) {
            case 'CREATE': return <Plus className="h-3 w-3" />
            case 'COMMIT': return <Check className="h-3 w-3" />
            case 'APPROVE': return <Check className="h-3 w-3 text-green-500" />
            case 'REJECT': return <X className="h-3 w-3 text-red-500" />
            case 'CANCEL': return <X className="h-3 w-3 text-orange-500" />
            case 'RECEIVE': return <Package className="h-3 w-3" />
            case 'SUBMIT': return <Send className="h-3 w-3" />
            case 'LOCK': return <Lock className="h-3 w-3" />
            default: return <Clock className="h-3 w-3" />
        }
    }

    const getActionBadge = (action: string) => {
        const icon = getActionIcon(action)
        switch (action?.toUpperCase()) {
            case 'CREATE': return <Badge variant="outline" className="gap-1">{icon} Create</Badge>
            case 'COMMIT': return <Badge variant="outline" className="gap-1 border-green-500 text-green-600">{icon} Commit</Badge>
            case 'APPROVE': return <Badge variant="outline" className="gap-1 border-green-500 text-green-600">{icon} Approve</Badge>
            case 'REJECT': return <Badge variant="outline" className="gap-1 border-red-500 text-red-600">{icon} Reject</Badge>
            case 'CANCEL': return <Badge variant="outline" className="gap-1 border-orange-500 text-orange-600">{icon} Cancel</Badge>
            case 'RECEIVE': return <Badge variant="outline" className="gap-1 border-purple-500 text-purple-600">{icon} Receive</Badge>
            case 'SUBMIT': return <Badge variant="outline" className="gap-1 border-blue-500 text-blue-600">{icon} Submit</Badge>
            case 'LOCK': return <Badge variant="outline" className="gap-1 border-gray-500 text-gray-600">{icon} Lock</Badge>
            default: return <Badge variant="outline">{action}</Badge>
        }
    }

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesSearch =
                searchQuery === '' ||
                log.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.shops?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.resource_id?.toLowerCase().includes(searchQuery.toLowerCase())

            const matchesType = typeFilter === 'all' || log.transaction_type === typeFilter
            const matchesAction = actionFilter === 'all' || log.action === actionFilter

            return matchesSearch && matchesType && matchesAction
        })
    }, [logs, searchQuery, typeFilter, actionFilter])

    const stats = useMemo(() => {
        const byType: Record<string, number> = {}
        logs.forEach(log => {
            byType[log.transaction_type] = (byType[log.transaction_type] || 0) + 1
        })
        return {
            total: logs.length,
            byType
        }
    }, [logs])

    const formatAmount = (amount?: number) => {
        if (!amount) return '-'
        return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    }

    const formatQuantity = (qty?: number) => {
        if (!qty) return '-'
        return `${qty.toFixed(2)} kg`
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Receipt className="h-8 w-8 text-primary" />
                        Transaction Logs
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Track all business operations: sales, purchases, expenses, transfers, settlements, and processing
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
                    <RefreshCcw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">Total</span>
                        </div>
                        <div className="text-xl font-bold mt-1">{stats.total}</div>
                    </CardContent>
                </Card>
                {['SALE', 'PURCHASE', 'EXPENSE', 'TRANSFER', 'SETTLEMENT', 'PROCESSING'].map(type => (
                    <Card key={type} className={cn(
                        typeFilter === type && "ring-2 ring-primary"
                    )}>
                        <CardContent className="pt-4 pb-3 cursor-pointer" onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}>
                            <div className="flex items-center gap-2">
                                {getTypeIcon(type)}
                                <span className="text-xs font-medium text-muted-foreground">{type.charAt(0) + type.slice(1).toLowerCase()}</span>
                            </div>
                            <div className="text-xl font-bold mt-1">{stats.byType[type] || 0}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Table */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search by user, store, or ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-background border rounded-md focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                        <div className="flex gap-2">
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="bg-background border rounded-md px-3 py-2 text-sm outline-none"
                            >
                                <option value="all">All Types</option>
                                <option value="SALE">Sale</option>
                                <option value="PURCHASE">Purchase</option>
                                <option value="EXPENSE">Expense</option>
                                <option value="TRANSFER">Transfer</option>
                                <option value="SETTLEMENT">Settlement</option>
                                <option value="PROCESSING">Processing</option>
                            </select>
                            <select
                                value={actionFilter}
                                onChange={(e) => setActionFilter(e.target.value)}
                                className="bg-background border rounded-md px-3 py-2 text-sm outline-none"
                            >
                                <option value="all">All Actions</option>
                                <option value="CREATE">Create</option>
                                <option value="COMMIT">Commit</option>
                                <option value="APPROVE">Approve</option>
                                <option value="REJECT">Reject</option>
                                <option value="CANCEL">Cancel</option>
                                <option value="RECEIVE">Receive</option>
                                <option value="SUBMIT">Submit</option>
                                <option value="LOCK">Lock</option>
                            </select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-[140px]">Timestamp</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Store</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <LoadingSpinner size="sm" />
                                                <span className="text-sm text-muted-foreground">Loading transaction logs...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredLogs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                            No matching transaction logs found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span>{new Date(log.created_at).toLocaleDateString()}</span>
                                                    <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">{log.profiles?.full_name || 'Unknown'}</span>
                                                    <span className="text-xs text-muted-foreground">{log.profiles?.email || '-'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm">{log.shops?.name || `Store #${log.store_id}`}</span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {getTypeIcon(log.transaction_type)}
                                                    {getTypeBadge(log.transaction_type)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getActionBadge(log.action)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm">
                                                {formatAmount(log.amount)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm">
                                                {formatQuantity(log.quantity)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">
                            Showing {filteredLogs.length} of {logs.length} transaction logs
                        </span>
                        <span className="text-xs text-muted-foreground italic">
                            * Logs are retained for audit compliance
                        </span>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
