'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  Terminal,
  Package,
  Users,
  BarChart3,
  ArrowRight,
  ShieldCheck,
  Database,
  Activity,
  CheckCircle2,
  Lock,
  LayoutDashboard,
  Cpu,
  Monitor
} from 'lucide-react'
import AIChatWidget from '@/components/ai/AIChatWidget'

// Professional dashboard imagery paths
const DASHBOARD_HERO = '/hero.png'
const OPS_IMAGE = '/farm.png'

export default function HomePage() {
  const modules = [
    {
      icon: Terminal,
      title: 'POS Terminal',
      description: 'Unified billing system for front-end store operations with real-time sync.',
      color: 'bg-blue-50 text-blue-600',
      status: 'Online'
    },
    {
      icon: Package,
      title: 'Global Inventory',
      description: 'Track stock movement across all city locations. Automated low-stock alerts.',
      color: 'bg-orange-50 text-orange-600',
      status: 'Online'
    },
    {
      icon: Users,
      title: 'H.R. & Staffing',
      description: 'Manage store managers, shift assignments, and role-based access.',
      color: 'bg-purple-50 text-purple-600',
      status: 'Online'
    },
    {
      icon: BarChart3,
      title: 'Sales Intelligence',
      description: 'Consolidated reports for daily store earnings and performance metrics.',
      color: 'bg-green-50 text-green-600',
      status: 'Live'
    }
  ]

  const stats = [
    { label: 'Active Stores', value: '2' },
    { label: 'System Uptime', value: '99.9%' },
    { label: 'Staff Online', value: '14' },
    { label: 'Today\'s Orders', value: '342' },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Top System Status Bar */}
      <div className="bg-desk-black text-white text-[11px] py-1 px-4 flex justify-between items-center font-bold tracking-widest uppercase">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 bg-success-green rounded-full animate-pulse" />
            Central Server: Operational
          </span>
          <span className="hidden sm:inline-flex items-center gap-2 opacity-50">
            <Activity className="h-3 w-3" />
            DB Latency: <span className="text-success-green ml-0.5">14ms</span>
          </span>
        </div>
        <div className="flex gap-4">
          <span>v2.1.0-Stable</span>
          <span className="hidden sm:block">Env: Production</span>
        </div>
      </div>

      {/* Internal Navigation */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <div className="h-11 w-11 bg-core-blue rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
                <LayoutDashboard className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-black text-desk-black tracking-tighter uppercase block leading-none">
                  Venus <span className="text-core-blue">Operations</span>
                </span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1 block">Enterprise Control Portal</span>
              </div>
            </Link>

            {/* Internal Nav */}
            <div className="hidden md:flex items-center gap-10">
              <Link href="/admin" className="text-sm font-bold text-gray-500 hover:text-core-blue transition-colors">Admin Dashboard</Link>
              <Link href="/stack" className="text-sm font-bold text-gray-500 hover:text-core-blue transition-colors">Documentation</Link>
              <Link href="#status" className="text-sm font-bold text-gray-500 hover:text-core-blue transition-colors">System Status</Link>
            </div>

            {/* Management Actions */}
            <div className="flex items-center gap-4">
              <Link href="/auth/login">
                <Button className="bg-desk-black text-white hover:bg-core-blue font-bold px-8 py-6 rounded-xl shadow-xl transition-all">
                  Staff Login
                  <Lock className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Portal Hero Section */}
      <section className="relative pt-16 pb-24 lg:pt-32 lg:pb-40 overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/50 via-white to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            {/* Operational Focus */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg text-core-blue text-xs font-black uppercase tracking-[0.2em] mb-8 border border-blue-100">
                <Monitor className="h-4 w-4" />
                Business Management Suite
              </div>
              <h1 className="text-5xl lg:text-7xl font-black text-desk-black leading-[1.05] mb-8 tracking-tighter">
                UNIFIED <br />
                <span className="text-core-blue">RETAIL</span> <br />
                CONTROL.
              </h1>
              <p className="text-lg text-gray-500 max-w-lg mb-12 leading-relaxed font-medium">
                The centralized operational hub for Venus Chicken. Manage inventory, monitor POS terminals, and audit staff actions across all retail locations.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 items-center mb-12">
                <Link href="/admin" className="w-full sm:w-auto">
                  <Button size="lg" className="h-16 px-10 bg-core-blue hover:bg-desk-black text-white font-black text-lg shadow-2xl shadow-blue-200 transition-all rounded-2xl w-full">
                    GOTO DASHBOARD
                    <ArrowRight className="ml-2 h-6 w-6" />
                  </Button>
                </Link>
                <Link href="/stack" className="w-full sm:w-auto">
                  <Button size="lg" variant="ghost" className="h-16 px-8 text-gray-400 font-black text-lg hover:text-core-blue rounded-2xl w-full">
                    SYSTEM DOCS
                  </Button>
                </Link>
              </div>

              {/* Real-time Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 pt-12 border-t border-gray-100">
                {stats.map((stat, i) => (
                  <div key={i}>
                    <p className="text-3xl font-black text-desk-black tracking-tighter leading-none mb-2">{stat.value}</p>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* System Visualization */}
            <div className="relative group p-4 sm:p-0">
              <div className="absolute inset-0 bg-core-blue opacity-5 blur-[120px] rounded-full" />
              <div className="relative bg-white rounded-[3rem] p-8 shadow-33xl border border-gray-100 backdrop-blur-sm">
                <div className="flex justify-between items-center mb-10">
                  <div className="flex gap-2">
                    <div className="h-3 w-3 bg-red-400 rounded-full" />
                    <div className="h-3 w-3 bg-yellow-400 rounded-full" />
                    <div className="h-3 w-3 bg-green-400 rounded-full" />
                  </div>
                  <div className="text-[10px] font-black text-gray-400 tracking-widest uppercase">System Overview</div>
                </div>

                <div className="space-y-6">
                  {[
                    { label: 'POS Terminal Delta-1', val: 94, color: 'bg-green-500' },
                    { label: 'POS Terminal Delta-2', val: 76, color: 'bg-green-500' },
                    { label: 'Central Inventory DB', val: 99, color: 'bg-blue-500' },
                    { label: 'API Gateway Traffic', val: 42, color: 'bg-purple-500' },
                  ].map((sys, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-xs font-black text-gray-500 uppercase tracking-tighter">
                        <span>{sys.label}</span>
                        <span className="text-desk-black">{sys.val}%</span>
                      </div>
                      <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                        <div className={`h-full ${sys.color} rounded-full transition-all duration-1000`} style={{ width: `${sys.val}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-12 p-6 bg-gray-50 rounded-3xl border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                      <Cpu className="h-6 w-6 text-core-blue" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-desk-black uppercase tracking-tighter">Invy AI Core</p>
                      <p className="text-[10px] text-success-green font-bold">MONITORING ACTIVE</p>
                    </div>
                  </div>
                  <ShieldCheck className="h-6 w-6 text-success-green" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Internal Modules Section */}
      <section className="py-32 border-t border-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-24">
            <h2 className="text-4xl font-black text-desk-black tracking-tighter mb-4">OPERATIONAL MODULES</h2>
            <p className="text-lg text-gray-400 font-medium max-w-2xl mx-auto">Integrated tools designed for high-performance store management.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {modules.map((m, i) => {
              const Icon = m.icon
              return (
                <div key={i} className="group p-8 bg-white rounded-[2.5rem] border-2 border-gray-50 hover:border-core-blue/20 hover:shadow-2xl transition-all duration-500">
                  <div className={`h-16 w-16 ${m.color} rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>
                    <Icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-black text-desk-black mb-4 tracking-tight uppercase">{m.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed font-bold mb-8">{m.description}</p>
                  <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-gray-300 tracking-widest border px-3 py-1 rounded-full">
                    <span className="h-1.5 w-1.5 bg-gray-200 rounded-full" />
                    {m.status}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Database Architecture Section */}
      <section className="py-24 bg-desk-black rounded-[4rem] mx-4 sm:mx-8 mb-24 relative overflow-hidden text-white">
        <div className="absolute inset-0 opacity-10 blur-3xl pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-core-blue rounded-full" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600 rounded-full" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-10 py-20">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-5xl font-black tracking-tighter mb-8 leading-none uppercase">ENTERPRISE <br /> <span className="text-core-blue">DATA SYNC</span></h2>
              <p className="text-xl text-gray-400 font-medium mb-12 leading-relaxed">
                Venus Operations runs on a highly available Supabase back-end with row-level security, ensuring that store data is localized for speed yet syncs globally for management oversight.
              </p>
              <div className="flex flex-wrap gap-8">
                <div className="flex items-center gap-3">
                  <Database className="h-6 w-6 text-core-blue" />
                  <span className="font-black uppercase tracking-widest text-sm">PostgreSQL Core</span>
                </div>
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-6 w-6 text-success-green" />
                  <span className="font-black uppercase tracking-widest text-sm">JWT SECURED</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {[
                { label: 'Store Sync', icon: CheckCircle2 },
                { label: 'Audit Trails', icon: CheckCircle2 },
                { label: 'RBAC Active', icon: CheckCircle2 },
                { label: 'Daily Backups', icon: CheckCircle2 },
              ].map((item, i) => (
                <div key={i} className="p-6 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 flex items-center gap-4 hover:bg-white/10 transition-colors">
                  <item.icon className="h-6 w-6 text-core-blue" />
                  <span className="font-bold uppercase tracking-tight text-sm">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Internal Footer */}
      <footer className="bg-white border-t border-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center md:text-left">
          <div className="flex flex-col md:flex-row justify-between items-center gap-12">
            <div>
              <div className="flex items-center gap-3 mb-6 justify-center md:justify-start">
                <LayoutDashboard className="h-8 w-8 text-core-blue" />
                <span className="text-2xl font-black text-desk-black tracking-tighter uppercase">Venus Operations</span>
              </div>
              <p className="text-sm text-gray-400 font-bold uppercase tracking-widest max-w-sm mx-auto md:mx-0">
                Proprietary Internal Software. <br />
                Unauthorized Access Strictly Prohibited.
              </p>
            </div>

            <div className="flex gap-12 text-[11px] font-black text-gray-300 uppercase tracking-[0.2em]">
              <Link href="/admin" className="hover:text-core-blue transition-colors">Admin Hub</Link>
              <Link href="/stack" className="hover:text-core-blue transition-colors">Dev Specs</Link>
              <Link href="#support" className="hover:text-core-blue transition-colors">IT Support</Link>
              <Link href="/" className="hover:text-core-blue transition-colors">Refresh Portal</Link>
            </div>
          </div>
          <div className="mt-16 pt-12 border-t border-gray-50 text-[10px] text-gray-300 font-black uppercase tracking-[0.4em]">
            © 2025 VENUS CHICKEN RETAIL TECHNOLOGY GROUP | PRIVATE & CONFIDENTIAL
          </div>
        </div>
      </footer>

      {/* Operations Assistant (Invy) */}
      <AIChatWidget />
    </div>
  )
}
