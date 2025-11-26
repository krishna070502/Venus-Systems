'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api/client'
import { Activity, Database, Zap } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useRouter } from 'next/navigation'
import { usePermissions } from '@/lib/auth/usePermissions'

interface QuickStatus {
  backend: {
    status: string
    response_time_ms: number
  }
  database: {
    status: string
    latency_ms?: number
    error?: string
  }
}

export function StatusIndicators() {
  const [status, setStatus] = useState<QuickStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { permissions, loading: permLoading } = usePermissions()

  // Check if user has permission to view status indicators
  const canViewStatus = permissions.includes('system.status')

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await api.health.getStatus() as QuickStatus
        setStatus(data)
      } catch (error) {
        console.error('Error fetching status:', error)
        setStatus({
          backend: { status: 'unhealthy', response_time_ms: 0 },
          database: { status: 'unhealthy', error: 'Failed to connect' }
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 30000) // Refresh every 30s

    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          dot: 'bg-emerald-500',
          text: 'text-emerald-700',
          icon: 'text-emerald-600'
        }
      case 'degraded':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          dot: 'bg-amber-500',
          text: 'text-amber-700',
          icon: 'text-amber-600'
        }
      default:
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          dot: 'bg-red-500',
          text: 'text-red-700',
          icon: 'text-red-600'
        }
    }
  }

  const handleClick = () => {
    router.push('/admin/health')
  }

  // Don't show status indicators if user doesn't have permission
  if (permLoading) {
    return null
  }

  if (!canViewStatus) {
    return null
  }

  if (loading || !status) {
    return (
      <div className="flex items-center gap-2 mr-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse" />
          <Zap className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs font-medium text-gray-400">API</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse" />
          <Database className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs font-medium text-gray-400">DB</span>
        </div>
      </div>
    )
  }

  const apiColors = getStatusColor(status.backend.status)
  const dbColors = getStatusColor(status.database.status)

  return (
    <TooltipProvider>
      <div 
        className="flex items-center gap-2 mr-4 cursor-pointer group"
        onClick={handleClick}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-2 px-3 py-1.5 ${apiColors.bg} border ${apiColors.border} rounded-lg transition-all duration-200 group-hover:shadow-md`}>
              <div className="relative">
                <div className={`w-1.5 h-1.5 ${apiColors.dot} rounded-full`} />
                <div className={`absolute inset-0 w-1.5 h-1.5 ${apiColors.dot} rounded-full animate-ping opacity-75`} />
              </div>
              <Zap className={`h-3.5 w-3.5 ${apiColors.icon}`} />
              <span className={`text-xs font-semibold ${apiColors.text}`}>API</span>
              <span className={`text-xs font-mono ${apiColors.text} opacity-70`}>
                {status.backend.response_time_ms.toFixed(0)}ms
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-gray-900 text-white border-gray-700">
            <div className="text-xs space-y-1">
              <div className="font-semibold">Backend API</div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Status:</span>
                <span className="capitalize">{status.backend.status}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Response:</span>
                <span>{status.backend.response_time_ms.toFixed(2)}ms</span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-2 px-3 py-1.5 ${dbColors.bg} border ${dbColors.border} rounded-lg transition-all duration-200 group-hover:shadow-md`}>
              <div className="relative">
                <div className={`w-1.5 h-1.5 ${dbColors.dot} rounded-full`} />
                <div className={`absolute inset-0 w-1.5 h-1.5 ${dbColors.dot} rounded-full animate-ping opacity-75`} />
              </div>
              <Database className={`h-3.5 w-3.5 ${dbColors.icon}`} />
              <span className={`text-xs font-semibold ${dbColors.text}`}>DB</span>
              {status.database.latency_ms && (
                <span className={`text-xs font-mono ${dbColors.text} opacity-70`}>
                  {status.database.latency_ms.toFixed(0)}ms
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-gray-900 text-white border-gray-700">
            <div className="text-xs space-y-1">
              <div className="font-semibold">Database</div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Status:</span>
                <span className="capitalize">{status.database.status}</span>
              </div>
              {status.database.latency_ms && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Latency:</span>
                  <span>{status.database.latency_ms.toFixed(2)}ms</span>
                </div>
              )}
              {status.database.error && (
                <div className="text-red-400 mt-1">{status.database.error}</div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
