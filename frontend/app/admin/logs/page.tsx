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
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No audit logs yet. Changes will appear here once you start using the system.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
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
