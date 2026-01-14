/**
 * API Client
 * ==========
 * Utility functions for making authenticated API requests to FastAPI backend
 */

import { createClient } from '@/lib/supabase/client'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * Get the current session token
 */
async function getAuthToken(): Promise<string | null> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

/**
 * Make an authenticated API request
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'An error occurred' }))
    throw new Error(error.detail || error.message || 'API request failed')
  }

  return response.json()
}

/**
 * API Methods
 */
export const api = {
  // User endpoints
  users: {
    getMe: () => apiRequest('/api/v1/users/me'),
    updateMe: (data: any) => apiRequest('/api/v1/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    getAll: (limit = 100, offset = 0) =>
      apiRequest(`/api/v1/users?limit=${limit}&offset=${offset}`),
    getById: (id: string) => apiRequest(`/api/v1/users/${id}`),
    update: (id: string, data: any) => apiRequest(`/api/v1/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => apiRequest(`/api/v1/users/${id}`, {
      method: 'DELETE',
    }),
    search: (query: string) => apiRequest(`/api/v1/users/search/?q=${query}`),
  },

  // Role endpoints
  roles: {
    getAll: () => apiRequest('/api/v1/roles'),
    getById: (id: number) => apiRequest(`/api/v1/roles/${id}`),
    create: (data: any) => apiRequest('/api/v1/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: number, data: any) => apiRequest(`/api/v1/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: number) => apiRequest(`/api/v1/roles/${id}`, {
      method: 'DELETE',
    }),
    assignPermission: (roleId: number, permissionId: number) =>
      apiRequest(`/api/v1/roles/${roleId}/permissions/${permissionId}`, {
        method: 'POST',
      }),
    removePermission: (roleId: number, permissionId: number) =>
      apiRequest(`/api/v1/roles/${roleId}/permissions/${permissionId}`, {
        method: 'DELETE',
      }),
  },

  // Permission endpoints
  permissions: {
    getAll: () => apiRequest('/api/v1/permissions'),
    getById: (id: number) => apiRequest(`/api/v1/permissions/${id}`),
    create: (data: any) => apiRequest('/api/v1/permissions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: number, data: any) => apiRequest(`/api/v1/permissions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: number) => apiRequest(`/api/v1/permissions/${id}`, {
      method: 'DELETE',
    }),
  },

  // Admin endpoints
  admin: {
    getUsers: (limit = 100, offset = 0) =>
      apiRequest(`/api/v1/admin/users?limit=${limit}&offset=${offset}`),
    assignRole: (userId: string, roleId: number) =>
      apiRequest(`/api/v1/admin/users/${userId}/roles/${roleId}`, {
        method: 'POST',
      }),
    removeRole: (userId: string, roleId: number) =>
      apiRequest(`/api/v1/admin/users/${userId}/roles/${roleId}`, {
        method: 'DELETE',
      }),
    getRoles: () => apiRequest('/api/v1/admin/roles'),
    getSettings: () => apiRequest('/api/v1/admin/settings'),
    updateSettings: (data: any) => apiRequest('/api/v1/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    getLogs: (limit = 100, offset = 0) =>
      apiRequest(`/api/v1/admin/logs?limit=${limit}&offset=${offset}`),
    getStats: () => apiRequest('/api/v1/admin/stats'),
    getSessions: () => apiRequest('/api/v1/admin/sessions'),
  },

  // Auth endpoints
  auth: {
    getMe: () => apiRequest('/api/v1/auth/me'),
    logout: () => apiRequest('/api/v1/auth/logout', { method: 'POST' }),
    recordSession: () => apiRequest('/api/v1/auth/record-session', { method: 'POST' }),
  },

  // Health endpoints
  health: {
    getStatus: () => apiRequest('/api/v1/health/status'),
    getDetailed: () => apiRequest('/api/v1/health/detailed'),
  },

  // Business Management endpoints
  businessManagement: {
    // Shops
    shops: {
      getAll: (isActive?: boolean) => {
        const params = isActive !== undefined ? `?is_active=${isActive}` : ''
        return apiRequest(`/api/v1/business-management/shops${params}`)
      },
      getById: (id: number) => apiRequest(`/api/v1/business-management/shops/${id}`),
      create: (data: { name: string; location?: string; timezone?: string; is_active?: boolean }) =>
        apiRequest('/api/v1/business-management/shops', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      update: (id: number, data: { name?: string; location?: string; timezone?: string; is_active?: boolean }) =>
        apiRequest(`/api/v1/business-management/shops/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
      delete: (id: number) =>
        apiRequest(`/api/v1/business-management/shops/${id}`, {
          method: 'DELETE',
        }),
    },

    // Managers
    managers: {
      getAll: () => apiRequest('/api/v1/business-management/managers'),
      getUnassigned: () => apiRequest('/api/v1/business-management/managers/unassigned'),
      onboard: (data: {
        user_id: string
        shop_id: number
        qualifications?: string
        contact_number?: string
      }) =>
        apiRequest('/api/v1/business-management/managers/onboard', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      remove: (userId: string) =>
        apiRequest(`/api/v1/business-management/managers/${userId}`, {
          method: 'DELETE',
        }),
    },

    // Inventory Items
    inventory: {
      getAll: (isActive?: boolean, category?: string, itemType?: string) => {
        const params = new URLSearchParams()
        if (isActive !== undefined) params.append('is_active', String(isActive))
        if (category) params.append('category', category)
        if (itemType) params.append('item_type', itemType)
        const queryString = params.toString() ? `?${params.toString()}` : ''
        return apiRequest(`/api/v1/business-management/inventory${queryString}`)
      },
      getById: (id: number) => apiRequest(`/api/v1/business-management/inventory/${id}`),
      create: (data: {
        name: string
        sku?: string
        category?: string
        base_price: number
        unit?: string
        item_type?: string
        is_active?: boolean
      }) =>
        apiRequest('/api/v1/business-management/inventory', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      update: (id: number, data: {
        name?: string
        sku?: string
        category?: string
        base_price?: number
        unit?: string
        item_type?: string
        is_active?: boolean
      }) =>
        apiRequest(`/api/v1/business-management/inventory/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
      delete: (id: number) =>
        apiRequest(`/api/v1/business-management/inventory/${id}`, {
          method: 'DELETE',
        }),
    },

    // Prices
    prices: {
      getDaily: (shopId: number, date: string) =>
        apiRequest(`/api/v1/business-management/prices/daily?shop_id=${shopId}&date=${date}`),
      bulkUpdate: (data: {
        shop_id: number
        date: string
        items: Array<{ item_id: number; price: number }>
      }) =>
        apiRequest('/api/v1/business-management/prices/bulk-update', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      deleteDaily: (shopId: number, itemId: number, date: string) =>
        apiRequest(
          `/api/v1/business-management/prices/daily?shop_id=${shopId}&item_id=${itemId}&date=${date}`,
          { method: 'DELETE' }
        ),
      updateBasePrice: (itemId: number, price: number) =>
        apiRequest(`/api/v1/business-management/inventory/${itemId}`, {
          method: 'PUT',
          body: JSON.stringify({ base_price: price }),
        }),
    },
  },

  // Rate Limits endpoints
  rateLimits: {
    getAll: () => apiRequest('/api/v1/rate-limits'),
    getById: (id: number) => apiRequest(`/api/v1/rate-limits/${id}`),
    update: (id: number, data: { requests_per_minute?: number; requests_per_hour?: number; enabled?: boolean }) =>
      apiRequest(`/api/v1/rate-limits/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    toggle: (id: number) =>
      apiRequest(`/api/v1/rate-limits/${id}/toggle`, {
        method: 'POST',
      }),
  },

  // AI Assistant endpoints
  ai: {
    getStatus: () => apiRequest('/api/v1/ai/status'),
    chat: (message: string, conversationId?: string, currentPage?: string) =>
      apiRequest('/api/v1/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message, conversation_id: conversationId, current_page: currentPage }),
      }),
    getConversations: () => apiRequest('/api/v1/ai/conversations'),
    createConversation: (title: string = 'New Conversation') =>
      apiRequest('/api/v1/ai/conversations', {
        method: 'POST',
        body: JSON.stringify({ title }),
      }),
    getConversation: (id: string) => apiRequest(`/api/v1/ai/conversations/${id}`),
    deleteConversation: (id: string) =>
      apiRequest(`/api/v1/ai/conversations/${id}`, {
        method: 'DELETE',
      }),
    // Admin
    getConfigs: () => apiRequest('/api/v1/ai/configs'),
    updateConfig: (id: number, data: { enabled?: boolean; allowed_tables?: string[]; allowed_pages?: string[]; can_execute_actions?: boolean; max_queries_per_hour?: number }) =>
      apiRequest(`/api/v1/ai/configs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    toggleConfig: (id: number) =>
      apiRequest(`/api/v1/ai/configs/${id}/toggle`, {
        method: 'POST',
      }),
  },

  // ============ Poultry Retail Endpoints ============
  poultry: {
    // Suppliers
    suppliers: {
      getAll: (status?: string) => {
        const params = status ? `?status=${status}` : ''
        return apiRequest(`/api/v1/poultry/suppliers${params}`)
      },
      getById: (id: string) => apiRequest(`/api/v1/poultry/suppliers/${id}`),
      create: (data: any) => apiRequest('/api/v1/poultry/suppliers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      update: (id: string, data: any) => apiRequest(`/api/v1/poultry/suppliers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
      delete: (id: string) => apiRequest(`/api/v1/poultry/suppliers/${id}`, {
        method: 'DELETE',
      }),
    },

    // Purchases
    purchases: {
      getAll: (storeId: number, status?: string) => {
        const params = new URLSearchParams()
        if (status) params.append('status', status)
        const query = params.toString() ? `?${params.toString()}` : ''
        return apiRequest(`/api/v1/poultry/purchases${query}`, {
          headers: { 'X-Store-ID': storeId.toString() },
        })
      },
      getById: (id: string) => apiRequest(`/api/v1/poultry/purchases/${id}`),
      create: (data: any) => apiRequest('/api/v1/poultry/purchases', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      commit: (id: string, data: any = {}) => apiRequest(`/api/v1/poultry/purchases/${id}/commit`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      cancel: (id: string) => apiRequest(`/api/v1/poultry/purchases/${id}/cancel`, {
        method: 'POST',
      }),
    },

    // Inventory
    inventory: {
      getStock: (storeId: number) => apiRequest('/api/v1/poultry/inventory/stock', {
        headers: { 'X-Store-ID': storeId.toString() },
      }),
      getStockByBirdType: (storeId: number, birdType: string) =>
        apiRequest(`/api/v1/poultry/inventory/stock/${birdType}`, {
          headers: { 'X-Store-ID': storeId.toString() },
        }),
      getLedger: (storeId: number, params?: { bird_type?: string; inventory_type?: string; limit?: number; offset?: number }) => {
        const query = new URLSearchParams()
        if (params?.bird_type) query.append('bird_type', params.bird_type)
        if (params?.inventory_type) query.append('inventory_type', params.inventory_type)
        if (params?.limit) query.append('limit', params.limit.toString())
        if (params?.offset) query.append('offset', params.offset.toString())
        const queryStr = query.toString() ? `?${query.toString()}` : ''
        return apiRequest(`/api/v1/poultry/inventory/ledger${queryStr}`, {
          headers: { 'X-Store-ID': storeId.toString() },
        })
      },
      getMovement: (storeId: number, date: string) =>
        apiRequest(`/api/v1/poultry/inventory/movement?date=${date}`, {
          headers: { 'X-Store-ID': storeId.toString() },
        }),
      adjust: (data: any) => apiRequest('/api/v1/poultry/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      getReasonCodes: () => apiRequest('/api/v1/poultry/inventory/reason-codes'),
    },

    // Processing
    processing: {
      getAll: (storeId: number, params?: { limit?: number; offset?: number }) => {
        const query = new URLSearchParams()
        if (params?.limit) query.append('limit', params.limit.toString())
        if (params?.offset) query.append('offset', params.offset.toString())
        const queryStr = query.toString() ? `?${query.toString()}` : ''
        return apiRequest(`/api/v1/poultry/processing${queryStr}`, {
          headers: { 'X-Store-ID': storeId.toString() },
        })
      },
      create: (data: any) => apiRequest('/api/v1/poultry/processing', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      calculateYield: (params: { input_weight: number; bird_type: string; output_type: string }) => {
        const query = new URLSearchParams()
        query.append('input_weight', params.input_weight.toString())
        query.append('bird_type', params.bird_type)
        query.append('output_type', params.output_type)
        const queryStr = query.toString() ? `?${query.toString()}` : ''
        return apiRequest(`/api/v1/poultry/processing/calculate${queryStr}`)
      },
      getWastageConfig: (birdType?: string) => {
        const params = birdType ? `?bird_type=${birdType}` : ''
        return apiRequest(`/api/v1/poultry/processing/wastage-config${params}`)
      },
      setWastageConfig: (data: any) => apiRequest('/api/v1/poultry/processing/wastage-config', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    },

    // SKUs
    skus: {
      getAll: (params?: { bird_type?: string; inventory_type?: string; is_active?: boolean }) => {
        const query = new URLSearchParams()
        if (params?.bird_type) query.append('bird_type', params.bird_type)
        if (params?.inventory_type) query.append('inventory_type', params.inventory_type)
        if (params?.is_active !== undefined) query.append('is_active', params.is_active.toString())
        const queryStr = query.toString() ? `?${query.toString()}` : ''
        return apiRequest(`/api/v1/poultry/skus${queryStr}`)
      },
      getById: (id: string) => apiRequest(`/api/v1/poultry/skus/${id}`),
      create: (data: any) => apiRequest('/api/v1/poultry/skus', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      update: (id: string, data: any) => apiRequest(`/api/v1/poultry/skus/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
      getPrices: (storeId: number) => apiRequest('/api/v1/poultry/skus/prices/store', {
        headers: { 'X-Store-ID': storeId.toString() },
      }),
      setPrice: (data: any) => apiRequest('/api/v1/poultry/skus/prices/store', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      bulkPrices: (data: { store_id: number; effective_date: string; prices: Array<{ sku_id: string; price: number }> }) =>
        apiRequest(`/api/v1/poultry/skus/prices/bulk?store_id=${data.store_id}&effective_date=${data.effective_date}`, {
          method: 'POST',
          body: JSON.stringify(data.prices),
        }),
    },

    // Sales
    sales: {
      getAll: (storeId: number, params?: { date?: string; sale_type?: string; limit?: number; offset?: number }) => {
        const query = new URLSearchParams()
        if (params?.date) query.append('date', params.date)
        if (params?.sale_type) query.append('sale_type', params.sale_type)
        if (params?.limit) query.append('limit', params.limit.toString())
        if (params?.offset) query.append('offset', params.offset.toString())
        const queryStr = query.toString() ? `?${query.toString()}` : ''
        return apiRequest(`/api/v1/poultry/sales${queryStr}`, {
          headers: { 'X-Store-ID': storeId.toString() },
        })
      },
      getById: (id: string) => apiRequest(`/api/v1/poultry/sales/${id}`),
      create: (data: any) => apiRequest('/api/v1/poultry/sales', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      getSummary: (storeId: number, date: string) =>
        apiRequest(`/api/v1/poultry/sales/summary?date=${date}`, {
          headers: { 'X-Store-ID': storeId.toString() },
        }),
    },

    // Settlements
    settlements: {
      getAll: (storeId: number, params?: { status?: string; limit?: number; offset?: number }) => {
        const query = new URLSearchParams()
        if (params?.status) query.append('status', params.status)
        if (params?.limit) query.append('limit', params.limit.toString())
        if (params?.offset) query.append('offset', params.offset.toString())
        const queryStr = query.toString() ? `?${query.toString()}` : ''
        return apiRequest(`/api/v1/poultry/settlements${queryStr}`, {
          headers: { 'X-Store-ID': storeId.toString() },
        })
      },
      getById: (id: string) => apiRequest(`/api/v1/poultry/settlements/${id}`),
      getExpected: (storeId: number, date: string) =>
        apiRequest(`/api/v1/poultry/settlements/expected?summary_date=${date}`, {
          headers: { 'X-Store-ID': storeId.toString() },
        }),
      create: (data: any) => apiRequest('/api/v1/poultry/settlements', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      submit: (id: string, data: any) => apiRequest(`/api/v1/poultry/settlements/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      approve: (id: string) => apiRequest(`/api/v1/poultry/settlements/${id}/approve`, {
        method: 'POST',
      }),
      lock: (id: string) => apiRequest(`/api/v1/poultry/settlements/${id}/lock`, {
        method: 'POST',
      }),
    },

    // Variance
    variance: {
      getAll: (storeId: number, params?: { status?: string }) => {
        const query = params?.status ? `?status=${params.status}` : ''
        return apiRequest(`/api/v1/poultry/variance${query}`, {
          headers: { 'X-Store-ID': storeId.toString() },
        })
      },
      getById: (id: string) => apiRequest(`/api/v1/poultry/variance/${id}`),
      approve: (id: string, data: any) => apiRequest(`/api/v1/poultry/variance/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      deduct: (id: string, data?: any) => apiRequest(`/api/v1/poultry/variance/${id}/deduct`, {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      }),
      getPending: (storeId: number) => apiRequest('/api/v1/poultry/variance/pending', {
        headers: { 'X-Store-ID': storeId.toString() },
      }),
    },

    // Staff Points
    staffPoints: {
      getMy: () => apiRequest('/api/v1/poultry/staff-points/me'),
      getHistory: (params?: { limit?: number; offset?: number }) => {
        const query = new URLSearchParams()
        if (params?.limit) query.append('limit', params.limit.toString())
        if (params?.offset) query.append('offset', params.offset.toString())
        const queryStr = query.toString() ? `?${query.toString()}` : ''
        return apiRequest(`/api/v1/poultry/staff-points/history${queryStr}`)
      },
      getStore: (storeId: number) => apiRequest('/api/v1/poultry/staff-points/store', {
        headers: { 'X-Store-ID': storeId.toString() },
      }),
      getBreakdown: (params?: { user_id?: string; store_id?: number; from_date?: string; to_date?: string }) => {
        const query = new URLSearchParams()
        if (params?.user_id) query.append('user_id', params.user_id)
        if (params?.from_date) query.append('from_date', params.from_date)
        if (params?.to_date) query.append('to_date', params.to_date)
        const queryStr = query.toString() ? `?${query.toString()}` : ''
        const headers: Record<string, string> = {}
        if (params?.store_id) headers['X-Store-ID'] = params.store_id.toString()
        return apiRequest(`/api/v1/poultry/staff-points/breakdown${queryStr}`, { headers })
      },
      add: (data: any) => apiRequest('/api/v1/poultry/staff-points', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      getLeaderboard: (storeId?: number, period?: string) => {
        const query = new URLSearchParams()
        if (period) query.append('period', period)
        const queryStr = query.toString() ? `?${query.toString()}` : ''
        const headers: Record<string, string> = {}
        if (storeId) headers['X-Store-ID'] = storeId.toString()
        return apiRequest(`/api/v1/poultry/staff-points/leaderboard${queryStr}`, { headers })
      },
      getConfig: () => apiRequest('/api/v1/poultry/staff-points/config'),
      updateConfig: (key: string, data: any) => apiRequest(`/api/v1/poultry/staff-points/config/${key}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    },

    // Grading
    grading: {
      getConfig: (storeId?: number) => {
        const params = storeId ? `?store_id=${storeId}` : ''
        return apiRequest(`/api/v1/poultry/grading/config${params}`)
      },
      updateConfig: (key: string, data: any) => apiRequest(`/api/v1/poultry/grading/config/${key}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
      getReasonCodes: () => apiRequest('/api/v1/poultry/grading/reason-codes'),
      updateReasonCode: (code: string, data: any) => apiRequest(`/api/v1/poultry/grading/reason-codes/${code}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
      generatePerformance: (storeId: number, year: number, month: number) =>
        apiRequest(`/api/v1/poultry/grading/performance/generate?store_id=${storeId}&year=${year}&month=${month}`, {
          method: 'POST',
        }),
      getPerformance: (storeId: number, year: number, month: number) =>
        apiRequest(`/api/v1/poultry/grading/performance?year=${year}&month=${month}`, {
          headers: { 'X-Store-ID': storeId.toString() },
        }),
      getMyPerformance: (year?: number, month?: number) => {
        const query = new URLSearchParams()
        if (year) query.append('year', year.toString())
        if (month) query.append('month', month.toString())
        const queryStr = query.toString() ? `?${query.toString()}` : ''
        return apiRequest(`/api/v1/poultry/grading/performance/me${queryStr}`)
      },
      lockPerformance: (storeId: number, year: number, month: number) =>
        apiRequest(`/api/v1/poultry/grading/performance/lock?store_id=${storeId}&year=${year}&month=${month}`, {
          method: 'POST',
        }),
      getSummary: (storeId: number, year: number, month: number) =>
        apiRequest(`/api/v1/poultry/grading/summary/store?year=${year}&month=${month}`, {
          headers: { 'X-Store-ID': storeId.toString() },
        }),
      getFraudFlags: (storeId: number) => apiRequest('/api/v1/poultry/grading/fraud-flags', {
        headers: { 'X-Store-ID': storeId.toString() },
      }),
    },
    // Customers
    customers: {
      getAll: (status?: string) => {
        const params = status ? `?status=${status}` : ''
        return apiRequest(`/api/v1/poultry/customers${params}`)
      },
      getById: (id: string) => apiRequest(`/api/v1/poultry/customers/${id}`),
      getLedger: (id: string) => apiRequest(`/api/v1/poultry/customers/${id}/ledger`),
      create: (data: any) => apiRequest('/api/v1/poultry/customers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      update: (id: string, data: any) => apiRequest(`/api/v1/poultry/customers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
      delete: (id: string) => apiRequest(`/api/v1/poultry/customers/${id}`, {
        method: 'DELETE',
      }),
    },
  },
}

