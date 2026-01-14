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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import LogDetailsModal from '@/components/admin/LogDetailsModal'
import { PageLoading } from '@/components/ui/loading'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import { Settings2, Eye, EyeOff, Download, Clock, Activity, Database, FileText, User, Info, X, Search, Filter, Globe, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AuditLog {
  id: number
  user_id: string
  user_email?: string
  user_name?: string
  action: string
  resource_type: string
  resource_id?: string
  changes: any
  metadata: any
  ip_address?: string
  user_agent?: string
  timestamp: string
}

// Field configuration with permission keys
const FIELD_CONFIG = {
  timestamp: {
    key: 'logs.field.timestamp',
    label: 'Timestamp',
    icon: Clock,
    defaultVisible: true,
  },
  action: {
    key: 'logs.field.action',
    label: 'Action',
    icon: Activity,
    defaultVisible: true,
  },
  resource: {
    key: 'logs.field.resource',
    label: 'Resource',
    icon: Database,
    defaultVisible: true,
  },
  changes: {
    key: 'logs.field.changes',
    label: 'Changes',
    icon: FileText,
    defaultVisible: true,
  },
  user: {
    key: 'logs.field.user',
    label: 'User',
    icon: User,
    defaultVisible: true,
  },
  ip: {
    key: 'logs.field.user',
    label: 'IP Address',
    icon: Globe,
    defaultVisible: false,
  },
  userAgent: {
    key: 'logs.field.user',
    label: 'User Agent',
    icon: Monitor,
    defaultVisible: false,
  },
}

type FieldKey = keyof typeof FIELD_CONFIG

export default function LogsPage() {
  return (
    <PermissionGuard permission="system.logs">
      <LogsPageContent />
    </PermissionGuard>
  )
}

function LogsPageContent() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterAction, setFilterAction] = useState<string>('all')
  const [filterResourceType, setFilterResourceType] = useState<string>('all')
  const [visibleFields, setVisibleFields] = useState<Set<FieldKey>>(new Set(['timestamp', 'action', 'resource', 'changes', 'user'] as FieldKey[]))
  const [showPermissionsInfo, setShowPermissionsInfo] = useState(false)

  const { permissions: userPermissions, loading: permissionsLoading } = usePermissions()

  // Check field-level permissions
  const canViewField = (fieldKey: FieldKey): boolean => {
    if (permissionsLoading) return false
    const config = FIELD_CONFIG[fieldKey]
    return hasPermission(userPermissions, config.key)
  }

  // Check action permissions
  const canViewDetails = !permissionsLoading && hasPermission(userPermissions, 'logs.action.view')
  const canExport = !permissionsLoading && hasPermission(userPermissions, 'logs.action.export')
  const canFilter = !permissionsLoading && hasPermission(userPermissions, 'logs.action.filter')
  const canSearch = !permissionsLoading && hasPermission(userPermissions, 'logs.action.search')

  // Get available fields (fields user has permission to see)
  const availableFields = useMemo(() => {
    return (Object.keys(FIELD_CONFIG) as FieldKey[]).filter(key => canViewField(key))
  }, [userPermissions, permissionsLoading])

  // Initialize visible fields based on permissions
  useEffect(() => {
    if (!permissionsLoading) {
      const defaultVisible = availableFields.filter(key => FIELD_CONFIG[key].defaultVisible)
      setVisibleFields(new Set(defaultVisible))
    }
  }, [availableFields, permissionsLoading])

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    try {
      const data = await api.admin.getLogs() as { logs: AuditLog[] }
      setLogs(Array.isArray(data.logs) ? data.logs : [])
    } catch (error) {
      console.error('Failed to load logs:', error)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const toggleFieldVisibility = (field: FieldKey) => {
    setVisibleFields(prev => {
      const newSet = new Set(prev)
      if (newSet.has(field)) {
        if (newSet.size > 1) {
          newSet.delete(field)
        }
      } else {
        newSet.add(field)
      }
      return newSet
    })
  }

  const handleExportLogs = () => {
    const exportData = filteredLogs.map(log => ({
      timestamp: log.timestamp,
      action: log.action,
      resource_type: log.resource_type,
      resource_id: log.resource_id,
      user_id: log.user_id,
      changes: log.changes,
      metadata: log.metadata,
    }))

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading || permissionsLoading) {
    return <PageLoading text="Loading audit logs..." />
  }

  const getActionColor = (action: string | undefined) => {
    if (!action) return 'secondary'

    switch (action.toUpperCase()) {
      case 'CREATE':
      case 'INSERT':
        return 'default'
      case 'UPDATE':
        return 'secondary'
      case 'DELETE':
        return 'destructive'
      case 'ASSIGN_PERMISSION':
      case 'REMOVE_PERMISSION':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const formatChanges = (changes: any) => {
    if (!changes || Object.keys(changes).length === 0) return 'No changes'

    try {
      const changeList = Object.entries(changes).map(([key, value]: [string, any]) => {
        if (value && typeof value === 'object' && 'before' in value && 'after' in value) {
          return `${key}: "${value.before}" → "${value.after}"`
        }
        return `${key}: ${JSON.stringify(value)}`
      })

      return changeList.slice(0, 3).join(', ') + (changeList.length > 3 ? '...' : '')
    } catch (error) {
      return 'Invalid change data'
    }
  }

  const viewDetails = (log: AuditLog) => {
    setSelectedLog(log)
  }

  // Get unique actions and resource types for filter dropdowns
  const uniqueActions = Array.from(new Set(logs.map(log => log.action).filter(Boolean)))
  const uniqueResourceTypes = Array.from(new Set(logs.map(log => log.resource_type).filter(Boolean)))

  // Filter logs based on search and filters
  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      !canSearch ||
      searchQuery === '' ||
      (log.action && log.action.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.resource_type && log.resource_type.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.resource_id && log.resource_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.user_id && log.user_id.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesAction = !canFilter || filterAction === 'all' || log.action === filterAction
    const matchesResourceType = !canFilter || filterResourceType === 'all' || log.resource_type === filterResourceType

    return matchesSearch && matchesAction && matchesResourceType
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold">Audit Logs</h1>
            <p className="text-muted-foreground mt-2">
              Complete audit trail of all system changes
            </p>
          </div>
          {/* Info Button */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-8 w-8 bg-blue-100 hover:bg-blue-200 text-blue-600"
            onClick={() => setShowPermissionsInfo(true)}
            title="View your permissions"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>
        {canExport && (
          <Button variant="outline" onClick={handleExportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </div>

      {/* Field Permissions Info Card */}
      {availableFields.length < Object.keys(FIELD_CONFIG).length && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-blue-800">
              <Eye className="h-5 w-5" />
              <span className="text-sm">
                You have access to {availableFields.length} of {Object.keys(FIELD_CONFIG).length} available columns based on your permissions.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Audit Trail</CardTitle>
              <CardDescription>
                Complete history of all system changes and user actions
              </CardDescription>
            </div>

            {/* Column Visibility Dropdown */}
            {availableFields.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings2 className="h-4 w-4 mr-2" />
                    Columns
                    <Badge variant="secondary" className="ml-2">
                      {visibleFields.size}/{availableFields.length}
                    </Badge>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {availableFields.map(fieldKey => {
                    const config = FIELD_CONFIG[fieldKey]
                    const Icon = config.icon
                    return (
                      <DropdownMenuCheckboxItem
                        key={fieldKey}
                        checked={visibleFields.has(fieldKey)}
                        onCheckedChange={() => toggleFieldVisibility(fieldKey)}
                        disabled={visibleFields.size === 1 && visibleFields.has(fieldKey)}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {config.label}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <div className="mt-4 space-y-4">
            {/* Search Bar */}
            {canSearch && (
              <input
                type="text"
                placeholder="Search logs by action, resource, resource ID, or user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}

            {/* Filters */}
            {canFilter && (
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-2 block">Action</label>
                  <select
                    value={filterAction}
                    onChange={(e) => setFilterAction(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Actions</option>
                    {uniqueActions.map(action => (
                      <option key={action} value={action}>{action}</option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-2 block">Resource Type</label>
                  <select
                    value={filterResourceType}
                    onChange={(e) => setFilterResourceType(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Resource Types</option>
                    {uniqueResourceTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {(searchQuery || filterAction !== 'all' || filterResourceType !== 'all') && (
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery('')
                        setFilterAction('all')
                        setFilterResourceType('all')
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Results count */}
            <div className="text-sm text-muted-foreground">
              Showing {filteredLogs.length} of {logs.length} logs
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {visibleFields.has('timestamp') && <TableHead>Timestamp</TableHead>}
                {visibleFields.has('action') && <TableHead>Action</TableHead>}
                {visibleFields.has('resource') && <TableHead>Resource</TableHead>}
                {visibleFields.has('changes') && <TableHead>Changes</TableHead>}
                {visibleFields.has('user') && <TableHead>User</TableHead>}
                {visibleFields.has('ip') && <TableHead>IP Address</TableHead>}
                {visibleFields.has('userAgent') && <TableHead>User Agent</TableHead>}
                {canViewDetails && <TableHead>Details</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleFields.size + (canViewDetails ? 1 : 0)} className="text-center text-muted-foreground py-8">
                    {logs.length === 0
                      ? 'No audit logs yet. Changes will appear here once you start using the system.'
                      : 'No logs match your search criteria. Try adjusting your filters.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    {visibleFields.has('timestamp') && (
                      <TableCell className="text-sm whitespace-nowrap">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                      </TableCell>
                    )}
                    {visibleFields.has('action') && (
                      <TableCell>
                        <Badge variant={getActionColor(log.action) as any}>
                          {log.action || 'N/A'}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleFields.has('resource') && (
                      <TableCell className="font-medium">
                        <div>{log.resource_type || 'N/A'}</div>
                        {log.resource_id && (
                          <div className="text-xs text-muted-foreground font-mono">
                            ID: {log.resource_id}
                          </div>
                        )}
                      </TableCell>
                    )}
                    {visibleFields.has('changes') && (
                      <TableCell className="max-w-md truncate text-sm">
                        {formatChanges(log.changes)}
                      </TableCell>
                    )}
                    {visibleFields.has('user') && (
                      <TableCell>
                        <div className="flex flex-col">
                          {log.user_name ? (
                            <>
                              <span className="font-medium text-sm">{log.user_name}</span>
                              <span className="text-xs text-muted-foreground">{log.user_email}</span>
                            </>
                          ) : log.user_email ? (
                            <span className="text-sm">{log.user_email}</span>
                          ) : log.user_id ? (
                            <span className="font-mono text-xs text-muted-foreground">
                              {log.user_id.substring(0, 8)}...
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">System</span>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {visibleFields.has('ip') && (
                      <TableCell className="font-mono text-xs">
                        {log.ip_address || '-'}
                      </TableCell>
                    )}
                    {visibleFields.has('userAgent') && (
                      <TableCell className="max-w-[150px] truncate text-xs" title={log.user_agent}>
                        {log.user_agent || '-'}
                      </TableCell>
                    )}
                    {canViewDetails && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewDetails(log)}
                        >
                          View
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Your Permissions Info Modal */}
      {showPermissionsInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-lg">Your Log Permissions</CardTitle>
                <CardDescription>What you can do on this page</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowPermissionsInfo(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className={cn(
                  "p-3 rounded-lg border",
                  canViewDetails ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                )}>
                  <div className="flex items-center gap-2">
                    {canViewDetails ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-gray-400" />}
                    <span className={cn("text-sm font-medium", canViewDetails ? "text-green-700" : "text-gray-500")}>
                      View Details
                    </span>
                  </div>
                </div>
                <div className={cn(
                  "p-3 rounded-lg border",
                  canExport ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                )}>
                  <div className="flex items-center gap-2">
                    {canExport ? <Download className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-gray-400" />}
                    <span className={cn("text-sm font-medium", canExport ? "text-green-700" : "text-gray-500")}>
                      Export Logs
                    </span>
                  </div>
                </div>
                <div className={cn(
                  "p-3 rounded-lg border",
                  canSearch ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                )}>
                  <div className="flex items-center gap-2">
                    {canSearch ? <Search className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-gray-400" />}
                    <span className={cn("text-sm font-medium", canSearch ? "text-green-700" : "text-gray-500")}>
                      Search Logs
                    </span>
                  </div>
                </div>
                <div className={cn(
                  "p-3 rounded-lg border",
                  canFilter ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                )}>
                  <div className="flex items-center gap-2">
                    {canFilter ? <Filter className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-gray-400" />}
                    <span className={cn("text-sm font-medium", canFilter ? "text-green-700" : "text-gray-500")}>
                      Filter Logs
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-2">Visible Columns:</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(FIELD_CONFIG) as FieldKey[]).map(fieldKey => {
                    const config = FIELD_CONFIG[fieldKey]
                    const canView = canViewField(fieldKey)
                    return (
                      <Badge
                        key={fieldKey}
                        variant={canView ? "default" : "secondary"}
                        className={cn(!canView && "opacity-50")}
                      >
                        {config.label}
                        {!canView && " (No Access)"}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedLog && (
        <LogDetailsModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  )
}
