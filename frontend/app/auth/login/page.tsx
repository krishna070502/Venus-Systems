'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading'
import { Eye, EyeOff, ArrowLeft, LayoutDashboard, Lock, Shield } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(email, password)
      router.push('/')
    } catch (err: any) {
      console.error('Login error:', err)

      // Provide more helpful error messages
      let errorMessage = 'Failed to sign in'

      if (err.message?.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password'
      } else if (err.message?.includes('Email not confirmed')) {
        errorMessage = 'Please confirm your email address before signing in'
      } else if (err.message?.includes('500')) {
        errorMessage = 'Server error. Please check:\n1. Your Supabase project is active\n2. Email confirmation is disabled in Supabase Auth settings\n3. Database triggers are working correctly'
      } else if (err.message) {
        errorMessage = err.message
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
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
              <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 rounded-full border border-green-100">
                <div className="h-1.5 w-1.5 bg-success-green rounded-full animate-pulse" />
                <span className="text-[9px] font-black text-success-green uppercase tracking-widest">Secure Entry</span>
              </div>
            </div>
            <div>
              <CardTitle className="text-3xl font-black text-desk-black tracking-tighter uppercase">Authorized Login</CardTitle>
              <CardDescription className="font-bold text-gray-400 flex items-center gap-2 mt-2">
                <Shield size={14} />
                Accessing Central Server Infrastructure
              </CardDescription>
            </div>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="px-8 space-y-6">
              {error && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-2xl text-sm font-bold border border-destructive/20 flex gap-3 animate-in fade-in slide-in-from-top-2">
                  <div className="mt-0.5">•</div>
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">Personnel Email</Label>
                <div className="relative group">
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@venuschicken.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-14 bg-gray-50/50 border-gray-100 focus:border-core-blue focus:ring-core-blue/20 rounded-2xl transition-all font-medium pr-4"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">Digital Credential</Label>
                <div className="relative group">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 bg-gray-50/50 border-gray-100 focus:border-core-blue focus:ring-core-blue/20 rounded-2xl transition-all font-medium pr-12"
                    required
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

            <CardFooter className="px-8 pb-10 pt-4 flex flex-col space-y-6">
              <Button
                type="submit"
                className="h-16 w-full bg-desk-black hover:bg-core-blue text-white font-black text-lg shadow-2xl transition-all rounded-2xl flex items-center justify-center gap-3 group"
                disabled={loading}
              >
                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    INITIATE LOGIN
                    <Lock className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
              <div className="text-sm text-center">
                <span className="text-gray-400 font-bold">New Personnel?</span>{' '}
                <Link href="/auth/signup" className="text-core-blue font-black hover:underline uppercase tracking-tight ml-1">
                  Request Access
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
