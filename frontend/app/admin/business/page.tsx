'use client'

import { PermissionGuard } from '@/components/admin/PermissionGuard'

export default function BusinessDashboardPage() {
  return (
    <PermissionGuard permission="businessdashboard.view">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Business Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage your business operations from here
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Add your business metrics and widgets here */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-semibold mb-2">Sales Overview</h3>
            <p className="text-sm text-muted-foreground">
              Coming soon...
            </p>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-semibold mb-2">Inventory</h3>
            <p className="text-sm text-muted-foreground">
              Coming soon...
            </p>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-semibold mb-2">Orders</h3>
            <p className="text-sm text-muted-foreground">
              Coming soon...
            </p>
          </div>
        </div>
      </div>
    </PermissionGuard>
  )
}
