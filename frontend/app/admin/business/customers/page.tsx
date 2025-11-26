'use client'

import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import { UserCheck, Plus, Edit, Trash2 } from 'lucide-react'

export default function CustomersPage() {
  const { permissions, loading } = usePermissions()

  const canRead = !loading && hasPermission(permissions, 'customer.read')
  const canWrite = !loading && hasPermission(permissions, 'customer.write')
  const canUpdate = !loading && hasPermission(permissions, 'customer.update')
  const canDelete = !loading && hasPermission(permissions, 'customer.delete')

  return (
    <PermissionGuard permission="customer.view">
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <UserCheck className="h-8 w-8" />
                Customers
              </h1>
              <p className="text-muted-foreground mt-2">
                Manage your customer database and relationships
              </p>
            </div>
            {canWrite && (
              <button
                disabled
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md opacity-50 cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
                New Customer
              </button>
            )}
          </div>
        </div>

        {/* Coming Soon Notice */}
        <div className="rounded-lg border-2 border-dashed bg-card p-12 text-center">
          <UserCheck className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
          <p className="text-muted-foreground mb-4">
            The Customer Management module is currently under development.
          </p>
          
          {/* Permission Status */}
          <div className="mt-6 inline-block text-left">
            <p className="text-sm font-semibold mb-2">Your Permissions:</p>
            <ul className="text-sm space-y-1">
              <li className={canRead ? 'text-green-600' : 'text-muted-foreground'}>
                {canRead ? '✓' : '✗'} Read customer records
              </li>
              <li className={canWrite ? 'text-green-600' : 'text-muted-foreground'}>
                {canWrite ? '✓' : '✗'} Create customer entries
              </li>
              <li className={canUpdate ? 'text-green-600' : 'text-muted-foreground'}>
                {canUpdate ? '✓' : '✗'} Update customer entries
              </li>
              <li className={canDelete ? 'text-green-600' : 'text-muted-foreground'}>
                {canDelete ? '✓' : '✗'} Delete customer entries
              </li>
            </ul>
          </div>
        </div>
      </div>
    </PermissionGuard>
  )
}
