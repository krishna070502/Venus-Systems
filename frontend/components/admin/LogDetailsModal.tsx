'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
  timestamp: string
}

interface LogDetailsModalProps {
  log: AuditLog
  onClose: () => void
}

export default function LogDetailsModal({ log, onClose }: LogDetailsModalProps) {
  const formatJson = (obj: any) => {
    try {
      return JSON.stringify(obj, null, 2)
    } catch {
      return 'Invalid JSON'
    }
  }

  const getActionColor = (action: string) => {
    switch (action?.toUpperCase()) {
      case 'CREATE':
      case 'INSERT':
        return 'default'
      case 'UPDATE':
        return 'secondary'
      case 'DELETE':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const renderChanges = () => {
    if (!log.changes || Object.keys(log.changes).length === 0) {
      return <div className="text-muted-foreground">No changes recorded</div>
    }

    return (
      <div className="space-y-3">
        {Object.entries(log.changes).map(([key, value]: [string, any]) => {
          if (value && typeof value === 'object' && 'before' in value && 'after' in value) {
            return (
              <div key={key} className="border rounded-lg p-3 bg-gray-50">
                <div className="font-medium text-sm mb-2">{key}</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Before:</div>
                    <div className="font-mono bg-white p-2 rounded border">
                      {String(value.before) || '(empty)'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">After:</div>
                    <div className="font-mono bg-white p-2 rounded border">
                      {String(value.after) || '(empty)'}
                    </div>
                  </div>
                </div>
              </div>
            )
          }
          return (
            <div key={key} className="border rounded-lg p-3 bg-gray-50">
              <div className="font-medium text-sm mb-1">{key}</div>
              <pre className="text-xs font-mono bg-white p-2 rounded border overflow-x-auto">
                {formatJson(value)}
              </pre>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Audit Log Details</CardTitle>
              <CardDescription>
                Complete information about this log entry
              </CardDescription>
            </div>
            <Badge variant={getActionColor(log.action) as any} className="text-sm">
              {log.action}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Timestamp</div>
              <div className="mt-1 font-medium">
                {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">User</div>
              <div className="mt-1">
                {log.user_name ? (
                  <div>
                    <div className="font-medium">{log.user_name}</div>
                    <div className="text-sm text-muted-foreground">{log.user_email}</div>
                    <div className="text-xs font-mono text-muted-foreground mt-1">{log.user_id}</div>
                  </div>
                ) : log.user_email ? (
                  <div>
                    <div className="font-medium">{log.user_email}</div>
                    <div className="text-xs font-mono text-muted-foreground mt-1">{log.user_id}</div>
                  </div>
                ) : log.user_id ? (
                  <div className="font-mono text-sm">{log.user_id}</div>
                ) : (
                  <div className="text-muted-foreground">System</div>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Resource Type</div>
              <div className="mt-1 font-medium">
                {log.resource_type || 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Resource ID</div>
              <div className="mt-1 font-mono text-sm">
                {log.resource_id || 'N/A'}
              </div>
            </div>
          </div>

          {/* Changes Section */}
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-3">Changes</div>
            {renderChanges()}
          </div>

          {/* Metadata Section */}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">Metadata</div>
              <div className="border rounded-lg p-3 bg-gray-50">
                <pre className="text-xs font-mono overflow-x-auto">
                  {formatJson(log.metadata)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
        <div className="p-6 border-t">
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </Card>
    </div>
  )
}
