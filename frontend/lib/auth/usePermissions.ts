'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/AuthProvider'
import { api } from '@/lib/api/client'

interface UserPermissions {
  roles: string[]
  permissions: string[]
  store_ids: number[]
  loading: boolean
}

export function usePermissions(): UserPermissions {
  const { user, loading: authLoading } = useAuth()
  const [permissions, setPermissions] = useState<UserPermissions>({
    roles: [],
    permissions: [],
    store_ids: [],
    loading: true,
  })

  useEffect(() => {
    // If auth is still loading, keep permissions loading
    if (authLoading) {
      return
    }

    if (!user) {
      setPermissions({ roles: [], permissions: [], store_ids: [], loading: false })
      return
    }

    // Fetch user's roles and permissions from backend
    const fetchPermissions = async () => {
      try {
        const userData = await api.users.getMe() as any

        setPermissions({
          roles: userData.roles || [],
          permissions: userData.permissions || [],
          store_ids: userData.store_ids || [],
          loading: false,
        })
      } catch (error) {
        console.error('Failed to load permissions:', error)
        setPermissions({ roles: [], permissions: [], store_ids: [], loading: false })
      }
    }

    fetchPermissions()
  }, [user, authLoading])

  return permissions
}

export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  return userPermissions.includes(requiredPermission)
}

export function hasRole(userRoles: string[], requiredRole: string): boolean {
  return userRoles.includes(requiredRole)
}

export function hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.some(perm => userPermissions.includes(perm))
}

export function hasAllPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.every(perm => userPermissions.includes(perm))
}
