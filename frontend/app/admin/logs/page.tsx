'use client'

import { useEffect, useState } from 'react'
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
import LogDetailsModal from '@/components/admin/LogDetailsModal'
import { PageLoading } from '@/components/ui/loading'
import { PermissionGuard } from '@/components/admin/PermissionGuard'

interface AuditLog {
  id: number
  user_id: string
  action: string
  resource_type: string
  resource_id?: string
  changes: any
  metadata: any
  timestamp: string
}

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

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    try {
      const data = await api.admin.getLogs() as { logs: AuditLog[] }
      // Ensure logs is an array
      setLogs(Array.isArray(data.logs) ? data.logs : [])
    } catch (error) {
      console.error('Failed to load logs:', error)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
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
      searchQuery === '' ||
      (log.action && log.action.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.resource_type && log.resource_type.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.resource_id && log.resource_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.user_id && log.user_id.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesAction = filterAction === 'all' || log.action === filterAction
    const matchesResourceType = filterResourceType === 'all' || log.resource_type === filterResourceType

    return matchesSearch && matchesAction && matchesResourceType
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground mt-2">
          Complete audit trail of all system changes
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
          <CardDescription>
            Complete history of all system changes and user actions
          </CardDescription>
          <div className="mt-4 space-y-4">
            {/* Search Bar */}
            <input
              type="text"
              placeholder="Search logs by action, resource, resource ID, or user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            
            {/* Filters */}
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
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Changes</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {logs.length === 0 
                      ? 'No audit logs yet. Changes will appear here once you start using the system.'
                      : 'No logs match your search criteria. Try adjusting your filters.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionColor(log.action) as any}>
                        {log.action || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>{log.resource_type || 'N/A'}</div>
                      {log.resource_id && (
                        <div className="text-xs text-muted-foreground font-mono">
                          ID: {log.resource_id}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-md truncate text-sm">
                      {formatChanges(log.changes)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.user_id ? log.user_id.substring(0, 8) + '...' : 'System'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewDetails(log)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedLog && (
        <LogDetailsModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  )
}
