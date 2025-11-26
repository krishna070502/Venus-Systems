'use client'

import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import { Trash2, Plus, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function WastageReportsPage() {
  const { permissions } = usePermissions()
  
  // Check individual CRUD permissions
  const canRead = hasPermission(permissions, 'wastagereport.read')
  const canWrite = hasPermission(permissions, 'wastagereport.write')
  const canUpdate = hasPermission(permissions, 'wastagereport.update')
  const canDelete = hasPermission(permissions, 'wastagereport.delete')

  return (
    <PermissionGuard permission="wastagereport.view">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Trash2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Wastage Reports</h1>
          </div>
          {canWrite && (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Wastage Report
            </Button>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3 text-blue-900">🚧 Coming Soon</h2>
          <p className="text-blue-800 mb-4">
            The Wastage Reports module is currently under development. This page will allow you to:
          </p>
          <ul className="list-disc list-inside space-y-2 text-blue-800 mb-4">
            <li>Track and analyze wastage patterns across products</li>
            <li>Generate wastage reports by date range, category, or reason</li>
            <li>View wastage cost impact on business profitability</li>
            <li>Identify high-wastage items for better inventory control</li>
            <li>Export wastage data for accounting and analysis</li>
          </ul>
          
          <div className="bg-white rounded-lg p-4 mt-4">
            <h3 className="font-semibold mb-2">Your Current Permissions:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex items-center gap-2">
                {canRead ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className={canRead ? 'text-green-700' : 'text-red-700'}>
                  Read
                </span>
              </div>
              <div className="flex items-center gap-2">
                {canWrite ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className={canWrite ? 'text-green-700' : 'text-red-700'}>
                  Write
                </span>
              </div>
              <div className="flex items-center gap-2">
                {canUpdate ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className={canUpdate ? 'text-green-700' : 'text-red-700'}>
                  Update
                </span>
              </div>
              <div className="flex items-center gap-2">
                {canDelete ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className={canDelete ? 'text-green-700' : 'text-red-700'}>
                  Delete
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PermissionGuard>
  )
}
