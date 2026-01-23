'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  Package,
  Users,
  BarChart3,
  ArrowRight,
  ShieldCheck,
  Activity,
  CheckCircle2,
  Lock,
  LayoutDashboard,
  Cpu,
  Monitor,
  ShoppingBag,
  Truck,
  ThermometerSnowflake
} from 'lucide-react'
import AIChatWidget from '../components/ai/AIChatWidget'
import { useRouter } from 'next/navigation'
import { useAuth } from '../lib/auth/AuthProvider'
import { usePermissions } from '../lib/auth/usePermissions'
import { useDashboard } from '../lib/hooks/useDashboard'
import { useEffect } from 'react'

const HERO_IMAGE = '/venus_chicken_hero.png'

export default function HomePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { roles, loading: permLoading } = usePermissions()
  const { homepagePreference } = useDashboard()

  // Redirect all authenticated users to /admin/home
  useEffect(() => {
    if (!authLoading && !permLoading && user) {
      router.push('/admin/home')
    }
  }, [user, authLoading, permLoading, router])


  const retailModules = [
    {
      icon: ShoppingBag,
      title: 'Premium Retail',
      description: 'Point-of-sale systems optimized for fast, accurate meat weighing and billing.',
      color: 'bg-blue-50 text-blue-600',
      status: 'Ready'
    },
    {
      icon: ThermometerSnowflake,
      title: 'Cold Chain',
      description: 'Real-time temperature monitoring ensuring maximum freshness from farm to retail.',
      color: 'bg-cyan-50 text-cyan-600',
      status: 'Active'
    },
    {
      icon: Truck,
      title: 'Direct Supply',
      description: 'Automated stock replenishment directly from the source to maintain transparency.',
      color: 'bg-purple-50 text-purple-600',
      status: 'Live'
    },
    {
      icon: ShieldCheck,
      title: 'Quality Audit',
      description: 'Digital health certificates and batch tracking for every single cut sold.',
      color: 'bg-green-50 text-green-600',
      status: 'Active'
    }
  ]

  const metrics = [
    { label: 'Retail Outlets', value: '2' },
    { label: 'Freshness Index', value: '100%' },
    { label: 'Supply Uptime', value: '99.9%' },
    { label: 'Daily Servings', value: '850+' },
  ]

  return (
    <div className="min-h-screen bg-white selection:bg-core-blue selection:text-white">
      {/* Dynamic Status Bar */}
      <div className="bg-desk-black text-white text-[10px] py-1.5 px-6 flex justify-between items-center font-bold tracking-[0.2em] uppercase border-b border-white/10">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 bg-success-green rounded-full shadow-[0_0_8px_#1ABC9C] animate-pulse" />
            Operations: Active
          </span>
          <span className="hidden sm:inline-flex items-center gap-2 opacity-60">
            Cold Chain: <span className="text-success-green">-18°C Stable</span>
          </span>
        </div>
        <div className="flex gap-6 opacity-60">
          <span>v2.1.0-STABLE</span>
          <span className="hidden sm:block">SYSTEM NODE: PRIMARY</span>
        </div>
      </div>

      {/* Modern Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-2xl border-b border-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex justify-between items-center h-20 lg:h-24">
            {/* Brand Identity */}
            <Link href="/" className="flex items-center gap-3 sm:gap-4 group">
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-core-blue rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 group-hover:scale-105 transition-transform duration-300">
                <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg sm:text-2xl font-black text-desk-black tracking-tighter uppercase leading-none">
                  Venus <span className="text-core-blue">Chicken</span>
                </span>
                <span className="text-[7px] sm:text-[9px] text-gray-400 font-black uppercase tracking-[0.3em] mt-1 sm:mt-1.5">Premium Meat Systems</span>
              </div>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden lg:flex items-center gap-12 font-black text-[11px] uppercase tracking-widest text-gray-400">
              <Link href="/admin" className="hover:text-core-blue transition-colors">Operations Hub</Link>
              <Link href="/docs" className="hover:text-core-blue transition-colors">Quality Standards</Link>
              <Link href="#outlets" className="hover:text-core-blue transition-colors">Store Map</Link>
            </div>

            {/* CTA */}
            <div className="flex items-center">
              <Link href="/auth/login">
                <Button className="bg-desk-black text-white hover:bg-core-blue font-bold px-4 sm:px-10 py-4 sm:py-7 h-12 sm:h-auto rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl shadow-gray-200 transition-all active:scale-95 text-xs sm:text-base">
                  <span className="hidden sm:inline">Internal Portal</span>
                  <span className="sm:hidden">Login</span>
                  <Lock className="ml-2 sm:ml-3 h-3 w-3 sm:h-4 sm:h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Immersive Hero Section */}
      <section className="relative pt-8 pb-20 lg:pt-20 lg:pb-52 overflow-hidden bg-white">
        {/* Abstract Background Accents */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-50/30 -skew-x-12 translate-x-1/4 pointer-events-none" />
        <div className="absolute -bottom-24 left-0 w-96 h-96 bg-cyan-100/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">
            {/* Vision Content */}
            <div className="order-1 lg:order-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-blue-50/50 rounded-full text-core-blue text-[10px] font-black uppercase tracking-[0.25em] mb-10 border border-blue-100/50">
                <Truck className="h-3.5 w-3.5" />
                Next-Gen Meat Retail
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-[5.5rem] font-black text-desk-black leading-[0.95] mb-8 lg:mb-10 tracking-tighter">
                FRESHNESS <br />
                <span className="text-core-blue">REDEFINED.</span>
              </h1>
              <p className="text-lg lg:text-xl text-gray-500 max-w-xl mx-auto lg:mx-0 mb-10 lg:mb-14 leading-relaxed font-medium">
                Venus Chicken combines traditional meat sourcing with cutting-edge retail technology. We ensure the highest quality standards through digitized cold-chain monitoring and farm-to-table transparency.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center mb-12 lg:mb-16">
                <Link href={user ? '/admin/home' : '/admin'} className="w-full sm:w-auto">
                  <Button size="lg" className="h-16 sm:h-20 px-8 sm:px-12 bg-core-blue hover:bg-desk-black text-white font-black text-lg sm:text-xl shadow-3xl shadow-blue-200 transition-all rounded-[1.2rem] sm:rounded-[1.5rem] w-full group">
                    ACCESS SYSTEMS
                    <ArrowRight className="ml-2 sm:ml-3 h-5 w-5 sm:h-7 sm:w-7 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/docs" className="w-full sm:w-auto">
                  <Button size="lg" variant="ghost" className="h-14 sm:h-20 px-8 sm:px-10 text-gray-400 font-extrabold text-sm sm:text-lg hover:text-core-blue hover:bg-transparent rounded-2xl w-full">
                    DISCOVER OUR PROCESS
                  </Button>
                </Link>
              </div>

              {/* Data Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-12 pt-14 border-t border-gray-100">
                {metrics.map((metric, i) => (
                  <div key={i} className="text-center lg:text-left">
                    <p className="text-3xl lg:text-4xl font-black text-desk-black tracking-tighter leading-none mb-2 lg:mb-3 italic">{metric.value}</p>
                    <p className="text-[8px] lg:text-[9px] text-gray-400 font-black uppercase tracking-[0.2em]">{metric.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature Visual */}
            <div className="order-2 lg:order-2 relative group flex justify-center lg:justify-end">
              <div className="absolute inset-0 bg-core-blue opacity-[0.03] blur-[100px] rounded-full scale-150 animate-pulse" />
              <div className="relative w-full aspect-square max-w-[600px]">
                <div className="absolute -inset-4 bg-gradient-to-tr from-core-blue/10 to-transparent rounded-[4rem] blur-2xl opacity-50" />
                <div className="relative h-full w-full rounded-[3.5rem] overflow-hidden shadow-6xl border-[12px] border-white group-hover:scale-[1.02] transition-transform duration-700">
                  <Image
                    src={HERO_IMAGE}
                    alt="Venus Chicken Retail Experience"
                    fill
                    className="object-cover scale-105 group-hover:scale-100 transition-transform duration-700"
                  />
                  {/* Glassmorphic Overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/20 to-transparent h-1/2" />
                  <div className="absolute bottom-6 left-6 right-6 lg:bottom-10 lg:left-10 lg:right-10 p-5 lg:p-8 bg-white/10 backdrop-blur-3xl rounded-[2rem] lg:rounded-[2.5rem] border border-white/20 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3 lg:gap-5">
                      <div className="h-10 w-10 lg:h-14 lg:w-14 bg-white/20 rounded-xl lg:rounded-2xl flex items-center justify-center animate-pulse">
                        <ThermometerSnowflake className="h-5 w-5 lg:h-7 lg:w-7" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-0.5 lg:mb-1">Live Freshness</p>
                        <p className="text-lg lg:text-2xl font-black tracking-tighter">-19.4°C SYSTEM OK</p>
                      </div>
                    </div>
                    <CheckCircle2 className="h-6 w-6 lg:h-8 lg:w-8 text-success-green" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Retail Infrastructure Section */}
      <section className="py-20 lg:py-40 bg-gray-50/30 relative">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 mb-32">
            <div className="max-w-2xl">
              <h2 className="text-5xl lg:text-6xl font-black text-desk-black tracking-tighter mb-8 leading-none uppercase">RETAIL <br /> <span className="text-core-blue">INFRASTRUCTURE</span></h2>
              <p className="text-lg text-gray-500 font-medium leading-relaxed">Our stores are powered by a unified technology stack that synchronizes inventory, quality data, and customer experiences in real-time.</p>
            </div>
            <div className="font-black text-[12px] uppercase tracking-[0.3em] text-gray-300 pb-2">Proprietary Technology Stack</div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
            {retailModules.map((m, i) => (
              <div key={i} className="group p-10 bg-white rounded-[3rem] border border-gray-100 hover:border-core-blue/10 hover:shadow-4xl transition-all duration-500 hover:-translate-y-2">
                <div className={`h-20 w-20 ${m.color} rounded-3xl flex items-center justify-center mb-10 group-hover:rotate-6 transition-transform duration-500 shadow-lg shadow-gray-50`}>
                  <m.icon className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-black text-desk-black mb-6 tracking-tight uppercase leading-tight">{m.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed font-bold mb-10 opacity-80">{m.description}</p>
                <div className="inline-flex items-center gap-3 text-[10px] font-black uppercase text-core-blue tracking-widest bg-blue-50/50 px-4 py-2 rounded-full">
                  <span className="h-2 w-2 bg-core-blue rounded-full animate-ping" />
                  {m.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* System Modernity Shoutout */}
      <section className="py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="relative bg-desk-black rounded-[4.5rem] p-12 lg:p-24 overflow-hidden">
            {/* Glowing Orbs */}
            <div className="absolute top-0 -right-24 w-[600px] h-[600px] bg-core-blue/20 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-48 -left-24 w-[500px] h-[500px] bg-purple-600/10 blur-[150px] rounded-full pointer-events-none" />

            <div className="relative z-10 grid lg:grid-cols-2 gap-20 items-center">
              <div>
                <h2 className="text-5xl lg:text-7xl font-black text-white tracking-tighter mb-10 leading-[0.9] uppercase">BUILT FOR <br /> <span className="text-core-blue">EFFICIENCY.</span></h2>
                <div className="space-y-8 mb-14">
                  <div className="flex gap-6 items-start">
                    <div className="h-10 w-10 shrink-0 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center text-core-blue">
                      <Cpu className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-white font-black uppercase tracking-widest text-sm mb-2">Automated Operations</h4>
                      <p className="text-gray-400 text-sm leading-relaxed font-medium">Smart scaling and predictive inventory management across all nodes.</p>
                    </div>
                  </div>
                  <div className="flex gap-6 items-start">
                    <div className="h-10 w-10 shrink-0 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center text-success-green">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-white font-black uppercase tracking-widest text-sm mb-2">Military Grade Security</h4>
                      <p className="text-gray-400 text-sm leading-relaxed font-medium">Enterprise-level RBAC and end-to-end encryption for all business data.</p>
                    </div>
                  </div>
                </div>
                <Link href="/auth/login">
                  <Button className="h-16 px-10 bg-white text-desk-black hover:bg-gray-100 font-black text-lg rounded-2xl transition-all shadow-xl">
                    SYSTEM DASHBOARD
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-6 pb-4 sm:pb-0">
                {[
                  { label: 'Real-time Sync', val: '0.2s', sub: 'LATENCY' },
                  { label: 'Data Security', val: 'AES-256', sub: 'ENCRYPTED' },
                  { label: 'Network', val: 'CLOUD', sub: 'NATIVE' },
                  { label: 'Availability', val: '99.99%', sub: 'UPTIME' }
                ].map((item, i) => (
                  <div key={i} className="p-8 bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 flex flex-col justify-between hover:bg-white/10 transition-colors">
                    <p className="text-[10px] font-black text-core-blue uppercase tracking-widest mb-8">{item.label}</p>
                    <div>
                      <p className="text-3xl font-black text-white tracking-tighter mb-1 uppercase">{item.val}</p>
                      <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Minimalism Footer */}
      <footer className="bg-white pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-16 mb-24">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <ShoppingBag className="h-10 w-10 text-core-blue" />
                <span className="text-3xl font-black text-desk-black tracking-tighter uppercase leading-none">Venus <span className="text-core-blue">Chicken</span></span>
              </div>
              <p className="text-sm text-gray-400 font-black uppercase tracking-[0.3em] leading-relaxed">
                Proprietary Retail Systems. <br />
                © 2025 Venus Chicken Retail Group.
              </p>
            </div>

            <div className="flex flex-wrap gap-12 font-black text-[12px] uppercase tracking-widest text-gray-300">
              <Link href="/admin" className="hover:text-core-blue transition-colors">Portal</Link>
              <Link href="/docs" className="hover:text-core-blue transition-colors">Compliance</Link>
              <Link href="#it" className="hover:text-core-blue transition-colors">IT Hub</Link>
              <Link href="/" className="hover:text-core-blue transition-colors text-core-blue/40">SYSTEM RESET</Link>
            </div>
          </div>
          <div className="pt-12 border-t border-gray-50 text-center flex flex-col sm:flex-row justify-between items-center gap-6">
            <p className="text-[10px] text-gray-300 font-bold uppercase tracking-[0.4em]">DISTRIBUTED NODES ACTIVE: 07_BENGALURU_MAIN</p>
            <div className="flex gap-4">
              <div className="h-1.5 w-1.5 bg-success-green rounded-full shadow-[0_0_8px_#1ABC9C]" />
              <div className="h-1.5 w-1.5 bg-success-green rounded-full" />
              <div className="h-1.5 w-1.5 bg-success-green rounded-full opacity-30" />
            </div>
          </div>
        </div>
      </footer>

      {/* Operations Assistant (Invy) */}
      <AIChatWidget />
    </div>
  )
}
