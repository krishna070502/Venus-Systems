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
      create: (data: { name: string; location?: string; is_active?: boolean }) =>
        apiRequest('/api/v1/business-management/shops', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      update: (id: number, data: { name?: string; location?: string; is_active?: boolean }) =>
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
      getAll: (isActive?: boolean, category?: string) => {
        const params = new URLSearchParams()
        if (isActive !== undefined) params.append('is_active', String(isActive))
        if (category) params.append('category', category)
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
}
