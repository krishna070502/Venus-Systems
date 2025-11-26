'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api/client'
import { Monitor, Smartphone, Globe, MapPin, Clock, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { PageLoading } from '@/components/ui/loading'

interface Session {
  user_id: string
  email: string
  full_name?: string
  last_sign_in_at: string
  created_at: string
  ip_address?: string
  user_agent?: string
  device_type?: string
  browser?: string
  location?: string
}

interface SessionsResponse {
  sessions: Session[]
  total: number
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const response = await api.admin.getSessions() as SessionsResponse
      setSessions(response.sessions)
      setTotal(response.total)
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDeviceIcon = (deviceType?: string) => {
    if (!deviceType) return Monitor
    if (deviceType === 'Mobile') return Smartphone
    if (deviceType === 'Tablet') return Smartphone
    return Monitor
  }

  const parseUserAgent = (session: Session) => {
    // Use backend-provided device_type and browser if available
    if (session.device_type && session.browser) {
      return {
        device: session.device_type,
        browser: session.browser
      }
    }
    
    // Fallback parsing if not provided
    const userAgent = session.user_agent || ''
    let device = 'Desktop'
    let browser = 'Unknown'
    
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      device = 'Mobile'
    } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
      device = 'Tablet'
    }
    
    if (userAgent.includes('Chrome')) browser = 'Chrome'
    else if (userAgent.includes('Firefox')) browser = 'Firefox'
    else if (userAgent.includes('Safari')) browser = 'Safari'
    else if (userAgent.includes('Edge')) browser = 'Edge'
    
    return { device, browser }
  }

  if (loading) {
    return <PageLoading text="Loading sessions..." />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Active Sessions</h1>
        <p className="text-gray-500 mt-2">
          Monitor user sessions and login activity across your application
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-core-blue">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Active Now</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">
              {sessions.filter(s => {
                const lastSignIn = new Date(s.last_sign_in_at)
                const now = new Date()
                const diffMinutes = (now.getTime() - lastSignIn.getTime()) / 1000 / 60
                return diffMinutes < 30
              }).length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Last 30 minutes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Unique Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {new Set(sessions.map(s => s.user_id)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
          <CardDescription>User login activity and device information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sessions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No active sessions found
              </div>
            ) : (
              sessions.map((session, index) => {
                const { device, browser } = parseUserAgent(session)
                const DeviceIcon = getDeviceIcon(session.device_type)
                const lastSignIn = new Date(session.last_sign_in_at)
                const now = new Date()
                const diffMinutes = (now.getTime() - lastSignIn.getTime()) / 1000 / 60
                const isActiveNow = diffMinutes < 30

                return (
                  <div
                    key={`${session.user_id}-${index}`}
                    className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-core-blue transition-colors"
                  >
                    <div className={`p-3 rounded-lg ${isActiveNow ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-600'}`}>
                      <DeviceIcon className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">
                              {session.full_name || 'Unknown User'}
                            </h3>
                            {isActiveNow && (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                Active
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 flex items-center gap-1.5 mt-1">
                            <User className="h-3.5 w-3.5" />
                            {session.email}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDistanceToNow(new Date(session.last_sign_in_at), { addSuffix: true })}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-700">{device}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-700">{browser}</span>
                        </div>
                        {session.ip_address && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-700 font-mono text-xs">{session.ip_address}</span>
                          </div>
                        )}
                        {session.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-700">{session.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
