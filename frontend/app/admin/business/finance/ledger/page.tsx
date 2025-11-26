'use client'

import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import { BookOpenCheck, Plus, Edit, Trash2 } from 'lucide-react'

export default function LedgerPage() {
  const { permissions, loading } = usePermissions()

  const canRead = !loading && hasPermission(permissions, 'ledger.read')
  const canWrite = !loading && hasPermission(permissions, 'ledger.write')
  const canUpdate = !loading && hasPermission(permissions, 'ledger.update')
  const canDelete = !loading && hasPermission(permissions, 'ledger.delete')

  return (
    <PermissionGuard permission="ledger.view">
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <BookOpenCheck className="h-8 w-8" />
                Ledger
              </h1>
              <p className="text-muted-foreground mt-2">
                Manage general ledger and accounting entries
              </p>
            </div>
            {canWrite && (
              <button
                disabled
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md opacity-50 cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
                New Entry
              </button>
            )}
          </div>
        </div>

        {/* Coming Soon Notice */}
        <div className="rounded-lg border-2 border-dashed bg-card p-12 text-center">
          <BookOpenCheck className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
          <p className="text-muted-foreground mb-4">
            The Ledger Management module is currently under development.
          </p>
          
          {/* Permission Status */}
          <div className="mt-6 inline-block text-left">
            <p className="text-sm font-semibold mb-2">Your Permissions:</p>
            <ul className="text-sm space-y-1">
              <li className={canRead ? 'text-green-600' : 'text-muted-foreground'}>
                {canRead ? '✓' : '✗'} Read ledger records
              </li>
              <li className={canWrite ? 'text-green-600' : 'text-muted-foreground'}>
                {canWrite ? '✓' : '✗'} Create ledger entries
              </li>
              <li className={canUpdate ? 'text-green-600' : 'text-muted-foreground'}>
                {canUpdate ? '✓' : '✗'} Update ledger entries
              </li>
              <li className={canDelete ? 'text-green-600' : 'text-muted-foreground'}>
                {canDelete ? '✓' : '✗'} Delete ledger entries
              </li>
            </ul>
          </div>
        </div>
      </div>
    </PermissionGuard>
  )
}
