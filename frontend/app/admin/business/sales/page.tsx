'use client'

import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import { TrendingUp, Plus, Edit, Trash2 } from 'lucide-react'

export default function SalesPage() {
  const { permissions, loading } = usePermissions()

  const canRead = !loading && hasPermission(permissions, 'sales.read')
  const canWrite = !loading && hasPermission(permissions, 'sales.write')
  const canUpdate = !loading && hasPermission(permissions, 'sales.update')
  const canDelete = !loading && hasPermission(permissions, 'sales.delete')

  return (
    <PermissionGuard permission="sales.view">
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <TrendingUp className="h-8 w-8" />
                Sales
              </h1>
              <p className="text-muted-foreground mt-2">
                Track and manage your sales transactions
              </p>
            </div>
            {canWrite && (
              <button
                disabled
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md opacity-50 cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
                New Sale
              </button>
            )}
          </div>
        </div>

        {/* Coming Soon Notice */}
        <div className="rounded-lg border-2 border-dashed bg-card p-12 text-center">
          <TrendingUp className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
          <p className="text-muted-foreground mb-4">
            The Sales Management module is currently under development.
          </p>
          
          {/* Permission Status */}
          <div className="mt-6 inline-block text-left">
            <p className="text-sm font-semibold mb-2">Your Permissions:</p>
            <ul className="text-sm space-y-1">
              <li className={canRead ? 'text-green-600' : 'text-muted-foreground'}>
                {canRead ? '✓' : '✗'} Read sales records
              </li>
              <li className={canWrite ? 'text-green-600' : 'text-muted-foreground'}>
                {canWrite ? '✓' : '✗'} Create sales entries
              </li>
              <li className={canUpdate ? 'text-green-600' : 'text-muted-foreground'}>
                {canUpdate ? '✓' : '✗'} Update sales entries
              </li>
              <li className={canDelete ? 'text-green-600' : 'text-muted-foreground'}>
                {canDelete ? '✓' : '✗'} Delete sales entries
              </li>
            </ul>
          </div>
        </div>
      </div>
    </PermissionGuard>
  )
}
