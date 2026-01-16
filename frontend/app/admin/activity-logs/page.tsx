'use client'

import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
    Clock,
    Activity,
    User,
    Globe,
    Monitor,
    Search,
    Filter,
    Smartphone,
    Tablet,
    Laptop,
    AlertCircle,
    RefreshCcw,
    CheckCircle2,
    XCircle,
    Shield
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActivityLog {
    id: number
    user_id: string
    profiles?: {
        full_name: string
        email: string
    }
    event_type: string
    status: string
    ip_address: string
    user_agent: string
    browser: string
    os: string
    device_type: string
    location_city?: string
    location_country?: string
    metadata: any
    timestamp: string
}

export default function ActivityLogsPage() {
    return (
        <PermissionGuard permission="system.logs">
            <ActivityLogsContent />
        </PermissionGuard>
    )
}

function ActivityLogsContent() {
    const [logs, setLogs] = useState<ActivityLog[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [eventTypeFilter, setEventTypeFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')

    useEffect(() => {
        loadLogs()
    }, [])

    const loadLogs = async () => {
        setLoading(true)
        try {
            const data = await api.activityLogs.getAll()
            setLogs(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error('Failed to load activity logs:', error)
        } finally {
            setLoading(false)
        }
    }

    const getStatusIcon = (status: string) => {
        if (status.toUpperCase() === 'SUCCESS') {
            return <CheckCircle2 className="h-4 w-4 text-green-500" />
        }
        return <XCircle className="h-4 w-4 text-red-500" />
    }

    const getDeviceIcon = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'mobile': return <Smartphone className="h-4 w-4" />
            case 'tablet': return <Tablet className="h-4 w-4" />
            default: return <Laptop className="h-4 w-4" />
        }
    }

    const getEventTypeBadge = (type: string) => {
        switch (type.toUpperCase()) {
            case 'LOGIN': return <Badge variant="default" className="bg-blue-600">Login</Badge>
            case 'LOGOUT': return <Badge variant="outline">Logout</Badge>
            case 'SIGNUP': return <Badge variant="default" className="bg-green-600">Signup</Badge>
            case 'REFRESH_TOKEN': return <Badge variant="secondary">Refresh</Badge>
            default: return <Badge variant="secondary">{type}</Badge>
        }
    }

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesSearch =
                searchQuery === '' ||
                log.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.ip_address?.includes(searchQuery) ||
                log.event_type?.toLowerCase().includes(searchQuery.toLowerCase())

            const matchesType = eventTypeFilter === 'all' || log.event_type === eventTypeFilter
            const matchesStatus = statusFilter === 'all' || log.status === statusFilter

            return matchesSearch && matchesType && matchesStatus
        })
    }, [logs, searchQuery, eventTypeFilter, statusFilter])

    const stats = useMemo(() => {
        return {
            total: logs.length,
            success: logs.filter(l => l.status === 'SUCCESS').length,
            failed: logs.filter(l => l.status === 'FAILED').length,
        }
    }, [logs])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Shield className="h-8 w-8 text-primary" />
                        Activity Logs
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Enterprise-grade monitoring of authentication and session activities
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
                    <RefreshCcw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                    Refresh
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">Total activities</span>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-2xl font-bold mt-2">{stats.total}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">Successful</span>
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="text-2xl font-bold mt-2 text-green-600">{stats.success}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">Failed</span>
                            <AlertCircle className="h-4 w-4 text-red-500" />
                        </div>
                        <div className="text-2xl font-bold mt-2 text-red-600">{stats.failed}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search by user, IP, or type..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-background border rounded-md focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                        <div className="flex gap-2">
                            <select
                                value={eventTypeFilter}
                                onChange={(e) => setEventTypeFilter(e.target.value)}
                                className="bg-background border rounded-md px-3 py-2 text-sm outline-none"
                            >
                                <option value="all">All Events</option>
                                <option value="LOGIN">Login</option>
                                <option value="LOGOUT">Logout</option>
                                <option value="SIGNUP">Signup</option>
                                <option value="REFRESH_TOKEN">Token Refresh</option>
                            </select>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="bg-background border rounded-md px-3 py-2 text-sm outline-none"
                            >
                                <option value="all">Any Status</option>
                                <option value="SUCCESS">Success</option>
                                <option value="FAILED">Failed</option>
                            </select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-[180px]">Timestamp</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Event</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Location/IP</TableHead>
                                    <TableHead>Platform</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <LoadingSpinner size="sm" />
                                                <span className="text-sm text-muted-foreground">Loading activity logs...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredLogs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                            No matching activity logs found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                                                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">{log.profiles?.full_name || 'Anonymous'}</span>
                                                    <span className="text-xs text-muted-foreground">{log.profiles?.email || 'N/A'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getEventTypeBadge(log.event_type)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5 text-sm">
                                                    {getStatusIcon(log.status)}
                                                    <span className={cn(
                                                        "font-medium",
                                                        log.status === 'SUCCESS' ? "text-green-600" : "text-red-600"
                                                    )}>
                                                        {log.status}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <Globe className="h-3 w-3 text-muted-foreground" />
                                                        <span className="text-xs font-mono">{log.ip_address}</span>
                                                    </div>
                                                    {(log.location_city || log.location_country) && (
                                                        <span className="text-[10px] text-muted-foreground pl-4">
                                                            {log.location_city}, {log.location_country}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        {getDeviceIcon(log.device_type)}
                                                        <span className="text-xs font-medium">{log.os} / {log.browser}</span>
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground truncate max-w-[150px]" title={log.user_agent}>
                                                        {log.user_agent}
                                                    </span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="mt-4 text-xs text-muted-foreground text-right italic">
                        * IP Addresses and User Agents are captured for security audit compliance.
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
