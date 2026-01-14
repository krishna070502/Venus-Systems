'use client'

import { useState, useEffect, useCallback } from 'react'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import {
  Customer,
  CustomerCreate,
  CustomerStatus,
  FinancialLedgerEntry
} from '@/lib/types/poultry'
import {
  UserCheck,
  Plus,
  Edit,
  Trash2,
  Phone,
  Mail,
  Loader2,
  Search,
  X,
  AlertCircle,
  IndianRupee,
  History,
  FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api/client'

export default function CustomersPage() {
  const { permissions, loading: permLoading } = usePermissions()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | ''>('')

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState<CustomerCreate>({
    name: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    credit_limit: 0,
    notes: '',
  })

  // Ledger state
  const [showLedger, setShowLedger] = useState(false)
  const [selectedLedgerCustomer, setSelectedLedgerCustomer] = useState<Customer | null>(null)
  const [ledgerEntries, setLedgerEntries] = useState<FinancialLedgerEntry[]>([])
  const [loadingLedger, setLoadingLedger] = useState(false)

  const canCreate = !permLoading && hasPermission(permissions, 'customer.write')
  const canEdit = !permLoading && hasPermission(permissions, 'customer.update')
  const canDelete = !permLoading && hasPermission(permissions, 'customer.delete')

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.poultry.customers.getAll(statusFilter || undefined)
      setCustomers(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err.message || 'Failed to load customers')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  const fetchLedger = async (customer: Customer) => {
    setSelectedLedgerCustomer(customer)
    setShowLedger(true)
    setLoadingLedger(true)
    try {
      const data = await api.poultry.customers.getLedger(customer.id)
      setLedgerEntries(Array.isArray(data) ? data : [])
    } catch (err: any) {
      console.error('Failed to fetch ledger:', err)
    } finally {
      setLoadingLedger(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const openCreateModal = () => {
    setEditingCustomer(null)
    setFormData({
      name: '', phone: '', email: '', address: '',
      gstin: '', credit_limit: 0, notes: '',
    })
    setSaveError(null)
    setShowModal(true)
  }

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      gstin: customer.gstin || '',
      credit_limit: customer.credit_limit || 0,
      notes: customer.notes || '',
    })
    setSaveError(null)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setSaveError('Customer name is required')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      if (editingCustomer) {
        await api.poultry.customers.update(editingCustomer.id, formData)
      } else {
        await api.poultry.customers.create(formData)
      }
      setShowModal(false)
      fetchCustomers()
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save customer')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Are you sure you want to deactivate "${customer.name}"?`)) return
    try {
      await api.poultry.customers.delete(customer.id)
      fetchCustomers()
    } catch (err: any) {
      alert(err.message || 'Failed to deactivate customer')
    }
  }

  const statusColors: Record<CustomerStatus, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    INACTIVE: 'bg-gray-100 text-gray-800',
    BLOCKED: 'bg-red-100 text-red-800',
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
  }

  return (
    <PermissionGuard permission="customer.view">
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <UserCheck className="h-8 w-8" />
              Customers
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your customer database for direct sales
            </p>
          </div>
          {canCreate && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Customer
            </button>
          )}
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CustomerStatus | '')}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="BLOCKED">Blocked</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-6 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No customers found</p>
          </div>
        ) : (
          <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Contact</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Credit Limit</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Outstanding</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-4">
                        <div className="font-medium">{customer.name}</div>
                        {customer.gstin && (
                          <div className="text-xs text-muted-foreground">
                            GSTIN: {customer.gstin}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {customer.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" /> {customer.phone}
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" /> {customer.email}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn("px-2 py-1 rounded-full text-xs font-medium", statusColors[customer.status])}>
                          {customer.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right text-sm">
                        {formatCurrency(customer.credit_limit || 0)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className={cn(
                          "font-medium",
                          (customer.outstanding_balance || 0) > 0 ? "text-amber-600" : "text-green-600"
                        )}>
                          {formatCurrency(customer.outstanding_balance || 0)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => fetchLedger(customer)} className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors" title="View Ledger">
                            <History className="h-4 w-4" />
                          </button>
                          {canEdit && customer.id !== '00000000-0000-0000-0000-000000000000' && (
                            <button onClick={() => openEditModal(customer)} className="p-2 hover:bg-accent rounded-lg" title="Edit">
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          {canDelete && customer.id !== '00000000-0000-0000-0000-000000000000' && (
                            <button onClick={() => handleDelete(customer)} className="p-2 hover:bg-destructive/10 text-destructive rounded-lg" title="Deactivate">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Customer Edit/Create Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-lg border shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold">{editingCustomer ? 'Edit Customer' : 'Add Customer'}</h2>
                <button onClick={() => setShowModal(false)} className="p-1 hover:bg-accent rounded"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                {saveError && <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{saveError}</div>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Name <span className="text-destructive">*</span></label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-background" placeholder="Customer name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-background" placeholder="+91 98765 43210" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-background" placeholder="customer@example.com" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Address</label>
                    <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-background" rows={2} placeholder="Full address" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">GSTIN</label>
                    <input type="text" value={formData.gstin} onChange={(e) => setFormData({ ...formData, gstin: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-background" placeholder="22AAAAA0000A1Z5" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Credit Limit</label>
                    <input type="number" value={formData.credit_limit} onChange={(e) => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg bg-background" placeholder="0" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Notes</label>
                    <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-background" rows={2} placeholder="Additional notes..." />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg hover:bg-accent transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingCustomer ? 'Update Customer' : 'Create Customer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Ledger Modal */}
        {showLedger && selectedLedgerCustomer && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-2xl border shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <History className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedLedgerCustomer.name}</h2>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Financial Transaction Ledger</p>
                  </div>
                </div>
                <button onClick={() => setShowLedger(false)} className="p-2 hover:bg-accent rounded-full transition-colors"><X className="h-5 w-5" /></button>
              </div>

              <div className="flex-1 overflow-auto p-6">
                {loadingLedger ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-sm font-medium text-muted-foreground">Loading transactions...</p>
                  </div>
                ) : ledgerEntries.length === 0 ? (
                  <div className="text-center py-20 flex flex-col items-center gap-4 opacity-40">
                    <FileText className="h-16 w-16" />
                    <p className="font-bold">No transactions found</p>
                  </div>
                ) : (
                  <div className="rounded-xl border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr className="border-b">
                          <th className="px-4 py-3 text-left font-bold uppercase tracking-tighter text-[10px]">Date</th>
                          <th className="px-4 py-3 text-left font-bold uppercase tracking-tighter text-[10px]">Type</th>
                          <th className="px-4 py-3 text-right font-bold uppercase tracking-tighter text-[10px]">Debit</th>
                          <th className="px-4 py-3 text-right font-bold uppercase tracking-tighter text-[10px]">Credit</th>
                          <th className="px-4 py-3 text-left font-bold uppercase tracking-tighter text-[10px]">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {ledgerEntries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-4 font-medium tabular-nums opacity-70">
                              {new Date(entry.created_at).toLocaleDateString()} {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-4 py-4">
                              <span className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight",
                                entry.transaction_type === 'SALE' ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
                              )}>
                                {entry.transaction_type}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right font-mono text-red-600 font-bold">
                              {Number(entry.debit) > 0 ? `₹${Number(entry.debit).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                            <td className="px-4 py-4 text-right font-mono text-green-600 font-bold">
                              {Number(entry.credit) > 0 ? `₹${Number(entry.credit).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                            <td className="px-4 py-4 text-xs opacity-60 italic">
                              {entry.notes || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="p-6 border-t bg-muted/10 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-muted-foreground opacity-50 leading-none mb-1">Total Debit</span>
                    <span className="text-lg font-black text-red-600 leading-none">
                      ₹{ledgerEntries.reduce((sum, e) => sum + Number(e.debit), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-muted-foreground opacity-50 leading-none mb-1">Total Credit</span>
                    <span className="text-lg font-black text-green-600 leading-none">
                      ₹{ledgerEntries.reduce((sum, e) => sum + Number(e.credit), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase text-muted-foreground opacity-50 block leading-none mb-1">Net Outstanding</span>
                  <span className={cn(
                    "text-2xl font-black leading-none",
                    (selectedLedgerCustomer.outstanding_balance || 0) > 0 ? "text-amber-600" : "text-green-600"
                  )}>
                    ₹{Number(selectedLedgerCustomer.outstanding_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  )
}
