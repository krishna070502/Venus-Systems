import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ShieldCheck, Zap, Lock, BarChart3, Users, Database, CheckCircle2, ArrowRight, Code2, GitBranch } from 'lucide-react'

export default function HomePage() {
  const features = [
    {
      icon: Lock,
      title: 'Enterprise Authentication',
      description: 'Supabase Auth with JWT tokens, email verification, password recovery, and session management out of the box.',
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      icon: ShieldCheck,
      title: 'Advanced RBAC',
      description: 'Granular role-based access control with customizable permissions, role hierarchies, and real-time enforcement.',
      gradient: 'from-purple-500 to-purple-600'
    },
    {
      icon: Users,
      title: 'Admin Control Center',
      description: 'Beautiful admin panel to manage users, roles, permissions, and monitor system health with real-time metrics.',
      gradient: 'from-cyan-500 to-cyan-600'
    },
    {
      icon: Database,
      title: 'Database Architecture',
      description: 'PostgreSQL with Supabase, row-level security, automatic migrations, and optimized schemas for scalability.',
      gradient: 'from-green-500 to-green-600'
    },
    {
      icon: BarChart3,
      title: 'Audit Logging',
      description: 'Comprehensive audit trails for compliance. Track every change with before/after states and user attribution.',
      gradient: 'from-orange-500 to-orange-600'
    },
    {
      icon: Zap,
      title: 'Modern Tech Stack',
      description: 'Next.js 14, FastAPI, TypeScript, TailwindCSS, and Supabase. Built with developer experience in mind.',
      gradient: 'from-yellow-500 to-yellow-600'
    }
  ]

  const techStack = [
    { name: 'Next.js 14', role: 'Frontend Framework', icon: '▲' },
    { name: 'FastAPI', role: 'Backend API', icon: '⚡' },
    { name: 'Supabase', role: 'Database & Auth', icon: '⚛' },
    { name: 'TypeScript', role: 'Type Safety', icon: 'TS' }
  ]

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="relative w-9 h-9 bg-gradient-to-br from-core-blue to-core-aqua rounded-lg flex items-center justify-center shadow-sm">
                <div className="w-3.5 h-3.5 bg-white rounded-full" />
                <div className="absolute inset-0 bg-core-blue/20 rounded-lg blur-md" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-core-blue to-core-aqua bg-clip-text text-transparent">
                CoreDesk
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-sm font-medium text-gray-600 hover:text-core-blue transition-colors">
                Demo
              </Link>
              <Link href="/auth/login">
                <Button variant="ghost" className="text-sm font-medium">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-core-blue hover:bg-[#1a3fb8] text-sm font-medium shadow-sm">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 sm:pt-24 sm:pb-40 overflow-hidden">
        {/* Animated gradient mesh background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50">
          <div className="absolute top-10 left-1/4 w-96 h-96 bg-blue-400 rounded-full opacity-20 mix-blend-multiply filter blur-3xl animate-blob" />
          <div className="absolute top-10 right-1/4 w-96 h-96 bg-purple-400 rounded-full opacity-20 mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute -bottom-8 left-1/2 w-96 h-96 bg-pink-300 rounded-full opacity-20 mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 rounded-full text-sm font-medium text-core-blue mb-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-2 h-2 bg-core-blue rounded-full animate-pulse" />
              Enterprise-Grade Application Foundation
            </div>
            
            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6">
              <span className="block text-desk-black mb-2">Ship faster with</span>
              <span className="block bg-gradient-to-r from-core-blue via-core-aqua to-core-blue bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                CoreDesk
              </span>
            </h1>
            
            {/* Subheadline */}
            <p className="text-xl sm:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-10">
              Stop rebuilding authentication, RBAC, and admin panels. 
              Start with a production-ready foundation built by senior engineers.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link href="/auth/signup">
                <Button size="lg" className="w-full sm:w-auto bg-core-blue hover:bg-[#1a3fb8] text-white px-8 h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all group">
                  Start Building Free
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/admin">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-2 border-gray-200 hover:border-core-blue hover:text-core-blue h-12 px-8 text-base font-semibold group">
                  <Code2 className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                  Explore Demo
                </Button>
              </Link>
            </div>

            {/* Social Proof */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success-green" />
                <span className="font-medium">Production Ready</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success-green" />
                <span className="font-medium">TypeScript</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success-green" />
                <span className="font-medium">MIT License</span>
              </div>
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-core-blue" />
                <span className="font-medium">Open Source</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-desk-black mb-4">
              Everything you need to scale
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Battle-tested components designed for enterprise applications
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div
                  key={index}
                  className="group relative bg-white p-8 rounded-2xl border-2 border-gray-100 hover:border-transparent hover:shadow-2xl transition-all duration-300"
                >
                  {/* Gradient Border on Hover */}
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity -z-10 blur-sm`} />
                  
                  {/* Icon */}
                  <div className={`relative w-12 h-12 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-xl font-bold text-desk-black mb-3 group-hover:text-core-blue transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-desk-black mb-4">
              Built with the best tools
            </h2>
            <p className="text-xl text-gray-600">
              Modern, scalable, and loved by developers
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {techStack.map((tech, index) => (
              <div
                key={index}
                className="group relative bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl border border-gray-200 hover:border-core-blue hover:shadow-xl transition-all duration-300"
              >
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-xl shadow-md mb-4 text-2xl font-bold text-core-blue group-hover:scale-110 transition-transform border border-gray-100">
                    {tech.icon}
                  </div>
                  <div className="text-xl font-bold text-desk-black mb-1">
                    {tech.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {tech.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-core-blue via-[#1a3fb8] to-core-aqua" />
        <div className="absolute inset-0 bg-grid-white/[0.05]" />
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Ready to build something amazing?
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto leading-relaxed">
            Join developers shipping production apps faster with CoreDesk's enterprise foundation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" className="w-full sm:w-auto bg-white text-core-blue hover:bg-gray-100 px-8 h-12 text-base font-semibold shadow-xl hover:shadow-2xl transition-all">
                Start Building Now
              </Button>
            </Link>
            <Link href="https://github.com" target="_blank" rel="noopener noreferrer">
              <Button 
                size="lg" 
                className="w-full sm:w-auto bg-white/10 backdrop-blur-sm border-2 border-white text-white hover:bg-white hover:text-core-blue px-8 h-12 text-base font-semibold transition-all"
              >
                <GitBranch className="mr-2 h-5 w-5" />
                View on GitHub
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-desk-black text-white py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="relative w-8 h-8 bg-gradient-to-br from-core-blue to-core-aqua rounded-lg flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full" />
              </div>
              <span className="text-xl font-bold">CoreDesk</span>
            </div>
            <div className="text-sm text-gray-400">
              © 2025 CoreDesk. Your Application's Control Center. Built with ❤️ for developers.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
