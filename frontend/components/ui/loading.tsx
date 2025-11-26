'use client'

import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'dots' | 'pulse' | 'bars'
  text?: string
  className?: string
  fullScreen?: boolean
}

export function LoadingSpinner({
  size = 'md',
  variant = 'default',
  text,
  className,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
  }

  const containerClasses = fullScreen
    ? 'fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center'
    : 'flex flex-col items-center justify-center gap-3'

  const renderSpinner = () => {
    switch (variant) {
      case 'dots':
        return <DotsSpinner size={size} />
      case 'pulse':
        return <PulseSpinner size={size} />
      case 'bars':
        return <BarsSpinner size={size} />
      default:
        return <DefaultSpinner size={size} />
    }
  }

  return (
    <div className={cn(containerClasses, className)}>
      <div className="flex flex-col items-center gap-3">
        {renderSpinner()}
        {text && (
          <p className={cn('text-muted-foreground animate-pulse', textSizeClasses[size])}>
            {text}
          </p>
        )}
      </div>
    </div>
  )
}

// Default circular spinner with gradient
function DefaultSpinner({ size }: { size: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
    xl: 'h-20 w-20',
  }

  return (
    <div className="relative">
      {/* Outer glow */}
      <div
        className={cn(
          'absolute inset-0 rounded-full bg-gradient-to-r from-[#1E4DD8] to-[#29C6D1] opacity-20 blur-md animate-pulse',
          sizeClasses[size]
        )}
      />
      {/* Main spinner */}
      <div
        className={cn(
          'relative rounded-full border-2 border-transparent animate-spin',
          sizeClasses[size]
        )}
        style={{
          background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #1E4DD8, #29C6D1) border-box',
        }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, transparent, #1E4DD8 50%, #29C6D1)',
            mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), white calc(100% - 2px))',
            WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), white calc(100% - 2px))',
            animation: 'spin 1s linear infinite',
          }}
        />
      </div>
      {/* Inner dot */}
      <div
        className={cn(
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#1E4DD8] to-[#29C6D1]',
          size === 'sm' ? 'h-1.5 w-1.5' : size === 'md' ? 'h-2 w-2' : size === 'lg' ? 'h-3 w-3' : 'h-4 w-4'
        )}
      />
    </div>
  )
}

// Bouncing dots spinner
function DotsSpinner({ size }: { size: 'sm' | 'md' | 'lg' | 'xl' }) {
  const dotSizes = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2.5 w-2.5',
    lg: 'h-3.5 w-3.5',
    xl: 'h-5 w-5',
  }

  const gapSizes = {
    sm: 'gap-1',
    md: 'gap-1.5',
    lg: 'gap-2',
    xl: 'gap-3',
  }

  return (
    <div className={cn('flex items-center', gapSizes[size])}>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={cn(
            'rounded-full bg-gradient-to-br from-[#1E4DD8] to-[#29C6D1]',
            dotSizes[size]
          )}
          style={{
            animation: 'bounce 1.4s ease-in-out infinite',
            animationDelay: `${index * 0.16}s`,
          }}
        />
      ))}
    </div>
  )
}

// Pulsing circle spinner
function PulseSpinner({ size }: { size: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
    xl: 'h-20 w-20',
  }

  return (
    <div className="relative">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={cn(
            'absolute inset-0 rounded-full border-2 border-[#1E4DD8]',
            sizeClasses[size]
          )}
          style={{
            animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
            animationDelay: `${index * 0.3}s`,
            opacity: 0.4 - index * 0.1,
          }}
        />
      ))}
      <div
        className={cn(
          'relative rounded-full bg-gradient-to-br from-[#1E4DD8] to-[#29C6D1]',
          sizeClasses[size]
        )}
        style={{ transform: 'scale(0.4)' }}
      />
    </div>
  )
}

// Animated bars spinner
function BarsSpinner({ size }: { size: 'sm' | 'md' | 'lg' | 'xl' }) {
  const barSizes = {
    sm: { width: 'w-0.5', height: 'h-3' },
    md: { width: 'w-1', height: 'h-5' },
    lg: { width: 'w-1.5', height: 'h-7' },
    xl: { width: 'w-2', height: 'h-10' },
  }

  const gapSizes = {
    sm: 'gap-0.5',
    md: 'gap-1',
    lg: 'gap-1.5',
    xl: 'gap-2',
  }

  return (
    <div className={cn('flex items-center', gapSizes[size])}>
      {[0, 1, 2, 3, 4].map((index) => (
        <div
          key={index}
          className={cn(
            'rounded-full bg-gradient-to-t from-[#1E4DD8] to-[#29C6D1]',
            barSizes[size].width,
            barSizes[size].height
          )}
          style={{
            animation: 'scaleY 1s ease-in-out infinite',
            animationDelay: `${index * 0.1}s`,
            transformOrigin: 'center',
          }}
        />
      ))}
    </div>
  )
}

// Full page loading component
export function PageLoading({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <LoadingSpinner size="lg" text={text} />
    </div>
  )
}

// Skeleton loading components
export function SkeletonCard() {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-muted" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-1/3 rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-4/5 rounded bg-muted" />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl border bg-card animate-pulse">
      <div className="border-b p-4">
        <div className="flex gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 flex-1 rounded bg-muted" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="border-b last:border-0 p-4">
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 flex-1 rounded bg-muted" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// Inline loading for buttons
export function ButtonLoading({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      <span>Loading...</span>
    </div>
  )
}
