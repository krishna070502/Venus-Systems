'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading'
import { AlertCircle, UserX, Eye, EyeOff, ArrowLeft, LayoutDashboard, UserPlus, Shield } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [registrationEnabled, setRegistrationEnabled] = useState(true)
  const { signUp } = useAuth()
  const router = useRouter()

  // Check if registration is enabled
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/auth/registration-status`)
        const data = await response.json()
        setRegistrationEnabled(data.registration_enabled)
      } catch (error) {
        console.error('Failed to check registration status:', error)
        // Default to enabled if check fails
        setRegistrationEnabled(true)
      } finally {
        setCheckingStatus(false)
      }
    }

    checkRegistrationStatus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signUp(email, password, fullName)
      router.push('/admin/home')
    } catch (err: any) {
      setError(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  // Show loading while checking status
  if (checkingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    )
  }

  // Show disabled message if registration is off
  if (!registrationEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/50 via-white to-white relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-core-blue/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-100/20 rounded-full blur-3xl -z-10" />

        <div className="w-full max-w-md space-y-8 relative z-10">
          <div className="flex flex-col items-center text-center space-y-4">
            <Link href="/" className="flex items-center gap-3 group transition-transform hover:scale-105">
              <div className="h-12 w-12 bg-core-blue rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-200">
                <LayoutDashboard className="h-7 w-7 text-white" />
              </div>
              <div className="text-left">
                <span className="text-2xl font-black text-desk-black tracking-tighter uppercase block leading-none">
                  Venus <span className="text-core-blue">Operations</span>
                </span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1 block">Enterprise Control Portal</span>
              </div>
            </Link>
          </div>

          <Card className="border-none shadow-3xl bg-white/80 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="text-center pt-10 pb-6">
              <div className="mx-auto mb-6 p-6 bg-red-50 rounded-[2rem] w-fit border border-red-100 shadow-sm">
                <UserX className="h-12 w-12 text-error-red" />
              </div>
              <CardTitle className="text-3xl font-black text-desk-black tracking-tighter uppercase">Registration Locked</CardTitle>
              <CardDescription className="font-bold text-gray-400 mt-2 uppercase tracking-widest text-[10px]">
                System Security Protocol Active
              </CardDescription>
            </CardHeader>
            <CardContent className="px-10 text-center space-y-6">
              <div className="p-6 bg-orange-50 rounded-2xl border border-orange-100">
                <div className="flex items-center justify-center gap-2 text-warning-yellow mb-2">
                  <AlertCircle className="h-5 w-5" />
                  <p className="font-black uppercase tracking-tight text-sm">Access Restricted</p>
                </div>
                <p className="text-sm text-gray-500 font-bold leading-relaxed">
                  New personnel enrollment is currently disabled by system administrators.
                  Existing credentials remain valid for authorized entry.
                </p>
              </div>
              <p className="text-[11px] text-gray-400 font-medium italic">
                Please contact the IT Security Department if you require new operational access.
              </p>
            </CardContent>
            <CardFooter className="px-10 pb-10 pt-4 flex flex-col space-y-4">
              <Link href="/auth/login" className="w-full">
                <Button className="h-16 w-full bg-desk-black hover:bg-core-blue text-white font-black text-lg shadow-2xl transition-all rounded-2xl flex items-center justify-center gap-3 group">
                  <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                  RETURN TO LOGIN
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <p className="text-[10px] text-center text-gray-400 font-black uppercase tracking-[0.4em] pt-4">
            Venus Chicken - Subsidery of SHIVA AGROVET PVT LTD
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/50 via-white to-white relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-core-blue/5 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-100/20 rounded-full blur-3xl -z-10" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="flex flex-col items-center text-center space-y-4">
          <Link href="/" className="flex items-center gap-3 group transition-transform hover:scale-105">
            <div className="h-12 w-12 bg-core-blue rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-200">
              <LayoutDashboard className="h-7 w-7 text-white" />
            </div>
            <div className="text-left">
              <span className="text-2xl font-black text-desk-black tracking-tighter uppercase block leading-none">
                Venus <span className="text-core-blue">Operations</span>
              </span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1 block">Enterprise Control Portal</span>
            </div>
          </Link>
        </div>

        <Card className="border-none shadow-3xl bg-white/80 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="space-y-4 pt-10 px-8 pb-6 bg-gradient-to-b from-gray-50/50 to-transparent">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 -ml-2 text-gray-400 hover:text-core-blue font-bold uppercase tracking-widest text-[10px]"
                onClick={() => router.push('/')}
                type="button"
              >
                <ArrowLeft size={14} />
                Back to Portal
              </Button>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 rounded-full border border-blue-100">
                <div className="h-1.5 w-1.5 bg-core-blue rounded-full animate-pulse" />
                <span className="text-[9px] font-black text-core-blue uppercase tracking-widest">New Protocol</span>
              </div>
            </div>
            <div>
              <CardTitle className="text-3xl font-black text-desk-black tracking-tighter uppercase">Personnel Registration</CardTitle>
              <CardDescription className="font-bold text-gray-400 flex items-center gap-2 mt-2">
                <Shield size={14} />
                Creating New Security Credentials
              </CardDescription>
            </div>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="px-8 space-y-5">
              {error && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-2xl text-sm font-bold border border-destructive/20 flex gap-3 animate-in fade-in slide-in-from-top-2">
                  <div className="mt-0.5">•</div>
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Operational Agent Identifier"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-14 bg-gray-50/50 border-gray-100 focus:border-core-blue focus:ring-core-blue/20 rounded-2xl transition-all font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">Personnel Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@venuschicken.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-14 bg-gray-50/50 border-gray-100 focus:border-core-blue focus:ring-core-blue/20 rounded-2xl transition-all font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">Digital Credential</Label>
                <div className="relative group">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 bg-gray-50/50 border-gray-100 focus:border-core-blue focus:ring-core-blue/20 rounded-2xl transition-all font-medium pr-12"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-core-blue transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="px-8 pb-10 pt-6 flex flex-col space-y-6">
              <Button
                type="submit"
                className="h-16 w-full bg-desk-black hover:bg-core-blue text-white font-black text-lg shadow-2xl transition-all rounded-2xl flex items-center justify-center gap-3 group"
                disabled={loading}
              >
                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    CREATE CREDENTIALS
                    <UserPlus className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
              <div className="text-sm text-center">
                <span className="text-gray-400 font-bold">Already Registered?</span>{' '}
                <Link href="/auth/login" className="text-core-blue font-black hover:underline uppercase tracking-tight ml-1">
                  Return to Login
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        <p className="text-[10px] text-center text-gray-400 font-black uppercase tracking-[0.4em] pt-4">
          Venus Chicken - Subsidery of SHIVA AGROVET PVT LTD
        </p>
      </div>
    </div>
  )
}
