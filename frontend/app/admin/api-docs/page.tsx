'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions } from '@/lib/auth/usePermissions'
import { useAuth } from '@/lib/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { PageLoading } from '@/components/ui/loading'
import { AlertCircle, RefreshCw, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Script from 'next/script'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function ApiDocsPage() {
    const router = useRouter()
    const { user, loading: authLoading } = useAuth()
    const { permissions, loading: permLoading } = usePermissions()
    const [token, setToken] = useState<string | null>(null)
    const [spec, setSpec] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [swaggerLoaded, setSwaggerLoaded] = useState(false)
    const swaggerRef = useRef<HTMLDivElement>(null)

    const hasDocsPermission = permissions.includes('system.docs') ||
        permissions.some(p => p.includes('Admin'))

    // Get auth token
    useEffect(() => {
        async function getToken() {
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.access_token) {
                setToken(session.access_token)
            } else {
                setError('No active session. Please sign in.')
            }
        }

        if (user && hasDocsPermission) {
            getToken()
        }
    }, [user, hasDocsPermission])

    // Fetch OpenAPI spec with auth
    useEffect(() => {
        async function fetchSpec() {
            if (!token) return

            try {
                const response = await fetch(`${API_URL}/openapi.json`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                })

                if (!response.ok) {
                    throw new Error(`Failed to fetch API spec: ${response.status}`)
                }

                const data = await response.json()
                setSpec(data)
            } catch (err: any) {
                setError(err.message || 'Failed to load API documentation')
            }
        }

        fetchSpec()
    }, [token])

    // Initialize Swagger UI when spec is ready
    useEffect(() => {
        if (spec && swaggerLoaded && swaggerRef.current && (window as any).SwaggerUIBundle) {
            (window as any).SwaggerUIBundle({
                spec: spec,
                dom_id: '#swagger-ui',
                presets: [
                    (window as any).SwaggerUIBundle.presets.apis,
                    (window as any).SwaggerUIStandalonePreset,
                ],
                layout: 'StandaloneLayout',
                requestInterceptor: (req: any) => {
                    // Auto-inject auth token for all requests
                    req.headers['Authorization'] = `Bearer ${token}`
                    return req
                },
            })
        }
    }, [spec, swaggerLoaded, token])

    const copyToken = () => {
        if (token) {
            navigator.clipboard.writeText(token)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    // Loading states
    if (authLoading || permLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <PageLoading />
            </div>
        )
    }

    // Not authenticated
    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <AlertCircle className="h-16 w-16 text-destructive" />
                <h1 className="text-2xl font-bold">Authentication Required</h1>
                <p className="text-muted-foreground">Please sign in to access API documentation.</p>
                <Button onClick={() => router.push('/auth/login')}>
                    Sign In
                </Button>
            </div>
        )
    }

    // No permission
    if (!hasDocsPermission) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <AlertCircle className="h-16 w-16 text-destructive" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground">
                    You need the <code className="bg-muted px-2 py-1 rounded">system.docs</code> permission.
                </p>
                <Button variant="outline" onClick={() => router.push('/admin')}>
                    Back to Dashboard
                </Button>
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <AlertCircle className="h-16 w-16 text-destructive" />
                <h1 className="text-2xl font-bold">Error</h1>
                <p className="text-muted-foreground">{error}</p>
                <Button onClick={() => window.location.reload()}>
                    Retry
                </Button>
            </div>
        )
    }

    return (
        <>
            {/* Load Swagger UI from CDN */}
            <Script
                src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"
                onLoad={() => setSwaggerLoaded(true)}
            />
            <Script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js" />
            <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />

            <div className="h-screen flex flex-col">
                {/* Header Bar */}
                <div className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
                    <div>
                        <h1 className="text-xl font-bold">API Documentation</h1>
                        <p className="text-sm text-muted-foreground">
                            Authenticated Swagger UI • Token auto-injected
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.location.reload()}
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={copyToken}
                        >
                            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                            {copied ? 'Copied!' : 'Copy Token'}
                        </Button>
                    </div>
                </div>

                {/* Swagger UI Container */}
                <div className="flex-1 overflow-auto">
                    {(!spec || !swaggerLoaded) ? (
                        <div className="flex items-center justify-center h-full">
                            <PageLoading />
                        </div>
                    ) : (
                        <div id="swagger-ui" ref={swaggerRef} />
                    )}
                </div>
            </div>
        </>
    )
}
