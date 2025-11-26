'use client'

import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import { UserCog, Plus, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ManagersPage() {
  const { permissions } = usePermissions()
  
  // Check individual CRUD permissions
  const canRead = hasPermission(permissions, 'managers.read')
  const canWrite = hasPermission(permissions, 'managers.write')
  const canUpdate = hasPermission(permissions, 'managers.update')
  const canDelete = hasPermission(permissions, 'managers.delete')

  return (
    <PermissionGuard permission="managers.view">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <UserCog className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Managers</h1>
          </div>
          {canWrite && (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Manager
            </Button>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3 text-blue-900">🚧 Coming Soon</h2>
          <p className="text-blue-800 mb-4">
            The Managers module is currently under development. This page will allow you to:
          </p>
          <ul className="list-disc list-inside space-y-2 text-blue-800 mb-4">
            <li>Manage shop managers and their assignments</li>
            <li>Assign managers to specific shop locations</li>
            <li>Set manager permissions and access levels</li>
            <li>Track manager performance and activities</li>
            <li>Configure manager schedules and availability</li>
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
