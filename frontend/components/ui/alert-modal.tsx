'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

type AlertType = 'error' | 'success' | 'warning' | 'info'

interface AlertState {
  isOpen: boolean
  type: AlertType
  title: string
  message: string
  onConfirm?: () => void
  confirmText?: string
  showCancel?: boolean
  onCancel?: () => void
}

interface AlertContextType {
  showAlert: (options: Omit<AlertState, 'isOpen'>) => void
  showError: (message: string, title?: string) => void
  showSuccess: (message: string, title?: string) => void
  showWarning: (message: string, title?: string) => void
  showInfo: (message: string, title?: string) => void
  showConfirm: (message: string, onConfirm: () => void, title?: string) => void
  closeAlert: () => void
}

const AlertContext = createContext<AlertContextType | undefined>(undefined)

export function useAlert() {
  const context = useContext(AlertContext)
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider')
  }
  return context
}

const alertConfig = {
  error: {
    icon: AlertCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-500',
    titleColor: 'text-red-800',
    defaultTitle: 'Error',
  },
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconColor: 'text-green-500',
    titleColor: 'text-green-800',
    defaultTitle: 'Success',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    iconColor: 'text-amber-500',
    titleColor: 'text-amber-800',
    defaultTitle: 'Warning',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-500',
    titleColor: 'text-blue-800',
    defaultTitle: 'Information',
  },
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState<AlertState>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  })

  const showAlert = useCallback((options: Omit<AlertState, 'isOpen'>) => {
    setAlert({ ...options, isOpen: true })
  }, [])

  const showError = useCallback((message: string, title?: string) => {
    setAlert({
      isOpen: true,
      type: 'error',
      title: title || 'Error',
      message,
    })
  }, [])

  const showSuccess = useCallback((message: string, title?: string) => {
    setAlert({
      isOpen: true,
      type: 'success',
      title: title || 'Success',
      message,
    })
  }, [])

  const showWarning = useCallback((message: string, title?: string) => {
    setAlert({
      isOpen: true,
      type: 'warning',
      title: title || 'Warning',
      message,
    })
  }, [])

  const showInfo = useCallback((message: string, title?: string) => {
    setAlert({
      isOpen: true,
      type: 'info',
      title: title || 'Information',
      message,
    })
  }, [])

  const showConfirm = useCallback((message: string, onConfirm: () => void, title?: string) => {
    setAlert({
      isOpen: true,
      type: 'warning',
      title: title || 'Confirm Action',
      message,
      onConfirm,
      confirmText: 'Confirm',
      showCancel: true,
    })
  }, [])

  const closeAlert = useCallback(() => {
    setAlert((prev) => ({ ...prev, isOpen: false }))
  }, [])

  const handleConfirm = () => {
    if (alert.onConfirm) {
      alert.onConfirm()
    }
    closeAlert()
  }

  const handleCancel = () => {
    if (alert.onCancel) {
      alert.onCancel()
    }
    closeAlert()
  }

  const config = alertConfig[alert.type]
  const Icon = config.icon

  return (
    <AlertContext.Provider
      value={{ showAlert, showError, showSuccess, showWarning, showInfo, showConfirm, closeAlert }}
    >
      {children}

      {/* Modal Backdrop */}
      {alert.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeAlert}
          />

          {/* Modal */}
          <div
            className={cn(
              'relative z-10 w-full max-w-md mx-4 rounded-xl border shadow-2xl',
              'bg-white dark:bg-gray-900',
              'animate-in fade-in-0 zoom-in-95 duration-200'
            )}
          >
            {/* Header */}
            <div className={cn('flex items-center gap-3 p-4 rounded-t-xl', config.bgColor, config.borderColor, 'border-b')}>
              <div className={cn('p-2 rounded-full', config.bgColor)}>
                <Icon className={cn('h-6 w-6', config.iconColor)} />
              </div>
              <h3 className={cn('text-lg font-semibold flex-1', config.titleColor)}>
                {alert.title || config.defaultTitle}
              </h3>
              <button
                onClick={closeAlert}
                className="p-1 rounded-full hover:bg-black/10 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                {alert.message}
              </p>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 pb-6">
              {alert.showCancel && (
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleConfirm}
                className={cn(
                  alert.type === 'error' && 'bg-red-600 hover:bg-red-700',
                  alert.type === 'success' && 'bg-green-600 hover:bg-green-700',
                  alert.type === 'warning' && 'bg-amber-600 hover:bg-amber-700',
                  alert.type === 'info' && 'bg-blue-600 hover:bg-blue-700'
                )}
              >
                {alert.confirmText || 'OK'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  )
}
